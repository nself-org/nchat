/**
 * Keyboard Shortcuts UI Components
 *
 * Provides UI components for displaying and managing keyboard shortcuts.
 *
 * @example
 * ```tsx
 * import {
 *   KeyboardShortcutsModal,
 *   ShortcutKey,
 *   ShortcutItem,
 *   ShortcutCategory,
 * } from '@/components/keyboard';
 *
 * // Show keyboard shortcuts modal
 * const { isOpen, toggle } = useKeyboardShortcutsModal();
 * useHotkey('?', toggle);
 * <KeyboardShortcutsModal open={isOpen} onOpenChange={setIsOpen} />
 *
 * // Display a shortcut key combination
 * <ShortcutKey keys="mod+k" />
 *
 * // Display a shortcut item
 * <ShortcutItem
 *   id="QUICK_SWITCHER"
 *   label="Quick switcher"
 *   keys="mod+k"
 * />
 * ```
 */

// Modal
export {
  KeyboardShortcutsModal,
  useKeyboardShortcutsModal,
  type KeyboardShortcutsModalProps,
} from "./keyboard-shortcuts-modal";

// Key display
export {
  ShortcutKey,
  SingleKey,
  ModifierKey,
  KeyCombo,
  type ShortcutKeyProps,
  type SingleKeyProps,
  type ModifierKeyProps,
  type KeyComboProps,
  type KeySize,
  type KeyVariant,
} from "./shortcut-key";

// Shortcut items
export {
  ShortcutItem,
  ShortcutItemCompact,
  ShortcutItemEditable,
  type ShortcutItemProps,
  type ShortcutItemCompactProps,
  type ShortcutItemEditableProps,
} from "./shortcut-item";

// Category display
export {
  ShortcutCategory,
  ShortcutCategoryList,
  type ShortcutCategoryProps,
  type ShortcutCategoryListProps,
  type ShortcutData,
} from "./shortcut-category";
