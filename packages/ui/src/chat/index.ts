/**
 * chat domain barrel export — messages, bubble, and composer sub-domains.
 *
 * @module chat
 */

// ============================================================================
// Messages
// ============================================================================
export type {
  MessageVersion,
  MessageEditHistory,
  PinnedMessage,
  PinFilters,
  PinSortBy,
  SortOrder,
  ChannelPinStats,
  Bookmark,
  BookmarkFolder,
  BookmarkChannel,
  BookmarkMessage,
  BookmarkSortBy,
} from './messages'

export { EditHistory, EditHistoryPanel } from './messages'
export type {
  EditHistoryProps,
  EditHistoryPanelProps,
} from './messages'

export { PinnedMessages } from './messages'
export type {
  PinnedMessagesAdapter,
  PinnedMessagesProps,
} from './messages'

export { BookmarksPanel } from './messages'
export type {
  BookmarksAdapter,
  BookmarksPanelProps,
} from './messages'

// ============================================================================
// Bubble
// ============================================================================
export type {
  ReactionAggregate,
  PlatformReactionConfig,
  ThreadParticipant,
  ThreadMessage,
  Thread,
  ThreadPreviewParticipant,
  ThreadPreviewData,
  MentionUser,
  MentionChannel,
  MentionSuggestionType,
  MentionSuggestion,
  LinkPreviewData,
  Mention,
  Attachment,
} from './bubble'

export { PlatformReactions, QuickReactionBar, HoverReactionBar } from './bubble'
export type {
  ReactionsAdapter,
  PlatformReactionsProps,
  QuickReactionBarProps,
  HoverReactionBarProps,
} from './bubble'

export {
  ThreadHeader,
  ThreadHeaderCompact,
  ThreadReplyInput,
  ThreadPanel,
  ThreadSlideInPanel,
  ThreadPreview,
  StartThreadButton,
} from './bubble'
export type {
  ThreadAdapter,
  ThreadHeaderProps,
  ThreadHeaderCompactProps,
  ThreadReplyInputProps,
  ThreadPanelProps,
  ThreadSlideInPanelProps,
  ThreadPreviewProps,
  StartThreadButtonProps,
} from './bubble'

export { MentionAutocomplete, MentionItem, MentionHighlight } from './bubble'
export type {
  MentionsAdapter,
  MentionAutocompleteProps,
  MentionItemProps,
  MentionHighlightProps,
} from './bubble'

export { LinkPreview, LinkCard } from './bubble'
export type {
  LinkPreviewAdapter,
  LinkPreviewProps,
  LinkCardProps,
} from './bubble'

// ============================================================================
// Composer
// ============================================================================
export type {
  SlashCommandArgument,
  SlashCommand,
  DraftType,
  Draft,
  ReplyTarget,
  EditTarget,
  AttachmentPreview,
  ComposerMode,
} from './composer'

export { SlashCommandMenu, CommandItem, CommandCategoryHeader } from './composer'
export type {
  SlashCommandsAdapter,
  SlashCommandMenuProps,
  CommandItemProps,
  CommandCategoryHeaderProps,
} from './composer'

export {
  DraftBadge,
  DraftBadgeInline,
  DraftDotBadge,
  DraftIndicator,
  ChannelDraftIndicator,
  ThreadDraftIndicator,
  DMDraftIndicator,
  DraftPreview,
  DraftPreviewCompact,
  DraftCard,
  DraftActions,
  DraftRestore,
  DraftRestoreMinimal,
  DraftRestoreToast,
  DraftEmpty,
  DraftEmptyCompact,
  DraftSearchEmpty,
  AutoSaveIndicator,
  AutoSaveIndicatorMinimal,
  AutoSaveIndicatorInline,
  AutoSaveConnection,
  DraftList,
} from './composer'
export type { DraftsAdapter } from './composer'

export { MessageComposer } from './composer'
export type { ComposerAdapter, MessageComposerProps } from './composer'
