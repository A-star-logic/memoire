import type { BasicResponse } from '@astarlogic/shared/schemas/memoire/api-schemas.js';
import { basicResponseSchema } from '@astarlogic/shared/schemas/memoire/api-schemas.js';
import { ingestMultipartSchema } from '@astarlogic/shared/schemas/memoire/shared-schemas-memoire-ingest.js';
import { addDocument, isFileSupported } from 'core/documents';
import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { HTTPException } from 'hono/http-exception';
import type { Variables } from '../context.js';

const ingestRouter = new Hono<{ Variables: Variables }>();

const maxFileSize = 100 * 1024 * 1024; // 100MB

/**
 * Parse the metadata string into an object
 * @param root named parameters
 * @param root.metadata The metadata string
 * @returns The parsed metadata object
 */
function metadataParser({
  metadata,
}: {
  metadata: string | undefined;
}): object {
  if (!metadata) {
    return {};
  }
  try {
    return JSON.parse(metadata) as object;
  } catch {
    throw new HTTPException(400, {
      message: 'Metadata is not a valid JSON string',
    });
  }
}

ingestRouter.post(
  'multipart',
  describeRoute({
    description: `Upload a document. Max file size: ${maxFileSize / 1024 / 1024}MB.

Note: do not put the headers for multipart form data, or the server will not be able to parse the body`,
    requestBody: {
      content: {
        'multipart/form-data': {
          schema: ingestMultipartSchema,
        },
      },
      required: true,
    },
    responses: {
      202: {
        content: {
          'application/json': {
            schema: basicResponseSchema,
          },
        },
        description:
          'The document is uploaded and will be processed in the background',
      },
      400: {
        content: {
          'application/json': {
            schema: basicResponseSchema,
          },
        },
        description: 'Invalid request body',
      },
      401: {
        content: {
          'application/json': {
            schema: basicResponseSchema,
          },
        },
        description: 'Unauthorized',
      },
      413: {
        content: {
          'application/json': {
            schema: basicResponseSchema,
          },
        },
        description: `The file is too large (max size: ${maxFileSize / (1024 * 1024)}MB)`,
      },
      415: {
        content: {
          'application/json': {
            schema: basicResponseSchema,
          },
        },
        description: 'Unsupported media type',
      },
    },
    tags: ['ingest'],
    validateResponse: true,
  }),
  async (context) => {
    const body = await context.req.parseBody();
    const { documentID, file, metadata, mimeType } = body;

    /*
    if the File is loaded to memory, and we need to swap to pure streaming, this is the way:
    let bytesReceived = 0;

    const body = context.req.raw.body;
    const stream = body;

    if (!stream) {
      return context.json({ error: 'Missing request body' }, 400);
    }

    for await (const chunk of stream) {
      const textChunk = new TextDecoder().decode(chunk);
      documentsLogger.debug('\n\nReceived chunk:');
      documentsLogger.debug(JSON.stringify(textChunk));
      documentsLogger.debug({ chunkSize: chunk.length }, 'Chunk size');
      bytesReceived += chunk.length;

      if (bytesReceived > maxFileSize) {
        return context.json(
          { error: 'File size exceeds maximum limit of 50MB' },
          413,
        );
      }
    }
    */
    if (!documentID || typeof documentID !== 'string') {
      throw new HTTPException(400, {
        message: 'No documentID provided',
      });
    }
    if (!file || !(file instanceof File)) {
      throw new HTTPException(400, {
        message: 'No file provided or invalid file format',
      });
    }
    if (file.size > maxFileSize) {
      throw new HTTPException(413, {
        message: `File size exceeds maximum limit of ${maxFileSize / (1024 * 1024)}MB`,
      });
    }
    if (!(await isFileSupported({ filename: file.name }))) {
      throw new HTTPException(415, {
        message: 'File type not supported',
      });
    }
    if (metadata && typeof metadata !== 'string') {
      throw new HTTPException(400, {
        message: 'Metadata must be a string',
      });
    }
    if (mimeType && typeof mimeType !== 'string') {
      throw new HTTPException(400, {
        message: 'Mime type must be a string',
      });
    }

    const parsedMetadata = metadataParser({ metadata });

    const data = Buffer.from(new Uint8Array(await file.arrayBuffer()));

    await addDocument({
      binaryStream: data,
      documentID,
      metadata: parsedMetadata,
      mimeType: mimeType || file.type,
      title: file.name,
    });

    return context.json({ message: 'ok' } satisfies BasicResponse, 202);
  },
);

export { ingestRouter };
