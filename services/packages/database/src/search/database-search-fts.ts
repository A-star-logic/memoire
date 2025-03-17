// libs
import { SpeedMonitor } from '@astarlogic/services-utils/utils-apm.js';
import { secureVerifyDocumentID } from '@astarlogic/services-utils/utils-security.js';
import { prepareForBM25 } from '@astarlogic/services-utils/utils-text-processing.js';
import { sql } from 'drizzle-orm';
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';

// database
import { pgDatabase } from '../postgresql-config/database-postgresql.js';
import { logger } from '../reporting/database-external-config.js';
import {
  apmReport,
  errorReport,
} from '../reporting/database-reporting-interface.js';
import { chunksTable } from './database-search-schemas.js';

interface DocumentData {
  termFrequency: { [key: string]: number };
  wordLength: number;
}

interface SearchResult {
  chunkID: number;
  documentID: string;
  score: number;
}
/** The document's data, with the key being the document ID */
const documentsData = new Map<string, DocumentData>();

interface TermsData {
  documentFrequency: number;
  inverseDocumentFrequency: number;
}
/**
 * Terms data is a KV store with terms as keys
 */
let termsData = new Map<
  string, // the term
  TermsData
>();

const basePath =
  process.env.NODE_ENV === 'test' ? '.testMemoire/fts' : '.memoire/fts';

/**
 * Add a document to the full text search index.
 * **Note**: This function does not calculate the IDF, this needs to be done after ingesting documents
 * @param root named parameters
 * @param root.documentID the id of the document
 * @param root.text the text of the document
 */
export async function addFTSDocument({
  documentID,
  text,
}: {
  documentID: string;
  text: string;
}): Promise<void> {
  const speedMonitor = new SpeedMonitor();

  const normalizedText = await prepareForBM25({ text });
  // calculate the TF of this document
  const documentTermFrequency: { [key: string]: number } = {};
  for (const word of normalizedText) {
    // create or increment the value in the object
    documentTermFrequency[word] = documentTermFrequency[word]
      ? documentTermFrequency[word] + 1
      : 1;
  }
  documentsData.set(documentID, {
    termFrequency: documentTermFrequency,
    wordLength: normalizedText.length,
  });

  // calculate the document frequency and IDF of each terms from this document
  for (const term of Object.keys(documentTermFrequency)) {
    const termData: TermsData = termsData.get(term) ?? {
      documentFrequency: 0,
      inverseDocumentFrequency: Number.NaN,
    };

    termData.documentFrequency = termData.documentFrequency + 1;

    termsData.set(term, termData);
  }

  const executionTime = await speedMonitor.finishMonitoring();
  const totalDocuments = documentsData.size;
  const totalTerms = termsData.size;
  await apmReport({
    event: 'addFTSDocument',
    properties: {
      executionTime,
      totalDocuments,
      totalTerms,
    },
  });
}

/**
 * Calculate the IDF of the index; must be run after ingesting documents and before searching
 */
export async function calculateIDF(): Promise<void> {
  const totalDocuments = documentsData.size;
  for (const [term, termData] of termsData) {
    termData.inverseDocumentFrequency = Math.log(
      (totalDocuments - termData.documentFrequency + 0.5) /
        (termData.documentFrequency + 0.5) +
        1,
    );
    termsData.set(term, termData);
  }
}

/**
 * Remove a document from the full text search index.
 * Note: this will still require a post-processing sync to disk
 * @param root named parameters
 * @param root.documentID the id of the document to remove
 */
export async function deleteFTSDocument({
  documentID,
}: {
  documentID: string;
}): Promise<void> {
  const document = documentsData.get(documentID);
  if (document) {
    documentsData.delete(documentID);

    for (const term of Object.keys(document.termFrequency)) {
      const termData = termsData.get(term);
      if (!termData) {
        continue;
      }
      termData.documentFrequency =
        termData.documentFrequency - document.termFrequency[term];
      if (termData.documentFrequency <= 0) {
        termsData.set(term, termData);
      } else {
        termsData.delete(term);
      }
    }

    try {
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- safe
      await unlink(
        basePath +
          '/' +
          (await secureVerifyDocumentID({ documentID })) +
          '.json',
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        return;
      }
      throw error;
    }
  }
}

/**
 * Verify if a document has been indexed
 *
 * **Note**: We are using the FTS index as "ground truth" for speed
 * @param root named parameters
 * @param root.documentID the id of the document
 * @returns true if the document exists
 */
export async function exists({
  documentID,
}: {
  documentID: string;
}): Promise<boolean> {
  return documentsData.has(documentID);
}

/**
 * Search for chunks using PostgreSQL full-text search capabilities
 * @param params Search parameters
 * @param params.maxResults Maximum number of results to return
 * @param params.query Text query to search for
 * @returns Array of chunk IDs and their search rank scores
 */
