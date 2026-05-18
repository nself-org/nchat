/**
 * Platform Presence Hook - Unified presence, typing, and read receipt management
 *
 * Provides platform-specific presence behavior matching WhatsApp, Telegram,
 * Signal, Slack, and Discord semantics.
 *
 * @module hooks/use-platform-presence
 * @version 1.0.0
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePresenceStore } from "@/stores/presence-store";
import { useReadReceiptsStore } from "@/stores/read-receipts-store";
import { useAuth } from "@/contexts/auth-context";
import { type PresenceStatus as StorePresenceStatus } from "@/lib/presence/presence-types";
import { type DeliveryStatus as StoreDeliveryStatus } from "@/stores/read-receipts-store";
import {
  type PlatformPreset,
  type PlatformPresenceConfig,
  type PresenceStatus,
  type DeliveryStatus,
  type UserPresenceState,
  type UserTypingState,
  type PresencePrivacySettings,
  type ConversationPrivacyOverride,
  getPlatformConfig,
  DEFAULT_PRIVACY_SETTINGS,
  DEFAULT_TRANSITION_RULES,
  formatLastSeen,
  formatTypingText,
  formatSeenByText,
  getPresenceColor,
  getDeliveryStatusIcon,
  getDeliveryStatusColor,
  shouldShowReadReceipts,
  shouldSendTypingIndicator,
  isPresenceVisibleTo,
  isLastSeenVisibleTo,
} from "@/lib/presence/platform-presence";

// ============================================================================
// TYPES
// ============================================================================

export interface UsePlatformPresenceOptions {
  /** Platform preset to use */
  platform?: PlatformPreset;

  /** Custom platform configuration (overrides preset) */
  customConfig?: Partial<PlatformPresenceConfig>;

  /** Initial privacy settings */
  privacySettings?: Partial<PresencePrivacySettings>;

  /** Auto-initialize presence on mount */
  autoInitialize?: boolean;
}

export interface PlatformPresenceState {
  /** Current platform configuration */
  config: PlatformPresenceConfig;

  /** Current user's presence state */
  myPresence: UserPresenceState | null;

  /** Privacy settings */
  privacySettings: PresencePrivacySettings;

  /** Whether presence is initialized */
  isInitialized: boolean;

  /** Whether connected to realtime */
  isConnected: boolean;
}

export interface PlatformPresenceActions {
  /** Set current user's status */
  setStatus: (status: PresenceStatus) => void;

  /** Set custom status message */
  setCustomStatus: (text?: string, emoji?: string, expiresAt?: Date) => void;

  /** Clear custom status */
  clearCustomStatus: () => void;

  /** Update privacy settings */
  updatePrivacySettings: (settings: Partial<PresencePrivacySettings>) => void;

  /** Set per-conversation privacy override */
  setConversationOverride: (
    conversationId: string,
    override: Partial<ConversationPrivacyOverride>,
  ) => void;

  /** Clear per-conversation privacy override */
  clearConversationOverride: (conversationId: string) => void;

  /** Get another user's presence (respecting privacy) */
  getUserPresence: (userId: string) => UserPresenceState | null;

  /** Get formatted last seen for a user */
  getFormattedLastSeen: (userId: string) => string;

  /** Check if a user is online */
  isUserOnline: (userId: string) => boolean;
}

export interface PlatformTypingState {
  /** Users typing in current conversation */
  typingUsers: UserTypingState[];

  /** Formatted typing text */
  typingText: string;

  /** Whether anyone is typing */
  isAnyoneTyping: boolean;
}

export interface PlatformTypingActions {
  /** Start typing (call on input change) */
  startTyping: () => void;

  /** Stop typing (call on message send or blur) */
  stopTyping: () => void;

  /** Get typing users for a conversation */
  getTypingUsers: (conversationId: string) => UserTypingState[];

  /** Get formatted typing text for a conversation */
  getTypingText: (conversationId: string) => string;
}

export interface PlatformReceiptState {
  /** Whether receipts are enabled */
  receiptsEnabled: boolean;

  /** Whether to show delivery status */
  showDeliveryStatus: boolean;

