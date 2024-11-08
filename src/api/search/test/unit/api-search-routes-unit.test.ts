// libs
import { describe, expect, test, vi } from 'vitest';

// api
import { app } from '../../../api-config.js';

// mocks
vi.mock('../../../../core/core-search.js');
const coreSearchModule = await import('../../../../core/core-search.js');

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
      },
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
      },
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
