import { secureVerifyDocumentID } from '@astarlogic/services-utils/utils-security.js';
import { readFile, unlink } from 'node:fs/promises';

import { pgDatabase } from '../postgresql-config/database-postgresql.js';
import { documentsTable } from './database-search-schemas.js';

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
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- the ID is verified
    await unlink(
      `.memoire/sources/${await secureVerifyDocumentID({ documentID })}.json`,
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('ENOENT')) {
      return;
    }
    throw error;
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
  // Save to database
  await pgDatabase.insert(documentsTable).values({
    documentId: documentID,
    metadata,
    title,
  });
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
  return JSON.parse(
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- the ID is verified
    await readFile(`.memoire/sources/${documentID}.json`, { encoding: 'utf8' }),
  ) as SourceDocument;
}
