// types
import type { EmbeddingModelOutput } from '@astarlogic/shared/schemas/ai/shared-schemas-ai-embedding.js';
import type { SearchGetDocumentResponse } from '@astarlogic/shared/schemas/memoire/api-schemas.js';

// database
import {
  addFTSDocument,
  deleteFTSDocument,
  exists,
} from './database-search-fts.js';
import {
  deleteSourceDocument,
  getSourceDocuments,
  saveSourceDocument,
} from './database-search-source.js';
import {
  bulkAddVectorChunks,
  deleteVectorChunks,
} from './database-search-vector.js';

/**
 * add a document to the database
 * @param root named parameters
 * @param root.content the content of the document
 * @param root.documentID the document ID
 * @param root.embedOutput the output of autoEmbed
 * @param root.metadata the metadata of the document
 * @param root.title the title of the document
 */
export async function addDocument({
  content,
  documentID,
  embedOutput,
  metadata,
  title = undefined,
}: {
  content: string;
  documentID: string;
  embedOutput: EmbeddingModelOutput;
  metadata: object;
  title: string | undefined;
}): Promise<void> {
  const documentExist = await exists({ documentID });

  if (documentExist) {
    await deleteVectorChunks({ documentID });
  }

  await addFTSDocument({
    documentID,
    text: title ? title + content : content,
  });

  await bulkAddVectorChunks({
    documentID,
    embeddings: embedOutput,
  });

  await saveSourceDocument({
    chunkedContent: embedOutput,
    documentID,
    metadata,
    title,
  });
}

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

/**
 * Fetch a document using its ID
 * @param root named parameters
 * @param root.documentID the document ID
 * @returns The document and its source
 */
export async function retrieveDocument({
  documentID,
}: {
  documentID: string;
}): Promise<SearchGetDocumentResponse | undefined> {
  if (await exists({ documentID })) {
    const source = await getSourceDocuments({
      searchResults: [{ documentID }],
    });
    return {
      content: source[documentID].chunkedContent.join(' '),
      documentID,
      metadata: source[documentID].metadata,
      title: source[documentID].title,
    };
  }
  return undefined;
}

export {
  calculateIDF,
  exists,
  FTSSearch,
  loadFTSIndexFromDisk,
  saveFTSIndexToDisk,
  usageStatsFTS,
} from './database-search-fts.js';
export { getSourceDocuments } from './database-search-source.js';
export {
  loadVectorIndexFromDisk,
  saveVectorIndexToDisk,
  usageStatsVector,
  vectorSearch,
} from './database-search-vector.js';
