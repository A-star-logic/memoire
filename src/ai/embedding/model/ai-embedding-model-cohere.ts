/* eslint-disable camelcase */
import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import {
  CharacterTextSplitter,
  TokenTextSplitter,
} from '@langchain/textsplitters';

import { get_encoding } from 'tiktoken';

// utils
import { sleep } from '../../../utils/utils-sleep.js';

// database
import { errorReport } from '../../../database/reporting/database-interface-reporting.ee.js';

// embeddings
import type {
  EmbeddingModelInput,
  EmbeddingModelOutput,
  IsTooLargeInput,
} from './ai-embedding-model-contracts.js';
import { bedrockClient } from '../ai-embedding-bedrock-client.js';

/**
 * https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-embed.html
 */
interface CohereEmbeddingBody {
  // Specifies the types of embeddings you want to have returned, can be multiple format
  embedding_types?: string[];
  // Differentiate each type from one another. You should not mix different types together
  input_type:
    | 'classification' // for text classification tasks
    | 'clustering' // for text clustering tasks
    | 'search_document' // To embed search doc in database
    | 'search_query'; // To embed query
  // Array of strings to embed
  texts: string[];
  // specifies the truncate position if input exceeds token limit, suggested to leave NONE(default) since we handle the tokens
  truncate?: 'END' | 'NONE' | 'START';
}

/**
 * https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-embed.html
 */
interface CohereEmbeddingResponse {
  // array of embeddings, each embedding with 1024 length
  embeddings: number[][];
  // response ID
  id: string;
  // type of the response(embeddings_floats or embeddings_by_type)
  response_type: string;
  // input texts for the model
  texts: string[];
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
  // cohere input token limit = 512 and charecter limit is 2048
  return tokens.length > 512 && text.length > 2048;
}
/**
 * Split a document into chunks for cohere model based on it's limitation. This is a simple way of creating chunks and not context-aware
 * @param root named parameters
 * @param root.document the document to split into chunks
 * @returns a list of chunks
 */
export async function createDocumentChunks({
  document,
}: {
  document: string;
}): Promise<string[]> {
  const tokenSplitter = new TokenTextSplitter({
    chunkOverlap: 0,
    chunkSize: 512,
    encodingName: 'cl100k_base',
  });
  const characterSplitter = new CharacterTextSplitter({
    chunkOverlap: 3,
    chunkSize: 2048,
    separator: ' ',
  });

  const cleanedDocument = document.replaceAll('\n', ' ');
  // trim and remove duplicate whitespace
  const trimmedDocument = cleanedDocument.replaceAll(/\s+/g, ' ').trim();

  //initall splitting based on token limit of cohere
  const tokenChunks = await tokenSplitter.splitText(trimmedDocument);

  //further splitting based on charecter limit of cohere
  let resultChunks: string[] = [];
  for (const chunk of tokenChunks) {
    const characterChunks = await characterSplitter.splitText(chunk);
    resultChunks = [...resultChunks, ...characterChunks];
  }

  return resultChunks;
}

/**
 * Calls the cohere embedding model
 * @param root named params
 * @param root.documents documents to be embedded
 * @param root.embeddingTask task the embedding needed for
 * @returns promises of cohere responses
 */
async function invokeCohereEmbedding({
  documents,
  embeddingTask,
}: {
  documents: string[];
  embeddingTask: CohereEmbeddingBody['input_type'];
}): Promise<CohereEmbeddingResponse> {
  await sleep(30); // cohere api call limit is 2000 per min https://docs.aws.amazon.com/general/latest/gr/bedrock.html
  const command = new InvokeModelCommand({
    body: JSON.stringify({
      input_type: embeddingTask,
      texts: documents,
    } satisfies CohereEmbeddingBody),
    modelId: 'cohere.embed-english-v3',
  });
  const response = await bedrockClient.send(command);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const responseBody: CohereEmbeddingResponse = JSON.parse(
    Buffer.from(response.body).toString('utf8'),
  );
  return responseBody;
}
/**
 * embed document with cohere english embedding
 * @param root named params
 * @param root.chunks array of documents within model token input limit
 * @returns array of chunk id chunk text and its embedding
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
    const modelResponse = await invokeCohereEmbedding({
      documents: chunks,
      embeddingTask: 'search_document',
    });
    return modelResponse.embeddings.map((embedding, iteration) => {
      return {
        chunkID: iteration,
        chunkText: modelResponse.texts[iteration],
        embedding: embedding,
      };
    });
  } catch (error) {
    const message = 'The embedding function had an error';
    await errorReport({ error, message });
    throw error;
  }
}

/**
 * embed user query with cohere english embedding
 * @param root named params
 * @param root.chunks array of documents within model token input limit
 * @returns array of chunk id chunk text and its embedding or undefined
 */
export async function embedQuery({
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
    const modelResponse = await invokeCohereEmbedding({
      documents: chunks,
      embeddingTask: 'search_query',
    });
    return modelResponse.embeddings.map((embedding, iteration) => {
      return {
        chunkID: iteration,
        chunkText: modelResponse.texts[iteration],
        embedding: embedding,
      };
    });
  } catch (error) {
    const message = 'The embedding function had an error';
    await errorReport({ error, message });
    throw error;
  }
}
