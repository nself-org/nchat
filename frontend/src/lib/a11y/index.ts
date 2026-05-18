/**
 * Accessibility (A11y) Library
 *
 * Comprehensive accessibility utilities for nself-chat
 *
 * Exports:
 * - Screen reader utilities
 * - Keyboard navigation helpers
 * - Focus management
 * - ARIA utilities
 * - Color contrast checkers
 * - Reduced motion helpers
 */

// Screen Reader utilities
export {
  announce,
  announceStatus,
  clearAnnouncements,
  getIconButtonLabel,
  getStatusLabel,
  getCountLabel,
  getTimeLabel,
  getMessageLabel,
  getChannelLabel,
  generateDescriptionId,
  createDescription,
  getMessageListRole,
  getNavigationRole,
  getHeadingLevel,
  getLandmarkRole,
  getKeyboardDescription,
  getLoadingMessage,
  getErrorMessage,
  getSuccessMessage,
  liveRegionManager,
} from "./screen-reader";

// Keyboard Navigation utilities
export {
  isFocusable,
  getFocusableElements,
  getFirstFocusableElement,
  getLastFocusableElement,
  focusElement,
  focusFirst,
  focusLast,
  getNextFocusable,
  getPreviousFocusable,
  focusNext,
  focusPrevious,
  RovingTabIndex,
  FocusTrap,
  createSkipLink,
  addSkipLinks,
  TypeaheadSearch,
  isFocused,
  containsFocus,
  getFocusedElement,
} from "./keyboard-nav";

// Contrast utilities
export {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  getLuminance,
  getContrastRatio,
  checkContrast,
  meetsWCAG_AA,
  meetsWCAG_AAA,
  adjustColorForContrast,
  getAccessibleTextColor,
  suggestAccessibleColor,
  formatContrastRatio,
  getContrastLevelDescription,
  isTooLight,
  isTooDark,
  generateAccessiblePalette,
  simulateProtanopia,
  simulateDeuteranopia,
  simulateTritanopia,
  simulateMonochromacy,
} from "./contrast";

// Type exports
export type {
  FocusableElement,
  NavigationOptions,
  RovingTabIndexOptions,
} from "./keyboard-nav";

export type { RGB, HSL, ContrastLevel, ContrastResult } from "./contrast";

// Chat-specific accessibility
export {
  // Message navigation
  navigateToNextMessage,
  navigateToPreviousMessage,
  navigateToFirstUnread,
  navigateToLatestMessage,
  navigateToOldestMessage,
  // Message announcements
  announceNewMessage,
  announceMessageContent,
  announceNewMessages,
  announceMessageEdited,
  announceMessageDeleted,
  // Thread navigation
  announceThreadOpened,
  navigateToThreadReply,
  announceThreadClosed,
  announceNewThreadReply,
  // Reactions
  announceReactionAdded,
  announceReactionRemoved,
  announceMessageReactions,
  getEmojiName,
  // Typing indicators
  announceTyping,
  announceTypingStopped,
  // Channel navigation
  announceChannelSwitch,
  announceChannelList,
  findNextUnreadChannel,
  // Keyboard shortcuts
  getChatKeyboardShortcuts,
  announceKeyboardShortcut,
  // Status updates
  announceUserStatus,
  announceUserPresence,
  announceConnectionStatus,
  // ARIA attributes
  getMessageAriaAttributes,
  getChannelAriaAttributes,
  getMessagePoliteness,
} from "./chat-accessibility";

export type {
  Message,
  Reaction,
  Channel,
  Thread,
  TypingUser,
  KeyboardShortcut,
} from "./chat-accessibility";
