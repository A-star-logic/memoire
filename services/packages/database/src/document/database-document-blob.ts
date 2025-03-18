/**
 * Delete a document from the bucket
 * @param root named parameters
 * @param root.documentID the document ID
 */
export async function deleteBlob({
  documentID,
}: {
  documentID: string;
}): Promise<void> {
  // TODO: Implement
}

/**
 * Load the source document from the bucket
 * @param root named parameters
 * @param root.documentID the document ID
 * @returns The source document
 */
export async function loadBlob({
  documentID,
}: {
  documentID: string;
}): Promise<{
  binaryStream: Buffer;
  mimeType: string;
}> {
  // TODO: Implement
}

/**
 * Add a document to the bucket
 * @param root named parameters
 * @param root.documentID the document ID
 * @param root.binaryStream the binary stream of the document
 * @param root.mimeType the mime type of the document
 */
export async function uploadBlob({
  binaryStream,
  documentID,
  mimeType,
}: {
  binaryStream: Buffer;
  documentID: string;
  mimeType: string;
}): Promise<void> {
  // TODO: Implement
}
