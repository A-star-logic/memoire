// libs
import { describe, expect, test } from 'vitest';
import { largeText, testChunks, testdocument } from './test-variables.js';

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
  });

  test('multiple document will give multiple embeddings', async () => {
    const response = await embedDocument({ chunks: testChunks });
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
    const result = isTooLarge({ text: largeText.repeat(10) });
    expect(result).toBeDefined();
    expect(result).toBe(true);
  });
});
