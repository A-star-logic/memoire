/* v8 ignore start */
// libs
/* eslint-disable import-x/no-named-as-default -- this is from libraries */
import multipart from '@fastify/multipart';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
/* eslint-enable import-x/no-named-as-default -- this is from libraries */

// DB
import { logger } from '../database/reporting/database-external-config.js';

// server
import { setupServer } from '../server/server-init.js';

// API
import { documentRouter } from './document/api-document-routes.js';
import { ingestRouter } from './ingest/api-ingest-routes.js';
import { searchRouter } from './search/api-search-routes.js';

// server
export const app = await setupServer();
await app.register(multipart);

// documentation (dev only)
if (process.env.NODE_ENV === 'development' || process.env.SHOW_DOC === 'true') {
  await app.register(fastifySwagger, {
    openapi: {
      components: {
        securitySchemes: {
          bearerAuth: {
            bearerFormat: 'JWT',
            scheme: 'bearer',
            type: 'http',
          },
        },
      },
      openapi: '3.0.0',
      servers: [
        {
          description: 'Docker local',
          url: 'http://localhost:3003',
        },
      ],
    },
  });
}

// routes
await app.register(searchRouter, { prefix: '/memoire' });
await app.register(ingestRouter, { prefix: '/memoire' });
await app.register(documentRouter, { prefix: '/memoire' });

// documentation (dev only)
if (process.env.NODE_ENV === 'development' || process.env.SHOW_DOC === 'true') {
  logger.info('Documentation endpoint enabled');
  await app.register(fastifySwaggerUi, { routePrefix: '/docs' });
}
