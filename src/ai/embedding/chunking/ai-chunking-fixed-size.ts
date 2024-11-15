// eslint-disable-next-line camelcase
import { get_encoding } from 'tiktoken';
import { largeText } from '../model/tests/integration/test-variables.js';

/**
 * Split a document into chunks based on fixed size of charecter and tokens
 * @param root named parameters
 * @param root.document the document to split into chunks
 * @param root.separator a string such as \n or ' ' to seperate the chunk, default ' '
 * @param root.tokenLimit maximum token length of the chunk, default 512
 * @returns a list of chunks
 */
export function createLengthBasedChunks({
  document,
  separator = ' ',
  tokenLimit = 512,
}: {
  document: string;
  separator?: string;
  tokenLimit?: number;
}): string[] {
  const chunks: string[] = [];
  const baseSplit = document.split(separator);
  const encoding = get_encoding('cl100k_base');
  let currentChunkBuffer = '';
  for (const baseChunk of baseSplit) {
    if (
      (currentChunkBuffer + baseChunk).length <= 2048 &&
      encoding.encode(currentChunkBuffer + baseChunk).length <= tokenLimit
    ) {
      currentChunkBuffer += baseChunk + separator;
    } else {
      chunks.push(currentChunkBuffer);
      currentChunkBuffer = baseChunk + separator;
    }
  }
  if (currentChunkBuffer) {
    chunks.push(currentChunkBuffer);
  }

  return chunks;
}
