/**
 * useReactionMode Hook
 *
 * Platform-aware reaction hook that handles single vs multiple reaction modes,
 * permission checks, cooldown management, and optimistic updates.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useAppConfig } from "@/contexts/app-config-context";
import { useAuth } from "@/contexts/auth-context";
import {
  type PlatformReactionConfig,
  type CanReactResult,
  type ChannelReactionPermissions,
  type ReactionAggregate,
  getReactionConfig,
  canUserReact,
  areReactionsAllowed,
  isEmojiAllowed,
  defaultChannelPermissions,
} from "@/lib/reactions/platform-reactions";
import type { TemplateId } from "@/templates/types";

// ============================================================================
// Types
// ============================================================================

export interface UseReactionModeOptions {
  /** Override platform detection */
  platform?: TemplateId;
  /** Channel-level permissions */
  channelPermissions?: Partial<ChannelReactionPermissions>;
  /** User's role in the channel */
  userRole?: "guest" | "member" | "moderator" | "admin" | "owner";
  /** Callback when reaction is added */
  onReactionAdd?: (emoji: string, messageId: string) => Promise<void>;
  /** Callback when reaction is removed */
  onReactionRemove?: (emoji: string, messageId: string) => Promise<void>;
  /** Callback when reaction fails */
  onReactionError?: (error: Error, action: "add" | "remove") => void;
}

export interface ReactionState {
  /** Reactions grouped by emoji with counts and user info */
  reactions: ReactionAggregate[];
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
}

