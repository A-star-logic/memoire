// libs
import { describe, expect, test } from 'vitest';

// test function
import { createAgenticChunking } from '../../ai-chunking-agentic.js';

//local embedding function to verify the response
import { embedDocument } from '../../../embedding/model/ai-embedding-model-local.js';

//utils
import { calculateSimilarity } from '../../../../utils/utils-similarity.js';

//test variables
const testDocment =
  'I love Icecream especially eating with my brother, I also like chocolates eating alone';
const testResponse = [
  'I love Icecream.',
  'I love eating Icecream with my brother.',
  'I like chocolates.',
  'I like eating chocolates alone.',
];

describe('createAgenticChunks', async () => {
  test('chunking same document always have have similar chunks', async () => {
    const response = await createAgenticChunking({ document: testDocment });
    expect(response).toBeDefined();
    expect(response.length).toBe(testResponse.length);
    const responseEmbedings = await embedDocument({ chunks: response });
    const testEmbeddings = await embedDocument({ chunks: testResponse });
    const similarities = await Promise.all(
      responseEmbedings.map(async (response, itr) => {
        return await calculateSimilarity({
          vectorA: response.embedding,
          vectorB: testEmbeddings[itr].embedding,
        });
      }),
    );
    const averageSimilarity =
      similarities.reduce((accumulator, similarity) => {
        return accumulator + similarity;
      }, 0) / similarities.length;
    expect(averageSimilarity).toBeGreaterThan(0.6);
  }, 100_000);
});
