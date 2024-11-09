import { deleteFTSDocument, exists } from './database-search-fts.js';
import { deleteSourceDocument } from './database-search-source.js';
import { deleteVectorChunks } from './database-search-vector.js';

/**
 * Delete a document from the various indexes
 * @param root named parameters
 * @param root.documentID the document ID
 */
export async function deleteDocument({
  documentID,
}: {
  documentID: string;
}): Promise<void> {
  if (await exists({ documentID })) {
    const ftsPromise = deleteFTSDocument({ documentID });
    const vectorPromise = deleteVectorChunks({ documentID });
    const sourcePromise = deleteSourceDocument({ documentID });
    await Promise.all([ftsPromise, vectorPromise, sourcePromise]);
  }
}
