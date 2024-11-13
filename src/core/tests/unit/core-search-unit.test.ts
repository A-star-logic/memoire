// libs
import { describe, expect, test, vi } from 'vitest';

// function to test
import { addDocument, deleteDocuments } from '../../core-search.js';

// mocks
vi.mock('../../../database/search/database-search-interface.js');
const databaseSearchInterface = await import(
  '../../../database/search/database-search-interface.js'
);
vi.mock('../../../database/search/database-search-fts.js');
const databaseSearchFTS = await import(
  '../../../database/search/database-search-fts.js'
);
vi.mock('../../../database/search/database-search-vector.js');
const databaseSearchVector = await import(
  '../../../database/search/database-search-vector.js'
);
vi.mock('../../../database/search/database-search-source.js');
const databaseSearchSource = await import(
  '../../../database/search/database-search-source.js'
);
vi.mock('../../../ai/embedding/ai-embeddings-interface.js');
const embeddingModule = await import(
  '../../../ai/embedding/ai-embeddings-interface.js'
);

describe('deleteDocuments', async () => {
  test('deleteDocuments will call the delete interface for each document', async () => {
    databaseSearchInterface.deleteDocument = vi
      .fn()
      .mockResolvedValue(undefined);
    await deleteDocuments({
      documentIDs: ['1', '2', '3', '4', '5'],
    });

    expect(databaseSearchInterface.deleteDocument).toHaveBeenCalledTimes(5);
  });

  test('deleteDocuments will call the calculate IDF, and sync to disk at the end of processing', async () => {
    databaseSearchInterface.deleteDocument = vi
      .fn()
      .mockResolvedValue(undefined);
    databaseSearchFTS.calculateIDF = vi.fn().mockResolvedValue(undefined);
    databaseSearchFTS.saveFTSIndexToDisk = vi.fn().mockResolvedValue(undefined);
    await deleteDocuments({
      documentIDs: ['1', '2', '3', '4', '5'],
    });

    expect(databaseSearchFTS.calculateIDF).toHaveBeenCalledTimes(1);
    expect(databaseSearchFTS.saveFTSIndexToDisk).toHaveBeenCalledTimes(1);
  });
});

describe('addDocument', async () => {
  test('addDocument will auto embed and add the document to all three indexes', async () => {
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
    embeddingModule.autoEmbed = vi.fn().mockResolvedValueOnce([
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
    ] satisfies Awaited<ReturnType<typeof embeddingModule.autoEmbed>>);

    await addDocument({
      content: 'my content',
      documentID: 'testID',
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
    embeddingModule.autoEmbed = vi.fn().mockResolvedValueOnce([
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
    ] satisfies Awaited<ReturnType<typeof embeddingModule.autoEmbed>>);

    await addDocument({
      content: 'my content',
      documentID: 'testID',
      metadata: { meta: 'data' },
      title: undefined,
    });

    expect(databaseSearchFTS.exists).toHaveBeenCalledOnce();
    expect(databaseSearchVector.deleteVectorChunks).toHaveBeenCalledOnce();
  });
});
