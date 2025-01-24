// types
import type {
  EmbeddingModelInput,
  EmbeddingModelOutput,
  IsTooLargeInput,
} from '@astarlogic/shared/schemas/ai/shared-schemas-ai-embedding.js';

// libs
import {
  errorReport,
  logger,
  Sentry,
} from '@astarlogic/services-database/reporting';
import { type Static, Type } from '@sinclair/typebox';
import { Check } from '@sinclair/typebox/value';
import axios from 'axios';
import { get_encoding } from 'tiktoken';

/* v8 ignore start */
if (!process.env.OPENAI_KEY) {
  throw new Error('Please set OPENAI_KEY');
}
if (!process.env.OPENAI_DEPLOYMENT) {
  logger.info('Using OpenAI for embedding');
}
if (process.env.OPENAI_DEPLOYMENT) {
  logger.info('Using Azure Open AI for embedding');
}
/* v8 ignore stop */

/**
 * https://learn.microsoft.com/en-us/azure/ai-services/openai/reference#responses-1
 */
export const azOpenAIEmbedResponseSchema = Type.Object(
  {
    data: Type.Array(
      Type.Object(
        {
          embedding: Type.Array(Type.Number()),
          index: Type.Number(),
          object: Type.Literal('embedding'),
        },
        { additionalProperties: false },
      ),
    ),
    model: Type.String(),
    object: Type.String(),
    usage: Type.Object(
      {
        prompt_tokens: Type.Number(),
        total_tokens: Type.Number(),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);
export interface AzOpenAIEmbedBody {
  dimensions: number;
  input: string | string[];
  model: 'text-embedding-3-large' | 'text-embedding-3-small';
  user?: string;
}

export type AzOpenAIEmbedResponse = Static<typeof azOpenAIEmbedResponseSchema>;

/**
 * Call the embedding model
 * https://learn.microsoft.com/en-us/azure/ai-services/openai/reference#responses-1
 * https://platform.openai.com/docs/api-reference/embeddings/create
 * @param root named parameters
 * @param root.chunks the chunk to embed
 * @returns an object with the averaged embedding an an array of chunk embeddings
 */
export async function embedDocument({
  chunks,
}: EmbeddingModelInput): Promise<EmbeddingModelOutput> {
  try {
    if (
      chunks.some((chunk) => {
        return isTooLarge({ text: chunk });
      })
    ) {
      throw new Error('A document was too large');
    }
    const { data } = await axios<AzOpenAIEmbedResponse>({
      data: {
        dimensions: 256,
        input: chunks,
        model: 'text-embedding-3-large',
      } satisfies AzOpenAIEmbedBody,
      headers: process.env.OPENAI_DEPLOYMENT
        ? {
            'api-key': process.env.OPENAI_KEY,
            'Content-Type': 'application/json',
          }
        : {
            Authorization: `Bearer ${process.env.OPENAI_KEY}`,
            'Content-Type': 'application/json',
          },
      method: 'POST',
      url:
        process.env.OPENAI_DEPLOYMENT ?? 'https://api.openai.com/v1/embeddings',
    });
    if (data.data.length === 0) {
      throw new Error('OpenAI embedding output had no embeddings');
    }
    if (!Check(azOpenAIEmbedResponseSchema, data)) {
      Sentry.captureMessage('Discrepancy: in OpenAI embedding model');
    }
    return data.data.map((embedding) => {
      return {
        chunkID: embedding.index,
        chunkText: chunks[embedding.index],
        embedding: embedding.embedding,
      };
    });
  } catch (error) {
    const message = 'The embedding function had an error';
    await errorReport({
      error,
      message,
    });
    throw error;
  }
}

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
