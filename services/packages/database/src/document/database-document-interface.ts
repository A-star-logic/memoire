import { deleteBlob, uploadBlob } from './database-document-blob.js';
import {
  deleteDocumentInDatabase,
  insertDocumentInDatabase,
  updateDocumentInDatabase,
} from './database-document.js';

/**
 * add a document to the database
 * @param root named parameters
 * @param root.documentID the document ID
 * @param root.metadata the metadata of the document
 * @param root.title the title of the document
 */
export async function addDocument({
  documentID,

  metadata,
  title = undefined,
}: {
  documentID: string;
  metadata: object;
  title: string | undefined;
}): Promise<void> {
  await insertDocumentInDatabase({
    documentID,
    metadata,
    title,
  });

  try {
    await uploadBlob();

    await updateDocumentInDatabase({
      documentID,
      status: 'pendingIndexing',
    });
  } catch (error) {
    await deleteDocumentInDatabase({ documentID });
    throw error;
  }
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
  await deleteBlob({ documentID });
  await deleteDocumentInDatabase({ documentID });
}

export { loadBlob } from './database-document-blob.js';
export {
  getDocumentByID,
  updateDocumentInDatabase as updateDocument,
} from './database-document.js';
