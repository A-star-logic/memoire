import { Mistral } from '@mistralai/mistralai';
import type { Environment } from '../../../../environment';

export let mistral: Mistral;

/**
 * Initialize the OCR (Optical Character Recognition) service
 * @param root named parameters
 * @param root.env environment variables
 */
export function initOcr({ env }: { env: Environment }): void {
  /* v8 ignore start */
  if (!env.MISTRAL_API_KEY) {
    throw new Error('MISTRAL_API_KEY is not set');
  }
  mistral = new Mistral({
    apiKey: env.MISTRAL_API_KEY,
  });
}
