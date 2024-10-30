import { mkdir, readFile, writeFile } from 'node:fs/promises';

interface SourceDocument {
  chunkedContent: string[];
  metadata: object;
  title: string;
}

/**
 * Save the source document to disk
 * @param root named parameters
 * @param root.chunkedContent the content as chunks
 * @param root.documentID the document ID
 * @param root.metadata the metadata of the document
 * @param root.title the document title
 */
export async function saveSourceDocument({
  chunkedContent,
  documentID,
  metadata,
  title,
}: {
  chunkedContent: string[];
  documentID: string;
  metadata: object;
  title: string;
}): Promise<void> {
  await mkdir('.memoire/sources', { recursive: true });
  await writeFile(
    `.memoire/sources/${documentID}.json`,
    JSON.stringify({
      chunkedContent,
      metadata,
      title,
    } satisfies SourceDocument),
  );
}

/**
 * Load the source from disk
 * @param root named parameters
 * @param root.documentID the document ID
 * @returns The source document
 */
async function loadSourceDocument({
  documentID,
}: {
  documentID: string;
}): Promise<SourceDocument> {
  return JSON.parse(
    await readFile(`.memoire/sources/${documentID}.json`, { encoding: 'utf8' }),
  ) as SourceDocument;
}

/**
 * get a list of source documents
 * @param root named parameters
 * @param root.searchResults the search results
 * @returns The source document
 */
export async function getSourceDocuments({
  searchResults,
}: {
  searchResults: { documentID: string }[];
}): Promise<{ [documentID: string]: SourceDocument }> {
  const uniqueDocumentIDs = new Set(
    searchResults.map((result) => {
      return result.documentID;
    }),
  );
  const documents: Awaited<ReturnType<typeof getSourceDocuments>> = {};
  for (const documentID of uniqueDocumentIDs) {
    documents[documentID] = await loadSourceDocument({ documentID });
  }
  return documents;
}
