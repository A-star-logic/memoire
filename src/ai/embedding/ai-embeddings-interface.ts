/**
 *  Automatically embed a document
 * @param root named parameters
 * @param root.document the the document to embed
 */
export async function autoEmbed({
  document,
}: {
  document: string;
}): Promise<{ chunkID: number; chunkText: string; embedding: number[] }[]> {
  // todo
  throw new Error('Not implemented' + document);
}

/**
 * Embed a search query
 * @param root named parameters
 * @param root.query the query to embed
 */
export async function embedQuery({
  query,
}: {
  query: string;
}): Promise<number[]> {
  // todo
  throw new Error('Not implemented' + query);
}
