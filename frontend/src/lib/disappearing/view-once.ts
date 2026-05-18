/**
 * View Once Message Logic
 *
 * Handles view-once (ephemeral) media messages that disappear after first view.
 */

import type { DisappearingMessageData } from "./disappearing-types";

// ============================================================================
// Types
// ============================================================================

export interface ViewOnceMediaInfo {
  /** Media type */
  type: "image" | "video" | "audio" | "file";
  /** Blurred thumbnail URL for preview */
  thumbnailUrl?: string;
  /** Actual media URL (only revealed on view) */
  mediaUrl: string;
  /** File name */
  fileName?: string;
  /** File size in bytes */
  fileSize?: number;
  /** Duration for audio/video */
  duration?: number;
  /** Dimensions for image/video */
  width?: number;
  height?: number;
}

export interface ViewOnceMessage {
  id: string;
  channelId: string;
  userId: string;
  /** Placeholder content shown before viewing */
  placeholder: string;
  /** Actual content (null until viewed, cleared after) */
  content: string | null;
  /** Media info */
  media?: ViewOnceMediaInfo;
  /** Disappearing data */
  disappearing: DisappearingMessageData;
  /** When message was created */
  createdAt: string;
}

export interface ViewOnceState {
  /** Whether the content is currently being viewed */
  isViewing: boolean;
  /** Whether the content has been viewed (and is now gone) */
  hasBeenViewed: boolean;
  /** Who viewed it (if known) */
  viewedBy?: string;
  /** When it was viewed */
  viewedAt?: string;
  /** Whether current user can view (is recipient) */
  canView: boolean;
  /** Error message if view failed */
  error?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Default placeholder messages */
export const VIEW_ONCE_PLACEHOLDERS: Record<string, string> = {
  image: "Photo",
  video: "Video",
  audio: "Voice message",
  file: "File",
  default: "View once message",
};

/** View once message icons */
export const VIEW_ONCE_ICONS: Record<string, string> = {
  image: "image",
  video: "video",
  audio: "mic",
  file: "file",
  default: "eye",
};

// ============================================================================
// View Once Logic
// ============================================================================

/**
 * Check if a message is a view-once message.
 */
export function isViewOnceMessage(
  disappearing?: DisappearingMessageData | null,
): boolean {
  return disappearing?.type === "view_once";
}

/**
 * Check if a view-once message can be viewed.
 */
export function canViewMessage(
  message: { disappearing?: DisappearingMessageData | null },
  currentUserId: string,
  senderId: string,
): boolean {
  if (!isViewOnceMessage(message.disappearing)) return false;

  // Sender can always view their own message
  if (currentUserId === senderId) return true;

  // Check if already viewed
  if (message.disappearing?.hasBeenViewed) return false;

  return true;
}

/**
 * Get the initial state for a view-once message.
 */
export function getViewOnceState(
  message: { disappearing?: DisappearingMessageData | null; userId: string },
  currentUserId: string,
): ViewOnceState {
  const isOwnMessage = message.userId === currentUserId;
  const hasBeenViewed = message.disappearing?.hasBeenViewed || false;

  return {
    isViewing: false,
    hasBeenViewed,
    viewedBy: message.disappearing?.viewedBy,
    viewedAt: message.disappearing?.viewedAt,
    canView: !hasBeenViewed || isOwnMessage,
  };
}

/**
 * Get placeholder text for a view-once message.
 */
export function getPlaceholderText(mediaType?: string): string {
  if (!mediaType) return VIEW_ONCE_PLACEHOLDERS.default;
  return VIEW_ONCE_PLACEHOLDERS[mediaType] || VIEW_ONCE_PLACEHOLDERS.default;
}

/**
 * Get icon name for a view-once message.
 */
export function getViewOnceIcon(mediaType?: string): string {
  if (!mediaType) return VIEW_ONCE_ICONS.default;
  return VIEW_ONCE_ICONS[mediaType] || VIEW_ONCE_ICONS.default;
}

/**
 * Create disappearing data for a view-once message.
 */
export function createViewOnceData(): DisappearingMessageData {
  return {
    type: "view_once",
    sentAt: new Date().toISOString(),
    hasBeenViewed: false,
  };
}

/**
 * Mark a view-once message as viewed.
 */
export function markViewOnceAsViewed(
  data: DisappearingMessageData,
  viewedBy: string,
): DisappearingMessageData {
  return {
    ...data,
    hasBeenViewed: true,
    viewedAt: new Date().toISOString(),
    viewedBy,
  };
}

// ============================================================================
// View Session Management
// ============================================================================

/**
 * Manages the viewing session for a view-once message.
 */
export class ViewOnceSession {
  private messageId: string;
  private channelId: string;
  private viewerId: string;
  private startedAt: Date | null = null;
  private endedAt: Date | null = null;
  private onComplete?: () => void;

  constructor(
    messageId: string,
    channelId: string,
    viewerId: string,
    onComplete?: () => void,
  ) {
    this.messageId = messageId;
    this.channelId = channelId;
    this.viewerId = viewerId;
    this.onComplete = onComplete;
  }

  /**
   * Start viewing session.
   */
  start(): void {
    if (this.startedAt) return; // Already started
    this.startedAt = new Date();
  }

  /**
   * End viewing session.
   */
  end(): void {
    if (this.endedAt) return; // Already ended
    this.endedAt = new Date();
    this.onComplete?.();
  }

  /**
   * Get session info.
   */
  getInfo() {
    return {
      messageId: this.messageId,
      channelId: this.channelId,
      viewerId: this.viewerId,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      duration: this.getDuration(),
    };
  }

  /**
   * Get viewing duration in milliseconds.
   */
  private getDuration(): number {
    if (!this.startedAt) return 0;
    const end = this.endedAt || new Date();
    return end.getTime() - this.startedAt.getTime();
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a blurred placeholder for an image.
 * Returns CSS for a blurred background.
 */
export function getBlurredPlaceholderStyles(
  thumbnailUrl?: string,
): React.CSSProperties {
  if (!thumbnailUrl) {
    return {
      backgroundColor: "rgba(0, 0, 0, 0.1)",
    };
  }

  return {
    backgroundImage: `url(${thumbnailUrl})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    filter: "blur(20px)",
  };
}

/**
 * Get the status text for a view-once message.
 */
export function getViewOnceStatusText(
  state: ViewOnceState,
  isOwnMessage: boolean,
): string {
  if (state.hasBeenViewed) {
    if (isOwnMessage) {
      return "Opened";
    }
    return "Opened";
  }

  if (state.isViewing) {
    return "Viewing...";
  }

  return "Tap to view";
}

/**
 * Get warning text before opening a view-once message.
 */
export function getViewOnceWarning(): string {
  return "This message will disappear after you view it.";
}

/**
 * Format the "opened by" text.
 */
export function formatOpenedText(viewedBy: string, viewedAt?: string): string {
  if (!viewedAt) return `Opened by ${viewedBy}`;

  const date = new Date(viewedAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  let timeAgo: string;
  if (diffMins < 1) {
    timeAgo = "just now";
  } else if (diffMins < 60) {
    timeAgo = `${diffMins}m ago`;
  } else if (diffHours < 24) {
    timeAgo = `${diffHours}h ago`;
  } else {
    timeAgo = `${diffDays}d ago`;
  }

  return `Opened ${timeAgo}`;
}
