import fs from 'node:fs/promises';
import path from 'node:path';

const isTestEnvironment = process.env.NODE_ENV === 'test';
/* v8 ignore start */
export const BASE_FOLDER = isTestEnvironment ? '.testMemoire' : 'data';
/* v8 ignore end */
const TEMP_FOLDER_PATH = path.join(process.cwd(), BASE_FOLDER, 'temp');
/**
 * Reads the metadata file for a given document ID.
 * @param root named parameters
 * @param root.documentID The document ID.
 * @returns The metadata object.
 */
export async function readTemporaryMetadata({
  documentID,
}: {
  documentID: string;
}): Promise<unknown> {
  const metadataPath = path.join(TEMP_FOLDER_PATH, `${documentID}.json`);
  const buffer = await fs.readFile(metadataPath);
  return JSON.parse(buffer.toString());
}

/**
 * Reads the text file for a given document ID.
 * @param root named parameters
 * @param root.documentID The document ID.
 * @returns The content of the text file.
 */
export async function readTemporaryText({
  documentID,
}: {
  documentID: string;
}): Promise<string> {
  const textPath = path.join(TEMP_FOLDER_PATH, `${documentID}.txt`);
  return fs.readFile(textPath, 'utf8');
}

/**
 * Saves text and metadata as separate files in the temporary folder.
 * @param root named parameters
 * @param root.documentID The document ID used as the file name prefix.
 * @param root.text The document content.
 * @param root.metadata The metadata object.
 * @returns A promise indicating completion.
 */
export async function storeTextAndMetadata({
  documentID,
  metadata,
  text,
}: {
  documentID: string;
  metadata: unknown;
  text: string;
}): Promise<void> {
  await ensureTemporaryFolder();

  const textPath = path.join(TEMP_FOLDER_PATH, `${documentID}.txt`);
  const metadataPath = path.join(TEMP_FOLDER_PATH, `${documentID}.json`);

  await fs.writeFile(textPath, text, 'utf8');
  await fs.writeFile(
    metadataPath,
    JSON.stringify(metadata, undefined, 2),
    'utf8',
  );
}

/**
 * Ensures the temporary folder exists, creating it if necessary.
 * @returns A promise indicating completion.
 */
async function ensureTemporaryFolder(): Promise<void> {
  await fs.mkdir(TEMP_FOLDER_PATH, { recursive: true });
}
