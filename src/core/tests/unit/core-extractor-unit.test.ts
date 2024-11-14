// libs
import { describe, expect, test, vi } from 'vitest';

// function to test
import { extractFromUrl } from '../../core-extractor.js';

// mocks
vi.mock('../../../utils/utils-downloader.js');
const downloaderModule = await import('../../../utils/utils-downloader.js');
vi.mock('../../../parser/parser.ee.js');
const parserModule = await import('../../../parser/parser.ee.js');

describe('extractFromUrl', async () => {
  test('extractFromUrl will download the document and call the file parser', async () => {
    downloaderModule.downloadDocument = vi
      .fn()
      .mockResolvedValue(
        Buffer.from('test') satisfies Awaited<
          ReturnType<typeof downloaderModule.downloadDocument>
        >,
      );
    parserModule.parseStream = vi
      .fn()
      .mockResolvedValue(
        'test' satisfies Awaited<ReturnType<typeof parserModule.parseStream>>,
      );

    const result = await extractFromUrl({ url: 'example.docx' });

    expect(result).toEqual('test');
    expect(downloaderModule.downloadDocument).toHaveBeenCalledOnce();
    expect(parserModule.parseStream).toHaveBeenCalledOnce();
  });
});
