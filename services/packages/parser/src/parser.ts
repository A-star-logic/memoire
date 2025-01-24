import { extractOfficeDocument } from './parser-office.js';
import { unzipDocument } from './parser-unzip.js';

/**
 * Check if the file is supported
 * @param root named parameters
 * @param root.filename the full url of the file with the file name
 * @returns boolean
 */
export async function isFileSupported({
  filename,
}: {
  filename: string;
}): Promise<boolean> {
  // Open Office XML
  if (filename.endsWith('odp')) {
    return true;
  }
  if (filename.endsWith('ods')) {
    return true;
  }
  if (filename.endsWith('.odt')) {
    return true;
  }

  // OOXML
  if (filename.endsWith('.pptx')) {
    return true;
  }
  if (filename.endsWith('xlsx')) {
    return true;
  }
  if (filename.endsWith('.docx')) {
    return true;
  }

  // raw text
  if (filename.endsWith('.csv')) {
    return true;
  }
  if (filename.endsWith('.md')) {
    return true;
  }
  // eslint-disable-next-line sonarjs/prefer-single-boolean-return -- better DX
  if (filename.endsWith('.txt')) {
    return true;
  }

  return false;
}

/**
 * Parse a binary stream
 * @param root named parameters
 * @param root.binaryStream a binary stream of a downloaded document
 * @param root.documentName the full url of the file with the file name
 * @param root.mimeType (optional) the mime type of the document
 * @returns the content of the document
 */
export async function parseStream({
  binaryStream,
  documentName,
  mimeType,
}: {
  binaryStream: Buffer;
  documentName: string;
  mimeType: string | undefined;
}): Promise<string> {
  if (!mimeType && !(await isFileSupported({ filename: documentName }))) {
    throw new Error('Unsupported document type' + documentName);
  }

  const resolvedMimeType =
    mimeType === 'application/octet-stream' || !mimeType
      ? await getMimeType({ documentName })
      : mimeType;

  switch (resolvedMimeType) {
    // Open Office XML
    case 'application/vnd.oasis.opendocument.presentation':
    case 'application/vnd.oasis.opendocument.spreadsheet':
    case 'application/vnd.oasis.opendocument.text': {
      const mainDocument = await unzipDocument(
        binaryStream,
        ['content'],
        'Open format document',
      );
      return extractOfficeDocument(mainDocument);
    }

    // OOXML
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
      const mainDocument = await unzipDocument(
        binaryStream,
        ['ppt/slides/slide'],
        'PowerPoint',
      );
      return extractOfficeDocument(mainDocument);
    }
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
      const mainDocument = await unzipDocument(
        binaryStream,
        ['xl/sharedStrings'],
        'Excel',
      );
      return extractOfficeDocument(mainDocument);
    }

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
      const mainDocument = await unzipDocument(
        binaryStream,
        ['word/document'],
        'Word',
      );
      return extractOfficeDocument(mainDocument);
    }

    // raw text
    case 'text/csv':
    case 'text/markdown':
    case 'text/plain': {
      return binaryStream.toString('utf8');
    }

    default: {
      throw new Error('Unsupported document type');
    }
  }
}

/**
 * Extract the mime type from the document name
 * @param root named parameters
 * @param root.documentName the full url of the file with the file name
 * @returns the mime type
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- better DX
async function getMimeType({ documentName }: { documentName: string }) {
  if (documentName.endsWith('odp')) {
    return 'application/vnd.oasis.opendocument.presentation';
  }
  if (documentName.endsWith('.ods')) {
    return 'application/vnd.oasis.opendocument.spreadsheet';
  }
  if (documentName.endsWith('.odt')) {
    return 'application/vnd.oasis.opendocument.text';
  }
  if (documentName.endsWith('.pptx')) {
    return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  }
  if (documentName.endsWith('xlsx')) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  if (documentName.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (documentName.endsWith('.csv')) {
    return 'text/csv';
  }
  if (documentName.endsWith('.md')) {
    return 'text/markdown';
  }
  if (documentName.endsWith('.txt')) {
    return 'text/plain';
  }
  throw new Error('Unsupported document type ' + documentName);
}
