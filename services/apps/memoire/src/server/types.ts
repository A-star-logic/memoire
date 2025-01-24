/* v8 ignore start */
// libs
import type { FastifyInstance, FastifyRequest } from 'fastify';

export interface CustomFastifyInstance extends FastifyInstance {
  /**
   * The api token authentication
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any is ok here, the actual type is convoluted in the fastify plugin and adds no real value
  token_auth?: any;
}

export interface CustomRequest extends FastifyRequest {
  authType: 'apiToken';
  tokenType: 'development' | 'management' | 'production';
}
