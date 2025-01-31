import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.SUPABASE_URL;

let client: null | ReturnType<typeof postgres>;
let databaseLocal: null | ReturnType<typeof drizzle>;

if (connectionString) {
  client = postgres(connectionString, { prepare: false });
  databaseLocal = drizzle(client);
} else {
  /* empty */
}

export { client, databaseLocal as db };
