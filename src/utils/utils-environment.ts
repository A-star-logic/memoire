// libs
import { config } from 'dotenv';

/**
 * Load the .env file
 * Automatic skip it in prod
 */
export function loadEnvironment(): void {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log('Loading .env file');
    config({ path: '.env' }); // when launched from the root
    config({ path: '../../.env' });
  }
}
