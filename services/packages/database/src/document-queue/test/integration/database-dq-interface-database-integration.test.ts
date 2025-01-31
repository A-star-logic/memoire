import fs from 'node:fs/promises';
import path from 'node:path';
import { afterAll, describe, expect, test } from 'vitest';
import {
  getNextDocumentToProcess,
  saveDocumentForLaterProcessing,
} from '../../database-dq-interface.js';

const TEST_MEMOIRE_PATH = path.join(process.cwd(), '.testMemoire');

describe('Queue integration test (remote Supabase)', () => {
  afterAll(async () => {
    await fs.rm(TEST_MEMOIRE_PATH, { force: true, recursive: true });
  });

  test('Add and retrieve item from remote DB queue', async () => {
    await saveDocumentForLaterProcessing({
      documentID: 'remote-test-doc',
      metadata: { db: 'supabase' },
      text: 'Hello from remote supabase!',
    });

    const nextItem = await getNextDocumentToProcess();
    expect(nextItem).toBeDefined();
    if (!nextItem) return;

    expect(nextItem.documentID).toBe('remote-test-doc');
    expect(nextItem.metadata).toEqual({ db: 'supabase' });
    expect(nextItem.text).toBe('Hello from remote supabase!');
  });
});
