/**
 * useRealtimePresence Hook
 *
 * Hook for managing user presence status with the nself-plugins realtime server.
 * Provides presence tracking, custom status management, and idle detection.
 *
 * @module hooks/use-realtime-presence
 * @version 1.0.0
 */

"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  getPresenceService,
  PresenceStatus,
  CustomStatus,
  UserPresence,
  FilteredUserPresence,
  PresenceSettings,
  PresenceSettingsInput,
  PresenceVisibility,
  DEFAULT_PRESENCE_SETTINGS,
} from "@/services/realtime/presence.service";
import { realtimeClient } from "@/services/realtime/realtime-client";

// ============================================================================
// Types
// ============================================================================

/**
 * Presence hook options
 */
export interface UseRealtimePresenceOptions {
  /** User IDs to subscribe to */
  userIds?: string[];
  /** Enable idle detection (default: true) */
  enableIdleDetection?: boolean;
  /** Idle timeout in milliseconds (default: 5 minutes) */
  idleTimeout?: number;
  /** Initial status */
  initialStatus?: PresenceStatus;
  /** Enable privacy filtering (default: true) */
  enablePrivacyFiltering?: boolean;
}

/**
 * Presence hook return value
 */
export interface UseRealtimePresenceReturn {
  /** Current status */
  status: PresenceStatus;
  /** Custom status */
  customStatus: CustomStatus | null;
  /** Whether idle detection triggered away status */
  isIdle: boolean;
  /** Map of user presences */
  presences: Map<string, UserPresence>;
  /** Map of filtered presences (privacy-aware) */
  filteredPresences: Map<string, FilteredUserPresence>;
  /** Set own presence status */
  setStatus: (status: PresenceStatus) => void;
  /** Set custom status */
  setCustomStatus: (status: CustomStatus | null) => void;
  /** Clear custom status */
  clearCustomStatus: () => void;
  /** Subscribe to user presence */
  subscribeToUsers: (userIds: string[]) => void;
  /** Unsubscribe from user presence */
  unsubscribeFromUsers: (userIds: string[]) => void;
  /** Get presence for a specific user */
  getPresence: (userId: string) => UserPresence | undefined;
  /** Get filtered presence for a specific user (privacy-aware) */
  getFilteredPresence: (userId: string) => FilteredUserPresence | undefined;
  /** Fetch presence for users from server */
  fetchPresence: (userIds: string[]) => Promise<Map<string, UserPresence>>;
  /** Fetch filtered presence for users (privacy-aware) */
  fetchFilteredPresence: (
    userIds: string[],
  ) => Promise<Map<string, FilteredUserPresence>>;
  /** Own presence settings */
  presenceSettings: PresenceSettings | null;
  /** Update own presence settings */
  updatePresenceSettings: (settings: PresenceSettingsInput) => Promise<boolean>;
  /** Whether invisible mode is enabled */
  isInvisible: boolean;
  /** Set invisible mode */
  setInvisibleMode: (enabled: boolean) => Promise<boolean>;
  /** Refresh presence settings */
  refreshPresenceSettings: () => Promise<void>;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing user presence
 *
 * @example
 * ```tsx
 * function UserList({ userIds }: { userIds: string[] }) {
 *   const {
 *     status,
 *     setStatus,
 *     presences,
 *     subscribeToUsers,
 *   } = useRealtimePresence({ userIds });
 *
 *   return (
 *     <div>
 *       <select value={status} onChange={(e) => setStatus(e.target.value as PresenceStatus)}>
 *         <option value="online">Online</option>
 *         <option value="away">Away</option>
 *         <option value="busy">Busy</option>
 *         <option value="offline">Appear Offline</option>
 *       </select>
 *
 *       {userIds.map((userId) => {
 *         const presence = presences.get(userId);
 *         return (
 *           <div key={userId}>
 *             {userId}: {presence?.status || 'offline'}
 *           </div>
 *         );
 *       })}
 *     </div>
 *   );
 * }
 * ```
 */
export function useRealtimePresence(
  options: UseRealtimePresenceOptions = {},
): UseRealtimePresenceReturn {
  const {
    userIds = [],
    enableIdleDetection = true,
    idleTimeout = 5 * 60 * 1000,
    initialStatus = "online",
    enablePrivacyFiltering = true,
  } = options;

  const { user, getAccessToken } = useAuth();

  // State
  const [status, setStatusState] = useState<PresenceStatus>(initialStatus);
  const [customStatus, setCustomStatusState] = useState<CustomStatus | null>(
    null,
  );
  const [presences, setPresences] = useState<Map<string, UserPresence>>(
    new Map(),
  );
  const [filteredPresences, setFilteredPresences] = useState<
    Map<string, FilteredUserPresence>
  >(new Map());
  const [isIdle, setIsIdle] = useState(false);
  const [presenceSettings, setPresenceSettings] =
    useState<PresenceSettings | null>(null);
  const [isInvisible, setIsInvisible] = useState(false);

  // Get service instance
  const presenceService = useMemo(() => {
    return getPresenceService({
      enableIdleDetection,
      idleTimeout,
      enablePrivacyFiltering,
      getAuthToken: () => getAccessToken(),
    });
  }, [
    enableIdleDetection,
    idleTimeout,
    enablePrivacyFiltering,
    getAccessToken,
  ]);

  // Set current user ID for privacy filtering
  useEffect(() => {
    if (user?.id) {
      presenceService.setCurrentUserId(user.id);
    }
  }, [user?.id, presenceService]);

  // ============================================================================
  // Status Management
  // ============================================================================

  /**
   * Set own presence status
   */
  const setStatus = useCallback(
    (newStatus: PresenceStatus) => {
      setStatusState(newStatus);
      presenceService.setStatus(newStatus);
    },
    [presenceService],
  );

  /**
   * Set custom status
   */
  const setCustomStatus = useCallback(
    (status: CustomStatus | null) => {
      setCustomStatusState(status);
      presenceService.setCustomStatus(status);
    },
    [presenceService],
  );

  /**
   * Clear custom status
   */
  const clearCustomStatus = useCallback(() => {
    setCustomStatus(null);
  }, [setCustomStatus]);

  // ============================================================================
  // Subscription Management
  // ============================================================================

  /**
   * Subscribe to user presence updates
   */
  const subscribeToUsers = useCallback(
    (userIds: string[]) => {
      presenceService.subscribeToUsers(userIds);
    },
    [presenceService],
  );

  /**
   * Unsubscribe from user presence updates
   */
  const unsubscribeFromUsers = useCallback(
    (userIds: string[]) => {
      presenceService.unsubscribeFromUsers(userIds);
    },
    [presenceService],
  );

  /**
   * Get presence for a specific user
   */
  const getPresence = useCallback(
    (userId: string): UserPresence | undefined => {
      return presences.get(userId) || presenceService.getPresence(userId);
    },
    [presences, presenceService],
  );

  /**
   * Fetch presence for users from server
   */
  const fetchPresence = useCallback(
    async (userIds: string[]): Promise<Map<string, UserPresence>> => {
      const result = await presenceService.fetchPresence(userIds);
      setPresences(new Map(result));
      return result;
    },
    [presenceService],
  );

  /**
   * Get filtered presence for a specific user (privacy-aware)
   */
  const getFilteredPresence = useCallback(
    (userId: string): FilteredUserPresence | undefined => {
      return filteredPresences.get(userId);
    },
    [filteredPresences],
  );

  /**
   * Fetch filtered presence for users (privacy-aware)
   */
  const fetchFilteredPresence = useCallback(
    async (userIds: string[]): Promise<Map<string, FilteredUserPresence>> => {
      if (!user?.id) {
        return new Map();
      }

      const result = await presenceService.getVisiblePresence(user.id, userIds);
      setFilteredPresences(result);
      return result;
    },
    [presenceService, user?.id],
  );

  /**
   * Update own presence settings
   */
  const updatePresenceSettings = useCallback(
    async (settings: PresenceSettingsInput): Promise<boolean> => {
      if (!user?.id) {
        return false;
      }

      const updated = await presenceService.updatePresenceSettings(
        user.id,
        settings,
      );
      if (updated) {
        setPresenceSettings(updated);
        setIsInvisible(updated.invisibleMode);
        return true;
      }
      return false;
    },
    [presenceService, user?.id],
  );

  /**
   * Set invisible mode
   */
  const setInvisibleMode = useCallback(
    async (enabled: boolean): Promise<boolean> => {
      const success = await presenceService.setInvisibleMode(enabled);
      if (success) {
        setIsInvisible(enabled);
      }
      return success;
    },
    [presenceService],
  );

  /**
   * Refresh presence settings from server
   */
  const refreshPresenceSettings = useCallback(async (): Promise<void> => {
    if (!user?.id) return;

    const settings = await presenceService.getPresenceSettings(user.id);
    if (settings) {
      setPresenceSettings(settings);
      setIsInvisible(settings.invisibleMode);
    } else {
      // Use defaults
      setPresenceSettings({
        userId: user.id,
        ...DEFAULT_PRESENCE_SETTINGS,
      });
    }
  }, [presenceService, user?.id]);

  // ============================================================================
  // Effects
  // ============================================================================

  /**
   * Subscribe to presence changes
   */
  useEffect(() => {
    const unsub = presenceService.onPresenceChange((presence) => {
      setPresences((prev) => {
        const next = new Map(prev);
        next.set(presence.userId, presence);
        return next;
      });

      // Also update filtered presences if we have the viewer's ID
      if (user?.id && enablePrivacyFiltering) {
        presenceService
          .getVisiblePresence(user.id, [presence.userId])
          .then((filtered) => {
            setFilteredPresences((prev) => {
              const next = new Map(prev);
              const filteredPresence = filtered.get(presence.userId);
              if (filteredPresence) {
                next.set(presence.userId, filteredPresence);
              }
              return next;
            });
          });
      }
    });

    return unsub;
  }, [presenceService, user?.id, enablePrivacyFiltering]);

  /**
   * Subscribe to initial user IDs
   */
  useEffect(() => {
    if (userIds.length > 0 && realtimeClient.isConnected) {
      subscribeToUsers(userIds);
    }

    return () => {
      if (userIds.length > 0) {
        unsubscribeFromUsers(userIds);
      }
    };
  }, [userIds, subscribeToUsers, unsubscribeFromUsers]);

  /**
   * Set initial status when connected
   */
  useEffect(() => {
    if (user && realtimeClient.isConnected) {
      presenceService.setStatus(initialStatus);
    }
  }, [user, initialStatus, presenceService]);

  /**
   * Sync state from service
   */
  useEffect(() => {
    const syncState = () => {
      setStatusState(presenceService.getStatus());
      setCustomStatusState(presenceService.getCustomStatus());
      setPresences(presenceService.getAllPresences());

      // Sync presence settings
      const ownSettings = presenceService.getOwnPresenceSettings();
      if (ownSettings) {
        setPresenceSettings(ownSettings);
        setIsInvisible(ownSettings.invisibleMode);
      }
    };

    // Initial sync
    syncState();

    // Subscribe to connection state changes
    const unsub = realtimeClient.onConnectionStateChange((state) => {
      if (state === "connected" || state === "authenticated") {
        syncState();
      }
    });

    return unsub;
  }, [presenceService]);

  /**
   * Load presence settings on mount
   */
  useEffect(() => {
    if (user?.id) {
      refreshPresenceSettings();
    }
  }, [user?.id, refreshPresenceSettings]);

  /**
   * Track idle state (for UI purposes)
   */
  useEffect(() => {
    if (!enableIdleDetection || typeof window === "undefined") return;

    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    const handleActivity = () => {
      if (isIdle) {
        setIsIdle(false);
      }
      if (idleTimer) {
        clearTimeout(idleTimer);
      }
      idleTimer = setTimeout(() => {
        setIsIdle(true);
      }, idleTimeout);
    };

    const events = ["mousemove", "keydown", "click", "scroll"];
    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    // Start initial timer
    handleActivity();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      if (idleTimer) {
        clearTimeout(idleTimer);
      }
    };
  }, [enableIdleDetection, idleTimeout, isIdle]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    status,
    customStatus,
    isIdle,
    presences,
    filteredPresences,
    setStatus,
    setCustomStatus,
    clearCustomStatus,
    subscribeToUsers,
    unsubscribeFromUsers,
    getPresence,
    getFilteredPresence,
    fetchPresence,
    fetchFilteredPresence,
    presenceSettings,
    updatePresenceSettings,
    isInvisible,
    setInvisibleMode,
    refreshPresenceSettings,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to get presence for a single user
 */
export function useUserPresence(userId: string): UserPresence | undefined {
  const { presences, subscribeToUsers, unsubscribeFromUsers } =
    useRealtimePresence();

  useEffect(() => {
    subscribeToUsers([userId]);
    return () => unsubscribeFromUsers([userId]);
  }, [userId, subscribeToUsers, unsubscribeFromUsers]);

  return presences.get(userId);
}

/**
 * Hook to get online status for a user
 */
export function useUserOnlineStatus(userId: string): boolean {
  const presence = useUserPresence(userId);
  return (
    presence?.status === "online" ||
    presence?.status === "away" ||
    presence?.status === "busy"
  );
}

/**
 * Hook for managing presence settings via API
 */
export function usePresenceSettings() {
  const { user, getAccessToken } = useAuth();
  const [settings, setSettings] = useState<PresenceSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch settings on mount
  useEffect(() => {
    const token = getAccessToken();
    if (!user?.id || !token) {
      setIsLoading(false);
      return;
    }

    const fetchSettings = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/users/me/presence-settings", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch presence settings");
        }

        const json = await response.json();
        if (json.success) {
          setSettings(json.data);
        } else {
          throw new Error(json.error || "Unknown error");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch settings",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [user?.id, getAccessToken]);

  /**
   * Update presence settings
   */
  const updateSettings = useCallback(
    async (updates: PresenceSettingsInput): Promise<boolean> => {
      const token = getAccessToken();
      if (!token) {
        setError("Not authenticated");
        return false;
      }

      try {
        const response = await fetch("/api/users/me/presence-settings", {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          throw new Error("Failed to update presence settings");
        }

        const json = await response.json();
        if (json.success) {
          setSettings(json.data);
          return true;
        } else {
          throw new Error(json.error || "Unknown error");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update settings",
        );
        return false;
      }
    },
    [getAccessToken],
  );

  /**
   * Set visibility level
   */
  const setVisibility = useCallback(
    (visibility: PresenceVisibility) => {
      return updateSettings({ visibility });
    },
    [updateSettings],
  );

  /**
   * Toggle show last seen
   */
  const setShowLastSeen = useCallback(
    (enabled: boolean) => {
      return updateSettings({ showLastSeen: enabled });
    },
    [updateSettings],
  );

  /**
   * Toggle show online status
   */
  const setShowOnlineStatus = useCallback(
    (enabled: boolean) => {
      return updateSettings({ showOnlineStatus: enabled });
    },
    [updateSettings],
  );

  /**
   * Toggle allow read receipts
   */
  const setAllowReadReceipts = useCallback(
    (enabled: boolean) => {
      return updateSettings({ allowReadReceipts: enabled });
    },
    [updateSettings],
  );

  /**
   * Toggle invisible mode
   */
  const setInvisibleMode = useCallback(
    (enabled: boolean) => {
      return updateSettings({ invisibleMode: enabled });
    },
    [updateSettings],
  );

  /**
   * Refresh settings
   */
  const refresh = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/users/me/presence-settings", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const json = await response.json();
        if (json.success) {
          setSettings(json.data);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken]);

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    setVisibility,
    setShowLastSeen,
    setShowOnlineStatus,
    setAllowReadReceipts,
    setInvisibleMode,
    refresh,
  };
}

export default useRealtimePresence;

// Re-export types for convenience
export type {
  PresenceSettings,
  PresenceSettingsInput,
  PresenceVisibility,
  FilteredUserPresence,
};
export { DEFAULT_PRESENCE_SETTINGS };
