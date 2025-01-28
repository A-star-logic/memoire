// libs
import { describe, expect, test } from 'vitest';

// functions to test
import {
  deleteSourceDocument,
  getSourceDocuments,
  saveSourceDocument,
} from '../../database-search-source.js';

const mockDocumentForSave: Parameters<typeof saveSourceDocument>[0] = {
  chunkedContent: [{ chunkText: 'test' }, { chunkText: 'document' }],
  documentID: '1',
  metadata: {
    meta: 'data',
  },
  title: undefined,
};

describe('deleteSourceDocument', async () => {
  test('deleteSourceDocument will remove the document from disk', async () => {
    await saveSourceDocument(mockDocumentForSave);

    await deleteSourceDocument({ documentID: '1' });

    await expect(async () => {
      await getSourceDocuments({
        searchResults: [{ documentID: '1' }],
      });
    }).rejects.toThrow(
      "ENOENT: no such file or directory, open '.memoire/sources/1.json'",
    );
  });

  test('deleteSourceDocument will pass if the document does not exist', async () => {
    try {
      const results = await getSourceDocuments({
        searchResults: [{ documentID: '1' }],
      });
      if (Object.keys(results).length > 0) {
        throw new Error('Document should not exist');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        await deleteSourceDocument({ documentID: '1' });
      } else {
        throw new Error('The document should not exist for the test to pass');
      }
    }
  });
});
