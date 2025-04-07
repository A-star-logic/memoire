import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import crypto from 'node:crypto';
import { getContextLogger } from 'service-reporting/logger';
const logger = getContextLogger('api-middleware-token-auth.ts');

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error('API_KEY is not set');
}

export const tokenAuthMiddleware = createMiddleware(
  async (context: Context, next) => {
    const token = context.req.header('authorization');

    if (!token?.startsWith('Bearer ')) {
      throw new HTTPException(401, {
        message: 'Unauthorized',
      });
    }

    const tokenValue = token.replace('Bearer ', '');
    if (process.env.NODE_ENV === 'test' && tokenValue === 'testToken') {
      logger.debug('Test token accepted');
      await next();
    } else {
      const sentToken = Buffer.from(tokenValue);
      const secret = Buffer.from(API_KEY);
      if (
        secret.length === sentToken.length &&
        crypto.timingSafeEqual(secret, sentToken)
      ) {
        logger.debug('Token accepted');
        await next();
      } else {
        logger.debug('Token rejected');
        throw new HTTPException(401, {
          message: 'Unauthorized',
        });
      }
    }
  },
);
