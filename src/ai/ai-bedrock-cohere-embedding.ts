/* eslint-disable no-console */
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { Tiktoken } from 'tiktoken/lite';
import { TokenTextSplitter } from '@langchain/textsplitters';
import cl100k from 'tiktoken/encoders/cl100k_base.json';
import type {
  CohereEmbeddingBody,
  CohereEmbeddingResponse,
} from './bedrock-embedding-service-schemas.js';

if (!process.env.AWS_REGION) {
  throw new Error('Please set AWS_REGION');
}
if (!process.env.AWS_ACCESS_KEY_ID) {
  throw new Error('Please set AWS_ACCESS_KEY_ID');
}
if (!process.env.AWS_SECRET_ACCESS_KEY) {
  throw new Error('Please set AWS_SECRET_ACCESS_KEY');
}

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

/**
 * Verify that the string sent has less tokens than the maximum possible for the model
 * @param root named parameters
 * @param root.chunk the chunk to verify
 * @returns true or false
 */
function exceedsTokenLimit({ chunk }: { chunk: string }): boolean {
  const encoding = new Tiktoken(
    cl100k.bpe_ranks,
    cl100k.special_tokens,
    cl100k.pat_str,
  );
  const tokens = encoding.encode(chunk);
  encoding.free();
  // cohere input token limit = 512
  return tokens.length > 512;
}

/**
 * Call the bedrock embedding model
 * @param root named parameters
 * @param root.chunks A document, or a list of chunks from a document to embed
 * @param root.isQuery is the documnt for query
 * @returns an object with the averaged embedding an an array of chunk embeddings
 */
export async function invokeBedrockCohereEmbedding({
  chunks,
  isQuery,
}: {
  chunks: string[];
  isQuery: boolean;
}): Promise<CohereEmbeddingResponse[] | undefined> {
  const processedChunks = await Promise.all(
    chunks.map(async (chunk) => {
      return chunk.replace('\n', '');
    }),
  );
  try {
    if (
      chunks.some((chunk) => {
        return exceedsTokenLimit({ chunk });
      })
    ) {
      throw new Error('A document exceeds token limit');
    }
    const embeddingResponses = Promise.all(
      processedChunks.map(async (chunk) => {
        const command = new InvokeModelCommand({
          modelId: 'cohere.embed-english-v3',
          body: JSON.stringify({
            texts: [chunk],
            input_type: isQuery ? 'search_query' : 'search_document',
          } satisfies CohereEmbeddingBody),
        });
        const response = await bedrockClient.send(command);
        const responseBody: CohereEmbeddingResponse = JSON.parse(
          Buffer.from(response.body).toString('utf8'),
        );
        return responseBody;
      }),
    );
    return embeddingResponses;
  } catch (error) {
    const message = 'The embedding function had an error';
    console.error({
      error,
      message,
    });
    return undefined;
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
    chunkSize: 512,
    chunkOverlap: 0,
    encodingName: 'cl100k_base',
  });

  const chunks = await textSplitter.splitText(document);
  return chunks.filter((chunk) => {
    return chunk !== '\n';
  });
}

/**
 * Embed a document or a list of chunks by cohere embedding model, if the document has been pre-splitted
 * @param root named parameters
 * @param root.document A document, or a list of chunks from a document to embed
 * @param root.isQuery is the documnt for query
 * @returns an object with the averaged embedding an an array of chunk embeddings
 */
export async function embedDocumentWithCohere({
  document,
  isQuery,
}: {
  document: string[];
  isQuery: boolean;
}): Promise<{ chunkID: string; embedding: number[] }[] | undefined> {
  const chunks =
    document.length > 1
      ? document
      : await createDocumentChunks({ document: document[0] });
  const modelResponse = await invokeBedrockCohereEmbedding({ chunks, isQuery });
  if (!modelResponse) {
    return undefined;
  }

  return Promise.all(
    modelResponse.map(async (embedding) => {
      return { chunkID: embedding.id, embedding: embedding.embeddings[0] };
    }),
  );
}
