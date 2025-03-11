import { sql } from 'drizzle-orm';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DatabaseInstance } from '../client/database-client.js';
import { getDatabaseClient } from '../client/database-client.js';

const filePath = fileURLToPath(import.meta.url);
const directoryPath = path.dirname(filePath);

/**
 * Executes database migrations to set up the schema
 * @throws Error if migration fails
 */
async function migrate(): Promise<void> {
  const database: DatabaseInstance = getDatabaseClient();

  try {
    // Read and execute the migration SQL
    const migrationPath = path.join(
      directoryPath,
      '0001_create_documents_table.sql',
    );
    const migrationSql = await readFile(migrationPath, 'utf8');

    await database.execute(sql.raw(migrationSql));
  } catch (error: unknown) {
    throw new Error(
      `Migration failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    await database.pool.end();
  }
}

await migrate();
