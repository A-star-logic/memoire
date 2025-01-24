// schemas
import type {
  DocumentLinkBody,
  IngestRawBody,
} from '@astarlogic/shared/schemas/memoire/api-schemas.js';

// libs
import { errorReport } from '@astarlogic/services-database/reporting';
import { parseStream } from '@astarlogic/services-parser';
import axios from 'axios'; // TODO: replace by ofetch

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

/**
 * Download a document from the URL
 * @param root named parameters
 * @param root.url the url to the document to download
 * @returns a binary buffer
 */
async function downloadDocument({ url }: { url: string }): Promise<Buffer> {
  try {
    const response = await axios({
      method: 'GET',
      responseType: 'arraybuffer',
      url,
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- we have to assume it is safe
    return Buffer.from(response.data, 'binary');
  } catch (error) {
    await errorReport({
      error,
      message: 'Failed to download document',
    });
    throw new Error('Failed to download document at ' + url);
  }
}
