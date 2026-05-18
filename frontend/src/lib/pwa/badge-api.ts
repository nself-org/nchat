/**
 * Badge API - App badge/notification count management
 *
 * Manages the app badge (notification count) displayed on the app icon.
 * Provides fallback handling for unsupported browsers.
 */

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

/**
 * Badge support status
 */
export type BadgeSupportStatus = "supported" | "unsupported" | "unknown";

/**
 * Badge API configuration
 */
export interface BadgeConfig {
  /** Fallback to title notification count */
  useTitleFallback: boolean;
  /** Original page title (for fallback) */
  originalTitle: string | null;
  /** Enable debug logging */
  debug: boolean;
}

/**
 * Badge event types
 */
export type BadgeEventType = "badge_set" | "badge_cleared" | "badge_error";

/**
 * Badge event
 */
export interface BadgeEvent {
  type: BadgeEventType;
  data?: unknown;
  timestamp: number;
}

/**
 * Badge event listener
 */
export type BadgeEventListener = (event: BadgeEvent) => void;

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: BadgeConfig = {
  useTitleFallback: true,
  originalTitle: null,
  debug: false,
};

// =============================================================================
// Badge API Class
// =============================================================================

/**
 * BadgeAPI - Manages app badge/notification count
 */
export class BadgeAPI {
  private config: BadgeConfig;
  private currentCount: number = 0;
  private isSupported: BadgeSupportStatus = "unknown";
  private listeners: Set<BadgeEventListener> = new Set();
  private initialized: boolean = false;

