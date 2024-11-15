import { describe, expect, test } from 'vitest';
import { createLengthBasedChunks } from '../../ai-chunking-fixed-size.js';
import { largeText, testLengthBasedChunks } from './test-variables.js';

describe('createDocumentChunks', async () => {
  test('chunking the same document returns same chunks', async () => {
    const chunks = createLengthBasedChunks({ document: largeText });
    expect(chunks.length).toBe(testLengthBasedChunks.length);
    expect(chunks).toStrictEqual(testLengthBasedChunks);
  });

  test('Chunking a small text should still return chunks', async () => {
    const miniText = 'return this as a list of one ele';
    const chunks = createLengthBasedChunks({
      document: miniText,
    });
    expect(chunks.length).toBe(1);
    expect(chunks).toStrictEqual([miniText + ' ']);
  });
});
