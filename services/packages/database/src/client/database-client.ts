import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { getDatabaseConfig } from '../config/database-config.js';

export interface DatabaseInstance extends NodePgDatabase {
  pool: pg.Pool;
}

let databaseClient: DatabaseInstance | undefined = undefined;

/**
 * Gets the singleton database client instance
 * @returns Drizzle ORM instance with pool
 */
export function getDatabaseClient(): DatabaseInstance {
  if (!databaseClient) {
    databaseClient = createDatabaseClient();
  }
  return databaseClient;
}

/**
 * Creates a new database client with connection pooling
 * @returns Drizzle ORM instance with configured pool
 */
function createDatabaseClient(): DatabaseInstance {
  const config = getDatabaseConfig();
  const pool = new pg.Pool({
    connectionString: config.databaseUrl,
    connectionTimeoutMillis: config.connectionTimeout,
    idleTimeoutMillis: config.idleTimeout,
    max: config.maxConnections,
    ssl: {
      rejectUnauthorized: true,
    },
  });

  const databaseInstance = drizzle(pool) as unknown as DatabaseInstance;
  databaseInstance.pool = pool;
  return databaseInstance;
}
