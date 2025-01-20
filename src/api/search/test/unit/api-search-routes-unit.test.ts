// libs
import { describe, expect, test, vi } from 'vitest';

import type { SearchBody } from '../../../api-schemas.js';
// api
import { app } from '../../../api-config.js';

// mocks
vi.mock('../../../../core/core-search.js');
const coreSearchModule = await import('../../../../core/core-search.js');

describe('Search', async () => {
  test('The endpoint is protected by an API key', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/memoire/search',
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
      url: '/memoire/search',
    });
    expect(response.statusCode).toBe(200);
    expect(coreSearchModule.search).toHaveBeenCalledWith({
      maxResults: undefined,
      query: 'test',
      useHyde: false,
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
      url: '/memoire/search',
    });
    expect(response.statusCode).toBe(200);
    expect(coreSearchModule.search).toHaveBeenCalledWith({
      maxResults: 1,
      query: 'test',
      useHyde: false,
    });
  });
});
