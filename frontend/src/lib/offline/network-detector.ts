/**
 * Network Detector - Monitors network connectivity and quality
 *
 * Uses the Network Information API when available, with fallbacks
 * for browsers that don't support it.
 */

import type {
  ConnectionState,
  NetworkQuality,
  ConnectionType,
  EffectiveConnectionType,
  ConnectionInfo,
} from "./offline-types";
import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

/**
 * Network change event listener
 */
export type NetworkChangeListener = (info: ConnectionInfo) => void;

/**
 * Extended Navigator interface with Network Information API
 */
interface NetworkInformation extends EventTarget {
  downlink: number;
  effectiveType: EffectiveConnectionType;
  rtt: number;
  saveData: boolean;
  type?: ConnectionType;
  addEventListener(type: "change", listener: () => void): void;
  removeEventListener(type: "change", listener: () => void): void;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
}

// =============================================================================
// Network Detector Class
// =============================================================================

class NetworkDetector {
  private listeners: Set<NetworkChangeListener> = new Set();
  private currentInfo: ConnectionInfo;
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private lastOnlineTime: Date | null = null;
  private lastOfflineTime: Date | null = null;
  private pingUrl: string = "/api/health";
  private checkIntervalMs: number = 10000;

  constructor() {
    this.currentInfo = this.getInitialInfo();
    this.setupListeners();
  }

  /**
   * Get initial connection info
   */
  private getInitialInfo(): ConnectionInfo {
    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
    const connection = this.getConnection();

    return {
      state: isOnline ? "online" : "offline",
      quality: this.determineQuality(connection),
      type: this.getConnectionType(connection),
      effectiveType: connection?.effectiveType ?? "unknown",
      downlink: connection?.downlink ?? null,
      rtt: connection?.rtt ?? null,
      saveData: connection?.saveData ?? false,
      lastOnline: isOnline ? new Date() : null,
      lastOffline: isOnline ? null : new Date(),
      offlineDuration: null,
    };
  }

  /**
   * Get Network Information API connection object
   */
  private getConnection(): NetworkInformation | null {
    if (typeof navigator === "undefined") return null;

    const nav = navigator as NavigatorWithConnection;
    return nav.connection || nav.mozConnection || nav.webkitConnection || null;
  }

  /**
   * Determine connection type from Network Information API
   */
  private getConnectionType(
    connection: NetworkInformation | null,
  ): ConnectionType {
    if (!connection?.type) return "unknown";
    return connection.type as ConnectionType;
  }

  /**
   * Determine network quality based on connection info
   */
  private determineQuality(
    connection: NetworkInformation | null,
  ): NetworkQuality {
    if (!connection) return "unknown";

    const { effectiveType, rtt, downlink } = connection;

    // Use effective type as primary indicator
    switch (effectiveType) {
      case "4g":
        // Further differentiate 4G based on metrics
        if (downlink >= 10 && rtt <= 50) return "excellent";
        if (downlink >= 5 && rtt <= 100) return "good";
        return "fair";

      case "3g":
        if (downlink >= 2 && rtt <= 200) return "fair";
        return "poor";

      case "2g":
      case "slow-2g":
        return "poor";

      default:
        return "unknown";
    }
  }

  /**
   * Setup event listeners for network changes
   */
  private setupListeners(): void {
    if (typeof window === "undefined") return;

    // Online/offline events
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);

