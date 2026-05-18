/**
 * Mentions Library - Store and hooks for mentions management
 *
 * This module exports the Zustand store and React hooks for
 * managing mentions in the nself-chat application.
 *
 * @example
 * ```tsx
 * import {
 *   useMentionStore,
 *   useMentions,
 *   useMentionAutocomplete,
 *   useMentionPermissions,
 *   useUnreadMentionsCount,
 * } from '@/lib/mentions'
 * ```
 */

// Store exports
export {
  useMentionStore,
  // Types
  type MentionType,
  type MentionUser,
  type MentionChannel,
  type MentionMessage,
  type Mention,
  type MentionPanelState,
  type MentionState,
  type MentionActions,
  type MentionStore,
  // Selectors
  selectMentions,
  selectUnreadMentions,
  selectUnreadCount,
  selectMentionById,
  selectMentionsByChannel,
  selectIsPanelOpen,
  selectPanelFilter,
  selectSelectedMentionId,
  selectIsLoading,
  selectError,
  // Helpers
  getMentionTypeLabel,
  getMentionTypeIcon,
  isGroupMention,
  extractMentionPreview,
  normalizeMention,
} from "./mention-store";

// Hook exports
export {
  useMentions,
  useMentionAutocomplete,
  useMentionPermissions,
  useUnreadMentionsCount,
  // Types
  type UseMentionsOptions,
  type UseMentionsReturn,
  type UseMentionAutocompleteOptions,
  type UseMentionAutocompleteReturn,
  type UseMentionPermissionsOptions,
  type UseMentionPermissionsReturn,
  type MentionableUser,
  type GroupMentionPermissions,
  // Utilities
  MENTION_REGEX,
  parseMentions,
  getMentionType,
  isSpecialMention,
  formatMention,
} from "./use-mentions";
