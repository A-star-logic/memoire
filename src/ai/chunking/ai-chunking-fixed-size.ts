import { TokenTextSplitter } from '@langchain/textsplitters';

/**
 * Split a document into chunks. This is a simple way of creating chunks and not context-aware
 * @param root named parameters
 * @param root.document the document to split into chunks
 * @param root.chunkSize desired token size of the chunk
 * @returns a list of chunks
 */
export async function createDocumentChunks({
  chunkSize = 512,
  document,
}: {
  chunkSize?: number;
  document: string;
}): Promise<string[]> {
  const textSplitter = new TokenTextSplitter({
    chunkOverlap: 0,
    chunkSize,
    encodingName: 'cl100k_base',
  });

  const cleanedDocument = document.replaceAll('\n', ' ');
  // trim and remove duplicate whitespace
  const trimmedDocument = cleanedDocument.replaceAll(/\s+/g, ' ').trim();
  return textSplitter.splitText(trimmedDocument);
}
