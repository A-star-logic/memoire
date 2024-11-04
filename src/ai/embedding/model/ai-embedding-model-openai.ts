// libs
// eslint-disable-next-line camelcase
import { get_encoding } from 'tiktoken';

// embedding models contracts
import type {
  // EmbeddingModelInput,
  EmbeddingModelOutput,
  IsTooLargeInput,
} from './ai-embedding-model-contracts.js';

/**
 * Verify that the string sent has less tokens than the maximum possible for the model
 * @param root named parameters
 * @param root.text the text to verify
 * @returns true or false
 */
export function isTooLarge({ text }: IsTooLargeInput): boolean {
  const encoding = get_encoding('cl100k_base');
  const tokens = encoding.encode(text);
  encoding.free();
  return tokens.length >= 3072;
}

/**
 * Call the embedding model
 * https://learn.microsoft.com/en-us/azure/ai-services/openai/reference#responses-1
 * @returns an object with the averaged embedding an an array of chunk embeddings
 */
export async function embedDocument(): Promise<EmbeddingModelOutput> {
  throw new Error('OpenAI is not implemented');
}
