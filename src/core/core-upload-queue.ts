import type { QueueItem } from '../database/queue/database-queue.js';
import { queueAdd, queueGetNext } from '../database/queue/database-queue.js';

import {
  readTemporaryMetadata,
  readTemporaryText,
  storeTextAndMetadata,
} from '../database/temp/database-temporary.js';

/**
 * Prepares a document for later processing.
 * @param documentID A unique string identifier for the document.
 * @param text The document content (plain text or raw text).
 * @param metadata Arbitrary metadata to store alongside the document.
 */
export async function addItemForLaterProcessing(
  documentID: string,
  text: string,
  metadata: unknown,
): Promise<void> {
  await storeTextAndMetadata(documentID, text, metadata);

  const queueItem: QueueItem = {
    createdAt: Date.now(),
    documentID,
  };

  await queueAdd(queueItem);
}

/**
 * Retrieves the next item from the queue (FIFO)
 * @returns An object containing the document ID, text, and metadata or undefined if the queue is empty.
 */
export async function getNextItemToProcess(): Promise<
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
    readTemporaryText(item.documentID),
    readTemporaryMetadata(item.documentID),
  ]);

  return {
    documentID: item.documentID,
    metadata: documentMetadata,
    text: documentText,
  };
}
