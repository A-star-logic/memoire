import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Environment } from '../../../../../../environment.js';
import {
  initPostgreSQL,
  pgDatabase,
} from '../../../postgresql-config/database-postgresql.js';
import { chunksTable } from '../../database-search-schemas.js';
import {
  bulkAddVectorChunks,
  deleteVectorChunks,
  usageStatsVector,
  vectorSearch,
} from '../../database-search-vector.js';

beforeAll(async () => {
  initPostgreSQL({ env: process.env as Environment });
});

beforeEach(async () => {
  await pgDatabase.execute(sql`TRUNCATE TABLE vector_chunks`);
});

const mockDocument1: Parameters<typeof bulkAddVectorChunks>[0] = {
  documentID: randomUUID(),
  embeddings: [
    {
      chunkContent: 'test content',
      chunkID: 0,
      embedding: Array.from({ length: 1536 }, () => {
        return 0.9;
      }),
    },
    {
      chunkContent: 'test content',
      chunkID: 1,
      embedding: Array.from({ length: 1536 }, () => {
        return 0.9;
      }),
    },
  ],
};

const mockDocument2: Parameters<typeof bulkAddVectorChunks>[0] = {
  documentID: randomUUID(),
  embeddings: [
    {
      chunkContent: 'test content',
      chunkID: 0,
      embedding: Array.from({ length: 1536 }, () => {
        return -0.1;
      }),
    },
  ],
};

describe('Bulk add vector chunks', () => {
  it('should add vector chunks to the database', async () => {
    await bulkAddVectorChunks(mockDocument1);

    const records = await pgDatabase.select().from(chunksTable);

    expect(records).toHaveLength(2);
    expect(records[0].chunkID).toBe(0);
    expect(records[1].chunkID).toBe(1);
  });
});

describe('Delete vector chunks', () => {
  it('should delete vector chunks from the database', async () => {
    await bulkAddVectorChunks(mockDocument1);
    await deleteVectorChunks({ documentID: mockDocument1.documentID });

    const records = await pgDatabase.select().from(chunksTable);

    expect(records).toHaveLength(0);
  });

  it('should pass if the document does not exist', async () => {
    await deleteVectorChunks({ documentID: randomUUID() });
    expect(true).toBe(true);
  });
});

describe('Usage stats vector', () => {
  it('should return the correct usage stats', async () => {
    await bulkAddVectorChunks(mockDocument1);
    await bulkAddVectorChunks(mockDocument2);

    const stats = await usageStatsVector();

    expect(stats.totalDocuments).toBe(3);
  });

  it('should return 0 if there are no vector chunks', async () => {
    const stats = await usageStatsVector();
    expect(stats.totalDocuments).toBe(0);
  });
});

describe('Vector search', () => {
  it('should return the correct vector search results', async () => {
    await bulkAddVectorChunks(mockDocument1);
    await bulkAddVectorChunks(mockDocument2);

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
      expect(item.documentID).toBe(mockDocument1.documentID);
    }
  });

  it('should filter the number of output to number of documents if less than maxResults', async () => {
    await bulkAddVectorChunks(mockDocument1);
    await bulkAddVectorChunks(mockDocument2);

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
