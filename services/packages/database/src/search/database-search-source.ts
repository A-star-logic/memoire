import { sql } from 'drizzle-orm';
import type { Document } from '../schema/documents.js';
import { getDatabaseClient } from '../client/database-client.js';
import { documents } from '../schema/documents.js';

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
  const database = getDatabaseClient();

  try {
    await database
      .delete(documents)
      .where(sql`${documents.documentId} = ${documentID}`);
  } catch (error) {
    throw new Error(
      `Failed to delete document: ${error instanceof Error ? error.message : String(error)}`,
    );
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
    try {
      documents[documentID] = await loadSourceDocument({ documentID });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('Document not found')
      ) {
        continue;
      }
      throw error;
    }
  }
  return documents;
}

/**
 * Save the source document to PostgreSQL
 * @param root named parameters
 * @param root.content the content of the document
 * @param root.documentID the document ID
 * @param root.metadata the metadata of the document
 * @param root.title the document title
 */
export async function saveSourceDocument({
  content,
  documentID,
  metadata,
  title,
}: {
  content: string;
  documentID: string;
  metadata: object;
  title: string | undefined;
}): Promise<void> {
  const database = getDatabaseClient();

  const combinedContent = title ? `${title}\n\n${content}` : content;

  try {
    await database
      .insert(documents)
      .values({
        content: combinedContent,
        documentId: documentID,
        metadata: metadata,
        title: title ?? undefined,
      })
      .onConflictDoUpdate({
        set: {
          content: combinedContent,
          metadata: metadata,
          title: title ?? undefined,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
        target: documents.documentId,
      });
  } catch (error) {
    throw new Error(
      `Failed to save document: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Load the source document from PostgreSQL
 * @param root named parameters
 * @param root.documentID the document ID
 * @returns The source document
 */
async function loadSourceDocument({
  documentID,
}: {
  documentID: string;
}): Promise<SourceDocument> {
  const database = getDatabaseClient();
  const result = await database
    .select()
    .from(documents)
    .where(sql`${documents.documentId} = ${documentID}`);

  if (result.length === 0) {
    throw new Error(`Document not found: ${documentID}`);
  }

  const document = result[0] as Document;

  return {
    chunkedContent: [], // replace with content from the chunks table
    metadata: document.metadata as object,
    title: document.title ?? undefined,
  };
}
