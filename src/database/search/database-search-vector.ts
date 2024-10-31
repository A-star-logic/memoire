// node
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';

// utils
import { secureVerifyDocumentID } from '../../utils/utils-security.js';
import { calculateSimilarity } from '../../utils/utils-similarity.js';
import { logger } from '../reporting/database-external-config.js';
import { errorReport } from '../reporting/database-interface-reporting.ee.js';

const documentsData: {
  [documentIDatChunkID: string]: {
    chunkID: number;
    documentID: string;
    embedding: number[];
  };
} = {};

/**
 * Load the index from disk
 */
export async function loadVectorIndexFromDisk(): Promise<void> {
  try {
    const files = await readdir('.memoire/vector', { recursive: true });
    if (files.length > 0) {
      for (const file of files) {
        if (file.endsWith('.json')) {
          const documentData = JSON.parse(
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            await readFile(`.memoire/vector/${file}`, { encoding: 'utf8' }),
          ) as (typeof documentsData)[string];
          documentsData[documentData.documentID] = documentData;
        }
      }
    }
    logger.info(
      `${Object.keys(documentsData).length} documents loaded in vector index`,
    );
  } catch (error) {
    // @ts-expect-error fix later, not a problem right now
    if (error.code === 'ENOENT') {
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
  await mkdir('.memoire/vector', { recursive: true });
  for (const documentID of Object.keys(documentsData)) {
    if (documentID !== 'undefined') {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      await writeFile(
        '.memoire/vector/' +
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
  for (const { chunkID, embedding } of embeddings) {
    documentsData[`${documentID}@${chunkID}`] = {
      chunkID,
      documentID,
      embedding,
    };
  }
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
  const result: Awaited<ReturnType<typeof vectorSearch>> = [];
  // todo: can be optimised to limit results size to maxResult instead of splicing it at the end
  for (const chunk of Object.values(documentsData)) {
    result.push({
      chunkID: chunk.chunkID,
      documentID: chunk.documentID,
      score: await calculateSimilarity({
        vectorA: chunk.embedding,
        vectorB: embedding,
      }),
    });
  }
  result.sort((a, b) => {
    return b.score - a.score;
  });
  return result.splice(maxResults + 1);
}

// /**
//  * Delete all the chunks related to a document
//  * @param root named parameters
//  * @param root.documentID the id of the document
//  */
// export async function deleteVectorChunks({
//   documentID,
// }: {
//   documentID: string;
// }): Promise<void> {
//   const keys = Object.keys(documentsData).filter((key) => {
//     return key.startsWith(`${documentID}@`);
//   });
//   for (const key of keys) {
//     // eslint-disable-next-line fp/no-delete
//     delete documentsData[key]; // todo transform to a set
//   }
// }
