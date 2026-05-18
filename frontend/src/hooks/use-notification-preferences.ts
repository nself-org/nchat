/**
 * useNotificationPreferences Hook
 *
 * Manages user notification preferences including:
 * - Fetch and cache preferences
 * - Update channel preferences (email, push, SMS)
 * - Manage quiet hours
 * - Per-category settings
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  UserNotificationPreferences,
  NotificationChannel,
  NotificationCategory,
  FrequencyType,
  QuietHours,
  defaultUserPreferences,
} from "@/types/notifications";
import { useAuth } from "@/contexts/auth-context";

// =============================================================================
// Types
// =============================================================================

export interface UseNotificationPreferencesOptions {
  /**
   * Auto-fetch preferences on mount
   */
  autoFetch?: boolean;

  /**
   * Callback when preferences are updated
   */
  onUpdate?: (preferences: UserNotificationPreferences) => void;

  /**
   * Callback on error
   */
  onError?: (error: Error) => void;
}

export interface UseNotificationPreferencesReturn {
  /**
   * Current notification preferences
   */
  preferences: UserNotificationPreferences;

  /**
   * Loading state
   */
  isLoading: boolean;

  /**
   * Error message
   */
  error: string | null;

  /**
   * Fetch preferences from server
   */
  fetchPreferences: () => Promise<void>;

  /**
   * Update preferences
   */
  updatePreferences: (
    updates: Partial<UserNotificationPreferences>,
  ) => Promise<void>;

  /**
   * Toggle channel enabled state
   */
  toggleChannel: (
    channel: NotificationChannel,
    enabled: boolean,
  ) => Promise<void>;

  /**
   * Update channel frequency
   */
  setChannelFrequency: (
    channel: NotificationChannel,
    frequency: FrequencyType,
  ) => Promise<void>;

  /**
   * Toggle category for a channel
   */
  toggleCategory: (
    channel: NotificationChannel,
    category: NotificationCategory,
    enabled: boolean,
  ) => Promise<void>;

  /**
   * Set quiet hours
   */
  setQuietHours: (quietHours: QuietHours | null) => Promise<void>;

  /**
   * Enable digest mode
   */
  setDigest: (
    enabled: boolean,
    frequency?: "daily" | "weekly",
    time?: string,
  ) => Promise<void>;

  /**
   * Trigger a digest email immediately
   */
  triggerDigest: () => Promise<boolean>;

  /**
   * Reset preferences to defaults
   */
  resetPreferences: () => Promise<void>;

  /**
   * Check if a specific notification type is enabled
   */
  isEnabled: (
    channel: NotificationChannel,
    category?: NotificationCategory,
  ) => boolean;
}

// =============================================================================
// Hook
// =============================================================================

