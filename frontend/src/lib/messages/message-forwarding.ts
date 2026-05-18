/**
 * Message Forwarding Module
 *
 * Provides functionality for forwarding messages to channels or users.
 * Supports forwarding with attribution, as copy, or as quote.
 */

import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// ============================================================================
// Types
// ============================================================================

/**
 * Forwarding mode
 */
export type ForwardingMode =
  | "forward" // Forward with attribution
  | "copy" // Copy without attribution
  | "quote"; // Quote with reply context

/**
 * Forward destination type
 */
export type ForwardDestinationType = "channel" | "user" | "thread";

/**
 * Forward destination
 */
export interface ForwardDestination {
  /** Destination type */
  type: ForwardDestinationType;
  /** Destination ID (channel ID, user ID, or thread ID) */
  id: string;
  /** Display name for the destination */
  name: string;
  /** Avatar/icon URL */
  avatarUrl?: string;
  /** Whether this is a private/DM destination */
  isPrivate?: boolean;
}

/**
 * User who originally sent the message
 */
export interface MessageAuthor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

/**
 * Message attachment for forwarding
 */
export interface ForwardAttachment {
  id: string;
  type: "image" | "video" | "audio" | "file";
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
  previewUrl?: string;
}

/**
 * Message to be forwarded
 */
export interface ForwardableMessage {
  /** Message ID */
  id: string;
  /** Message content */
  content: string;
  /** Original author */
  author: MessageAuthor;
  /** Source channel ID */
  channelId: string;
  /** Source channel name */
  channelName?: string;
  /** Message timestamp */
  createdAt: number;
  /** Attachments */
  attachments?: ForwardAttachment[];
  /** Whether this message was already forwarded */
  isForwarded?: boolean;
  /** Original message ID if this was forwarded */
  originalMessageId?: string;
  /** Thread ID if in a thread */
  threadId?: string;
}

/**
 * Forward request
 */
export interface ForwardRequest {
  /** Unique request ID */
  id: string;
  /** Messages to forward */
  messages: ForwardableMessage[];
  /** Destinations to forward to */
  destinations: ForwardDestination[];
  /** Forwarding mode */
  mode: ForwardingMode;
  /** Additional comment/context */
  comment?: string;
  /** User initiating the forward */
  forwardedBy: string;
  /** When the forward was initiated */
  createdAt: number;
}

/**
 * Forward result for a single destination
 */
export interface ForwardResult {
  /** Destination */
  destination: ForwardDestination;
  /** Whether the forward succeeded */
  success: boolean;
  /** New message ID(s) created */
  messageIds?: string[];
  /** Error message if failed */
  error?: string;
}

/**
 * Complete forward operation result
 */
export interface ForwardOperationResult {
  /** Original request */
  request: ForwardRequest;
  /** Results per destination */
  results: ForwardResult[];
  /** Total success count */
  successCount: number;
  /** Total failure count */
  failureCount: number;
}

/**
 * Forward modal state
 */
export interface ForwardModalState {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Messages being forwarded */
  messages: ForwardableMessage[];
  /** Selected destinations */
  selectedDestinations: ForwardDestination[];
  /** Current forwarding mode */
  mode: ForwardingMode;
  /** Optional comment */
  comment: string;
  /** Search query for destinations */
  searchQuery: string;
  /** Recent forward destinations */
  recentDestinations: ForwardDestination[];
  /** Whether forwarding is in progress */
  isForwarding: boolean;
  /** Current step in modal flow */
  step: "select-messages" | "select-destinations" | "confirm";
}

// ============================================================================
// Store Types
// ============================================================================

export interface ForwardingState {
  /** Modal state */
  modal: ForwardModalState;
  /** Recent forward history */
  forwardHistory: ForwardOperationResult[];
  /** Maximum history entries */
  maxHistoryEntries: number;
}

