/* eslint-disable perfectionist/sort-modules */
import { type Static, Type } from '@sinclair/typebox';
import { Check } from '@sinclair/typebox/value';
import axios from 'axios';
// libs
import type { EmbeddingModelOutput } from './model/ai-embedding-model-contracts.js';
import {
  logger,
  Sentry,
} from '../../database/reporting/database-interface-reporting.ee.js';
import { createLengthBasedChunks } from './chunking/ai-chunking-fixed-size.js';
import { embedDocument, embedQuery } from './model/index.js';

if (process.env.OPENAI_LLM_KEY === undefined) {
  throw new Error('please set the env variable OPENAI_LLM_KEY');
}

if (!process.env.OPENAI_LLM_DEPLOYMENT) {
  logger.info('Using OpenAI to generate hypothetical answer');
}
if (process.env.OPENAI_LLM_DEPLOYMENT) {
  logger.info('Using Azure LLM to generate hypothetical answer');
}

interface ChatCompletionMessage {
  content: string;
  role: string;
}
interface OpenAILLMBody {
  max_tokens?: number; //max number of tokens to generate
  messages: ChatCompletionMessage[];
  model?: string; //mandatory for openAI API
  user?: string;
}
/**
 * https://learn.microsoft.com/en-us/azure/ai-services/openai/reference#createcompletionresponse
 */
const azOpenAILLMResponseSchema = Type.Object(
  {
    choices: Type.Array(
      Type.Object({
        index: Type.Number(),
        message: Type.Object(
          {
            content: Type.String(),
            role: Type.String(),
          },
          { additionalProperties: true },
        ),
      }),
    ),
    created: Type.Number(),
    id: Type.String(),
    model: Type.String(),
    usage: Type.Object(
      {
        // eslint-disable-next-line camelcase
        completion_tokens: Type.Number(),
        // eslint-disable-next-line camelcase
        prompt_tokens: Type.Number(),
        // eslint-disable-next-line camelcase
        total_tokens: Type.Number(),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: true },
);

type AzOpenAIChatResponse = Static<typeof azOpenAILLMResponseSchema>;

/**
 *will generate response with gpt models
 @param root named parameters
 @param root.query the query to generate response
 @returns a hypothetical answer for given query
 */
async function generateHypotheticalAnswer({
  query,
}: {
  query: string;
}): Promise<string> {
  const { data } = await axios<AzOpenAIChatResponse>({
    data: {
      messages: [
        {
          content: 'Please write a passage to answer the question',
          role: 'system',
        },
        {
          content: `Question: ${query}
          Passage:`,
          role: 'user',
        },
      ],
      model: process.env.OPENAI_LLM_DEPLOYMENT ? undefined : 'gpt-4o',
    } satisfies OpenAILLMBody,
    headers: process.env.OPENAI_LLM_DEPLOYMENT
      ? {
          'api-key': process.env.OPENAI_LLM_KEY,
          'Content-Type': 'application/json',
        }
      : {
          Authorization: `Bearer ${process.env.OPENAI_LLM_KEY}`,
          'Content-Type': 'application/json',
        },
    method: 'POST',
    url:
      process.env.OPENAI_LLM_DEPLOYMENT ??
      'https://api.openai.com/v1/chat/completions',
  });
  if (data.choices.length === 0) {
    throw new Error(
      'OpenAI LLM model had an error generating hypothetical answer',
    );
  }
  if (!Check(azOpenAILLMResponseSchema, data)) {
    Sentry.captureMessage('Discrepancy: in OpenAI embedding model');
  }
  return data.choices[0].message.content;
}

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
 * @param root.useHyde generated hypothetical answer for embedding (HyDE) if true to accuracy else uses query embedding
 * @returns the embedding of the query
 */
export async function autoEmbedQuery({
  query = 'speed',
  useHyde = false,
}: {
  query: string;
  useHyde?: boolean;
}): Promise<number[]> {
  if (useHyde) {
    const hypotheticalAnswer = await generateHypotheticalAnswer({ query });
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
