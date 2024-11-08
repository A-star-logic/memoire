// libs
import { config } from 'dotenv';

let loaded = false;

/**
 * Load the .env file, no matter where the script is called.
 * Automatic skip it in prod
 */
export function loadEnvironment(): void {
  if (process.env.NODE_ENV !== 'production' && !loaded) {
    config({ path: '.env' });
    loaded = true;
    // eslint-disable-next-line no-console
    console.log('.env loaded');
  }
}
