import axios from 'axios';
import { errorReport } from '../database/reporting/database-interface-reporting.ee.js';

/**
 * Download a document from the URL
 * @param root named parameters
 * @param root.url the url to the document to download
 * @returns a binary buffer
 */
export async function downloadDocument({
  url,
}: {
  url: string;
}): Promise<Buffer> {
  try {
    const response = await axios({
      method: 'GET',
      responseType: 'arraybuffer',
      url,
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return Buffer.from(response.data, 'binary');
  } catch (error) {
    await errorReport({
      error,
      message: 'Failed to download document',
    });
    throw new Error('Failed to download document at ' + url);
  }
}
