import fs from 'node:fs/promises';
import path from 'node:path';
import { beforeEach, describe, expect, type Mock, test, vi } from 'vitest';

vi.mock('node:fs/promises');

import {
  readTemporaryMetadata,
  readTemporaryText,
  storeTextAndMetadata,
} from '../../database-temporary.js';

const fsPromises = fs;

describe('Database Temporary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('storeTextAndMetadata writes .txt and .json files with correct paths', async () => {
    const documentId = 'test-doc';
    const content = 'Hello, world!';
    const metadata = { foo: 'bar' };

    await storeTextAndMetadata(documentId, content, metadata);

    expect(fsPromises.mkdir).toHaveBeenCalledTimes(1);
    expect(fsPromises.mkdir).toHaveBeenCalledWith(
      path.join(process.cwd(), 'data', 'temp'),
      { recursive: true },
    );

    expect(fsPromises.writeFile).toHaveBeenNthCalledWith(
      1,
      path.join(process.cwd(), 'data', 'temp', `${documentId}.txt`),
      content,
      'utf8',
    );

    expect(fsPromises.writeFile).toHaveBeenNthCalledWith(
      2,
      path.join(process.cwd(), 'data', 'temp', `${documentId}.json`),
      JSON.stringify(metadata, undefined, 2),
      'utf8',
    );
  });

  test('readTemporaryText reads the correct .txt file', async () => {
    const documentId = 'test-doc';
    const expectedPath = path.join(
      process.cwd(),
      'data',
      'temp',
      `${documentId}.txt`,
    );

    (fsPromises.readFile as Mock).mockResolvedValue('fake text content');

    const text = await readTemporaryText(documentId);

    expect(fsPromises.readFile).toHaveBeenCalledTimes(1);
    expect(fsPromises.readFile).toHaveBeenCalledWith(expectedPath, 'utf8');
    expect(text).toBe('fake text content');
  });

  test('readTemporaryMetadata reads the correct .json file and parses it as JSON', async () => {
    const documentId = 'test-doc';
    const expectedPath = path.join(
      process.cwd(),
      'data',
      'temp',
      `${documentId}.json`,
    );

    (fsPromises.readFile as Mock).mockResolvedValue(
      Buffer.from(JSON.stringify({ foo: 123 })),
    );

    const metadata = await readTemporaryMetadata(documentId);

    expect(fsPromises.readFile).toHaveBeenCalledTimes(1);
    expect(fsPromises.readFile).toHaveBeenCalledWith(expectedPath);
    expect(metadata).toEqual({ foo: 123 });
  });
});
