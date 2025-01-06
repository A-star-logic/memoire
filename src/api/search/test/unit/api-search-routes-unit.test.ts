// libs
import { describe, expect, test, vi } from 'vitest';

import type {
  DocumentLinkBody,
  IngestRawBody,
  SearchBody,
  SearchDeleteBody,
} from '../../api-search-schemas.js';
// api
import { app } from '../../../api-config.js';

// mocks
vi.mock('../../../../core/core-search.js');
const coreSearchModule = await import('../../../../core/core-search.js');
vi.mock('../../../../database/reporting/database-interface-reporting.ee.js');
const analyticsModule = await import(
  '../../../../database/reporting/database-interface-reporting.ee.js'
);

describe('delete document', async () => {
  test('The endpoint is protected by an API key', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/search/documents',
    });
    expect(response.statusCode).toBe(401);
  });

  test('The endpoint will call the delete function in the core', async () => {
    coreSearchModule.deleteDocuments = vi.fn().mockResolvedValue(undefined);

    const response = await app.inject({
      body: {
        documentIDs: ['1'],
      } satisfies SearchDeleteBody,
      headers: {
        authorization: 'Bearer testToken',
      },
      method: 'DELETE',
      url: '/search/documents',
    });
    expect(response.statusCode).toBe(200);

    expect(coreSearchModule.deleteDocuments).toHaveBeenCalledOnce();
  });

  test('The endpoint will reject invalid IDs', async () => {
    const response = await app.inject({
      body: {
        documentIDs: ['../test'],
      } satisfies SearchDeleteBody,
      headers: {
        authorization: 'Bearer testToken',
      },
      method: 'DELETE',
      url: '/search/documents',
    });
    expect(response.statusCode).toBe(422);
    expect(response.json().message).toBe(
      'Forbidden characters found in document ID: ../test',
    );

    expect(coreSearchModule.deleteDocuments).not.toHaveBeenCalled();
  });
});

describe('Add document links', async () => {
  test('The endpoint is protected by an API key', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/search/ingest/document-links',
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
      url: '/search/ingest/document-links',
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
      url: '/search/ingest/document-links',
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
      url: '/search/ingest/document-links',
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
      url: '/search/ingest/raw',
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
      url: '/search/ingest/raw',
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
      url: '/search/ingest/raw',
    });
    expect(response.statusCode).toBe(422);
    expect(response.json().message).toBe(
      'Forbidden characters found in document ID: ../test',
    );

    expect(coreSearchModule.addDocuments).not.toHaveBeenCalled();
  });
});

describe('Search', async () => {
  test('The endpoint is protected by an API key', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/search',
    });
    expect(response.statusCode).toBe(401);
  });

  test('Search will call the core search function', async () => {
    coreSearchModule.search = vi.fn().mockResolvedValue([
      {
        content: 'test',
        documentID: '123',
        highlights: undefined,
        metadata: { meta: 'data' },
        score: 1.1,
        title: 'title',
      },
      {
        content: 'test',
        documentID: '456',
        highlights: undefined,
        metadata: {},
        score: 1,
        title: undefined,
      },
    ] satisfies Awaited<ReturnType<typeof coreSearchModule.search>>);
    let response = await app.inject({
      body: {
        query: 'test',
      } satisfies SearchBody,
      headers: {
        authorization: 'Bearer testToken',
      },
      method: 'POST',
      url: '/search',
    });
    expect(response.statusCode).toBe(200);
    expect(coreSearchModule.search).toHaveBeenCalledWith({
      maxResults: undefined,
      query: 'test',
    });

    response = await app.inject({
      body: {
        maxResults: 1,
        query: 'test',
      } satisfies SearchBody,
      headers: {
        authorization: 'Bearer testToken',
      },
      method: 'POST',
      url: '/search',
    });
    expect(response.statusCode).toBe(200);
    expect(coreSearchModule.search).toHaveBeenCalledWith({
      maxResults: 1,
      query: 'test',
    });
  });
});
