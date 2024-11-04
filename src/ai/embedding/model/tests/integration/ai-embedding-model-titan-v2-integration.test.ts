// libs
import { describe, expect, test } from 'vitest';
import {
  arraysEqual,
  largeText,
  testChunks,
  testdocument,
  testEmbeddingText,
  titanV2TestEmbedding,
} from './test-variables.js';

// test function
import {
  embedDocument,
  isTooLarge,
} from '../../ai-embedding-model-titan-v2.js';

describe('invoked Titan V2 embedding model', async () => {
  test('calling model with a doc will embed a document ', async () => {
    const response = await embedDocument({ chunks: testdocument });
    expect(response).toBeDefined();
    expect(response!.length).toBe(testdocument.length);
    expect(response![0].embedding.length).toBe(1024);
  });

  test('multiple document will give multiple embeddings', async () => {
    const response = await embedDocument({ chunks: testChunks });
    expect(response).toBeDefined();
    expect(response!.length).toBe(testChunks.length);
    expect(response![0].embedding.length).toBe(1024);
  });

  test('embedding of same statments are equal', async () => {
    const response = await embedDocument({ chunks: [testEmbeddingText] });
    expect(response).toBeDefined();
    expect(response!.length).toBe(1);
    expect(response![0].embedding.length).toBe(1024);
    expect(arraysEqual(response![0].embedding, titanV2TestEmbedding)).toBe(
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
    const result = isTooLarge({ text: largeText.repeat(10) });
    expect(result).toBeDefined();
    expect(result).toBe(true);
  });
});
