import { z } from 'zod';

const TestConfigSchema = z.object({
  connectionUrl: z.string().url('Invalid database connection URL'),
  maxConnections: z.coerce.number().int().min(1).max(100).default(20),
  idleTimeout: z.coerce.number().int().min(1000).max(300000).default(30000),
  connectionTimeout: z.coerce.number().int().min(1000).max(60000).default(5000),
});

export type TestConfig = z.infer<typeof TestConfigSchema>;

// Test-specific configuration that matches our project's Neon Postgres setup
export const testConfig = TestConfigSchema.parse({
  connectionUrl: 'postgresql://neondb_owner:npg_SPH8D4jYvWNa@ep-royal-morning-a9jlhlvf-pooler.gwc.azure.neon.tech/neondb?sslmode=require',
  maxConnections: 20,
  idleTimeout: 30000,
  connectionTimeout: 5000,
});
