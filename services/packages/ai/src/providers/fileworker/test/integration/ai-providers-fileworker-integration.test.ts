import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Environment } from '../../../../../../../environment';
import { initOcr } from '../../../../config/ai-config-ocr';
import {
  deleteFileFromMistral,
  getSignedUrlFromMistral,
  listFilesFromOcr,
  processFileWithMistralOcr,
  retrieveFileFromMistral,
  uploadFileToMistral,
} from '../../ai-providers-fileworker';

const filePath = path.join(import.meta.dirname, 'sample.pdf');

describe('Mistral OCR Integration Tests', async () => {
  beforeAll(async () => {
    initOcr({ env: process.env as Environment });
  });

  afterAll(async () => {
    const results = await listFilesFromOcr();
    const files = results.data;

    for (const file of files) {
      await deleteFileFromMistral({ fileId: file.id });
    }
  });

  it('should process a file with Mistral OCR', async () => {
    const fileDocument = await readFile(filePath);

    const uploadedFile = await uploadFileToMistral({
      blobContent: fileDocument,
      fileName: 'sample.pdf',
    });

    console.log(uploadedFile);

    expect(uploadedFile.id).toBeDefined();

    const retrievedFile = await retrieveFileFromMistral({
      fileId: uploadedFile.id,
    });

    expect(retrievedFile.filename).toBe('sample.pdf');

    const signedUrl = await getSignedUrlFromMistral({
      fileId: uploadedFile.id,
    });

    expect(signedUrl).toBeDefined();

    const processedDocument = await processFileWithMistralOcr({
      url: signedUrl,
    });

    expect(processedDocument.pages).toBeDefined();
    expect(processedDocument.pages.length).toBeGreaterThan(0);
  });
});
