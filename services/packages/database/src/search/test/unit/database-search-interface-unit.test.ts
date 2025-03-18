// libs
import { describe, expect, test, vi } from 'vitest';

// functions to test
import {
  addDocumentToSearch,
  deleteDocumentFromSearch,
} from '../../database-search-interface.js';

// mocks
vi.mock('../../database-search-chunks.js');
const databaseSearchChunks = await import('../../database-search-chunks.js');

describe('deleteDocumentFromSearch', async () => {
  test('deleteDocumentFromSearch will delete the chunks from the database', async () => {
    databaseSearchChunks.deleteChunks = vi.fn().mockResolvedValue(undefined);

    await deleteDocumentFromSearch({ documentID: '1' });

    expect(databaseSearchChunks.deleteChunks).toHaveBeenCalledTimes(1);
    expect(databaseSearchChunks.deleteChunks).toHaveBeenCalledWith({
      documentID: '1',
    });
  });
});

describe('addDocumentToSearch', async () => {
  test('addDocumentToSearch will add the chunks to the database', async () => {
    databaseSearchChunks.addChunk = vi.fn().mockResolvedValue(undefined);

    await addDocumentToSearch({
      chunks: [
        {
          chunkID: 0,
          chunkText: 'my',
          embedding: [0, 0, 0],
        },
        {
          chunkID: 1,
          chunkText: 'content',
          embedding: [0, 0, 0],
        },
      ],
      documentID: 'testID',
    });

    expect(databaseSearchChunks.addChunk).toHaveBeenCalledTimes(2);
    expect(databaseSearchChunks.addChunk).toHaveBeenCalledWith({
      chunkContent: 'my',
      chunkID: 0,
      documentID: 'testID',
      embedding: [0, 0, 0],
    });
    expect(databaseSearchChunks.addChunk).toHaveBeenCalledWith({
      chunkContent: 'content',
      chunkID: 1,
      documentID: 'testID',
      embedding: [0, 0, 0],
    });
  });
});
