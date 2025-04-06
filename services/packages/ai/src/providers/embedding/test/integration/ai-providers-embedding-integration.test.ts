import { describe, expect, test } from 'vitest';
import { embedDocumentChunks, embedQuery } from './ai-providers-embedding.js';

const testQuery = 'test query';
const testChunks = ['test', 'document'];

describe.skipIf(!process.env.TEST_APIS)('Cohere embedding model', async () => {
  describe('embedQuery', () => {
    test('embedQuery will embed a query', async () => {
      const response = await embedQuery({
        content: testQuery,
        traceID: crypto.randomUUID(),
      });
      expect(response).toBeDefined();
      expect(response.length).toBe(1024);
    });

    test('embedQuery will throw an error if the query is too large', async () => {
      const response = await embedQuery({
        content: 'a'.repeat(10_000),
        traceID: crypto.randomUUID(),
      });
      expect(response).toBeDefined();
    });
  });

  describe('embedDocumentChunks', () => {
    test('embedDocumentChunks will embed a document', async () => {
      const response = await embedDocumentChunks({
        chunks: testChunks,
        traceID: crypto.randomUUID(),
      });
      expect(response).toBeDefined();
      expect(response.length).toBe(testChunks.length);
      expect(response[0].embedding.length).toBe(1024);
      expect(response[0].chunkContent).toBe(testChunks[0]);
      expect(response[1].chunkContent).toBe(testChunks[1]);
    });

    test('embedDocumentChunks will throw an error if any of the chunks are too large', async () => {
      await expect(
        embedDocumentChunks({
          chunks: ['a'.repeat(10_000), 'b'.repeat(10_000)],
          traceID: crypto.randomUUID(),
        }),
      ).rejects.toThrow();

      await expect(
        embedDocumentChunks({
          chunks: ['test', 'b'.repeat(10_000)],
          traceID: crypto.randomUUID(),
        }),
      ).rejects.toThrow();

      await expect(
        embedDocumentChunks({
          chunks: ['a'.repeat(10_000), 'test'],
          traceID: crypto.randomUUID(),
        }),
      ).rejects.toThrow();
    });
  });
});
