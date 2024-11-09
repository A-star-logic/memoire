// libs
import { describe, expect, test, vi } from 'vitest';

// functions to test
import {
  addFTSDocument,
  deleteFTSDocument,
  exists,
} from '../../database-search-fts.js';

const mockDocument: Parameters<typeof addFTSDocument>[0] = {
  documentID: '1',
  text: 'test document',
};

describe('deleteFTSDocument', async () => {
  test('deleteFTSDocument will delete the document from the index and from the disk', async () => {
    vi.mock('node:fs/promises');
    const fsModule = await import('node:fs/promises');
    fsModule.unlink = vi.fn().mockResolvedValue(undefined);

    await addFTSDocument(mockDocument);
    await deleteFTSDocument({ documentID: '1' });

    const exist = await exists({ documentID: '1' });

    expect(exist).toBe(false);

    expect(fsModule.unlink).toHaveBeenCalledTimes(1);
  });

  test('deleteFTSDocument will soft fail if the document does not exist', async () => {
    await deleteFTSDocument({ documentID: '1' });
  });
});
