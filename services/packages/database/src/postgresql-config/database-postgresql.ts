import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { logger } from '@astarlogic/services-database/reporting';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import type { Environment } from '../../../../environment.js';

export let pgDatabase: NeonHttpDatabase;
const databaseLogger = logger.child({ context: 'database-pg.ts' });

/**
 * Initialize the connection to the PostgreSQL database
 * @param root named parameters
 * @param root.env environment variables
 */
export function initPostgreSQL({ env }: { env: Environment }): void {
  /* v8 ignore start */
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  if (env.NODE_ENV === 'test') {
    databaseLogger.info('Initializing PostgreSQL for test environment');
    const url = env.DATABASE_URL_TEST ?? env.DATABASE_URL;
    const client = neon(url);
    pgDatabase = drizzle(client);
  } else {
    databaseLogger.info('Initializing PostgreSQL for production environment');
    const client = neon(env.DATABASE_URL);
    pgDatabase = drizzle(client);
  }
}
/* v8 ignore end */
