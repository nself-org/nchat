/**
 * Analytics Configuration
 *
 * Platform-specific analytics configuration
 */

import type { AnalyticsConfig } from "./types";

/**
 * Get analytics configuration for current platform
 */
export function getAnalyticsConfig(): Partial<AnalyticsConfig> {
  const platform = getPlatform();

  const baseConfig = {
    enabled: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "false",
    debugMode: process.env.NODE_ENV === "development",
  };

  switch (platform) {
    case "web":
      return {
        ...baseConfig,
        providers: ["firebase", "sentry"] as const,
        firebase: {
          measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
        },
        sentry: {
          dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "",
          tracesSampleRate: 0.1,
          replaysSampleRate: 0.1,
        },
      };

    case "ios":
    case "android":
      return {
        ...baseConfig,
        providers: ["firebase", "sentry"] as const,
        // Firebase config comes from google-services.json/GoogleService-Info.plist
        firebase: {
          measurementId: "",
          appId: "",
          apiKey: "",
        },
        sentry: {
          dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "",
          tracesSampleRate: 0.2, // Higher sample rate for mobile
          replaysSampleRate: 0.0, // No replay on mobile
        },
      };

    case "electron":
    case "tauri":
      return {
        ...baseConfig,
        providers: ["sentry"] as const, // Desktop uses Sentry only
        sentry: {
          dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "",
          tracesSampleRate: 0.2,
          replaysSampleRate: 0.1,
        },
      };

    default:
      return baseConfig;
  }
}

/**
 * Detect current platform
 */
function getPlatform(): "web" | "ios" | "android" | "electron" | "tauri" {
  if (typeof window === "undefined") return "web";

  const userAgent = window.navigator.userAgent;

  if ((window as any).electron) return "electron";
  if ((window as any).__TAURI__) return "tauri";
  if (userAgent.includes("iPhone") || userAgent.includes("iPad")) return "ios";
  if (userAgent.includes("Android")) return "android";

  return "web";
}

/**
 * Check if analytics is available for current platform
 */
export function isAnalyticsAvailable(): boolean {
  const platform = getPlatform();

  // Check if required config is present
  if (platform === "web") {
    return !!(
      process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID &&
      process.env.NEXT_PUBLIC_SENTRY_DSN
    );
  }

  return !!process.env.NEXT_PUBLIC_SENTRY_DSN;
}

/**
 * Get platform-specific event properties
 */
export function getPlatformProperties(): Record<string, string> {
  if (typeof window === "undefined") {
    return {
      platform: "server",
    };
  }

  const platform = getPlatform();
  const properties: Record<string, string> = {
    platform,
    user_agent: window.navigator.userAgent,
    language: window.navigator.language,
    screen_width: String(window.screen.width),
    screen_height: String(window.screen.height),
    viewport_width: String(window.innerWidth),
    viewport_height: String(window.innerHeight),
  };

  // Add platform-specific properties
  if ((window as any).Capacitor) {
    const capacitor = (window as any).Capacitor;
    properties.capacitor_version = capacitor.version || "unknown";
    properties.capacitor_platform = capacitor.getPlatform() || "unknown";
  }

  if ((window as any).__TAURI__) {
    properties.tauri_version = "v2";
  }

  if ((window as any).electron) {
    properties.electron_version = process.versions?.electron || "unknown";
  }

  return properties;
}
