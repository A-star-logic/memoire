// libs
import type {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import { apiUsageReport } from '@astarlogic/services-database/reporting';
import fp from 'fastify-plugin';

export const apiAnalyticsPlugin = fp(
  /**
   * This plugin add a response hook for logging
   *
   * We are using this instead of the default logging to reduce the number of logs (only the response logs instead of both request and response)
   *   and to personalise those logs with only the data we need
   * @param app fastify's application
   * @param _options there is no options for this plugin
   */
  async (app: FastifyInstance, _options: FastifyPluginOptions) => {
    app.addHook(
      'onResponse',
      async (request: FastifyRequest, reply: FastifyReply) => {
        const code = reply.raw.statusCode;
        const { method, url } = request;
        const timing = reply.elapsedTime;

        await apiUsageReport({
          code,
          method,
          timing,
          url,
        });
      },
    );
  },
);
