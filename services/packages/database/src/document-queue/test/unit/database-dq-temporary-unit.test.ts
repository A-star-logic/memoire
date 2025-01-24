import fs from 'node:fs/promises';
import path from 'node:path';
import { beforeEach, describe, expect, type Mock, test, vi } from 'vitest';

vi.mock('node:fs/promises');

import {
  readTemporaryMetadata,
  readTemporaryText,
  storeTextAndMetadata,
} from '../../database-dq-temporary.js';

const fsPromises = fs;

describe('Database Temporary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('storeTextAndMetadata writes .txt and .json files with correct paths', async () => {
    const documentID = 'test-doc';
    const content = 'Hello, world!';
    const metadata = { foo: 'bar' };

    await storeTextAndMetadata({
      documentID,
      metadata,
      text: content,
    });

    expect(fsPromises.mkdir).toHaveBeenCalledTimes(1);
    expect(fsPromises.mkdir).toHaveBeenCalledWith(
      path.join(process.cwd(), '.testMemoire', 'temp'),
      { recursive: true },
    );

    expect(fsPromises.writeFile).toHaveBeenNthCalledWith(
      1,
      path.join(process.cwd(), '.testMemoire', 'temp', `${documentID}.txt`),
      content,
      'utf8',
    );

    expect(fsPromises.writeFile).toHaveBeenNthCalledWith(
      2,
      path.join(process.cwd(), '.testMemoire', 'temp', `${documentID}.json`),
      JSON.stringify(metadata, undefined, 2),
      'utf8',
    );
  });

  test('readTemporaryText reads the correct .txt file', async () => {
    const documentID = 'test-doc';
    const expectedPath = path.join(
      process.cwd(),
      '.testMemoire',
      'temp',
      `${documentID}.txt`,
    );

    (fsPromises.readFile as Mock).mockResolvedValue('fake text content');

    const text = await readTemporaryText({ documentID });

    expect(fsPromises.readFile).toHaveBeenCalledTimes(1);
    expect(fsPromises.readFile).toHaveBeenCalledWith(expectedPath, 'utf8');
    expect(text).toBe('fake text content');
  });

  test('readTemporaryMetadata reads the correct .json file and parses it as JSON', async () => {
    const documentID = 'test-doc';
    const expectedPath = path.join(
      process.cwd(),
      '.testMemoire',
      'temp',
      `${documentID}.json`,
    );

    (fsPromises.readFile as Mock).mockResolvedValue(
      Buffer.from(JSON.stringify({ foo: 123 })),
    );

    const metadata = await readTemporaryMetadata({ documentID });

    expect(fsPromises.readFile).toHaveBeenCalledTimes(1);
    expect(fsPromises.readFile).toHaveBeenCalledWith(expectedPath);
    expect(metadata).toEqual({ foo: 123 });
  });
});
