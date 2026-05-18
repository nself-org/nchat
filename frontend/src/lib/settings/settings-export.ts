/**
 * Settings Export/Import - Functions for exporting and importing settings
 */

import type {
  UserSettings,
  SettingsExport,
  SettingsImportResult,
} from "./settings-types";
import { settingsExportSchema } from "./settings-schema";
import { defaultUserSettings } from "./settings-defaults";
import { settingsManager } from "./settings-manager";

import { logger } from "@/lib/logger";

const EXPORT_VERSION = "1.0.0";

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Export all settings to a JSON string
 */
export function exportSettings(categories?: (keyof UserSettings)[]): string {
  const settings = settingsManager.getSettings();

  let settingsToExport: Partial<UserSettings>;

  if (categories && categories.length > 0) {
    settingsToExport = {};
    for (const category of categories) {
      (settingsToExport as Record<string, unknown>)[category] =
        settings[category];
    }
  } else {
    settingsToExport = settings;
  }

  const exportData: SettingsExport = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    settings: settingsToExport,
    metadata: {
      exportedCategories: categories || Object.keys(settings),
      appVersion: process.env.NEXT_PUBLIC_APP_VERSION || "0.9.1",
    },
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Export settings to a downloadable file
 */
export function downloadSettings(
  filename?: string,
  categories?: (keyof UserSettings)[],
): void {
  const json = exportSettings(categories);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download =
    filename || `nchat-settings-${new Date().toISOString().split("T")[0]}.json`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

// ============================================================================
// Import Functions
// ============================================================================

/**
 * Parse and validate a settings export
 */
export function parseSettingsExport(json: string): SettingsExport | null {
  try {
    const data = JSON.parse(json);
    const result = settingsExportSchema.safeParse(data);

    if (result.success) {
      return result.data as SettingsExport;
    } else {
      logger.error("Invalid settings export format:", result.error);
      return null;
    }
  } catch (error) {
    logger.error("Failed to parse settings export:", error);
    return null;
  }
}

/**
 * Import settings from a JSON string
 */
export function importSettings(
  json: string,
  options?: {
    merge?: boolean; // Merge with existing settings instead of replacing
    categories?: (keyof UserSettings)[]; // Only import specific categories
    validate?: boolean; // Validate each setting
  },
): SettingsImportResult {
  const result: SettingsImportResult = {
    success: false,
    imported: [],
    errors: [],
    warnings: [],
  };

  // Parse the export
  const exportData = parseSettingsExport(json);
  if (!exportData) {
    result.errors.push("Invalid settings file format");
    return result;
  }

  // Check version compatibility
  if (exportData.version !== EXPORT_VERSION) {
    result.warnings.push(
      `Settings version mismatch: expected ${EXPORT_VERSION}, got ${exportData.version}`,
    );
  }

  const { settings } = exportData;
  const categoriesToImport =
    options?.categories || (Object.keys(settings) as (keyof UserSettings)[]);

  try {
    const updates: Partial<UserSettings> = {};

    for (const category of categoriesToImport) {
      if (settings[category]) {
        const settingsRecord = updates as Record<string, unknown>;
        if (options?.merge) {
          // Merge with existing settings
          const existing = settingsManager.getCategory(category);
          settingsRecord[category] = {
            ...existing,
            ...settings[category],
          };
        } else {
          // Replace category entirely
          settingsRecord[category] = {
            ...defaultUserSettings[category],
            ...settings[category],
          };
        }
        result.imported.push(category);
      }
    }

    // Apply the updates
    settingsManager.updateSettings(updates);
    result.success = true;
  } catch (error) {
    result.errors.push(
      `Import failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  return result;
}

/**
 * Import settings from a file
 */
export async function importSettingsFromFile(
  file: File,
  options?: {
    merge?: boolean;
    categories?: (keyof UserSettings)[];
    validate?: boolean;
  },
): Promise<SettingsImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const json = event.target?.result as string;
      const result = importSettings(json, options);
      resolve(result);
    };

    reader.onerror = () => {
      resolve({
        success: false,
        imported: [],
        errors: ["Failed to read file"],
        warnings: [],
      });
    };

    reader.readAsText(file);
  });
}

// ============================================================================
// Preview Functions
// ============================================================================

/**
 * Preview settings that would be imported without actually importing them
 */
export function previewImport(json: string): {
  valid: boolean;
  categories: (keyof UserSettings)[];
  settingsCount: number;
  exportedAt?: string;
  version?: string;
} | null {
  const exportData = parseSettingsExport(json);
  if (!exportData) {
    return null;
  }

  const categories = Object.keys(exportData.settings) as (keyof UserSettings)[];
  let settingsCount = 0;

  for (const category of categories) {
    const categorySettings = exportData.settings[category];
    if (categorySettings) {
      settingsCount += Object.keys(categorySettings).length;
    }
  }

  return {
    valid: true,
    categories,
    settingsCount,
    exportedAt: exportData.exportedAt,
    version: exportData.version,
  };
}

// ============================================================================
// Diff Functions
// ============================================================================

/**
 * Get the difference between current settings and imported settings
 */
export function getSettingsDiff(json: string): {
  added: string[];
  modified: string[];
  removed: string[];
} | null {
  const exportData = parseSettingsExport(json);
  if (!exportData) {
    return null;
  }

  const currentSettings = settingsManager.getSettings();
  const importedSettings = exportData.settings;

  const diff = {
    added: [] as string[],
    modified: [] as string[],
    removed: [] as string[],
  };

  // Check each category
  for (const category of Object.keys(
    importedSettings,
  ) as (keyof UserSettings)[]) {
    const importedCategory = importedSettings[category];
    const currentCategory = currentSettings[category];

    if (!importedCategory) continue;

    for (const key of Object.keys(importedCategory)) {
      const settingKey = `${category}.${key}`;
      const importedValue =
        importedCategory[key as keyof typeof importedCategory];
      const currentValue = currentCategory[key as keyof typeof currentCategory];

      if (currentValue === undefined) {
        diff.added.push(settingKey);
      } else if (
        JSON.stringify(currentValue) !== JSON.stringify(importedValue)
      ) {
        diff.modified.push(settingKey);
      }
    }

    // Check for removed settings
    for (const key of Object.keys(currentCategory)) {
      if (!(key in importedCategory)) {
        diff.removed.push(`${category}.${key}`);
      }
    }
  }

  return diff;
}
