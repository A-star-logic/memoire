// node
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';

// utils
import { SpeedMonitor } from '../../utils/utils-apm.js';
import { secureVerifyDocumentID } from '../../utils/utils-security.js';
import { calculateSimilarity } from '../../utils/utils-similarity.js';
import { logger } from '../reporting/database-external-config.js';

// database
import {
  apmReport,
  errorReport,
} from '../reporting/database-interface-reporting.ee.js';

const documentsData: {
  [documentIDatChunkID: string]: {
    chunkID: number;
    documentID: string;
    embedding: number[];
  };
} = {};

const basePath =
  process.env.NODE_ENV === 'test' ? '.testMemoire/vector' : '.memoire/vector';

/**
 * Load the index from disk
 */
export async function loadVectorIndexFromDisk(): Promise<void> {
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const files = await readdir(basePath, { recursive: true });
    if (files.length > 0) {
      for (const file of files) {
        if (file.endsWith('.json')) {
          const documentData = JSON.parse(
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            await readFile(`${basePath}/${file}`, { encoding: 'utf8' }),
          ) as (typeof documentsData)[string];
          documentsData[documentData.documentID] = documentData;
        }
      }
    }
    logger.info(
      `${Object.keys(documentsData).length} documents loaded in vector index`,
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('ENOENT')) {
      logger.info('No Vector index found');
    } else {
      await errorReport({
        error,
        message: 'Error loading Vector index from disk',
      });
    }
  }
}

/**
 * Save the index to disk
 */
export async function saveVectorIndexToDisk(): Promise<void> {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await mkdir(basePath, { recursive: true });
  for (const documentID of Object.keys(documentsData)) {
    if (documentID !== 'undefined') {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      await writeFile(
        basePath +
          '/' +
          (await secureVerifyDocumentID({ documentID })) +
          '.json',
        JSON.stringify({
          chunkID: documentsData[documentID].chunkID,
          documentID: documentsData[documentID].documentID,
          embedding: documentsData[documentID].embedding,
        } satisfies (typeof documentsData)[string]),
      );
    }
  }
}

/**
 * Bulk add the chunks that will be used for search
 * @param root named parameters
 * @param root.documentID the document ID
 * @param root.embeddings the chunks for text search
 * @returns undefined
 */
export async function bulkAddVectorChunks({
  documentID,
  embeddings,
}: {
  documentID: string;
  embeddings: { chunkID: number; embedding: number[] }[];
}): Promise<void> {
  const speedMonitor = new SpeedMonitor();

  for (const { chunkID, embedding } of embeddings) {
    documentsData[`${documentID}@${chunkID}`] = {
      chunkID,
      documentID,
      embedding,
    };
  }

  await apmReport({
    event: 'bulkAddVectorChunks',
    properties: {
      chunks: embeddings.length,
      executionTime: speedMonitor.finishMonitoring(),
      totalDocuments: Object.keys(documentsData).length,
    },
  });

  logger.debug(`Added ${embeddings.length} chunks for document ${documentID}`);
}

/**
 * Search in the index for similar embeddings
 * @param root named parameters
 * @param root.embedding the embedding of the query
 * @param root.maxResults the maximum number of results
 * @returns a sorted array with scores
 */
export async function vectorSearch({
  embedding,
  maxResults,
}: {
  embedding: number[];
  maxResults: number;
}): Promise<{ chunkID: number; documentID: string; score: number }[]> {
  const speedMonitor = new SpeedMonitor();

  const scored: Awaited<ReturnType<typeof vectorSearch>> = [];
  // todo: can be optimised to limit results size to maxResult instead of slicing it at the end
  for (const chunk of Object.values(documentsData)) {
    scored.push({
      chunkID: chunk.chunkID,
      documentID: chunk.documentID,
      score: await calculateSimilarity({
        vectorA: chunk.embedding,
        vectorB: embedding,
      }),
    });
  }
  scored.sort((a, b) => {
    return b.score - a.score;
  });
  const results = scored.slice(0, Math.max(100, maxResults));

  await apmReport({
    event: 'vectorSearch',
    properties: {
      executionTime: await speedMonitor.finishMonitoring(),
      totalDocuments: Object.keys(documentsData).length,
    },
  });

  return results;
}

/**
 * Delete all the chunks related to a document
 * @param root named parameters
 * @param root.documentID the id of the document
 */
export async function deleteVectorChunks({
  documentID,
}: {
  documentID: string;
}): Promise<void> {
  const keys = Object.keys(documentsData).filter((key) => {
    return key.startsWith(`${documentID}@`);
  });
  for (const key of keys) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete, fp/no-delete
    delete documentsData[key];
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await unlink(
      basePath +
        '/' +
        (await secureVerifyDocumentID({ documentID: key })) +
        '.json',
    );
  }
}

/**
 * Generate a report of the usage statistics of the vector index
 * @returns totalDocuments and totalTerms
 */
export async function usageStatsVector(): Promise<{
  totalDocuments: number;
}> {
  return {
    totalDocuments: Object.keys(documentsData).length,
  };
}
