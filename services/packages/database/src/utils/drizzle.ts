import { drizzle } from 'drizzle-orm/node-postgres';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../schema/schema.js';

// Export type for use in other files
export type DrizzleDB = NodePgDatabase<typeof schema>;

/**
 * Get a drizzle instance using the provided pg client
 * This ensures we use the same connection pool as the rest of the application
 */
export function getDrizzle(client: any): DrizzleDB {
  return drizzle(client, { schema });
}
