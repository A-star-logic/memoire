// node
import v8 from 'node:v8';

// libs
import compress from '@fastify/compress';
import helmet from '@fastify/helmet';
import {
  type TypeBoxTypeProvider,
  TypeBoxValidatorCompiler,
} from '@fastify/type-provider-typebox';
import underPressure from '@fastify/under-pressure';
import Fastify, { type FastifyInstance } from 'fastify';

// database
import { logger } from '../database/reporting/database-external-config.js';

// middleware
import { apiAnalyticsPlugin } from './plugin/server-plugin-analytics.js';
import { authPlugin } from './plugin/server-plugin-auth.js';
import { errorPlugin } from './plugin/server-plugin-errors.js';
import { loggingPlugin } from './plugin/server-plugin-logging.js';

/**
 * Setup an http server
 * @returns the application with the default settings applied (probe + auth)
 */
export async function setupServer(): Promise<FastifyInstance> {
  // server setup
  const app = Fastify({
    disableRequestLogging: true,
    logger: false, // we already use our own logger (even if this is also Pino)
  })
    .setValidatorCompiler(TypeBoxValidatorCompiler)
    .withTypeProvider<TypeBoxTypeProvider>();

  // logging & analytics
  await app.register(loggingPlugin);
  await app.register(apiAnalyticsPlugin);

  // server limits
  /* v8 ignore start */
  // based on: https://stackoverflow.com/a/64145668/9020761
  await app.register(underPressure, {
    maxEventLoopDelay: 1000,
    maxHeapUsedBytes: v8.getHeapStatistics().heap_size_limit,
    maxRssBytes: v8.getHeapStatistics().total_available_size,
    pressureHandler: (request, _reply, type, value) => {
      // eslint-disable-next-line import-x/no-named-as-default-member
      if (type === underPressure.TYPE_HEAP_USED_BYTES) {
        logger.warn(`too many heap bytes used: ${value}`);
        // eslint-disable-next-line import-x/no-named-as-default-member
      } else if (type === underPressure.TYPE_RSS_BYTES) {
        logger.warn(`too many rss bytes used: ${value}`);
      }

      // any 5xx error on this endpoint will trigger a kill from Kubernetes
      if (!request.url.includes('liveness')) {
        throw { message: 'under pressure', statusCode: 503 };
      }
    },
  });
  /* v8 ignore stop */

  // compression
  await app.register(compress);

  // errors
  await app.register(errorPlugin);

  await app.register(helmet);
  await app.register(authPlugin);

  return app;
}
