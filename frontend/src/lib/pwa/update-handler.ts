/**
 * PWA Update Handler - Manages service worker updates
 *
 * Handles detection, notification, and application of service worker updates.
 */

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

/**
 * Update state
 */
export type UpdateState =
  | "none"
  | "checking"
  | "available"
  | "downloading"
  | "ready"
  | "error";

/**
 * Update handler configuration
 */
export interface UpdateHandlerConfig {
  /** Auto-reload after update */
  autoReload: boolean;
  /** Check for updates interval (ms) */
  checkInterval: number;
  /** Enable debug logging */
  debug: boolean;
}

/**
 * Update info
 */
export interface UpdateInfo {
  state: UpdateState;
  isUpdateAvailable: boolean;
  waitingWorker: ServiceWorker | null;
  error: string | null;
  lastChecked: number | null;
}

/**
 * Update event types
 */
export type UpdateEventType =
  | "checking"
  | "update_found"
  | "update_ready"
  | "update_applied"
  | "update_error"
  | "no_update";

/**
 * Update event
 */
export interface UpdateEvent {
  type: UpdateEventType;
  data?: unknown;
  timestamp: number;
}

/**
 * Update event listener
 */
export type UpdateEventListener = (event: UpdateEvent) => void;

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: UpdateHandlerConfig = {
  autoReload: true,
  checkInterval: 60 * 60 * 1000, // 1 hour
  debug: false,
};

// =============================================================================
// Update Handler Class
// =============================================================================

/**
 * UpdateHandler - Manages service worker updates
 */
export class UpdateHandler {
  private config: UpdateHandlerConfig;
  private registration: ServiceWorkerRegistration | null = null;
  private state: UpdateState = "none";
  private waitingWorker: ServiceWorker | null = null;
  private error: string | null = null;
  private lastChecked: number | null = null;
  private listeners: Set<UpdateEventListener> = new Set();
  private checkTimer: ReturnType<typeof setInterval> | null = null;
  private controllerChangeHandler: (() => void) | null = null;
  private initialized: boolean = false;

  constructor(config: Partial<UpdateHandlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the update handler
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      this.state = "error";
      this.error = "Service workers not supported";
      return;
    }

    try {
      // Get current registration
      this.registration = await navigator.serviceWorker.ready;

      // Check if there's already a waiting worker
      if (this.registration.waiting) {
        this.waitingWorker = this.registration.waiting;
        this.state = "ready";
        this.emit({
          type: "update_ready",
          timestamp: Date.now(),
        });
      }

      // Listen for update found
      this.registration.addEventListener("updatefound", () => {
        this.handleUpdateFound();
      });

      // Listen for controller change
      this.controllerChangeHandler = () => {
        if (this.state === "ready" || this.state === "available") {
          this.emit({
            type: "update_applied",
            timestamp: Date.now(),
          });

          if (this.config.autoReload) {
            window.location.reload();
          }
        }
      };
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        this.controllerChangeHandler,
      );

      // Start periodic checks
      if (this.config.checkInterval > 0) {
        this.startPeriodicChecks();
      }

