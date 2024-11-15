import mammoth from 'mammoth';

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
  // raw text
  if (filename.endsWith('.md')) {
    return true;
  }
  if (filename.endsWith('.txt')) {
    return true;
  }
  if (filename.endsWith('.csv')) {
    return true;
  }

  // OOXML
  // eslint-disable-next-line sonarjs/prefer-single-boolean-return
  if (filename.endsWith('.docx')) {
    return true;
  }

  return false;
}

/**
 * Extract the mime type from the document name
 * @param root named parameters
 * @param root.documentName the full url of the file with the file name
 * @returns the mime type
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function getMimeType({ documentName }: { documentName: string }) {
  if (documentName.endsWith('.md')) {
    return 'text/markdown';
  }
  if (documentName.endsWith('.txt')) {
    return 'text/plain';
  }
  if (documentName.endsWith('.csv')) {
    return 'text/csv';
  }
  if (documentName.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  throw new Error('Unsupported document type ' + documentName);
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

  const resolvedMimeType = mimeType ?? (await getMimeType({ documentName }));

  switch (resolvedMimeType) {
    // OOXML
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
      const result = await mammoth.extractRawText({
        buffer: binaryStream,
      });
      return result.value;
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
