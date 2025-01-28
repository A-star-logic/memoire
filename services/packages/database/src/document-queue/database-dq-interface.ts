import type { QueueItem } from './database-dq-queue.js';
import { queueAdd, queueGetNext } from './database-dq-queue.js';
import {
  readTemporaryMetadata,
  readTemporaryText,
  storeTextAndMetadata,
} from './database-dq-temporary.js';

/**
 * Retrieves the next document from the queue for processing.
 * @returns An object containing the document and its information or undefined if the queue is empty.
 */
export async function getNextDocumentToProcess(): Promise<
  | undefined
  | {
      documentID: string;
      metadata: unknown;
      text: string;
    }
> {
  const item = await queueGetNext();
  if (!item) {
    return undefined;
  }

  const [documentText, documentMetadata] = await Promise.all([
    readTemporaryText({ documentID: item.documentID }),
    readTemporaryMetadata({ documentID: item.documentID }),
  ]);

  return {
    documentID: item.documentID,
    metadata: documentMetadata,
    text: documentText,
    // todo: mirror the data required by the parser
  };
}

/**
 * Adds a document to the queue for later processing.
 * @param root named parameters
 * @param root.documentID A unique string identifier for the document.
 * @param root.text The document content (plain text or raw text).
 * @param root.metadata Arbitrary metadata to store alongside the document.
 */
export async function saveDocumentForLaterProcessing({
  documentID,
  metadata,
  text,
}: {
  documentID: string;
  metadata: object;
  text: string;
}): Promise<void> {
  await storeTextAndMetadata({ documentID, metadata, text });

  const queueItem: QueueItem = {
    createdAt: Date.now(),
    documentID,
  };

  await queueAdd(queueItem);
}
