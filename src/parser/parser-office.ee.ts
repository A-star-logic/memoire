import { XMLParser } from 'fast-xml-parser';

type XMLNode =
  | string
  | XMLNode[]
  | {
      [key: string]: XMLNode | XMLNode[];
    };

/**
 * Parse a document file and extract text content
 * @param documents All required documents
 * @returns Extracted text as a string
 */
export function extractOfficeDocument(documents: {
  [key: string]: Uint8Array;
}): string {
  const parser = new XMLParser({
    alwaysCreateTextNode: true,
    ignoreAttributes: true,
    preserveOrder: true,
    removeNSPrefix: true,
  });

  let combinedText = '';

  for (const content of Object.values(documents)) {
    const parsed = parser.parse(
      new TextDecoder('utf8').decode(content),
    ) as XMLNode;

    const extractedText = recursiveXMLParsedExtract(parsed, '');
    combinedText += `${formatText(extractedText)}\n`;
  }

  return combinedText.trim();
}

/**
 * Format extracted text to ensure proper spacing and line breaks
 * @param text The raw extracted text
 * @returns Formatted text
 */
function formatText(text: string): string {
  if (!text) return '';
  return text.replaceAll(/\n\s+/g, '\n').trim();
}

/**
 * This function takes an unknown source, and will recursively try to extract text from it.
 * @param source an object or a list to extract text from.
 * @param extracted a string to concatenate with the result of this function.
 * @returns the extracted text as a concatenated string.
 */
function recursiveXMLParsedExtract(
  source: null | XMLNode,
  extracted = '',
): string {
  if (source === null) {
    return extracted;
  }

  if (typeof source === 'string') {
    const cleanedText = source.trim();
    return extracted + (extracted && cleanedText ? ' ' : '') + cleanedText;
  }

  // the xml parser will indicate text with #text, so we only need to seek those tags and concat them
  if (
    '#text' in source &&
    typeof source['#text'] === 'string' &&
    source['#text'].length > 0
  ) {
    const cleanedText = source['#text'].trim();
    extracted += (extracted ? ' ' : '') + cleanedText;
    return extracted;
  }

  // there is an issue with this tag from MS office 2007 that contains text, although it's an ID
  if ('tableStyleId' in source) {
    return extracted;
  }

  // if this is a p tag (microsoft & open formats) this indicate a paragraph.
  if ('p' in source) {
    extracted = recursiveXMLParsedExtract(source.p, extracted);
    if (extracted.length > 0) {
      extracted = extracted.trim() + '\n';
    }
    return extracted;
  }

  // if this is a a h tag (open format), this indicate a header
  if ('h' in source) {
    extracted = recursiveXMLParsedExtract(source.h, extracted);
    if (extracted.length > 0) {
      extracted = extracted.trim() + '\n';
    }
    return extracted;
  }

  // if there is no #text, dig deeper in the object
  const values = Object.values(source);
  for (const value of values) {
    extracted = recursiveXMLParsedExtract(value, extracted);
  }

  return extracted;
}
