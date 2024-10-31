/* v8 ignore start */
/* eslint-disable @typescript-eslint/no-explicit-any */
// libs
import type { FastifyInstance, FastifyRequest } from 'fastify';

export interface CustomRequest extends FastifyRequest {
  authType: 'apiToken';
  tokenType: 'development' | 'management' | 'production';
}

export interface CustomFastifyInstance extends FastifyInstance {
  /**
   * The api token authentication
   */
  token_auth?: any;
}
