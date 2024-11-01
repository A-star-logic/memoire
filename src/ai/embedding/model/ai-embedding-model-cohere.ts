// embedding models contracts
import type {
  EmbeddingModelInput,
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
  throw new Error('Cohere is not implemented');
}

export async function embedDocument({
  chunks,
}: EmbeddingModelInput): Promise<EmbeddingModelOutput> {
  throw new Error('Cohere is not implemented');
}

export async function embedQuery({
  chunks,
}: EmbeddingModelInput): Promise<EmbeddingModelOutput> {
  throw new Error('Cohere is not implemented');
}
