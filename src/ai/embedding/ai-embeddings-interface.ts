// libs
import type { EmbeddingModelOutput } from './model/ai-embedding-model-contracts.js';
import { createChunks, embedDocument, embedQuery } from './model/index.js';

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
  const chunks = await createChunks({ document });
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
  const embeddings = await embedQuery({ chunks: [query] });
  return embeddings[0].embedding;
}
