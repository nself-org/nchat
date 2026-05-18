/**
 * Command History
 *
 * Manages recently used commands for quick access.
 * Supports persistence to localStorage and automatic cleanup.
 */

import type { CommandHistoryEntry, Command } from "./command-types";

import { logger } from "@/lib/logger";

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_STORAGE_KEY = "nchat-command-history";
const DEFAULT_MAX_ENTRIES = 10;
const DEFAULT_EXPIRY_DAYS = 30;

// ============================================================================
// Types
// ============================================================================

export interface CommandHistoryOptions {
  /** Maximum number of history entries to keep */
  maxEntries?: number;
  /** Storage key for localStorage */
  storageKey?: string;
  /** Enable localStorage persistence */
  persist?: boolean;
  /** Number of days before entries expire */
  expiryDays?: number;
}

export interface StoredHistory {
  entries: CommandHistoryEntry[];
  lastUpdated: string;
}

// ============================================================================
// Command History Manager
// ============================================================================

export class CommandHistory {
  private entries: Map<string, CommandHistoryEntry> = new Map();
  private options: Required<CommandHistoryOptions>;

  constructor(options: CommandHistoryOptions = {}) {
    this.options = {
      maxEntries: options.maxEntries ?? DEFAULT_MAX_ENTRIES,
      storageKey: options.storageKey ?? DEFAULT_STORAGE_KEY,
      persist: options.persist ?? true,
      expiryDays: options.expiryDays ?? DEFAULT_EXPIRY_DAYS,
    };

    if (this.options.persist) {
      this.loadFromStorage();
    }
  }

  // ============================================================================
  // Core Methods
  // ============================================================================

  /**
   * Add a command to history
   */
  add(commandId: string): void {
    const existing = this.entries.get(commandId);

    if (existing) {
      // Update existing entry
      existing.executedAt = new Date();
      existing.count += 1;
    } else {
      // Add new entry
      this.entries.set(commandId, {
        commandId,
        executedAt: new Date(),
        count: 1,
      });
    }

    // Enforce max entries limit
    this.enforceLimit();

    // Persist to storage
    if (this.options.persist) {
      this.saveToStorage();
    }
  }

  /**
   * Get all history entries sorted by recency
   */
  getAll(): CommandHistoryEntry[] {
    return Array.from(this.entries.values()).sort(
      (a, b) => b.executedAt.getTime() - a.executedAt.getTime(),
    );
  }

  /**
   * Get recent command IDs (sorted by recency)
   */
  getRecentIds(limit?: number): string[] {
    const entries = this.getAll();
    const maxLimit = limit ?? this.options.maxEntries;
    return entries.slice(0, maxLimit).map((e) => e.commandId);
  }

  /**
   * Get history entry for a specific command
   */
  get(commandId: string): CommandHistoryEntry | undefined {
    return this.entries.get(commandId);
  }

  /**
   * Check if a command is in history
   */
  has(commandId: string): boolean {
    return this.entries.has(commandId);
  }

  /**
   * Remove a command from history
   */
  remove(commandId: string): boolean {
    const result = this.entries.delete(commandId);
    if (result && this.options.persist) {
      this.saveToStorage();
    }
    return result;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.entries.clear();
    if (this.options.persist) {
      this.clearStorage();
    }
  }

  /**
   * Get the number of history entries
   */
  get size(): number {
    return this.entries.size;
  }

  // ============================================================================
  // Command Marking
  // ============================================================================

  /**
   * Mark commands as recent based on history
   */
  markRecentCommands(commands: Command[]): Command[] {
    const recentIds = new Set(this.getRecentIds());

    return commands.map((cmd) => ({
      ...cmd,
      isRecent: recentIds.has(cmd.id),
    }));
  }

  /**
   * Filter to get only recent commands
   */
  filterRecentCommands(commands: Command[]): Command[] {
    const recentIds = this.getRecentIds();
    const commandMap = new Map(commands.map((c) => [c.id, c]));

    return recentIds
      .map((id) => commandMap.get(id))
      .filter((c): c is Command => c !== undefined)
      .map((c) => ({ ...c, isRecent: true }));
  }

  // ============================================================================
  // Storage Methods
  // ============================================================================

  private loadFromStorage(): void {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(this.options.storageKey);
      if (!stored) return;

      const parsed: StoredHistory = JSON.parse(stored);

      // Convert stored entries to Map
      for (const entry of parsed.entries) {
        // Check if entry has expired
        const executedAt = new Date(entry.executedAt);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() - this.options.expiryDays);

        if (executedAt > expiryDate) {
          this.entries.set(entry.commandId, {
            ...entry,
            executedAt,
          });
        }
      }

      // Enforce limit after loading
      this.enforceLimit();
    } catch {
      logger.warn("Failed to load command history from storage");
      this.clearStorage();
    }
  }

  private saveToStorage(): void {
    if (typeof window === "undefined") return;

    try {
      const data: StoredHistory = {
        entries: this.getAll(),
        lastUpdated: new Date().toISOString(),
      };

      localStorage.setItem(this.options.storageKey, JSON.stringify(data));
    } catch {
      logger.warn("Failed to save command history to storage");
    }
  }

  private clearStorage(): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(this.options.storageKey);
    } catch {
      logger.warn("Failed to clear command history from storage");
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private enforceLimit(): void {
    if (this.entries.size <= this.options.maxEntries) return;

    // Get entries sorted by recency (oldest first for deletion)
    const sorted = this.getAll().reverse();
    const toRemove = sorted.slice(
      0,
      this.entries.size - this.options.maxEntries,
    );

    for (const entry of toRemove) {
      this.entries.delete(entry.commandId);
    }
  }

  /**
   * Export history as JSON
   */
  export(): string {
    return JSON.stringify({
      entries: this.getAll(),
      exportedAt: new Date().toISOString(),
    });
  }

  /**
   * Import history from JSON
   */
  import(json: string): void {
    try {
      const data = JSON.parse(json);
      if (Array.isArray(data.entries)) {
        for (const entry of data.entries) {
          this.entries.set(entry.commandId, {
            ...entry,
            executedAt: new Date(entry.executedAt),
          });
        }
        this.enforceLimit();
        if (this.options.persist) {
          this.saveToStorage();
        }
      }
    } catch {
      logger.error("Failed to import command history");
    }
  }

  /**
   * Get statistics about command usage
   */
  getStats(): {
    totalExecutions: number;
    uniqueCommands: number;
    mostUsed: { commandId: string; count: number } | null;
  } {
    const entries = this.getAll();

    if (entries.length === 0) {
      return {
        totalExecutions: 0,
        uniqueCommands: 0,
        mostUsed: null,
      };
    }

    const totalExecutions = entries.reduce((sum, e) => sum + e.count, 0);
    const mostUsed = entries.reduce((max, e) =>
      e.count > max.count ? e : max,
    );

    return {
      totalExecutions,
      uniqueCommands: entries.length,
      mostUsed: { commandId: mostUsed.commandId, count: mostUsed.count },
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let historyInstance: CommandHistory | null = null;

/**
 * Get the global command history instance
 */
export function getCommandHistory(
  options?: CommandHistoryOptions,
): CommandHistory {
  if (!historyInstance) {
    historyInstance = new CommandHistory(options);
  }
  return historyInstance;
}

/**
 * Reset the global history instance
 */
export function resetCommandHistory(): void {
  historyInstance?.clear();
  historyInstance = null;
}

export default CommandHistory;
