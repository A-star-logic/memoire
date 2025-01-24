// node
import { readdir } from 'node:fs/promises';

// libs
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// functions to test
import {
  bulkAddVectorChunks,
  deleteVectorChunks,
  vectorSearch,
} from '../../database-search-vector.js';

const mockDocument1: Parameters<typeof bulkAddVectorChunks>[0] = {
  documentID: '1',
  embeddings: [
    {
      chunkID: 0,
      embedding: [0.9, 0.9, 0.9],
    },
    {
      chunkID: 1,
      embedding: [0.9, 0.9, 0.9],
    },
  ],
};
const mockDocument2: Parameters<typeof bulkAddVectorChunks>[0] = {
  documentID: '2',
  embeddings: [
    {
      chunkID: 0,
      embedding: [-0.1, -0.1, -0.1],
    },
  ],
};

beforeEach(async () => {
  // this is a crude way to reset the store
  await deleteVectorChunks({ documentID: '1' });
  await deleteVectorChunks({ documentID: '2' });
});
afterEach(async () => {
  await deleteVectorChunks({ documentID: '1' });
  await deleteVectorChunks({ documentID: '2' });
});

describe('vectorSearch', async () => {
  test('vectorSearch will find the document', async () => {
    await bulkAddVectorChunks(mockDocument1);
    await bulkAddVectorChunks(mockDocument2);

    const result = await vectorSearch({
      embedding: [0.9, 0.9, 0.9],
      maxResults: 100,
    });

    expect(result.length).toBe(3);
    expect(result[0].score).toBeGreaterThan(0.99);
    expect(result[1].score).toBeGreaterThan(0.99);
    expect(result[2].score).toBeLessThan(0.1);
  });
  test('vectorSearch will filter the number of output to number of documents if less than maxResults', async () => {
    await bulkAddVectorChunks(mockDocument1);
    await bulkAddVectorChunks(mockDocument2);

    const result = await vectorSearch({
      embedding: [0.9, 0.9, 0.9],
      maxResults: 1,
    });

    expect(result.length).toBe(3);
  });

  test('vectorSearch will filter the number of output to maxResults if maxResults is greater than 100', async () => {
    // Add more than 100 unique vector documents
    for (let index = 0; index < 102; index++) {
      const mockDocument: Parameters<typeof bulkAddVectorChunks>[0] = {
        documentID: `${index}`,
        embeddings: [
          {
            chunkID: 0,
            embedding: [0.1, 0.1, 0.1],
          },
        ],
      };
      await bulkAddVectorChunks(mockDocument);
    }

    const maxResults = 101;
    const result = await vectorSearch({
      embedding: [0.5, 0.5, 0.5],
      maxResults,
    });

    expect(result.length).toBeLessThanOrEqual(maxResults);

    // Cleanup: Delete all added documents
    for (let index = 0; index < 102; index++) {
      await deleteVectorChunks({ documentID: `${index}` });
    }
  });
});

describe('deleteVectorChunks', async () => {
  test('deleteVectorChunks will remove the document from the memory index and the disk', async () => {
    vi.mock('node:fs/promises');
    const fsModule = await import('node:fs/promises');
    fsModule.unlink = vi.fn().mockResolvedValue(undefined);
    await bulkAddVectorChunks(mockDocument1);

    await deleteVectorChunks({ documentID: '1' });

    const result = await vectorSearch({
      embedding: [0.9, 0.9, 0.9],
      maxResults: 100,
    });
    expect(result.length).toBe(0);
    expect(fsModule.unlink).toHaveBeenCalledTimes(2);
  });

  test('deleteVectorChunks will pass if the document does not exist', async () => {
    const result = await vectorSearch({
      embedding: [0.9, 0.9, 0.9],
      maxResults: 100,
    });
    const files = await readdir('.testMemoire/vector', { recursive: true });

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- files may not exist
    if (result.length > 0 || (files && files.length > 0)) {
      throw new Error(
        'For this test to pass, there should be no documents in the vector store',
      );
    }

    await deleteVectorChunks({ documentID: '1' });
  });
});