export interface UseReactionModeReturn {
  /** Platform reaction configuration */
  config: PlatformReactionConfig;
  /** Check if user can react with a specific emoji */
  canReact: (
    emoji: string,
    userReactions: string[],
    totalCount: number,
  ) => CanReactResult;
  /** Check if reactions are enabled */
  reactionsEnabled: boolean;
  /** Check if emoji picker should be shown */
  showEmojiPicker: boolean;
  /** Quick reactions for this platform */
  quickReactions: string[];
  /** Toggle a reaction (add if not present, remove if present) */
  toggleReaction: (
    emoji: string,
    messageId: string,
    currentReactions: ReactionAggregate[],
  ) => Promise<void>;
  /** Add a reaction */
  addReaction: (emoji: string, messageId: string) => Promise<void>;
  /** Remove a reaction */
  removeReaction: (emoji: string, messageId: string) => Promise<void>;
  /** Check if user has reacted with emoji */
  hasUserReacted: (emoji: string, reactions: ReactionAggregate[]) => boolean;
  /** Get user's reactions on a message */
  getUserReactions: (reactions: ReactionAggregate[]) => string[];
  /** Cooldown state */
  cooldown: {
    active: boolean;
    remainingMs: number;
  };
  /** Permission check result */
  permissions: {
    canReact: boolean;
    reason?: string;
  };
  /** Reaction mode (single or multiple) */
  mode: "single" | "multiple";
  /** Animation support */
  animationSupport: "none" | "static" | "animated";
  /** Features enabled for this platform */
  features: PlatformReactionConfig["features"];
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useReactionMode(
  options: UseReactionModeOptions = {},
): UseReactionModeReturn {
  const { config: appConfig } = useAppConfig();
  const { user } = useAuth();

  const {
    platform,
    channelPermissions = {},
    userRole = "member",
    onReactionAdd,
    onReactionRemove,
    onReactionError,
  } = options;

  // Determine platform from app config or override
  const detectedPlatform = useMemo<TemplateId>(() => {
    if (platform) return platform;
    // Try to detect from app config theme preset or default
    const preset = appConfig?.theme?.preset || "default";
    if (["slack", "discord", "telegram", "whatsapp"].includes(preset)) {
      return preset as TemplateId;
    }
    return "default";
  }, [platform, appConfig?.theme?.preset]);

  // Get platform-specific configuration
  const config = useMemo(
    () => getReactionConfig(detectedPlatform),
    [detectedPlatform],
  );

  // Merge channel permissions with defaults
  const mergedPermissions = useMemo<ChannelReactionPermissions>(
    () => ({
      ...defaultChannelPermissions,
      ...channelPermissions,
    }),
    [channelPermissions],
  );

  // Cooldown state
  const [cooldownActive, setCooldownActive] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastReactionTimeRef = useRef<number>(0);

  // Start cooldown timer
  const startCooldown = useCallback(() => {
    const cooldownMs = mergedPermissions.cooldownOverride ?? config.cooldownMs;
    if (cooldownMs <= 0) return;

    setCooldownActive(true);
    setCooldownRemaining(cooldownMs);
    lastReactionTimeRef.current = Date.now();

    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
    }

    cooldownTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastReactionTimeRef.current;
      const remaining = Math.max(0, cooldownMs - elapsed);
      setCooldownRemaining(remaining);

      if (remaining <= 0) {
        setCooldownActive(false);
        if (cooldownTimerRef.current) {
          clearInterval(cooldownTimerRef.current);
          cooldownTimerRef.current = null;
        }
      }
    }, 100);
  }, [config.cooldownMs, mergedPermissions.cooldownOverride]);

  // Cleanup cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, []);

  // Check if user can react at all
  const basePermissionCheck = useMemo(() => {
    if (!mergedPermissions.enabled) {
      return {
        canReact: false,
        reason: "Reactions are disabled in this channel",
      };
    }

    if (!user) {
      return { canReact: false, reason: "You must be logged in to react" };
    }

    if (!areReactionsAllowed(mergedPermissions, userRole)) {
      if (mergedPermissions.moderatorOnly) {
        return {
          canReact: false,
          reason: "Only moderators can react in this channel",
        };
      }
      if (mergedPermissions.membersOnly) {
        return {
          canReact: false,
          reason: "Only members can react in this channel",
        };
      }
      return { canReact: false, reason: "You do not have permission to react" };
    }

    return { canReact: true };
  }, [mergedPermissions, user, userRole]);

  // Check if user can react with a specific emoji
  const canReact = useCallback(
    (
      emoji: string,
      userReactions: string[],
      totalCount: number,
    ): CanReactResult => {
      // Check base permissions first
      if (!basePermissionCheck.canReact) {
        return { allowed: false, reason: basePermissionCheck.reason };
      }

      // Check cooldown
      if (cooldownActive) {
        return {
          allowed: false,
          reason: `Please wait ${Math.ceil(cooldownRemaining / 1000)}s before reacting again`,
        };
      }

      // Check if emoji is allowed in channel
      if (!isEmojiAllowed(mergedPermissions, emoji)) {
        return {
          allowed: false,
          reason: "This emoji is not allowed in this channel",
        };
      }

      // Check platform-specific rules
      return canUserReact(config, userReactions, emoji, totalCount);
    },
    [
      basePermissionCheck,
      config,
      cooldownActive,
      cooldownRemaining,
      mergedPermissions,
    ],
  );

  // Check if user has reacted with a specific emoji
  const hasUserReacted = useCallback(
    (emoji: string, reactions: ReactionAggregate[]): boolean => {
      const reaction = reactions.find((r) => r.emoji === emoji);
      return reaction?.hasReacted || false;
    },
    [],
  );

  // Get all emojis user has reacted with
  const getUserReactions = useCallback(
    (reactions: ReactionAggregate[]): string[] => {
      return reactions.filter((r) => r.hasReacted).map((r) => r.emoji);
    },
    [],
  );

  // Add a reaction
  const addReaction = useCallback(
    async (emoji: string, messageId: string): Promise<void> => {
      if (!onReactionAdd) return;

      try {
        await onReactionAdd(emoji, messageId);
        startCooldown();
      } catch (error) {
        onReactionError?.(error as Error, "add");
        throw error;
      }
    },
    [onReactionAdd, onReactionError, startCooldown],
  );

  // Remove a reaction
  const removeReaction = useCallback(
    async (emoji: string, messageId: string): Promise<void> => {
      if (!onReactionRemove) return;

      try {
        await onReactionRemove(emoji, messageId);
        startCooldown();
      } catch (error) {
        onReactionError?.(error as Error, "remove");
        throw error;
      }
    },
    [onReactionRemove, onReactionError, startCooldown],
  );

  // Toggle a reaction (main action for clicking on a reaction)
  const toggleReaction = useCallback(
    async (
      emoji: string,
      messageId: string,
      currentReactions: ReactionAggregate[],
    ): Promise<void> => {
      const userReactions = getUserReactions(currentReactions);
      const totalCount = currentReactions.reduce((sum, r) => sum + r.count, 0);

      // Check if user can react
      const check = canReact(emoji, userReactions, totalCount);
      if (!check.allowed) {
        onReactionError?.(new Error(check.reason || "Cannot react"), "add");
        return;
      }

      const alreadyReacted = hasUserReacted(emoji, currentReactions);

      if (alreadyReacted) {
        // Remove reaction
        await removeReaction(emoji, messageId);
      } else if (check.shouldReplace && check.existingEmoji) {
        // Single mode: replace existing reaction
        await removeReaction(check.existingEmoji, messageId);
        await addReaction(emoji, messageId);
      } else {
        // Add reaction
        await addReaction(emoji, messageId);
      }
    },
    [
      canReact,
      hasUserReacted,
      getUserReactions,
      addReaction,
      removeReaction,
      onReactionError,
    ],
  );

  // Determine if emoji picker should be shown based on emoji set
  const showEmojiPicker = useMemo(() => {
    return (
      config.emojiSet !== "limited" || (config.allowedEmojis?.length || 0) > 6
    );
  }, [config.emojiSet, config.allowedEmojis]);

  return {
    config,
    canReact,
    reactionsEnabled: basePermissionCheck.canReact,
    showEmojiPicker,
    quickReactions: config.quickReactions,
    toggleReaction,
    addReaction,
    removeReaction,
    hasUserReacted,
    getUserReactions,
    cooldown: {
      active: cooldownActive,
      remainingMs: cooldownRemaining,
    },
    permissions: basePermissionCheck,
    mode: config.mode,
    animationSupport: config.animationSupport,
    features: config.features,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook for managing reaction picker state
 */
export interface UseReactionPickerOptions {
  /** Initial open state */
  initialOpen?: boolean;
  /** Callback when emoji is selected */
  onSelect?: (emoji: string) => void;
  /** Callback when picker closes */
  onClose?: () => void;
}

export interface UseReactionPickerReturn {
  isOpen: boolean;
  targetMessageId: string | null;
  open: (messageId: string) => void;
  close: () => void;
  toggle: (messageId: string) => void;
  selectEmoji: (emoji: string) => void;
}

export function useReactionPicker(
  options: UseReactionPickerOptions = {},
): UseReactionPickerReturn {
  const { initialOpen = false, onSelect, onClose } = options;
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [targetMessageId, setTargetMessageId] = useState<string | null>(null);

  const open = useCallback((messageId: string) => {
    setTargetMessageId(messageId);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setTargetMessageId(null);
    onClose?.();
  }, [onClose]);

  const toggle = useCallback(
    (messageId: string) => {
      if (isOpen && targetMessageId === messageId) {
        close();
      } else {
        open(messageId);
      }
    },
    [isOpen, targetMessageId, open, close],
  );

  const selectEmoji = useCallback(
    (emoji: string) => {
      onSelect?.(emoji);
      close();
    },
    [onSelect, close],
  );

  return {
    isOpen,
    targetMessageId,
    open,
    close,
    toggle,
    selectEmoji,
  };
}

/**
 * Hook for tracking reaction cooldown
 */
export function useReactionCooldown(cooldownMs: number): {
  active: boolean;
  remainingMs: number;
  start: () => void;
  reset: () => void;
} {
  const [active, setActive] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (cooldownMs <= 0) return;

    cleanup();
    setActive(true);
    setRemainingMs(cooldownMs);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, cooldownMs - elapsed);
      setRemainingMs(remaining);

      if (remaining <= 0) {
        setActive(false);
        cleanup();
      }
    }, 50);
  }, [cooldownMs, cleanup]);

  const reset = useCallback(() => {
    cleanup();
    setActive(false);
    setRemainingMs(0);
  }, [cleanup]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return { active, remainingMs, start, reset };
}
