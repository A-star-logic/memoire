// This module must be imported before any other imports to set up the test environment
import { testConfig } from './test-config.js';

// Set up environment variables before any database imports
Object.assign(process.env, {
  NEON_DB_URL: testConfig.connectionUrl,
  DB_MAX_CONNECTIONS: String(testConfig.maxConnections),
  DB_IDLE_TIMEOUT: String(testConfig.idleTimeout),
  DB_CONNECTION_TIMEOUT: String(testConfig.connectionTimeout),
  POSTHOG_KEY: 'dummy_key_for_tests'
});
