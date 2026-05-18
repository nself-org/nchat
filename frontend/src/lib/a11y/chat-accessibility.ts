/**
 * Chat-Specific Accessibility Utilities
 *
 * Specialized accessibility functions for chat applications:
 * - Message navigation and announcements
 * - Thread navigation
 * - Reaction announcements
 * - Typing indicator announcements
 * - New message alerts
 * - Channel navigation
 */

import { announce, announceStatus, getMessageLabel } from "./screen-reader";
import {
  focusElement,
  getNextFocusable,
  getPreviousFocusable,
} from "./keyboard-nav";

// ============================================================================
// Types
// ============================================================================

export interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: Date | string;
  isUnread?: boolean;
  hasThread?: boolean;
  threadCount?: number;
  reactions?: Reaction[];
}

export interface Reaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface Channel {
  id: string;
  name: string;
  type: "public" | "private" | "dm";
  unreadCount?: number;
  mentionCount?: number;
}

export interface Thread {
  id: string;
  parentMessageId: string;
  replyCount: number;
  participants: string[];
  lastReply?: Date | string;
}

export interface TypingUser {
  id: string;
  name: string;
}

// ============================================================================
// Message Navigation
// ============================================================================

/**
 * Navigate to the next message in the list
 */
export function navigateToNextMessage(
  container: HTMLElement,
  currentMessageId: string,
): HTMLElement | null {
  const currentElement = container.querySelector(
    `[data-message-id="${currentMessageId}"]`,
  );
  if (!currentElement) return null;

  const nextMessage = currentElement.nextElementSibling;
  if (nextMessage && nextMessage instanceof HTMLElement) {
    focusElement(nextMessage);
    return nextMessage;
  }

  return null;
}

/**
 * Navigate to the previous message in the list
 */
export function navigateToPreviousMessage(
  container: HTMLElement,
  currentMessageId: string,
): HTMLElement | null {
  const currentElement = container.querySelector(
    `[data-message-id="${currentMessageId}"]`,
  );
  if (!currentElement) return null;

  const prevMessage = currentElement.previousElementSibling;
  if (prevMessage && prevMessage instanceof HTMLElement) {
    focusElement(prevMessage);
    return prevMessage;
  }

  return null;
}

/**
 * Navigate to first unread message
 */
export function navigateToFirstUnread(
  container: HTMLElement,
): HTMLElement | null {
  const unreadMessage = container.querySelector('[data-unread="true"]');
  if (unreadMessage && unreadMessage instanceof HTMLElement) {
    focusElement(unreadMessage);
    announceStatus(`Navigated to first unread message`);
    return unreadMessage;
  }
  return null;
}

/**
 * Navigate to latest message
 */
export function navigateToLatestMessage(
  container: HTMLElement,
): HTMLElement | null {
  const messages = container.querySelectorAll("[data-message-id]");
  const lastMessage = messages[messages.length - 1];
  if (lastMessage && lastMessage instanceof HTMLElement) {
    focusElement(lastMessage);
    announceStatus(`Navigated to latest message`);
    return lastMessage;
  }
  return null;
}

/**
 * Navigate to oldest message (top of list)
 */
export function navigateToOldestMessage(
  container: HTMLElement,
): HTMLElement | null {
  const firstMessage = container.querySelector("[data-message-id]");
  if (firstMessage && firstMessage instanceof HTMLElement) {
    focusElement(firstMessage);
    announceStatus(`Navigated to oldest message`);
    return firstMessage;
  }
  return null;
}

// ============================================================================
// Message Announcements
// ============================================================================

/**
 * Announce a new message to screen readers
 */
export function announceNewMessage(
  message: Message,
  isAssertive: boolean = false,
): void {
  const timeStr = formatTimestamp(message.timestamp);
  const announcement = `New message from ${message.sender} at ${timeStr}: ${message.content}`;

  if (isAssertive) {
    announce(announcement, "assertive");
  } else {
    announce(announcement, "polite");
  }
}

/**
 * Announce message content when focused
 */
export function announceMessageContent(message: Message): void {
  const timestamp =
    typeof message.timestamp === "string"
      ? new Date(message.timestamp)
      : message.timestamp;

  const label = getMessageLabel(message.content, message.sender, timestamp, {
    hasAttachments: false,
  });

  announceStatus(label);
}

