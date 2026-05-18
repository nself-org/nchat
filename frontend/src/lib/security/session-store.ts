/**
 * Session Store - Manages user sessions state for the nself-chat application
 *
 * Handles active sessions, current session, and session revocation
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// ============================================================================
// Types
// ============================================================================

export interface SessionLocation {
  city?: string;
  country?: string;
  region?: string;
  countryCode?: string;
}

export interface Session {
  id: string;
  userId: string;
  device: string;
  browser: string;
  os: string;
  ipAddress: string;
  location?: SessionLocation;
  isCurrent: boolean;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
}

export interface LoginAttempt {
  id: string;
  userId: string;
  success: boolean;
  ipAddress: string;
  device: string;
  browser: string;
  os: string;
  location?: SessionLocation;
  failureReason?: string;
  createdAt: string;
}

// ============================================================================
// State Interface
// ============================================================================

export interface SessionState {
  // Sessions
  sessions: Session[];
  currentSession: Session | null;
  isLoadingSessions: boolean;
  sessionsError: string | null;

  // Login history
  loginHistory: LoginAttempt[];
  loginHistoryTotal: number;
  loginHistoryPage: number;
  loginHistoryPerPage: number;
  isLoadingHistory: boolean;
  historyError: string | null;

  // Revocation state
  isRevoking: boolean;
  revokeError: string | null;
}

// ============================================================================
// Actions Interface
// ============================================================================

export interface SessionActions {
  // Session actions
  setSessions: (sessions: Session[]) => void;
  setCurrentSession: (session: Session | null) => void;
  addSession: (session: Session) => void;
  removeSession: (sessionId: string) => void;
  updateSession: (sessionId: string, updates: Partial<Session>) => void;
  setLoadingSessions: (loading: boolean) => void;
  setSessionsError: (error: string | null) => void;

  // Login history actions
  setLoginHistory: (history: LoginAttempt[], total: number) => void;
  addLoginAttempt: (attempt: LoginAttempt) => void;
  setLoginHistoryPage: (page: number) => void;
  setLoadingHistory: (loading: boolean) => void;
  setHistoryError: (error: string | null) => void;

  // Revocation actions
  setRevoking: (revoking: boolean) => void;
  setRevokeError: (error: string | null) => void;

  // Utility actions
  reset: () => void;
}

export type SessionStore = SessionState & SessionActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: SessionState = {
  sessions: [],
  currentSession: null,
  isLoadingSessions: false,
  sessionsError: null,

  loginHistory: [],
  loginHistoryTotal: 0,
  loginHistoryPage: 1,
  loginHistoryPerPage: 10,
  isLoadingHistory: false,
  historyError: null,

  isRevoking: false,
  revokeError: null,
};

// ============================================================================
// Store
// ============================================================================

export const useSessionStore = create<SessionStore>()(
  devtools(
    immer((set) => ({
      ...initialState,

      // Session actions
      setSessions: (sessions) =>
        set(
          (state) => {
            state.sessions = sessions;
            // Find and set current session
            const current = sessions.find((s) => s.isCurrent);
            if (current) {
              state.currentSession = current;
            }
          },
          false,
          "session/setSessions",
        ),

      setCurrentSession: (session) =>
        set(
          (state) => {
            state.currentSession = session;
          },
          false,
          "session/setCurrentSession",
        ),

      addSession: (session) =>
        set(
          (state) => {
            state.sessions.unshift(session);
            if (session.isCurrent) {
              state.currentSession = session;
            }
          },
          false,
          "session/addSession",
        ),

      removeSession: (sessionId) =>
        set(
          (state) => {
            state.sessions = state.sessions.filter((s) => s.id !== sessionId);
            if (state.currentSession?.id === sessionId) {
              state.currentSession = null;
            }
          },
          false,
          "session/removeSession",
        ),

      updateSession: (sessionId, updates) =>
        set(
          (state) => {
            const index = state.sessions.findIndex((s) => s.id === sessionId);
            if (index !== -1) {
              state.sessions[index] = { ...state.sessions[index], ...updates };
            }
            if (state.currentSession?.id === sessionId) {
              state.currentSession = { ...state.currentSession, ...updates };
            }
          },
          false,
          "session/updateSession",
        ),

      setLoadingSessions: (loading) =>
        set(
          (state) => {
            state.isLoadingSessions = loading;
          },
          false,
          "session/setLoadingSessions",
        ),

      setSessionsError: (error) =>
        set(
          (state) => {
            state.sessionsError = error;
          },
          false,
          "session/setSessionsError",
        ),

      // Login history actions
      setLoginHistory: (history, total) =>
        set(
          (state) => {
            state.loginHistory = history;
            state.loginHistoryTotal = total;
          },
          false,
          "session/setLoginHistory",
        ),

      addLoginAttempt: (attempt) =>
        set(
          (state) => {
            state.loginHistory = [attempt, ...state.loginHistory].slice(0, 100);
            state.loginHistoryTotal += 1;
          },
          false,
          "session/addLoginAttempt",
        ),

      setLoginHistoryPage: (page) =>
        set(
          (state) => {
            state.loginHistoryPage = page;
          },
          false,
          "session/setLoginHistoryPage",
        ),

      setLoadingHistory: (loading) =>
        set(
          (state) => {
            state.isLoadingHistory = loading;
          },
          false,
          "session/setLoadingHistory",
        ),

      setHistoryError: (error) =>
        set(
          (state) => {
            state.historyError = error;
          },
          false,
          "session/setHistoryError",
        ),

      // Revocation actions
      setRevoking: (revoking) =>
        set(
          (state) => {
            state.isRevoking = revoking;
          },
          false,
          "session/setRevoking",
        ),

      setRevokeError: (error) =>
        set(
          (state) => {
            state.revokeError = error;
          },
          false,
          "session/setRevokeError",
        ),

      // Utility actions
      reset: () => set(() => initialState, false, "session/reset"),
    })),
    { name: "session-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectSessions = (state: SessionStore) => state.sessions;
export const selectCurrentSession = (state: SessionStore) =>
  state.currentSession;
export const selectOtherSessions = (state: SessionStore) =>
  state.sessions.filter((s) => !s.isCurrent);
export const selectLoginHistory = (state: SessionStore) => state.loginHistory;
export const selectRecentFailedAttempts = (state: SessionStore) =>
  state.loginHistory.filter((a) => !a.success).slice(0, 5);

export const selectSessionsPagination = (state: SessionStore) => ({
  page: state.loginHistoryPage,
  perPage: state.loginHistoryPerPage,
  total: state.loginHistoryTotal,
  totalPages: Math.ceil(state.loginHistoryTotal / state.loginHistoryPerPage),
});

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse user agent string to extract device info
 */
