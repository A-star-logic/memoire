import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Environment } from '../../../../../../environment.js';
import { clearBucket, initS3Client } from '../../../config/database-s3.js';
import {
  deleteBlob,
  loadBlob,
  uploadBlob,
} from '../../database-document-blob.js';

describe('S3 Blob Storage Integration Tests', async () => {
  beforeAll(async () => {
    initS3Client({ env: process.env as Environment });
    await clearBucket({ bucketName: 'document-default' });
  });

  afterAll(async () => {
    await clearBucket({ bucketName: 'document-default' });
  });

  it('should upload a file to S3 successfully', async () => {
    const documentID = `test-${randomUUID()}`;
    const testContent = Buffer.from('Hello, World!');
    const mimeType = 'text/plain';

    await uploadBlob({
      binaryStream: testContent,
      documentID,
      mimeType,
    });
    const result = await loadBlob({ documentID });

    expect(result.binaryStream.toString()).toBe('Hello, World!');
    expect(result.mimeType).toBe(mimeType);

    await deleteBlob({ documentID });
  });
});
