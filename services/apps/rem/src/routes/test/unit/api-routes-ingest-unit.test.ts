import * as documentsModule from 'core/documents';
import { readFile } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../../../app.js';

// Mock the document functions
vi.mock('core/documents', () => {
  return {
    addDocument: vi.fn(),
    isFileSupported: vi.fn(),
  };
});

const testFile = new File(
  [await readFile(`${import.meta.dirname}/testFile.txt`)],
  'testFile.txt',
  { type: 'text/plain' },
);

beforeEach(async () => {
  vi.resetAllMocks();
});

describe('Ingest multipart', () => {
  it('should be protected by an API key', async () => {
    const response = await app.request('/memoire/ingest/multipart', {
      method: 'POST',
    });

    expect(response.status).toBe(401);
  });

  it('should successfully upload a file, and call the core', async () => {
    vi.mocked(documentsModule.isFileSupported).mockResolvedValue(true);
    vi.mocked(documentsModule.addDocument).mockResolvedValue(
      undefined satisfies Awaited<
        ReturnType<typeof documentsModule.addDocument>
      >,
    );

    const formData = new FormData();
    formData.append('documentID', '123');
    formData.append('file', testFile, 'testFile.txt');
    const response = await app.request('/memoire/ingest/multipart', {
      body: formData,
      headers: {
        authorization: 'Bearer testToken',
      },
      method: 'POST',
    });

    expect(response.status).toBe(202);
    const responseBody = await response.json();
    expect(responseBody).toEqual({ message: 'ok' });
    expect(documentsModule.isFileSupported).toHaveBeenCalledWith({
      filename: 'testFile.txt',
    });
    expect(documentsModule.addDocument).toHaveBeenCalledOnce();
    expect(documentsModule.addDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        binaryStream: expect.any(Buffer),
        documentID: '123',
        mimeType: 'text/plain',
        title: 'testFile.txt',
      }),
    );
  });

  it('should return 400 when no file is provided', async () => {
    const formData = new FormData();
    formData.append('documentID', '123');

    const response = await app.request('/memoire/ingest/multipart', {
      body: formData,
      headers: {
        authorization: 'Bearer testToken',
      },
      method: 'POST',
    });

    expect(response.status).toBe(400);
  });

  it('should return 400 when no documentID is provided', async () => {
    const formData = new FormData();
    formData.append('file', testFile, 'testFile.txt');

    const response = await app.request('/memoire/ingest/multipart', {
      body: formData,
      headers: {
        authorization: 'Bearer testToken',
      },
      method: 'POST',
    });

    expect(response.status).toBe(400);
  });

  it('should return 415 when file type is not supported', async () => {
    vi.mocked(documentsModule.isFileSupported).mockResolvedValue(false);

    const formData = new FormData();
    formData.append('documentID', '123');
    formData.append('file', testFile);

    const response = await app.request('/memoire/ingest/multipart', {
      body: formData,
      headers: {
        authorization: 'Bearer testToken',
      },
      method: 'POST',
    });

    expect(response.status).toBe(415);
  });

  it('should return 413 when file size exceeds maximum limit', async () => {
    const largeContent = 'a'.repeat(101 * 1024 * 1024); // 101MB content
    const largeFile = new File([largeContent], 'largeFile.txt', {
      type: 'text/plain',
    });

    const formData = new FormData();
    formData.append('documentID', '123');
    formData.append('file', largeFile);

    const response = await app.request('/memoire/ingest/multipart', {
      body: formData,
      headers: {
        authorization: 'Bearer testToken',
      },
      method: 'POST',
    });

    expect(response.status).toBe(413);
  });

  it('should return 400 when the metadata is not a valid json string', async () => {
    vi.mocked(documentsModule.isFileSupported).mockResolvedValue(true);

    const formData = new FormData();
    formData.append('documentID', '123');
    formData.append('file', testFile, 'testFile.txt');
    formData.append('metadata', 'invalid json string');

    const response = await app.request('/memoire/ingest/multipart', {
      body: formData,
      headers: {
        authorization: 'Bearer testToken',
      },
      method: 'POST',
    });

    expect(response.status).toBe(400);
  });
});

describe('Post-ingest processing', () => {
  it('should process the file', async () => {
    fail('not implemented');
  });
});
