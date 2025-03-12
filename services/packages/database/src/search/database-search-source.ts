import { secureVerifyDocumentID } from '@astarlogic/services-utils/utils-security.js';
import { asc, eq } from 'drizzle-orm';
import { pgDatabase } from '../postgresql-config/database-postgresql.js';
import {
  chunksTable,
  contentsTable,
  documentsTable,
} from './database-search-schemas.js';

interface ChunkContent {
  chunkText: string;
}

interface SourceDocument {
  chunkedContent: ChunkContent[];
  metadata: { [key: string]: unknown };
  title: string | undefined;
}

/**
 * Delete a document and its related data from all tables
 * @param root named parameters
 * @param root.documentID the document ID
 */
export async function deleteSourceDocument({
  documentID,
}: {
  documentID: string;
}): Promise<void> {
  const verifiedID = await secureVerifyDocumentID({ documentID });

  // Delete from contents table
  await pgDatabase
    .delete(contentsTable)
    .where(eq(contentsTable.documentId, verifiedID));

  // Delete from chunks table
  await pgDatabase
    .delete(chunksTable)
    .where(eq(chunksTable.documentID, verifiedID));

  // Delete from documents table
  await pgDatabase
    .delete(documentsTable)
    .where(eq(documentsTable.documentId, verifiedID));
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
    await Promise.all(
      searchResults.map(async (result) => {
        const verifiedID = await secureVerifyDocumentID({
          documentID: result.documentID,
        });
        return verifiedID;
      }),
    ),
  );
  const documents: Awaited<ReturnType<typeof getSourceDocuments>> = {};
  for (const documentID of uniqueDocumentIDs) {
    documents[documentID] = await loadSourceDocument({ documentID });
  }
  return documents;
}

/**
 * Save the document content to the database
 * @param root named parameters
 * @param root.documentID the document ID
 * @param root.content the document content
 */
export async function saveDocumentContent({
  content,
  documentID,
}: {
  content: string;
  documentID: string;
}): Promise<void> {
  const verifiedID = await secureVerifyDocumentID({ documentID });

  await pgDatabase.insert(contentsTable).values({
    content,
    documentId: verifiedID,
  });
}

/**
 * Save the source document to the database
 * @param root named parameters
 * @param root.documentID the document ID
 * @param root.metadata the metadata of the document
 * @param root.title the document title
 */
export async function saveSourceDocument({
  documentID,
  metadata,
  title,
}: {
  documentID: string;
  metadata: object;
  title: string | undefined;
}): Promise<void> {
  const verifiedID = await secureVerifyDocumentID({ documentID });

  // Save to database
  await pgDatabase.insert(documentsTable).values({
    documentId: verifiedID,
    metadata,
    title,
  });
}

/**
 * Load the source document from database
 * @param root named parameters
 * @param root.documentID the document ID
 * @returns The source document
 */
async function loadSourceDocument({
  documentID,
}: {
  documentID: string;
}): Promise<SourceDocument> {
  const verifiedID = await secureVerifyDocumentID({ documentID });

  const chunks = await pgDatabase
    .select({
      chunkText: chunksTable.chunkContent,
    })
    .from(chunksTable)
    .where(eq(chunksTable.documentID, verifiedID))
    .orderBy(asc(chunksTable.chunkID));

  const document = await pgDatabase
    .select({
      metadata: documentsTable.metadata,
      title: documentsTable.title,
    })
    .from(documentsTable)
    .where(eq(documentsTable.documentId, verifiedID))
    .limit(1)
    .then((results) => {
      const document = results[0];

      // Drizzle-orm guarantees that document will be defined if found
      if (results.length === 0) {
        throw new Error(`Document ${verifiedID} not found in database`);
      }
      return document;
    });

  return {
    chunkedContent: chunks.map((chunk): ChunkContent => {
      return {
        chunkText: chunk.chunkText,
      };
    }),
    metadata: document.metadata as { [key: string]: unknown },
    title: document.title ?? undefined,
  };
}
