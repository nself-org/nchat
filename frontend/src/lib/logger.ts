/**
 * Centralized Logger Utility
 * Provides structured logging with Sentry integration for production
 *
 * Replaces console.log statements across the codebase
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  [key: string]: unknown;
}

/**
 * Helper to safely capture with Sentry (only in production runtime)
 */
async function captureSentryError(
  error: Error,
  extra?: LogContext,
): Promise<void> {
  if (typeof window === "undefined" && process.env.NODE_ENV === "production") {
    try {
      // Use dynamic import to avoid bundling issues
      const { captureException } = await import("@sentry/nextjs");
      captureException(error, { extra });
    } catch {
      // Sentry not available or failed to load
    }
  }
}

async function captureSentryMessage(
  message: string,
  level: "info" | "warning",
  extra?: LogContext,
): Promise<void> {
  if (typeof window === "undefined" && process.env.NODE_ENV === "production") {
    try {
      const { captureMessage } = await import("@sentry/nextjs");
      captureMessage(message, { level, extra });
    } catch {
      // Sentry not available or failed to load
    }
  }
}

async function addSentryBreadcrumb(
  message: string,
  data?: LogContext,
): Promise<void> {
  if (typeof window === "undefined" && process.env.NODE_ENV === "production") {
    try {
      const { addBreadcrumb } = await import("@sentry/nextjs");
      addBreadcrumb({ level: "info", message, data });
    } catch {
      // Sentry not available or failed to load
    }
  }
}

/**
 * Logger class for structured logging
 */
class Logger {
  private get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  }

  private get isDevelopment(): boolean {
    return process.env.NODE_ENV === "development";
  }

  /**
   * Debug logging - only shown in development
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      // REMOVED: console.debug(`[DEBUG] ${message}`, context || '')
    }
  }

  /**
   * Info logging - shown in development, sent to Sentry in production
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, context || "");
    } else if (this.isProduction && context) {
      // Fire and forget - don't block on Sentry
      addSentryBreadcrumb(message, context).catch(() => {});
    }
  }

  /**
   * Warning logging - shown in all environments, sent to Sentry in production
   */
  warn(message: string, context?: LogContext): void {
    console.warn(`[WARN] ${message}`, context || "");

    if (this.isProduction) {
      // Fire and forget - don't block on Sentry
      captureSentryMessage(message, "warning", context).catch(() => {});
    }
  }

  /**
   * Error logging - shown in all environments, sent to Sentry in production
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    console.error(`[ERROR] ${message}`, errorObj, context || "");

    if (this.isProduction) {
      // Fire and forget - don't block on Sentry
      captureSentryError(errorObj, { message, ...context }).catch(() => {});
    }
  }

  /**
   * Performance logging - for tracking operation duration
   */
  perf(operation: string, duration: number, context?: LogContext): void {
    this.info(`Performance: ${operation} (${duration}ms)`, {
      ...context,
      operation,
      duration,
      type: "performance",
    });
  }

  /**
   * Security event logging - always logged and sent to Sentry
   */
  security(event: string, context?: LogContext): void {
    const securityContext = {
      ...context,
      type: "security",
      timestamp: Date.now(),
    };

    console.warn(`[SECURITY] ${event}`, securityContext);

    if (this.isProduction) {
      // Fire and forget - don't block on Sentry
      captureSentryMessage(
        `SECURITY: ${event}`,
        "warning",
        securityContext,
      ).catch(() => {});
    }
  }

  /**
   * Audit logging - for compliance and tracking
   */
  audit(action: string, userId: string, context?: LogContext): void {
    const auditContext = {
      ...context,
      userId,
      action,
      type: "audit",
      timestamp: Date.now(),
    };

    this.info(`AUDIT: ${action}`, auditContext);
  }

  /**
   * Log with custom level
   */
  log(level: LogLevel, message: string, context?: LogContext): void {
    switch (level) {
      case "debug":
        this.debug(message, context);
        break;
      case "info":
        this.info(message, context);
        break;
      case "warn":
        this.warn(message, context);
        break;
      case "error":
        this.error(message, undefined, context);
        break;
    }
  }

  /**
   * Create a scoped logger with a prefix
   */
  scope(prefix: string): ScopedLogger {
    return new ScopedLogger(this, prefix);
  }
}

/**
 * Scoped logger with automatic prefix
 */
class ScopedLogger {
  constructor(
    private logger: Logger,
    private prefix: string,
  ) {}

  debug(message: string, context?: LogContext): void {
    this.logger.debug(`[${this.prefix}] ${message}`, context);
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(`[${this.prefix}] ${message}`, context);
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(`[${this.prefix}] ${message}`, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    this.logger.error(`[${this.prefix}] ${message}`, error, context);
  }

  log(level: LogLevel, message: string, context?: LogContext): void {
    this.logger.log(level, `[${this.prefix}] ${message}`, context);
  }

  perf(operation: string, duration: number, context?: LogContext): void {
    this.logger.perf(`[${this.prefix}] ${operation}`, duration, context);
  }

  security(event: string, context?: LogContext): void {
    this.logger.security(`[${this.prefix}] ${event}`, context);
  }

  audit(action: string, userId: string, context?: LogContext): void {
    this.logger.audit(`[${this.prefix}] ${action}`, userId, context);
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Create a scoped logger for a specific module
 *
 * @example
 * ```ts
 * const log = createLogger('BotRuntime')
 * log.info('Bot started', { botId: 'hello-bot' })
 * log.error('Bot failed', error, { botId: 'hello-bot' })
 * ```
 */
export function createLogger(scope: string): ScopedLogger {
  return logger.scope(scope);
}

/**
 * Export logger as default
 */
export default logger;
