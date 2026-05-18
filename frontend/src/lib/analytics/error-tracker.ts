/**
 * Error Tracker
 *
 * Captures and tracks errors, exceptions, and error contexts
 * with breadcrumbs for debugging.
 */

import { AnalyticsEvent } from "./event-schema";
import { getAnalyticsClient, TrackedEvent } from "./analytics-client";
import { PrivacyFilter } from "./privacy-filter";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  DEBUG = "debug",
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  CRITICAL = "critical",
}

/**
 * Breadcrumb types
 */
export enum BreadcrumbType {
  NAVIGATION = "navigation",
  HTTP = "http",
  USER = "user",
  UI = "ui",
  CONSOLE = "console",
  ERROR = "error",
  DEBUG = "debug",
}

/**
 * Breadcrumb entry
 */
export interface Breadcrumb {
  type: BreadcrumbType;
  category: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: number;
  level?: ErrorSeverity;
}

/**
 * Captured error data
 */
export interface CapturedError {
  id: string;
  message: string;
  name: string;
  stack?: string;
  severity: ErrorSeverity;
  timestamp: number;
  componentStack?: string;
  tags: Record<string, string>;
  context: Record<string, unknown>;
  breadcrumbs: Breadcrumb[];
  url?: string;
  userAgent?: string;
  handled: boolean;
}

/**
 * Error tracker configuration
 */
export interface ErrorTrackerConfig {
  enabled: boolean;
  captureUnhandledErrors: boolean;
  captureUnhandledRejections: boolean;
  captureConsoleErrors: boolean;
  maxBreadcrumbs: number;
  maxStackFrames: number;
  ignorePatterns: RegExp[];
  beforeCapture?: (error: CapturedError) => CapturedError | null;
  onCapture?: (error: CapturedError) => void;
}

/**
 * Error context for additional information
 */
export interface ErrorContext {
  componentName?: string;
  actionName?: string;
  userId?: string;
  extra?: Record<string, unknown>;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: ErrorTrackerConfig = {
  enabled: true,
  captureUnhandledErrors: true,
  captureUnhandledRejections: true,
  captureConsoleErrors: false,
  maxBreadcrumbs: 50,
  maxStackFrames: 50,
  ignorePatterns: [
    /ResizeObserver loop/i,
    /Loading chunk/i,
    /ChunkLoadError/i,
    /Network request failed/i,
  ],
};

// ============================================================================
// Error Tracker Class
// ============================================================================

export class ErrorTracker {
  private config: ErrorTrackerConfig;
  private breadcrumbs: Breadcrumb[] = [];
  private tags: Record<string, string> = {};
  private context: Record<string, unknown> = {};
  private privacyFilter: PrivacyFilter;
  private initialized: boolean = false;
  private errorHandler: ((event: ErrorEvent) => void) | null = null;
  private rejectionHandler: ((event: PromiseRejectionEvent) => void) | null =
    null;
  private originalConsoleError: typeof console.error | null = null;

  constructor(config: Partial<ErrorTrackerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.privacyFilter = new PrivacyFilter();
  }

  /**
   * Initializes error tracking
   */
  initialize(): void {
    if (this.initialized || !this.config.enabled) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    if (this.config.captureUnhandledErrors) {
      this.setupErrorHandler();
    }

    if (this.config.captureUnhandledRejections) {
      this.setupRejectionHandler();
    }

    if (this.config.captureConsoleErrors) {
      this.setupConsoleCapture();
    }

    this.initialized = true;
  }

  /**
   * Destroys error tracking
   */
  destroy(): void {
    if (typeof window === "undefined") {
      return;
    }

    if (this.errorHandler) {
      window.removeEventListener("error", this.errorHandler);
      this.errorHandler = null;
    }

    if (this.rejectionHandler) {
      window.removeEventListener("unhandledrejection", this.rejectionHandler);
      this.rejectionHandler = null;
    }

    if (this.originalConsoleError) {
      console.error = this.originalConsoleError;
      this.originalConsoleError = null;
    }

    this.initialized = false;
  }

  /**
   * Captures an error
   */
  captureError(
    error: Error | string,
    context: ErrorContext = {},
    severity: ErrorSeverity = ErrorSeverity.ERROR,
  ): TrackedEvent | null {
    if (!this.config.enabled) {
      return null;
    }

    const captured = this.createCapturedError(error, context, severity, true);

    if (!captured) {
      return null;
    }

    return this.trackError(captured);
  }

  /**
   * Captures an exception (alias for captureError)
   */
  captureException(
    error: Error,
    context: ErrorContext = {},
  ): TrackedEvent | null {
    return this.captureError(error, context, ErrorSeverity.ERROR);
  }

  /**
   * Captures a message as an error
   */
  captureMessage(
    message: string,
    severity: ErrorSeverity = ErrorSeverity.INFO,
    context: ErrorContext = {},
  ): TrackedEvent | null {
    return this.captureError(message, context, severity);
  }

