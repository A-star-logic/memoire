// libs
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { type Static, Type } from '@sinclair/typebox';

// server
import type {
  CustomFastifyInstance,
  CustomRequest,
} from '../../server/types.js';

// database
import {
  calculateIDF,
  saveFTSIndexToDisk,
  usageStatsFTS,
} from '../../database/search/database-search-fts.js';

// core
import { extractFromUrl } from '../../core/core-extractor.js';
import {
  addDocument,
  deleteDocuments,
  search,
} from '../../core/core-search.js';

// database
import {
  apmReport,
  errorReport,
} from '../../database/reporting/database-interface-reporting.ee.js';
import {
  saveVectorIndexToDisk,
  usageStatsVector,
} from '../../database/search/database-search-vector.js';

// utils
import { getTotalMemoryUsage } from '../../utils/utils-apm.js';
import { secureVerifyDocumentID } from '../../utils/utils-security.js';

const basicResponseSchema = Type.Object({
  message: Type.String({
    examples: ['ok'],
  }),
});

const documentLinkBodySchema = Type.Object(
  {
    documents: Type.Array(
      Type.Object(
        {
          documentID: Type.String({
            description:
              'The ID of the document. **Note** This id can only support letters, numbers, dashes (-) and underscores (_)',
            examples: ['abc-123', 'document1'],
          }),
          metadata: Type.Optional(
            Type.Object(
              {},
              {
                description:
                  'Any metadata related to the document. This is not used for the search of filtering',
                examples: [{ meta: 'data' }],
              },
            ),
          ),
          title: Type.Optional(
            Type.String({
              description: 'The title of the document, if any',
              examples: ['My Document'],
            }),
          ),
          url: Type.String({ examples: ['https://example.com'] }),
        },
        {
          description: 'An array of document to ingest.',
        },
      ),
    ),
  },
  { additionalProperties: false },
);

/**
 * The post reply hook, that will:
 * - ingest the documents // todo do this later, when we have a stronger architecture that can catch errors and self-correct
 * - Run the IDF calculation
 * - Save changes to disk
 * @param _request the fastify request
 * @param _reply the fastify reply
 */
async function postIngestion(
  _request: CustomRequest,
  _reply: unknown,
): Promise<void> {
  // const { documents } = request.body as Static<typeof documentLinkBodySchema>;
  try {
    await calculateIDF();
    await saveFTSIndexToDisk();
    await saveVectorIndexToDisk();
  } catch (error) {
    await errorReport({ error, message: 'In post ingestion hook' });
  }
}

export const searchRouter: FastifyPluginAsyncTypebox = async (
  app: CustomFastifyInstance,
  _options,
) => {
  app.post<{
    Body: Static<typeof documentLinkBodySchema>;
    Reply: Static<typeof basicResponseSchema>;
  }>(
    '/ingest/document-links',
    {
      onRequest: [app.token_auth],
      // @ts-expect-error dunno how to type this properly
      onResponse: [postIngestion],
      schema: {
        body: documentLinkBodySchema,
        description: `
Send a list of downloadable link of documents to be ingested.

Support:

- txt
- docx (word > 2007)
`,
        response: {
          200: basicResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, _reply): Promise<Static<typeof basicResponseSchema>> => {
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

      for (const document of documents) {
        const content = await extractFromUrl({ url: document.url });

        await addDocument({
          content,
          documentID: document.documentID,
          metadata: document.metadata ?? {},
          title: document.title,
        });
      }

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

  const searchBodySchema = Type.Object(
    {
      maxResults: Type.Optional(
        Type.Number({
          default: 100,
          description: 'The maximum number of results to return',
          examples: [10],
          minimum: 1,
        }),
      ),
      query: Type.String({
        description: 'The search query',
        examples: ['hello'],
      }),
    },
    { additionalProperties: false },
  );
  const searchResponseSchema = Type.Object(
    {
      results: Type.Array(
        Type.Object({
          content: Type.String({
            description: 'The original document content',
          }),
          documentID: Type.String({}),
          highlights: Type.Optional(
            Type.String({
              description:
                '(Optional) the highlight of the document/Closest match. This is to be used in RAG or to display the relevant part of the document to the user',
            }),
          ),
          metadata: Type.Optional(Type.Object({})),
          score: Type.Number({
            description:
              'The search score of the document. This score can be higher than 1',
          }),
          title: Type.Optional(Type.String()),
        }),
      ),
    },
    { additionalProperties: false },
  );
  app.post<{
    Body: Static<typeof searchBodySchema>;
    Reply: Static<typeof searchResponseSchema>;
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
    async (request, _reply): Promise<Static<typeof searchResponseSchema>> => {
      const { maxResults, query } = request.body;
      return {
        results: await search({ maxResults, query }),
      };
    },
  );

  const searchDeleteBodySchema = Type.Object(
    {
      documentIDs: Type.Array(Type.String(), {
        examples: [['document1', 'abc-123']],
      }),
    },
    { additionalProperties: false },
  );
  app.delete<{
    Body: Static<typeof searchDeleteBodySchema>;
    Reply: Static<typeof basicResponseSchema>;
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
    async (request, _reply) => {
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
    },
  );
};
