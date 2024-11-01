import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { TokenTextSplitter } from '@langchain/textsplitters';
import cl100k from 'tiktoken/encoders/cl100k_base.json';
import { Tiktoken } from 'tiktoken/lite';
/**
 * https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-embed.html
 */
interface CohereEmbeddingBody {
  // Specifies the types of embeddings you want to have returned, can be multiple format
  embedding_types?: string[];
  // Differentiate each type from one another. You should not mix different types together
  input_type:
    | 'classification' // for text classifiation tasks
    | 'clustering' // for text clustering tasks
    | 'search_document' // To embed serach doc in database
    | 'search_query'; // To embed query
  // Array of strings to embed
  texts: string[];
  // specifies the truncate possion if input exceeds token limit, suggested to leave NONE(default) since we handle the tokens
  truncate?: 'END' | 'NONE' | 'START';
}
/**
 * https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-embed.html
 */
interface CohereEmbeddingResponse {
  // response ID
  id: string;
  // input texts for the model
  texts: string[];
  // array of embeddings, each embedding with 1024 length
  embeddings: number[][];
  // type of the response(embeddings_floats or embeddings_by_type)
  response_type: string;
}

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
 * Asynchronously wait for a number of milliseconds.
 *
 * When using this function to rate limit API calls, **YOU MUST ENSURE** that only one call is being made when using this method, or it will be useless
 * @param ms The number of milliseconds to wait
 * @returns void
 */
function sleep(ms: number): Promise<unknown> {
  return new Promise((resolve) => {
    return setTimeout(resolve, ms);
  });
}

/**
 * Call the bedrock embedding model
 * @param root named parameters
 * @param root.chunk A document whitin the model input token limit
 * @param root.embeddingTask task the embedding needed for
 * @returns an object with the averaged embedding an an array of chunk embeddings
 */
export async function invokeBedrockCohereEmbedding({
  chunk,
  embeddingTask,
}: {
  chunk: string;
  embeddingTask: CohereEmbeddingBody['input_type'];
}): Promise<CohereEmbeddingResponse | undefined> {
  await sleep(30); // cohere api call limit is 2000 per min
  try {
    if (exceedsTokenLimit({ chunk })) {
      throw new Error('A document exceeds token limit');
    }

    const command = new InvokeModelCommand({
      modelId: 'cohere.embed-english-v3',
      body: JSON.stringify({
        texts: [chunk],
        input_type: embeddingTask,
      } satisfies CohereEmbeddingBody),
    });
    const response = await bedrockClient.send(command);
    const responseBody: CohereEmbeddingResponse = JSON.parse(
      Buffer.from(response.body).toString('utf8'),
    );
    return responseBody;
  } catch (error) {
    const message = 'The embedding function had an error';
    // eslint-disable-next-line no-console
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
  return chunks;
}

/**
 * Embed a document or a list of chunks by cohere embedding model, if the document has been pre-splitted
 * @param root named parameters
 * @param root.document A document as a string
 * @param root.embeddingTask task the embedding needed for
 * @returns an object with the averaged embedding an an array of chunk embeddings
 */
export async function embedDocumentWithCohere({
  document,
  embeddingTask,
}: {
  document: string;
  embeddingTask: CohereEmbeddingBody['input_type'];
}): Promise<{ chunkID: string; embedding: number[] }[] | undefined> {
  const chunks = await createDocumentChunks({ document });

  const modelResponses: CohereEmbeddingResponse[] = [];

  for (const chunk of chunks) {
    const modelResponse = await invokeBedrockCohereEmbedding({
      chunk,
      embeddingTask,
    });
    if (modelResponse === undefined) {
      return undefined;
    }

    modelResponses.push(modelResponse);
  }

  return Promise.all(
    modelResponses.map(async (embedding) => {
      return { chunkID: embedding.id, embedding: embedding.embeddings[0] };
    }),
  );
}