  /**
   * Adds a breadcrumb
   */
  addBreadcrumb(breadcrumb: Omit<Breadcrumb, "timestamp">): void {
    const crumb: Breadcrumb = {
      ...breadcrumb,
      timestamp: Date.now(),
      data: breadcrumb.data
        ? this.privacyFilter.filter(breadcrumb.data)
        : undefined,
    };

    this.breadcrumbs.push(crumb);

    // Trim to max breadcrumbs
    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.config.maxBreadcrumbs);
    }
  }

  /**
   * Adds a navigation breadcrumb
   */
  addNavigationBreadcrumb(from: string, to: string): void {
    this.addBreadcrumb({
      type: BreadcrumbType.NAVIGATION,
      category: "navigation",
      message: `Navigated from ${from} to ${to}`,
      data: { from, to },
    });
  }

  /**
   * Adds an HTTP breadcrumb
   */
  addHttpBreadcrumb(
    method: string,
    url: string,
    statusCode?: number,
    duration?: number,
  ): void {
    this.addBreadcrumb({
      type: BreadcrumbType.HTTP,
      category: "http",
      message: `${method} ${url}`,
      data: { method, url, statusCode, duration },
      level:
        statusCode && statusCode >= 400
          ? ErrorSeverity.ERROR
          : ErrorSeverity.INFO,
    });
  }

  /**
   * Adds a user action breadcrumb
   */
  addUserBreadcrumb(action: string, data?: Record<string, unknown>): void {
    this.addBreadcrumb({
      type: BreadcrumbType.USER,
      category: "user",
      message: action,
      data,
    });
  }

  /**
   * Adds a UI event breadcrumb
   */
  addUIBreadcrumb(
    element: string,
    action: string,
    data?: Record<string, unknown>,
  ): void {
    this.addBreadcrumb({
      type: BreadcrumbType.UI,
      category: "ui",
      message: `${action} on ${element}`,
      data: { element, action, ...data },
    });
  }

  /**
   * Sets a tag
   */
  setTag(key: string, value: string): void {
    this.tags[key] = value;
  }

  /**
   * Sets multiple tags
   */
  setTags(tags: Record<string, string>): void {
    this.tags = { ...this.tags, ...tags };
  }

  /**
   * Clears a tag
   */
  clearTag(key: string): void {
    delete this.tags[key];
  }

  /**
   * Sets extra context
   */
  setContext(key: string, value: unknown): void {
    this.context[key] = this.privacyFilter.filter(value);
  }

  /**
   * Sets user context
   */
  setUser(user: { id?: string; email?: string; name?: string }): void {
    this.setContext("user", {
      id: user.id,
      email: user.email
        ? this.privacyFilter.filter({ email: user.email }).email
        : undefined,
      name: user.name,
    });
  }

  /**
   * Clears user context
   */
  clearUser(): void {
    delete this.context.user;
  }

  /**
   * Gets current breadcrumbs
   */
  getBreadcrumbs(): Breadcrumb[] {
    return [...this.breadcrumbs];
  }

  /**
   * Clears breadcrumbs
   */
  clearBreadcrumbs(): void {
    this.breadcrumbs = [];
  }

  /**
   * Gets current tags
   */
  getTags(): Record<string, string> {
    return { ...this.tags };
  }

  /**
   * Gets current context
   */
  getContext(): Record<string, unknown> {
    // Return deep copy to prevent mutations
    return JSON.parse(JSON.stringify(this.context));
  }

  /**
   * Resets all state
   */
  reset(): void {
    this.breadcrumbs = [];
    this.tags = {};
    this.context = {};
  }

  /**
   * Wraps a function to capture errors
   */
  wrap<T extends (...args: unknown[]) => unknown>(
    fn: T,
    context?: ErrorContext,
  ): T {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return function (this: unknown, ...args: unknown[]) {
      try {
        return fn.apply(this, args);
      } catch (error) {
        self.captureError(error as Error, context);
        throw error;
      }
    } as T;
  }

  /**
   * Wraps an async function to capture errors
   */
  wrapAsync<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    context?: ErrorContext,
  ): T {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return async function (this: unknown, ...args: unknown[]) {
      try {
        return await fn.apply(this, args);
      } catch (error) {
        self.captureError(error as Error, context);
        throw error;
      }
    } as T;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private setupErrorHandler(): void {
    this.errorHandler = (event: ErrorEvent) => {
      const error = event.error || new Error(event.message);
      this.captureUnhandledError(error, false);
    };
    window.addEventListener("error", this.errorHandler);
  }

  private setupRejectionHandler(): void {
    this.rejectionHandler = (event: PromiseRejectionEvent) => {
      const error =
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason));
      this.captureUnhandledError(error, false);
    };
    window.addEventListener("unhandledrejection", this.rejectionHandler);
  }

  private setupConsoleCapture(): void {
    this.originalConsoleError = console.error;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    console.error = function (...args: unknown[]) {
      self.addBreadcrumb({
        type: BreadcrumbType.CONSOLE,
        category: "console",
        message: args.map((a) => String(a)).join(" "),
        level: ErrorSeverity.ERROR,
      });
      self.originalConsoleError?.apply(console, args);
    };
  }

  private captureUnhandledError(
    error: Error,
    handled: boolean,
  ): TrackedEvent | null {
    // Check ignore patterns
    if (this.shouldIgnoreError(error)) {
      return null;
    }

    const captured = this.createCapturedError(
      error,
      {},
      ErrorSeverity.ERROR,
      handled,
    );
    if (!captured) {
      return null;
    }

    return this.trackError(captured);
  }

  private shouldIgnoreError(error: Error): boolean {
    const message = error.message || String(error);
    return this.config.ignorePatterns.some((pattern) => pattern.test(message));
  }

  private createCapturedError(
    error: Error | string,
    context: ErrorContext,
    severity: ErrorSeverity,
    handled: boolean,
  ): CapturedError | null {
    const errorObj = typeof error === "string" ? new Error(error) : error;

    let captured: CapturedError = {
      id: this.generateErrorId(),
      message: errorObj.message || String(error),
      name: errorObj.name || "Error",
      stack: this.processStackTrace(errorObj.stack),
      severity,
      timestamp: Date.now(),
      tags: { ...this.tags },
      context: {
        ...this.context,
        ...this.privacyFilter.filter(context.extra || {}),
        componentName: context.componentName,
        actionName: context.actionName,
      },
      breadcrumbs: [...this.breadcrumbs],
      url: typeof window !== "undefined" ? window.location.href : undefined,
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      handled,
    };

    // Apply beforeCapture hook
    if (this.config.beforeCapture) {
      const modified = this.config.beforeCapture(captured);
      if (!modified) {
        return null;
      }
      captured = modified;
    }

    return captured;
  }

  private trackError(captured: CapturedError): TrackedEvent | null {
    // Add error breadcrumb
    this.addBreadcrumb({
      type: BreadcrumbType.ERROR,
      category: "error",
      message: captured.message,
      data: { errorId: captured.id, name: captured.name },
      level: captured.severity,
    });

    // Invoke callback
    this.config.onCapture?.(captured);

    // Track via analytics
    return getAnalyticsClient().track(AnalyticsEvent.ERROR_OCCURRED, {
      errorType: captured.name,
      errorCode: captured.id,
      errorMessage: captured.message,
      stackTrace: captured.stack,
      componentName: captured.context.componentName as string | undefined,
      actionName: captured.context.actionName as string | undefined,
      metadata: {
        severity: captured.severity,
        tags: captured.tags,
        handled: captured.handled,
        breadcrumbCount: captured.breadcrumbs.length,
      },
    });
  }

  private processStackTrace(stack?: string): string | undefined {
    if (!stack) {
      return undefined;
    }

    const lines = stack.split("\n");
    const filtered = lines.slice(0, this.config.maxStackFrames);

    // Filter out sensitive file paths
    return filtered
      .map((line) => line.replace(/\/Users\/[^/]+\//g, "/~/"))
      .join("\n");
  }

  private generateErrorId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return `err_${timestamp}_${random}`;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let errorTrackerInstance: ErrorTracker | null = null;

/**
 * Gets or creates the error tracker singleton
 */
export function getErrorTracker(
  config?: Partial<ErrorTrackerConfig>,
): ErrorTracker {
  if (!errorTrackerInstance) {
    errorTrackerInstance = new ErrorTracker(config);
  }
  return errorTrackerInstance;
}

/**
 * Resets the error tracker singleton (for testing)
 */
export function resetErrorTracker(): void {
  if (errorTrackerInstance) {
    errorTrackerInstance.destroy();
    errorTrackerInstance = null;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Captures an error
 */
export function captureError(
  error: Error | string,
  context?: ErrorContext,
  severity?: ErrorSeverity,
): TrackedEvent | null {
  return getErrorTracker().captureError(error, context, severity);
}

/**
 * Captures an exception
 */
export function captureException(
  error: Error,
  context?: ErrorContext,
): TrackedEvent | null {
  return getErrorTracker().captureException(error, context);
}

/**
 * Captures a message
 */
export function captureMessage(
  message: string,
  severity?: ErrorSeverity,
  context?: ErrorContext,
): TrackedEvent | null {
  return getErrorTracker().captureMessage(message, severity, context);
}

/**
 * Adds a breadcrumb
 */
export function addBreadcrumb(breadcrumb: Omit<Breadcrumb, "timestamp">): void {
  getErrorTracker().addBreadcrumb(breadcrumb);
}

/**
 * Sets error context
 */
export function setErrorContext(key: string, value: unknown): void {
  getErrorTracker().setContext(key, value);
}

/**
 * Sets error tags
 */
export function setErrorTags(tags: Record<string, string>): void {
  getErrorTracker().setTags(tags);
}

/**
 * Wraps a function to capture errors
 */
export function wrapFunction<T extends (...args: unknown[]) => unknown>(
  fn: T,
  context?: ErrorContext,
): T {
  return getErrorTracker().wrap(fn, context);
}

/**
 * Wraps an async function to capture errors
 */
export function wrapAsyncFunction<
  T extends (...args: unknown[]) => Promise<unknown>,
>(fn: T, context?: ErrorContext): T {
  return getErrorTracker().wrapAsync(fn, context);
}
