// libs
import { describe, expect, test, vi } from 'vitest';

// functions to test
import {
  addDocument,
  deleteDocument,
} from '../../database-search-interface.js';

// mocks
vi.mock('../../database-search-fts.js');
const databaseSearchFTS = await import('../../database-search-fts.js');
vi.mock('../../database-search-vector.js');
const databaseSearchVector = await import('../../database-search-vector.js');
vi.mock('../../database-search-source.js');
const databaseSearchSource = await import('../../database-search-source.js');

describe('deleteDocument', async () => {
  test('deleteDocument will verify if the document exist and call the delete for each index', async () => {
    databaseSearchFTS.exists = vi.fn().mockResolvedValue(true);
    databaseSearchFTS.deleteFTSDocument = vi.fn().mockResolvedValue(undefined);
    databaseSearchVector.deleteVectorChunks = vi
      .fn()
      .mockResolvedValue(undefined);
    databaseSearchSource.deleteSourceDocument = vi
      .fn()
      .mockResolvedValue(undefined);

    await deleteDocument({ documentID: '1' });

    expect(databaseSearchFTS.exists).toHaveBeenCalledTimes(1);
    expect(databaseSearchFTS.deleteFTSDocument).toHaveBeenCalledTimes(1);
    expect(databaseSearchVector.deleteVectorChunks).toHaveBeenCalledTimes(1);
    expect(databaseSearchSource.deleteSourceDocument).toHaveBeenCalledTimes(1);
  });

  test('deleteDocument will skip if the document does not exist', async () => {
    databaseSearchFTS.exists = vi.fn().mockResolvedValue(false);

    await deleteDocument({ documentID: '1' });

    expect(databaseSearchFTS.deleteFTSDocument).toHaveBeenCalledTimes(0);
    expect(databaseSearchVector.deleteVectorChunks).toHaveBeenCalledTimes(0);
    expect(databaseSearchSource.deleteSourceDocument).toHaveBeenCalledTimes(0);
  });
});

describe('addDocument', async () => {
  test('addDocument will add the document to all three indexes', async () => {
    databaseSearchFTS.exists = vi.fn().mockResolvedValue(false);
    databaseSearchVector.deleteVectorChunks = vi
      .fn()
      .mockResolvedValue(undefined);
    databaseSearchFTS.addFTSDocument = vi.fn().mockResolvedValue(undefined);
    databaseSearchVector.bulkAddVectorChunks = vi
      .fn()
      .mockResolvedValue(undefined);
    databaseSearchSource.saveSourceDocument = vi
      .fn()
      .mockResolvedValue(undefined);

    await addDocument({
      content: 'my content',
      documentID: 'testID',
      embedOutput: [
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
      metadata: { meta: 'data' },
      title: undefined,
    });

    expect(databaseSearchVector.deleteVectorChunks).not.toHaveBeenCalled();
    expect(databaseSearchFTS.addFTSDocument).toHaveBeenCalledOnce();
    expect(databaseSearchVector.bulkAddVectorChunks).toHaveBeenCalledOnce();
    expect(databaseSearchSource.saveSourceDocument).toHaveBeenCalledOnce();
  });

  test('addDocument will upsert existing docs', async () => {
    databaseSearchFTS.exists = vi.fn().mockResolvedValue(true);
    databaseSearchVector.deleteVectorChunks = vi
      .fn()
      .mockResolvedValue(undefined);
    databaseSearchFTS.addFTSDocument = vi.fn().mockResolvedValue(undefined);
    databaseSearchVector.bulkAddVectorChunks = vi
      .fn()
      .mockResolvedValue(undefined);
    databaseSearchSource.saveSourceDocument = vi
      .fn()
      .mockResolvedValue(undefined);

    await addDocument({
      content: 'my content',
      documentID: 'testID',
      embedOutput: [
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
      metadata: { meta: 'data' },
      title: undefined,
    });

    expect(databaseSearchFTS.exists).toHaveBeenCalledOnce();
    expect(databaseSearchVector.deleteVectorChunks).toHaveBeenCalledOnce();
  });

  // todo: atomic operation (#47)
  // test('addDocument will cleanup after failing and re-throw an error', async () => {
  //   databaseSearchFTS.exists = vi.fn().mockResolvedValue(false);
  //   databaseSearchInterface.deleteDocument = vi
  //     .fn()
  //     .mockResolvedValue(undefined);
  //   embeddingModule.autoEmbed = vi.fn().mockRejectedValue('nope');

  //   await expect(async () => {
  //     await addDocument({
  //       content: 'my content',
  //       documentID: 'testID',
  //       metadata: { meta: 'data' },
  //       title: undefined,
  //     });
  //   }).rejects.toThrow();

  //   expect(databaseSearchInterface.deleteDocument).toHaveBeenCalled();
  // });

  // test('addDocument failure will not delete an existing document', async () => {
  //   databaseSearchFTS.exists = vi.fn().mockResolvedValue(true);
  //   databaseSearchInterface.deleteDocument = vi
  //     .fn()
  //     .mockResolvedValue(undefined);
  //   embeddingModule.autoEmbed = vi.fn().mockRejectedValue('nope');

  //   await expect(async () => {
  //     await addDocument({
  //       content: 'my content',
  //       documentID: 'testID',
  //       metadata: { meta: 'data' },
  //       title: undefined,
  //     });
  //   }).rejects.toThrow();

  //   expect(databaseSearchInterface.deleteDocument).not.toHaveBeenCalled();
  // });
});
