// database
import {
  getNextDocumentToProcess,
  saveDocumentForLaterProcessing,
} from '@astarlogic/services-database/document-queue';

/**
 * Process the documents from the document queue
 */
export async function processDocumentQueue(): Promise<void> {
  await getNextDocumentToProcess();
  // todo finish the implementation
}

/**
 * Prepares a document for later processing.
 * @param documentID A unique string identifier for the document.
 * @param text The document content (plain text or raw text).
 * @param metadata Arbitrary metadata to store alongside the document.
 */
export async function saveDocumentToDocumentQueue(
  documentID: string,
  text: string,
  metadata: object,
): Promise<void> {
  await saveDocumentForLaterProcessing({ documentID, metadata, text });
}
