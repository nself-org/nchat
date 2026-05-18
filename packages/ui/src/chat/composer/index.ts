/**
 * chat/composer barrel export.
 *
 * @module chat/composer
 */

// Types
export type {
  SlashCommandArgument,
  SlashCommand,
  DraftType,
  Draft,
  ReplyTarget,
  EditTarget,
  AttachmentPreview,
  ComposerMode,
} from './types'

// Slash Commands
export { SlashCommandMenu, CommandItem, CommandCategoryHeader } from './slash-commands'
export type {
  SlashCommandsAdapter,
  SlashCommandMenuProps,
  CommandItemProps,
  CommandCategoryHeaderProps,
} from './slash-commands'

// Drafts
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
} from './drafts'
export type { DraftsAdapter } from './drafts'

// Message Composer
export { MessageComposer } from './message-composer'
export type { ComposerAdapter, MessageComposerProps } from './message-composer'