/**
 * Announce multiple new messages (batch)
 */
export function announceNewMessages(count: number, channelName?: string): void {
  const channel = channelName ? ` in ${channelName}` : "";
  const message =
    count === 1 ? `1 new message${channel}` : `${count} new messages${channel}`;

  announce(message, "polite");
}

/**
 * Announce message edited
 */
export function announceMessageEdited(sender: string): void {
  announce(`Message from ${sender} was edited`, "polite");
}

/**
 * Announce message deleted
 */
export function announceMessageDeleted(sender: string): void {
  announce(`Message from ${sender} was deleted`, "polite");
}

// ============================================================================
// Thread Navigation
// ============================================================================

/**
 * Open thread from message
 */
export function announceThreadOpened(
  replyCount: number,
  participants: string[],
): void {
  const participantList =
    participants.length > 3
      ? `${participants.slice(0, 3).join(", ")} and ${participants.length - 3} others`
      : participants.join(", ");

  const replies = replyCount === 1 ? "1 reply" : `${replyCount} replies`;
  announce(`Thread opened. ${replies} from ${participantList}`, "polite");
}

/**
 * Navigate to thread reply
 */
export function navigateToThreadReply(
  container: HTMLElement,
  direction: "next" | "previous",
): HTMLElement | null {
  const current = document.activeElement as HTMLElement;
  if (!current) return null;

  const target =
    direction === "next"
      ? getNextFocusable(container, current, { loop: true })
      : getPreviousFocusable(container, current, { loop: true });

  if (target) {
    focusElement(target);
    return target;
  }

  return null;
}

/**
 * Announce thread closed
 */
export function announceThreadClosed(): void {
  announce("Thread closed", "polite");
}

/**
 * Announce new thread reply
 */
export function announceNewThreadReply(sender: string): void {
  announce(`New reply from ${sender}`, "polite");
}

// ============================================================================
// Reaction Announcements
// ============================================================================

/**
 * Announce reaction added
 */
export function announceReactionAdded(
  emoji: string,
  userName: string,
  totalCount: number,
): void {
  const emojiName = getEmojiName(emoji);
  if (totalCount === 1) {
    announce(`${userName} reacted with ${emojiName}`, "polite");
  } else {
    announce(
      `${userName} reacted with ${emojiName}. ${totalCount} total reactions`,
      "polite",
    );
  }
}

/**
 * Announce reaction removed
 */
export function announceReactionRemoved(
  emoji: string,
  remainingCount: number,
): void {
  const emojiName = getEmojiName(emoji);
  if (remainingCount === 0) {
    announce(`${emojiName} reaction removed`, "polite");
  } else {
    announce(
      `${emojiName} reaction removed. ${remainingCount} remaining`,
      "polite",
    );
  }
}

/**
 * Announce all reactions on a message
 */
export function announceMessageReactions(reactions: Reaction[]): void {
  if (reactions.length === 0) {
    announce("No reactions on this message", "polite");
    return;
  }

  const reactionDescriptions = reactions.map((r) => {
    const emojiName = getEmojiName(r.emoji);
    return `${r.count} ${emojiName}`;
  });

  announce(`Reactions: ${reactionDescriptions.join(", ")}`, "polite");
}

/**
 * Get accessible name for emoji
 */
export function getEmojiName(emoji: string): string {
  // Common emoji mappings
  const emojiNames: Record<string, string> = {
    "\u{1F44D}": "thumbs up",
    "\u{1F44E}": "thumbs down",
    "\u{2764}": "heart",
    "\u{1F602}": "face with tears of joy",
    "\u{1F389}": "party popper",
    "\u{1F64F}": "folded hands",
    "\u{1F680}": "rocket",
    "\u{1F440}": "eyes",
    "\u{1F525}": "fire",
    "\u{1F4AF}": "hundred points",
    "\u{2705}": "check mark",
    "\u{274C}": "cross mark",
    "\u{1F44F}": "clapping hands",
    "\u{1F60A}": "smiling face",
    "\u{1F914}": "thinking face",
  };

  return emojiNames[emoji] || emoji;
}

// ============================================================================
// Typing Indicators
// ============================================================================

