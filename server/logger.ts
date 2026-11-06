import pino from 'pino';
import { config } from './config.js';

/**
 * Structured logger — JSON in production, pretty-print in development.
 * Use logger.info / logger.warn / logger.error / logger.debug.
 *
 * Example:
 *   logger.info({ userId, endpoint }, 'request completed')
 *   logger.error({ err, userId }, 'analyze failed')
 */
export const logger = pino({
  level: config.isProd ? 'info' : 'debug',
  base: { service: 'innerecho-server' },
  ...(config.isProd
    ? {
        // 生产：纯 JSON，便于接 ELK / Loki / Sentry ingestion
        formatters: { level: (label: string) => ({ level: label }) },
      }
    : {
        // 开发：彩色可读输出
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss.l',
            ignore: 'pid,hostname,service',
            singleLine: false,
          },
        },
      }),
});

/** Helper: safely log an error with stack trace, even if err is a string. */
export function logError(
  err: unknown,
  context?: Record<string, unknown>,
  msg: string = 'error'
): void {
  if (err instanceof Error) {
    logger.error({ err: { message: err.message, stack: err.stack }, ...context }, msg);
  } else {
    logger.error({ err: String(err), ...context }, msg);
  }
}