export async function FullTextSearch({
  maxResults,
  query,
}: {
  maxResults: number;
  query: string;
}): Promise<SearchResult[]> {
  const speedMonitor = new SpeedMonitor();

  try {
    // Convert query to tsquery format with word prefix matching
    const searchQuery = query
      .split(/\s+/)
      .filter((term) => {
        return term.length > 0;
      })
      .map((term) => {
        return `${term}:*`;
      })
      .join(' & ');

    // Build base query with full-text search using ts_rank_cd for ranking
    const searchSql = sql<{
      chunkID: number;
      documentID: string;
      score: number;
    }>`
      SELECT 
        ${chunksTable.chunkID} as "chunkID",
        ${chunksTable.documentID}::text as "documentID",
        ts_rank_cd(to_tsvector('english', ${chunksTable.chunkContent}), to_tsquery('english', ${searchQuery})) as score
      FROM ${chunksTable}
      WHERE to_tsvector('english', ${chunksTable.chunkContent}) @@ to_tsquery('english', ${searchQuery})
      ORDER BY score DESC
      LIMIT ${maxResults}
    `;

    // Execute search query and transform results
    let searchResults: SearchResult[];
    try {
      const queryResult = await pgDatabase.execute(searchSql);
      interface QueryRow {
        chunkID: number;
        documentID: string;
        score: number;
      }
      searchResults = (queryResult.rows as unknown as QueryRow[]).map((row) => {
        return {
          chunkID: row.chunkID,
          documentID: row.documentID,
          score: row.score,
        };
      });
    } catch (databaseError) {
      const error = new Error('Failed to execute search query', {
        cause: databaseError,
      });
      logger.error('Full-text search failed', { error: databaseError });
      throw error;
    }

    const executionTime = await speedMonitor.finishMonitoring();
    await apmReport({
      event: 'FullTextSearch',
      properties: {
        executionTime,
        resultCount: searchResults.length,
      },
    });

    return searchResults;
  } catch (error) {
    const typedError =
      error instanceof Error
        ? error
        : new Error('Unknown error during full-text search');

    const errorParameters = {
      error: typedError,
      message: 'Error during full-text search',
      properties: {
        maxResults,
        query,
      },
      severity: 'error' as const,
    };

    await errorReport(errorParameters);
    logger.error('Full-text search failed', { error: typedError });
    throw typedError;
  }
}

/**
 * Load the index from disk
 */
export async function loadFTSIndexFromDisk(): Promise<void> {
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- safe
    const files = await readdir(basePath, { recursive: true });
    if (files.length > 0) {
      for (const file of files) {
        if (file.endsWith('.json') && file !== 'termsData.json') {
          const documentData = JSON.parse(
            // eslint-disable-next-line security/detect-non-literal-fs-filename -- safe
            await readFile(`${basePath}/${file}`, { encoding: 'utf8' }),
          ) as DocumentData;
          documentsData.set(file.replace('.json', ''), documentData);
        }
      }
      logger.info(`${documentsData.size} documents loaded in FTS index`);
      if (files.includes('termsData.json')) {
        termsData = new Map(
          JSON.parse(
            // eslint-disable-next-line security/detect-non-literal-fs-filename -- safe
            await readFile(basePath + '/termsData.json', { encoding: 'utf8' }),
          ) as typeof termsData,
        );
        logger.info(`${termsData.size} terms loaded in FTS index`);
      }
    }
  } catch (error) {
    // @ts-expect-error fix later, not a problem right now
    if (error.code === 'ENOENT') {
      logger.info('No FTS index found');
    } else {
      await errorReport({
        error,
        message: 'Error loading FTS index from disk',
      });
    }
  }
}

/**
 * Save the index to disk
 */
export async function saveFTSIndexToDisk(): Promise<void> {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- safe
  await mkdir(basePath, { recursive: true });
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- safe
  await writeFile(basePath + '/termsData.json', JSON.stringify([...termsData]));
  logger.debug('termsData saved to ' + basePath + '/termsData.json');
  for (const [documentID, documentData] of documentsData) {
    if (documentID !== 'undefined') {
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- safe
      await writeFile(
        basePath +
          '/' +
          (await secureVerifyDocumentID({ documentID })) +
          '.json',
        JSON.stringify(documentData),
      );
      logger.debug(
        'document saved to ' + basePath + '/' + documentID + '.json',
      );
    }
  }
}

/**
 * Generate a report of the usage statistics of the FTS index
 * @returns totalDocuments and totalTerms
 */
export async function usageStatsFTS(): Promise<{
  totalDocuments: number;
  totalTerms: number;
}> {
  return {
    totalDocuments: documentsData.size,
    totalTerms: termsData.size,
  };
}
