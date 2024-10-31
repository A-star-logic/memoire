// libs
import type {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import fp from 'fastify-plugin';

// config
import { logger } from '../../database/reporting/database-external-config.js';

/**
 * Redact an url from query, q, code or state
 * @param url the url to redact
 * @returns the censored url
 */
function redactUrl(url: string): string {
  // Replace the q, query state and code parameters from url https://regex101.com/r/Rlmmhz/1
  const queryRegex = /(?<=[&?]query=|q=|code=|state=)[^\n\r&]*/gm;
  const trimmedUrl = url.replaceAll(queryRegex, '[REDACTED]');

  return trimmedUrl;
}

export const loggingPlugin = fp(
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
        const url = redactUrl(request.url);
        if (!url.includes('liveness') && !url.includes('/docs/')) {
          const logObject = {
            from: request.ip,
            id: request.id,
            responseTime: reply.elapsedTime,
            statusCode: reply.raw.statusCode,
            url,
          };
          if (code >= 500) {
            logger.error(
              logObject,
              `${request.id} - ${request.method} - ${url}`,
            );
          }
          if (code >= 400 && code < 500) {
            logger.warn(
              logObject,
              `${request.id} - ${request.method} - ${url}`,
            );
          }
          if (code < 400 && !url.includes('liveness')) {
            logger.info(
              logObject,
              `${request.id} - ${request.method} - ${url}`,
            );
          }
        }
      },
    );
  },
);
