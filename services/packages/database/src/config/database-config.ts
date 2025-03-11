import { Type } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';

export const DatabaseConfigSchema = Type.Object({
  connectionTimeout: Type.Number({ default: 3000 }),
  databaseUrl: Type.String(),
  idleTimeout: Type.Number({ default: 10_000 }),
  maxConnections: Type.Number({ default: 20 }),
});

export type DatabaseConfig = typeof DatabaseConfigSchema.static;

const configValidator = TypeCompiler.Compile(DatabaseConfigSchema);

/**
 * Retrieves and validates database configuration from environment variables
 * @returns Validated database configuration
 */
export function getDatabaseConfig(): DatabaseConfig {
  const connectionTimeout = Number(process.env.DB_CONNECTION_TIMEOUT ?? '3000');
  const databaseUrl =
    process.env.DATABASE_URL ??
    'postgresql://neondb_owner:npg_SPH8D4jYvWNa@ep-royal-morning-a9jlhlvf-pooler.gwc.azure.neon.tech/neondb?sslmode=require';
  const idleTimeout = Number(process.env.DB_IDLE_TIMEOUT ?? '10000');
  const maxConnections = Number(process.env.DB_MAX_CONNECTIONS ?? '20');

  const config = {
    connectionTimeout,
    databaseUrl,
    idleTimeout,
    maxConnections,
  };

  if (!configValidator.Check(config)) {
    throw new Error('Invalid database configuration');
  }

  return config;
}