  /** Whether to show read status */
  showReadStatus: boolean;
}

export interface PlatformReceiptActions {
  /** Mark a message as read */
  markAsRead: (messageId: string) => void;

  /** Mark multiple messages as read */
  markManyAsRead: (messageIds: string[]) => void;

  /** Get delivery status for a message */
  getDeliveryStatus: (messageId: string) => DeliveryStatus;

  /** Get read receipts for a message */
  getReadReceipts: (
    messageId: string,
  ) => Array<{ userId: string; userName: string; readAt: Date }>;

  /** Get formatted "seen by" text */
  getSeenByText: (messageId: string, totalRecipients: number) => string;

  /** Get status icon name */
  getStatusIcon: (status: DeliveryStatus) => string;

  /** Get status color */
  getStatusColor: (status: DeliveryStatus) => string;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Unified platform presence hook
 *
 * Combines presence state, typing indicators, and read receipts
 * with platform-specific behavior.
 */
export function usePlatformPresence(
  conversationId: string | null,
  options: UsePlatformPresenceOptions = {},
): {
  presence: PlatformPresenceState & PlatformPresenceActions;
  typing: PlatformTypingState & PlatformTypingActions;
  receipts: PlatformReceiptState & PlatformReceiptActions;
} {
  const {
    platform = "default",
    customConfig,
    privacySettings: initialPrivacySettings,
    autoInitialize = true,
  } = options;

  const { user } = useAuth();
  const presenceStore = usePresenceStore();
  const receiptsStore = useReadReceiptsStore();

  // Platform configuration
  const config = useMemo(() => {
    const baseConfig = getPlatformConfig(platform);
    if (customConfig) {
      return {
        ...baseConfig,
        ...customConfig,
        presence: { ...baseConfig.presence, ...customConfig.presence },
        typing: { ...baseConfig.typing, ...customConfig.typing },
        receipts: { ...baseConfig.receipts, ...customConfig.receipts },
        privacyDefaults: {
          ...baseConfig.privacyDefaults,
          ...customConfig.privacyDefaults,
        },
      } as PlatformPresenceConfig;
    }
    return baseConfig;
  }, [platform, customConfig]);

  // Privacy settings state
  const [privacySettings, setPrivacySettings] =
    useState<PresencePrivacySettings>(() => ({
      ...DEFAULT_PRIVACY_SETTINGS,
      ...config.privacyDefaults,
      ...initialPrivacySettings,
      conversationOverrides: new Map(
        initialPrivacySettings?.conversationOverrides,
      ),
    }));

  // Typing state
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingBroadcastRef = useRef<number>(0);
  const [isTyping, setIsTyping] = useState(false);

  // Idle detection
  const lastActivityRef = useRef<number>(Date.now());
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // PRESENCE ACTIONS
  // ============================================================================

  const setStatus = useCallback(
    (status: PresenceStatus) => {
      // Cast to store type - they are compatible string unions
      presenceStore.setMyStatus(status as StorePresenceStatus);
    },
    [presenceStore],
  );

  const setCustomStatus = useCallback(
    (text?: string, emoji?: string, expiresAt?: Date) => {
      presenceStore.setMyCustomStatus(
        text || emoji ? { text, emoji, expiresAt: expiresAt ?? null } : null,
      );
    },
    [presenceStore],
  );

  const clearCustomStatus = useCallback(() => {
    presenceStore.clearMyCustomStatus();
  }, [presenceStore]);

  const updatePrivacySettings = useCallback(
    (settings: Partial<PresencePrivacySettings>) => {
      setPrivacySettings((prev) => ({
        ...prev,
        ...settings,
        conversationOverrides:
          settings.conversationOverrides ?? prev.conversationOverrides,
      }));
    },
    [],
  );

  const setConversationOverride = useCallback(
    (convId: string, override: Partial<ConversationPrivacyOverride>) => {
      setPrivacySettings((prev) => {
        const newOverrides = new Map(prev.conversationOverrides);
        const existing = newOverrides.get(convId) || { conversationId: convId };
        newOverrides.set(convId, { ...existing, ...override });
        return { ...prev, conversationOverrides: newOverrides };
      });
    },
    [],
  );

  const clearConversationOverride = useCallback((convId: string) => {
    setPrivacySettings((prev) => {
      const newOverrides = new Map(prev.conversationOverrides);
      newOverrides.delete(convId);
      return { ...prev, conversationOverrides: newOverrides };
    });
  }, []);

  const getUserPresence = useCallback(
    (userId: string): UserPresenceState | null => {
      const presence = presenceStore.presenceMap[userId];
      if (!presence) return null;

      return {
        userId: presence.userId,
        status: presence.status ?? "offline",
        customStatusText: presence.customStatus?.text,
        customStatusEmoji: presence.customStatus?.emoji,
        customStatusExpiresAt: presence.customStatus?.expiresAt ?? undefined,
        lastSeenAt: presence.lastSeenAt,
        lastActivityAt: new Date(),
        isIdle: false,
      };
    },
    [presenceStore.presenceMap],
  );

  const getFormattedLastSeen = useCallback(
    (userId: string): string => {
      const presence = presenceStore.presenceMap[userId];
      if (!presence) return formatLastSeen(undefined, platform);

      if (presence.status === "online") {
        return platform === "slack" ? "Active" : "online";
      }

      return formatLastSeen(presence.lastSeenAt, platform);
    },
    [presenceStore.presenceMap, platform],
  );

  const isUserOnline = useCallback(
    (userId: string): boolean => {
      const presence = presenceStore.presenceMap[userId];
      if (!presence) return false;
      return presence.status === "online" || presence.status === "dnd";
    },
    [presenceStore.presenceMap],
  );

  // ============================================================================
  // TYPING ACTIONS
  // ============================================================================

  const startTyping = useCallback(() => {
    if (!conversationId) return;
    if (!shouldSendTypingIndicator(privacySettings, conversationId, config))
      return;

    const now = Date.now();
    const timeSinceLastBroadcast = now - lastTypingBroadcastRef.current;

    // Throttle typing broadcasts
    if (timeSinceLastBroadcast < config.typing.throttleInterval) {
      // Reset the timeout but don't broadcast
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      typingTimerRef.current = setTimeout(() => {
        setIsTyping(false);
        presenceStore.setMyTyping(null);
      }, config.typing.timeout * 1000);
      return;
    }

    // Broadcast typing start
    lastTypingBroadcastRef.current = now;
    setIsTyping(true);
    presenceStore.setMyTyping(conversationId);

    // Set timeout to clear typing
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
      presenceStore.setMyTyping(null);
    }, config.typing.timeout * 1000);
  }, [conversationId, config, privacySettings, presenceStore]);

  const stopTyping = useCallback(() => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    setIsTyping(false);
    presenceStore.setMyTyping(null);
  }, [presenceStore]);

  const getTypingUsers = useCallback(
    (convId: string): UserTypingState[] => {
      const typingMap = presenceStore.typingMap[convId];
      if (!typingMap) return [];

      return Object.values(typingMap).map((t) => ({
        userId: t.userId,
        userName: t.userName,
        userAvatar: t.userAvatar,
        conversationId: convId,
        startedAt: new Date(t.startedAt),
        expiresAt: new Date(
          new Date(t.startedAt).getTime() + config.typing.timeout * 1000,
        ),
      }));
    },
    [presenceStore.typingMap, config.typing.timeout],
  );

  const getTypingText = useCallback(
    (convId: string): string => {
      const users = getTypingUsers(convId);
      return formatTypingText(users, config);
    },
    [getTypingUsers, config],
  );

  // Current conversation typing state
  const currentTypingUsers = useMemo(() => {
    if (!conversationId) return [];
    return getTypingUsers(conversationId);
  }, [conversationId, getTypingUsers]);

  const currentTypingText = useMemo(() => {
    if (!conversationId) return "";
    return getTypingText(conversationId);
  }, [conversationId, getTypingText]);

  // ============================================================================
  // RECEIPT ACTIONS
  // ============================================================================

  const markAsRead = useCallback(
    (messageId: string) => {
      if (!conversationId) return;
      if (!shouldShowReadReceipts(privacySettings, conversationId, config))
        return;

      receiptsStore.setDeliveryStatus(messageId, "read");
      receiptsStore.setMyLastRead(conversationId, messageId);
    },
    [conversationId, config, privacySettings, receiptsStore],
  );

  const markManyAsRead = useCallback(
    (messageIds: string[]) => {
      if (!conversationId) return;
      if (!shouldShowReadReceipts(privacySettings, conversationId, config))
        return;

      const updates: Record<string, StoreDeliveryStatus> = {};
      messageIds.forEach((id) => {
        updates[id] = "read";
      });
      receiptsStore.bulkSetDeliveryStatus(updates);

      // Set last read to the most recent message
      if (messageIds.length > 0) {
        receiptsStore.setMyLastRead(
          conversationId,
          messageIds[messageIds.length - 1],
        );
      }
    },
    [conversationId, config, privacySettings, receiptsStore],
  );

  const getDeliveryStatus = useCallback(
    (messageId: string): DeliveryStatus => {
      // Cast store type to platform type - they are compatible
      return (receiptsStore.deliveryStatusByMessage[messageId] ??
        "sent") as DeliveryStatus;
    },
    [receiptsStore.deliveryStatusByMessage],
  );

  const getReadReceipts = useCallback(
    (messageId: string) => {
      const receipts = receiptsStore.receiptsByMessage[messageId] ?? [];
      return receipts.map((r) => ({
        userId: r.userId,
        userName: r.user?.displayName ?? r.userId,
        readAt: new Date(r.readAt),
      }));
    },
    [receiptsStore.receiptsByMessage],
  );

  const getSeenByText = useCallback(
    (messageId: string, totalRecipients: number): string => {
      const receipts = receiptsStore.receiptsByMessage[messageId] ?? [];
      const readBy = receipts.map((r) => ({
        messageId,
        userId: r.userId,
        userName: r.user?.displayName ?? r.userId,
        readAt: new Date(r.readAt),
      }));
      return formatSeenByText(readBy, totalRecipients, config);
    },
    [receiptsStore.receiptsByMessage, config],
  );

  const getStatusIcon = useCallback(
    (status: DeliveryStatus): string => {
      return getDeliveryStatusIcon(status, config);
    },
    [config],
  );

  const getStatusColor = useCallback(
    (status: DeliveryStatus): string => {
      return getDeliveryStatusColor(status, config);
    },
    [config],
  );

  // ============================================================================
  // IDLE DETECTION
  // ============================================================================

  useEffect(() => {
    if (!autoInitialize) return;
    if (!config.presence.autoAwayTimeout) return;

    const handleActivity = () => {
      lastActivityRef.current = Date.now();

      // If currently away due to idle, restore previous status
      if (presenceStore.isIdle && presenceStore.myStatus === "away") {
        presenceStore.restorePreviousStatus();
      }
    };

    const checkIdle = () => {
      const idleTime = Date.now() - lastActivityRef.current;
      const idleThreshold = config.presence.idleTimeout * 60 * 1000;

      if (idleTime >= idleThreshold && !presenceStore.isIdle) {
        // Don't go idle if in exempt status
        if (
          !DEFAULT_TRANSITION_RULES.autoAwayExemptStatuses.includes(
            presenceStore.myStatus,
          )
        ) {
          presenceStore.setIdle(true);
        }
      }
    };

    // Listen for activity events
    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Check for idle periodically
    idleTimerRef.current = setInterval(checkIdle, 60000); // Check every minute

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      if (idleTimerRef.current) {
        clearInterval(idleTimerRef.current);
      }
    };
  }, [autoInitialize, config.presence, presenceStore]);

  // ============================================================================
  // CLEANUP
  // ============================================================================

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      if (idleTimerRef.current) {
        clearInterval(idleTimerRef.current);
      }
    };
  }, []);

  // ============================================================================
  // RETURN VALUES
  // ============================================================================

  const myPresence: UserPresenceState | null = user
    ? {
        userId: user.id,
        status: presenceStore.myStatus,
        customStatusText: presenceStore.myCustomStatus?.text ?? undefined,
        customStatusEmoji: presenceStore.myCustomStatus?.emoji ?? undefined,
        customStatusExpiresAt:
          presenceStore.myCustomStatus?.expiresAt ?? undefined,
        lastSeenAt: new Date(),
        lastActivityAt: new Date(lastActivityRef.current),
        isIdle: presenceStore.isIdle,
      }
    : null;

  return {
    presence: {
      config,
      myPresence,
      privacySettings,
      isInitialized: !presenceStore.isInitializing,
      isConnected: presenceStore.isConnected,
      setStatus,
      setCustomStatus,
      clearCustomStatus,
      updatePrivacySettings,
      setConversationOverride,
      clearConversationOverride,
      getUserPresence,
      getFormattedLastSeen,
      isUserOnline,
    },
    typing: {
      typingUsers: currentTypingUsers,
      typingText: currentTypingText,
      isAnyoneTyping: currentTypingUsers.length > 0,
      startTyping,
      stopTyping,
      getTypingUsers,
      getTypingText,
    },
    receipts: {
      receiptsEnabled:
        config.receipts.enabled && privacySettings.sendReadReceipts,
      showDeliveryStatus: config.receipts.showDeliveryStatus,
      showReadStatus: config.receipts.showReadStatus,
      markAsRead,
      markManyAsRead,
      getDeliveryStatus,
      getReadReceipts,
      getSeenByText,
      getStatusIcon,
      getStatusColor,
    },
  };
}

