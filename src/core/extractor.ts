import axios from 'axios';
import mammoth from 'mammoth';

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
  const extension = url.split('.').pop();
  const fileType = extension?.split('?')[0];
  if (fileType === 'docx' || fileType === 'txt') {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const documentBuffer = Buffer.from(response.data);

    if (fileType === 'docx') {
      const result = await mammoth.extractRawText({
        buffer: documentBuffer,
      });
      return result.value;
    } else {
      return documentBuffer.toString('utf8');
    }
  } else {
    return 'file type not supported';
  }
}
