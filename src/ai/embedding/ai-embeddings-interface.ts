// libs
import type { EmbeddingModelOutput } from './model/ai-embedding-model-contracts.js';
import { createLengthBasedChunks } from './chunking/ai-chunking-fixed-size.js';
import { embedDocument, embedQuery } from './model/index.js';

export { isTooLarge } from './model/index.js';

/**
 * Automatically embed a document
 * @param root named parameters
 * @param root.document the the document to embed
 * @returns A list of chunks embedded
 */
export async function autoEmbed({
  document,
}: {
  document: string;
}): Promise<EmbeddingModelOutput> {
  const chunks = createLengthBasedChunks({ document });
  const embeddings = await embedDocument({ chunks });
  return embeddings;
}

/**
 * Embed a search query
 * @param root named parameters
 * @param root.query the query to embed
 * @returns the embedding of the query
 */
export async function autoEmbedQuery({
  query,
}: {
  query: string;
}): Promise<number[]> {
  // todo: implemet HYDE to improve vector retrival. ref: https://medium.com/prompt-engineering/hyde-revolutionising-search-with-hypothetical-document-embeddings-3474df795af8
  const embeddings = await embedQuery({ chunks: [query] });
  return embeddings[0].embedding;
}
