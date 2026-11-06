import * as Sentry from '@sentry/node';
import { config } from './config.js';
import { logger } from './logger.js';

/**
 * Initialize Sentry — no-op when SENTRY_DSN is not configured.
 * Must be called BEFORE any other middleware setup so the request handler
 * can attach transaction context.
 */
export function initSentry(): boolean {
  if (!config.sentryDsn) {
    logger.info({ sentryEnabled: false }, 'Sentry disabled (no DSN configured)');
    return false;
  }

  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.nodeEnv,
    // 1.0 = 100% of events sent in dev; lower in prod if volume grows
    tracesSampleRate: config.isProd ? 0.2 : 1.0,
    profilesSampleRate: 0.1,
    sendDefaultPii: false, // never leak PII (emails, IP) to Sentry
  });

  logger.info({ sentryEnabled: true, env: config.nodeEnv }, 'Sentry initialized');
  return true;
}

/** Capture any error type — wraps unknown values into Error. */
export function captureError(err: unknown, context?: Record<string, unknown>): void {
  if (err instanceof Error) {
    Sentry.captureException(err, { extra: context });
  } else {
    Sentry.captureMessage(String(err), { level: 'error', extra: context });
  }
}
