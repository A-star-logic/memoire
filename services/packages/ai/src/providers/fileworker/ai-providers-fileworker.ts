import { Mistral } from '@mistralai/mistralai';
import type {
  ListFilesOut,
  OCRResponse,
  RetrieveFileOut,
  UploadFileOut,
} from '../ai-providers-ocr';

/**
 * Delete a file from Mistral
 * @param root named parameters
 * @param root.fileId the ID of the file to delete
 */
export async function deleteFileFromMistral({
  fileId,
}: {
  fileId: string;
}): Promise<void> {
  const mistral = new Mistral({
    apiKey: process.env.MISTRAL_API_KEY,
  });

  await mistral.files.delete({
    fileId,
  });
}

/**
 * Get a signed URL for the file from Mistral
 * @param root named parameters
 * @param root.fileId The ID of the file to get the signed URL for
 * @returns The signed URL for the file
 */
export async function getSignedUrlFromMistral({
  fileId,
}: {
  fileId: string;
}): Promise<string> {
  const mistral = new Mistral({
    apiKey: process.env.MISTRAL_API_KEY,
  });

  const result = await mistral.files.getSignedUrl({
    fileId,
  });

  return result.url;
}

/**
 * List all files stored in Mistral
 * @returns The list of files from Mistral
 */
export async function listFilesFromOcr(): Promise<ListFilesOut> {
  const mistral = new Mistral({
    apiKey: process.env.MISTRAL_API_KEY,
  });

  const result = await mistral.files.list();
  return result;
}

/**
 * Process a file with Mistral OCR
 * @param root named parameters
 * @param root.url The URL of the file to process
 * @returns The result of the OCR process
 */
export async function processFileWithMistralOcr({
  url,
}: {
  url: string;
}): Promise<OCRResponse> {
  const mistral = new Mistral({
    apiKey: process.env.MISTRAL_API_KEY,
  });

  const result = await mistral.ocr.process({
    document: {
      documentUrl: url,
      type: 'document_url',
    },
    model: 'mistral-ocr-latest',
  });

  return result;
}

/**
 * Retrieve a file from Mistral by its ID
 * @param root named parameters
 * @param root.fileId The ID of the file to retrieve
 * @returns The file object from Mistral
 */
export async function retrieveFileFromMistral({
  fileId,
}: {
  fileId: string;
}): Promise<RetrieveFileOut> {
  const mistral = new Mistral({
    apiKey: process.env.MISTRAL_API_KEY,
  });

  const result = await mistral.files.retrieve({
    fileId,
  });

  return result;
}

/**
 * Upload a file to Mistral
 * @param root named parameters
 * @param root.fileName The name of the file to upload
 * @param root.blobContent The blob content of the file to upload
 * @returns The result of the upload
 */
export async function uploadFileToMistral({
  blobContent,
  fileName,
}: {
  blobContent: ArrayBuffer;
  fileName: string;
}): Promise<UploadFileOut> {
  const fileToUpload = {
    content: blobContent,
    fileName,
  };

  const mistral = new Mistral({
    apiKey: process.env.MISTRAL_API_KEY,
  });

  const result = await mistral.files.upload({
    file: fileToUpload,
    purpose: 'ocr',
  });

  return result;
}
