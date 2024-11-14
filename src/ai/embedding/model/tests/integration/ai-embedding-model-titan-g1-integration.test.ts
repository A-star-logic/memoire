// libs
import { describe, expect, test } from 'vitest';

//utils
import { calculateSimilarity } from '../../../../../utils/utils-similarity.js';
import {
  largeText,
  testChunks,
  testDocument,
  testEmbeddingText,
  titanG1TestEmbedding,
} from './test-variables.js';

// test function
import {
  embedDocument,
  isTooLarge,
} from '../../ai-embedding-model-titan-g1.js';

describe('invoked Titan G1 embedding model', async () => {
  test('calling model with a doc will embed a document ', async () => {
    const response = await embedDocument({ chunks: testDocument });
    expect(response).toBeDefined();
    expect(response.length).toBe(testDocument.length);
    expect(response[0].embedding.length).toBe(1536);
  });

  test('multiple document will give multiple embeddings', async () => {
    const response = await embedDocument({ chunks: testChunks });
    expect(response).toBeDefined();
    expect(response.length).toBe(testChunks.length);
    expect(response[0].embedding.length).toBe(1536);
  });

  test('embedding of the same statements are equal', async () => {
    const response = await embedDocument({ chunks: [testEmbeddingText] });
    expect(response).toBeDefined();
    expect(response.length).toBe(1);
    expect(response[0].embedding.length).toBe(1536);
    const result = await calculateSimilarity({
      vectorA: response[0].embedding,
      vectorB: titanG1TestEmbedding,
    });

    expect(result).toBeGreaterThan(0.99);
  });
});

describe('isTooLarge', async () => {
  test('returned false for small text', async () => {
    const result = isTooLarge({ text: 'mini text' });
    expect(result).toBeDefined();
    expect(result).toBe(false);
  });

  test('returned true for large text', async () => {
    const result = isTooLarge({ text: largeText.repeat(10) });
    expect(result).toBeDefined();
    expect(result).toBe(true);
  });
});
