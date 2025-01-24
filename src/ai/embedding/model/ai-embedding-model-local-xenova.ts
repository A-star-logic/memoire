// libs
import { pipeline } from '@huggingface/transformers';
import { get_encoding } from 'tiktoken';

// embedding models contracts
import type {
  EmbeddingModelInput,
  EmbeddingModelOutput,
} from './ai-embedding-model-contracts.js';

const xenovaExtractor = await pipeline(
  'feature-extraction',
  'Xenova/all-MiniLM-L6-v2',
);

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
    const output = await xenovaExtractor(chunk, {
      normalize: true,
      pooling: 'mean',
    });
    // cspell: disable-next-line -- Not our code
    const embedding = (output.tolist() as number[][])[0];
    return {
      chunkID: iteration,
      chunkText: chunk,
      embedding,
    };
  });

  const embeddings = await Promise.all(embeddingsPromise);
  return embeddings;
}

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
  return tokens.length >= 512;
}
