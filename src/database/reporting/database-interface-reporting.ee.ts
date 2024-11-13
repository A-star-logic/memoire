// external storage
import { logger, posthogClient, Sentry } from './database-external-config.js';

/**
 * handle reporting for errors. By adding the customer ID the error will also be reported to customers
 * @param root named parameters
 * @param root.error the error trace object
 * @param root.message the message to log. Note this message will also be the one customers will see.
 */
export async function errorReport({
  error,
  message,
}: {
  error: unknown;
  message: string;
}): Promise<void> {
  logger.error(error, message);
  Sentry.captureException(error);
}

/**
 * Record the api was used, important for billing, customers' analytics and our analytics
 * @param root named parameters
 * @param root.code the api code returned
 * @param root.method the REST method used
 * @param root.timing the time elapsed to answer the request
 * @param root.url the url requested
 */
export async function apiUsageReport({
  code,
  method,
  timing,
  url,
}: {
  code: number;
  method: string;
  timing: number;
  url: string;
}): Promise<void> {
  // filter out liveness and doc requests
  if (url.includes('liveness') || url.includes('/docs/')) return;
  posthogClient.capture({
    distinctId: 'anonymous',
    event: 'use API',
    properties: {
      // eslint-disable-next-line camelcase
      $process_person_profile: false,
      code,
      method,
      timing,
      url,
    },
  });
}

/**
 * Generate an application performance monitoring report
 * @param root named parameters
 * @param root.event the event name
 * @param root.properties the properties to associate with the event
 */
export async function apmReport({
  event,
  properties,
}: {
  event: string;
  properties: {
    [key: string]: unknown;
  };
}): Promise<void> {
  logger.debug(properties, `APM event: ${event}`);
  posthogClient.capture({
    distinctId: 'anonymous',
    event,
    properties: {
      // eslint-disable-next-line camelcase
      $process_person_profile: false,
      ...properties,
    },
  });
}

export { logger, posthogClient, Sentry } from './database-external-config.js';