  constructor(config: Partial<BadgeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the badge API
   */
  public initialize(): void {
    if (this.initialized) {
      return;
    }

    // Check support
    this.isSupported = this.checkSupport();

    // Save original title for fallback
    if (typeof document !== "undefined" && !this.config.originalTitle) {
      this.config.originalTitle = document.title;
    }

    this.initialized = true;
    this.log(`Badge API initialized, support: ${this.isSupported}`);
  }

  /**
   * Destroy the badge API
   */
  public destroy(): void {
    // Clear badge on destroy
    this.clearBadge();
    this.listeners.clear();
    this.initialized = false;
  }

  /**
   * Check if initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  // ===========================================================================
  // Badge Operations
  // ===========================================================================

  /**
   * Set the badge count
   */
  public async setBadge(count: number): Promise<boolean> {
    this.ensureInitialized();

    // Validate count
    if (count < 0) {
      count = 0;
    }

    // Round to integer
    count = Math.floor(count);

    this.currentCount = count;

    // Try native API first
    if (this.isSupported === "supported") {
      try {
        if (count === 0) {
          await this.clearBadgeNative();
        } else {
          await this.setBadgeNative(count);
        }

        this.emit({
          type: "badge_set",
          data: { count },
          timestamp: Date.now(),
        });

        this.log(`Badge set to ${count}`);
        return true;
      } catch (error) {
        this.log(`Native badge failed: ${error}`);
      }
    }

    // Fall back to title-based notification
    if (this.config.useTitleFallback) {
      this.setTitleBadge(count);

      this.emit({
        type: "badge_set",
        data: { count, fallback: true },
        timestamp: Date.now(),
      });

      this.log(`Badge set to ${count} (title fallback)`);
      return true;
    }

    return false;
  }

  /**
   * Clear the badge
   */
  public async clearBadge(): Promise<boolean> {
    return this.setBadge(0);
  }

  /**
   * Increment the badge count
   */
  public async incrementBadge(amount: number = 1): Promise<boolean> {
    return this.setBadge(this.currentCount + amount);
  }

  /**
   * Decrement the badge count
   */
  public async decrementBadge(amount: number = 1): Promise<boolean> {
    return this.setBadge(Math.max(0, this.currentCount - amount));
  }

  /**
   * Get current badge count
   */
  public getBadgeCount(): number {
    return this.currentCount;
  }

  // ===========================================================================
  // Support Detection
  // ===========================================================================

  /**
   * Check if badge API is supported
   */
  public isBadgeSupported(): boolean {
    return this.isSupported === "supported";
  }

  /**
   * Get support status
   */
  public getSupportStatus(): BadgeSupportStatus {
    return this.isSupported;
  }

  /**
   * Check if title fallback is being used
   */
  public isUsingFallback(): boolean {
    return this.isSupported !== "supported" && this.config.useTitleFallback;
  }

  // ===========================================================================
  // Event System
  // ===========================================================================

  /**
   * Subscribe to badge events
   */
  public subscribe(listener: BadgeEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit a badge event
   */
  private emit(event: BadgeEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        logger.error("[BadgeAPI] Event listener error:", error);
      }
    });
  }

  // ===========================================================================
  // Configuration
  // ===========================================================================

  /**
   * Update configuration
   */
  public setConfig(config: Partial<BadgeConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): BadgeConfig {
    return { ...this.config };
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Check badge API support
   */
  private checkSupport(): BadgeSupportStatus {
    if (typeof navigator === "undefined") {
      return "unsupported";
    }

    // Check for the Badge API
    if ("setAppBadge" in navigator && "clearAppBadge" in navigator) {
      return "supported";
    }

    // Check for experimental Badge API
    if (
      "setExperimentalAppBadge" in navigator ||
      "setClientBadge" in navigator
    ) {
      return "supported";
    }

    return "unsupported";
  }

  /**
   * Set badge using native API
   */
  private async setBadgeNative(count: number): Promise<void> {
    const nav = navigator as Navigator & {
      setAppBadge?: (count?: number) => Promise<void>;
      setExperimentalAppBadge?: (count?: number) => Promise<void>;
      setClientBadge?: (count?: number) => Promise<void>;
    };

    if (nav.setAppBadge) {
      await nav.setAppBadge(count);
    } else if (nav.setExperimentalAppBadge) {
      await nav.setExperimentalAppBadge(count);
    } else if (nav.setClientBadge) {
      await nav.setClientBadge(count);
    } else {
      throw new Error("Badge API not available");
    }
  }

  /**
   * Clear badge using native API
   */
  private async clearBadgeNative(): Promise<void> {
    const nav = navigator as Navigator & {
      clearAppBadge?: () => Promise<void>;
      clearExperimentalAppBadge?: () => Promise<void>;
      clearClientBadge?: () => Promise<void>;
    };

    if (nav.clearAppBadge) {
      await nav.clearAppBadge();
    } else if (nav.clearExperimentalAppBadge) {
      await nav.clearExperimentalAppBadge();
    } else if (nav.clearClientBadge) {
      await nav.clearClientBadge();
    } else {
      // Fall back to setting count to 0
      await this.setBadgeNative(0);
    }
  }

  /**
   * Set badge using title fallback
   */
  private setTitleBadge(count: number): void {
    if (typeof document === "undefined") {
      return;
    }

    const originalTitle = this.config.originalTitle || "nChat";

    if (count > 0) {
      document.title = `(${count}) ${originalTitle}`;
    } else {
      document.title = originalTitle;
    }
  }

  /**
   * Ensure the API is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      this.initialize();
    }
  }

  /**
   * Log a debug message
   */
  private log(message: string): void {
    if (this.config.debug) {
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let badgeAPIInstance: BadgeAPI | null = null;

/**
 * Get the default badge API instance
 */
export function getBadgeAPI(config?: Partial<BadgeConfig>): BadgeAPI {
  if (!badgeAPIInstance) {
    badgeAPIInstance = new BadgeAPI(config);
  }
  return badgeAPIInstance;
}

/**
 * Reset the default badge API instance
 */
export function resetBadgeAPI(): void {
  if (badgeAPIInstance) {
    badgeAPIInstance.destroy();
    badgeAPIInstance = null;
  }
}

export default BadgeAPI;
