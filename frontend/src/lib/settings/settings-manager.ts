/**
 * Settings Manager - Centralized settings management
 */

import type { UserSettings, SettingsMetadata } from "./settings-types";
import { defaultUserSettings } from "./settings-defaults";
import {
  userSettingsSchema,
  partialUserSettingsSchema,
} from "./settings-schema";

import { logger } from "@/lib/logger";

const STORAGE_KEY = "nchat-user-settings";
const METADATA_KEY = "nchat-settings-metadata";
const SETTINGS_VERSION = "1.0.0";

// ============================================================================
// Settings Manager Class
// ============================================================================

class SettingsManager {
  private settings: UserSettings;
  private metadata: SettingsMetadata;
  private listeners: Set<(settings: UserSettings) => void>;
  private initialized: boolean = false;

  constructor() {
    this.settings = { ...defaultUserSettings };
    this.metadata = {
      version: SETTINGS_VERSION,
      lastUpdated: new Date().toISOString(),
    };
    this.listeners = new Set();
  }

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load settings from localStorage
      const storedSettings = this.loadFromStorage();
      if (storedSettings) {
        this.settings = this.mergeSettings(defaultUserSettings, storedSettings);
      }

      // Load metadata
      const storedMetadata = this.loadMetadataFromStorage();
      if (storedMetadata) {
        this.metadata = storedMetadata;
      }

      this.initialized = true;
    } catch (error) {
      logger.error("Failed to initialize settings:", error);
      this.settings = { ...defaultUserSettings };
    }
  }

  // --------------------------------------------------------------------------
  // Getters
  // --------------------------------------------------------------------------

  getSettings(): UserSettings {
    return { ...this.settings };
  }

  getCategory<K extends keyof UserSettings>(category: K): UserSettings[K] {
    return { ...this.settings[category] };
  }

  getSetting<K extends keyof UserSettings, S extends keyof UserSettings[K]>(
    category: K,
    setting: S,
  ): UserSettings[K][S] {
    return this.settings[category][setting];
  }

  getMetadata(): SettingsMetadata {
    return { ...this.metadata };
  }

  // --------------------------------------------------------------------------
  // Setters
  // --------------------------------------------------------------------------

  updateSettings(updates: Partial<UserSettings>): void {
    // Validate the updates
    const result = partialUserSettingsSchema.safeParse(updates);
    if (!result.success) {
      logger.error("Invalid settings update:", result.error);
      return;
    }

    // Merge updates with existing settings
    this.settings = this.mergeSettings(this.settings, updates);
    this.metadata.lastUpdated = new Date().toISOString();

    // Persist to storage
    this.saveToStorage();

    // Notify listeners
    this.notifyListeners();
  }

  updateCategory<K extends keyof UserSettings>(
    category: K,
    updates: Partial<UserSettings[K]>,
  ): void {
    this.updateSettings({
      [category]: {
        ...this.settings[category],
        ...updates,
      },
    } as Partial<UserSettings>);
  }

  updateSetting<K extends keyof UserSettings, S extends keyof UserSettings[K]>(
    category: K,
    setting: S,
    value: UserSettings[K][S],
  ): void {
    this.updateCategory(category, {
      [setting]: value,
    } as unknown as Partial<UserSettings[K]>);
  }

  // --------------------------------------------------------------------------
  // Reset
  // --------------------------------------------------------------------------

  resetCategory<K extends keyof UserSettings>(category: K): void {
    this.updateSettings({
      [category]: defaultUserSettings[category],
    } as Partial<UserSettings>);
  }

  resetAll(): void {
    this.settings = { ...defaultUserSettings };
    this.metadata = {
      version: SETTINGS_VERSION,
      lastUpdated: new Date().toISOString(),
    };
    this.saveToStorage();
    this.notifyListeners();
  }

  // --------------------------------------------------------------------------
  // Listeners
  // --------------------------------------------------------------------------

  subscribe(listener: (settings: UserSettings) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const settings = this.getSettings();
    this.listeners.forEach((listener) => {
      try {
        listener(settings);
      } catch (error) {
        logger.error("Settings listener error:", error);
      }
    });
  }

  // --------------------------------------------------------------------------
  // Storage
  // --------------------------------------------------------------------------

  private loadFromStorage(): Partial<UserSettings> | null {
    if (typeof window === "undefined") return null;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      const result = partialUserSettingsSchema.safeParse(parsed);

      if (result.success) {
        return result.data as Partial<UserSettings>;
      } else {
        logger.warn("Invalid stored settings, using defaults");
        return null;
      }
    } catch (error) {
      logger.error("Failed to load settings from storage:", error);
      return null;
    }
  }

  private loadMetadataFromStorage(): SettingsMetadata | null {
    if (typeof window === "undefined") return null;

    try {
      const stored = localStorage.getItem(METADATA_KEY);
      if (!stored) return null;
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  private saveToStorage(): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      localStorage.setItem(METADATA_KEY, JSON.stringify(this.metadata));
    } catch (error) {
      logger.error("Failed to save settings to storage:", error);
    }
  }

  clearStorage(): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(METADATA_KEY);
    } catch (error) {
      logger.error("Failed to clear settings storage:", error);
    }
  }

  // --------------------------------------------------------------------------
  // Merge Helper
  // --------------------------------------------------------------------------

  private mergeSettings(
    base: UserSettings,
    updates: Partial<UserSettings>,
  ): UserSettings {
    const merged = { ...base };

    for (const key of Object.keys(updates) as (keyof UserSettings)[]) {
      if (updates[key] !== undefined) {
        (merged as Record<string, unknown>)[key] = {
          ...base[key],
          ...updates[key],
        };
      }
    }

    return merged;
  }

  // --------------------------------------------------------------------------
  // Validation
  // --------------------------------------------------------------------------

  validateSettings(settings: unknown): settings is UserSettings {
    const result = userSettingsSchema.safeParse(settings);
    return result.success;
  }

  validatePartialSettings(
    settings: unknown,
  ): settings is Partial<UserSettings> {
    const result = partialUserSettingsSchema.safeParse(settings);
    return result.success;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const settingsManager = new SettingsManager();

// ============================================================================
// Convenience Functions
// ============================================================================

export function getSettings(): UserSettings {
  return settingsManager.getSettings();
}

export function getSetting<
  K extends keyof UserSettings,
  S extends keyof UserSettings[K],
>(category: K, setting: S): UserSettings[K][S] {
  return settingsManager.getSetting(category, setting);
}

export function updateSettings(updates: Partial<UserSettings>): void {
  settingsManager.updateSettings(updates);
}

export function updateSetting<
  K extends keyof UserSettings,
  S extends keyof UserSettings[K],
>(category: K, setting: S, value: UserSettings[K][S]): void {
  settingsManager.updateSetting(category, setting, value);
}

export function resetSettings(): void {
  settingsManager.resetAll();
}

export function subscribeToSettings(
  listener: (settings: UserSettings) => void,
): () => void {
  return settingsManager.subscribe(listener);
}
