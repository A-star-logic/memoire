/* eslint-disable import-x/no-named-as-default */
/* v8 ignore start */
// libs
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

// server
import { setupServer } from '../server/server-init.js';

// api
import { logger } from '../database/reporting/database-external-config.js';
import { searchRouter } from './search/api-search-routes.js';

// server
export const app = await setupServer();

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
await app.register(searchRouter, { prefix: '/search' });

// documentation (dev only)
if (process.env.NODE_ENV === 'development' || process.env.SHOW_DOC === 'true') {
  logger.info('Documentation endpoint enabled');
  await app.register(fastifySwaggerUi, { routePrefix: '/docs' });
}
