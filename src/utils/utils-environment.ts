// libs
import { config } from 'dotenv';
import { logger } from '../database/reporting/database-external-config.js';

/**
 * Load the .env file
 * Automatic skip it in prod
 */
export function loadEnvironment(): void {
  if (process.env.NODE_ENV !== 'production') {
    logger.debug('Loading .env file');
    config({ path: '.env' }); // when launched from the root
    config({ path: '../../.env' });
  }
}
