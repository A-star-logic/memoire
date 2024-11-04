import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import cl100k from 'tiktoken/encoders/cl100k_base.json';
import { Tiktoken } from 'tiktoken/lite';
import { sleep } from '../../../utils/utils-sleep.js';
import { bedrockClient } from '../ai-embedding-bedrock-client.js';
// embedding models contracts
import type {
  EmbeddingModelInput,
  EmbeddingModelOutput,
  IsTooLargeInput,
} from './ai-embedding-model-contracts.js';
import { errorReport } from '../../../database/reporting/database-interface-reporting.ee.js';
/**
 * https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-titan-embed-text.html
 */
interface TitanV2Body {
  // Desired embedding output dimensions(default 1024)
  dimensions?: 256 | 512 | 1024;
  // Embedding type default 'float'.
  embeddingTypes?: ['binary', 'float'] | ['binary'] | ['float'];
  // input to br embedded
  inputText: string;
  //normalize the embeddings(default true)
  normalize?: boolean;
}

/**
 * https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-titan-embed-text.html
 */
interface TitanV2Response {
  // array of embeddings, each embedding with 1024 length
  embedding: number[];
  // appears always, regardless of type specified
  embeddingsByType:
    | { binary: number[]; float: number[] }
    | { binary: number[] }
    | { float: number[] };
  // token count of input
  inputTextTokenCount: number;
}

/**
 * Verify that the string sent has less tokens than the maximum possible for the model
 * @param root named parameters
 * @param root.text the text to verify
 * @returns true or false
 */
export function isTooLarge({ text }: IsTooLargeInput): boolean {
  const encoding = new Tiktoken(
    cl100k.bpe_ranks,
    cl100k.special_tokens,
    cl100k.pat_str,
  );
  const tokens = encoding.encode(text);
  encoding.free();
  // titan input token limit 8192
  return tokens.length > 8192;
}

/**
 * Calls the Titan V2 embedding model
 * @param root named params
 * @param root.text doc to embed
 * @returns promises of Titan response
 */
async function invokeTitanEmbedding({
  text,
}: {
  text: string;
}): Promise<TitanV2Response> {
  await sleep(30); // Titan rate limit 2000 calls/min https://docs.aws.amazon.com/general/latest/gr/bedrock.html
  const command = new InvokeModelCommand({
    body: JSON.stringify({
      inputText: text,
    } satisfies TitanV2Body),
    modelId: 'amazon.titan-embed-text-v2:0',
  });
  const response = await bedrockClient.send(command);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const responseBody: TitanV2Response = JSON.parse(
    Buffer.from(response.body).toString('utf8'),
  );
  return responseBody;
}

/**
 * embed user query with Titan G1 embedding
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
    const modelResponses = await Promise.all(
      chunks.map(async (chunk, iteration) => {
        const responseBody = await invokeTitanEmbedding({
          text: chunk,
        });
        return {
          chunkID: iteration,
          chunkText: chunk,
          embedding: responseBody.embedding,
        };
      }),
    );
    return modelResponses;
  } catch (error) {
    const message = 'The embedding function had an error';
    await errorReport({ error, message });
    throw error;
  }
}