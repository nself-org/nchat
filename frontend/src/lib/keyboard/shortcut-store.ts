/**
 * Shortcut Store
 *
 * Zustand store for managing keyboard shortcut customization.
 * Handles custom shortcuts, disabled shortcuts, and shortcut preferences.
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { SHORTCUTS, ShortcutKey, ShortcutCategory } from "./shortcuts";
import { shortcutsConflict, isValidShortcut } from "./shortcut-utils";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface CustomShortcut {
  /** The original shortcut key from SHORTCUTS */
  id: ShortcutKey;
  /** Custom key binding (if changed from default) */
  customKey?: string;
  /** Whether this shortcut is disabled */
  disabled?: boolean;
}

export interface ShortcutConflict {
  /** The shortcut that conflicts */
  shortcutId: ShortcutKey;
  /** The conflicting key binding */
  key: string;
  /** List of shortcuts using the same key */
  conflictsWith: ShortcutKey[];
}

export interface ShortcutStoreState {
  /** Map of custom shortcuts by ID */
  customShortcuts: Record<string, CustomShortcut>;
  /** Set of globally disabled shortcut IDs */
  disabledShortcuts: Set<string>;
  /** Whether shortcuts are globally enabled */
  shortcutsEnabled: boolean;
  /** Whether to show keyboard hints in tooltips */
  showKeyboardHints: boolean;
  /** Pending shortcut being recorded */
  recordingShortcut: ShortcutKey | null;
  /** Detected conflicts */
  conflicts: ShortcutConflict[];
}

export interface ShortcutStoreActions {
  // Shortcut customization
  setCustomKey: (id: ShortcutKey, key: string) => void;
  resetToDefault: (id: ShortcutKey) => void;
  resetAllToDefaults: () => void;

  // Enable/disable
  disableShortcut: (id: ShortcutKey) => void;
  enableShortcut: (id: ShortcutKey) => void;
  toggleShortcut: (id: ShortcutKey) => void;
  setShortcutsEnabled: (enabled: boolean) => void;

  // Recording
  startRecording: (id: ShortcutKey) => void;
  stopRecording: () => void;
  recordKey: (key: string) => boolean;

  // Preferences
  setShowKeyboardHints: (show: boolean) => void;

  // Getters
  getEffectiveKey: (id: ShortcutKey) => string;
  isShortcutEnabled: (id: ShortcutKey) => boolean;
  getConflicts: () => ShortcutConflict[];

  // Validation
  validateShortcut: (
    key: string,
    excludeId?: ShortcutKey,
  ) => ShortcutKey | null;

  // Export/Import
  exportCustomizations: () => string;
  importCustomizations: (json: string) => boolean;
}

export type ShortcutStore = ShortcutStoreState & ShortcutStoreActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: ShortcutStoreState = {
  customShortcuts: {},
  disabledShortcuts: new Set(),
  shortcutsEnabled: true,
  showKeyboardHints: true,
  recordingShortcut: null,
  conflicts: [],
};

// ============================================================================
// Store
// ============================================================================

