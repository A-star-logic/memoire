import { z } from 'zod';

const DatabaseConfigSchema = z.object({
  connectionUrl: z.string().url('Invalid database connection URL'),
  password: z.string().min(1, 'Database password is required'),
  maxConnections: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),
  idleTimeout: z.coerce
    .number()
    .int()
    .min(1000)
    .max(300000)
    .default(30000),
  connectionTimeout: z.coerce
    .number()
    .int()
    .min(1000)
    .max(60000)
    .default(5000),
});

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

function validateEnvConfig(): DatabaseConfig {
  try {
    return DatabaseConfigSchema.parse({
      connectionUrl: process.env.NEON_DB_URL,
      password: process.env.NEON_DB_PASSWORD,
      maxConnections: process.env.DB_MAX_CONNECTIONS,
      idleTimeout: process.env.DB_IDLE_TIMEOUT,
      connectionTimeout: process.env.DB_CONNECTION_TIMEOUT,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('\n');
      throw new Error(`Database configuration validation failed:\n${issues}`);
    }
    throw error;
  }
}

export const databaseConfig = validateEnvConfig();
