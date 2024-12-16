// AI
import { rerank } from '../ai/ai-reranker.js';
import {
  autoEmbed,
  autoEmbedQuery,
} from '../ai/embedding/ai-embeddings-interface.js';

// schemas
import type { DocumentLinkBody } from '../api/search/api-search-schemas.js';

// Database
import {
  calculateIDF,
  FTSSearch,
  loadFTSIndexFromDisk,
  saveFTSIndexToDisk,
} from '../database/search/database-search-fts.js';
import {
  addDocument,
  deleteDocument,
} from '../database/search/database-search-interface.js';
import { getSourceDocuments } from '../database/search/database-search-source.js';
import {
  loadVectorIndexFromDisk,
  saveVectorIndexToDisk,
  vectorSearch,
} from '../database/search/database-search-vector.js';

// core
import { extractFromUrl } from './core-extractor.js';

await loadVectorIndexFromDisk();
await loadFTSIndexFromDisk();

/**
 * Add documents to the search index, save them to disk and calculate the IDF
 * @param root named parameters
 * @param root.documents the documents to add
 */
export async function addDocuments({
  documents,
}: DocumentLinkBody): Promise<void> {
  for (const document of documents) {
    const content = await extractFromUrl({ url: document.url });
    const autoEmbedResult = await autoEmbed({ document: content });
    await addDocument({
      content,
      documentID: document.documentID,
      embedOutput: autoEmbedResult,
      metadata: document.metadata ?? {},
      title: document.title,
    });
  }
  await calculateIDF();
  await saveFTSIndexToDisk();
  await saveVectorIndexToDisk();
}

/**
 * Search for the most similar documents, and return an array of scored documents
 * @param root named parameters
 * @param root.enhanceSimilarity increase the semantic search if set true (default: false)
 * @param root.maxResults the maximum number of results returned by the query (default: 100)
 * @param root.query the query for keyword search
 * @returns an object with two arrays: one for vector search, one for keyword search
 */
export async function search({
  enhanceSimilarity = false,
  maxResults = 100,
  query,
}: {
  enhanceSimilarity?: boolean;
  maxResults?: number;
  query: string;
}): Promise<
  {
    content: string;
    documentID: string;
    highlights: string | undefined;
    metadata: object;
    score: number;
    title: string | undefined;
  }[]
> {
  const embeddingPromise = autoEmbedQuery({
    query,
    useHyde: enhanceSimilarity,
  });
  const keywordPromise = FTSSearch({ maxResults, query });
  const vectorPromise = vectorSearch({
    embedding: await embeddingPromise,
    maxResults,
  });
  const [keywordResults, vectorResults] = await Promise.all([
    keywordPromise,
    vectorPromise,
  ]);

  const originalDocumentsPromise = getSourceDocuments({
    searchResults: [...vectorResults, ...keywordResults],
  });
  const reRanked = await rerank({ keywordResults, maxResults, vectorResults });
  const originalDocuments = await originalDocumentsPromise;

  const results = [];
  for (const result of reRanked) {
    const original = originalDocuments[result.documentID];
    results.push({
      content: original.chunkedContent.join(' '),
      documentID: result.documentID,
      highlights:
        typeof result.chunkID === 'number' // 0 is considered false, so result.chunkID === 0 will not trigger the code
          ? original.chunkedContent[result.chunkID]
          : undefined,
      metadata: original.metadata,
      score: result.score,
      title: original.title,
    });
  }

  return results;
}

/**
 * Delete a list of from the search, and re-calculate the IDF
 * @param root named parameters
 * @param root.documentIDs the document IDs
 */
export async function deleteDocuments({
  documentIDs,
}: {
  documentIDs: string[];
}): Promise<void> {
  for (const documentID of documentIDs) {
    await deleteDocument({ documentID });
  }
  await calculateIDF();
  await saveFTSIndexToDisk();
}
