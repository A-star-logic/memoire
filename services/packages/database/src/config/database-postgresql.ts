import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { getContextLogger } from 'service-reporting/logger';
import type { Environment } from '../../../../environment.js';

const logger = getContextLogger('database-postgresql');

export let pgDatabase: NeonHttpDatabase;
const databaseLogger = logger.child({ context: 'database-pg.ts' });

/**
 * Initialize the connection to the PostgreSQL database
 * @param root named parameters
 * @param root.env environment variables
 */
export function initPostgreSQL({ env }: { env: Environment }): void {
  /* v8 ignore start */
  env.DATABASE_URL =
    'postgresql://neondb_owner:npg_SPH8D4jYvWNa@ep-royal-morning-a9jlhlvf-pooler.gwc.azure.neon.tech/neondb?sslmode=require';
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  if (env.NODE_ENV === 'test') {
    databaseLogger.info('Initializing PostgreSQL for test environment');
    const url = env.DATABASE_URL_TEST ?? env.DATABASE_URL;
    const client = neon(url);
    pgDatabase = drizzle(client);
    addExtensions();
  } else {
    databaseLogger.info('Initializing PostgreSQL for production environment');
    const client = neon(env.DATABASE_URL);
    pgDatabase = drizzle(client);
    addExtensions();
  }
}

/**
 *
 */
function addExtensions(): void {
  pgDatabase.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
}
/* v8 ignore end */
