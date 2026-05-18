/**
 * Structured Logging Utility
 *
 * Provides consistent logging across the application with
 * structured data, log levels, and context tracking.
 */

import { isDevelopment, isServer } from "@/lib/environment";

// ============================================================================
// Types
// ============================================================================

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  [key: string]: unknown;
  userId?: string;
  requestId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  timestamp: string;
  environment: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// ============================================================================
// Logger Configuration
// ============================================================================

const config = {
  // Minimum log level to output (debug < info < warn < error)
  minLevel: (isDevelopment() ? "debug" : "info") as LogLevel,

  // Whether to include timestamps
  timestamps: true,

  // Whether to include stack traces for errors
  stackTraces: isDevelopment(),

  // Whether to pretty print in development
  prettyPrint: isDevelopment(),
};

const levelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// ============================================================================
// Formatting Functions
// ============================================================================

function shouldLog(level: LogLevel): boolean {
  return levelPriority[level] >= levelPriority[config.minLevel];
}

function formatLogEntry(entry: LogEntry): string {
  if (config.prettyPrint) {
    const parts: string[] = [];

    // Timestamp
    if (config.timestamps) {
      parts.push(`[${new Date(entry.timestamp).toISOString()}]`);
    }

    // Level with color
    const levelColors: Record<LogLevel, string> = {
      debug: "\x1b[90m", // gray
      info: "\x1b[36m", // cyan
      warn: "\x1b[33m", // yellow
      error: "\x1b[31m", // red
    };
    const levelStr = entry.level.toUpperCase().padEnd(5);
    parts.push(`${levelColors[entry.level]}${levelStr}\x1b[0m`);

    // Message
    parts.push(entry.message);

    // Context
    if (entry.context && Object.keys(entry.context).length > 0) {
      parts.push("\n  Context:", JSON.stringify(entry.context, null, 2));
    }

    // Error
    if (entry.error) {
      parts.push("\n  Error:", entry.error.name, "-", entry.error.message);
      if (config.stackTraces && entry.error.stack) {
        parts.push("\n", entry.error.stack);
      }
    }

    return parts.join(" ");
  } else {
    // JSON format for production
    return JSON.stringify(entry);
  }
}

function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error,
): LogEntry {
  return {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
    environment: isDevelopment() ? "development" : "production",
    error: error
      ? {
          name: error.name,
          message: error.message,
          stack: config.stackTraces ? error.stack : undefined,
        }
      : undefined,
  };
}

// ============================================================================
// Logger Class
// ============================================================================

export class Logger {
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const mergedContext = { ...this.context, ...context };
    const entry = createLogEntry("error", message, mergedContext, error);

    if (shouldLog("error")) {
      console.error(formatLogEntry(entry));
    }

    // Send to external error tracking service if configured
    if (!isDevelopment() && isServer()) {
      this.sendToErrorTracking(entry);
    }
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!shouldLog(level)) return;

    const mergedContext = { ...this.context, ...context };
    const entry = createLogEntry(level, message, mergedContext);
    const formatted = formatLogEntry(entry);

    // Output to console based on level
    switch (level) {
      case "debug":
        // REMOVED: console.debug(formatted)
        break;
      case "info":
        console.info(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      case "error":
        console.error(formatted);
        break;
    }
  }

  /**
   * Send error to external tracking service (placeholder)
   */
  private sendToErrorTracking(entry: LogEntry): void {
    // if (process.env.SENTRY_DSN) {
    //   Sentry.captureException(entry.error, { contexts: entry.context })
    // }
  }
}

// ============================================================================
// Default Logger Instance
// ============================================================================

export const logger = new Logger();

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create a logger with specific context
 */
export function createLogger(context: LogContext): Logger {
  return new Logger(context);
}

/**
 * Log a debug message
 */
export function debug(message: string, context?: LogContext): void {
  logger.debug(message, context);
}

/**
 * Log an info message
 */
export function info(message: string, context?: LogContext): void {
  logger.info(message, context);
}

/**
 * Log a warning message
 */
export function warn(message: string, context?: LogContext): void {
  logger.warn(message, context);
}

/**
 * Log an error message
 */
export function error(
  message: string,
  errorObj?: Error,
  context?: LogContext,
): void {
  logger.error(message, errorObj, context);
}

/**
 * Time a function execution
 */
export async function timeAsync<T>(
  label: string,
  fn: () => Promise<T>,
  context?: LogContext,
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    logger.debug(`${label} completed`, {
      ...context,
      durationMs: Math.round(duration),
    });
    return result;
  } catch (err) {
    const duration = performance.now() - start;
    logger.error(
      `${label} failed`,
      err instanceof Error ? err : new Error(String(err)),
      {
        ...context,
        durationMs: Math.round(duration),
      },
    );
    throw err;
  }
}

/**
 * Time a synchronous function execution
 */
export function timeSync<T>(
  label: string,
  fn: () => T,
  context?: LogContext,
): T {
  const start = performance.now();
  try {
    const result = fn();
    const duration = performance.now() - start;
    logger.debug(`${label} completed`, {
      ...context,
      durationMs: Math.round(duration),
    });
    return result;
  } catch (err) {
    const duration = performance.now() - start;
    logger.error(
      `${label} failed`,
      err instanceof Error ? err : new Error(String(err)),
      {
        ...context,
        durationMs: Math.round(duration),
      },
    );
    throw err;
  }
}
