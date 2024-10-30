// libs
import { TokenTextSplitter } from '@langchain/textsplitters';
// eslint-disable-next-line camelcase
import { get_encoding } from 'tiktoken';

// db
import {
  apiMismatchReport,
  errorReport,
} from '@astarlogic/services-pkg-database/reporting';

// shared
import { Check } from '@astarlogic/shared-pkg/typechecking';

// utils
import { axiosInstance } from '@astarlogic/services-pkg-axios';
import { loadEnvironment } from '@astarlogic/services-pkg-utils/environment';

// ai
import type {
  AzOpenAIEmbedBody,
  AzOpenAIEmbedResponse,
} from './ai-embedding-schemas.js';
import { azOpenAIEmbedResponseSchema } from './ai-embedding-schemas.js';

// load .env
loadEnvironment();

/* v8 ignore start */
if (!process.env.OPENAI_KEY) {
  throw new Error('Please set OPENAI_KEY');
}
if (!process.env.OPENAI_DEPLOYMENT) {
  throw new Error('Please set OPENAI_DEPLOYMENT');
}
/* v8 ignore stop */

/**
 * Verify that the string sent has less tokens than the maximum possible for the model
 * @param root named parameters
 * @param root.chunk the chunk to verify
 * @returns true or false
 */
export function isTooLarge({ chunk }: { chunk: string }): boolean {
  const encoding = get_encoding('cl100k_base');
  const tokens = encoding.encode(chunk);
  encoding.free();
  return tokens.length >= 3072;
}

/**
 * Call the embedding model
 * https://learn.microsoft.com/en-us/azure/ai-services/openai/reference#responses-1
 * @param root named parameters
 * @param root.chunks A document, or a list of chunks from a document to embed
 * @returns an object with the averaged embedding an an array of chunk embeddings
 */
export async function embedDocument({
  chunks,
}: {
  chunks: string[];
}): Promise<{ chunkID: number; embedding: number[] }[]> {
  const processedChunks = await Promise.all(
    chunks.map(async (chunk) => {
      return chunk.replace('\n', '');
    }),
  );
  try {
    if (
      chunks.some((chunk) => {
        return isTooLarge({ chunk });
      })
    ) {
      throw new Error('A document was too large');
    }
    const { data } = await axiosInstance<AzOpenAIEmbedResponse>({
      data: {
        dimensions: 256,
        input: processedChunks,
        model: 'text-embedding-3-large',
        user: customerID,
      } satisfies AzOpenAIEmbedBody,
      headers: {
        'api-key': process.env.OPENAI_KEY,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      url: process.env.OPENAI_DEPLOYMENT,
    });
    if (data.data.length === 0) {
      throw new Error('OpenAI embedding output had no embeddings');
    }
    if (!Check(azOpenAIEmbedResponseSchema, data)) {
      await apiMismatchReport({
        authenticationID: undefined,
        customerID,
        data,
        expectedSchema: azOpenAIEmbedResponseSchema,
        message: 'Discrepancy: in OpenAI embedding model',
      });
    }
    return await Promise.all(
      data.data.map(async (embedding) => {
        return { chunkID: embedding.index, embedding: embedding.embedding };
      }),
    );
  } catch (error) {
    const message = 'The embedding function had an error';
    await errorReport({
      authenticationID: undefined,
      customerID,
      error,
      message,
    });
    throw new Error(message);
  }
}

/**
 * Split a document into chunks. This is a simple way of creating chunks and not context-aware
 * @param root named parameters
 * @param root.document the document to split into chunks
 * @returns a list of chunks
 */
export async function createDocumentChunks({
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
