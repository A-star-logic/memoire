// node
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';

// utils
import { SpeedMonitor } from '../../utils/utils-apm.js';
import { secureVerifyDocumentID } from '../../utils/utils-security.js';
import { prepareForBM25 } from '../../utils/utils-text-processing.js';
import { logger } from '../reporting/database-external-config.js';

// database
import {
  apmReport,
  errorReport,
} from '../reporting/database-interface-reporting.ee.js';

const b = 0.75;
const k1 = 1.5;

interface DocumentData {
  termFrequency: { [key: string]: number };
  wordLength: number;
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
 * Load the index from disk
 */
export async function loadFTSIndexFromDisk(): Promise<void> {
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const files = await readdir(basePath, { recursive: true });
    if (files.length > 0) {
      for (const file of files) {
        if (file.endsWith('.json') && file !== 'termsData.json') {
          const documentData = JSON.parse(
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            await readFile(`${basePath}/${file}`, { encoding: 'utf8' }),
          ) as DocumentData;
          documentsData.set(file.replace('.json', ''), documentData);
        }
      }
      logger.info(`${documentsData.size} documents loaded in FTS index`);
      if (files.includes('termsData.json')) {
        termsData = new Map(
          JSON.parse(
            // eslint-disable-next-line security/detect-non-literal-fs-filename
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
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await mkdir(basePath, { recursive: true });
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await writeFile(basePath + '/termsData.json', JSON.stringify([...termsData]));
  logger.debug('termsData saved to ' + basePath + '/termsData.json');
  for (const [documentID, documentData] of documentsData) {
    if (documentID !== 'undefined') {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
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
 * Calculate the bm25 score of a query against a document
 * @param root named parameters
 * @param root.averageDocumentLength the average document length
 * @param root.documentID the id of the document
 * @param root.normalizedQuery the query normalised
 * @returns the score
 */
async function bm25({
  averageDocumentLength,
  documentID,
  normalizedQuery,
}: {
  averageDocumentLength: number;
  documentID: string;
  normalizedQuery: string[];
}): Promise<number> {
  let score = 0;
  const document = documentsData.get(documentID);
  if (!document) throw new Error(`Document ${documentID} not found`);
  const { termFrequency, wordLength } = document;
  for (const term of normalizedQuery) {
    if (term in termFrequency) {
      const freq = termFrequency[term];
      const idf = termsData.get(term)?.inverseDocumentFrequency;
      if (!idf)
        throw new Error(
          `IDF of ${term} not found (this usually indicates the calculateIDF was not run)`,
        );
      const numerator = idf * freq * (k1 + 1);
      const denominator =
        freq + k1 * (1 - b + (b * wordLength) / averageDocumentLength);
      score += numerator / denominator;
    }
  }
  return score;
}

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
  for (const [term, frequency] of Object.entries(documentTermFrequency)) {
    const termData: TermsData = termsData.get(term) ?? {
      documentFrequency: 0,
      inverseDocumentFrequency: Number.NaN,
    };

    termData.documentFrequency = termData.documentFrequency + frequency;

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
 * Execute a full text search
 * @param root named parameters
 * @param root.query the text query to use for the full text search
 * @param root.maxResults the maximum number of results
 * @returns an array of scores
 */
export async function FTSSearch({
  maxResults,
  query,
}: {
  maxResults: number;
  query: string;
}): Promise<{ documentID: string; score: number }[]> {
  const speedMonitor = new SpeedMonitor();
  const normalizedQuery = await prepareForBM25({ text: query });

  let totalWordsLength = 0;
  for (const document of documentsData.values()) {
    totalWordsLength += document.wordLength;
  }
  const averageDocumentLength = totalWordsLength / documentsData.size;

  const results: Awaited<ReturnType<typeof FTSSearch>> = [];
  // todo: can be optimised to limit results size to maxResult instead of splicing it at the end
  for (const documentID of documentsData.keys()) {
    const score = await bm25({
      averageDocumentLength,
      documentID,
      normalizedQuery,
    });
    results.push({ documentID, score });
  }
  results.sort((a, b) => {
    return b.score - a.score;
  });

  const executionTime = await speedMonitor.finishMonitoring();
  const totalDocuments = documentsData.size;
  const totalTerms = termsData.size;
  await apmReport({
    event: 'FTSSearch',
    properties: {
      executionTime,
      totalDocuments,
      totalTerms,
    },
  });

  return results.slice(0, maxResults);
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
      // eslint-disable-next-line security/detect-non-literal-fs-filename
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
