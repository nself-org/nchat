/**
 * PWA Install Prompt - Handles PWA installation detection and prompting
 *
 * Manages the beforeinstallprompt event and provides utilities
 * for detecting installability and triggering the install prompt.
 */

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

/**
 * BeforeInstallPromptEvent interface
 */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/**
 * Install state
 */
export type InstallState =
  | "unknown"
  | "installable"
  | "installed"
  | "unsupported";

/**
 * Install prompt configuration
 */
export interface InstallPromptConfig {
  /** Delay before showing prompt (ms) */
  showDelay: number;
  /** Duration to hide after dismiss (ms) */
  dismissDuration: number;
  /** Storage key for dismissed state */
  storageKey: string;
  /** Enable debug logging */
  debug: boolean;
}

/**
 * Install result
 */
export interface InstallResult {
  outcome: "accepted" | "dismissed" | "error";
  platform: string | null;
  error?: string;
}

/**
 * Install event types
 */
export type InstallEventType =
  | "install_available"
  | "install_prompted"
  | "install_accepted"
  | "install_dismissed"
  | "install_error"
  | "app_installed";

/**
 * Install event
 */
export interface InstallEvent {
  type: InstallEventType;
  data?: unknown;
  timestamp: number;
}

/**
 * Install event listener
 */
export type InstallEventListener = (event: InstallEvent) => void;

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: InstallPromptConfig = {
  showDelay: 3000,
  dismissDuration: 7 * 24 * 60 * 60 * 1000, // 7 days
  storageKey: "nchat-install-prompt-dismissed",
  debug: false,
};

// =============================================================================
// Install Prompt Manager
// =============================================================================

/**
 * InstallPromptManager - Manages PWA installation
 */
export class InstallPromptManager {
  private config: InstallPromptConfig;
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private installState: InstallState = "unknown";
  private listeners: Set<InstallEventListener> = new Set();
  private boundHandlers: {
    beforeInstallPrompt: (e: Event) => void;
    appInstalled: () => void;
  };
  private initialized: boolean = false;

  constructor(config: Partial<InstallPromptConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.boundHandlers = {
      beforeInstallPrompt: this.handleBeforeInstallPrompt.bind(this),
      appInstalled: this.handleAppInstalled.bind(this),
    };
  }

  /**
   * Initialize the install prompt manager
   */
  public initialize(): void {
    if (this.initialized) {
      return;
    }

    if (typeof window === "undefined") {
      this.installState = "unsupported";
      return;
    }

    // Check if already installed
    if (this.checkIfInstalled()) {
      this.installState = "installed";
      this.initialized = true;
      return;
    }

    // Set up event listeners
    window.addEventListener(
      "beforeinstallprompt",
      this.boundHandlers.beforeInstallPrompt as EventListener,
    );
    window.addEventListener("appinstalled", this.boundHandlers.appInstalled);

    this.initialized = true;
    this.log("Install prompt manager initialized");
  }

  /**
   * Destroy the install prompt manager
   */
  public destroy(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener(
        "beforeinstallprompt",
        this.boundHandlers.beforeInstallPrompt as EventListener,
      );
      window.removeEventListener(
        "appinstalled",
        this.boundHandlers.appInstalled,
      );
    }

    this.deferredPrompt = null;
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
  // Install State
  // ===========================================================================

  /**
   * Get current install state
   */
  public getInstallState(): InstallState {
    return this.installState;
  }

  /**
   * Check if app can be installed
   */
  public canInstall(): boolean {
    return this.installState === "installable" && this.deferredPrompt !== null;
  }

  /**
   * Check if app is installed
   */
  public isInstalled(): boolean {
    return this.installState === "installed" || this.checkIfInstalled();
  }

  /**
   * Check if install is supported
   */
  public isSupported(): boolean {
    return this.installState !== "unsupported";
  }

  /**
   * Get available platforms
   */
  public getPlatforms(): string[] {
    return this.deferredPrompt?.platforms ?? [];
  }

  // ===========================================================================
  // Install Actions
  // ===========================================================================

