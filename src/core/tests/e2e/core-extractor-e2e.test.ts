// libs
import { describe, expect, test } from 'vitest';

// function to test
import { extractFromUrl } from '../../core-extractor.js';

describe('E2E extractFromUrl', async () => {
  test('E2E extractFromUrl', async () => {
    const result = await extractFromUrl({
      url: 'https://raw.githubusercontent.com/A-star-logic/memoire/refs/heads/main/src/files-parsing/tests/sampleFiles/test.txt',
    });
    expect(result).toEqual('text for tests\nand another line');
  });
});