export interface ForwardingActions {
  // Modal operations
  openForwardModal: (messages: ForwardableMessage[]) => void;
  closeForwardModal: () => void;
  setForwardingMode: (mode: ForwardingMode) => void;
  setComment: (comment: string) => void;
  setSearchQuery: (query: string) => void;
  setStep: (step: ForwardModalState["step"]) => void;

  // Destination selection
  addDestination: (destination: ForwardDestination) => void;
  removeDestination: (destinationId: string) => void;
  clearDestinations: () => void;
  toggleDestination: (destination: ForwardDestination) => void;

  // Message selection
  addMessage: (message: ForwardableMessage) => void;
  removeMessage: (messageId: string) => void;
  clearMessages: () => void;

  // Forward execution
  startForwarding: () => void;
  finishForwarding: (result: ForwardOperationResult) => void;

  // History
  addToHistory: (result: ForwardOperationResult) => void;
  clearHistory: () => void;

  // Recent destinations
  addRecentDestination: (destination: ForwardDestination) => void;
  clearRecentDestinations: () => void;

  // Utility
  reset: () => void;
}

export type ForwardingStore = ForwardingState & ForwardingActions;

// ============================================================================
// Constants
// ============================================================================

/** Maximum number of messages that can be forwarded at once */
export const MAX_FORWARD_MESSAGES = 50;

/** Maximum number of destinations for a single forward */
export const MAX_FORWARD_DESTINATIONS = 10;

/** Maximum comment length */
export const MAX_FORWARD_COMMENT_LENGTH = 500;

/** Maximum recent destinations to store */
export const MAX_RECENT_DESTINATIONS = 10;

/** Maximum history entries */
export const MAX_HISTORY_ENTRIES = 50;

// ============================================================================
// Initial State
// ============================================================================

const initialModalState: ForwardModalState = {
  isOpen: false,
  messages: [],
  selectedDestinations: [],
  mode: "forward",
  comment: "",
  searchQuery: "",
  recentDestinations: [],
  isForwarding: false,
  step: "select-destinations",
};

const initialState: ForwardingState = {
  modal: { ...initialModalState },
  forwardHistory: [],
  maxHistoryEntries: MAX_HISTORY_ENTRIES,
};

// ============================================================================
// Utilities
// ============================================================================

/**
 * Generate a unique forward request ID
 */
export function generateForwardRequestId(): string {
  return `fwd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a forward request from current state
 */
export function createForwardRequest(
  messages: ForwardableMessage[],
  destinations: ForwardDestination[],
  mode: ForwardingMode,
  forwardedBy: string,
  comment?: string,
): ForwardRequest {
  return {
    id: generateForwardRequestId(),
    messages,
    destinations,
    mode,
    comment,
    forwardedBy,
    createdAt: Date.now(),
  };
}

/**
 * Format forwarded message content
 */
export function formatForwardedContent(
  message: ForwardableMessage,
  mode: ForwardingMode,
): { content: string; attribution?: string } {
  switch (mode) {
    case "forward":
      return {
        content: message.content,
        attribution: `Forwarded from ${message.author.displayName}`,
      };

    case "copy":
      return {
        content: message.content,
      };

    case "quote":
      // Format as a quote block
      const quotedContent = message.content
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
      return {
        content: `${quotedContent}\n\n— ${message.author.displayName}`,
      };

    default:
      return { content: message.content };
  }
}

/**
 * Validate forward request
 */
export function validateForwardRequest(
  messages: ForwardableMessage[],
  destinations: ForwardDestination[],
  comment?: string,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (messages.length === 0) {
    errors.push("At least one message is required");
  }

  if (messages.length > MAX_FORWARD_MESSAGES) {
    errors.push(
      `Cannot forward more than ${MAX_FORWARD_MESSAGES} messages at once`,
    );
  }

  if (destinations.length === 0) {
    errors.push("At least one destination is required");
  }

  if (destinations.length > MAX_FORWARD_DESTINATIONS) {
    errors.push(
      `Cannot forward to more than ${MAX_FORWARD_DESTINATIONS} destinations at once`,
    );
  }

  if (comment && comment.length > MAX_FORWARD_COMMENT_LENGTH) {
    errors.push(
      `Comment exceeds maximum length of ${MAX_FORWARD_COMMENT_LENGTH} characters`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a message can be forwarded
 */
export function canForwardMessage(message: ForwardableMessage): boolean {
  // Messages can generally be forwarded unless they have restrictions
  return true;
}

/**
 * Check if user can forward to a destination
 */
export function canForwardToDestination(
  destination: ForwardDestination,
  _userId: string,
): boolean {
  // Check if user has permission to send to this destination
  // This would typically check channel membership, DM permissions, etc.
  return true;
}

/**
 * Get destination display text
 */
export function getDestinationDisplayText(
  destination: ForwardDestination,
): string {
  switch (destination.type) {
    case "channel":
      return `#${destination.name}`;
    case "user":
      return `@${destination.name}`;
    case "thread":
      return `Thread: ${destination.name}`;
    default:
      return destination.name;
  }
}

