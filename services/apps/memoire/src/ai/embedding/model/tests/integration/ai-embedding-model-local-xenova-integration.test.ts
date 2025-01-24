// libs
import { calculateSimilarity } from '@astarlogic/services-utils/utils-similarity.js';
import { describe, expect, test } from 'vitest';

// test function
import {
  embedDocument,
  isTooLarge,
} from '../../ai-embedding-model-local-xenova.js';

//test variables
import {
  largeText,
  testChunks,
  testDocument,
  testEmbeddingText,
  xenovaLocalTestEmbedding,
} from './test-variables.js';

describe.skipIf(!process.env.TEST_APIS)(
  'invoked local xenova embedding model',
  async () => {
    test('calling model with a doc will embed a document ', async () => {
      const response = await embedDocument({ chunks: testDocument });
      expect(response).toBeDefined();
      expect(response.length).toBe(testDocument.length);
      expect(response[0].embedding.length).toBe(384);
    });

    test('multiple document will give multiple embeddings', async () => {
      const response = await embedDocument({ chunks: testChunks });
      expect(response).toBeDefined();
      expect(response.length).toBe(testChunks.length);
      expect(response[0].embedding.length).toBe(384);
    });

    test('embedding of the same statements are equal', async () => {
      const response = await embedDocument({ chunks: [testEmbeddingText] });
      expect(response).toBeDefined();
      expect(response.length).toBe(1);
      expect(response[0].embedding.length).toBe(384);
      const similarity = await calculateSimilarity({
        vectorA: response[0].embedding,
        vectorB: xenovaLocalTestEmbedding,
      });
      expect(similarity).toBeGreaterThanOrEqual(0.99);
    });
  },
);

describe.skipIf(!process.env.TEST_APIS)('isTooLarge', async () => {
  test('returned false for small text', async () => {
    const result = isTooLarge({ text: 'mini text' });
    expect(result).toBeDefined();
    expect(result).toBe(false);
  });

  test('returned true for large text', async () => {
    const result = isTooLarge({ text: largeText.repeat(4) });
    expect(result).toBeDefined();
    expect(result).toBe(true);
  });
});
