import {
  AzureKeyCredential,
  type ChatRequestMessageUnion,
  OpenAIClient,
} from '@azure/openai';

// eslint-disable-next-line camelcase
import { get_encoding } from 'tiktoken';

if (process.env.OPENAI_URL === undefined) {
  throw new Error('please set the env variable OPENAI_URL');
}
if (process.env.OPENAI_KEY === undefined) {
  throw new Error('please set the env variable OPENAI_KEY');
}

const modelName = 'gpt-35-turbo-16k'; // gpt-35-turbo version 1106.

const openAIClient = new OpenAIClient(
  process.env.OPENAI_URL,
  new AzureKeyCredential(process.env.OPENAI_KEY),
);

/**
 * Verify that the string sent has less tokens than the maximum possible for the model
 * @param root named parameters
 * @param root.text the text to verify
 * @returns true or false
 */
export function isTooLarge({ text }: { text: string }): boolean {
  const encoding = get_encoding('cl100k_base');
  const tokens = encoding.encode(text);
  encoding.free();
  // gpt-35-turbo-16k models limit is 16,384 tokens including generated output tokens 4,096
  return tokens.length > 16_384 - 4096;
}

/**
 * Call the open AI model for text generation response
 *
 * **Note**: This function does not have any try/catch, to simplify error handling
 * @param root named parameters
 * @param root.prompt prompt message for the model
 * @returns the output of the model, or undefined
 */
export async function callAzureOpenAIModel({
  prompt,
}: {
  prompt: ChatRequestMessageUnion[];
}): Promise<string> {
  const result = await openAIClient.getChatCompletions(modelName, prompt);
  // our configuration will always have a single choice
  const reponse = result.choices[0].message?.content;
  if (reponse === null || reponse === undefined) {
    throw new Error('OpenAI returned null or undefined for summaries');
  }
  return reponse;
}

/**
 * Genrates response with azure gpt 3.5 16k model
 *
 * **Note**: This function does not have any try/catch, to simplify error handling
 * @param root named parameters
 * @param root.systemMessage system instruction
 * @param root.userMessage user query or text
 * @param root.assistantMessage AI agent response, can be utilised for COT or few shots
 * @returns the output of the model, or undefined
 */
export async function textGenerationWithOpenAI({
  assistantMessage,
  systemMessage,
  userMessage,
}: {
  assistantMessage?: string;
  systemMessage?: string;
  userMessage: string;
}): Promise<string> {
  if (
    isTooLarge({
      text: `${assistantMessage ?? ''}${systemMessage ?? ''}${userMessage}`,
    })
  ) {
    throw new Error('A document was too large');
  }
  const messages: ChatRequestMessageUnion[] = [];

  if (systemMessage) {
    messages.push({ content: systemMessage, role: 'system' });
  } else {
    messages.push({
      content: 'You are an AI assistant that helps people find information.',
      role: 'system',
    });
  }

  if (assistantMessage) {
    messages.push({ content: assistantMessage, role: 'assistant' });
  }

  messages.push({ content: userMessage, role: 'user' });

  const response = await callAzureOpenAIModel({ prompt: messages });
  return response;
}
