// libs
import { describe, expect, test, vi } from 'vitest';

// function to test
import { extractContent, extractFromUrl } from '../../core-extractor.js';

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

describe('extractContent', async () => {
  test('should extract content when document has URL property', async () => {
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

    const result = await extractContent({
      document: {
        documentID: 'test',
        url: 'https://example.com',
      },
    });

    expect(result).toEqual('test');
    expect(downloaderModule.downloadDocument).toHaveBeenCalledOnce();
    expect(parserModule.parseStream).toHaveBeenCalledOnce();
  });

  test('should extract content when document has content property', async () => {
    downloaderModule.downloadDocument = vi.fn();
    parserModule.parseStream = vi.fn();

    const result = await extractContent({
      document: {
        content: 'my test content',
        documentID: 'test',
      },
    });

    expect(result).toEqual('my test content');

    expect(downloaderModule.downloadDocument).not.toHaveBeenCalled();
    expect(parserModule.parseStream).not.toHaveBeenCalled();
  });

  test('should throw an error when document has neither url nor content properties', async () => {
    await expect(
      extractContent({
        // @ts-expect-error this is the behavior we want to test
        document: {
          documentID: 'test',
        },
      }),
    ).rejects.toThrow('Invalid document');
  });

  test('should throw an error when document has both url and content properties', async () => {
    await expect(
      extractContent({
        document: {
          content: 'my test content',
          documentID: 'test',
          url: 'https://example.com',
        },
      }),
    ).rejects.toThrow('Invalid document');
  });
});