    // Network Information API change event
    const connection = this.getConnection();
    if (connection) {
      connection.addEventListener("change", this.handleConnectionChange);
    }
  }

  /**
   * Cleanup event listeners
   */
  public cleanup(): void {
    if (typeof window === "undefined") return;

    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);

    const connection = this.getConnection();
    if (connection) {
      connection.removeEventListener("change", this.handleConnectionChange);
    }

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.listeners.clear();
  }

  /**
   * Handle online event
   */
  private handleOnline = (): void => {
    this.lastOnlineTime = new Date();
    const offlineDuration = this.lastOfflineTime
      ? Date.now() - this.lastOfflineTime.getTime()
      : null;

    this.updateInfo({
      state: "online",
      lastOnline: this.lastOnlineTime,
      offlineDuration,
    });
  };

  /**
   * Handle offline event
   */
  private handleOffline = (): void => {
    this.lastOfflineTime = new Date();

    this.updateInfo({
      state: "offline",
      lastOffline: this.lastOfflineTime,
      quality: "unknown",
    });
  };

  /**
   * Handle Network Information API change event
   */
  private handleConnectionChange = (): void => {
    const connection = this.getConnection();

    this.updateInfo({
      quality: this.determineQuality(connection),
      type: this.getConnectionType(connection),
      effectiveType: connection?.effectiveType ?? "unknown",
      downlink: connection?.downlink ?? null,
      rtt: connection?.rtt ?? null,
      saveData: connection?.saveData ?? false,
    });
  };

  /**
   * Update connection info and notify listeners
   */
  private updateInfo(updates: Partial<ConnectionInfo>): void {
    const previousState = this.currentInfo.state;
    this.currentInfo = { ...this.currentInfo, ...updates };

    // Log state changes in development
    if (
      process.env.NODE_ENV === "development" &&
      previousState !== this.currentInfo.state
    ) {
      // REMOVED: console.log('[NetworkDetector] State changed:', {
      //   from: previousState,
      //   to: this.currentInfo.state,
      //   info: this.currentInfo,
      // })
    }

    // Notify all listeners
    this.notifyListeners();
  }

  /**
   * Notify all listeners of connection change
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentInfo);
      } catch (error) {
        logger.error("[NetworkDetector] Listener error:", error);
      }
    });
  }

  /**
   * Subscribe to network changes
   */
  public subscribe(listener: NetworkChangeListener): () => void {
    this.listeners.add(listener);

    // Immediately notify with current state
    listener(this.currentInfo);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get current connection info
   */
  public getInfo(): ConnectionInfo {
    return { ...this.currentInfo };
  }

  /**
   * Check if currently online
   */
  public isOnline(): boolean {
    return this.currentInfo.state === "online";
  }

  /**
   * Check if currently offline
   */
  public isOffline(): boolean {
    return this.currentInfo.state === "offline";
  }

  /**
   * Get network quality
   */
  public getQuality(): NetworkQuality {
    return this.currentInfo.quality;
  }

  /**
   * Start periodic connectivity check
   */
  public startPeriodicCheck(intervalMs?: number, url?: string): void {
    if (intervalMs) this.checkIntervalMs = intervalMs;
    if (url) this.pingUrl = url;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.checkConnectivity();
    }, this.checkIntervalMs);
  }

  /**
   * Stop periodic connectivity check
   */
  public stopPeriodicCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Manually check connectivity with a ping
   */
  public async checkConnectivity(): Promise<boolean> {
    if (typeof fetch === "undefined") return navigator?.onLine ?? true;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const startTime = Date.now();
      const response = await fetch(this.pingUrl, {
        method: "HEAD",
        cache: "no-store",
        signal: controller.signal,
      });
      const rtt = Date.now() - startTime;

      clearTimeout(timeout);

      if (response.ok) {
        // Update RTT from actual measurement if we don't have Network Information API
        if (!this.getConnection()?.rtt) {
          this.updateInfo({
            state: "online",
            rtt,
            quality: this.estimateQualityFromRtt(rtt),
          });
        } else if (this.currentInfo.state !== "online") {
          this.updateInfo({ state: "online" });
        }
        return true;
      }

      return false;
    } catch {
      // Only mark offline if we were previously online and navigator says offline
      if (!navigator?.onLine) {
        this.updateInfo({ state: "offline" });
      }
      return false;
    }
  }

  /**
   * Estimate quality from RTT when Network Information API is not available
   */
  private estimateQualityFromRtt(rtt: number): NetworkQuality {
    if (rtt <= 50) return "excellent";
    if (rtt <= 100) return "good";
    if (rtt <= 300) return "fair";
    return "poor";
  }

  /**
   * Get time since last online
   */
  public getTimeSinceOnline(): number | null {
    if (!this.lastOnlineTime) return null;
    return Date.now() - this.lastOnlineTime.getTime();
  }

  /**
   * Get time since last offline
   */
  public getTimeSinceOffline(): number | null {
    if (!this.lastOfflineTime) return null;
    return Date.now() - this.lastOfflineTime.getTime();
  }

  /**
   * Check if running on slow connection
   */
  public isSlowConnection(): boolean {
    const { effectiveType, quality } = this.currentInfo;
    return (
      effectiveType === "slow-2g" ||
      effectiveType === "2g" ||
      quality === "poor"
    );
  }

  /**
   * Check if data saver mode is enabled
   */
  public isSaveDataEnabled(): boolean {
    return this.currentInfo.saveData;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let networkDetector: NetworkDetector | null = null;

/**
 * Get or create the network detector singleton
 */
export function getNetworkDetector(): NetworkDetector {
  if (!networkDetector) {
    networkDetector = new NetworkDetector();
  }
  return networkDetector;
}

/**
 * Cleanup the network detector
 */
export function cleanupNetworkDetector(): void {
  if (networkDetector) {
    networkDetector.cleanup();
    networkDetector = null;
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Format offline duration for display
 */
export function formatOfflineDuration(ms: number): string {
  if (ms < 1000) return "just now";

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  return `${days}d`;
}

/**
 * Get connection state display text
 */
export function getConnectionStateText(state: ConnectionState): string {
  switch (state) {
    case "online":
      return "Connected";
    case "offline":
      return "Offline";
    case "connecting":
      return "Connecting...";
    case "reconnecting":
      return "Reconnecting...";
    case "error":
      return "Connection error";
    default:
      return "Unknown";
  }
}

/**
 * Get network quality display text
 */
export function getNetworkQualityText(quality: NetworkQuality): string {
  switch (quality) {
    case "excellent":
      return "Excellent";
    case "good":
      return "Good";
    case "fair":
      return "Fair";
    case "poor":
      return "Poor";
    default:
      return "Unknown";
  }
}

export { NetworkDetector };
export default getNetworkDetector;
