import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { s3Client } from '../config/database-s3.js';

const bucketName = 'document-default';

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
  const deleteCommand = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: documentID,
  });

  await s3Client.send(deleteCommand);
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
  const getCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: documentID,
  });

  const response = await s3Client.send(getCommand);

  if (!response.Body) {
    throw new Error(`No content found for document ${documentID}`);
  }

  // Convert the readable stream to a buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  const binaryStream = Buffer.concat(chunks);

  return {
    binaryStream,
    mimeType: response.ContentType ?? 'application/octet-stream',
  };
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
  const createDocument = new PutObjectCommand({
    Body: binaryStream,
    Bucket: bucketName,
    ContentType: mimeType,
    Key: documentID,
  });

  await s3Client.send(createDocument);
}
