import { rerank } from '../ai/ai-reranker.js';
import {
  autoEmbed,
  autoEmbedQuery,
} from '../ai/embedding/ai-embeddings-interface.js';
import {
  addFTSDocument,
  calculateIDF,
  FTSSearch,
  loadFTSIndexFromDisk,
  saveFTSIndexToDisk,
} from '../database/search/database-search-fts.js';
import { deleteDocument } from '../database/search/database-search-interface.js';
import {
  getSourceDocuments,
  saveSourceDocument,
} from '../database/search/database-search-source.js';
import {
  bulkAddVectorChunks,
  loadVectorIndexFromDisk,
  vectorSearch,
} from '../database/search/database-search-vector.js';

await loadVectorIndexFromDisk();
await loadFTSIndexFromDisk();

/**
 * Add a document for search.
 * **Note**: This function does not calculate the IDF, this needs to be done after ingesting documents
 * @param root named parameters
 * @param root.content the content of the document
 * @param root.documentID the document ID
 * @param root.metadata the metadata of the document
 * @param root.title the document title
 */
export async function addDocument({
  content,
  documentID,
  metadata,
  title = undefined,
}: {
  content: string;
  documentID: string;
  metadata: object;
  title: string | undefined;
}): Promise<void> {
  // if (await exists({ documentID })) {
  //   await deleteVectorChunks({ documentID });
  // }

  const autoEmbedPromise = autoEmbed({ document: content });

  await addFTSDocument({
    documentID,
    text: title ? title + content : content,
  });

  const autoEmbedResult = await autoEmbedPromise;
  await bulkAddVectorChunks({
    documentID,
    embeddings: autoEmbedResult,
  });

  await saveSourceDocument({
    chunkedContent: autoEmbedResult,
    documentID,
    metadata,
    title,
  });
}

/**
 * Search for the most similar documents, and return an array of scored documents
 * @param root named parameters
 * @param root.maxResults the maximum number of results returned by the query (default: 100)
 * @param root.query the query for keyword search
 * @returns an object with two arrays: one for vector search, one for keyword search
 */
export async function search({
  maxResults = 100,
  query,
}: {
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
  const embeddingPromise = autoEmbedQuery({ query });
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
