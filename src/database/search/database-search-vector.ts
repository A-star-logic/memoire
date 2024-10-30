// node
import { mkdir, readFile, writeFile } from 'node:fs/promises';

// utils
import { calculateSimilarity } from '../../utils/similarity.js';

let documentsData: {
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
    documentsData = JSON.parse(
      await readFile('.memoire/vector/documentsData.json', {
        encoding: 'utf8',
      }),
    ) as typeof documentsData;
  } catch {
    console.log('No full vector search index found; creating a new one');
  }
}

/**
 * Save the index to disk
 */
export async function saveVectorIndexToDisk(): Promise<void> {
  await mkdir('.memoire/vector', { recursive: true });
  await writeFile(
    '.memoire/vector/documentsData.json',
    JSON.stringify(documentsData),
  );
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