export function useNotificationPreferences(
  options: UseNotificationPreferencesOptions = {},
): UseNotificationPreferencesReturn {
  const { autoFetch = true, onUpdate, onError } = options;
  const { user } = useAuth();

  const [preferences, setPreferences] = useState<UserNotificationPreferences>(
    defaultUserPreferences,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle errors
  const handleError = useCallback(
    (err: Error | string) => {
      const message = typeof err === "string" ? err : err.message;
      setError(message);
      onError?.(typeof err === "string" ? new Error(err) : err);
    },
    [onError],
  );

  // Fetch preferences from API
  const fetchPreferences = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/notifications/preferences?user_id=${user.id}`,
      );
      const data = await response.json();

      if (data.success && data.data?.preferences) {
        setPreferences(data.data.preferences);
      } else {
        // Use defaults on error
        setPreferences(defaultUserPreferences);
      }
    } catch (err) {
      handleError(
        err instanceof Error ? err : new Error("Failed to fetch preferences"),
      );
      setPreferences(defaultUserPreferences);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, handleError]);

  // Update preferences on server
  const updatePreferences = useCallback(
    async (updates: Partial<UserNotificationPreferences>) => {
      if (!user?.id) {
        handleError("User not authenticated");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/notifications/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            preferences: updates,
          }),
        });

        const data = await response.json();

        if (data.success && data.data?.preferences) {
          setPreferences(data.data.preferences);
          onUpdate?.(data.data.preferences);
        } else {
          throw new Error(data.error || "Failed to update preferences");
        }
      } catch (err) {
        handleError(
          err instanceof Error
            ? err
            : new Error("Failed to update preferences"),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id, handleError, onUpdate],
  );

  // Toggle channel enabled state
  const toggleChannel = useCallback(
    async (channel: NotificationChannel, enabled: boolean) => {
      const updates: Partial<UserNotificationPreferences> = {};

      if (channel === "email") {
        updates.email = { ...preferences.email, enabled };
      } else if (channel === "push") {
        updates.push = { ...preferences.push, enabled };
      } else if (channel === "sms") {
        updates.sms = { ...preferences.sms, enabled };
      }

      await updatePreferences(updates);
    },
    [preferences, updatePreferences],
  );

  // Set channel frequency
  const setChannelFrequency = useCallback(
    async (channel: NotificationChannel, frequency: FrequencyType) => {
      const updates: Partial<UserNotificationPreferences> = {};

      if (channel === "email") {
        updates.email = { ...preferences.email, frequency };
      } else if (channel === "push") {
        updates.push = { ...preferences.push, frequency };
      } else if (channel === "sms") {
        updates.sms = { ...preferences.sms, frequency };
      }

      await updatePreferences(updates);
    },
    [preferences, updatePreferences],
  );

  // Toggle category for a channel
  const toggleCategory = useCallback(
    async (
      channel: NotificationChannel,
      category: NotificationCategory,
      enabled: boolean,
    ) => {
      const updates: Partial<UserNotificationPreferences> = {};

      if (channel === "email") {
        updates.email = {
          ...preferences.email,
          categories: { ...preferences.email.categories, [category]: enabled },
        };
      } else if (channel === "push") {
        updates.push = {
          ...preferences.push,
          categories: { ...preferences.push.categories, [category]: enabled },
        };
      } else if (channel === "sms") {
        updates.sms = {
          ...preferences.sms,
          categories: { ...preferences.sms.categories, [category]: enabled },
        };
      }

      await updatePreferences(updates);
    },
    [preferences, updatePreferences],
  );

  // Set quiet hours
  const setQuietHours = useCallback(
    async (quietHours: QuietHours | null) => {
      await updatePreferences({ quietHours: quietHours || undefined });
    },
    [updatePreferences],
  );

  // Set digest settings
  const setDigest = useCallback(
    async (enabled: boolean, frequency?: "daily" | "weekly", time?: string) => {
      if (!user?.id) {
        handleError("User not authenticated");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Use the dedicated digest API endpoint
        const response = await fetch("/api/notifications/digest", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            settings: {
              enabled,
              frequency: frequency || preferences.digest.frequency,
              time: time || preferences.digest.time,
            },
          }),
        });

        const data = await response.json();

        if (data.success) {
          const updatedDigest = {
            enabled,
            frequency: frequency || preferences.digest.frequency,
            time: time || preferences.digest.time,
          };
          setPreferences((prev) => ({ ...prev, digest: updatedDigest }));
          onUpdate?.({ ...preferences, digest: updatedDigest });
        } else {
          throw new Error(data.error || "Failed to update digest settings");
        }
      } catch (err) {
        handleError(
          err instanceof Error
            ? err
            : new Error("Failed to update digest settings"),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id, preferences, handleError, onUpdate],
  );

  // Trigger a digest email immediately
  const triggerDigest = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      handleError("User not authenticated");
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/notifications/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          force: true,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to send digest");
      }

      return true;
    } catch (err) {
      handleError(
        err instanceof Error ? err : new Error("Failed to send digest"),
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, handleError]);

  // Reset to defaults
  const resetPreferences = useCallback(async () => {
    if (!user?.id) {
      handleError("User not authenticated");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/notifications/preferences?user_id=${user.id}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (data.success) {
        setPreferences(defaultUserPreferences);
        onUpdate?.(defaultUserPreferences);
      } else {
        throw new Error(data.error || "Failed to reset preferences");
      }
    } catch (err) {
      handleError(
        err instanceof Error ? err : new Error("Failed to reset preferences"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, handleError, onUpdate]);

  // Check if notification type is enabled
  const isEnabled = useCallback(
    (
      channel: NotificationChannel,
      category?: NotificationCategory,
    ): boolean => {
      const channelPrefs = preferences[channel];

      if (!channelPrefs.enabled) {
        return false;
      }

      if (category) {
        return channelPrefs.categories[category] ?? false;
      }

      return true;
    },
    [preferences],
  );

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && user?.id) {
      fetchPreferences();
    }
  }, [autoFetch, user?.id, fetchPreferences]);

  return {
    preferences,
    isLoading,
    error,
    fetchPreferences,
    updatePreferences,
    toggleChannel,
    setChannelFrequency,
    toggleCategory,
    setQuietHours,
    setDigest,
    triggerDigest,
    resetPreferences,
    isEnabled,
  };
}

export default useNotificationPreferences;
