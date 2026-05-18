/**
 * Disappearing Messages Hook
 *
 * React hook for managing disappearing messages in a channel.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation, useQuery } from "@apollo/client";
import {
  getDisappearingManager,
  initializeDisappearingManager,
  DisappearingSettings,
  DisappearingMessageData,
  DisappearingMessageType,
  getChannelSettings,
  saveChannelSettings,
  isDisappearingEnabled,
  formatDuration,
  formatCountdown,
} from "@/lib/disappearing";
import { logger } from "@/lib/logger";
import {
  GET_DISAPPEARING_SETTINGS,
  GET_DISAPPEARING_MESSAGES,
  ENABLE_DISAPPEARING,
  DISABLE_DISAPPEARING,
  UPDATE_DISAPPEARING_SETTINGS,
  MARK_VIEW_ONCE_VIEWED,
  START_BURN_TIMER,
  DELETE_EXPIRED_MESSAGE,
  type DisappearingSettingsData,
} from "@/graphql/disappearing";

interface UseDisappearingMessagesOptions {
  /** Channel ID */
  channelId: string;
  /** Current user ID */
  userId: string;
  /** Callback when a message expires */
  onMessageExpired?: (messageId: string) => void;
  /** Callback when settings change */
  onSettingsChanged?: (settings: DisappearingSettings) => void;
  /** Enable real-time sync */
  enableRealtime?: boolean;
}

interface UseDisappearingMessagesReturn {
  /** Whether disappearing is enabled for this channel */
  isEnabled: boolean;
  /** Current settings */
  settings: DisappearingSettings;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Enable disappearing with duration */
  enable: (duration: number) => Promise<void>;
  /** Disable disappearing */
  disable: () => Promise<void>;
  /** Update settings */
  updateSettings: (settings: Partial<DisappearingSettings>) => Promise<void>;
  /** Track a message for expiration */
  trackMessage: (
    messageId: string,
    disappearing: DisappearingMessageData,
  ) => void;
  /** View a view-once message */
  viewViewOnce: (
    messageId: string,
  ) => Promise<{ content?: string; error?: string }>;
  /** Start burn-after-reading timer */
  startBurn: (messageId: string, burnSeconds: number) => Promise<Date>;
  /** Get remaining time for a message */
  getRemainingTime: (messageId: string) => number;
  /** Get formatted remaining time */
  getFormattedTime: (messageId: string) => string;
  /** Check if message is about to expire */
  isAboutToExpire: (messageId: string) => boolean;
  /** Get active timers */
  activeTimers: Array<{
    messageId: string;
    expiresAt: Date;
    type: DisappearingMessageType;
  }>;
}

/**
 * Hook for managing disappearing messages in a channel.
 */
