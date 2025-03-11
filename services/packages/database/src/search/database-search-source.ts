import { secureVerifyDocumentID } from '@astarlogic/services-utils/utils-security.js';
import { db } from '../utils/database.js';

interface SourceDocument {
  chunkedContent: string[];
  metadata: object;
  title: string | undefined;
}

/**
 * Delete a document from the sources. It will skip any document that do not exist
 * @param root named parameters
 * @param root.documentID the document ID
 */
export async function deleteSourceDocument({
  documentID,
}: {
  documentID: string;
}): Promise<void> {
  const verifiedDocumentId = await secureVerifyDocumentID({ documentID });

  // Delete from documents table - chunks will be deleted automatically due to CASCADE
  const deleteQuery = `
    DELETE FROM documents
    WHERE document_id = $1;
  `;
  await db.query(deleteQuery, [verifiedDocumentId]);
}

/**
 * get a list of source documents
 * @param root named parameters
 * @param root.searchResults the search results
 * @returns The source document
 */
export async function getSourceDocuments({
  searchResults,
}: {
  searchResults: { documentID: string }[];
}): Promise<{ [documentID: string]: SourceDocument }> {
  const uniqueDocumentIDs = new Set(
    searchResults.map((result) => {
      return result.documentID;
    }),
  );
  const documents: Awaited<ReturnType<typeof getSourceDocuments>> = {};
  for (const documentID of uniqueDocumentIDs) {
    documents[documentID] = await loadSourceDocument({ documentID });
  }
  return documents;
}

/**
 * Save the source document to disk
 * @param root named parameters
 * @param root.chunkedContent the content as chunks
 * @param root.documentID the document ID
 * @param root.metadata the metadata of the document
 * @param root.title the document title
 */
export async function saveSourceDocument({
  chunkedContent,
  documentID,
  metadata,
  title,
}: {
  chunkedContent: { chunkText: string }[];
  documentID: string;
  metadata: object;
  title: string | undefined;
}): Promise<void> {
  const verifiedDocumentId = await secureVerifyDocumentID({ documentID });

  // Start a transaction since we're inserting into multiple tables
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Insert into documents table
    const documentInsertQuery = `
      INSERT INTO documents (document_id, title, metadata)
      VALUES ($1, $2, $3)
      ON CONFLICT (document_id) DO UPDATE
      SET title = $2,
          metadata = $3,
          updated_at = CURRENT_TIMESTAMP
      RETURNING document_id;
    `;
    await client.query(documentInsertQuery, [
      verifiedDocumentId,
      title || '', // Convert undefined to empty string as title is NOT NULL
      JSON.stringify(metadata)
    ]);

    // Delete existing chunks for this document (they'll be recreated)
    const deleteChunksQuery = `
      DELETE FROM chunks
      WHERE document_id = $1;
    `;
    await client.query(deleteChunksQuery, [verifiedDocumentId]);

    // Insert new chunks
    const chunkInsertQuery = `
      INSERT INTO chunks (document_id, chunk_content)
      VALUES ($1, $2);
    `;
    for (const chunk of chunkedContent) {
      await client.query(chunkInsertQuery, [verifiedDocumentId, chunk.chunkText]);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Load the source from disk
 * @param root named parameters
 * @param root.documentID the document ID
 * @returns The source document
 */
async function loadSourceDocument({
  documentID,
}: {
  documentID: string;
}): Promise<SourceDocument> {
  const verifiedDocumentId = await secureVerifyDocumentID({ documentID });

  // Get document metadata
  const documentQuery = `
    SELECT title, metadata
    FROM documents
    WHERE document_id = $1;
  `;
  const documentResult = await db.query<{ title: string; metadata: object }>(documentQuery, [verifiedDocumentId]);
  
  if (documentResult.length === 0) {
    throw new Error(`Document not found: ${documentID}`);
  }

  // Get document chunks
  const chunksQuery = `
    SELECT chunk_content
    FROM chunks
    WHERE document_id = $1
    ORDER BY created_at;
  `;
  const chunksResult = await db.query<{ chunk_content: string }>(chunksQuery, [verifiedDocumentId]);

  return {
    chunkedContent: chunksResult.map(row => row.chunk_content),
    metadata: documentResult[0].metadata,
    title: documentResult[0].title
  };
}