/**
 * Get forward mode display text
 */
export function getForwardModeDisplayText(mode: ForwardingMode): string {
  switch (mode) {
    case "forward":
      return "Forward with attribution";
    case "copy":
      return "Copy without attribution";
    case "quote":
      return "Quote message";
    default:
      return "Forward";
  }
}

/**
 * Get forward mode description
 */
export function getForwardModeDescription(mode: ForwardingMode): string {
  switch (mode) {
    case "forward":
      return "Recipients will see who originally sent the message";
    case "copy":
      return "Message will appear as if you wrote it";
    case "quote":
      return "Message will be quoted with a reply link";
    default:
      return "";
  }
}

/**
 * Sort destinations by type (channels first, then users, then threads)
 */
export function sortDestinations(
  destinations: ForwardDestination[],
): ForwardDestination[] {
  const typeOrder: Record<ForwardDestinationType, number> = {
    channel: 0,
    user: 1,
    thread: 2,
  };

  return [...destinations].sort((a, b) => {
    const typeCompare = typeOrder[a.type] - typeOrder[b.type];
    if (typeCompare !== 0) return typeCompare;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Filter destinations by search query
 */
export function filterDestinations(
  destinations: ForwardDestination[],
  query: string,
): ForwardDestination[] {
  if (!query.trim()) return destinations;

  const lowerQuery = query.toLowerCase().trim();

  return destinations.filter((dest) => {
    const name = dest.name.toLowerCase();
    return name.includes(lowerQuery);
  });
}

/**
 * Check if a destination is already selected
 */
export function isDestinationSelected(
  destination: ForwardDestination,
  selectedDestinations: ForwardDestination[],
): boolean {
  return selectedDestinations.some(
    (d) => d.type === destination.type && d.id === destination.id,
  );
}

/**
 * Get summary text for forward operation
 */
export function getForwardSummary(
  messageCount: number,
  destinationCount: number,
  mode: ForwardingMode,
): string {
  const messageText =
    messageCount === 1 ? "1 message" : `${messageCount} messages`;
  const destText =
    destinationCount === 1
      ? "1 destination"
      : `${destinationCount} destinations`;
  const modeText =
    mode === "forward" ? "forwarding" : mode === "copy" ? "copying" : "quoting";

  return `${modeText} ${messageText} to ${destText}`;
}

// ============================================================================
// Store
// ============================================================================

export const useForwardingStore = create<ForwardingStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,

        // ================================================================
        // Modal Operations
        // ================================================================

        openForwardModal: (messages) =>
          set(
            (state) => {
              state.modal.isOpen = true;
              state.modal.messages = messages;
              state.modal.selectedDestinations = [];
              state.modal.mode = "forward";
              state.modal.comment = "";
              state.modal.searchQuery = "";
              state.modal.isForwarding = false;
              state.modal.step = "select-destinations";
            },
            false,
            "forwarding/openModal",
          ),

        closeForwardModal: () =>
          set(
            (state) => {
              state.modal = {
                ...initialModalState,
                recentDestinations: state.modal.recentDestinations,
              };
            },
            false,
            "forwarding/closeModal",
          ),

        setForwardingMode: (mode) =>
          set(
            (state) => {
              state.modal.mode = mode;
            },
            false,
            "forwarding/setMode",
          ),

        setComment: (comment) =>
          set(
            (state) => {
              state.modal.comment = comment.slice(
                0,
                MAX_FORWARD_COMMENT_LENGTH,
              );
            },
            false,
            "forwarding/setComment",
          ),

        setSearchQuery: (query) =>
          set(
            (state) => {
              state.modal.searchQuery = query;
            },
            false,
            "forwarding/setSearchQuery",
          ),

        setStep: (step) =>
          set(
            (state) => {
              state.modal.step = step;
            },
            false,
            "forwarding/setStep",
          ),

        // ================================================================
        // Destination Selection
        // ================================================================

        addDestination: (destination) =>
          set(
            (state) => {
              if (
                state.modal.selectedDestinations.length >=
                MAX_FORWARD_DESTINATIONS
              ) {
                return;
              }
              if (
                !isDestinationSelected(
                  destination,
                  state.modal.selectedDestinations,
                )
              ) {
                state.modal.selectedDestinations.push(destination);
              }
            },
            false,
            "forwarding/addDestination",
          ),

        removeDestination: (destinationId) =>
          set(
            (state) => {
              state.modal.selectedDestinations =
                state.modal.selectedDestinations.filter(
                  (d) => d.id !== destinationId,
                );
            },
            false,
            "forwarding/removeDestination",
          ),

        clearDestinations: () =>
          set(
            (state) => {
              state.modal.selectedDestinations = [];
            },
            false,
            "forwarding/clearDestinations",
          ),

        toggleDestination: (destination) =>
          set(
            (state) => {
              const index = state.modal.selectedDestinations.findIndex(
                (d) => d.type === destination.type && d.id === destination.id,
              );
              if (index >= 0) {
                state.modal.selectedDestinations.splice(index, 1);
              } else if (
                state.modal.selectedDestinations.length <
                MAX_FORWARD_DESTINATIONS
              ) {
                state.modal.selectedDestinations.push(destination);
              }
            },
            false,
            "forwarding/toggleDestination",
          ),

        // ================================================================
        // Message Selection
        // ================================================================

        addMessage: (message) =>
          set(
            (state) => {
              if (state.modal.messages.length >= MAX_FORWARD_MESSAGES) {
                return;
              }
              if (!state.modal.messages.some((m) => m.id === message.id)) {
                state.modal.messages.push(message);
              }
            },
            false,
            "forwarding/addMessage",
          ),

        removeMessage: (messageId) =>
          set(
            (state) => {
              state.modal.messages = state.modal.messages.filter(
                (m) => m.id !== messageId,
              );
            },
            false,
            "forwarding/removeMessage",
          ),

        clearMessages: () =>
          set(
            (state) => {
              state.modal.messages = [];
            },
            false,
            "forwarding/clearMessages",
          ),

        // ================================================================
        // Forward Execution
        // ================================================================

        startForwarding: () =>
          set(
            (state) => {
              state.modal.isForwarding = true;
            },
            false,
            "forwarding/start",
          ),

        finishForwarding: (result) =>
          set(
            (state) => {
              state.modal.isForwarding = false;

              // Add to history
              state.forwardHistory.unshift(result);
              if (state.forwardHistory.length > state.maxHistoryEntries) {
                state.forwardHistory = state.forwardHistory.slice(
                  0,
                  state.maxHistoryEntries,
                );
              }

              // Add successful destinations to recent
              for (const r of result.results) {
                if (r.success) {
                  const existing = state.modal.recentDestinations.findIndex(
                    (d) =>
                      d.type === r.destination.type &&
                      d.id === r.destination.id,
                  );
                  if (existing >= 0) {
                    state.modal.recentDestinations.splice(existing, 1);
                  }
                  state.modal.recentDestinations.unshift(r.destination);
                  if (
                    state.modal.recentDestinations.length >
                    MAX_RECENT_DESTINATIONS
                  ) {
                    state.modal.recentDestinations =
                      state.modal.recentDestinations.slice(
                        0,
                        MAX_RECENT_DESTINATIONS,
                      );
                  }
                }
              }

              // Close modal if all successful
              if (result.failureCount === 0) {
                state.modal.isOpen = false;
              }
            },
            false,
            "forwarding/finish",
          ),

        // ================================================================
        // History
        // ================================================================

        addToHistory: (result) =>
          set(
            (state) => {
              state.forwardHistory.unshift(result);
              if (state.forwardHistory.length > state.maxHistoryEntries) {
                state.forwardHistory = state.forwardHistory.slice(
                  0,
                  state.maxHistoryEntries,
                );
              }
            },
            false,
            "forwarding/addToHistory",
          ),

        clearHistory: () =>
          set(
            (state) => {
              state.forwardHistory = [];
            },
            false,
            "forwarding/clearHistory",
          ),

        // ================================================================
        // Recent Destinations
        // ================================================================

        addRecentDestination: (destination) =>
          set(
            (state) => {
              const existing = state.modal.recentDestinations.findIndex(
                (d) => d.type === destination.type && d.id === destination.id,
              );
              if (existing >= 0) {
                state.modal.recentDestinations.splice(existing, 1);
              }
              state.modal.recentDestinations.unshift(destination);
              if (
                state.modal.recentDestinations.length > MAX_RECENT_DESTINATIONS
              ) {
                state.modal.recentDestinations =
                  state.modal.recentDestinations.slice(
                    0,
                    MAX_RECENT_DESTINATIONS,
                  );
              }
            },
            false,
            "forwarding/addRecentDestination",
          ),

        clearRecentDestinations: () =>
          set(
            (state) => {
              state.modal.recentDestinations = [];
            },
            false,
            "forwarding/clearRecentDestinations",
          ),

        // ================================================================
        // Utility
        // ================================================================

        reset: () =>
          set(
            () => ({
              ...initialState,
            }),
            false,
            "forwarding/reset",
          ),
      })),
    ),
    { name: "forwarding-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectIsForwardModalOpen = (state: ForwardingStore) =>
  state.modal.isOpen;

export const selectForwardMessages = (state: ForwardingStore) =>
  state.modal.messages;

export const selectSelectedDestinations = (state: ForwardingStore) =>
  state.modal.selectedDestinations;

export const selectForwardingMode = (state: ForwardingStore) =>
  state.modal.mode;

export const selectForwardComment = (state: ForwardingStore) =>
  state.modal.comment;

export const selectForwardSearchQuery = (state: ForwardingStore) =>
  state.modal.searchQuery;

export const selectRecentDestinations = (state: ForwardingStore) =>
  state.modal.recentDestinations;

export const selectIsForwarding = (state: ForwardingStore) =>
  state.modal.isForwarding;

export const selectForwardStep = (state: ForwardingStore) => state.modal.step;

export const selectForwardHistory = (state: ForwardingStore) =>
  state.forwardHistory;

export const selectCanForward = (state: ForwardingStore) =>
  state.modal.messages.length > 0 &&
  state.modal.selectedDestinations.length > 0 &&
  !state.modal.isForwarding;

export const selectForwardValidation = (state: ForwardingStore) =>
  validateForwardRequest(
    state.modal.messages,
    state.modal.selectedDestinations,
    state.modal.comment,
  );
