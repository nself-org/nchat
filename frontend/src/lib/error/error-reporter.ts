import { isDevelopment } from "@/lib/environment";

import { logger } from "@/lib/logger";

interface ErrorContext {
  componentStack?: string;
  componentName?: string;
  context?: Record<string, unknown>;
  userInitiated?: boolean;
  silent?: boolean;
  tags?: string[];
}

interface UserInfo {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
}

interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  componentName?: string;
  context?: Record<string, unknown>;
  userInfo?: UserInfo;
  url: string;
  userAgent: string;
  timestamp: string;
  environment: "development" | "production";
  tags?: string[];
}

interface ReporterConfig {
  /**
   * Endpoint to send error reports
   */
  endpoint?: string;
  /**
   * Whether to send reports in development
   */
  reportInDevelopment?: boolean;
  /**
   * Maximum reports per minute (rate limiting)
   */
  maxReportsPerMinute?: number;
  /**
   * Custom headers for API requests
   */
  headers?: Record<string, string>;
  /**
   * Callback when error is reported
   */
  onReport?: (report: ErrorReport) => void;
  /**
   * Callback when reporting fails
   */
  onReportError?: (error: Error) => void;
}

const DEFAULT_CONFIG: ReporterConfig = {
  endpoint: "/api/errors",
  reportInDevelopment: false,
  maxReportsPerMinute: 10,
};

/**
 * Error reporter that sends errors to the backend.
 * Includes rate limiting, context gathering, and user info.
 */
class ErrorReporter {
  private config: ReporterConfig;
  private reportCount = 0;
  private lastResetTime = Date.now();
  private userInfo: UserInfo | null = null;
  private reportQueue: ErrorReport[] = [];
  private isProcessingQueue = false;

  constructor(config: Partial<ReporterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set the current user info for error reports
   */
  setUser(user: UserInfo | null): void {
    this.userInfo = user;
  }

  /**
   * Update configuration
   */
  configure(config: Partial<ReporterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if rate limit is exceeded
   */
  private isRateLimited(): boolean {
    const now = Date.now();
    const oneMinute = 60 * 1000;

    // Reset counter every minute
    if (now - this.lastResetTime > oneMinute) {
      this.reportCount = 0;
      this.lastResetTime = now;
    }

    return this.reportCount >= (this.config.maxReportsPerMinute || 10);
  }

  /**
   * Build error report from error and context
   */
  private buildReport(error: Error, context?: ErrorContext): ErrorReport {
    return {
      message: error.message,
      stack: error.stack,
      componentStack: context?.componentStack,
      componentName: context?.componentName,
      context: context?.context,
      userInfo: this.userInfo || undefined,
      url: typeof window !== "undefined" ? window.location.href : "server",
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : "server",
      timestamp: new Date().toISOString(),
      environment: isDevelopment() ? "development" : "production",
      tags: context?.tags,
    };
  }

  /**
   * Send report to backend
   */
  private async sendReport(report: ErrorReport): Promise<void> {
    const { endpoint, headers, onReport, onReportError } = this.config;

    if (!endpoint) {
      return;
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify(report),
      });

      if (!response.ok) {
        throw new Error(`Error reporting failed: ${response.status}`);
      }

      onReport?.(report);
    } catch (error) {
      if (isDevelopment()) {
        logger.error("Failed to send error report:", error);
      }
      onReportError?.(error as Error);
    }
  }

  /**
   * Process queued reports
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.reportQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.reportQueue.length > 0 && !this.isRateLimited()) {
      const report = this.reportQueue.shift();
      if (report) {
        await this.sendReport(report);
        this.reportCount++;
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Report an error
   */
  async reportError(error: Error, context?: ErrorContext): Promise<void> {
    // Always log to console in development
    if (isDevelopment()) {
      logger.error("Error reported:", error);
      if (context?.componentStack) {
        logger.error("Component stack:", context.componentStack);
      }
    }

    // Skip reporting in development unless configured otherwise
    if (isDevelopment() && !this.config.reportInDevelopment) {
      return;
    }

    // Check rate limit
    if (this.isRateLimited()) {
      if (isDevelopment()) {
        logger.warn("Error reporting rate limited");
      }
      return;
    }

    const report = this.buildReport(error, context);

    // Queue the report
    this.reportQueue.push(report);

    // Process queue
    await this.processQueue();
  }

  /**
   * Report a warning (non-critical error)
   */
  async reportWarning(message: string, context?: ErrorContext): Promise<void> {
    const error = new Error(message);
    error.name = "Warning";
    await this.reportError(error, {
      ...context,
      tags: [...(context?.tags || []), "warning"],
    });
  }

  /**
   * Report an info event (for tracking)
   */
  async reportInfo(message: string, context?: ErrorContext): Promise<void> {
    if (isDevelopment()) {
      console.info("Info reported:", message);
      return;
    }

    const error = new Error(message);
    error.name = "Info";
    await this.reportError(error, {
      ...context,
      tags: [...(context?.tags || []), "info"],
      silent: true,
    });
  }

  /**
   * Capture unhandled promise rejections
   */
  captureUnhandledRejections(): () => void {
    const handler = (event: PromiseRejectionEvent) => {
      const error =
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason));

      this.reportError(error, {
        tags: ["unhandled-rejection"],
      });
    };

    if (typeof window !== "undefined") {
      window.addEventListener("unhandledrejection", handler);
      return () => window.removeEventListener("unhandledrejection", handler);
    }

    return () => {};
  }

  /**
   * Capture global errors
   */
  captureGlobalErrors(): () => void {
    const handler = (event: ErrorEvent) => {
      this.reportError(event.error || new Error(event.message), {
        tags: ["global-error"],
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    };

    if (typeof window !== "undefined") {
      window.addEventListener("error", handler);
      return () => window.removeEventListener("error", handler);
    }

    return () => {};
  }

  /**
   * Initialize global error capturing
   */
  init(): () => void {
    const cleanupRejections = this.captureUnhandledRejections();
    const cleanupErrors = this.captureGlobalErrors();

    return () => {
      cleanupRejections();
      cleanupErrors();
    };
  }
}

// Export singleton instance
export const errorReporter = new ErrorReporter();

// Export class for custom instances
export { ErrorReporter };

// Export types
export type { ErrorContext, UserInfo, ErrorReport, ReporterConfig };
