import { rerank } from '../ai/ai-reranker.js';
import {
  addFTSDocument,
  FTSSearch,
  loadFTSIndexFromDisk,
} from '../database/search/database-search-fts.js';
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
 * The document.content MUST be chunked, or it will mess with the highlights
 * @param root named parameters
 * @param root.chunkedContent the content as chunks
 * @param root.documentID the document ID
 * @param root.embeddings the chunks that have been embedded
 * @param root.metadata the metadata of the document
 * @param root.title the document title
 */
export async function addDocument({
  chunkedContent,
  documentID,
  embeddings,
  metadata,
  title,
}: {
  chunkedContent: string[];
  documentID: string;
  embeddings: { chunkID: number; embedding: number[] }[]; // todo remove and replace by a call within this function
  metadata: object;
  title: string;
}): Promise<void> {
  // if (await exists({ documentID })) {
  //   await deleteVectorChunks({ documentID });
  // }

  await bulkAddVectorChunks({ documentID, embeddings });

  await addFTSDocument({
    documentID,
    text: title + chunkedContent.join(' '),
  });

  await saveSourceDocument({
    chunkedContent,
    documentID,
    metadata,
    title,
  });
}

/**
 * Search for the most similar documents, and return an array of scored documents
 * @param root named parameters
 * @param root.embedding removeme
 * @param root.maxResults the maximum number of results returned by the query (default: 100)
 * @param root.query the query for keyword search
 * @returns an object with two arrays: one for vector search, one for keyword search
 */
export async function search({
  embedding,
  maxResults = 100,
  query,
}: {
  embedding: number[]; // todo remove
  maxResults?: number;
  query: string;
}): Promise<
  {
    content: string;
    documentID: string;
    highlights: string | undefined;
    metadata: object;
    score: number;
    title: string;
  }[]
> {
  // const embeddingResponse = await embedDocument({ chunks: [query] });

  const keywordPromise = FTSSearch({ maxResults, query });
  const vectorPromise = vectorSearch({
    // embedding: embeddingResponse[0].embedding,
    embedding,
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
