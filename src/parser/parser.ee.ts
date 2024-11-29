// libs
import type { Unzipped } from 'fflate';
import { XMLParser } from 'fast-xml-parser';
import { unzip } from 'fflate';

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
      return parseDocx(binaryStream);
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
 * Filter files in the zip based on a list of substrings
 * @param zipFiles List of files in the zip
 * @param filterList List of substrings to filter the files
 * @returns The matched file or undefined
 */
function filterFiles(
  zipFiles: { [key: string]: Uint8Array },
  filterList: string[],
): Uint8Array | undefined {
  for (const fileName of Object.keys(zipFiles)) {
    if (
      filterList.some((filter) => {
        return fileName.includes(filter);
      })
    ) {
      return zipFiles[fileName];
    }
  }
  return undefined;
}

/**
 * Parse a .docx file and extract text content
 * @param buffer - The binary content of the .docx file
 * @returns Extracted text as a string
 */
async function parseDocx(buffer: Buffer): Promise<string> {
  const zipFiles: Unzipped = await new Promise((resolve, reject) => {
    unzip(new Uint8Array(buffer), (error, files) => {
      if (error) {
        reject(error);
      } else {
        resolve(files);
      }
    });
  });
  const mainDocument = filterFiles(zipFiles, ['word/document']);

  if (!mainDocument) {
    throw new Error('Invalid .docx file: No document file found');
  }

  const parser = new XMLParser({
    attributeNamePrefix: '@_',
    ignoreAttributes: false,
    removeNSPrefix: true,
  });
  const jsonContent = parser.parse(
    new TextDecoder('utf8').decode(mainDocument),
  ) as XMLNode;

  const extractedText = extractTextFromJson(jsonContent);
  return formatText(extractedText);
}

/**
 * Extract plain text from the parsed XML JSON object
 * @param node - The parsed JSON object from the XML content
 * @returns Extracted plain text with preserved newlines
 */
function extractTextFromJson(node: XMLNode): string {
  let text = '';

  /**
   * Recursive function to traverse nodes and extract text
   * @param node The current XML node
   */
  function traverse(node: XMLNode): void {
    if (Array.isArray(node)) {
      for (const child of node) {
        traverse(child);
      }
    } else if (typeof node === 'object') {
      const body = node.body;

      if (body && typeof body === 'object' && !Array.isArray(body)) {
        if ('p' in body) {
          const paragraphs = body.p;
          text += Array.isArray(paragraphs)
            ? parseParagraphs(paragraphs)
            : extractParagraphText(paragraphs) + '\n';
        }
      } else if ('p' in node) {
        const paragraphText = extractParagraphText(node.p);
        if (paragraphText.trim()) {
          text += paragraphText.trim() + '\n';
        }
      } else {
        for (const child of Object.values(node)) {
          traverse(child);
        }
      }
    }
  }

  traverse(node);
  return text.trim();
}

/**
 * Extract paragraphs as text from the given paragraph node(s)
 * @param paragraphs The paragraph node(s) to process
 * @returns Text extracted from all paragraphs
 */
function parseParagraphs(paragraphs: XMLNode[]): string {
  let fullText = '';
  for (const paragraph of paragraphs) {
    const paragraphText = extractParagraphText(paragraph);
    if (paragraphText.trim()) {
      fullText += (fullText ? '\n' : '') + paragraphText;
    }
  }
  return fullText.trim();
}

/**
 * Extract text from a single paragraph node
 * @param node The paragraph node
 * @returns Text content of the paragraph
 */
function extractParagraphText(node: XMLNode): string {
  let paragraphText = '';

  /**
   * Collect text recursively from a node
   * @param node The current node
   */
  function collectText(node: XMLNode): void {
    if (Array.isArray(node)) {
      for (const child of node) {
        collectText(child);
      }
    } else if (typeof node === 'object') {
      if ('t' in node) {
        const textContent = node.t;
        if (typeof textContent === 'string') {
          paragraphText = appendTextWithSpace(paragraphText, textContent);
        } else if (typeof textContent === 'object' && '#text' in textContent) {
          const text = textContent['#text'];
          if (typeof text === 'string') {
            paragraphText = appendTextWithSpace(paragraphText, text);
          }
        }
      } else {
        for (const child of Object.values(node)) {
          collectText(child);
        }
      }
    }
  }

  if (Array.isArray(node)) {
    for (const child of node) {
      collectText(child);
    }
  } else if (typeof node === 'object') {
    if ('r' in node) {
      collectText(node.r);
    } else if (Array.isArray(node.r)) {
      for (const run of node.r) {
        collectText(run);
      }
    }
  }

  if (!paragraphText.endsWith('\n')) {
    paragraphText += '\n';
  }

  return paragraphText.trim();
}

/**
 * Appends text to the paragraph, ensuring a space is added if necessary.
 * @param paragraphText The current paragraph text.
 * @param textContent The text to append (will be trimmed).
 * @returns The updated paragraph text.
 */
function appendTextWithSpace(
  paragraphText: string,
  textContent: string,
): string {
  textContent = textContent.trim();
  if (textContent.length === 0) return paragraphText;

  if (paragraphText.length > 0 && !paragraphText.endsWith(' ')) {
    paragraphText += ' ';
  }
  return paragraphText + textContent;
}

/**
 * Format text by fixing sentence terminations
 * @param text Extracted text
 * @returns Text with properly formatted sentences
 */
function formatText(text: string): string {
  const sentences = text.split('\n').filter((sentence) => {
    return sentence.trim() !== '';
  });

  const formattedSentences = sentences.map((sentence) => {
    const trimmed = sentence.trim();

    if (!/[!.?]$/.test(trimmed)) {
      return `${trimmed}.`;
    }

    return trimmed;
  });

  return formattedSentences.join('\n');
}

type XMLNode =
  | {
      [key: string]: XMLNode | XMLNode[];
    }
  | string
  | XMLNode[];
