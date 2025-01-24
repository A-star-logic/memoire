// libs
import FormData from 'form-data';
import { PassThrough } from 'node:stream';
import { describe, expect, test, vi } from 'vitest';

import type { DocumentLinkBody, IngestRawBody } from '../../../api-schemas.js';
// api
import { app } from '../../../api-config.js';

// mocks
vi.mock('../../../../core/core-search.js');
const coreSearchModule = await import('../../../../core/core-search.js');
vi.mock('../../../../database/reporting/database-interface-reporting.ee.js');
const analyticsModule = await import(
  '../../../../database/reporting/database-interface-reporting.ee.js'
);

vi.mock('../../../../parser/parser.ee.js', async () => {
  const actual = await vi.importActual<{ [key: string]: unknown }>(
    '../../../../parser/parser.ee.js',
  );
  return {
    ...actual,
    parseStream: vi.fn().mockResolvedValue('mocked parseStream content'),
  };
});
import { parseStream } from '../../../../parser/parser.ee.js';

vi.mock('../../../../core/core-search.js', async () => {
  const actual = await vi.importActual<{ [key: string]: unknown }>(
    '../../../../core/core-search.js',
  );
  return {
    ...actual,
    addDocuments: vi.fn().mockResolvedValue(undefined),
  };
});
import { addDocuments } from '../../../../core/core-search.js';

describe('Add document links', async () => {
  test('The endpoint is protected by an API key', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/memoire/ingest/urls',
    });
    expect(response.statusCode).toBe(401);
  });

  test('The endpoint will call the core addDocuments and send usage statistics', async () => {
    coreSearchModule.addDocuments = vi.fn().mockResolvedValue(undefined);
    analyticsModule.apmReport = vi.fn().mockResolvedValue(undefined);
    const response = await app.inject({
      body: {
        documents: [
          {
            documentID: '123',
            metadata: { meta: 'data' },
            title: 'title',
            url: 'test.txt',
          },
          {
            documentID: '456',
            metadata: undefined,
            title: undefined,
            url: 'test1.txt',
          },
        ],
      } satisfies DocumentLinkBody,
      headers: {
        authorization: 'Bearer testToken',
      },
      method: 'POST',
      url: '/memoire/ingest/urls',
    });
    expect(response.statusCode).toBe(200);

    expect(coreSearchModule.addDocuments).toHaveBeenCalled();
    expect(analyticsModule.apmReport).toHaveBeenCalled();
  });

  test('The endpoint will reject invalid IDs', async () => {
    const response = await app.inject({
      body: {
        documents: [
          {
            documentID: '../test',
            metadata: { meta: 'data' },
            title: 'title',
            url: 'test.url',
          },
        ],
      } satisfies DocumentLinkBody,
      headers: {
        authorization: 'Bearer testToken',
      },
      method: 'POST',
      url: '/memoire/ingest/urls',
    });
    expect(response.statusCode).toBe(422);
    expect(response.json().message).toBe(
      'Forbidden characters found in document ID: ../test',
    );

    expect(coreSearchModule.addDocuments).not.toHaveBeenCalled();
  });

  test('The endpoint will reject invalid document types', async () => {
    const response = await app.inject({
      body: {
        documents: [
          {
            documentID: 'test',
            metadata: { meta: 'data' },
            title: 'title',
            url: 'test.url',
          },
        ],
      } satisfies DocumentLinkBody,
      headers: {
        authorization: 'Bearer testToken',
      },
      method: 'POST',
      url: '/memoire/ingest/urls',
    });
    expect(response.statusCode).toBe(422);
    expect(response.json().message).toBe('Unsupported document type: test.url');

    expect(coreSearchModule.addDocuments).not.toHaveBeenCalled();
  });
});

describe('Add raw text', async () => {
  test('The endpoint is protected by an API key', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/memoire/ingest/raw',
    });
    expect(response.statusCode).toBe(401);
  });

  test('The endpoint will call the core addDocuments and send usage statistics', async () => {
    coreSearchModule.addDocuments = vi.fn().mockResolvedValue(undefined);
    analyticsModule.apmReport = vi.fn().mockResolvedValue(undefined);
    const response = await app.inject({
      body: {
        documents: [
          {
            content: 'hello world',
            documentID: '123',
            metadata: { meta: 'data' },
            title: 'title',
          },
          {
            content: 'Another test',
            documentID: '456',
            metadata: undefined,
            title: undefined,
          },
        ],
      } satisfies IngestRawBody,
      headers: {
        authorization: 'Bearer testToken',
      },
      method: 'POST',
      url: '/memoire/ingest/raw',
    });
    expect(response.statusCode).toBe(200);

    expect(coreSearchModule.addDocuments).toHaveBeenCalled();
    expect(analyticsModule.apmReport).toHaveBeenCalled();
  });

  test('The endpoint will reject invalid IDs', async () => {
    const response = await app.inject({
      body: {
        documents: [
          {
            content: 'test.url',
            documentID: '../test',
            metadata: { meta: 'data' },
            title: 'title',
          },
        ],
      } satisfies IngestRawBody,
      headers: {
        authorization: 'Bearer testToken',
      },
      method: 'POST',
      url: '/memoire/ingest/raw',
    });
    expect(response.statusCode).toBe(422);
    expect(response.json().message).toBe(
      'Forbidden characters found in document ID: ../test',
    );

    expect(coreSearchModule.addDocuments).not.toHaveBeenCalled();
  });
});

