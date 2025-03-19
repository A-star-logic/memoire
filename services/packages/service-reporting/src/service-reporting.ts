import { PostHog } from 'posthog-node';
import type { Environment } from '../../../environment.js';
import { getContextLogger } from './service-logger.js';
const logger = getContextLogger('service-reporting');

export let analytics: PostHog;

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
  analytics.capture({
    distinctId: 'anonymous',
    event,
    properties: {
      // eslint-disable-next-line camelcase -- not our code
      $process_person_profile: false,
      ...properties,
    },
  });
}

/**
 * Report an error
 * @param root named parameters
 * @param root.error the error to report
 * @param root.message the message to report
 */
export async function errorReport({
  error,
  message,
}: {
  error: unknown;
  message: string;
}): Promise<void> {
  analytics.captureException(error, 'anonymous', { message });
}

/**
 * Shutdown the analytics client
 */
export async function flushAnalytics(): Promise<void> {
  await analytics.shutdown();
}

/**
 * Get the analytics client
 * @param root named parameters
 * @param root.env the environment variables
 */
export function initAnalyticsClient({ env }: { env: Environment }): void {
  if (!env.POSTHOG_KEY) {
    throw new Error('POSTHOG_KEY is not set');
  }

  const posthog = new PostHog(env.POSTHOG_KEY, {
    enableExceptionAutocapture: true,
    fetch: fetch.bind(globalThis),
    host: 'https://eu.i.posthog.com',
    privacyMode: true,
  });
  analytics = posthog;
}
