// libs
import { describe, expect, test, vi } from 'vitest';

// functions to test
import { deleteDocument } from '../../database-search-interface.js';

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
