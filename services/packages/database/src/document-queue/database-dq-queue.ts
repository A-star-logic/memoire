import { Value } from '@sinclair/typebox/value';
import { eq } from 'drizzle-orm';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { QueueItem } from './database-dq-queue-typebox-schema.js';
import { queueTable } from './database-dq-queue-database-schema.js';
import { QueueItemSchema } from './database-dq-queue-typebox-schema.js';
import { db as database } from './database-dq.js';

const isTestEnvironment = process.env.NODE_ENV === 'test';
export const BASE_FOLDER = isTestEnvironment ? '.testMemoire' : 'data';
const QUEUE_FILE_PATH = path.join(
  process.cwd(),
  BASE_FOLDER,
  'queue',
  'queue.json',
);

interface NodeJsErrorWithCode extends Error {
  code?: string;
}

/**
 * Verify the object matches the QueueItem interface.
 * @param object The object to check.
 * @returns A boolean indicating whether the object is a valid QueueItem.
 */
function isQueueItem(object: unknown): object is QueueItem {
  return Value.Check(QueueItemSchema, object);
}

let inMemoryQueue: QueueItem[] = [];

/**
 * Loads the queue from the disk into memory.
 * If file doesn't exist, we initialize an empty queue.
 */
export async function loadQueue(): Promise<void> {
  await ensureQueueFolder();
  try {
    const buffer = await fs.readFile(QUEUE_FILE_PATH);
    const content = buffer.toString('utf8');
    const parsed = JSON.parse(content) as unknown;

    if (!Array.isArray(parsed)) {
      throw new TypeError('Queue JSON is not an array.');
    }

    for (const item of parsed) {
      if (!isQueueItem(item)) {
        throw new Error(`Queue JSON has invalid item: ${JSON.stringify(item)}`);
      }
    }

    inMemoryQueue = parsed as QueueItem[];
  } catch (error: unknown) {
    if (error instanceof Error) {
      const nodeError = error as NodeJsErrorWithCode;
      if (nodeError.code === 'ENOENT') {
        inMemoryQueue = [];
        return;
      }
    }
    throw error;
  }
}

/**
 * Adds a new item to the end of the queue.
 * @param item The item to add.
 */
export async function queueAdd(item: QueueItem): Promise<void> {
  if (database) {
    await database.insert(queueTable).values({
      createdAt: item.createdAt,
      documentID: item.documentID,
    });
  } else {
    inMemoryQueue.push(item);
    await saveQueue();
  }
}

/**
 * Retrieves the next item from the queue (FIFO).
 * @returns The next QueueItem or undefined if the queue is empty.
 */
export async function queueGetNext(): Promise<QueueItem | undefined> {
  if (database) {
    const rows = await database
      .select({
        createdAt: queueTable.createdAt,
        documentID: queueTable.documentID,
        id: queueTable.id,
      })
      .from(queueTable)
      .orderBy(queueTable.createdAt)
      .limit(1);

    if (rows.length === 0) {
      return undefined;
    }

    const [row] = rows;
    await database.delete(queueTable).where(eq(queueTable.id, row.id));
    return {
      createdAt: row.createdAt,
      documentID: row.documentID,
    };
  } else {
    const item = inMemoryQueue.shift();
    await saveQueue();
    return item;
  }
}

/**
 * Saves the current in-memory queue to disk.
 */
export async function saveQueue(): Promise<void> {
  await ensureQueueFolder();
  const json = JSON.stringify(inMemoryQueue, undefined, 2);
  await fs.writeFile(QUEUE_FILE_PATH, json, 'utf8');
}

/**
 * Ensure the queue folder exists; create it if necessary.
 */
async function ensureQueueFolder(): Promise<void> {
  const directory = path.dirname(QUEUE_FILE_PATH);
  await fs.mkdir(directory, { recursive: true });
}
