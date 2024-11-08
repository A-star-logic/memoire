// libs
import { describe, expect, test, vi } from 'vitest';

// function to test
import { deleteDocuments } from '../../core-search.js';

// mocks
vi.mock('../../../database/search/database-search-interface.js');
const databaseSearchInterface = await import(
  '../../../database/search/database-search-interface.js'
);
vi.mock('../../../database/search/database-search-fts.js');
const databaseSearchFTS = await import(
  '../../../database/search/database-search-fts.js'
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
