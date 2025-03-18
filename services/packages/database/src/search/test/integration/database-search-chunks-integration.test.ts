import { describe, expect, it } from 'vitest';
import type { Chunk } from '../../database-search-schemas.js';
import { pgDatabase } from '../../../database-config/database-postgresql.js';
import {
  addChunk,
  deleteChunks,
  textSearch,
  vectorSearch,
} from '../../database-search-chunks.js';
import { searchChunksTable } from '../../database-search-schemas.js';

const mockDocument1 = {
  chunkContent: 'Hello, world!',
  chunkID: 1,
  documentID: crypto.randomUUID(),
  embedding: Array.from({ length: 1536 }, () => {
    return 0.9;
  }),
} satisfies Chunk;

const mockDocument3 = {
  chunkContent: 'Hello!',
  chunkID: 1,
  documentID: mockDocument1.documentID,
  embedding: Array.from({ length: 1536 }, () => {
    return 0.8;
  }),
} satisfies Chunk;

const mockDocument2 = {
  chunkContent: 'test content',
  chunkID: 0,
  documentID: crypto.randomUUID(),
  embedding: Array.from({ length: 1536 }, () => {
    return -0.1;
  }),
} satisfies Chunk;

describe('Add chunk', () => {
  it('should add a chunk to the database', async () => {
    await addChunk(mockDocument1);

    const chunks = await pgDatabase.select().from(searchChunksTable);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].chunkID).toBe(1);
    expect(chunks[0].chunkContent).toBe('Hello, world!');
  });
});

describe('Delete chunks', () => {
  it('should delete all the chunks with the same documentID from the database', async () => {
    await addChunk(mockDocument1);
    await addChunk(mockDocument2);
    await addChunk(mockDocument3);

    await deleteChunks({ documentID: mockDocument1.documentID });

    const records = await pgDatabase.select().from(searchChunksTable);

    expect(records).toHaveLength(1);
    expect(records[0].documentID).toBe(mockDocument2.documentID);
  });

  it('should pass if the document does not exist', async () => {
    await deleteChunks({ documentID: crypto.randomUUID() });
    expect(true).toBe(true);
  });
});

describe('Vector search', () => {
  it('should return the correct vector search results', async () => {
    await addChunk(mockDocument1);
    await addChunk(mockDocument2);
    await addChunk(mockDocument3);

    const result = await vectorSearch({
      embedding: Array.from({ length: 1536 }, () => {
        return 0.9;
      }),
      maxResults: 100,
    });

    expect(result.length).toBe(2);
    expect(result[0].score).toBeGreaterThan(0.99);
    expect(result[1].score).toBeGreaterThan(0.99);
    for (const item of result) {
      expect(item.chunkContent).toContain('Hello');
    }
  });

  it('should filter the number of output to number of documents if less than maxResults', async () => {
    await addChunk(mockDocument1);
    await addChunk(mockDocument2);
    await addChunk(mockDocument3);
    const result = await vectorSearch({
      embedding: Array.from({ length: 1536 }, () => {
        return 0.9;
      }),
      maxResults: 1,
    });

    expect(result.length).toBe(1);
    expect(result[0].documentID).toBe(mockDocument1.documentID);
  });
});

describe('Text search', () => {
  it('should return the correct text search results, with scores', async () => {
    await addChunk(mockDocument1);
    await addChunk(mockDocument2);
    await addChunk(mockDocument3);

    const result = await textSearch({
      maxResults: 100,
      query: 'hello world',
    });

    expect(result.length).toBe(2);
    expect(result[0].chunkContent).toContain('Hello');
    expect(result[1].chunkContent).toContain('Hello');
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });

  it('should limit the number of results', async () => {
    await addChunk(mockDocument1);
    await addChunk(mockDocument2);
    await addChunk(mockDocument3);

    const result = await textSearch({
      maxResults: 1,
      query: 'hello',
    });

    expect(result.length).toBe(1);
    expect(result[0].chunkContent).toContain('Hello');
  });
});
