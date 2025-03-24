import { describe, expect, it } from 'vitest';
import type { DocumentInsert } from '../../database-document-schemas.js';
import { pgDatabase } from '../../../config/database-postgresql.js';
import { documentsTable } from '../../database-document-schemas.js';
import {
  deleteDocumentInDatabase,
  getDocumentByID,
  insertDocumentInDatabase,
  updateDocumentInDatabase,
} from '../../database-document.js';

const document = {
  documentID: crypto.randomUUID(),
  metadata: {},
  title: 'test',
} satisfies DocumentInsert;

describe('insertDocument', () => {
  it('should insert a document', async () => {
    await insertDocumentInDatabase(document);

    const records = await pgDatabase.select().from(documentsTable);

    expect(records).toHaveLength(1);
    expect(records[0].documentID).toBe(document.documentID);
    expect(records[0].metadata).toEqual(document.metadata);
    expect(records[0].title).toBe(document.title);
  });

  it('should throw an error if the document already exists', async () => {
    await insertDocumentInDatabase(document);

    await expect(insertDocumentInDatabase(document)).rejects.toThrow();
  });
});

describe('getDocumentByID', () => {
  it('should return the document', async () => {
    await insertDocumentInDatabase(document);

    const record = await getDocumentByID({ documentID: document.documentID });

    expect(record?.documentID).toEqual(document.documentID);
    expect(record?.metadata).toEqual(document.metadata);
    expect(record?.title).toEqual(document.title);
    expect(record?.status).toEqual('uploading');
  });

  it('should return undefined if the document does not exist', async () => {
    const record = await getDocumentByID({ documentID: document.documentID });

    expect(record).toBeUndefined();
  });
});

describe('deleteDocument', () => {
  it('should delete the document', async () => {
    await insertDocumentInDatabase(document);

    await deleteDocumentInDatabase({ documentID: document.documentID });

    const record = await getDocumentByID({ documentID: document.documentID });

    expect(record).toBeUndefined();
  });
});

describe('updateDocument', () => {
  it('should update the document', async () => {
    await insertDocumentInDatabase(document);

    await updateDocumentInDatabase({
      documentID: document.documentID,
      metadata: { test: 'test' },
    });

    const record = await getDocumentByID({ documentID: document.documentID });

    expect(record?.metadata).toEqual({ test: 'test' });
  });

  it('should ignore undefined values', async () => {
    await insertDocumentInDatabase(document);

    await updateDocumentInDatabase({
      documentID: document.documentID,
      metadata: undefined,
      title: 'new title',
    });

    const record = await getDocumentByID({ documentID: document.documentID });

    expect(record?.metadata).toEqual({});
    expect(record?.title).toEqual('new title');

    await updateDocumentInDatabase({
      documentID: document.documentID,
      metadata: { test: 'test' },
      title: undefined,
    });

    const record2 = await getDocumentByID({ documentID: document.documentID });

    expect(record2?.metadata).toEqual({ test: 'test' });
    expect(record2?.title).toEqual('new title');

    await updateDocumentInDatabase({
      documentID: document.documentID,
      status: 'errorUploading',
    });

    const record3 = await getDocumentByID({ documentID: document.documentID });

    expect(record3?.status).toEqual('errorUploading');
    expect(record3?.metadata).toEqual({ test: 'test' });
    expect(record3?.title).toEqual('new title');
  });
});
