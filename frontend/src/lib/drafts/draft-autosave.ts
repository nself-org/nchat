/**
 * Draft Auto-save - Handles automatic saving of drafts
 *
 * Provides debounced auto-save functionality with status tracking
 */

import type {
  Draft,
  AutoSaveConfig,
  AutoSaveState,
  AutoSaveStatus,
  DraftEventListener,
} from "./draft-types";

import { getDraftStorage, DraftStorage } from "./draft-storage";

import { logger } from "@/lib/logger";

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_AUTOSAVE_CONFIG: AutoSaveConfig = {
  enabled: true,
  debounceMs: 500,
  intervalMs: 30000, // 30 seconds
  minContentLength: 1,
  saveOnBlur: true,
  saveOnChannelSwitch: true,
};

// ============================================================================
// Auto-save Manager Class
// ============================================================================

/**
 * Manages auto-save functionality for drafts
 */
export class DraftAutoSaveManager {
  private config: AutoSaveConfig;
  private storage: DraftStorage;
  private state: AutoSaveState;
  private listeners: Set<DraftEventListener>;
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>>;
  private intervalTimer: ReturnType<typeof setInterval> | null;
  private pendingDrafts: Map<string, Draft>;

  constructor(config: Partial<AutoSaveConfig> = {}, storage?: DraftStorage) {
    this.config = { ...DEFAULT_AUTOSAVE_CONFIG, ...config };
    this.storage = storage || getDraftStorage();
    this.state = {
      status: "idle",
      lastSaveTime: null,
      error: null,
      pendingChanges: false,
    };
    this.listeners = new Set();
    this.debounceTimers = new Map();
    this.intervalTimer = null;
    this.pendingDrafts = new Map();
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  /**
   * Update auto-save configuration
   */
  updateConfig(config: Partial<AutoSaveConfig>): void {
    const wasEnabled = this.config.enabled;
    this.config = { ...this.config, ...config };

    // Handle enable/disable state change
    if (wasEnabled && !this.config.enabled) {
      this.stop();
    } else if (!wasEnabled && this.config.enabled) {
      this.start();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AutoSaveConfig {
    return { ...this.config };
  }

  /**
   * Enable auto-save
   */
  enable(): void {
    this.updateConfig({ enabled: true });
  }

  /**
   * Disable auto-save
   */
  disable(): void {
    this.updateConfig({ enabled: false });
  }

  /**
   * Check if auto-save is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  // ============================================================================
  // State Management
  // ============================================================================

  /**
   * Get current auto-save state
   */
  getState(): AutoSaveState {
    return { ...this.state };
  }

  /**
   * Get current status
   */
  getStatus(): AutoSaveStatus {
    return this.state.status;
  }

  private updateState(updates: Partial<AutoSaveState>): void {
    this.state = { ...this.state, ...updates };
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  /**
   * Add event listener
   */
  addEventListener(listener: DraftEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: DraftEventListener): void {
    this.listeners.delete(listener);
  }

  private emit(
    type: "autosave_start" | "autosave_complete" | "autosave_error",
    contextKey?: string,
    draft?: Draft,
    error?: string,
  ): void {
    const event = {
      type,
      contextKey,
      draft,
      timestamp: Date.now(),
      error,
    };

    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        logger.error("Error in auto-save event listener:", err);
      }
    });
  }

  // ============================================================================
  // Auto-save Logic
  // ============================================================================

  /**
   * Schedule auto-save for a draft (debounced)
   */
  schedule(contextKey: string, draft: Draft): void {
    if (!this.config.enabled) return;

    // Skip if content is too short
    if (draft.content.length < this.config.minContentLength) {
      // Clear any pending save for this context
      this.cancelScheduled(contextKey);
      this.pendingDrafts.delete(contextKey);
      return;
    }

    // Store the pending draft
    this.pendingDrafts.set(contextKey, draft);
    this.updateState({ pendingChanges: true });

    // Cancel any existing timer for this context
    this.cancelScheduled(contextKey);

    // Schedule new save with debounce
    const timer = setTimeout(() => {
      this.saveNow(contextKey);
    }, this.config.debounceMs);

    this.debounceTimers.set(contextKey, timer);
  }

  /**
   * Cancel scheduled auto-save for a context
   */
  cancelScheduled(contextKey: string): void {
    const timer = this.debounceTimers.get(contextKey);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(contextKey);
    }
  }

  /**
   * Cancel all scheduled auto-saves
   */
  cancelAll(): void {
    this.debounceTimers.forEach((timer) => clearTimeout(timer));
    this.debounceTimers.clear();
  }

