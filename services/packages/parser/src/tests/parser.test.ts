// libs
import { describe, expect, test } from 'vitest';

// functions to test
import { parseStream } from '../parser.js';

describe('parseStream', async () => {
  test('parseStream reject unknown documents', async () => {
    await expect(async () => {
      await parseStream({
        binaryStream: Buffer.from('test'),
        documentName: 'example',
        mimeType: 'undefined',
      });
    }).rejects.toThrow('Unsupported document type');
  });
  test('parseStream reject unknown documents with no mime type', async () => {
    await expect(async () => {
      await parseStream({
        binaryStream: Buffer.from('test'),
        documentName: 'example',
        mimeType: undefined,
      });
    }).rejects.toThrow('Unsupported document type');
  });
});
