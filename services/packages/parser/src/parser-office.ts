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

  const combinedTexts: string[] = [];

  for (const content of Object.values(documents)) {
    const parsed = parser.parse(
      new TextDecoder('utf8').decode(content),
    ) as XMLNode;

    recursiveXMLParsedExtract({ accumulator: combinedTexts, source: parsed });

    combinedTexts.push('\n');
  }
  // remove extra spaces before line breaks(https://regex101.com/r/BMJTLr/1)
  return formatText(combinedTexts.join(' ').replaceAll(' \n', '\n'));
}

/**
 * Format extracted text to ensure proper spacing and line breaks
 * @param text The raw extracted text
 * @returns Formatted text
 */
function formatText(text: string): string {
  if (!text) return '';
  // find any newline character followed by one or more whitespace characters(https://regex101.com/r/2p0BGb/1)
  return text.replaceAll(/\n\s+/g, '\n').trim();
}

/**
 * This function takes an unknown source, and will recursively try to extract text from it.
 * @param root0 named params
 * @param root0.accumulator a string to concatenate with the result of this function.
 * @param root0.source an object or a list to extract text from.
 */
function recursiveXMLParsedExtract({
  accumulator,
  source,
}: {
  accumulator: string[];
  source: null | XMLNode;
}): void {
  if (source === null) {
    return;
  }

  if (typeof source === 'string') {
    const cleanedText = source.trim();
    if (cleanedText) {
      accumulator.push(cleanedText);
    }
    return;
  }

  // the xml parser will indicate text with #text, so we only need to seek those tags and concat them
  if (
    '#text' in source &&
    typeof source['#text'] === 'string' &&
    source['#text'].length > 0
  ) {
    const cleanedText = source['#text'].trim();
    if (cleanedText) accumulator.push(cleanedText);
    return;
  }

  // there is an issue with this tag from MS office 2007 that contains text, although it's an ID
  if ('tableStyleId' in source) {
    return;
  }

  // if this is a p tag (microsoft & open formats) this indicate a paragraph.
  if ('p' in source) {
    recursiveXMLParsedExtract({ accumulator, source: source.p });
    accumulator.push('\n');
    return;
  }

  // if this is a a h tag (open format), this indicate a header
  if ('h' in source) {
    recursiveXMLParsedExtract({ accumulator, source: source.h });
    accumulator.push('\n');
    return;
  }

  // if there is no #text, dig deeper in the object
  const values = Object.values(source);
  for (const value of values) {
    recursiveXMLParsedExtract({ accumulator, source: value });
  }
}
