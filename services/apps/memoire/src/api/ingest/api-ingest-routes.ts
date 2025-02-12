// schema types
import type {
  BasicResponse,
  DocumentLinkBody,
  IngestRawBody,
} from '@astarlogic/shared/schemas/memoire/api-schemas.js';

// libs
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { apmReport } from '@astarlogic/services-database/reporting';
import {
  usageStatsFTS,
  usageStatsVector,
} from '@astarlogic/services-database/search';
import { isFileSupported, parseStream } from '@astarlogic/services-parser';
import { getTotalMemoryUsage } from '@astarlogic/services-utils/utils-apm.js';
import { secureVerifyDocumentID } from '@astarlogic/services-utils/utils-security.js';

import {
  basicResponseSchema,
  documentLinkBodySchema,
  ingestRawBodySchema,
  uploadFileResponseSchema,
} from '@astarlogic/shared/schemas/memoire/api-schemas.js';

// server
import type { CustomFastifyInstance } from '../../server/types.js';

// core
import { addDocuments } from '../../core/core-search.js';

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

export const ingestRouter: FastifyPluginAsyncTypebox = async (
  app: CustomFastifyInstance,
  _options,
) => {
  app.post<{
    Body: DocumentLinkBody;
    Reply: BasicResponse;
  }>(
    '/ingest/urls',
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
        tags: ['ingest'],
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
        tags: ['ingest'],
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

  app.post(
    '/ingest/multipart',
    {
      onRequest: [app.token_auth],
      schema: {
        consumes: ['multipart/form-data'],
        description: `
Upload multiple files and specify a unique documentID for each file.

The form has two fields, one for the files metadata, and one for the files themselves.

- **'documents'**: This field is for adding metadata, which is a JSON array. Each object in the array represents the metadata for a corresponding file. For example:
  \`\`\`json
  [
    { "documentID": "doc-1", "metadata": { "key": "value1" }, "title": "File 1" },
    { "documentID": "doc-2", "title": "File 2" }
  ]
  \`\`\`

- **'files'**: This field contains the files to be uploaded. It supports uploading multiple files, with each file corresponding to an entry in the 'documents' array.

documents.length must equal the number of files uploaded.
`,
        response: {
          200: uploadFileResponseSchema,
        },
        security: [{ bearerAuth: [] }],
        tags: ['ingest'],
      },
    },
    async (request, reply) => {
      const parts = request.parts();

      let documentsFromBody: {
        documentID: string;
        metadata?: unknown;
        title?: string;
      }[] = [];
      const fileBuffers: {
        buffer: Buffer;
        fieldname: string;
        filename: string;
        mimetype: string;
      }[] = [];

      for await (const part of parts) {
        if (part.type === 'file') {
          const chunks: Uint8Array[] = [];
          for await (const chunk of part.file) {
            if (chunk instanceof Uint8Array) {
              chunks.push(chunk);
            } else {
              throw new TypeError('Invalid chunk type, expected Uint8Array');
            }
          }
          const buffer = Buffer.concat(chunks);

          fileBuffers.push({
            buffer,
            fieldname: part.fieldname,
            filename: part.filename,
            mimetype: part.mimetype,
          });
        } else if (part.fieldname === 'documents') {
          if (typeof part.value !== 'string') {
            return reply.status(400).send({
              message: 'Invalid type for "documents" field. Expected string.',
            });
          }
          try {
            documentsFromBody = JSON.parse(part.value) as DocumentUpload[];
          } catch {
            return reply.status(400).send({
              message: 'Invalid JSON in "documents" field',
            });
          }
        }
      }

      if (documentsFromBody.length !== fileBuffers.length) {
        return reply.status(400).send({
          message: `Number of files (${fileBuffers.length}) does not match the length of the "documents" array (${documentsFromBody.length}).`,
        });
      }

      for (const document of documentsFromBody) {
        try {
          await secureVerifyDocumentID({ documentID: document.documentID });
        } catch {
          return reply.status(422).send({
            message:
              'Forbidden characters found in document ID: ' +
              document.documentID,
          });
        }
      }

      const uploadResults: {
        documentID: string;
        filename: string;
        status: string;
      }[] = [];

      for (const [
        index,
        { buffer, filename, mimetype },
      ] of fileBuffers.entries()) {
        const { documentID, metadata, title } = documentsFromBody[index];

        const content = await parseStream({
          binaryStream: buffer,
          documentName: filename,
          mimeType: mimetype,
        });

        await addDocuments({
          documents: [
            {
              content,
              documentID,
              metadata: metadata ?? {},
              title: title ?? filename,
            },
          ],
        });

        uploadResults.push({
          documentID,
          filename,
          status: 'uploaded',
        });
      }

      return { files: uploadResults, message: 'Files uploaded successfully' };
    },
  );
};

interface DocumentUpload {
  documentID: string;
  metadata?: unknown;
  title?: string;
}
