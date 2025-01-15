// libs
import { describe, expect, test, vi } from 'vitest';

// types
import type {
  SearchDeleteBody,
  SearchGetDocumentParameters,
} from '../../../api-schemas.js';

// api
import { app } from '../../../api-config.js';

// mocks
vi.mock('../../../../core/core-search.js');
const coreSearchModule = await import('../../../../core/core-search.js');

describe('delete document', async () => {
  test('The endpoint is protected by an API key', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/memoire/document/bulk',
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
      url: '/memoire/document/bulk',
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
      url: '/memoire/document/bulk',
    });
    expect(response.statusCode).toBe(422);
    expect(response.json().message).toBe(
      'Forbidden characters found in document ID: ../test',
    );

    expect(coreSearchModule.deleteDocuments).not.toHaveBeenCalled();
  });
});

describe('get document', async () => {
  test('The endpoint is protected by an API key', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/memoire/document',
    });
    expect(response.statusCode).toBe(401);
  });

  test('The endpoint will call the core and return a document', async () => {
    coreSearchModule.getDocument = vi.fn().mockResolvedValue({
      content: 'test',
      documentID: '123',
    } satisfies Awaited<ReturnType<typeof coreSearchModule.getDocument>>);
    const response = await app.inject({
      headers: {
        authorization: 'Bearer testToken',
      },
      method: 'GET',
      query: {
        documentID: '123',
      } satisfies SearchGetDocumentParameters,
      url: '/memoire/document',
    });
    expect(response.statusCode).toBe(200);
    expect(coreSearchModule.getDocument).toHaveBeenCalledWith({
      documentID: '123',
    });
    expect(response.json()).toEqual({
      content: 'test',
      documentID: '123',
    });
  });

  test('The endpoint will return 404 if the document is not found', async () => {
    coreSearchModule.getDocument = vi
      .fn()
      .mockResolvedValue(
        undefined satisfies Awaited<
          ReturnType<typeof coreSearchModule.getDocument>
        >,
      );

    const response = await app.inject({
      headers: {
        authorization: 'Bearer testToken',
      },
      method: 'GET',
      query: {
        documentID: 'does-not-exist',
      } satisfies SearchGetDocumentParameters,
      url: '/memoire/document',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().message).toBe('Document not found');
  });

  test('The endpoint will reject invalid IDs', async () => {
    const response = await app.inject({
      headers: {
        authorization: 'Bearer testToken',
      },
      method: 'GET',
      query: {
        documentID: '../test',
      } satisfies SearchGetDocumentParameters,
      url: '/memoire/document',
    });
    expect(coreSearchModule.getDocument).not.toHaveBeenCalled();

    expect(response.statusCode).toBe(422);
    expect(response.json().message).toBe(
      'Forbidden characters found in document ID: ../test',
    );
  });

  test('The endpoint will reject missing parameters', async () => {
    const response = await app.inject({
      headers: {
        authorization: 'Bearer testToken',
      },
      method: 'GET',
      url: '/memoire/document',
    });
    expect(coreSearchModule.getDocument).not.toHaveBeenCalled();

    expect(response.statusCode).toBe(400);
  });
});

describe('Document exists', async () => {
  test('The endpoint is protected by an API key', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/memoire/document/exists',
    });
    expect(response.statusCode).toBe(401);
  });

  test('The endpoint will call the core and return a document', async () => {
    coreSearchModule.documentExist = vi
      .fn()
      .mockResolvedValue(
        true satisfies Awaited<
          ReturnType<typeof coreSearchModule.documentExist>
        >,
      );
    const response = await app.inject({
      headers: {
        authorization: 'Bearer testToken',
      },
      method: 'GET',
      query: {
        documentID: '123',
      } satisfies SearchGetDocumentParameters,
      url: '/memoire/document/exists',
    });
    expect(response.statusCode).toBe(200);
    expect(coreSearchModule.documentExist).toHaveBeenCalledWith({
      documentID: '123',
    });
    expect(response.json()).toEqual({
      message: 'ok',
    });
  });

  test('The endpoint will return 404 if the document is not found', async () => {
    coreSearchModule.documentExist = vi
      .fn()
      .mockResolvedValue(
        false satisfies Awaited<
          ReturnType<typeof coreSearchModule.documentExist>
        >,
      );

    const response = await app.inject({
      headers: {
        authorization: 'Bearer testToken',
      },
      method: 'GET',
      query: {
        documentID: 'does-not-exist',
      } satisfies SearchGetDocumentParameters,
      url: '/memoire/document/exists',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().message).toBe('Document not found');
  });

  test('The endpoint will reject invalid IDs', async () => {
    const response = await app.inject({
      headers: {
        authorization: 'Bearer testToken',
      },
      method: 'GET',
      query: {
        documentID: '../test',
      } satisfies SearchGetDocumentParameters,
      url: '/memoire/document/exists',
    });
    expect(coreSearchModule.documentExist).not.toHaveBeenCalled();

    expect(response.statusCode).toBe(422);
    expect(response.json().message).toBe(
      'Forbidden characters found in document ID: ../test',
    );
  });

  test('The endpoint will reject missing parameters', async () => {
    const response = await app.inject({
      headers: {
        authorization: 'Bearer testToken',
      },
      method: 'GET',
      url: '/memoire/document/exists',
    });
    expect(coreSearchModule.getDocument).not.toHaveBeenCalled();

    expect(response.statusCode).toBe(400);
  });
});
