import { describe, expect, test, vi } from 'vitest';
import {
  addDocument,
  deleteDocument,
} from '../../database-document-interface.js';

vi.mock('../../database-document.js');
const databaseDocument = await import('../../database-document.js');

vi.mock('../../database-document-source.js');
const databaseDocumentSource = await import(
  '../../database-document-source.js'
);

describe('addDocument', () => {
  test('should add a document to the database, then to the bucket, and sync the status to the database', async () => {
    databaseDocument.insertDocumentInDatabase = vi
      .fn()
      .mockResolvedValue(undefined);
    databaseDocumentSource.uploadToBucket = vi
      .fn()
      .mockResolvedValue(undefined);
    databaseDocument.updateDocumentInDatabase = vi
      .fn()
      .mockResolvedValue(undefined);

    await addDocument({
      documentID: '1',
      metadata: { test: 'test' },
      title: 'test',
    });

    expect(databaseDocument.insertDocumentInDatabase).toHaveBeenCalledTimes(1);
    expect(databaseDocument.insertDocumentInDatabase).toHaveBeenCalledWith({
      documentID: '1',
      metadata: { test: 'test' },
      title: 'test',
    });
    expect(databaseDocumentSource.uploadToBucket).toHaveBeenCalledTimes(1);
    expect(databaseDocument.updateDocumentInDatabase).toHaveBeenCalledTimes(1);
    expect(databaseDocument.updateDocumentInDatabase).toHaveBeenCalledWith({
      documentID: '1',
      status: 'pendingIndexing',
    });
  });

  test('should sync delete the document from the database if the upload to the bucket fails, and throw the original error', async () => {
    databaseDocument.insertDocumentInDatabase = vi
      .fn()
      .mockResolvedValue(undefined);
    databaseDocumentSource.uploadToBucket = vi
      .fn()
      .mockRejectedValue(new Error('Upload failed'));
    databaseDocument.deleteDocumentInDatabase = vi
      .fn()
      .mockResolvedValue(undefined);

    await expect(
      addDocument({
        documentID: '1',
        metadata: { test: 'test' },
        title: 'test',
      }),
    ).rejects.toThrow('Upload failed');

    expect(databaseDocument.insertDocumentInDatabase).toHaveBeenCalledTimes(1);
    expect(databaseDocument.updateDocumentInDatabase).not.toHaveBeenCalled();
    expect(databaseDocument.deleteDocumentInDatabase).toHaveBeenCalledTimes(1);
    expect(databaseDocument.deleteDocumentInDatabase).toHaveBeenCalledWith({
      documentID: '1',
    });
  });
});

describe('deleteDocument', () => {
  test('should delete the document from the database and the bucket', async () => {
    databaseDocument.deleteDocumentInDatabase = vi
      .fn()
      .mockResolvedValue(undefined);
    databaseDocumentSource.deleteSourceDocument = vi
      .fn()
      .mockResolvedValue(undefined);

    await deleteDocument({ documentID: '1' });

    expect(databaseDocument.deleteDocumentInDatabase).toHaveBeenCalledTimes(1);
    expect(databaseDocument.deleteDocumentInDatabase).toHaveBeenCalledWith({
      documentID: '1',
    });
    expect(databaseDocumentSource.deleteSourceDocument).toHaveBeenCalledTimes(
      1,
    );
    expect(databaseDocumentSource.deleteSourceDocument).toHaveBeenCalledWith({
      documentID: '1',
    });
  });

  test('should not delete the document from the database if the delete from the bucket fails, and throw the original error', async () => {
    databaseDocumentSource.deleteSourceDocument = vi
      .fn()
      .mockRejectedValue(new Error('Delete failed'));

    await expect(deleteDocument({ documentID: '1' })).rejects.toThrow(
      'Delete failed',
    );

    expect(databaseDocument.deleteDocumentInDatabase).not.toHaveBeenCalled();
  });
});