/**
 * Converts a Buffer into a readable stream.
 * @param buffer  The Buffer to convert into a stream
 * @returns A readable stream containing the data from the buffer
 */
function bufferToStream(buffer: Buffer): PassThrough {
  const stream = new PassThrough();
  stream.end(buffer);
  return stream;
}

describe('Upload multipart data', () => {
  test('The endpoint is protected by an API key', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/memoire/ingest/multipart',
    });
    expect(response.statusCode).toBe(401);
  });

  test('The endpoint will reject invalid JSON in "documents" field', async () => {
    const form = new FormData();
    form.append('documents', 'not-valid-json');
    form.append('file', bufferToStream(Buffer.from('content')), {
      filename: 'test.txt',
    });

    const response = await app.inject({
      headers: {
        authorization: 'Bearer testToken',
        ...form.getHeaders(),
      },
      method: 'POST',
      payload: form,
      url: '/memoire/ingest/multipart',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().message).toBe('Invalid JSON in "documents" field');
    expect(parseStream).not.toHaveBeenCalled();
    expect(addDocuments).not.toHaveBeenCalled();
  });

  test('The endpoint will reject if "documents" length does not match number of files', async () => {
    const form = new FormData();
    form.append(
      'documents',
      JSON.stringify([{ documentID: 'doc1' }, { documentID: 'doc2' }]),
    );
    form.append('file', bufferToStream(Buffer.from('file1')), {
      filename: 'file1.txt',
    });

    const response = await app.inject({
      headers: {
        authorization: 'Bearer testToken',
        ...form.getHeaders(),
      },
      method: 'POST',
      payload: form,
      url: '/memoire/ingest/multipart',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().message).toMatch(
      /Number of files \(1\) does not match.*\(2\)/,
    );
    expect(parseStream).not.toHaveBeenCalled();
    expect(addDocuments).not.toHaveBeenCalled();
  });

  test('The endpoint will reject invalid documentID', async () => {
    const form = new FormData();
    form.append(
      'documents',
      JSON.stringify([{ documentID: 'doc1' }, { documentID: '../bad' }]),
    );
    form.append('file', bufferToStream(Buffer.from('file1')), {
      filename: 'file1.txt',
    });
    form.append('file', bufferToStream(Buffer.from('file2')), {
      filename: 'file2.txt',
    });

    const response = await app.inject({
      headers: {
        authorization: 'Bearer testToken',
        ...form.getHeaders(),
      },
      method: 'POST',
      payload: form,
      url: '/memoire/ingest/multipart',
    });

    expect(response.statusCode).toBe(422);
    expect(response.json().message).toBe(
      'Forbidden characters found in document ID: ../bad',
    );
    expect(parseStream).not.toHaveBeenCalled();
    expect(addDocuments).not.toHaveBeenCalled();
  });

  test('The endpoint will successfully upload multiple files with different documentIDs', async () => {
    const form = new FormData();
    form.append(
      'documents',
      JSON.stringify([
        { documentID: 'doc1', metadata: { a: 1 }, title: 'MyFile1' },
        { documentID: 'doc2' },
      ]),
    );

    const fileBuffer1 = Buffer.from('File content 1', 'utf8');
    const fileBuffer2 = Buffer.from('File content 2', 'utf8');

    form.append('file', bufferToStream(fileBuffer1), {
      filename: 'file1.txt',
    });
    form.append('file', bufferToStream(fileBuffer2), {
      filename: 'file2.txt',
    });

    const response = await app.inject({
      headers: {
        authorization: 'Bearer testToken',
        ...form.getHeaders(),
      },
      method: 'POST',
      payload: form,
      url: '/memoire/ingest/multipart',
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json.message).toBe('Files uploaded successfully');
    expect(json.files).toHaveLength(2);

    expect(json.files[0]).toMatchObject({
      documentID: 'doc1',
      filename: 'file1.txt',
      status: 'uploaded',
    });
    expect(json.files[1]).toMatchObject({
      documentID: 'doc2',
      filename: 'file2.txt',
      status: 'uploaded',
    });

    expect(parseStream).toHaveBeenCalledTimes(2);
    expect(addDocuments).toHaveBeenCalledTimes(2);
  });
});
