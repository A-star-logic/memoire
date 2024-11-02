// libs
import { TokenTextSplitter } from '@langchain/textsplitters'; /* cSpell: disable-line */
import type { EmbeddingModelOutput } from './model/ai-embedding-model-contracts.js';
import { embedDocument, embedQuery } from './model/index.js';

export { isTooLarge } from './model/index.js';

/**
 * Split a document into chunks. This is a simple way of creating chunks and not context-aware
 * @param root named parameters
 * @param root.document the document to split into chunks
 * @returns a list of chunks
 */
async function createDocumentChunks({
  document,
}: {
  document: string;
}): Promise<string[]> {
  const textSplitter = new TokenTextSplitter({
    chunkOverlap: 0,
    chunkSize: 512,
    encodingName: 'cl100k_base',
  });

  const cleanedDocument = document.replaceAll('\n', ' ');
  // trim and remove duplicate whitespace
  const trimmedDocument = cleanedDocument.replaceAll(/\s+/g, ' ').trim();
  return textSplitter.splitText(trimmedDocument);
}

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
}): Promise<EmbeddingModelOutput | undefined> {
  const chunks = await createDocumentChunks({ document });
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
}): Promise<number[] | undefined> {
  const embeddings = await embedQuery({ chunks: [query] });
  if (!embeddings) {
    return undefined;
  }
  return embeddings[0].embedding;
}