/**
 * Announce typing indicator
 */
export function announceTyping(users: TypingUser[]): void {
  if (users.length === 0) return;

  if (users.length === 1) {
    announce(`${users[0].name} is typing`, "polite");
  } else if (users.length === 2) {
    announce(`${users[0].name} and ${users[1].name} are typing`, "polite");
  } else {
    announce(`${users.length} people are typing`, "polite");
  }
}

/**
 * Announce typing stopped
 */
export function announceTypingStopped(): void {
  // Silent - we don't want to spam the screen reader
  // Just clear the live region
}

// ============================================================================
// Channel Navigation
// ============================================================================

/**
 * Announce channel switch
 */
export function announceChannelSwitch(channel: Channel): void {
  let channelType = "";
  switch (channel.type) {
    case "private":
      channelType = "private channel";
      break;
    case "dm":
      channelType = "direct message";
      break;
    default:
      channelType = "channel";
  }

  let unreadInfo = "";
  if (channel.unreadCount && channel.unreadCount > 0) {
    unreadInfo = `. ${channel.unreadCount} unread messages`;
  }
  if (channel.mentionCount && channel.mentionCount > 0) {
    unreadInfo += `. ${channel.mentionCount} mentions`;
  }

  announce(`Switched to ${channelType} ${channel.name}${unreadInfo}`, "polite");
}

/**
 * Announce channel list loaded
 */
export function announceChannelList(channels: Channel[], type: string): void {
  const count = channels.length;
  const unreadCount = channels.filter((c) => (c.unreadCount ?? 0) > 0).length;

  let announcement = `${count} ${type} channels`;
  if (unreadCount > 0) {
    announcement += `. ${unreadCount} with unread messages`;
  }

  announceStatus(announcement);
}

/**
 * Navigate to next unread channel
 */
export function findNextUnreadChannel(
  container: HTMLElement,
  currentChannelId: string,
): HTMLElement | null {
  const channels = Array.from(container.querySelectorAll("[data-channel-id]"));
  const currentIndex = channels.findIndex(
    (el) => el.getAttribute("data-channel-id") === currentChannelId,
  );

  // Search forward from current position
  for (let i = currentIndex + 1; i < channels.length; i++) {
    const channel = channels[i];
    if (channel.getAttribute("data-has-unread") === "true") {
      if (channel instanceof HTMLElement) {
        focusElement(channel);
        return channel;
      }
    }
  }

  // Wrap around to beginning
  for (let i = 0; i < currentIndex; i++) {
    const channel = channels[i];
    if (channel.getAttribute("data-has-unread") === "true") {
      if (channel instanceof HTMLElement) {
        focusElement(channel);
        return channel;
      }
    }
  }

  return null;
}

// ============================================================================
// Keyboard Shortcuts Help
// ============================================================================

export interface KeyboardShortcut {
  key: string;
  description: string;
  category: "navigation" | "messages" | "formatting" | "general";
}

/**
 * Get chat keyboard shortcuts for accessibility
 */
export function getChatKeyboardShortcuts(): KeyboardShortcut[] {
  return [
    // Navigation
    {
      key: "Alt + Up",
      description: "Previous channel",
      category: "navigation",
    },
    { key: "Alt + Down", description: "Next channel", category: "navigation" },
    {
      key: "Alt + Shift + Up",
      description: "Previous unread channel",
      category: "navigation",
    },
    {
      key: "Alt + Shift + Down",
      description: "Next unread channel",
      category: "navigation",
    },
    {
      key: "Escape",
      description: "Close current panel or dialog",
      category: "navigation",
    },
    {
      key: "Ctrl + K",
      description: "Open quick switcher",
      category: "navigation",
    },

    // Messages
    { key: "Enter", description: "Send message", category: "messages" },
    {
      key: "Shift + Enter",
      description: "New line in message",
      category: "messages",
    },
    { key: "Up", description: "Edit last message", category: "messages" },
    { key: "E", description: "Edit focused message", category: "messages" },
    { key: "R", description: "Reply to focused message", category: "messages" },
    {
      key: "T",
      description: "Open thread for focused message",
      category: "messages",
    },
    {
      key: "Delete",
      description: "Delete focused message",
      category: "messages",
    },

    // Formatting
    { key: "Ctrl + B", description: "Bold text", category: "formatting" },
    { key: "Ctrl + I", description: "Italic text", category: "formatting" },
    {
      key: "Ctrl + Shift + X",
      description: "Strikethrough",
      category: "formatting",
    },
    {
      key: "Ctrl + Shift + C",
      description: "Code block",
      category: "formatting",
    },

    // General
    { key: "?", description: "Show keyboard shortcuts", category: "general" },
    { key: "Ctrl + /", description: "Toggle sidebar", category: "general" },
    { key: "Ctrl + .", description: "Toggle right panel", category: "general" },
  ];
}

