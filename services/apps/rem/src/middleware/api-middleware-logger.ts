import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import { getContextLogger } from 'service-reporting/logger';

const logger = getContextLogger('api-middleware-logger.ts');

export const loggerMiddleware = createMiddleware(
  async (context: Context, next) => {
    const start = Date.now();
    await next();
    const end = Date.now();
    const log = `${context.res.status} ${context.req.method} ${context.req.path} - ${end - start} ms`;
    logger.info(log);
  },
);
