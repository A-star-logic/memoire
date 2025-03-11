import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

if (process.env.DATABASE_URL_TEST) console.log('drizzle config: test');

export default defineConfig({
  out: './drizzle',
  schema:
    './services/packages/database/src/postgresql-config/database-postgresql-schemas.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL!,
  },
});
