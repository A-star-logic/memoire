// libs
import { afterAll, beforeAll } from 'vitest';

// local imports
import { getDatabaseClient } from '../../../client/database-client.js';

// Setup database connection before tests
beforeAll(async () => {
  // Initialize database connection
  getDatabaseClient();
});

// Close database connection after tests
afterAll(async () => {
  const database = getDatabaseClient();
  await database.pool.end();
});
