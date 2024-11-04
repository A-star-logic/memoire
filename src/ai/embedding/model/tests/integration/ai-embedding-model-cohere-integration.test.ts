// libs
import { describe, expect, test } from 'vitest';
import { largeText, testChunks, testdocument } from './test-variables.js';

// test function
import {
  embedDocument,
  embedQuery,
  isTooLarge,
} from '../../ai-embedding-model-cohere.js';

describe('invoked cohere embedding model', async () => {
  test('calling model with a search doc will embed a document ', async () => {
    const response = await embedDocument({ chunks: testdocument });
    expect(response).toBeDefined();
    expect(response!.length).toBe(testdocument.length);
  });

  test('calling model with a search queary will embed a query ', async () => {
    const response = await embedQuery({ chunks: testdocument });
    expect(response).toBeDefined();
    expect(response!.length).toBe(testdocument.length);
  });

  test('multiple search document will give multiple embeddings', async () => {
    const response = await embedDocument({ chunks: testChunks });
    expect(response).toBeDefined();
    expect(response!.length).toBe(testChunks.length);
  });

  test('multiple search query chunks will give multiple embeddings', async () => {
    const response = await embedQuery({ chunks: testChunks });
    expect(response).toBeDefined();
    expect(response!.length).toBe(testChunks.length);
  });
});

describe('isTooLarge', async () => {
  test('returned flase for small text', async () => {
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
