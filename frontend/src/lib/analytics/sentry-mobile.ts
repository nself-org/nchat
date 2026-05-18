/**
 * Sentry Mobile SDK Integration
 *
 * Error tracking and performance monitoring for iOS, Android, and Electron
 */

import type { AnalyticsConfig, UserProperties } from "./types";

import { logger } from "@/lib/logger";

// Platform detection
const isElectron =
  typeof window !== "undefined" && (window as any).electron !== undefined;
const isCapacitor =
  typeof window !== "undefined" && (window as any).Capacitor !== undefined;

class SentryMobile {
  private initialized = false;
  private config: AnalyticsConfig | null = null;
  private nativePlugin: any = null;

  /**
   * Initialize Sentry
   */
  async initialize(config: AnalyticsConfig): Promise<void> {
    if (this.initialized) {
      logger.warn("Sentry already initialized");
      return;
    }

    this.config = config;

    if (!config.enabled || !config.sentry) {
      // REMOVED: console.log('Sentry disabled or not configured')
      return;
    }

    // Check if user has opted out
    if (!config.consent.errorTracking && !config.consent.crashReporting) {
      // REMOVED: console.log('User has opted out of error tracking')
      return;
    }

    try {
      if (isElectron) {
        await this.initializeElectron();
      } else if (isCapacitor) {
        await this.initializeCapacitor();
      } else {
        await this.initializeWeb();
      }

      this.initialized = true;
      // REMOVED: console.log('Sentry initialized successfully')
    } catch (error) {
      logger.error("Failed to initialize Sentry:", error);
      throw error;
    }
  }

