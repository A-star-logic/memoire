// libs
import { SpeedMonitor } from '@astarlogic/services-utils/utils-apm.js';
import { cosineDistance, count, desc, eq, gt, sql } from 'drizzle-orm';
import { pgDatabase } from '../postgresql-config/database-postgresql.js';
import { logger } from '../reporting/database-external-config.js';
import { apmReport } from '../reporting/database-reporting-interface.js';
import { chunksTable } from './database-search-schemas.js';

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
  embeddings: {
    chunkContent: string;
    chunkID: number;
    embedding: number[];
  }[];
}): Promise<void> {
  const speedMonitor = new SpeedMonitor();

  for (const { chunkContent, chunkID, embedding } of embeddings) {
    await pgDatabase.insert(chunksTable).values({
      chunkContent,
      chunkID,
      documentID,
      embeddingTE3L: embedding,
    });
  }

  await apmReport({
    event: 'bulkAddVectorChunks',
    properties: {
      chunks: embeddings.length,
      executionTime: speedMonitor.finishMonitoring(),
    },
  });

  logger.debug(`Added ${embeddings.length} chunks for document ${documentID}`);
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
  await pgDatabase
    .delete(chunksTable)
    .where(eq(chunksTable.documentID, documentID));
}

/**
 * Generate a report of the usage statistics of the vector index
 * @returns totalDocuments and totalTerms
 */
export async function usageStatsVector(): Promise<{
  totalDocuments: number;
}> {
  const result = await pgDatabase.select({ count: count() }).from(chunksTable);

  return {
    totalDocuments: Number(result[0]?.count || 0),
  };
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

  const distance = sql<number>`1 - (${cosineDistance(chunksTable.embeddingTE3L, embedding)})`;
  const records = await pgDatabase
    .select({
      chunkID: chunksTable.chunkID,
      documentID: chunksTable.documentID,
      score: distance,
    })
    .from(chunksTable)
    .where(gt(distance, 0.5))
    .orderBy(desc(distance))
    .limit(maxResults)
    .execute();

  await apmReport({
    event: 'vectorSearch',
    properties: {
      executionTime: await speedMonitor.finishMonitoring(),
      totalDocuments: records.length,
    },
  });

  return records;
}
