import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
const bedrockClient = new BedrockRuntimeClient({ region: 'eu-central-1' });

const maxCharacters = 2048;

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
  /** An array of embeddings, where each embedding is an array of floats with 1024 elements. The length of the embeddings array will be the same as the length of the original texts array */
  embeddings: number[][];
  /** response ID */
  id: string;
  /** The response type. This value is always embeddings_floats */
  response_type: 'embeddings_floats';
  /** An array containing the text entries for which embeddings were returned. */
  texts: string[];
}

/**
 * Embed chunks from a document
 * @param root named parameters
 * @param root.chunks the chunks to embed
 * @param root.traceID the trace ID
 * @returns the embedding of the chunks
 */
export async function embedDocumentChunks({
  chunks,
  traceID,
}: {
  chunks: string[];
  traceID: string;
}): Promise<{ chunkContent: string; chunkID: number; embedding: number[] }[]> {
  if (
    chunks.some((chunk) => {
      return isTooLarge({ text: chunk });
    })
  ) {
    throw new Error('A document chunk was too large to be embedded');
  }
  const command = new InvokeModelCommand({
    body: JSON.stringify({
      input_type: 'search_document',
      texts: chunks,
    } satisfies CohereEmbeddingBody),
    modelId: 'cohere.embed-multilingual-v3',
  });
  const response = await bedrockClient.send(command);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- assume it's safe
  const responseBody: CohereEmbeddingResponse = JSON.parse(
    Buffer.from(response.body).toString('utf8'),
  );

  const chunksWithEmbeddings = responseBody.embeddings.map(
    (embedding, index) => {
      return {
        chunkContent: responseBody.texts[index],
        chunkID: index,
        embedding,
      };
    },
  );
  return chunksWithEmbeddings;
}

/**
 * Embed a document
 * @param root named parameters
 * @param root.content the content to embed
 * @param root.traceID the trace ID
 * @returns the embedding of the document
 */
export async function embedQuery({
  content,
  traceID,
}: {
  content: string;
  traceID: string;
}): Promise<number[]> {
  if (isTooLarge({ text: content })) {
    throw new Error('A query was too large to be embedded');
  }
  const command = new InvokeModelCommand({
    body: JSON.stringify({
      input_type: 'search_query',
      texts: [content],
    } satisfies CohereEmbeddingBody),
    modelId: 'cohere.embed-multilingual-v3',
  });
  const response = await bedrockClient.send(command);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- assume it's safe
  const responseBody: CohereEmbeddingResponse = JSON.parse(
    Buffer.from(response.body).toString('utf8'),
  );
  return responseBody.embeddings[0];
}

/**
 * Check if a text is too large to be embedded
 * @param root named parameters
 * @param root.text the text to check
 * @returns true if the text is too large, false otherwise
 */
function isTooLarge({ text }: { text: string }): boolean {
  return text.length > maxCharacters;
}
