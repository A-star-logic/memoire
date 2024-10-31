/**
 * Verify the document ID has only allowed characters.
 * This is a security measure to prevent path traversal when saving documents with documentID in their filename.
 * https://owasp.org/www-community/attacks/Path_Traversal
 * @param root named parameters
 * @param root.documentID the document ID
 * @returns the document ID
 * @throws an error if the documentID has any forbidden characters
 */
export async function secureVerifyDocumentID({
  documentID,
}: {
  documentID: string;
}): Promise<string> {
  // allow only word and number characters underscore and dashes https://regex101.com/r/OJeFLm/2
  const hasForbiddenCharacters = /[^\w-]/gm.test(documentID);
  if (hasForbiddenCharacters) {
    throw new Error('Document ID contains forbidden characters');
  }
  return documentID;
}
