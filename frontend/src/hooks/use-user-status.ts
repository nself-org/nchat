/**
 * useUserStatus Hook
 *
 * React hook for managing user call availability status.
 * Handles online, busy, away, DND, and offline states.
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  CallStatusManager,
  createStatusManager,
  type UserStatus,
  type UserCallStatus,
  type StatusManagerConfig,
} from "@/lib/calls/call-status-manager";
import { useAuth } from "@/contexts/auth-context";

// =============================================================================
// Types
// =============================================================================

export interface UseUserStatusOptions extends StatusManagerConfig {
  autoInitialize?: boolean;
}

export interface UseUserStatusReturn {
  // Current user status
  myStatus: UserCallStatus | null;
  status: UserStatus;
  customMessage?: string;
  inCall: boolean;
  callId?: string;

  // Status checks
  isOnline: boolean;
  isBusy: boolean;
  isAway: boolean;
  isDND: boolean;
  isOffline: boolean;
  isAvailable: boolean;

  // Actions
  setStatus: (status: UserStatus, customMessage?: string) => boolean;
  setOnline: () => boolean;
  setBusy: () => boolean;
  setAway: () => boolean;
  setDND: (message?: string) => boolean;
  setOffline: () => boolean;
  updateActivity: () => void;
  startCall: (callId: string) => boolean;
  endCall: () => boolean;
  setCallWaiting: (enabled: boolean) => boolean;

  // Other users
  getUserStatus: (userId: string) => UserCallStatus | undefined;
  isUserAvailable: (userId: string) => boolean;
  isUserBusy: (userId: string) => boolean;
  getUnavailabilityReason: (userId: string) => string | null;
  getStatusDisplay: (userId: string) => string;

  // All users
  allStatuses: UserCallStatus[];
  onlineUsers: UserCallStatus[];
  busyUsers: UserCallStatus[];
  availableUsers: UserCallStatus[];

  // Statistics
  stats: {
    total: number;
    online: number;
    busy: number;
    away: number;
    dnd: number;
    offline: number;
    inCall: number;
  };
}

// =============================================================================
// Hook
// =============================================================================

export function useUserStatus(
  options: UseUserStatusOptions = {},
): UseUserStatusReturn {
  const { autoInitialize = true, ...config } = options;
  const { user } = useAuth();

  // Manager instance
  const managerRef = useRef<CallStatusManager | null>(null);

  // State
  const [myStatus, setMyStatus] = useState<UserCallStatus | null>(null);
  const [, forceUpdate] = useState({});

  // Initialize manager
  useEffect(() => {
    managerRef.current = createStatusManager({
      ...config,
      onStatusChange: (status) => {
        // Update state if it's the current user
        if (user && status.userId === user.id) {
          setMyStatus({ ...status });
        }

        // Call user's callback
        if (config.onStatusChange) {
          config.onStatusChange(status);
        }

        // Force update to refresh derived state
        forceUpdate({});
      },
    });

    // Initialize current user
    if (autoInitialize && user) {
      managerRef.current.initializeUser(user.id, "online");
      const status = managerRef.current.getStatus(user.id);
      if (status) {
        setMyStatus(status);
      }
    }

    return () => {
      if (managerRef.current) {
        managerRef.current.cleanup();
      }
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived state
  const status = myStatus?.status || "offline";
  const customMessage = myStatus?.customMessage;
  const inCall = myStatus?.inCall || false;
  const callId = myStatus?.callId;

  // Status checks
  const isOnline = status === "online";
  const isBusy = status === "busy";
  const isAway = status === "away";
  const isDND = status === "dnd";
  const isOffline = status === "offline";
  const isAvailable = user
    ? managerRef.current?.isAvailable(user.id) || false
    : false;

  // Actions
  const setStatus = useCallback(
    (newStatus: UserStatus, message?: string): boolean => {
      if (!user || !managerRef.current) return false;
      return managerRef.current.setStatus(user.id, newStatus, message);
    },
    [user],
  );

  const setOnline = useCallback((): boolean => {
    return setStatus("online");
  }, [setStatus]);

  const setBusy = useCallback((): boolean => {
    return setStatus("busy");
  }, [setStatus]);

  const setAway = useCallback((): boolean => {
    return setStatus("away");
  }, [setStatus]);

  const setDND = useCallback(
    (message?: string): boolean => {
      return setStatus("dnd", message);
    },
    [setStatus],
  );

  const setOffline = useCallback((): boolean => {
    return setStatus("offline");
  }, [setStatus]);

  const updateActivity = useCallback(() => {
    if (!user || !managerRef.current) return;
    managerRef.current.updateActivity(user.id);
  }, [user]);

  const startCall = useCallback(
    (newCallId: string): boolean => {
      if (!user || !managerRef.current) return false;
      return managerRef.current.startCall(user.id, newCallId);
    },
    [user],
  );

  const endCall = useCallback((): boolean => {
    if (!user || !managerRef.current) return false;
    return managerRef.current.endCall(user.id);
  }, [user]);

  const setCallWaiting = useCallback(
    (enabled: boolean): boolean => {
      if (!user || !managerRef.current) return false;
      return managerRef.current.setCallWaiting(user.id, enabled);
    },
    [user],
  );

  // Other users
  const getUserStatus = useCallback(
    (userId: string): UserCallStatus | undefined => {
      return managerRef.current?.getStatus(userId);
    },
    [],
  );

  const isUserAvailable = useCallback((userId: string): boolean => {
    return managerRef.current?.isAvailable(userId) || false;
  }, []);

  const isUserBusy = useCallback((userId: string): boolean => {
    return managerRef.current?.isBusy(userId) || false;
  }, []);

  const getUnavailabilityReason = useCallback(
    (userId: string): string | null => {
      return managerRef.current?.getUnavailabilityReason(userId) || null;
    },
    [],
  );

  const getStatusDisplay = useCallback((userId: string): string => {
    return managerRef.current?.getStatusDisplay(userId) || "Unknown";
  }, []);

  // All users
  const allStatuses = managerRef.current?.getAllStatuses() || [];
  const onlineUsers = managerRef.current?.getUsersByStatus("online") || [];
  const busyUsers = managerRef.current?.getBusyUsers() || [];
  const availableUsers = managerRef.current?.getAvailableUsers() || [];

  // Statistics
  const stats = managerRef.current?.getStats() || {
    total: 0,
    online: 0,
    busy: 0,
    away: 0,
    dnd: 0,
    offline: 0,
    inCall: 0,
  };

  return {
    // Current user status
    myStatus,
    status,
    customMessage,
    inCall,
    callId,

    // Status checks
    isOnline,
    isBusy,
    isAway,
    isDND,
    isOffline,
    isAvailable,

    // Actions
    setStatus,
    setOnline,
    setBusy,
    setAway,
    setDND,
    setOffline,
    updateActivity,
    startCall,
    endCall,
    setCallWaiting,

    // Other users
    getUserStatus,
    isUserAvailable,
    isUserBusy,
    getUnavailabilityReason,
    getStatusDisplay,

    // All users
    allStatuses,
    onlineUsers,
    busyUsers,
    availableUsers,

    // Statistics
    stats,
  };
}
