/**
 * chat/bubble barrel export.
 *
 * @module chat/bubble
 */

// Types
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
} from './types'

// Reactions
export { PlatformReactions, QuickReactionBar, HoverReactionBar } from './reactions'
export type {
  ReactionsAdapter,
  PlatformReactionsProps,
  QuickReactionBarProps,
  HoverReactionBarProps,
} from './reactions'

// Thread
export {
  ThreadHeader,
  ThreadHeaderCompact,
  ThreadReplyInput,
  ThreadPanel,
  ThreadSlideInPanel,
  ThreadPreview,
  StartThreadButton,
} from './thread'
export type {
  ThreadAdapter,
  ThreadHeaderProps,
  ThreadHeaderCompactProps,
  ThreadReplyInputProps,
  ThreadPanelProps,
  ThreadSlideInPanelProps,
  ThreadPreviewProps,
  StartThreadButtonProps,
} from './thread'

// Mentions
export { MentionAutocomplete, MentionItem, MentionHighlight } from './mentions'
export type { MentionsAdapter, MentionAutocompleteProps, MentionItemProps, MentionHighlightProps } from './mentions'

// Link Preview
export { LinkPreview, LinkCard } from './link-preview'
export type { LinkPreviewAdapter, LinkPreviewProps, LinkCardProps } from './link-preview'
