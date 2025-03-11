import pg from 'pg';
const { Pool } = pg;

import { databaseConfig } from '../config/database.config';

// Re-export config types
export type { DatabaseConfig } from '../config/database.config';
import { Pool } from 'pg';
import { databaseConfig } from '@astarlogic/services-database/config';

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool: Pool;

  private constructor() {
    this.pool = new Pool({
      connectionString: databaseConfig.connectionUrl,
      max: databaseConfig.maxConnections,
      idleTimeoutMillis: databaseConfig.idleTimeout,
      connectionTimeoutMillis: databaseConfig.connectionTimeout,
      ssl: {
        rejectUnauthorized: false, // Required for Neon Postgres
      },
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async query<T>(text: string, params?: any[]): Promise<T[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  public async getClient() {
    return await this.pool.connect();
  }

  public async end() {
    await this.pool.end();
  }
}

export const db = DatabaseConnection.getInstance();
