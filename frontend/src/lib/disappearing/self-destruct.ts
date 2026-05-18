/**
 * Self-Destruct Logic for Disappearing Messages
 *
 * Handles the actual deletion/clearing of message content
 * and UI cleanup for expired messages.
 */

import type {
  DisappearingMessageData,
  DisappearingMessageType,
} from "./disappearing-types";

// ============================================================================
// Types
// ============================================================================

export interface SelfDestructOptions {
  /** Whether to clear content from memory */
  clearContent: boolean;
  /** Whether to remove from UI immediately */
  removeFromUI: boolean;
  /** Whether to notify other users */
  notifyPeers: boolean;
  /** Custom animation for removal */
  animationType?: "fade" | "burn" | "dissolve" | "none";
  /** Duration of removal animation in ms */
  animationDuration?: number;
}

export interface DestructionResult {
  success: boolean;
  messageId: string;
  channelId: string;
  destructedAt: Date;
  reason: "timer_expired" | "view_once_viewed" | "burn_complete" | "manual";
}

// Default options for different message types
const DEFAULT_OPTIONS: Record<DisappearingMessageType, SelfDestructOptions> = {
  regular: {
    clearContent: true,
    removeFromUI: true,
    notifyPeers: false,
    animationType: "fade",
    animationDuration: 300,
  },
  view_once: {
    clearContent: true,
    removeFromUI: true,
    notifyPeers: true,
    animationType: "dissolve",
    animationDuration: 500,
  },
  burn_after_reading: {
    clearContent: true,
    removeFromUI: true,
    notifyPeers: true,
    animationType: "burn",
    animationDuration: 800,
  },
};

// ============================================================================
// Self-Destruct Functions
// ============================================================================

/**
 * Get default options for a message type.
 */
export function getDefaultOptions(
  type: DisappearingMessageType,
): SelfDestructOptions {
  return { ...DEFAULT_OPTIONS[type] };
}

/**
 * Prepare a message for self-destruction.
 * Returns the cleared message data.
 */
export function prepareForDestruction(
  message: {
    id: string;
    channelId: string;
    content: string;
    attachments?: unknown[];
    disappearing?: DisappearingMessageData | null;
  },
  options?: Partial<SelfDestructOptions>,
): {
  clearedMessage: typeof message;
  options: SelfDestructOptions;
} {
  const type = message.disappearing?.type || "regular";
  const finalOptions = { ...DEFAULT_OPTIONS[type], ...options };

  const clearedMessage = { ...message };

  if (finalOptions.clearContent) {
    clearedMessage.content = "";
    clearedMessage.attachments = [];
  }

  return {
    clearedMessage,
    options: finalOptions,
  };
}

/**
 * Execute self-destruction of a message.
 * This is the final step that should trigger UI removal.
 */
export async function executeSelfDestruct(
  messageId: string,
  channelId: string,
  options: SelfDestructOptions,
  callbacks: {
    onAnimationStart?: () => void;
    onContentCleared?: () => void;
    onRemoved?: () => void;
    onNotifyPeers?: () => void;
  } = {},
): Promise<DestructionResult> {
  const startTime = Date.now();

  // Start animation
  callbacks.onAnimationStart?.();

  // Clear content
  if (options.clearContent) {
    callbacks.onContentCleared?.();
  }

  // Wait for animation
  if (options.animationType !== "none" && options.animationDuration) {
    await new Promise((resolve) =>
      setTimeout(resolve, options.animationDuration),
    );
  }

  // Remove from UI
  if (options.removeFromUI) {
    callbacks.onRemoved?.();
  }

  // Notify peers
  if (options.notifyPeers) {
    callbacks.onNotifyPeers?.();
  }

  return {
    success: true,
    messageId,
    channelId,
    destructedAt: new Date(),
    reason: "timer_expired",
  };
}

/**
 * Create a burn animation effect CSS.
 */
export function getBurnAnimationStyles(progress: number): React.CSSProperties {
  // Progress goes from 0 (just started) to 1 (fully burned)
  const intensity = Math.min(1, progress * 1.5);
  const blur = progress * 4;
  const brightness = 1 + progress * 0.5;
  const saturate = 1 - progress * 0.5;
  const scale = 1 - progress * 0.1;
  const opacity = 1 - progress;

  return {
    filter: `blur(${blur}px) brightness(${brightness}) saturate(${saturate})`,
    transform: `scale(${scale})`,
    opacity,
    transition: "all 0.1s linear",
  };
}

/**
 * Create a dissolve animation effect CSS.
 */
export function getDissolveAnimationStyles(
  progress: number,
): React.CSSProperties {
  const opacity = 1 - progress;
  const blur = progress * 8;
  const scale = 1 + progress * 0.05;

  return {
    filter: `blur(${blur}px)`,
    transform: `scale(${scale})`,
    opacity,
    transition: "all 0.1s ease-out",
  };
}

/**
 * Create a fade animation effect CSS.
 */
export function getFadeAnimationStyles(progress: number): React.CSSProperties {
  return {
    opacity: 1 - progress,
    transition: "opacity 0.3s ease-out",
  };
}

/**
 * Get animation styles based on type and progress.
 */
export function getAnimationStyles(
  type: SelfDestructOptions["animationType"],
  progress: number,
): React.CSSProperties {
  switch (type) {
    case "burn":
      return getBurnAnimationStyles(progress);
    case "dissolve":
      return getDissolveAnimationStyles(progress);
    case "fade":
      return getFadeAnimationStyles(progress);
    default:
      return {};
  }
}

// ============================================================================
// Content Clearing
// ============================================================================

/**
 * Securely clear sensitive content from memory.
 * Note: JavaScript doesn't guarantee memory clearing,
 * but this helps by overwriting references.
 */
export function secureClear(value: string): string {
  // Overwrite the string in place if possible
  // In JavaScript, strings are immutable, so we just return empty
  return "";
}

/**
 * Clear all sensitive data from a message object.
 */
export function clearMessageContent(message: {
  content?: string | null;
  attachments?: unknown[] | null;
  linkPreviews?: unknown[] | null;
  voiceMessage?: unknown | null;
}): void {
  if (message.content) {
    message.content = null;
  }
  if (message.attachments) {
    message.attachments = null;
  }
  if (message.linkPreviews) {
    message.linkPreviews = null;
  }
  if (message.voiceMessage) {
    message.voiceMessage = null;
  }
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Process multiple messages for destruction.
 */
export async function batchDestruct(
  messages: Array<{
    id: string;
    channelId: string;
    disappearing?: DisappearingMessageData | null;
  }>,
  onDestroyed: (messageId: string, channelId: string) => void,
): Promise<DestructionResult[]> {
  const results: DestructionResult[] = [];

  for (const message of messages) {
    if (!message.disappearing) continue;

    const options = getDefaultOptions(message.disappearing.type);
    const result = await executeSelfDestruct(
      message.id,
      message.channelId,
      options,
      {
        onRemoved: () => onDestroyed(message.id, message.channelId),
      },
    );
    results.push(result);
  }

  return results;
}

/**
 * Filter messages to find expired ones.
 */
export function findExpiredMessages(
  messages: Array<{
    id: string;
    disappearing?: DisappearingMessageData | null;
  }>,
): string[] {
  const now = Date.now();

  return messages
    .filter((m) => {
      if (!m.disappearing?.expiresAt) return false;
      return new Date(m.disappearing.expiresAt).getTime() <= now;
    })
    .map((m) => m.id);
}
