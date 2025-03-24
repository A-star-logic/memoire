import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  deleteBlob,
  loadBlob,
  uploadBlob,
} from '../../database-document-blob.js';

describe('S3 Blob Storage Integration Tests', () => {
  // Test environment validation
  beforeAll(() => {
    // Verify required environment variables
    const requiredEnvironmentVariables = ['AWS_BUCKET_NAME', 'AWS_REGION'];
    for (const environmentVariable of requiredEnvironmentVariables) {
      if (!process.env[environmentVariable]) {
        throw new Error(
          `Required environment variable ${environmentVariable} is not set`,
        );
      }
    }
  });

  // Clean up any test files after all tests
  afterAll(async () => {
    // Nothing to clean up as each test handles its own cleanup
  });

  describe('uploadBlob', () => {
    it('should upload a file to S3 successfully', async () => {
      // Arrange
      const documentID = `test-${randomUUID()}`;
      const testContent = Buffer.from('Hello, World!');
      const mimeType = 'text/plain';

      try {
        // Act
        await uploadBlob({
          binaryStream: testContent,
          documentID,
          mimeType,
        });

        // Assert
        const result = await loadBlob({ documentID });
        console.log(result);
        expect(result.binaryStream.toString()).toBe('Hello, World!');
        expect(result.mimeType).toBe(mimeType);
      } finally {
        // Clean up
        await deleteBlob({ documentID });
      }
    });

    it('should handle large files correctly', async () => {
      // Arrange
      const documentID = `test-large-${randomUUID()}`;
      const largeContent = Buffer.alloc(6 * 1024 * 1024); // 6MB file
      largeContent.fill('A');
      const mimeType = 'application/octet-stream';

      try {
        // Act
        await uploadBlob({
          binaryStream: largeContent,
          documentID,
          mimeType,
        });

        // Assert
        const result = await loadBlob({ documentID });
        expect(result.binaryStream.length).toBe(largeContent.length);
        expect(result.binaryStream.equals(largeContent)).toBe(true);
        expect(result.mimeType).toBe(mimeType);
      } finally {
        // Clean up
        await deleteBlob({ documentID });
      }
    });

    it('should handle special characters in documentID', async () => {
      // Arrange
      const documentID = `test-special-${randomUUID()}-@#$`;
      const testContent = Buffer.from('Special chars test');
      const mimeType = 'text/plain';

      try {
        // Act
        await uploadBlob({
          binaryStream: testContent,
          documentID,
          mimeType,
        });

        // Assert
        const result = await loadBlob({ documentID });
        expect(result.binaryStream.toString()).toBe('Special chars test');
        expect(result.mimeType).toBe(mimeType);
      } finally {
        // Clean up
        await deleteBlob({ documentID });
      }
    });
  });
});