export const useShortcutStore = create<ShortcutStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // Shortcut customization
        setCustomKey: (id, key) => {
          if (!isValidShortcut(key)) {
            logger.warn(`Invalid shortcut key: ${key}`);
            return;
          }

          set(
            (state) => {
              if (!state.customShortcuts[id]) {
                state.customShortcuts[id] = { id };
              }
              state.customShortcuts[id].customKey = key;

              // Check for conflicts
              state.conflicts = detectConflicts(state.customShortcuts);
            },
            false,
            "shortcut/setCustomKey",
          );
        },

        resetToDefault: (id) => {
          set(
            (state) => {
              if (state.customShortcuts[id]) {
                delete state.customShortcuts[id].customKey;

                // If no customizations left, remove the entry
                if (!state.customShortcuts[id].disabled) {
                  delete state.customShortcuts[id];
                }
              }

              state.conflicts = detectConflicts(state.customShortcuts);
            },
            false,
            "shortcut/resetToDefault",
          );
        },

        resetAllToDefaults: () => {
          set(
            (state) => {
              state.customShortcuts = {};
              state.disabledShortcuts = new Set();
              state.conflicts = [];
            },
            false,
            "shortcut/resetAllToDefaults",
          );
        },

        // Enable/disable
        disableShortcut: (id) => {
          set(
            (state) => {
              if (!state.customShortcuts[id]) {
                state.customShortcuts[id] = { id };
              }
              state.customShortcuts[id].disabled = true;
              state.disabledShortcuts.add(id);
            },
            false,
            "shortcut/disableShortcut",
          );
        },

        enableShortcut: (id) => {
          set(
            (state) => {
              if (state.customShortcuts[id]) {
                state.customShortcuts[id].disabled = false;

                // If no other customizations, remove the entry
                if (!state.customShortcuts[id].customKey) {
                  delete state.customShortcuts[id];
                }
              }
              state.disabledShortcuts.delete(id);
            },
            false,
            "shortcut/enableShortcut",
          );
        },

        toggleShortcut: (id) => {
          const state = get();
          if (state.isShortcutEnabled(id)) {
            state.disableShortcut(id);
          } else {
            state.enableShortcut(id);
          }
        },

        setShortcutsEnabled: (enabled) => {
          set(
            (state) => {
              state.shortcutsEnabled = enabled;
            },
            false,
            "shortcut/setShortcutsEnabled",
          );
        },

        // Recording
        startRecording: (id) => {
          set(
            (state) => {
              state.recordingShortcut = id;
            },
            false,
            "shortcut/startRecording",
          );
        },

        stopRecording: () => {
          set(
            (state) => {
              state.recordingShortcut = null;
            },
            false,
            "shortcut/stopRecording",
          );
        },

        recordKey: (key) => {
          const state = get();
          if (!state.recordingShortcut) return false;

          // Validate the key
          if (!isValidShortcut(key)) {
            return false;
          }

          // Check for conflicts
          const conflict = state.validateShortcut(key, state.recordingShortcut);
          if (conflict) {
            logger.warn(`Shortcut ${key} conflicts with ${conflict}`);
            // Still allow setting but warn user
          }

          state.setCustomKey(state.recordingShortcut, key);
          state.stopRecording();
          return true;
        },

        // Preferences
        setShowKeyboardHints: (show) => {
          set(
            (state) => {
              state.showKeyboardHints = show;
            },
            false,
            "shortcut/setShowKeyboardHints",
          );
        },

        // Getters
        getEffectiveKey: (id) => {
          const state = get();
          const custom = state.customShortcuts[id];

          if (custom?.customKey) {
            return custom.customKey;
          }

          const shortcut = SHORTCUTS[id];
          return shortcut?.key || "";
        },

        isShortcutEnabled: (id) => {
          const state = get();

          // Check global toggle
          if (!state.shortcutsEnabled) return false;

          // Check individual disabled
          const custom = state.customShortcuts[id];
          if (custom?.disabled) return false;

          return true;
        },

        getConflicts: () => {
          return get().conflicts;
        },

        // Validation
        validateShortcut: (key, excludeId) => {
          const state = get();

          // Check against all shortcuts
          for (const [id, shortcut] of Object.entries(SHORTCUTS)) {
            if (excludeId && id === excludeId) continue;

            const effectiveKey = state.getEffectiveKey(id as ShortcutKey);

            if (shortcutsConflict(key, effectiveKey)) {
              return id as ShortcutKey;
            }
          }

          return null;
        },

        // Export/Import
        exportCustomizations: () => {
          const state = get();
          return JSON.stringify({
            customShortcuts: state.customShortcuts,
            disabledShortcuts: Array.from(state.disabledShortcuts),
            showKeyboardHints: state.showKeyboardHints,
          });
        },

        importCustomizations: (json) => {
          try {
            const data = JSON.parse(json);

            set(
              (state) => {
                if (data.customShortcuts) {
                  state.customShortcuts = data.customShortcuts;
                }
                if (data.disabledShortcuts) {
                  state.disabledShortcuts = new Set(data.disabledShortcuts);
                }
                if (typeof data.showKeyboardHints === "boolean") {
                  state.showKeyboardHints = data.showKeyboardHints;
                }
                state.conflicts = detectConflicts(state.customShortcuts);
              },
              false,
              "shortcut/importCustomizations",
            );

            return true;
          } catch (error) {
            logger.error("Failed to import shortcut customizations:", error);
            return false;
          }
        },
      })),
      {
        name: "nchat-shortcuts",
        partialize: (state) => ({
          customShortcuts: state.customShortcuts,
          disabledShortcuts: Array.from(state.disabledShortcuts),
          showKeyboardHints: state.showKeyboardHints,
        }),
        // Transform data on rehydration
        onRehydrateStorage: () => (state) => {
          if (state) {
            // Convert disabledShortcuts array back to Set
            if (Array.isArray(state.disabledShortcuts)) {
              state.disabledShortcuts = new Set(
                state.disabledShortcuts as unknown as string[],
              );
            }
          }
        },
      },
    ),
    { name: "shortcut-store" },
  ),
);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Detect conflicts in the current shortcut configuration
 */
