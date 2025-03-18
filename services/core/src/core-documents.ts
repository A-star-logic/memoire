import {
  deleteDocument as deleteDocumentFromDatabase,
  loadBlob,
} from '@astarlogic/services-database/document';
import {
  addDocumentToSearch,
  deleteDocumentFromSearch,
} from '@astarlogic/services-database/search';
import { parseStream } from '@astarlogic/services-parser';
import { embedDocumentChunks } from 'ai/models';

export {
  addDocument,
  getDocumentByID,
  updateDocument,
} from '@astarlogic/services-database/document';

/**
 * Delete a document from the search and database
 * @param root named parameters
 * @param root.documentID the ID of the document to delete
 */
export async function deleteDocument({
  documentID,
}: {
  documentID: string;
}): Promise<void> {
  await deleteDocumentFromSearch({ documentID });
  await deleteDocumentFromDatabase({ documentID });
}

/**
 * Parse and index a document
 * @param root named parameters
 * @param root.documentID the ID of the document to parse and index
 */
export async function parseAndIndexDocument({
  documentID,
}: {
  documentID: string;
}): Promise<void> {
  const { binaryStream, mimeType } = await loadBlob({ documentID });

  const traceID = crypto.randomUUID();

  const chunks = await parseStream({
    binaryStream,
    mimeType,
  });

  const embeddings = await embedDocumentChunks({
    chunks,
    traceID,
  });

  await addDocumentToSearch({
    chunks: embeddings,
    documentID,
  });
}
