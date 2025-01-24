import fs from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import {
  getNextDocumentToProcess,
  saveDocumentForLaterProcessing,
} from '../../database-dq-interface.js';
import { loadQueue, saveQueue } from '../../database-dq-queue.js';
import {
  readTemporaryMetadata,
  readTemporaryText,
} from '../../database-dq-temporary.js';

const TEST_BASE_FOLDER = path.join(process.cwd(), '.testMemoire');

const TEMP_PATH = path.join(TEST_BASE_FOLDER, 'temp');
const QUEUE_PATH = path.join(TEST_BASE_FOLDER, 'queue');

describe('Document queue Integration Tests', () => {
  beforeAll(async () => {
    await fs.mkdir(TEMP_PATH, { recursive: true });
    await fs.mkdir(QUEUE_PATH, { recursive: true });

    await loadQueue();
  });

  afterAll(async () => {
    await saveQueue();

    await fs.rm(TEST_BASE_FOLDER, { force: true, recursive: true });
  });

  test('Add one document and retrieve it from the queue', async () => {
    const documentID = 'int-doc-1';
    const text = 'Integration test content';
    const metadata = { meta: 'integration' };

    await saveDocumentForLaterProcessing({ documentID, metadata, text });

    const storedText = await readTemporaryText({ documentID });
    const storedMetadata = await readTemporaryMetadata({ documentID });

    expect(storedText).toBe(text);
    expect(storedMetadata).toEqual(metadata);

    const nextItem = await getNextDocumentToProcess();
    expect(nextItem).toBeDefined();
    if (!nextItem) return;

    expect(nextItem.documentID).toBe(documentID);
    expect(nextItem.text).toBe(text);
    expect(nextItem.metadata).toEqual(metadata);

    const noItemLeft = await getNextDocumentToProcess();
    expect(noItemLeft).toBeUndefined();
  });

  test('Add multiple items, retrieve them in FIFO order', async () => {
    await saveDocumentForLaterProcessing({
      documentID: 'fifo-doc-1',
      metadata: { a: 1 },
      text: 'hello 1',
    });
    await saveDocumentForLaterProcessing({
      documentID: 'fifo-doc-2',
      metadata: { b: 2 },
      text: 'hello 2',
    });

    const first = await getNextDocumentToProcess();
    expect(first?.documentID).toBe('fifo-doc-1');

    const second = await getNextDocumentToProcess();
    expect(second?.documentID).toBe('fifo-doc-2');

    const third = await getNextDocumentToProcess();
    expect(third).toBeUndefined();
  });
});
