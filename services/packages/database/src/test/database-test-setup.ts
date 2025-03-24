import { sql } from 'drizzle-orm';
import { beforeAll, beforeEach, vi } from 'vitest';
import type { Environment } from '../../../../environment.js';
import { initPostgreSQL, pgDatabase } from '../config/database-postgresql.js';
import { documentsTable } from '../document/database-document-schemas.js';
import { searchChunksTable } from '../search/database-search-schemas.js';

beforeAll(async () => {
  initPostgreSQL({ env: process.env as Environment });
});

beforeEach(async () => {
  await pgDatabase.execute(sql`TRUNCATE TABLE ${searchChunksTable}`);
  await pgDatabase.execute(sql`TRUNCATE TABLE ${documentsTable}`);
  vi.clearAllMocks();
});
