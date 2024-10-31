// libs
import type {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import fp from 'fastify-plugin';

// server
import type { CustomRequest } from '../types.js';
import { tokenAuth } from '../auth/server-auth.js';

/**
 * This plugin decorates fastify with authentication functions
 *
 * This decorator will automatically reject a request if the verification fails
 * @param app fastify's application
 * @param _options there is no options for this plugin
 */
export const authPlugin = fp(
  async (app: FastifyInstance, _options: FastifyPluginOptions) => {
    app.decorate(
      'token_auth',
      async (request: FastifyRequest, _reply: FastifyReply) => {
        await tokenAuth({ request: request as CustomRequest });
      },
    );
  },
);
