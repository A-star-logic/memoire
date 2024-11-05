// libs
import { describe, expect, test } from 'vitest';

//test variables
import {
  arraysEqual,
  largeText,
  testChunks,
  testDocument,
  testEmbeddingText,
  xenovaLocalTestEmbedding,
} from './test-variables.js';

// test function
import { embedDocument, isTooLarge } from '../../ai-embedding-model-local.js';

describe('invoked local xenova embedding model', async () => {
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
    expect(arraysEqual(response[0].embedding, xenovaLocalTestEmbedding)).toBe(
      true,
    );
  });
});

describe('isTooLarge', async () => {
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
