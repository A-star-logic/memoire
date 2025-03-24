import type { DestinationStream } from 'pino';
import { pino } from 'pino';

/**
 * Set the pino transport settings depending on the environment
 * @returns a transport object
 */
function setTransport(): DestinationStream | undefined {
  if (process.env.NODE_ENV === 'development') {
    return pino.transport({
      options: { destination: 1 },
      target: 'pino-pretty',
    }) as DestinationStream;
  }

  return undefined;
}

const logger = pino(
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

/**
 * Get a child logger with a specific context
 * @param context The context to add to the logger
 * @returns A child logger with the specified context
 */
export function getContextLogger(context: string): pino.Logger {
  return logger.child({ context });
}
