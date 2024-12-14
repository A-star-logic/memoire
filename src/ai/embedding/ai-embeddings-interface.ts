// libs
import type { EmbeddingModelOutput } from './model/ai-embedding-model-contracts.js';
import { createLengthBasedChunks } from './chunking/ai-chunking-fixed-size.js';
import { embedDocument, embedQuery } from './model/index.js';
import {
  AzureKeyCredential,
  type ChatRequestMessageUnion,
  OpenAIClient,
} from '@azure/openai';

if (process.env.AZURE_OPENAI_URL === undefined) {
  throw new Error('please set the env variable OPENAI_URL');
}
if (process.env.AZURE_OPENAI_KEY === undefined) {
  throw new Error('please set the env variable OPENAI_KEY');
}

const openAIClient = new OpenAIClient(
  process.env.AZURE_OPENAI_URL,
  new AzureKeyCredential(process.env.AZURE_OPENAI_KEY),
);

export { isTooLarge } from './model/index.js';

/**
 * Automatically embed a document
 * @param root named parameters
 * @param root.document the the document to embed
 * @returns A list of chunks embedded
 */
export async function autoEmbed({
  document,
}: {
  document: string;
}): Promise<EmbeddingModelOutput> {
  const chunks = createLengthBasedChunks({ document });
  const embeddings = await embedDocument({ chunks });
  return embeddings;
}

/**
 * Embed a search query
 * @param root named parameters
 * @param root.query the query to embed
 * @param root.useHyde creates an hypothetical answer and embed it instead of embedding query
 * @returns the embedding of the query
 */
export async function autoEmbedQuery({
  query,
  useHyde = true,
}: {
  query: string;
  useHyde: boolean;
}): Promise<number[]> {
  if (useHyde) {
    const generateAnswerPrompt: ChatRequestMessageUnion[] = [
      {
        content:
          'You are an answering bot who will just generate answer to the given question',
        role: 'system',
      },
      {
        content: `Please write a passage to answer the question \nQuestion: ${query}`,
        role: 'user',
      },
    ];

    const response = await openAIClient.getChatCompletions(
      'gpt-4o',
      generateAnswerPrompt,
    );
    const hypotheticalAnswer = response.choices[0].message?.content;
    if (hypotheticalAnswer === null || hypotheticalAnswer === undefined) {
      throw new Error(
        'Azure openAI model could not generate hypothetical answer for query',
      );
    }
    const answerChunk = createLengthBasedChunks({
      document: hypotheticalAnswer,
    })[0];

    const HypotheticalDocumentEmbedding = await embedDocument({
      chunks: [answerChunk],
    }); // Good to embed in the same way we embed doc, to get most out of vector similarity
    return HypotheticalDocumentEmbedding[0].embedding;
  }
  const embeddings = await embedQuery({ chunks: [query] });
  return embeddings[0].embedding;
}
