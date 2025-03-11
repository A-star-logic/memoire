import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
const { Pool } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.NEON_DB_URL,
    ssl: {
      rejectUnauthorized: false // Required for Neon Postgres
    }
  });

  try {
    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // List of migrations to execute in order
    const migrations = [
      {
        name: '001_create_documents_table',
        path: '../migrations/001_create_documents_table.sql'
      },
      {
        name: '002_create_chunks_table',
        path: '../migrations/002_create_chunks_table.sql'
      },
      {
        name: '003_add_chunks_document_id_index',
        path: '../migrations/003_add_chunks_document_id_index.sql'
      }
    ];

    for (const migration of migrations) {
      // Check if migration was already executed
      const { rows } = await pool.query<{ name: string }>(
        'SELECT name FROM migrations WHERE name = $1',
        [migration.name]
      );

      if (rows.length === 0) {
        // Read and execute the migration file
        const migrationPath = join(__dirname, migration.path);
        const migrationContent = await readFile(migrationPath, 'utf-8');
        
        // Execute migration
        await pool.query(migrationContent);
        
        // Record migration execution
        await pool.query(
          'INSERT INTO migrations (name) VALUES ($1)',
          [migration.name]
        );
        
        console.log(`Migration ${migration.name} executed successfully`);
      } else {
        console.log(`Migration ${migration.name} already executed`);
      }
    }
  } catch (error: unknown) {
    console.error('Error executing migration:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
