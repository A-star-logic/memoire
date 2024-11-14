/* v8 ignore start */
// libs
import * as Sentry from '@sentry/node';
import { type DestinationStream, pino } from 'pino';
import { PostHog } from 'posthog-node';

if (process.env.POSTHOG_KEY === undefined) {
  throw new Error('Please define POSTHOG_KEY in the env variables');
}
if (
  process.env.NODE_ENV === 'production' &&
  process.env.SENTRY_DSN === undefined
) {
  throw new Error('Please define SENTRY_DSN in the env variables');
}

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    debug: false,
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    integrations: [],
    // Set sampling rate for profiling - this is relative to tracesSampleRate
    profilesSampleRate: 1,
    // release: `backend@${APP_VERSION}`, // todo
    // Performance Monitoring
    tracesSampleRate: 1,
  });
}

export const posthogClient = new PostHog(process.env.POSTHOG_KEY, {
  host: 'https://eu.posthog.com',
});

/**
 * Set the pino transport settings depending on the environment
 * @returns a transport object
 */
function setTransport(): DestinationStream | undefined {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.SHOW_DOC === 'true'
  ) {
    return pino.transport({
      options: { destination: 1 },
      target: 'pino-pretty',
    }) as DestinationStream;
  }

  return undefined;
}

export const logger = pino(
  {
    enabled: !(
      process.env.DEBUG === undefined && process.env.NODE_ENV === 'test'
    ),
    formatters: {},
    level: process.env.DEBUG ? 'debug' : 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  setTransport(),
);
if (process.env.DEBUG) {
  logger.debug('DEBUG mode enabled');
}

export * as Sentry from '@sentry/node';
