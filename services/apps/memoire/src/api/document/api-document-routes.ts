// schema types
import type {
  BasicResponse,
  SearchDeleteBody,
  SearchGetDocumentParameters,
  SearchGetDocumentResponse,
} from '@astarlogic/shared/schemas/memoire/api-schemas.js';

// libs
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';

// utils
import { secureVerifyDocumentID } from '@astarlogic/services-utils/utils-security.js';

// schemas
import {
  basicResponseSchema,
  searchDeleteBodySchema,
  searchGetDocumentParametersSchema,
  searchGetDocumentResponse,
} from '@astarlogic/shared/schemas/memoire/api-schemas.js';

// server
import type { CustomFastifyInstance } from '../../server/types.js';

// core
import {
  deleteDocuments,
  documentExist,
  getDocument,
} from '../../core/core-search.js';

export const documentRouter: FastifyPluginAsyncTypebox = async (
  app: CustomFastifyInstance,
  _options,
) => {
  app.delete<{
    Body: SearchDeleteBody;
    Reply: BasicResponse;
  }>(
    '/document/bulk',
    {
      onRequest: [app.token_auth],
      schema: {
        body: searchDeleteBodySchema,
        description:
          'Delete a list of documents from the search using their IDs',
        response: {
          200: basicResponseSchema,
        },
        security: [{ bearerAuth: [] }],
        tags: ['document'],
      },
    },
    async (request, _reply): Promise<BasicResponse> => {
      const { documentIDs } = request.body;
      for (const documentID of documentIDs) {
        try {
          await secureVerifyDocumentID({ documentID });
        } catch {
          throw {
            message: 'Forbidden characters found in document ID: ' + documentID,
            statusCode: 422,
          };
        }
      }

      await deleteDocuments({ documentIDs });
      return { message: 'ok' };
    },
  );

  app.get<{
    Querystring: SearchGetDocumentParameters;
    Reply: SearchGetDocumentResponse;
  }>(
    '/document',
    {
      onRequest: [app.token_auth],
      schema: {
        description: 'Get a document from Memoire using its ID',
        querystring: searchGetDocumentParametersSchema,
        response: {
          200: searchGetDocumentResponse,
          404: basicResponseSchema,
        },
        security: [{ bearerAuth: [] }],
        tags: ['document'],
      },
    },
    async (request, _reply): Promise<SearchGetDocumentResponse> => {
      const { documentID } = request.query;

      try {
        await secureVerifyDocumentID({ documentID });
      } catch {
        throw {
          message: 'Forbidden characters found in document ID: ' + documentID,
          statusCode: 422,
        };
      }

      const document = await getDocument({ documentID });
      if (!document) {
        throw {
          message: 'Document not found',
          statusCode: 404,
        };
      }
      return document;
    },
  );

  app.get<{
    Querystring: SearchGetDocumentParameters;
    Reply: BasicResponse;
  }>(
    '/document/exists',
    {
      onRequest: [app.token_auth],
      schema: {
        description: 'Verify a document exist in Memoire.',
        querystring: searchGetDocumentParametersSchema,
        response: {
          200: basicResponseSchema,
          404: basicResponseSchema,
        },
        security: [{ bearerAuth: [] }],
        tags: ['document'],
      },
    },
    async (request, _reply): Promise<BasicResponse> => {
      const { documentID } = request.query;

      try {
        await secureVerifyDocumentID({ documentID });
      } catch {
        throw {
          message: 'Forbidden characters found in document ID: ' + documentID,
          statusCode: 422,
        };
      }

      const document = await documentExist({ documentID });
      if (!document) {
        throw {
          message: 'Document not found',
          statusCode: 404,
        };
      }
      return {
        message: 'ok',
      };
    },
  );
};
