// utils
import { downloadDocument } from '../utils/utils-downloader.js';

// parser
import { parseStream } from '../parser/parser.ee.js';

/**
 * Download a document from the given url
 * @param root named parameters
 * @param root.url the presigned url of the document to download
 * @returns the content of the document
 */
export async function extractFromUrl({
  url,
}: {
  url: string;
}): Promise<string> {
  const buffer = await downloadDocument({ url });
  const content = await parseStream({
    binaryStream: buffer,
    documentName: url,
    mimeType: undefined,
  });
  return content;
}