  /**
   * Save a draft immediately (bypass debounce)
   */
  async saveNow(contextKey: string): Promise<boolean> {
    const draft = this.pendingDrafts.get(contextKey);
    if (!draft) return false;

    // Remove from pending
    this.pendingDrafts.delete(contextKey);
    this.debounceTimers.delete(contextKey);

    // Update status
    this.updateState({ status: "saving" });
    this.emit("autosave_start", contextKey, draft);

    try {
      // Save to storage
      await this.storage.set(contextKey, {
        ...draft,
        lastModified: Date.now(),
      });

      // Update state
      this.updateState({
        status: "saved",
        lastSaveTime: Date.now(),
        error: null,
        pendingChanges: this.pendingDrafts.size > 0,
      });

      this.emit("autosave_complete", contextKey, draft);
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      this.updateState({
        status: "error",
        error: errorMessage,
      });

      this.emit("autosave_error", contextKey, draft, errorMessage);
      return false;
    }
  }

  /**
   * Save all pending drafts immediately
   */
  async saveAllPending(): Promise<number> {
    const contextKeys = Array.from(this.pendingDrafts.keys());
    let savedCount = 0;

    for (const contextKey of contextKeys) {
      const success = await this.saveNow(contextKey);
      if (success) savedCount++;
    }

    return savedCount;
  }

  /**
   * Handle blur event (save if configured)
   */
  async handleBlur(contextKey: string): Promise<void> {
    if (!this.config.saveOnBlur) return;
    if (this.pendingDrafts.has(contextKey)) {
      await this.saveNow(contextKey);
    }
  }

  /**
   * Handle channel switch (save if configured)
   */
  async handleChannelSwitch(oldContextKey: string): Promise<void> {
    if (!this.config.saveOnChannelSwitch) return;
    if (this.pendingDrafts.has(oldContextKey)) {
      await this.saveNow(oldContextKey);
    }
  }

  // ============================================================================
  // Interval Auto-save
  // ============================================================================

  /**
   * Start periodic auto-save interval
   */
  start(): void {
    if (!this.config.enabled) return;
    if (this.intervalTimer) return;

    this.intervalTimer = setInterval(() => {
      this.saveAllPending();
    }, this.config.intervalMs);
  }

  /**
   * Stop periodic auto-save interval
   */
  stop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.cancelAll();
  }

  /**
   * Check if interval is running
   */
  isRunning(): boolean {
    return this.intervalTimer !== null;
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Cleanup and stop auto-save
   */
  destroy(): void {
    this.stop();
    this.pendingDrafts.clear();
    this.listeners.clear();
    this.updateState({
      status: "idle",
      lastSaveTime: null,
      error: null,
      pendingChanges: false,
    });
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let autoSaveManagerInstance: DraftAutoSaveManager | null = null;

/**
 * Get the singleton auto-save manager instance
 */
export function getAutoSaveManager(
  config?: Partial<AutoSaveConfig>,
): DraftAutoSaveManager {
  if (!autoSaveManagerInstance) {
    autoSaveManagerInstance = new DraftAutoSaveManager(config);
  }
  return autoSaveManagerInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetAutoSaveManager(): void {
  if (autoSaveManagerInstance) {
    autoSaveManagerInstance.destroy();
    autoSaveManagerInstance = null;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a debounced auto-save function for a specific context
 */
export function createDebouncedSave(
  contextKey: string,
  onSave: (draft: Draft) => Promise<void>,
  debounceMs: number = DEFAULT_AUTOSAVE_CONFIG.debounceMs,
): (draft: Draft) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (draft: Draft) => {
    if (timer) clearTimeout(timer);

    timer = setTimeout(async () => {
      await onSave(draft);
      timer = null;
    }, debounceMs);
  };
}

/**
 * Format last save time for display
 */
export function formatLastSaveTime(timestamp: number | null): string {
  if (!timestamp) return "Never saved";

  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 1000) return "Just now";
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

  return new Date(timestamp).toLocaleDateString();
}

/**
 * Get auto-save status text
 */
export function getAutoSaveStatusText(state: AutoSaveState): string {
  switch (state.status) {
    case "idle":
      return state.pendingChanges ? "Unsaved changes" : "No changes";
    case "saving":
      return "Saving...";
    case "saved":
      return `Saved ${formatLastSaveTime(state.lastSaveTime)}`;
    case "error":
      return `Save failed: ${state.error}`;
    default:
      return "";
  }
}
