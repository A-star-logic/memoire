// libs
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';

// server
import type { CustomFastifyInstance } from '../../server/types.js';

// schema types
import type {
  BasicResponse,
  DocumentLinkBody,
  IngestRawBody,
  SearchBody,
  SearchDeleteBody,
  SearchResponse,
} from './api-search-schemas.js';

// core
import {
  addDocuments,
  deleteDocuments,
  search,
} from '../../core/core-search.js';

// database
import { apmReport } from '../../database/reporting/database-interface-reporting.ee.js';
import { usageStatsFTS } from '../../database/search/database-search-fts.js';
import { usageStatsVector } from '../../database/search/database-search-vector.js';

// parser
import { isFileSupported } from '../../parser/parser.ee.js';

// utils
import { getTotalMemoryUsage } from '../../utils/utils-apm.js';
import { secureVerifyDocumentID } from '../../utils/utils-security.js';

// schemas
import {
  basicResponseSchema,
  documentLinkBodySchema,
  ingestRawBodySchema,
  searchBodySchema,
  searchDeleteBodySchema,
  searchResponseSchema,
} from './api-search-schemas.js';

// /**
//  * The post reply hook, that will:
//  * - ingest the documents // todo do this later, when we have a stronger architecture that can catch errors and self-correct
//  * - Run the IDF calculation
//  * - Save changes to disk
//  * @param _request the fastify request
//  * @param _reply the fastify reply
//  */
// async function postIngestion(
//   _request: CustomRequest,
//   _reply: unknown,
// ): Promise<void> {
//   // const { documents } = request.body as Static<typeof documentLinkBodySchema>;
//   try {
//     // await addDocuments({})
//   } catch (error) {
//     await errorReport({ error, message: 'In post ingestion hook' });
//   }
// }

export const searchRouter: FastifyPluginAsyncTypebox = async (
  app: CustomFastifyInstance,
  _options,
) => {
  app.post<{
    Body: DocumentLinkBody;
    Reply: BasicResponse;
  }>(
    '/ingest/document-links',
    {
      onRequest: [app.token_auth],
      //onResponse: [postIngestion],
      schema: {
        body: documentLinkBodySchema,
        description: `
Send a list of downloadable link of documents to be ingested.

Support:

- **raw text**: txt, csv, md
- **office**: docx

*Note: The example urls are fully working, feel free to copy paste them!*
`,
        response: {
          200: basicResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, _reply): Promise<BasicResponse> => {
      const { documents } = request.body;

      for (const document of documents) {
        try {
          await secureVerifyDocumentID({ documentID: document.documentID });
        } catch {
          throw {
            message:
              'Forbidden characters found in document ID: ' +
              document.documentID,
            statusCode: 422,
          };
        }
        if (!(await isFileSupported({ filename: document.url }))) {
          throw {
            message: 'Unsupported document type: ' + document.url,
            statusCode: 422,
          };
        }
      }

      await addDocuments({ documents });

      const { totalDocuments: totalVectors } = await usageStatsVector();
      const { totalDocuments, totalTerms } = await usageStatsFTS();
      await apmReport({
        event: 'ingest',
        properties: {
          addedDocuments: documents.length,
          memoryUsage: await getTotalMemoryUsage(),
          totalDocuments,
          totalTerms,
          totalVectors,
        },
      });

      return { message: 'ok' };
    },
  );

  app.post<{
    Body: IngestRawBody;
    Reply: BasicResponse;
  }>(
    '/ingest/raw',
    {
      onRequest: [app.token_auth],
      schema: {
        body: ingestRawBodySchema,
        description: `
Send raw text to be ingested.

Ideally your text should be in markdown format, to help with context extraction. But you can send any text you want.

**Note:** Just like the other endpoints, there is a limit of 1mb per request.
`,
        response: {
          200: basicResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, _reply): Promise<BasicResponse> => {
      const { documents } = request.body;

      for (const document of documents) {
        try {
          await secureVerifyDocumentID({ documentID: document.documentID });
        } catch {
          throw {
            message:
              'Forbidden characters found in document ID: ' +
              document.documentID,
            statusCode: 422,
          };
        }
      }

      await addDocuments({ documents });

      const { totalDocuments: totalVectors } = await usageStatsVector();
      const { totalDocuments, totalTerms } = await usageStatsFTS();
      await apmReport({
        event: 'ingest',
        properties: {
          addedDocuments: documents.length,
          memoryUsage: await getTotalMemoryUsage(),
          totalDocuments,
          totalTerms,
          totalVectors,
        },
      });

      return { message: 'ok' };
    },
  );

  app.post<{
    Body: SearchBody;
    Reply: SearchResponse;
  }>(
    '',
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

  app.delete<{
    Body: SearchDeleteBody;
    Reply: BasicResponse;
  }>(
    '/documents',
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
};