export function parseUserAgent(userAgent: string): {
  device: string;
  browser: string;
  os: string;
} {
  // Browser detection
  let browser = "Unknown";
  if (userAgent.includes("Firefox")) {
    browser = "Firefox";
  } else if (userAgent.includes("Edg")) {
    browser = "Edge";
  } else if (userAgent.includes("Chrome")) {
    browser = "Chrome";
  } else if (userAgent.includes("Safari")) {
    browser = "Safari";
  } else if (userAgent.includes("Opera") || userAgent.includes("OPR")) {
    browser = "Opera";
  }

  // OS detection
  let os = "Unknown";
  if (userAgent.includes("Windows")) {
    os = "Windows";
  } else if (userAgent.includes("Mac OS")) {
    os = "macOS";
  } else if (userAgent.includes("Linux")) {
    os = "Linux";
  } else if (userAgent.includes("Android")) {
    os = "Android";
  } else if (
    userAgent.includes("iOS") ||
    userAgent.includes("iPhone") ||
    userAgent.includes("iPad")
  ) {
    os = "iOS";
  }

  // Device detection
  let device = "Desktop";
  if (userAgent.includes("Mobile") || userAgent.includes("Android")) {
    device = "Mobile";
  } else if (userAgent.includes("Tablet") || userAgent.includes("iPad")) {
    device = "Tablet";
  }

  return { device, browser, os };
}

/**
 * Format location for display
 */
export function formatLocation(location?: SessionLocation): string {
  if (!location) return "Unknown location";

  const parts: string[] = [];
  if (location.city) parts.push(location.city);
  if (location.region) parts.push(location.region);
  if (location.country) parts.push(location.country);

  return parts.length > 0 ? parts.join(", ") : "Unknown location";
}

/**
 * Format relative time for session activity
 */
export function formatSessionTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60)
    return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24)
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;

  return date.toLocaleDateString();
}

/**
 * Get device icon name based on device type
 */
export function getDeviceIcon(device: string): string {
  switch (device.toLowerCase()) {
    case "mobile":
      return "smartphone";
    case "tablet":
      return "tablet";
    default:
      return "monitor";
  }
}

/**
 * Get browser icon name
 */
export function getBrowserIcon(browser: string): string {
  switch (browser.toLowerCase()) {
    case "chrome":
      return "chrome";
    case "firefox":
      return "firefox";
    case "safari":
      return "safari";
    case "edge":
      return "edge";
    default:
      return "globe";
  }
}
