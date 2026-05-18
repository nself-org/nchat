/**
 * Keyboard Shortcuts Module
 *
 * Provides a complete keyboard shortcuts system for nself-chat.
 *
 * @example
 * ```tsx
 * // In your app root
 * import { KeyboardProvider } from '@/lib/keyboard';
 *
 * function App() {
 *   return (
 *     <KeyboardProvider>
 *       <YourApp />
 *     </KeyboardProvider>
 *   );
 * }
 *
 * // In your components
 * import { useShortcut, SHORTCUTS } from '@/lib/keyboard';
 *
 * function MyComponent() {
 *   useShortcut('QUICK_SWITCHER', () => {
 *     openQuickSwitcher();
 *   });
 * }
 *
 * // Using the simpler useHotkey hook
 * import { useHotkey } from '@/hooks/use-hotkey';
 * useHotkey('mod+k', () => openQuickSwitcher());
 * ```
 */

// Provider and context
export {
  KeyboardProvider,
  useKeyboard,
  useModalScope,
  useKeyboardDisable,
  useScopedKeyboard,
  type KeyboardProviderProps,
  type KeyboardContextValue,
  type KeyboardScope,
} from "./keyboard-provider";

// Shortcut definitions
export {
  SHORTCUTS,
  getShortcutsByCategory,
  getShortcutsGrouped,
  formatKeyForDisplay,
  isMacOS,
  getCategories,
  type ShortcutKey,
  type ShortcutDefinition,
  type ShortcutCategory,
} from "./shortcuts";

// Hooks for registering shortcuts
export {
  useShortcut,
  useShortcuts,
  useCustomShortcut,
  useShortcutInfo,
  type UseShortcutOptions,
  type ShortcutHandler as ShortcutHandlerFn,
} from "./use-shortcuts";

// Advanced keyboard shortcuts hooks
export {
  useKeyboardShortcuts,
  useSingleShortcut,
  useContextShortcuts,
  useShortcutDisplay,
  useAllShortcuts,
  type ShortcutCallback,
  type ShortcutBinding,
  type UseKeyboardShortcutsOptions,
  type UseKeyboardShortcutsReturn,
  type ShortcutWithState,
} from "./use-keyboard-shortcuts";

// Shortcut utilities
export {
  parseShortcut,
  matchesShortcut,
  formatShortcut,
  formatKeyArray,
  formatKey,
  splitShortcutForDisplay,
  isValidShortcut,
  shortcutsConflict,
  getModifierKeyText,
  getModifierKeySymbol,
  createShortcut,
  eventToShortcut,
  isInputElement,
  shouldIgnoreShortcut,
  getPlatform,
  isWindows,
  isLinux,
  type ParsedShortcut,
  type ModifierKey,
  type KeyDisplayOptions,
} from "./shortcut-utils";

// Shortcut store
export {
  useShortcutStore,
  selectCustomShortcuts,
  selectDisabledShortcuts,
  selectShortcutsEnabled,
  selectShowKeyboardHints,
  selectRecordingShortcut,
  selectConflicts,
  selectCustomShortcut,
  selectEffectiveKey,
  selectIsShortcutEnabled,
  selectAllShortcutsWithState,
  selectShortcutsByCategory,
  type CustomShortcut,
  type ShortcutConflict,
  type ShortcutStoreState,
  type ShortcutStoreActions,
  type ShortcutStore,
} from "./shortcut-store";

// Shortcut handler
export {
  ShortcutHandler,
  getGlobalShortcutHandler,
  createShortcutHandler,
  ShortcutActions,
  type ShortcutActionHandler,
  type ShortcutContext,
  type ShortcutHandlerOptions,
  type RegisteredHandler,
  type ShortcutAction,
} from "./shortcut-handler";