      this.initialized = true;
      this.log("Update handler initialized");
    } catch (error) {
      this.state = "error";
      this.error = error instanceof Error ? error.message : "Unknown error";
    }
  }

  /**
   * Destroy the update handler
   */
  public destroy(): void {
    this.stopPeriodicChecks();

    if (
      this.controllerChangeHandler &&
      typeof navigator !== "undefined" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        this.controllerChangeHandler,
      );
    }

    this.registration = null;
    this.waitingWorker = null;
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
  // Update State
  // ===========================================================================

  /**
   * Get current update info
   */
  public getUpdateInfo(): UpdateInfo {
    return {
      state: this.state,
      isUpdateAvailable: this.state === "ready" || this.state === "available",
      waitingWorker: this.waitingWorker,
      error: this.error,
      lastChecked: this.lastChecked,
    };
  }

  /**
   * Check if update is available
   */
  public isUpdateAvailable(): boolean {
    return this.state === "ready" || this.state === "available";
  }

  /**
   * Get current state
   */
  public getState(): UpdateState {
    return this.state;
  }

  // ===========================================================================
  // Update Actions
  // ===========================================================================

  /**
   * Check for updates
   */
  public async checkForUpdate(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    this.state = "checking";
    this.emit({
      type: "checking",
      timestamp: Date.now(),
    });

    try {
      await this.registration.update();
      this.lastChecked = Date.now();

      // Check if there's a waiting worker now
      if (this.registration.waiting) {
        this.waitingWorker = this.registration.waiting;
        this.state = "ready";
        this.emit({
          type: "update_ready",
          timestamp: Date.now(),
        });
        return true;
      }

      this.state = "none";
      this.emit({
        type: "no_update",
        timestamp: Date.now(),
      });
      return false;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.state = "error";
      this.error = errorMessage;

      this.emit({
        type: "update_error",
        data: { error: errorMessage },
        timestamp: Date.now(),
      });

      return false;
    }
  }

  /**
   * Apply the available update
   */
  public async applyUpdate(): Promise<void> {
    if (!this.waitingWorker) {
      throw new Error("No update available to apply");
    }

    // Tell the waiting service worker to activate
    this.waitingWorker.postMessage({ type: "SKIP_WAITING" });

    this.log("Sent SKIP_WAITING to service worker");
  }

  /**
   * Skip the current update
   */
  public skipUpdate(): void {
    this.waitingWorker = null;
    this.state = "none";
  }

  // ===========================================================================
  // Periodic Checks
  // ===========================================================================

  /**
   * Start periodic update checks
   */
  public startPeriodicChecks(): void {
    if (this.checkTimer) {
      return;
    }

    this.checkTimer = setInterval(async () => {
      try {
        await this.checkForUpdate();
      } catch (error) {
        this.log(`Periodic check failed: ${error}`);
      }
    }, this.config.checkInterval);
  }

  /**
   * Stop periodic update checks
   */
  public stopPeriodicChecks(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  // ===========================================================================
  // Event System
  // ===========================================================================

  /**
   * Subscribe to update events
   */
  public subscribe(listener: UpdateEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit an update event
   */
  private emit(event: UpdateEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        logger.error("[UpdateHandler] Event listener error:", error);
      }
    });
  }

  // ===========================================================================
  // Configuration
  // ===========================================================================

  /**
   * Update configuration
   */
  public setConfig(config: Partial<UpdateHandlerConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart periodic checks if interval changed
    if (config.checkInterval !== undefined) {
      this.stopPeriodicChecks();
      if (this.config.checkInterval > 0) {
        this.startPeriodicChecks();
      }
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): UpdateHandlerConfig {
    return { ...this.config };
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Handle update found
   */
  private handleUpdateFound(): void {
    const newWorker = this.registration?.installing;

    if (!newWorker) {
      return;
    }

    this.state = "downloading";
    this.emit({
      type: "update_found",
      timestamp: Date.now(),
    });

    newWorker.addEventListener("statechange", () => {
      if (newWorker.state === "installed") {
        if (navigator.serviceWorker.controller) {
          // New update available
          this.waitingWorker = newWorker;
          this.state = "ready";
          this.emit({
            type: "update_ready",
            timestamp: Date.now(),
          });
          this.log("Update ready to apply");
        } else {
          // First install
          this.state = "none";
          this.log("Service worker installed for the first time");
        }
      }
    });
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

let updateHandlerInstance: UpdateHandler | null = null;

/**
 * Get the default update handler instance
 */
export function getUpdateHandler(
  config?: Partial<UpdateHandlerConfig>,
): UpdateHandler {
  if (!updateHandlerInstance) {
    updateHandlerInstance = new UpdateHandler(config);
  }
  return updateHandlerInstance;
}

/**
 * Reset the default update handler instance
 */
export function resetUpdateHandler(): void {
  if (updateHandlerInstance) {
    updateHandlerInstance.destroy();
    updateHandlerInstance = null;
  }
}

export default UpdateHandler;
