// libs
import { describe, expect, test } from 'vitest';
import {
  arraysEqual,
  cohereTestDocumentEmbedding,
  cohereTestQueryEmbedding,
  largeText,
  testChunks,
  testdocument,
  testEmbeddingText,
} from './test-variables.js';

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
    expect(response![0].embedding.length).toBe(1024);
  });

  test('calling model with a search queary will embed a query ', async () => {
    const response = await embedQuery({ chunks: testdocument });
    expect(response).toBeDefined();
    expect(response!.length).toBe(testdocument.length);
    expect(response![0].embedding.length).toBe(1024);
  });

  test('multiple search document will give multiple embeddings', async () => {
    const response = await embedDocument({ chunks: testChunks });
    expect(response).toBeDefined();
    expect(response!.length).toBe(testChunks.length);
    expect(response![0].embedding.length).toBe(1024);
  });

  test('multiple search query chunks will give multiple embeddings', async () => {
    const response = await embedQuery({ chunks: testChunks });
    expect(response).toBeDefined();
    expect(response!.length).toBe(testChunks.length);
    expect(response![0].embedding.length).toBe(1024);
  });

  test('embedding of same search Document are equal', async () => {
    const response = await embedDocument({ chunks: [testEmbeddingText] });
    expect(response).toBeDefined();
    expect(response!.length).toBe(1);
    expect(response![0].embedding.length).toBe(1024);
    expect(
      arraysEqual(response![0].embedding, cohereTestDocumentEmbedding),
    ).toBe(true);
  });

  test('embedding of same search quary sentances are equal', async () => {
    const response = await embedQuery({ chunks: [testEmbeddingText] });
    expect(response).toBeDefined();
    expect(response!.length).toBe(1);
    expect(response![0].embedding.length).toBe(1024);
    expect(arraysEqual(response![0].embedding, cohereTestQueryEmbedding)).toBe(
      true,
    );
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
