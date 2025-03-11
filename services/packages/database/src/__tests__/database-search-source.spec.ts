// Import environment setup before anything else
import './setup-test-env.js';

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '../utils/database.js';
import { saveSourceDocument, deleteSourceDocument, getSourceDocuments } from '../search/database-search-source.js';
import { randomUUID } from 'crypto';

describe('Database Source Document Management', () => {
  // Clean up test data after all tests
  afterAll(async () => {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM documents WHERE title LIKE \'test_%\'');
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });

  describe('saveSourceDocument', () => {
    it('should save a new document with chunks', async () => {
      const documentID = randomUUID();
      const testDoc = {
        documentID,
        title: 'test_document',
        metadata: { source: 'test', type: 'unit_test' },
        chunkedContent: [
          { chunkText: 'chunk 1 content' },
          { chunkText: 'chunk 2 content' }
        ]
      };

      // Save the document
      await saveSourceDocument(testDoc);

      // Verify document was saved
      const documentQuery = `
        SELECT document_id, title, metadata
        FROM documents
        WHERE document_id = $1;
      `;
      const documentResult = await db.query(documentQuery, [documentID]);
      expect(documentResult.length).toBe(1);
      expect(documentResult[0].title).toBe(testDoc.title);
      expect(documentResult[0].metadata).toEqual(testDoc.metadata);

      // Verify chunks were saved
      const chunksQuery = `
        SELECT chunk_content
        FROM chunks
        WHERE document_id = $1
        ORDER BY created_at;
      `;
      const chunksResult = await db.query(chunksQuery, [documentID]);
      expect(chunksResult.length).toBe(2);
      expect(chunksResult[0].chunk_content).toBe(testDoc.chunkedContent[0].chunkText);
      expect(chunksResult[1].chunk_content).toBe(testDoc.chunkedContent[1].chunkText);
    });

    it('should update existing document and its chunks', async () => {
      const documentID = randomUUID();
      const initialDoc = {
        documentID,
        title: 'test_update_initial',
        metadata: { version: 1 },
        chunkedContent: [{ chunkText: 'initial content' }]
      };

      // Save initial version
      await saveSourceDocument(initialDoc);

      // Update the document
      const updatedDoc = {
        documentID,
        title: 'test_update_modified',
        metadata: { version: 2 },
        chunkedContent: [{ chunkText: 'modified content' }]
      };
      await saveSourceDocument(updatedDoc);

      // Verify document was updated
      const documentQuery = `
        SELECT document_id, title, metadata
        FROM documents
        WHERE document_id = $1;
      `;
      const documentResult = await db.query(documentQuery, [documentID]);
      expect(documentResult.length).toBe(1);
      expect(documentResult[0].title).toBe(updatedDoc.title);
      expect(documentResult[0].metadata).toEqual(updatedDoc.metadata);

      // Verify chunks were updated
      const chunksQuery = `
        SELECT chunk_content
        FROM chunks
        WHERE document_id = $1
        ORDER BY created_at;
      `;
      const chunksResult = await db.query(chunksQuery, [documentID]);
      expect(chunksResult.length).toBe(1);
      expect(chunksResult[0].chunk_content).toBe(updatedDoc.chunkedContent[0].chunkText);
    });
  });

  describe('deleteSourceDocument', () => {
    it('should delete document and its chunks', async () => {
      const documentID = randomUUID();
      const testDoc = {
        documentID,
        title: 'test_delete',
        metadata: { test: true },
        chunkedContent: [{ chunkText: 'content to delete' }]
      };

      // Save then delete the document
      await saveSourceDocument(testDoc);
      await deleteSourceDocument({ documentID });

      // Verify document was deleted
      const documentQuery = `
        SELECT COUNT(*)::int
        FROM documents
        WHERE document_id = $1;
      `;
      const documentResult = await db.query<{ count: number }>(documentQuery, [documentID]);
      expect(documentResult[0].count).toBe(0);

      // Verify chunks were deleted (should be automatic due to CASCADE)
      const chunksQuery = `
        SELECT COUNT(*)::int
        FROM chunks
        WHERE document_id = $1;
      `;
      const chunksResult = await db.query<{ count: number }>(chunksQuery, [documentID]);
      expect(chunksResult[0].count).toBe(0);
    });

    it('should not error when deleting non-existent document', async () => {
      const nonExistentID = randomUUID();
      await expect(deleteSourceDocument({ documentID: nonExistentID }))
        .resolves.not.toThrow();
    });
  });

  describe('getSourceDocuments', () => {
    it('should retrieve multiple documents with their chunks', async () => {
      const doc1ID = randomUUID();
      const doc2ID = randomUUID();
      
      // Create test documents
      const docs = [
        {
          documentID: doc1ID,
          title: 'test_get_1',
          metadata: { index: 1 },
          chunkedContent: [{ chunkText: 'doc1 chunk' }]
        },
        {
          documentID: doc2ID,
          title: 'test_get_2',
          metadata: { index: 2 },
          chunkedContent: [{ chunkText: 'doc2 chunk' }]
        }
      ];

      // Save both documents
      await Promise.all(docs.map(doc => saveSourceDocument(doc)));

      // Retrieve the documents
      const results = await getSourceDocuments({
        searchResults: [{ documentID: doc1ID }, { documentID: doc2ID }]
      });

      // Verify results
      expect(Object.keys(results).length).toBe(2);
      expect(results[doc1ID].title).toBe('test_get_1');
      expect(results[doc1ID].metadata).toEqual({ index: 1 });
      expect(results[doc1ID].chunkedContent).toEqual(['doc1 chunk']);
      expect(results[doc2ID].title).toBe('test_get_2');
      expect(results[doc2ID].metadata).toEqual({ index: 2 });
      expect(results[doc2ID].chunkedContent).toEqual(['doc2 chunk']);
    });

    it('should handle duplicate document IDs in search results', async () => {
      const documentID = randomUUID();
      const testDoc = {
        documentID,
        title: 'test_duplicate',
        metadata: { test: true },
        chunkedContent: [{ chunkText: 'content' }]
      };

      // Save document
      await saveSourceDocument(testDoc);

      // Retrieve with duplicate IDs in search results
      const results = await getSourceDocuments({
        searchResults: [{ documentID }, { documentID }] // Same ID twice
      });

      // Verify we only got one copy
      expect(Object.keys(results).length).toBe(1);
      expect(results[documentID].title).toBe('test_duplicate');
    });
  });
});