  /**
   * Trigger the install prompt
   */
  public async promptInstall(): Promise<InstallResult> {
    if (!this.deferredPrompt) {
      return {
        outcome: "error",
        platform: null,
        error: "Install prompt not available",
      };
    }

    try {
      this.emit({
        type: "install_prompted",
        timestamp: Date.now(),
      });

      await this.deferredPrompt.prompt();
      const { outcome, platform } = await this.deferredPrompt.userChoice;

      this.log(`User ${outcome} install prompt, platform: ${platform}`);

      if (outcome === "accepted") {
        this.emit({
          type: "install_accepted",
          data: { platform },
          timestamp: Date.now(),
        });
      } else {
        this.emit({
          type: "install_dismissed",
          data: { platform },
          timestamp: Date.now(),
        });
        this.saveDismissed();
      }

      // Clear the prompt (can only be used once)
      this.deferredPrompt = null;
      this.installState = outcome === "accepted" ? "installed" : "unknown";

      return { outcome, platform };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      this.emit({
        type: "install_error",
        data: { error: errorMessage },
        timestamp: Date.now(),
      });

      return {
        outcome: "error",
        platform: null,
        error: errorMessage,
      };
    }
  }

  /**
   * Check if prompt was recently dismissed
   */
  public isDismissed(): boolean {
    if (typeof localStorage === "undefined") {
      return false;
    }

    const dismissed = localStorage.getItem(this.config.storageKey);
    if (!dismissed) {
      return false;
    }

    const dismissedTime = parseInt(dismissed, 10);
    return Date.now() - dismissedTime < this.config.dismissDuration;
  }

  /**
   * Clear dismissed state
   */
  public clearDismissed(): void {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(this.config.storageKey);
    }
  }

  // ===========================================================================
  // iOS-specific Methods
  // ===========================================================================

  /**
   * Check if running on iOS
   */
  public isIOS(): boolean {
    if (typeof navigator === "undefined") {
      return false;
    }

    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  /**
   * Check if running in Safari
   */
  public isSafari(): boolean {
    if (typeof navigator === "undefined") {
      return false;
    }

    const ua = navigator.userAgent;
    return /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS/i.test(ua);
  }

  /**
   * Get iOS install instructions
   */
  public getIOSInstructions(): string[] {
    return [
      "Tap the Share button in Safari",
      'Scroll down and tap "Add to Home Screen"',
      'Tap "Add" to confirm',
    ];
  }

  // ===========================================================================
  // Event System
  // ===========================================================================

  /**
   * Subscribe to install events
   */
  public subscribe(listener: InstallEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit an install event
   */
  private emit(event: InstallEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        logger.error("[InstallPromptManager] Event listener error:", error);
      }
    });
  }

  // ===========================================================================
  // Configuration
  // ===========================================================================

  /**
   * Update configuration
   */
  public setConfig(config: Partial<InstallPromptConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): InstallPromptConfig {
    return { ...this.config };
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Handle beforeinstallprompt event
   */
  private handleBeforeInstallPrompt(event: Event): void {
    // Prevent default mini-infobar
    event.preventDefault();

    this.deferredPrompt = event as BeforeInstallPromptEvent;
    this.installState = "installable";

    this.emit({
      type: "install_available",
      data: { platforms: this.getPlatforms() },
      timestamp: Date.now(),
    });

    this.log("Install prompt available");
  }

  /**
   * Handle appinstalled event
   */
  private handleAppInstalled(): void {
    this.installState = "installed";
    this.deferredPrompt = null;

    this.emit({
      type: "app_installed",
      timestamp: Date.now(),
    });

    // Clear dismissed state
    this.clearDismissed();

    this.log("App installed");
  }

  /**
   * Check if app is already installed
   */
  private checkIfInstalled(): boolean {
    if (typeof window === "undefined") {
      return false;
    }

    // Check display-mode media query
    const isStandalone = window.matchMedia(
      "(display-mode: standalone)",
    ).matches;

    // Check iOS standalone property
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const isIOSStandalone = nav.standalone === true;

    return isStandalone || isIOSStandalone;
  }

  /**
   * Save dismissed state
   */
  private saveDismissed(): void {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(this.config.storageKey, Date.now().toString());
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

let installPromptInstance: InstallPromptManager | null = null;

/**
 * Get the default install prompt manager instance
 */
export function getInstallPromptManager(
  config?: Partial<InstallPromptConfig>,
): InstallPromptManager {
  if (!installPromptInstance) {
    installPromptInstance = new InstallPromptManager(config);
  }
  return installPromptInstance;
}

/**
 * Reset the default install prompt manager instance
 */
export function resetInstallPromptManager(): void {
  if (installPromptInstance) {
    installPromptInstance.destroy();
    installPromptInstance = null;
  }
}

export default InstallPromptManager;
