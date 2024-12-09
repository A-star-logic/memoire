// eslint-disable-next-line camelcase
import { get_encoding } from 'tiktoken';

/**
 * Split a document into chunks based on fixed size of characters and tokens
 * @param root named parameters
 * @param root.document the document to split into chunks
 * @param root.maxChars maximum character length of the chunk, default 2048
 * @param root.maxTokens maximum token length of the chunk, default 512
 * @returns a list of chunks
 */
export function createLengthBasedChunks({
  document,
  maxChars = 2048,
  maxTokens = 512,
}: {
  document: string;
  maxChars?: number;
  maxTokens?: number;
}): string[] {
  const chunks: string[] = [];
  const splitDocument = document.split(' ');
  const encoding = get_encoding('cl100k_base');
  let currentChunkBuffer = '';

  for (const text of splitDocument) {
    const charLength = (currentChunkBuffer + text).length;
    const tokensLength = encoding.encode(currentChunkBuffer + text).length;

    if (charLength <= maxChars && tokensLength <= maxTokens) {
      currentChunkBuffer += text + ' ';
    } else {
      chunks.push(currentChunkBuffer);
      currentChunkBuffer = text + ' ';
    }
  }
  chunks.push(currentChunkBuffer);

  encoding.free();

  return chunks;
}
