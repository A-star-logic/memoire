// libs
import type { EmbeddingModelOutput } from './model/ai-embedding-model-contracts.js';
import { generateHypotheticalAnswer } from '../agents/ai-agents-hyde.ts.js';
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
 * @param root.useHyde generated hypothetical answer for embedding (HyDE) if true to accuracy else uses query embedding
 * @returns the embedding of the query
 */
export async function autoEmbedQuery({
  query = 'speed',
  useHyde = false,
}: {
  query: string;
  useHyde?: boolean;
}): Promise<number[]> {
  if (useHyde) {
    const hypotheticalAnswer = await generateHypotheticalAnswer({ query });
    const answerChunk = createLengthBasedChunks({
      document: hypotheticalAnswer,
    })[0];

    const HypotheticalDocumentEmbedding = await embedDocument({
      chunks: [answerChunk],
    }); // Good to embed in the same way we embed doc, to get most out of vector similarity
    return HypotheticalDocumentEmbedding[0].embedding;
  }
  const embeddings = await embedQuery({ chunks: [query] });
  return embeddings[0].embedding;
}
