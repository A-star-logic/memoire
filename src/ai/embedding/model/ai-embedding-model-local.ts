// libs
import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/hf_transformers';
// eslint-disable-next-line camelcase
import { get_encoding } from 'tiktoken';

// embedding models contracts
import type {
  EmbeddingModelInput,
  EmbeddingModelOutput,
} from './ai-embedding-model-contracts.js';

const model = new HuggingFaceTransformersEmbeddings({
  modelName: 'Xenova/all-MiniLM-L6-v2',
});

/**
 * Verify that the string sent has less tokens than the maximum possible for the model
 * @param root named parameters
 * @param root.text the document to verify
 * @returns true or false
 */
export function isTooLarge({ text }: { text: string }): boolean {
  const encoding = get_encoding('cl100k_base');
  const tokens = encoding.encode(text);
  encoding.free();
  return tokens.length >= 3072;
}

/**
 * Use the model to embed a list of chunks
 * @param root named parameters
 * @param root.chunks A document, or a list of chunks from a document to embed
 * @returns an object with the averaged embedding an an array of chunk embeddings
 */
export async function embedDocument({
  chunks,
}: EmbeddingModelInput): Promise<EmbeddingModelOutput> {
  const embeddingsPromise = chunks.map(async (chunk, iteration) => {
    return {
      chunkID: iteration,
      chunkText: chunk,
      embedding: await model.embedQuery(chunk),
    };
  });

  const embeddings = await Promise.all(embeddingsPromise);
  return embeddings;
}
