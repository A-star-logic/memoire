// libs
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';

// server
import type { CustomFastifyInstance } from '../../server/types.js';

// schema types
import type { SearchBody, SearchResponse } from '../api-schemas.js';

// core
import { search } from '../../core/core-search.js';

// schemas
import { searchBodySchema, searchResponseSchema } from '../api-schemas.js';

export const searchRouter: FastifyPluginAsyncTypebox = async (
  app: CustomFastifyInstance,
  _options,
) => {
  app.post<{
    Body: SearchBody;
    Reply: SearchResponse;
  }>(
    '/search',
    {
      onRequest: [app.token_auth],
      schema: {
        body: searchBodySchema,
        description: `
Search for documents that match the closest to your query.

Note:
- The highlight is the contextual chunk closest to the query, this is what you need for RAG. Sometimes it might be unavailable, but the original content will always be there.
- You can increase or decrease the size of the maxResult to your liking, it has little impact on performance.
- your Query is limited to a single chunk (512 tokens max; 1 token ~ 4 characters).
`,
        response: {
          200: searchResponseSchema,
        },
        security: [{ bearerAuth: [] }],
        tags: ['search'],
      },
    },
    async (request, _reply): Promise<SearchResponse> => {
      const { maxResults, operationMode, query } = request.body;
      const useHyde = operationMode === 'accuracy' ? true : false;
      return {
        results: await search({ maxResults, query, useHyde }),
      };
    },
  );
};
