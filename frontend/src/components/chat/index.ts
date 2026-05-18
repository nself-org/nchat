/**
 * Chat Components - nself-chat
 *
 * Complete set of message-related React components for the chat application.
 * These components implement a Slack/Discord/Telegram-like messaging experience.
 */

// Core message components
export { MessageList, SimpleMessageList } from "./message-list";
export type { MessageListRef } from "./message-list";

export { MessageItem, CompactMessageItem, MessageGroup } from "./message-item";

export { MessageInput } from "./message-input";
export type { MessageInputRef } from "./message-input";

// Message content rendering
export { MessageContent, renderPlainText } from "./message-content";

// Message interactions
export {
  MessageActions,
  InlineMessageActions,
  FloatingMessageActions,
  getMessagePermissions,
} from "./message-actions";

export { MessageContextMenu } from "./message-context-menu";

// Message features
export {
  MessageReactions,
  QuickReactions,
  ReactionPicker,
  emojiFromName,
} from "./message-reactions";

export {
  MessageThreadPreview,
  CompactThreadPreview,
  ThreadHeader,
  ReplyLine,
} from "./message-thread-preview";

export { MessageAttachments } from "./message-attachments";

// System messages and separators
export {
  MessageSystem,
  SystemMessageLine,
  DateSeparator,
  NewMessagesSeparator,
  ThreadStartedIndicator,
} from "./message-system";

// Reply and edit previews
export {
  ReplyPreview,
  EditPreview,
  InlineReplyIndicator,
  ThreadReplyBanner,
} from "./reply-preview";

// Typing indicator
export {
  TypingIndicator,
  TypingDots,
  InlineTypingIndicator,
  useTypingTimeout,
} from "./typing-indicator";

// Loading and empty states
export {
  MessageSkeleton,
  MessageSkeletonItem,
  GroupedMessageSkeleton,
  MessageListSkeleton,
} from "./message-skeleton";

export { MessageEmpty, SearchEmpty, ThreadEmpty } from "./message-empty";

// Container components
export {
  ChatContainer,
  TypingIndicator as ChatTypingIndicator,
  ScrollToBottomButton,
} from "./chat-container";
export { ChatWithThreads, ChatThreadsToggle } from "./chat-with-threads";
export type { ChatThreadsToggleProps } from "./chat-with-threads";
