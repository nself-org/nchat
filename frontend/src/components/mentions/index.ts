/**
 * Mentions Components - Complete mentions management system
 *
 * This module exports all components and utilities for handling
 * @mentions in the nself-chat application.
 *
 * @example
 * ```tsx
 * import {
 *   MentionsPanel,
 *   MentionsButton,
 *   MentionAutocomplete,
 *   MentionHighlight,
 *   MentionHighlightedText,
 *   GroupMentionGuard,
 * } from '@/components/mentions'
 * ```
 */

// Panel components
export {
  MentionsPanel,
  MentionsPanelInline,
  type MentionsPanelProps,
  type MentionsPanelInlineProps,
} from "./mentions-panel";

// Button components
export {
  MentionsButton,
  MentionsButtonSimple,
  MentionsNavItem,
  MentionsIndicator,
  type MentionsButtonProps,
  type MentionsButtonSimpleProps,
  type MentionsNavItemProps,
  type MentionsIndicatorProps,
} from "./mentions-button";

// Item components
export {
  MentionItem,
  MentionItemCompact,
  type MentionItemProps,
  type MentionItemCompactProps,
} from "./mention-item";

// Autocomplete components
export {
  MentionAutocomplete,
  type MentionAutocompleteProps,
  type MentionSuggestion,
} from "./mention-autocomplete";

// Highlight components
export {
  MentionHighlight,
  MentionHighlightedText,
  MentionBadge,
  InlineMention,
  hasMentions,
  containsUserMention,
  containsSpecialMention,
  extractMentionedUsernames,
  type MentionHighlightProps,
  type MentionHighlightedTextProps,
  type MentionBadgeProps,
  type InlineMentionProps,
} from "./mention-highlight";

// Group mention components
export {
  GroupMentionGuard,
  GroupMentionConfirmDialog,
  GroupMentionBadge,
  GroupMentionIndicator,
  GroupMentionPermissionDenied,
  useGroupMentionDetection,
  type GroupMentionGuardProps,
  type GroupMentionConfirmDialogProps,
  type GroupMentionBadgeProps,
  type GroupMentionIndicatorProps,
  type GroupMentionPermissionDeniedProps,
  type GroupMentionInfo,
  type UseGroupMentionDetectionOptions,
  type UseGroupMentionDetectionReturn,
} from "./group-mentions";