  /**
   * Initialize Sentry for Electron
   */
  private async initializeElectron(): Promise<void> {
    if (!this.config?.sentry) return;

    try {
      const Sentry = await import("@sentry/electron/renderer");

      Sentry.init({
        dsn: this.config.sentry.dsn,
        environment: process.env.NODE_ENV || "production",
        release: process.env.NEXT_PUBLIC_RELEASE_VERSION || "0.9.1",

        // Performance monitoring
        tracesSampleRate: this.config.sentry.tracesSampleRate || 0.1,

        // Session replay
        replaysSessionSampleRate: this.config.sentry.replaysSampleRate || 0.1,
        replaysOnErrorSampleRate: 1.0,

        // Integrations
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration({
            maskAllText: true,
            blockAllMedia: true,
          }),
        ],

        // Filter sensitive data
        beforeSend: (event) => {
          return this.filterSensitiveData(event);
        },

        // Debug mode
        debug: this.config.debugMode,

        // Ignore certain errors
        ignoreErrors: [
          "ResizeObserver loop limit exceeded",
          "Non-Error promise rejection captured",
        ],
      });
    } catch (error) {
      logger.error("Failed to initialize Sentry Electron:", error);
      throw error;
    }
  }

  /**
   * Initialize Sentry for Capacitor (iOS/Android)
   */
  private async initializeCapacitor(): Promise<void> {
    if (!this.config?.sentry) return;

    try {
      const Sentry = await import("@sentry/capacitor");

      Sentry.init({
        dsn: this.config.sentry.dsn,
        environment: process.env.NODE_ENV || "production",
        release: process.env.NEXT_PUBLIC_RELEASE_VERSION || "0.9.1",
        dist: "1",

        // Performance monitoring
        tracesSampleRate: this.config.sentry.tracesSampleRate || 0.1,
        enableAutoSessionTracking: true,
        sessionTrackingIntervalMillis: 30000,

        // Native crash reporting
        enableNative: this.config.consent.crashReporting,
        enableNativeCrashHandling: this.config.consent.crashReporting,

        // Integrations - note: browserTracingIntegration not available in Capacitor SDK
        integrations: [],

        // Filter sensitive data
        beforeSend: (event) => {
          return this.filterSensitiveData(event);
        },

        // Debug mode
        debug: this.config.debugMode,
      });

      this.nativePlugin = Sentry;
    } catch (error) {
      logger.error("Failed to initialize Sentry Capacitor:", error);
      throw error;
    }
  }

  /**
   * Initialize Sentry for web (fallback)
   */
  private async initializeWeb(): Promise<void> {
    if (!this.config?.sentry) return;

    try {
      const Sentry = await import("@sentry/nextjs");

      Sentry.init({
        dsn: this.config.sentry.dsn,
        environment: process.env.NODE_ENV || "production",
        release: process.env.NEXT_PUBLIC_RELEASE_VERSION || "0.9.1",

        tracesSampleRate: this.config.sentry.tracesSampleRate || 0.1,
        replaysSessionSampleRate: this.config.sentry.replaysSampleRate || 0.1,
        replaysOnErrorSampleRate: 1.0,

        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration(),
        ],

        beforeSend: (event) => {
          return this.filterSensitiveData(event);
        },

        debug: this.config.debugMode,
      });
    } catch (error) {
      logger.error("Failed to initialize Sentry web:", error);
      throw error;
    }
  }

  /**
   * Filter sensitive data from events
   */
  private filterSensitiveData(event: any): any {
    // Remove sensitive fields
    if (event.request?.cookies) {
      delete event.request.cookies;
    }

    if (event.request?.headers) {
      const sensitiveHeaders = ["authorization", "cookie", "x-api-key"];
      sensitiveHeaders.forEach((header) => {
        delete event.request.headers[header];
      });
    }

    // Scrub sensitive data from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((breadcrumb: any) => {
        if (breadcrumb.data) {
          const sensitiveKeys = [
            "password",
            "token",
            "secret",
            "apiKey",
            "accessToken",
          ];
          sensitiveKeys.forEach((key) => {
            if (breadcrumb.data[key]) {
              breadcrumb.data[key] = "[Filtered]";
            }
          });
        }
        return breadcrumb;
      });
    }

    return event;
  }

  /**
   * Set user context
   */
  async setUser(user: Partial<UserProperties> | null): Promise<void> {
    if (!this.initialized) return;

    try {
      const Sentry = await this.getSentryModule();

      if (user) {
        Sentry.setUser({
          id: user.userId,
          email: user.email,
          username: user.username,
          role: user.role,
          platform: user.platform,
          appVersion: user.appVersion,
        });
      } else {
        Sentry.setUser(null);
      }

      if (this.config?.debugMode) {
        // REMOVED: console.log('[Sentry] User context set:', user)
      }
    } catch (error) {
      logger.error("Failed to set user context:", error);
    }
  }

  /**
   * Capture error
   */
  async captureError(
    error: Error,
    context?: {
      tags?: Record<string, string>;
      extra?: Record<string, any>;
      level?: "fatal" | "error" | "warning" | "info" | "debug";
    },
  ): Promise<void> {
    if (!this.initialized) return;

    try {
      const Sentry = await this.getSentryModule();

      Sentry.captureException(error, {
        tags: context?.tags,
        extra: context?.extra,
        level: context?.level,
      });

      if (this.config?.debugMode) {
        // REMOVED: console.log('[Sentry] Error captured:', error.message, context)
      }
    } catch (err) {
      logger.error("Failed to capture error:", err);
    }
  }

  /**
   * Capture message
   */
  async captureMessage(
    message: string,
    level: "fatal" | "error" | "warning" | "info" | "debug" = "info",
    context?: {
      tags?: Record<string, string>;
      extra?: Record<string, any>;
    },
  ): Promise<void> {
    if (!this.initialized) return;

    try {
      const Sentry = await this.getSentryModule();

      Sentry.captureMessage(message, {
        level,
        tags: context?.tags,
        extra: context?.extra,
      });

      if (this.config?.debugMode) {
        // REMOVED: console.log('[Sentry] Message captured:', message, level)
      }
    } catch (error) {
      logger.error("Failed to capture message:", error);
    }
  }

  /**
   * Add breadcrumb
   */
  async addBreadcrumb(
    category: string,
    message: string,
    data?: Record<string, any>,
    level: "debug" | "info" | "warning" | "error" = "info",
  ): Promise<void> {
    if (!this.initialized) return;

    try {
      const Sentry = await this.getSentryModule();

      Sentry.addBreadcrumb({
        category,
        message,
        level,
        data,
      });
    } catch (error) {
      logger.error("Failed to add breadcrumb:", error);
    }
  }

  /**
   * Set context
   */
  async setContext(name: string, context: Record<string, any>): Promise<void> {
    if (!this.initialized) return;

    try {
      const Sentry = await this.getSentryModule();
      Sentry.setContext(name, context);
    } catch (error) {
      logger.error("Failed to set context:", error);
    }
  }

  /**
   * Set tag
   */
  async setTag(key: string, value: string): Promise<void> {
    if (!this.initialized) return;

    try {
      const Sentry = await this.getSentryModule();
      Sentry.setTag(key, value);
    } catch (error) {
      logger.error("Failed to set tag:", error);
    }
  }

  /**
   * Start transaction (performance monitoring)
   */
  async startTransaction(name: string, operation: string): Promise<any> {
    if (!this.initialized) return null;

    try {
      const Sentry = await this.getSentryModule();
      return Sentry.startTransaction({ name, op: operation });
    } catch (error) {
      logger.error("Failed to start transaction:", error);
      return null;
    }
  }

  /**
   * Get Sentry module based on platform
   */
  private async getSentryModule(): Promise<any> {
    if (isElectron) {
      return await import("@sentry/electron/renderer");
    } else if (isCapacitor) {
      return await import("@sentry/capacitor");
    } else {
      return await import("@sentry/nextjs");
    }
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Close Sentry
   */
  async close(): Promise<void> {
    if (!this.initialized) return;

    try {
      const Sentry = await this.getSentryModule();
      await Sentry.close();
      this.initialized = false;
    } catch (error) {
      logger.error("Failed to close Sentry:", error);
    }
  }
}

// Singleton instance
export const sentryMobile = new SentryMobile();
