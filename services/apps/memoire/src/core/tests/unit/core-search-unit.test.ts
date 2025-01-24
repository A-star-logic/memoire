// libs
import { describe, expect, test, vi } from 'vitest';

// function to test
import {
  addDocuments,
  deleteDocuments,
  documentExist,
  getDocument,
} from '../../core-search.js';

// mocks
vi.mock('@astarlogic/services-database/search');
const databaseSearchInterface = await import(
  '@astarlogic/services-database/search'
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
    databaseSearchInterface.calculateIDF = vi.fn().mockResolvedValue(undefined);
    databaseSearchInterface.saveFTSIndexToDisk = vi
      .fn()
      .mockResolvedValue(undefined);
    await deleteDocuments({
      documentIDs: ['1', '2', '3', '4', '5'],
    });

    expect(databaseSearchInterface.calculateIDF).toHaveBeenCalledTimes(1);
    expect(databaseSearchInterface.saveFTSIndexToDisk).toHaveBeenCalledTimes(1);
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
    expect(databaseSearchInterface.saveVectorIndexToDisk).toHaveBeenCalledTimes(
      1,
    );
    expect(databaseSearchInterface.calculateIDF).toHaveBeenCalledTimes(1);
    expect(databaseSearchInterface.saveFTSIndexToDisk).toHaveBeenCalledTimes(1);
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
    expect(databaseSearchInterface.saveVectorIndexToDisk).toHaveBeenCalledTimes(
      1,
    );
    expect(databaseSearchInterface.calculateIDF).toHaveBeenCalledTimes(1);
    expect(databaseSearchInterface.saveFTSIndexToDisk).toHaveBeenCalledTimes(1);
  });
});

describe('getDocument', async () => {
  test('getDocument will return the document', async () => {
    databaseSearchInterface.retrieveDocument = vi.fn().mockResolvedValue({
      content: 'test content',
      documentID: '123',
    } satisfies Awaited<
      ReturnType<typeof databaseSearchInterface.retrieveDocument>
    >);
    const document = await getDocument({ documentID: '123' });
    if (!document) {
      throw new Error('Document not found');
    }
    expect(document.content).toBe('test content');
    expect(databaseSearchInterface.retrieveDocument).toHaveBeenCalledTimes(1);
  });

  test('getDocument will return undefined when the document does not exist', async () => {
    databaseSearchInterface.retrieveDocument = vi
      .fn()
      .mockResolvedValue(
        undefined satisfies Awaited<
          ReturnType<typeof databaseSearchInterface.retrieveDocument>
        >,
      );
    const document = await getDocument({ documentID: '123' });
    expect(document).toBe(undefined);
    expect(databaseSearchInterface.retrieveDocument).toHaveBeenCalledTimes(1);
  });
});

describe('documentExist', async () => {
  test('documentExist will return true when a document exists', async () => {
    databaseSearchInterface.exists = vi
      .fn()
      .mockResolvedValue(
        true satisfies Awaited<
          ReturnType<typeof databaseSearchInterface.exists>
        >,
      );
    const result = await documentExist({ documentID: '123' });
    if (!result) {
      throw new Error('Document not found');
    }
    expect(result).toBe(true);
    expect(databaseSearchInterface.exists).toHaveBeenCalledTimes(1);
  });

  test('documentExist will return false when the document does not exist', async () => {
    databaseSearchInterface.exists = vi
      .fn()
      .mockResolvedValue(
        false satisfies Awaited<
          ReturnType<typeof databaseSearchInterface.exists>
        >,
      );
    const document = await documentExist({ documentID: '123' });
    expect(document).toBe(false);
    expect(databaseSearchInterface.exists).toHaveBeenCalledTimes(1);
  });
});
