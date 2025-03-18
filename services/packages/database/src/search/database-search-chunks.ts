import { SpeedMonitor } from '@astarlogic/services-utils/utils-apm.js';
import { cosineDistance, desc, eq, gt, sql } from 'drizzle-orm';
import { pgDatabase } from '../database-config/database-postgresql.js';
import { apmReport } from '../reporting/database-reporting-interface.js';
import { searchChunksTable } from './database-search-schemas.js';

/**
 * Add a chunk to the database
 * @param root named parameters
 * @param root.chunkContent the content of the chunk
 * @param root.chunkID the ID of the chunk
 * @param root.documentID the ID of the document
 * @param root.embedding the embedding of the chunk
 */
export async function addChunk({
  chunkContent,
  chunkID,
  documentID,
  embedding,
}: {
  chunkContent: string;
  chunkID: number;
  documentID: string;
  embedding: number[];
}): Promise<void> {
  await pgDatabase.insert(searchChunksTable).values({
    chunkContent,
    chunkID,
    documentID,
    embedding,
  });
}

/**
 * Delete all the chunks related to a document
 * @param root named parameters
 * @param root.documentID the id of the document
 */
export async function deleteChunks({
  documentID,
}: {
  documentID: string;
}): Promise<void> {
  await pgDatabase
    .delete(searchChunksTable)
    .where(eq(searchChunksTable.documentID, documentID));
}

/**
 * Search in the chunk text index for similar text
 * @param root named parameters
 * @param root.maxResults the maximum number of results
 * @param root.query the query to search for
 * @returns a sorted array of chunks with scores
 */
export async function textSearch({
  maxResults,
  query,
}: {
  maxResults: number;
  query: string;
}): Promise<
  { chunkContent: string; chunkID: number; documentID: string; score: number }[]
> {
  const reworkedQuery = query.replaceAll(' ', ' | ');
  const score = sql<number>`ts_rank_cd(to_tsvector('english', ${searchChunksTable.chunkContent}), to_tsquery('english', ${reworkedQuery}))`;
  const records = await pgDatabase
    .select({
      chunkContent: searchChunksTable.chunkContent,
      chunkID: searchChunksTable.chunkID,
      documentID: searchChunksTable.documentID,
      score,
    })
    .from(searchChunksTable)
    .where(
      sql`to_tsvector('english', ${searchChunksTable.chunkContent}) @@ to_tsquery('english', ${reworkedQuery})`,
    )
    .orderBy(desc(score))
    .limit(maxResults);

  return records;
}

/**
 * Search in the chunk vector index for similar embeddings
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
}): Promise<
  {
    chunkContent: string;
    chunkID: number;
    documentID: string;
    score: number;
  }[]
> {
  const speedMonitor = new SpeedMonitor();

  const distance = sql<number>`1 - (${cosineDistance(searchChunksTable.embedding, embedding)})`;
  const records = await pgDatabase
    .select({
      chunkContent: searchChunksTable.chunkContent,
      chunkID: searchChunksTable.chunkID,
      documentID: searchChunksTable.documentID,
      score: distance,
    })
    .from(searchChunksTable)
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
