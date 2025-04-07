import { serve } from '@hono/node-server';
import { flushAnalytics, initAnalyticsClient, initPostgreSQL } from 'core/init';
import { getContextLogger } from 'service-reporting/logger';
import type { Environment } from '../../../environment.js';
import { app } from './app.js';

const logger = getContextLogger('index.ts');

// Initialize services
initAnalyticsClient({ env: process.env as Environment });
initPostgreSQL({ env: process.env as Environment });

/**
 * Gracefully shutdown the server
 */
async function shutdown(): Promise<void> {
  try {
    await flushAnalytics();
    logger.info('Analytics flushed successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to flush analytics');
    // eslint-disable-next-line unicorn/no-process-exit -- this is expected
    process.exit(1);
  }
  // eslint-disable-next-line unicorn/no-process-exit -- this is expected
  process.exit(0);
}

process.on('SIGINT', () => {
  logger.info('Server terminating...');
  shutdown().catch((error: unknown) => {
    logger.error({ error }, 'Error during shutdown');
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  logger.info('Server terminating...');
  shutdown().catch((error: unknown) => {
    logger.error({ error }, 'Error during shutdown');
    process.exit(1);
  });
});

// Start the server
serve({
  fetch: app.fetch,
  port: 8787,
});

logger.info('Listening on http://localhost:8787');
