// libs
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

// test setup
import '../setup/database-setup.js';

// local imports
import { getDatabaseClient } from '../../../client/database-client.js';
import { documents } from '../../../schema/documents.js';
import {
  deleteSourceDocument,
  getSourceDocuments,
  saveSourceDocument,
} from '../../database-search-source.js';

beforeEach(async () => {
  // Clean up any existing test documents
  const database = getDatabaseClient();
  await database.delete(documents);
});

afterEach(async () => {
  // Clean up any documents created during tests
  const database = getDatabaseClient();
  await database.delete(documents);
});

describe('saveSourceDocument', () => {
  test('saves a new document with title and content', async () => {
    const documentID = randomUUID();

    const document = {
      content: 'test content',
      documentID,
      metadata: { source: 'test' },
      title: 'Test Title',
    };

    await saveSourceDocument(document);

    const result = await getSourceDocuments({
      searchResults: [{ documentID }],
    });

    expect(Object.keys(result)).toHaveLength(1);
    expect(result[documentID]).toMatchObject({
      chunkedContent: [],
      metadata: { source: 'test' },
      title: 'Test Title',
    });
  });

  test('saves a document without title', async () => {
    const documentID = randomUUID();

    const document = {
      content: 'test content',
      documentID,
      metadata: { source: 'test' },
      title: '', // Empty string for no title
    };

    await saveSourceDocument(document);

    const result = await getSourceDocuments({
      searchResults: [{ documentID }],
    });

    expect(Object.keys(result)).toHaveLength(1);
    expect(result[documentID]).toMatchObject({
      chunkedContent: [],
      metadata: { source: 'test' },
      title: '',
    });
  });
});

describe('deleteSourceDocument', () => {
  test('removes an existing document', async () => {
    const documentID = randomUUID();

    const document = {
      content: 'test content',
      documentID,
      metadata: { source: 'test' },
      title: 'Test Title',
    };

    await saveSourceDocument(document);
    await deleteSourceDocument({ documentID });

    // Wait a bit for deletion to complete
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });

    const result = await getSourceDocuments({
      searchResults: [{ documentID }],
    });
    expect(result[documentID]).toBeUndefined();
  });

  test('passes if document does not exist', async () => {
    const documentID = randomUUID();
    await expect(deleteSourceDocument({ documentID })).resolves.not.toThrow();
  });
});

describe('getSourceDocuments', () => {
  test('retrieves multiple documents', async () => {
    const document1ID = randomUUID();
    const document2ID = randomUUID();

    await saveSourceDocument({
      content: 'content 1',
      documentID: document1ID,
      metadata: { source: 'test1' },
      title: 'Title 1',
    });

    await saveSourceDocument({
      content: 'content 2',
      documentID: document2ID,
      metadata: { source: 'test2' },
      title: 'Title 2',
    });

    const result = await getSourceDocuments({
      searchResults: [{ documentID: document1ID }, { documentID: document2ID }],
    });

    expect(Object.keys(result)).toHaveLength(2);
    expect(result[document1ID]).toMatchObject({
      chunkedContent: [],
      metadata: { source: 'test1' },
      title: 'Title 1',
    });
    expect(result[document2ID]).toMatchObject({
      chunkedContent: [],
      metadata: { source: 'test2' },
      title: 'Title 2',
    });
  });

  test('handles non-existent documents', async () => {
    const documentID = randomUUID();
    const result = await getSourceDocuments({
      searchResults: [{ documentID }],
    });
    expect(result).toEqual({});
  });
});
