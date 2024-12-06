import { XMLParser } from 'fast-xml-parser';

/**
 * Parse a document file and extract text content
 * @param documents All required documents
 * @returns Extracted text as a string
 */
export async function extractOfficeDocument(documents: {
  [key: string]: Uint8Array;
}): Promise<string> {
  const parser = new XMLParser({
    alwaysCreateTextNode: true,
    ignoreAttributes: true,
    preserveOrder: true,
    removeNSPrefix: true,
  });

  let combinedText = '';

  for (const [, content] of Object.entries(documents)) {
    const parsed = parser.parse(
      new TextDecoder('utf8').decode(content),
    ) as XMLNode;

    const extractedText = await recursiveXMLParsedExtract({
      source: parsed,
      text: '',
    });

    combinedText += `${formatText(extractedText)}\n`;
  }

  return combinedText.trim();
}

/**
 * This function takes an unknown source, and will recursively try to extract text from it.
 * Handles paragraphs and headers separately to preserve newlines.
 * @param root named params
 * @param root.source an object or a list to extract text from
 * @param root.text a string to concatenate with the result of this function. Set to undefined to create a new string
 * @returns either undefined or a string concatenated with root.text
 */
async function recursiveXMLParsedExtract({
  source,
  text,
}: {
  source: XMLNode;
  text: string | undefined;
}): Promise<string | undefined> {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, sonarjs/different-types-comparison
  if (typeof source === 'object' && source !== null && !Array.isArray(source)) {
    // the xml parser will indicate text with #text, so we only need to seek those tags and concat them
    if (
      '#text' in source &&
      typeof source['#text'] === 'string' &&
      source['#text'].length > 0
    ) {
      const cleanedText = source['#text'];
      return text ? `${text} ${cleanedText}` : cleanedText;
    }

    // there is an issue with this tag from MS office 2007 that contains text, although it's an ID
    if ('tableStyleId' in source) {
      return undefined;
    }

    // if this is a p tag (microsoft & open formats) this indicate a paragraph.
    if ('p' in source) {
      const extracted = await recursiveXMLParsedExtract({
        source: source.p,
        text,
      });
      return fixSentenceReturn({ sentence: extracted });
    }

    // if this is a a h tag (open format), this indicate a header
    if ('h' in source) {
      const extracted = await recursiveXMLParsedExtract({
        source: source.h,
        text,
      });
      return fixSentenceReturn({ sentence: extracted });
    }

    // if there is no #text, dig deeper in the object
    const values = Object.values(source);
    if (values.length > 0) {
      return recursiveXMLParsedExtract({ source: values, text });
    }
    return undefined;
  }

  if (Array.isArray(source)) {
    const promises = source.map(async (listItem) => {
      return recursiveXMLParsedExtract({ source: listItem, text: '' });
    });
    const extractedList = await Promise.all(promises);
    const filteredList = extractedList.filter((item): item is string => {
      return item !== undefined && item.length > 0;
    });
    return filteredList.join(' ');
  }

  // neither object or array -> return undefined
  return undefined;
}

/**
 * Fix sentence terminations to ensure consistent formatting
 * @param root named params
 * @param root.sentence (optional) a sentence to fix
 * @returns a sentence properly terminated, or undefined if there is no sentence
 */
export async function fixSentenceReturn({
  sentence,
}: {
  sentence: string | undefined;
}): Promise<string | undefined> {
  if (sentence && sentence.length > 1) {
    const lastCharacters = sentence.slice(-2);
    if (lastCharacters === '\n') {
      return sentence;
    }
    return `${sentence}\n`;
  }
  return undefined;
}

/**
 * Format extracted text to ensure proper spacing and line breaks
 * @param text The raw extracted text
 * @returns Formatted text
 */
function formatText(text: string | undefined): string {
  if (!text) return '';

  return text.replaceAll(/\n\s+/g, '\n').trim();
}

type XMLNode =
  | {
      [key: string]: XMLNode | XMLNode[];
    }
  | string
  | XMLNode[];
