import fs from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import {
  loadQueue,
  saveQueue,
} from '../../../database/queue/database-queue.js';
import {
  readTemporaryMetadata,
  readTemporaryText,
} from '../../../database/temp/database-temporary.js';
import {
  addItemForLaterProcessing,
  getNextItemToProcess,
} from '../../core-upload-queue.js';

const TEST_BASE_FOLDER = path.join(process.cwd(), '.testMemoire');

const TEMP_PATH = path.join(TEST_BASE_FOLDER, 'temp');
const QUEUE_PATH = path.join(TEST_BASE_FOLDER, 'queue');

describe('Upload Queue Integration Tests', () => {
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
    const documentId = 'int-doc-1';
    const text = 'Integration test content';
    const metadata = { meta: 'integration' };

    await addItemForLaterProcessing(documentId, text, metadata);

    const storedText = await readTemporaryText(documentId);
    const storedMetadata = await readTemporaryMetadata(documentId);

    expect(storedText).toBe(text);
    expect(storedMetadata).toEqual(metadata);

    const nextItem = await getNextItemToProcess();
    expect(nextItem).toBeDefined();
    if (!nextItem) return;

    expect(nextItem.documentID).toBe(documentId);
    expect(nextItem.text).toBe(text);
    expect(nextItem.metadata).toEqual(metadata);

    const noItemLeft = await getNextItemToProcess();
    expect(noItemLeft).toBeUndefined();
  });

  test('Add multiple items, retrieve them in FIFO order', async () => {
    await addItemForLaterProcessing('fifo-doc-1', 'hello 1', { a: 1 });
    await addItemForLaterProcessing('fifo-doc-2', 'hello 2', { b: 2 });

    const first = await getNextItemToProcess();
    expect(first?.documentID).toBe('fifo-doc-1');

    const second = await getNextItemToProcess();
    expect(second?.documentID).toBe('fifo-doc-2');

    const third = await getNextItemToProcess();
    expect(third).toBeUndefined();
  });
});
