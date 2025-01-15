// libs
import { afterEach, describe, expect, test } from 'vitest';

// functions to test
import {
  addDocument,
  deleteDocument,
  retrieveDocument,
} from '../../database-search-interface.js';
import { deleteSourceDocument } from '../../database-search-source.js';

afterEach(async () => {
  try {
    await deleteDocument({ documentID: 'testID' });
  } catch (error) {
    if (error instanceof Error && error.message.includes('ENOENT')) {
      return;
    }
    throw error;
  }
});

describe('retrieveDocument', async () => {
  test('retrieveDocument will return undefined when the document does not exist', async () => {
    const document = await retrieveDocument({ documentID: 'testID' });
    expect(document).toBeUndefined();
  });

  test('retrieveDocument will return the document', async () => {
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
      metadata: {
        meta: 'data',
      },
      title: 'test title',
    });

    const document = await retrieveDocument({ documentID: 'testID' });
    if (!document) {
      throw new Error('Document not found');
    }
    expect(document.content).toBe('my content');
    expect(document.documentID).toBe('testID');
    expect(document.metadata.meta).toBe('data');
    expect(document.title).toBe('test title');
  });

  test('On failure, retrieveDocument will throw an error', async () => {
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
      metadata: {
        meta: 'data',
      },
      title: 'test title',
    });

    await deleteSourceDocument({ documentID: 'testID' });
    await expect(retrieveDocument({ documentID: 'testID' })).rejects.toThrow();
  });
});
