/**
 * useSessions Hook - React hook for session management
 *
 * Provides session operations, notifications, and real-time updates
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useSecurity } from "@/lib/security/use-security";
import {
  sessionManager,
  type SessionNotification,
  type SuspiciousActivityResult,
} from "@/lib/auth/session-manager";
import type { Session } from "@/lib/security/session-store";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface UseSessionsResult {
  // Sessions
  sessions: Session[];
  currentSession: Session | null;
  otherSessions: Session[];
  loading: boolean;
  error: string | null;

  // Actions
  refreshSessions: () => Promise<void>;
  revokeSession: (sessionId: string) => Promise<boolean>;
  revokeAllOtherSessions: () => Promise<boolean>;
  updateSessionActivity: () => Promise<void>;

  // Notifications
  notifications: SessionNotification[];
  unreadCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;

  // Analytics
  suspiciousActivityScore: number | null;
  hasGeoAnomaly: boolean;
  requiresVerification: boolean;
}

interface NotificationWithId extends SessionNotification {
  id: string;
  read: boolean;
}

// ============================================================================
// Hook
// ============================================================================

export function useSessions(): UseSessionsResult {
  const { user, isDevMode } = useAuth();
  const {
    sessions: rawSessions,
    currentSession,
    loadingSessions,
    revokeSession: securityRevokeSession,
    revokeAllOtherSessions: securityRevokeAllOthers,
    revokeError,
    refetchSessions,
  } = useSecurity();

  // Local state
  const [notifications, setNotifications] = useState<NotificationWithId[]>([]);
  const [suspiciousActivityScore, setSuspiciousActivityScore] = useState<
    number | null
  >(null);
  const [hasGeoAnomaly, setHasGeoAnomaly] = useState(false);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [lastActivityUpdate, setLastActivityUpdate] = useState<number>(
    Date.now(),
  );

  // Filter valid sessions
  const sessions = rawSessions.filter((session: Session) => {
    const validation = sessionManager.validateSession(session);
    return validation.valid;
  });

  const otherSessions = sessions.filter((s: Session) => !s.isCurrent);

  // ============================================================================
  // Session Activity Tracking
  // ============================================================================

  /**
   * Update current session activity timestamp
   */
  const updateSessionActivity = useCallback(async () => {
    if (!currentSession || !user?.id) return;

    try {
      await fetch("/api/auth/sessions/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: currentSession.id,
          userId: user.id,
        }),
      });
      setLastActivityUpdate(Date.now());
    } catch (error) {
      logger.error("Failed to update session activity:", error);
    }
  }, [currentSession, user?.id]);

  /**
   * Auto-update activity on user interaction
   */
  useEffect(() => {
    if (!currentSession || isDevMode) return;

    // Update activity every 5 minutes
    const interval = setInterval(
      () => {
        updateSessionActivity();
      },
      5 * 60 * 1000,
    );

    // Update on user interaction (throttled)
    let lastInteraction = Date.now();
    const handleInteraction = () => {
      const now = Date.now();
      if (now - lastInteraction > 60 * 1000) {
        // Throttle to 1 update per minute
        updateSessionActivity();
        lastInteraction = now;
      }
    };

    window.addEventListener("click", handleInteraction);
    window.addEventListener("keydown", handleInteraction);
    window.addEventListener("scroll", handleInteraction);

    return () => {
      clearInterval(interval);
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
      window.removeEventListener("scroll", handleInteraction);
    };
  }, [currentSession, isDevMode, updateSessionActivity]);

  // ============================================================================
  // Session Validation
  // ============================================================================

  /**
   * Auto-logout on session expiry
   */
  useEffect(() => {
    if (!currentSession || isDevMode) return;

    const checkSessionValidity = () => {
      const validation = sessionManager.validateSession(currentSession);
      if (!validation.valid) {
        logger.warn("Session invalid:", { context: validation.reason });
        // Could trigger logout here
        // signOut()
      }
    };

    // Check every minute
    const interval = setInterval(checkSessionValidity, 60 * 1000);

    return () => clearInterval(interval);
  }, [currentSession, isDevMode]);

  // ============================================================================
  // Security Analysis
  // ============================================================================

  /**
   * Analyze sessions for suspicious activity
   */
  useEffect(() => {
    if (!currentSession || sessions.length === 0) return;

    // Detect suspicious activity
    const previousSessions = sessions.filter(
      (s: Session) =>
        s.id !== currentSession.id &&
        new Date(s.createdAt) < new Date(currentSession.createdAt),
    );

    const suspiciousAnalysis = sessionManager.detectSuspiciousActivity(
      currentSession,
      previousSessions,
    );

    setSuspiciousActivityScore(suspiciousAnalysis.score);

    // Create notification for suspicious activity
    if (suspiciousAnalysis.suspicious) {
      const notification = sessionManager.createSuspiciousActivityNotification(
        currentSession,
        suspiciousAnalysis,
      );
      addNotification(notification);
      setRequiresVerification(suspiciousAnalysis.severity === "critical");
    }

    // Detect geo anomaly
    const geoAnomaly = sessionManager.detectGeoAnomaly(
      currentSession,
      previousSessions,
    );
    setHasGeoAnomaly(geoAnomaly);

    if (geoAnomaly && previousSessions[0]?.location) {
      const previousLocation = `${previousSessions[0].location.city}, ${previousSessions[0].location.country}`;
      const notification = sessionManager.createGeoAnomalyNotification(
        currentSession,
        previousLocation,
      );
      addNotification(notification);
    }
  }, [currentSession, sessions]);

  // ============================================================================
  // New Session Detection
  // ============================================================================

  /**
   * Detect and notify about new sessions
   */
  useEffect(() => {
    if (sessions.length === 0) return;

    const recentSessions = sessions.filter((session: Session) => {
      const age = Date.now() - new Date(session.createdAt).getTime();
      return age < 5 * 60 * 1000 && !session.isCurrent; // last 5 minutes, not current
    });

    recentSessions.forEach((session: Session) => {
      // Check if it's a new device
      const olderSessions = sessions.filter(
        (s: Session) => new Date(s.createdAt) < new Date(session.createdAt),
      );
      const knownDevices = new Set(
        olderSessions.map((s: Session) => `${s.device}-${s.browser}-${s.os}`),
      );
      const isNewDevice = !knownDevices.has(
        `${session.device}-${session.browser}-${session.os}`,
      );

      if (isNewDevice) {
        const notification =
          sessionManager.createNewDeviceNotification(session);
        addNotification(notification);
      } else {
        const notification = sessionManager.createNewLoginNotification(session);
        addNotification(notification);
      }
    });
  }, [sessions]);

  // ============================================================================
  // Session Actions
  // ============================================================================

  /**
   * Refresh sessions from server
   */
  const refreshSessions = useCallback(async () => {
    try {
      await refetchSessions();
    } catch (error) {
      logger.error("Failed to refresh sessions:", error);
    }
  }, [refetchSessions]);

  /**
   * Revoke a specific session
   */
  const revokeSession = useCallback(
    async (sessionId: string): Promise<boolean> => {
      try {
        const result = await securityRevokeSession(sessionId);
        if (result.success) {
          // Create notification
          const session = sessions.find((s: Session) => s.id === sessionId);
          if (session) {
            addNotification({
              id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              read: false,
              type: "session-revoked",
              severity: "info",
              title: "Session Revoked",
              message: `Session from ${session.browser} on ${session.os} has been revoked`,
              session,
              timestamp: new Date().toISOString(),
            });
          }
          return true;
        }
        return false;
      } catch (error) {
        logger.error("Failed to revoke session:", error);
        return false;
      }
    },
    [securityRevokeSession, sessions],
  );

  /**
   * Revoke all other sessions
   */
  const revokeAllOtherSessions = useCallback(async (): Promise<boolean> => {
    try {
      const result = await securityRevokeAllOthers();
      if (result.success) {
        addNotification({
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          read: false,
          type: "session-revoked",
          severity: "info",
          title: "All Sessions Revoked",
          message: `${otherSessions.length} session(s) have been revoked`,
          session: {} as Partial<Session>,
          timestamp: new Date().toISOString(),
        });
        return true;
      }
      return false;
    } catch (error) {
      logger.error("Failed to revoke sessions:", error);
      return false;
    }
  }, [securityRevokeAllOthers, otherSessions.length]);

  // ============================================================================
  // Notification Management
  // ============================================================================

  /**
   * Add a new notification
   */
  const addNotification = useCallback((notification: SessionNotification) => {
    const notificationWithId: NotificationWithId = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      read: false,
    };

    setNotifications((prev) => {
      // Avoid duplicates
      const isDuplicate = prev.some(
        (n) =>
          n.type === notificationWithId.type &&
          n.session.id === notificationWithId.session.id &&
          Date.now() - new Date(n.timestamp).getTime() < 60 * 1000, // within last minute
      );

      if (isDuplicate) return prev;

      return [notificationWithId, ...prev].slice(0, 50); // Keep last 50
    });
  }, []);

  /**
   * Mark notification as read
   */
  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  /**
   * Mark all notifications as read
   */
  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  /**
   * Clear all notifications
   */
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Count unread notifications
  const unreadCount = notifications.filter((n) => !n.read).length;

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // Sessions
    sessions,
    currentSession: currentSession || null,
    otherSessions,
    loading: loadingSessions,
    error: revokeError,

    // Actions
    refreshSessions,
    revokeSession,
    revokeAllOtherSessions,
    updateSessionActivity,

    // Notifications
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,

    // Analytics
    suspiciousActivityScore,
    hasGeoAnomaly,
    requiresVerification,
  };
}
