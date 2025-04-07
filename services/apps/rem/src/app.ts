import { apiReference } from '@scalar/hono-api-reference';
import { Hono } from 'hono';
import { openAPISpecs } from 'hono-openapi';
import { getContextLogger } from 'service-reporting/logger';
import type { Environment } from '../../../environment.d.ts';
import type { Variables } from './context.js';
import { loggerMiddleware } from './middleware/api-middleware-logger.js';
import { tokenAuthMiddleware } from './middleware/api-middleware-token-auth.js';
import { ingestRouter } from './routes/api-routes-ingest.js';

const logger = getContextLogger('app.ts');

const app = new Hono<{ Bindings: Environment; Variables: Variables }>();

if (process.env.NODE_ENV === 'development') {
  logger.info('documentation available at http://localhost:8787/docs');
  app.get(
    '/openapi',
    openAPISpecs(app, {
      documentation: {
        components: {
          securitySchemes: {
            bearerAuth: {
              bearerFormat: 'JWT',
              scheme: 'bearer',
              type: 'http',
            },
          },
        },
        info: {
          title: 'Memoire',
          version: '0',
        },
        openapi: '3.0.0',
        security: [{ bearerAuth: [] }],
        servers: [
          { description: 'Local Server', url: 'http://localhost:8787' },
        ],
      },
    }),
  );
  app.get(
    '/docs',
    apiReference({
      // @ts-expect-error -- no idea why this is complaining, it works fine and the docs is similar to this
      spec: { url: '/openapi' },
    }),
  );
}

app.use(loggerMiddleware);
app.use(tokenAuthMiddleware);
app.route('/memoire/ingest', ingestRouter);
export { app };
