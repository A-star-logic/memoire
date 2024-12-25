// libs
import { describe, expect, test, vi } from 'vitest';

// function to test
import { addDocuments, deleteDocuments } from '../../core-search.js';

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
vi.mock('../../../ai/embedding/ai-embeddings-interface.js');
const embeddingModule = await import(
  '../../../ai/embedding/ai-embeddings-interface.js'
);
vi.mock('../../core-extractor.js');
const coreExtractorModule = await import('../../core-extractor.js');

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

describe('addDocuments', async () => {
  test('addDocuments will do the pre-process and post-processing of the documents to ingest', async () => {
    databaseSearchInterface.addDocument = vi.fn().mockResolvedValue(undefined);
    coreExtractorModule.extractContent = vi.fn().mockResolvedValue('my string');
    embeddingModule.autoEmbed = vi.fn().mockResolvedValue([
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

    await addDocuments({
      documents: [
        {
          documentID: '123',
          metadata: { meta: 'data' },
          title: 'title',
          url: 'test.url',
        },
        {
          documentID: '456',
          metadata: undefined,
          title: undefined,
          url: 'test.url2',
        },
      ],
    });

    expect(coreExtractorModule.extractContent).toHaveBeenCalledTimes(2);
    expect(embeddingModule.autoEmbed).toHaveBeenCalledTimes(2);
    expect(databaseSearchInterface.addDocument).toHaveBeenCalledTimes(2);
    expect(databaseSearchVector.saveVectorIndexToDisk).toHaveBeenCalledTimes(1);
    expect(databaseSearchFTS.calculateIDF).toHaveBeenCalledTimes(1);
    expect(databaseSearchFTS.saveFTSIndexToDisk).toHaveBeenCalledTimes(1);
  });

  test('addDocuments can handle raw documents', async () => {
    databaseSearchInterface.addDocument = vi.fn().mockResolvedValue(undefined);
    coreExtractorModule.extractContent = vi.fn().mockResolvedValue('my string');
    embeddingModule.autoEmbed = vi.fn().mockResolvedValue([
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

    await addDocuments({
      documents: [
        {
          content: 'test content 1',
          documentID: '123',
          metadata: { meta: 'data' },
          title: 'title',
        },
        {
          content: 'test content 2',
          documentID: '456',
          metadata: undefined,
          title: undefined,
        },
      ],
    });

    expect(coreExtractorModule.extractContent).toBeCalledTimes(2);
    expect(embeddingModule.autoEmbed).toHaveBeenCalledTimes(2);
    expect(databaseSearchInterface.addDocument).toHaveBeenCalledTimes(2);
    expect(databaseSearchVector.saveVectorIndexToDisk).toHaveBeenCalledTimes(1);
    expect(databaseSearchFTS.calculateIDF).toHaveBeenCalledTimes(1);
    expect(databaseSearchFTS.saveFTSIndexToDisk).toHaveBeenCalledTimes(1);
  });
});
