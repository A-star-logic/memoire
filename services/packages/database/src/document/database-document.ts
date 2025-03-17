import { eq } from 'drizzle-orm';
import type { Document, DocumentInsert } from './database-document-schemas.js';
import { pgDatabase } from '../database-config/database-postgresql.js';
import { documentsTable } from './database-document-schemas.js';

/**
 * delete a document by ID
 * @param root named parameters
 * @param root.documentID the document ID
 */
export async function deleteDocumentInDatabase({
  documentID,
}: {
  documentID: string;
}): Promise<void> {
  await pgDatabase
    .delete(documentsTable)
    .where(eq(documentsTable.documentID, documentID));
}

/**
 * get a document by ID
 * @param root named parameters
 * @param root.documentID the document ID
 * @returns the document or undefined if it does not exist
 */
export async function getDocumentByID({
  documentID,
}: {
  documentID: string;
}): Promise<Document | undefined> {
  const records = await pgDatabase
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.documentID, documentID));

  return records[0];
}

/**
 * Insert a document into the database
 * @param root named parameters
 * @param root.documentID the document ID
 * @param root.metadata the metadata of the document
 * @param root.title the title of the document
 */
export async function insertDocumentInDatabase({
  documentID,
  metadata,
  title,
}: DocumentInsert): Promise<void> {
  await pgDatabase.insert(documentsTable).values({
    documentID,
    metadata,
    title,
  });
}

/**
 * update a document by ID
 * @param root named parameters
 * @param root.documentID the document ID
 * @param root.metadata the metadata of the document
 * @param root.status the status of the document
 * @param root.title the title of the document
 */
export async function updateDocumentInDatabase({
  documentID,
  metadata,
  status,
  title,
}: {
  documentID: string;
  metadata?: Document['metadata'];
  status?: Document['status'];
  title?: Document['title'];
}): Promise<void> {
  await pgDatabase
    .update(documentsTable)
    .set({ metadata, status, title })
    .where(eq(documentsTable.documentID, documentID));
}