/**
 * Announce keyboard shortcut
 */
export function announceKeyboardShortcut(shortcut: KeyboardShortcut): void {
  announce(`${shortcut.key}: ${shortcut.description}`, "polite");
}

// ============================================================================
// Status Updates
// ============================================================================

/**
 * Announce user status change
 */
export function announceUserStatus(userName: string, status: string): void {
  announce(`${userName} is now ${status}`, "polite");
}

/**
 * Announce user joined/left channel
 */
export function announceUserPresence(
  userName: string,
  action: "joined" | "left",
  channelName: string,
): void {
  announce(`${userName} ${action} ${channelName}`, "polite");
}

/**
 * Announce connection status
 */
export function announceConnectionStatus(
  status: "connected" | "disconnected" | "reconnecting",
): void {
  const messages = {
    connected: "Connected to chat",
    disconnected: "Disconnected from chat. Messages may be delayed.",
    reconnecting: "Reconnecting to chat...",
  };

  announce(
    messages[status],
    status === "disconnected" ? "assertive" : "polite",
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format timestamp for screen readers
 */
function formatTimestamp(timestamp: Date | string): string {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) {
    return "just now";
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  } else {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }
}

/**
 * Get ARIA attributes for message element
 */
export function getMessageAriaAttributes(
  message: Message,
): Record<string, string> {
  const timestamp =
    typeof message.timestamp === "string"
      ? new Date(message.timestamp)
      : message.timestamp;
  const hasReactions = (message.reactions?.length ?? 0) > 0;

  // Build label parts
  let label = `Message from ${message.sender}`;

  // Add time info
  const timeStr = formatTimestamp(timestamp);
  label += `, ${timeStr}`;

  // Add thread info
  if (message.hasThread && message.threadCount) {
    label += `, ${message.threadCount} ${message.threadCount === 1 ? "reply" : "replies"}`;
  }

  // Add reactions info
  if (hasReactions) {
    label += `, has reactions`;
  }

  // Add content preview
  label += `: ${message.content.substring(0, 100)}`;
  if (message.content.length > 100) {
    label += "...";
  }

  const attrs: Record<string, string> = {
    role: "article",
    "aria-label": label,
  };

  if (message.isUnread) {
    attrs["data-unread"] = "true";
    attrs["aria-current"] = "true";
  }

  if (message.hasThread) {
    attrs["aria-expanded"] = "false";
  }

  return attrs;
}

/**
 * Get ARIA attributes for channel element
 */
export function getChannelAriaAttributes(
  channel: Channel,
): Record<string, string> {
  const attrs: Record<string, string> = {
    role: "option",
    "aria-selected": "false",
  };

  if ((channel.unreadCount ?? 0) > 0) {
    attrs["aria-label"] =
      `${channel.name}, ${channel.unreadCount} unread message${channel.unreadCount === 1 ? "" : "s"}`;
    attrs["data-has-unread"] = "true";
  } else {
    attrs["aria-label"] = channel.name;
  }

  if ((channel.mentionCount ?? 0) > 0) {
    attrs["aria-label"] +=
      `, ${channel.mentionCount} mention${channel.mentionCount === 1 ? "" : "s"}`;
  }

  return attrs;
}

/**
 * Get ARIA live region politeness based on message importance
 */
export function getMessagePoliteness(
  message: Message,
  currentUserId?: string,
): "polite" | "assertive" {
  // Mentions are more urgent
  if (currentUserId && message.content.includes(`@${currentUserId}`)) {
    return "assertive";
  }

  // Direct messages are more urgent
  // Default to polite for regular messages
  return "polite";
}
