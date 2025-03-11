import { secureVerifyDocumentID } from '@astarlogic/services-utils/utils-security.js';
import { db } from '../utils/database.js';
import { getDrizzle, DrizzleDB } from '../utils/drizzle.js';
import { documents, chunks } from '../schema/schema.js';
import { eq } from 'drizzle-orm';

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
  const client = await db.getClient();

  try {
    // Delete from documents table - chunks will be deleted automatically due to CASCADE
    await getDrizzle(client)
      .delete(documents)
      .where(eq(documents.documentId, verifiedDocumentId));
  } finally {
    client.release();
  }
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
  const client = await db.getClient();

  try {
    // Use a transaction since we're modifying multiple tables
    const drizzle = getDrizzle(client);
    await drizzle.transaction(async (tx: DrizzleDB) => {
      // Insert/Update document
      await tx
        .insert(documents)
        .values({
          documentId: verifiedDocumentId,
          title: title || '', // Convert undefined to empty string as title is NOT NULL
          metadata: metadata as any, // Type assertion needed as metadata is a generic object
          updatedAt: new Date() // Update timestamp
        })
        .onConflictDoUpdate({
          target: documents.documentId,
          set: {
            title: title || '',
            metadata: metadata as any,
            updatedAt: new Date()
          }
        });

      // Delete existing chunks
      await tx
        .delete(chunks)
        .where(eq(chunks.documentId, verifiedDocumentId));

      // Insert new chunks
      if (chunkedContent.length > 0) {
        await tx
          .insert(chunks)
          .values(
            chunkedContent.map((chunk: { chunkText: string }) => ({
              documentId: verifiedDocumentId,
              chunkContent: chunk.chunkText
            }))
          );
      }
    });
  } catch (error) {
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
  const client = await db.getClient();

  try {
    const drizzle = getDrizzle(client);

    // Get document metadata
    const documentResult = await drizzle
      .select({
        title: documents.title,
        metadata: documents.metadata
      })
      .from(documents)
      .where(eq(documents.documentId, verifiedDocumentId));

    if (documentResult.length === 0) {
      throw new Error(`Document not found: ${documentID}`);
    }

    // Get document chunks
    const chunksResult = await drizzle
      .select({
        chunkContent: chunks.chunkContent
      })
      .from(chunks)
      .where(eq(chunks.documentId, verifiedDocumentId))
      .orderBy(chunks.createdAt);

    return {
      chunkedContent: chunksResult.map((row: { chunkContent: string }) => row.chunkContent),
      metadata: documentResult[0].metadata,
      title: documentResult[0].title
    };
  } finally {
    client.release();
  }
}
