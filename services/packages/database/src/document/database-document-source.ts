/**
 * Delete a document from the bucket
 * @param root named parameters
 * @param root.documentID the document ID
 */
export async function deleteSourceDocument({
  documentID,
}: {
  documentID: string;
}): Promise<void> {
  // TODO: Implement
}

/**
 * Add a document to the bucket
 */
export async function uploadToBucket(): Promise<void> {
  // TODO: Implement
}

/**
 * Load the source document from the bucket
 * @param root named parameters
 * @param root.documentID the document ID
 * @returns The source document
 */
export async function loadSourceDocument({
  documentID,
}: {
  documentID: string;
}): Promise<SourceDocument> {
  // TODO: Implement
}
