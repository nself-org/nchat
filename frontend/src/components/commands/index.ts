/**
 * Commands Components Index
 *
 * Re-exports all command-related UI components.
 *
 * @example
 * ```tsx
 * import {
 *   SlashCommandMenu,
 *   CommandItem,
 *   CommandInput,
 *   CommandPreview,
 * } from '@/components/commands'
 * ```
 */

// ============================================================================
// Slash Command Menu
// ============================================================================

export {
  SlashCommandMenu,
  FloatingCommandMenu,
  InlineCommandMenu,
  type SlashCommandMenuProps,
  type FloatingCommandMenuProps,
  type InlineCommandMenuProps,
} from "./slash-command-menu";

// ============================================================================
// Command Item
// ============================================================================

export {
  CommandItem,
  CommandCategoryHeader,
  type CommandItemProps,
  type CommandCategoryHeaderProps,
} from "./command-item";

// ============================================================================
// Command Input
// ============================================================================

export {
  CommandInput,
  ArgumentInput,
  InlineCommandInput,
  type CommandInputProps,
  type ArgumentInputProps,
  type InlineCommandInputProps,
} from "./command-input";

// ============================================================================
// Command Preview
// ============================================================================

export {
  CommandPreview,
  CompactPreview,
  type CommandPreviewProps,
  type CompactPreviewProps,
} from "./command-preview";
