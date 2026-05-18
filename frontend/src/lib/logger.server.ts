/**
 * Server-only Logger
 * Pure console logging without Sentry to avoid build issues
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  [key: string]: unknown;
}

/**
 * Logger class for structured logging (server-only version)
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
   * Info logging
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, context || "");
    }
  }

  /**
   * Warning logging
   */
  warn(message: string, context?: LogContext): void {
    console.warn(`[WARN] ${message}`, context || "");
  }

  /**
   * Error logging
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    console.error(`[ERROR] ${message}`, errorObj, context || "");
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
   * Security event logging
   */
  security(event: string, context?: LogContext): void {
    const securityContext = {
      ...context,
      type: "security",
      timestamp: Date.now(),
    };

    console.warn(`[SECURITY] ${event}`, securityContext);
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
 */
export function createLogger(scope: string): ScopedLogger {
  return logger.scope(scope);
}

export default logger;