export function useDisappearingMessages({
  channelId,
  userId,
  onMessageExpired,
  onSettingsChanged,
  enableRealtime = true,
}: UseDisappearingMessagesOptions): UseDisappearingMessagesReturn {
  const [settings, setSettings] = useState<DisappearingSettings>(() =>
    getChannelSettings(channelId),
  );
  const [activeTimers, setActiveTimers] = useState<
    Array<{ messageId: string; expiresAt: Date; type: DisappearingMessageType }>
  >([]);
  const [error, setError] = useState<Error | null>(null);
  const managerRef = useRef(getDisappearingManager());

  // GraphQL queries and mutations
  const { data: settingsData, loading: settingsLoading } = useQuery(
    GET_DISAPPEARING_SETTINGS,
    {
      variables: { channelId },
      skip: !channelId,
    },
  );

  const { data: messagesData, loading: messagesLoading } = useQuery(
    GET_DISAPPEARING_MESSAGES,
    {
      variables: { channelId, limit: 100 },
      skip: !channelId || !settings.enabled,
    },
  );

  const [enableMutation] = useMutation(ENABLE_DISAPPEARING);
  const [disableMutation] = useMutation(DISABLE_DISAPPEARING);
  const [updateSettingsMutation] = useMutation(UPDATE_DISAPPEARING_SETTINGS);
  const [markViewedMutation] = useMutation(MARK_VIEW_ONCE_VIEWED);
  const [startBurnMutation] = useMutation(START_BURN_TIMER);
  const [deleteMessageMutation] = useMutation(DELETE_EXPIRED_MESSAGE);

  // Initialize manager
  useEffect(() => {
    const manager = managerRef.current;

    manager.initialize({
      onMessageExpired: (messageId, _channelId) => {
        onMessageExpired?.(messageId);
        // Update active timers
        setActiveTimers((prev) =>
          prev.filter((t) => t.messageId !== messageId),
        );
        // Delete from server
        deleteMessageMutation({ variables: { messageId } }).catch(
          console.error,
        );
      },
      onSettingsChanged: (_channelId, newSettings) => {
        setSettings(newSettings);
        onSettingsChanged?.(newSettings);
      },
    });

    return () => {
      manager.cleanup();
    };
  }, [onMessageExpired, onSettingsChanged, deleteMessageMutation]);

  // Sync settings from server
  useEffect(() => {
    if (settingsData?.nchat_disappearing_settings_by_pk) {
      const serverSettings = settingsData.nchat_disappearing_settings_by_pk;
      const newSettings: DisappearingSettings = {
        enabled: serverSettings.enabled,
        defaultDuration: serverSettings.default_duration,
        canModify: serverSettings.can_modify,
        showBanner: serverSettings.show_banner,
        updatedAt: serverSettings.updated_at,
        updatedBy: serverSettings.updated_by,
      };
      setSettings(newSettings);
      saveChannelSettings(channelId, newSettings);
    }
  }, [settingsData, channelId]);

  // Track messages from server
  useEffect(() => {
    if (messagesData?.nchat_messages) {
      const manager = managerRef.current;
      const timers: Array<{
        messageId: string;
        expiresAt: Date;
        type: DisappearingMessageType;
      }> = [];

      for (const msg of messagesData.nchat_messages) {
        if (msg.disappearing_type) {
          const disappearing: DisappearingMessageData = {
            type: msg.disappearing_type,
            timerDuration: msg.disappearing_duration,
            burnTimer: msg.disappearing_burn_timer,
            sentAt: msg.created_at,
            expiresAt: msg.disappearing_expires_at,
            hasBeenViewed: msg.disappearing_viewed,
            viewedAt: msg.disappearing_viewed_at,
            viewedBy: msg.disappearing_viewed_by,
            isReading: msg.disappearing_is_reading,
            readingStartedAt: msg.disappearing_reading_started_at,
          };

          manager.trackMessage({
            id: msg.id,
            channelId: msg.channel_id,
            userId: msg.user_id,
            content: "",
            disappearing,
          });

          if (msg.disappearing_expires_at) {
            timers.push({
              messageId: msg.id,
              expiresAt: new Date(msg.disappearing_expires_at),
              type: msg.disappearing_type,
            });
          }
        }
      }

      setActiveTimers(timers);
    }
  }, [messagesData]);

  // Enable disappearing
  const enable = useCallback(
    async (duration: number) => {
      try {
        setError(null);
        await enableMutation({
          variables: { channelId, duration, userId },
        });
        const newSettings = saveChannelSettings(
          channelId,
          { enabled: true, defaultDuration: duration },
          userId,
        );
        setSettings(newSettings);
        onSettingsChanged?.(newSettings);
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [channelId, userId, enableMutation, onSettingsChanged],
  );

  // Disable disappearing
  const disable = useCallback(async () => {
    try {
      setError(null);
      await disableMutation({
        variables: { channelId, userId },
      });
      const newSettings = saveChannelSettings(
        channelId,
        { enabled: false },
        userId,
      );
      setSettings(newSettings);
      onSettingsChanged?.(newSettings);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [channelId, userId, disableMutation, onSettingsChanged]);

  // Update settings
  const updateSettings = useCallback(
    async (newSettings: Partial<DisappearingSettings>) => {
      try {
        setError(null);
        await updateSettingsMutation({
          variables: {
            channelId,
            settings: {
              enabled: newSettings.enabled,
              default_duration: newSettings.defaultDuration,
              can_modify: newSettings.canModify,
              show_banner: newSettings.showBanner,
              updated_by: userId,
            },
          },
        });
        const updated = saveChannelSettings(channelId, newSettings, userId);
        setSettings(updated);
        onSettingsChanged?.(updated);
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [channelId, userId, updateSettingsMutation, onSettingsChanged],
  );

  // Track a message
  const trackMessage = useCallback(
    (messageId: string, disappearing: DisappearingMessageData) => {
      managerRef.current.trackMessage({
        id: messageId,
        channelId,
        userId,
        content: "",
        disappearing,
      });

      if (disappearing.expiresAt) {
        setActiveTimers((prev) => [
          ...prev,
          {
            messageId,
            expiresAt: new Date(disappearing.expiresAt!),
            type: disappearing.type,
          },
        ]);
      }
    },
    [channelId, userId],
  );

  // View a view-once message
  const viewViewOnce = useCallback(
    async (messageId: string) => {
      try {
        const result = await markViewedMutation({
          variables: { messageId, viewerId: userId },
        });

        if (result.data?.update_nchat_messages_by_pk) {
          managerRef.current.viewViewOnceMessage(messageId, channelId, userId);
          return {
            content: result.data.update_nchat_messages_by_pk.content,
          };
        }

        return { error: "Failed to view message" };
      } catch (err) {
        return { error: (err as Error).message };
      }
    },
    [markViewedMutation, userId, channelId],
  );

  // Start burn timer
  const startBurn = useCallback(
    async (messageId: string, burnSeconds: number) => {
      const expiresAt = new Date(Date.now() + burnSeconds * 1000);

      await startBurnMutation({
        variables: { messageId, expiresAt: expiresAt.toISOString() },
      });

      managerRef.current.startBurnAfterReading(
        messageId,
        channelId,
        burnSeconds,
      );

      setActiveTimers((prev) => [
        ...prev.filter((t) => t.messageId !== messageId),
        { messageId, expiresAt, type: "burn_after_reading" },
      ]);

      return expiresAt;
    },
    [startBurnMutation, channelId],
  );

  // Get remaining time
  const getRemainingTime = useCallback((messageId: string) => {
    return managerRef.current.getMessageRemainingTime(messageId);
  }, []);

  // Get formatted time
  const getFormattedTime = useCallback((messageId: string) => {
    return managerRef.current.getFormattedRemainingTime(messageId);
  }, []);

  // Check if about to expire
  const isAboutToExpire = useCallback((messageId: string) => {
    return managerRef.current.isAboutToExpire(messageId);
  }, []);

  return {
    isEnabled: settings.enabled,
    settings,
    isLoading: settingsLoading || messagesLoading,
    error,
    enable,
    disable,
    updateSettings,
    trackMessage,
    viewViewOnce,
    startBurn,
    getRemainingTime,
    getFormattedTime,
    isAboutToExpire,
    activeTimers,
  };
}

/**
 * Simple hook for checking if disappearing is enabled.
 */
export function useIsDisappearingEnabled(channelId: string): boolean {
  const [enabled, setEnabled] = useState(() =>
    isDisappearingEnabled(channelId),
  );

  useEffect(() => {
    setEnabled(isDisappearingEnabled(channelId));
  }, [channelId]);

  return enabled;
}

/**
 * Hook for formatting remaining time with auto-update.
 */
export function useRemainingTime(
  messageId: string,
  expiresAt: string | Date | null,
): { remaining: number; formatted: string; isExpired: boolean } {
  const [remaining, setRemaining] = useState(() => {
    if (!expiresAt) return -1;
    const ms = new Date(expiresAt).getTime() - Date.now();
    return Math.floor(ms / 1000);
  });

  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      const seconds = Math.floor(ms / 1000);
      setRemaining(Math.max(-1, seconds));

      if (seconds <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return {
    remaining,
    formatted: remaining >= 0 ? formatCountdown(remaining) : "",
    isExpired: remaining <= 0 && expiresAt !== null,
  };
}

export default useDisappearingMessages;
