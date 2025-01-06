// schemas
import type {
  DocumentLinkBody,
  IngestRawBody,
} from '../api/search/api-search-schemas.js';

// parser
import { parseStream } from '../parser/parser.ee.js';
// utils
import { downloadDocument } from '../utils/utils-downloader.js';

/**
 * Dispatch the document to the correct extractor depending on the API body shape
 * @param root named parameters
 * @param root.document the document from the request body
 * @returns string: the content of the document as a string
 */
export async function extractContent({
  document,
}: {
  document:
    | DocumentLinkBody['documents'][number]
    | IngestRawBody['documents'][number];
}): Promise<string> {
  if ('url' in document && 'content' in document) {
    throw new Error('Invalid document');
  }

  if ('url' in document) {
    return extractFromUrl({ url: document.url });
  }
  if ('content' in document) {
    return document.content;
  }

  throw new Error('Invalid document');
}

/**
 * Download a document from the given url.
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
