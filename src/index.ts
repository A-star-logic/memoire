/* eslint-disable unicorn/no-process-exit */
// libs
import { createHttpTerminator } from 'http-terminator';

// utils
import packageJson from '../package.json' with { type: 'json' };

// api
import { app } from './api/api-config.js';

// DB
import {
  logger,
  posthogClient,
  Sentry,
} from './database/reporting/database-external-config.js';

await app.ready();
await app.listen({
  host: '0.0.0.0',
  port: 3003,
});
logger.info(
  `${packageJson.name} version ${packageJson.version} running in ${process.env.NODE_ENV} mode on port 3003.`,
);
if (process.env.NODE_ENV === 'development' || process.env.SHOW_DOC) {
  logger.info(
    '\n\n\nDocumentation available at http://localhost:3003/docs\n\n\n',
  );
}
const httpTerminator = createHttpTerminator({ server: app.server });

/**
 * take care of the server exiting
 * @param code the exit code
 * @param timeout how long until to force kill
 */
export async function handleExit(
  code: number,
  timeout = 10_000,
): Promise<void> {
  try {
    logger.info(`Attempting a graceful shutdown with code ${code}`);

    await posthogClient.shutdown();
    await Sentry.close();

    setTimeout(() => {
      logger.info(`Forcing a shutdown with code ${code}`);
      process.exit(code);
    }, timeout).unref();

    if (app.server.listening) {
      logger.info('Terminating ongoing connections');
      await httpTerminator.terminate();
      logger.info('Closing the app');
      await app.close();
    }

    logger.info(`Exiting gracefully with code ${code}`);
    process.exit(code);
  } catch (error) {
    logger.error(error, 'Error shutting down gracefully');
    logger.error(`Forcing exit with code ${code}`);
    process.exit(code);
  }
}

process.on('unhandledRejection', (reason: Error) => {
  const message = `Unhandled Rejection: ${reason instanceof Error ? reason.message : reason}`;
  logger.fatal(reason, message);
  Sentry.captureException(reason, { level: 'fatal' });
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  handleExit(1);
});

process.on('uncaughtException', (error: Error) => {
  const message = `Uncaught Exception: ${error.message}`;
  logger.fatal(error, message);
  Sentry.captureException(error, { level: 'fatal' });
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  handleExit(1);
});
process.on('SIGTERM', () => {
  logger.info(`Process ${process.pid} received SIGTERM: Exiting with code 0`);
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  handleExit(0);
});
process.on('SIGINT', () => {
  logger.info(`Process ${process.pid} received SIGINT: Exiting with code 0`);
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  handleExit(0);
});
