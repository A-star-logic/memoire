import {
  deleteDocument as deleteDocumentFromDatabase,
  loadBlob,
  updateDocument,
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
export { isFileSupported } from '@astarlogic/services-parser';

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

  const textChunks = await parseStream({
    binaryStream,
    mimeType,
  });

  const chunksWithEmbeddings = await embedDocumentChunks({
    chunks: textChunks,
    traceID,
  });

  await addDocumentToSearch({
    chunks: chunksWithEmbeddings,
    documentID,
  });

  await updateDocument({
    documentID,
    status: 'indexed',
  });
}
