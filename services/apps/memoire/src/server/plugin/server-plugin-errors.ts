// libs
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { logger, Sentry } from '@astarlogic/services-database/reporting';
import fp from 'fastify-plugin';

/**
 * This plugin handle the errors. It will log the trace and send the object to Sentry
 * For any 5xx error, it will also censor the returned message
 * @param app fastify's application
 * @param _options there is no options for this plugin
 */
export const errorPlugin = fp(
  async (app: FastifyInstance, _options: FastifyPluginOptions) => {
    app.setErrorHandler(async (error, request, _reply) => {
      const log = `Error code: ${error.statusCode} Message: ${error.message} Req Id: ${request.id}`;
      if (error.statusCode === undefined || error.statusCode >= 500) {
        logger.error({ error }, log);
        Sentry.captureMessage(log, 'error');
        throw { message: 'Server Error', statusCode: error.statusCode };
      }

      if (error.statusCode >= 400 && error.statusCode < 500) {
        logger.warn({ error }, log);
      }
      throw { message: error.message, statusCode: error.statusCode };
    });
  },
);
