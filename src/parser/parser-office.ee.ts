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

    const extracted = { value: '' };
    recursiveXMLParsedExtract({
      extracted,
      source: parsed,
    });

    combinedText += `${formatText(extracted.value)}\n`;
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
  // find any newline character followed by one or more whitespace characters(https://regex101.com/r/2p0BGb/1)
  return text.replaceAll(/\n\s+/g, '\n').trim();
}

/**
 * Recursively extract text from parsed XML nodes and accumulate into `extracted`.
 * Handles paragraphs and headers separately to preserve newlines.
 * @param root named params
 * @param root.source an object or a list to extract text from
 * @param root.extracted an object holding the accumulated text
 * @param root.extracted.value an object holding the extracted text content
 */
function recursiveXMLParsedExtract({
  extracted,
  source,
}: {
  extracted: { value: string };
  source: null | XMLNode;
}): void {
  if (typeof source === 'object' && source !== null && !Array.isArray(source)) {
    // the xml parser will indicate text with #text, so we only need to seek those tags and concat them
    if (
      '#text' in source &&
      typeof source['#text'] === 'string' &&
      source['#text'].length > 0
    ) {
      const cleanedText = source['#text'].trim();
      extracted.value += (extracted.value ? ' ' : '') + cleanedText;
      return;
    }

    // there is an issue with this tag from MS office 2007 that contains text, although it's an ID
    if ('tableStyleId' in source) {
      return;
    }

    // if this is a p tag (microsoft & open formats) this indicate a paragraph.
    if ('p' in source) {
      const localExtracted = { value: '' };
      recursiveXMLParsedExtract({
        extracted: localExtracted,
        source: source.p,
      });
      if (localExtracted.value) {
        extracted.value +=
          (extracted.value ? ' ' : '') + localExtracted.value + '\n';
      }
      return;
    }

    // if this is a a h tag (open format), this indicate a header
    if ('h' in source) {
      const localExtracted = { value: '' };
      recursiveXMLParsedExtract({
        extracted: localExtracted,
        source: source.h,
      });
      if (localExtracted.value) {
        extracted.value +=
          (extracted.value ? ' ' : '') + localExtracted.value + '\n';
      }
      return;
    }

    // if there is no #text, dig deeper in the object
    const values = Object.values(source);
    for (const value of values) {
      recursiveXMLParsedExtract({ extracted, source: value });
    }

    return;
  }

  if (Array.isArray(source)) {
    const fragments: string[] = [];
    for (const listItem of source) {
      const localExtracted = { value: '' };
      recursiveXMLParsedExtract({
        extracted: localExtracted,
        source: listItem,
      });
      if (localExtracted.value) {
        fragments.push(localExtracted.value);
      }
    }

    let result = '';
    for (const [index, frag] of fragments.entries()) {
      if (index === 0) {
        result = frag;
      } else {
        result += result.endsWith('\n') ? frag : ' ' + frag;
      }
    }

    // remove all leading tabs and spaces(https://regex101.com/r/trdn9H/1)
    // remove all trailing tabs and spaces(https://regex101.com/r/I4exWU/1)
    // eslint-disable-next-line sonarjs/slow-regex
    result = result.replace(/^[\t ]+/, '').replace(/[\t ]+$/, '');

    if (result) {
      extracted.value += (extracted.value ? ' ' : '') + result;
    }
  }
}
