// schemas
import type {
  DocumentLinkBody,
  IngestRawBody,
  SearchGetDocumentResponse,
} from '../api/api-schemas.js';

// AI
import { rerank } from '../ai/ai-reranker.js';
import {
  autoEmbed,
  autoEmbedQuery,
} from '../ai/embedding/ai-embeddings-interface.js';

// Database
import {
  calculateIDF,
  exists,
  FTSSearch,
  loadFTSIndexFromDisk,
  saveFTSIndexToDisk,
} from '../database/search/database-search-fts.js';
import {
  addDocument,
  deleteDocument,
  retrieveDocument,
} from '../database/search/database-search-interface.js';
import { getSourceDocuments } from '../database/search/database-search-source.js';
import {
  loadVectorIndexFromDisk,
  saveVectorIndexToDisk,
  vectorSearch,
} from '../database/search/database-search-vector.js';

// core
import { extractContent } from './core-extractor.js';

await loadVectorIndexFromDisk();
await loadFTSIndexFromDisk();

/**
 * Add documents to the search index, save them to disk and calculate the IDF
 * @param root named parameters
 * @param root.documents the documents to add
 */
export async function addDocuments({
  documents,
}: DocumentLinkBody | IngestRawBody): Promise<void> {
  for (const document of documents) {
    const content = await extractContent({ document });

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

/**
 * Verify a document exist in Memoire
 * @param root named parameters
 * @param root.documentID the document ID
 * @returns boolean
 */
export async function documentExist({
  documentID,
}: {
  documentID: string;
}): Promise<boolean> {
  return exists({ documentID });
}

/**
 * Fetch a document using its ID
 * @param root named parameters
 * @param root.documentID the document ID
 * @returns The document and its source
 */
export async function getDocument({
  documentID,
}: {
  documentID: string;
}): Promise<SearchGetDocumentResponse | undefined> {
  return retrieveDocument({ documentID });
}

/**
 * Search for the most similar documents, and return an array of scored documents
 * @param root named parameters
 * @param root.maxResults the maximum number of results returned by the query (default: 100)
 * @param root.useHyde uses hyde architecture if set true
 * @param root.query the query for keyword search
 * @returns an object with two arrays: one for vector search, one for keyword search
 */
export async function search({
  maxResults = 100,
  query,
  useHyde = false,
}: {
  maxResults?: number;
  query: string;
  useHyde?: boolean;
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
    useHyde,
  });
  const keywordPromise = FTSSearch({ query });
  const vectorPromise = vectorSearch({
    embedding: await embeddingPromise,
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
