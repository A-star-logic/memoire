// libs
import { describe, expect, test } from 'vitest';

// utils
import { calculateSimilarity } from '../../../../../utils/utils-similarity.js';

import {
  cohereTestChunks,
  cohereTestDocumentEmbedding,
  cohereTestQueryEmbedding,
  largeText,
  testChunks,
  testDocument,
  testEmbeddingText,
} from './test-variables.js';

// test function
import {
  createDocumentChunks,
  embedDocument,
  embedQuery,
  isTooLarge,
} from '../../ai-embedding-model-cohere.js';

describe('invoked cohere embedding model', async () => {
  test('calling model with a search doc will embed a document ', async () => {
    const response = await embedDocument({ chunks: testDocument });
    expect(response).toBeDefined();
    expect(response.length).toBe(testDocument.length);
    expect(response[0].embedding.length).toBe(1024);
  });

  test('calling model with a search query will embed a query ', async () => {
    const response = await embedQuery({ chunks: testDocument });
    expect(response).toBeDefined();
    expect(response.length).toBe(testDocument.length);
    expect(response[0].embedding.length).toBe(1024);
  });

  test('multiple search document will give multiple embeddings', async () => {
    const response = await embedDocument({ chunks: testChunks });
    expect(response).toBeDefined();
    expect(response.length).toBe(testChunks.length);
    expect(response[0].embedding.length).toBe(1024);
  });

  test('multiple search query chunks will give multiple embeddings', async () => {
    const response = await embedQuery({ chunks: testChunks });
    expect(response).toBeDefined();
    expect(response.length).toBe(testChunks.length);
    expect(response[0].embedding.length).toBe(1024);
  });

  test('embedding of same search Document are equal', async () => {
    const response = await embedDocument({ chunks: [testEmbeddingText] });
    expect(response).toBeDefined();
    expect(response.length).toBe(1);
    expect(response[0].embedding.length).toBe(1024);
    const result = await calculateSimilarity({
      vectorA: response[0].embedding,
      vectorB: cohereTestDocumentEmbedding,
    });

    expect(result).toBeGreaterThan(0.99);
  });

  test('embedding of same search query sentences are equal', async () => {
    const response = await embedQuery({ chunks: [testEmbeddingText] });
    expect(response).toBeDefined();
    expect(response.length).toBe(1);
    expect(response[0].embedding.length).toBe(1024);
    const result = await calculateSimilarity({
      vectorA: response[0].embedding,
      vectorB: cohereTestQueryEmbedding,
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
    const result = isTooLarge({ text: largeText });
    expect(result).toBeDefined();
    expect(result).toBe(true);
  });
});

describe('createDocumentChunks', async () => {
  test('chunking the same document returns same chunks', async () => {
    const chunks = await createDocumentChunks({ document: largeText });
    expect(chunks.length).toBe(cohereTestChunks.length);
    expect(chunks).toStrictEqual(cohereTestChunks);
  });
  test('Chunking a small text should still return chunks', async () => {
    const miniText = 'return this as a list of one ele';
    const chunks = await createDocumentChunks({
      document: miniText,
    });
    expect(chunks.length).toBe(1);
    expect(chunks).toStrictEqual([miniText]);
  });
});
