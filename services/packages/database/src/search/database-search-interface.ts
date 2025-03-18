import type { EmbeddingModelOutput } from '@astarlogic/shared/schemas/ai/shared-schemas-ai-embedding.js';
import { addChunk, deleteChunks } from './database-search-chunks.js';

export { textSearch, vectorSearch } from './database-search-chunks.js';

/**
 * Add a document to the search.
 *
 * **Warning!** This does not update, you need to delete from the search first!
 * @param root named parameters
 * @param root.chunks the chunks of the document
 * @param root.documentID the document ID
 */
export async function addDocumentToSearch({
  chunks,
  documentID,
}: {
  chunks: EmbeddingModelOutput;
  documentID: string;
}): Promise<void> {
  for (const chunk of chunks) {
    await addChunk({
      chunkContent: chunk.chunkText,
      chunkID: chunk.chunkID,
      documentID,
      embedding: chunk.embedding,
    });
  }
}

/**
 * Delete a document from the search
 * @param root named parameters
 * @param root.documentID the document ID
 */
export async function deleteDocumentFromSearch({
  documentID,
}: {
  documentID: string;
}): Promise<void> {
  await deleteChunks({ documentID });
}