function detectConflicts(
  customShortcuts: Record<string, CustomShortcut>,
): ShortcutConflict[] {
  const conflicts: ShortcutConflict[] = [];
  const keyMap = new Map<string, ShortcutKey[]>();

  // Build a map of keys to shortcuts
  for (const [id, shortcut] of Object.entries(SHORTCUTS)) {
    const custom = customShortcuts[id];
    const effectiveKey = custom?.customKey || shortcut.key;

    if (!keyMap.has(effectiveKey)) {
      keyMap.set(effectiveKey, []);
    }
    keyMap.get(effectiveKey)!.push(id as ShortcutKey);
  }

  // Find conflicts
  for (const [key, ids] of keyMap) {
    if (ids.length > 1) {
      for (const id of ids) {
        conflicts.push({
          shortcutId: id,
          key,
          conflictsWith: ids.filter((i) => i !== id),
        });
      }
    }
  }

  return conflicts;
}

// ============================================================================
// Selectors
// ============================================================================

export const selectCustomShortcuts = (state: ShortcutStore) =>
  state.customShortcuts;

export const selectDisabledShortcuts = (state: ShortcutStore) =>
  state.disabledShortcuts;

export const selectShortcutsEnabled = (state: ShortcutStore) =>
  state.shortcutsEnabled;

export const selectShowKeyboardHints = (state: ShortcutStore) =>
  state.showKeyboardHints;

export const selectRecordingShortcut = (state: ShortcutStore) =>
  state.recordingShortcut;

export const selectConflicts = (state: ShortcutStore) => state.conflicts;

export const selectCustomShortcut =
  (id: ShortcutKey) => (state: ShortcutStore) =>
    state.customShortcuts[id];

export const selectEffectiveKey = (id: ShortcutKey) => (state: ShortcutStore) =>
  state.getEffectiveKey(id);

export const selectIsShortcutEnabled =
  (id: ShortcutKey) => (state: ShortcutStore) =>
    state.isShortcutEnabled(id);

/**
 * Select all shortcuts with their effective keys and enabled status
 */
export const selectAllShortcutsWithState = (state: ShortcutStore) => {
  return Object.entries(SHORTCUTS).map(([id, shortcut]) => ({
    id: id as ShortcutKey,
    ...shortcut,
    effectiveKey: state.getEffectiveKey(id as ShortcutKey),
    isEnabled: state.isShortcutEnabled(id as ShortcutKey),
    isCustomized: !!state.customShortcuts[id]?.customKey,
  }));
};

/**
 * Select shortcuts grouped by category with state
 */
export const selectShortcutsByCategory = (state: ShortcutStore) => {
  const all = selectAllShortcutsWithState(state);
  const grouped: Record<ShortcutCategory, typeof all> = {
    Navigation: [],
    Messages: [],
    Formatting: [],
    UI: [],
    Actions: [],
  };

  for (const shortcut of all) {
    grouped[shortcut.category].push(shortcut);
  }

  return grouped;
};
