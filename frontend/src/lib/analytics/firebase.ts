/**
 * Firebase Analytics Implementation
 *
 * Cross-platform Firebase Analytics for web, iOS, and Android
 */

import { StandardEvents } from "./types";
import type {
  AnalyticsConfig,
  EventParams,
  ScreenViewEvent,
  UserProperties,
} from "./types";

import { logger } from "@/lib/logger";

// Platform detection
const isWeb =
  typeof window !== "undefined" &&
  !window.navigator.userAgent.includes("Capacitor");
const isIOS =
  typeof window !== "undefined" &&
  window.navigator.userAgent.includes("iPhone");
const isAndroid =
  typeof window !== "undefined" &&
  window.navigator.userAgent.includes("Android");
const isElectron =
  typeof window !== "undefined" && (window as any).electron !== undefined;

class FirebaseAnalytics {
  private analytics: any = null;
  private initialized = false;
  private config: AnalyticsConfig | null = null;
  private nativePlugin: any = null;

  /**
   * Initialize Firebase Analytics
   */
  async initialize(config: AnalyticsConfig): Promise<void> {
    if (this.initialized) {
      logger.warn("Firebase Analytics already initialized");
      return;
    }

    this.config = config;

    if (!config.enabled || !config.firebase) {
      // REMOVED: console.log('Firebase Analytics disabled or not configured')
      return;
    }

    try {
      if (isWeb || isElectron) {
        await this.initializeWeb();
      } else if (isIOS || isAndroid) {
        await this.initializeNative();
      }

      this.initialized = true;
      // REMOVED: console.log('Firebase Analytics initialized successfully')
    } catch (error) {
      logger.error("Failed to initialize Firebase Analytics:", error);
      throw error;
    }
  }

  /**
   * Initialize Firebase for web/electron
   */
  private async initializeWeb(): Promise<void> {
    if (!this.config?.firebase) return;

    try {
      // Dynamic import to avoid bundling if not needed
      const { initializeApp } = await import("firebase/app");
      const { getAnalytics, isSupported } = await import("firebase/analytics");

      // Check if Analytics is supported
      const supported = await isSupported();
      if (!supported) {
        logger.warn("Firebase Analytics not supported in this browser");
        return;
      }

      // Initialize Firebase app
      const app = initializeApp({
        apiKey: this.config.firebase.apiKey,
        authDomain: `${this.config.firebase.appId}.firebaseapp.com`,
        projectId: this.config.firebase.appId,
        storageBucket: `${this.config.firebase.appId}.appspot.com`,
        messagingSenderId: this.config.firebase.measurementId,
        appId: this.config.firebase.appId,
        measurementId: this.config.firebase.measurementId,
      });

      // Initialize Analytics
      this.analytics = getAnalytics(app);

      // Set debug mode if enabled
      if (this.config.debugMode) {
        (window as any).gtag_enable_tcf_support = false;
        (window as any).gtag_debug_mode = true;
      }
    } catch (error) {
      logger.error("Failed to initialize Firebase web:", error);
      throw error;
    }
  }

  /**
   * Initialize Firebase for native (iOS/Android via Capacitor)
   */
  private async initializeNative(): Promise<void> {
    try {
      // Import Capacitor Firebase plugin
      const { FirebaseAnalytics } =
        await import("@capacitor-firebase/analytics");
      this.nativePlugin = FirebaseAnalytics;

      // Enable/disable collection based on consent
      await this.nativePlugin.setEnabled({
        enabled: this.config?.consent.analytics ?? true,
      });

      // Set debug mode
      if (this.config?.debugMode) {
        await this.nativePlugin.setDebugMode({ enabled: true });
      }
    } catch (error) {
      logger.error("Failed to initialize Firebase native:", error);
      throw error;
    }
  }

  /**
   * Log an event
   */
  async logEvent(
    eventName: StandardEvents | string,
    params?: EventParams,
  ): Promise<void> {
    if (!this.initialized || !this.config?.enabled) return;

    try {
      if (isWeb || isElectron) {
        const { logEvent } = await import("firebase/analytics");
        if (this.analytics) {
          logEvent(this.analytics, eventName, params);
        }
      } else if (this.nativePlugin) {
        await this.nativePlugin.logEvent({
          name: eventName,
          params: params || {},
        });
      }

      if (this.config?.debugMode) {
        // REMOVED: console.log('[Analytics] Event:', eventName, params)
      }
    } catch (error) {
      logger.error("Failed to log event:", { context: { eventName, error } });
    }
  }