// ============================================================================
// SIMPLIFIED HOOKS
// ============================================================================

/**
 * Simple presence-only hook
 */
export function usePresenceStatus(
  userId: string,
  platform: PlatformPreset = "default",
) {
  const presenceStore = usePresenceStore();
  const config = useMemo(() => getPlatformConfig(platform), [platform]);

  const presence = presenceStore.presenceMap[userId];

  return {
    status: presence?.status ?? "offline",
    isOnline: presence?.status === "online" || presence?.status === "dnd",
    lastSeen: formatLastSeen(presence?.lastSeenAt, platform),
    customStatus: presence?.customStatus,
    color: getPresenceColor(presence?.status ?? "offline", platform),
  };
}

/**
 * Simple typing indicator hook
 */
export function useTypingIndicator(
  conversationId: string | null,
  platform: PlatformPreset = "default",
) {
  const presenceStore = usePresenceStore();
  const config = useMemo(() => getPlatformConfig(platform), [platform]);

  const typingMap = conversationId
    ? presenceStore.typingMap[conversationId]
    : null;
  const typingUsers = useMemo(() => {
    if (!typingMap) return [];
    return Object.values(typingMap).map((t) => ({
      userId: t.userId,
      userName: t.userName,
      userAvatar: t.userAvatar,
      conversationId: conversationId!,
      startedAt: new Date(t.startedAt),
      expiresAt: new Date(
        new Date(t.startedAt).getTime() + config.typing.timeout * 1000,
      ),
    }));
  }, [typingMap, conversationId, config.typing.timeout]);

  return {
    users: typingUsers,
    text: formatTypingText(typingUsers, config),
    isTyping: typingUsers.length > 0,
    config: config.typing,
  };
}

/**
 * Simple read receipts hook
 */
export function useMessageReceipts(
  messageId: string,
  platform: PlatformPreset = "default",
) {
  const receiptsStore = useReadReceiptsStore();
  const config = useMemo(() => getPlatformConfig(platform), [platform]);

  const storeStatus =
    receiptsStore.deliveryStatusByMessage[messageId] ?? "sent";
  const status = storeStatus as DeliveryStatus;
  const receipts = receiptsStore.receiptsByMessage[messageId] ?? [];

  return {
    status,
    receipts: receipts.map((r) => ({
      userId: r.userId,
      userName: r.user?.displayName ?? r.userId,
      readAt: new Date(r.readAt),
    })),
    icon: getDeliveryStatusIcon(status, config),
    color: getDeliveryStatusColor(status, config),
    isRead: status === "read",
    readCount: receipts.length,
  };
}

export default usePlatformPresence;
