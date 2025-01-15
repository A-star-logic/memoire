// libs
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
