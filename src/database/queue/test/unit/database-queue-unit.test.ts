import fs from 'node:fs/promises';
import path from 'node:path';
import { beforeEach, describe, expect, type Mock, test, vi } from 'vitest';

vi.mock('node:fs/promises');

import { loadQueue, queueAdd, queueGetNext } from '../../database-queue.js';

const fsPromises = fs;

/**
 * Creates an Error object with `code = 'ENOENT'` without using classes or Object.assign.
 * @param message The error message to describe the file not found condition.
 * @returns An Error object with a custom `code` property set to `'ENOENT'`.
 */
function createENOENTError(
  message = 'File not found',
): Error & { code: string } {
  const error = new Error(message);
  error.name = 'ENOENTError';
  (error as Error & { code: string }).code = 'ENOENT';
  return error as Error & { code: string };
}

describe('Database Queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('loadQueue will create an empty queue if the file does not exist (ENOENT)', async () => {
    (fsPromises.readFile as Mock).mockRejectedValueOnce(createENOENTError());

    await loadQueue();

    expect(fsPromises.readFile).toHaveBeenCalledTimes(1);
  });

  test('loadQueue will throw error if JSON is not an array', async () => {
    (fsPromises.readFile as Mock).mockResolvedValueOnce(
      Buffer.from(JSON.stringify({ not: 'an array' })),
    );
    await expect(loadQueue()).rejects.toThrow('Queue JSON is not an array.');
  });

  test('queueAdd will push item in memory and call saveQueue', async () => {
    await queueAdd({ createdAt: 123, documentID: 'doc-1' });

    expect(fsPromises.writeFile).toHaveBeenCalledTimes(1);
    const queuePath = path.join(process.cwd(), 'data', 'queue', 'queue.json');
    expect(fsPromises.writeFile).toHaveBeenCalledWith(
      queuePath,
      expect.any(String),
      'utf8',
    );
  });

  test('queueGetNext will shift item from the queue and call saveQueue', async () => {
    (fsPromises.readFile as Mock).mockResolvedValueOnce(
      Buffer.from(JSON.stringify([{ createdAt: 123, documentID: 'doc-1' }])),
    );
    await loadQueue();

    const item = await queueGetNext();
    expect(item).toEqual({ createdAt: 123, documentID: 'doc-1' });

    expect(fsPromises.writeFile).toHaveBeenCalled();
  });
});