  /**
   * Log screen view
   */
  async logScreenView(screenName: string, screenClass?: string): Promise<void> {
    const params: ScreenViewEvent = {
      screen_name: screenName,
      screen_class: screenClass || screenName,
    };

    await this.logEvent(StandardEvents.SELECT_CONTENT, params);
  }

  /**
   * Set user properties
   */
  async setUserProperties(properties: Partial<UserProperties>): Promise<void> {
    if (!this.initialized || !this.config?.enabled) return;

    try {
      if (isWeb || isElectron) {
        const { setUserProperties } = await import("firebase/analytics");
        if (this.analytics) {
          setUserProperties(this.analytics, properties);
        }
      } else if (this.nativePlugin) {
        // Native: set properties one by one
        for (const [key, value] of Object.entries(properties)) {
          if (value !== undefined) {
            await this.nativePlugin.setUserProperty({
              key,
              value: String(value),
            });
          }
        }
      }

      if (this.config?.debugMode) {
        // REMOVED: console.log('[Analytics] User properties:', properties)
      }
    } catch (error) {
      logger.error("Failed to set user properties:", error);
    }
  }

  /**
   * Set user ID
   */
  async setUserId(userId: string | null): Promise<void> {
    if (!this.initialized || !this.config?.enabled) return;

    try {
      if (isWeb || isElectron) {
        const { setUserId } = await import("firebase/analytics");
        if (this.analytics) {
          setUserId(this.analytics, userId);
        }
      } else if (this.nativePlugin) {
        await this.nativePlugin.setUserId({ userId: userId || "" });
      }

      if (this.config?.debugMode) {
        // REMOVED: console.log('[Analytics] User ID:', userId)
      }
    } catch (error) {
      logger.error("Failed to set user ID:", error);
    }
  }

  /**
   * Set consent
   */
  async setConsent(consent: {
    analytics?: boolean;
    performance?: boolean;
  }): Promise<void> {
    if (!this.initialized) return;

    try {
      if (isWeb || isElectron) {
        const { setConsent } = await import("firebase/analytics");
        if (this.analytics) {
          setConsent({
            analytics_storage: consent.analytics ? "granted" : "denied",
            ad_storage: "denied", // We don't use ads
            ad_user_data: "denied",
            ad_personalization: "denied",
          });
        }
      } else if (this.nativePlugin) {
        await this.nativePlugin.setEnabled({
          enabled: consent.analytics ?? false,
        });
      }

      if (this.config?.debugMode) {
        // REMOVED: console.log('[Analytics] Consent updated:', consent)
      }
    } catch (error) {
      logger.error("Failed to set consent:", error);
    }
  }

  /**
   * Reset analytics data
   */
  async reset(): Promise<void> {
    if (!this.initialized) return;

    try {
      if (this.nativePlugin) {
        await this.nativePlugin.resetAnalyticsData();
      }

      // Clear user ID
      await this.setUserId(null);

      if (this.config?.debugMode) {
        // REMOVED: console.log('[Analytics] Data reset')
      }
    } catch (error) {
      logger.error("Failed to reset analytics:", error);
    }
  }

  /**
   * Get session ID
   */
  async getSessionId(): Promise<string | null> {
    if (!this.initialized) return null;

    try {
      if (this.nativePlugin) {
        const result = await this.nativePlugin.getSessionId();
        return result.sessionId || null;
      }
      return null;
    } catch (error) {
      logger.error("Failed to get session ID:", error);
      return null;
    }
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get platform
   */
  getPlatform(): "web" | "ios" | "android" | "electron" {
    if (isElectron) return "electron";
    if (isIOS) return "ios";
    if (isAndroid) return "android";
    return "web";
  }
}

// Singleton instance
export const firebaseAnalytics = new FirebaseAnalytics();
