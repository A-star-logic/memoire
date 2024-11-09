import {
  AzureKeyCredential,
  type ChatRequestMessageUnion,
  OpenAIClient,
} from '@azure/openai';
// eslint-disable-next-line camelcase
import { get_encoding } from 'tiktoken';
import { createDocumentChunks } from './ai-chunking-fixed-size.js';

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
  // gpt-35-turbo-16k models can generate upto 4096 tokens, so the docment size should be less than that for full output
  return tokens.length > 1500;
}

/**
 * create chunks with LLM agent for a document
 * @param root named params
 * @param root.document documet to get chunks
 * @returns chunks of the document
 */
export async function createAgenticChunking({
  document,
}: {
  document: string;
}): Promise<string[]> {
  //fixed size spliting if the doc is grether than model desired size
  const chunks = await createDocumentChunks({
    chunkOverlap: 10,
    chunkSize: 1500,
    document,
  });

  if (
    chunks.some((chunk) => {
      return isTooLarge({ text: chunk });
    })
  ) {
    throw new Error('The agentic chunking input with openAI was too large');
  }

  const systemInstruction =
    'Decompose the "Content" into clear and simple propositions, ensuring they are interpretable out of\ncontext.\n1. Split compound sentence into simple sentences. Maintain the original phrasing from the input\nwhenever possible.\n2. For any named entity that is accompanied by additional descriptive information, separate this\ninformation into its own distinct proposition.\n3. Decontextualize the proposition by adding necessary modifier to nouns or entire sentences\nand replacing pronouns (e.g., "it", "he", "she", "they", "this", "that") with the full name of the\nentities they refer to.\n4. Present the results as a list of strings, formatted in JSON.\n\nExample:\n\nInput: Title: ¯Eostre. Section: Theories and interpretations, Connection to Easter Hares. Content:\nThe earliest evidence for the Easter Hare (Osterhase) was recorded in south-west Germany in\n1678 by the professor of medicine Georg Franck von Franckenau, but it remained unknown in\nother parts of Germany until the 18th century. Scholar Richard Sermon writes that "hares were\nfrequently seen in gardens in spring, and thus may have served as a convenient explanation for the\norigin of the colored eggs hidden there for children. Alternatively, there is a European tradition\nthat hares laid eggs, since a hare’s scratch or form and a lapwing’s nest look very similar, and\nboth occur on grassland and are first seen in the spring. In the nineteenth century the influence\nof Easter cards, toys, and books was to make the Easter Hare/Rabbit popular throughout Europe.\nGerman immigrants then exported the custom to Britain and America where it evolved into the\nEaster Bunny."\nOutput: [ "The earliest evidence for the Easter Hare was recorded in south-west Germany in\n1678 by Georg Franck von Franckenau.", "Georg Franck von Franckenau was a professor of\nmedicine.", "The evidence for the Easter Hare remained unknown in other parts of Germany until\nthe 18th century.", "Richard Sermon was a scholar.", "Richard Sermon writes a hypothesis about\nthe possible explanation for the connection between hares and the tradition during Easter", "Hares\nwere frequently seen in gardens in spring.", "Hares may have served as a convenient explanation\nfor the origin of the colored eggs hidden in gardens for children.", "There is a European tradition\nthat hares laid eggs.", "A hare’s scratch or form and a lapwing’s nest look very similar.", "Both\nhares and lapwing’s nests occur on grassland and are first seen in the spring.", "In the nineteenth\ncentury the influence of Easter cards, toys, and books was to make the Easter Hare/Rabbit popular\nthroughout Europe.", "German immigrants exported the custom of the Easter Hare/Rabbit to\nBritain and America.", "The custom of the Easter Hare/Rabbit evolved into the Easter Bunny in\nBritain and America.';

  // 1-shot prompting on seach chunk for agenting chunking, token size 618, info: https://smith.langchain.com/hub/wfh/proposal-indexing?organizationId=65e2223e-316a-5256-b012-5033801a97fa&tab=0
  const agenticChunksArrays = await Promise.all(
    chunks.map(async (chunk) => {
      const prompt: ChatRequestMessageUnion[] = [
        {
          content: systemInstruction,
          role: 'system',
        },
        { content: `Decompose the following:\\n ${chunk}`, role: 'user' },
      ];
      const result = await openAIClient.getChatCompletions(modelName, prompt);
      // our configuration will always have a single choice
      const response = result.choices[0].message?.content;
      if (response === null || response === undefined) {
        throw new Error('openAI agentic chunking returned null or undefined');
      }
      const agenticChunks = JSON.parse(response) as string[];
      return agenticChunks;
    }),
  );
  return agenticChunksArrays.flat();
}
