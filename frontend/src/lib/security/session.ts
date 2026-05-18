/**
 * Session Timeout and Lock Management
 *
 * Manages session timeout, activity tracking, and lock state
 */

import { loadPinSettings } from "./pin";

import { logger } from "@/lib/logger";

// ============================================================================
// Constants
// ============================================================================

const LAST_ACTIVITY_KEY = "nself_chat_last_activity";
const LOCK_STATE_KEY = "nself_chat_lock_state";
const SESSION_VISIBLE_KEY = "nself_chat_session_visible";

// ============================================================================
// Types
// ============================================================================

export interface LockState {
  isLocked: boolean;
  lockedAt: string | null;
  lockReason:
    | "timeout"
    | "manual"
    | "close"
    | "background"
    | "failed_attempts"
    | null;
}

export interface SessionActivity {
  lastActivityTime: number;
  lastVisibleTime: number;
  isVisible: boolean;
}

// ============================================================================
// Activity Tracking
// ============================================================================

/**
 * Update last activity timestamp
 */
export function updateLastActivity(): void {
  try {
    const now = Date.now();
    localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());

    // Also update visibility time if visible
    const isVisible = getVisibilityState();
    if (isVisible) {
      localStorage.setItem(SESSION_VISIBLE_KEY, now.toString());
    }
  } catch (error) {
    logger.error("Failed to update last activity:", error);
  }
}

/**
 * Get last activity timestamp
 */
export function getLastActivityTime(): number {
  try {
    const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
    return stored ? parseInt(stored, 10) : Date.now();
  } catch {
    return Date.now();
  }
}

/**
 * Get time since last activity (in milliseconds)
 */
export function getTimeSinceLastActivity(): number {
  return Date.now() - getLastActivityTime();
}

/**
 * Get time since last activity (in minutes)
 */
export function getMinutesSinceLastActivity(): number {
  return Math.floor(getTimeSinceLastActivity() / (60 * 1000));
}

// ============================================================================
// Visibility Tracking
// ============================================================================

/**
 * Get current visibility state
 */
export function getVisibilityState(): boolean {
  if (typeof document === "undefined") return true;
  return !document.hidden;
}

/**
 * Setup visibility change listener
 */
export function setupVisibilityListener(
  onVisible: () => void,
  onHidden: () => void,
): () => void {
  if (typeof document === "undefined") return () => {};

  const handleVisibilityChange = () => {
    if (document.hidden) {
      onHidden();
    } else {
      onVisible();
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}

// ============================================================================
// Timeout Checking
// ============================================================================

/**
 * Check if session has timed out based on PIN settings
 */
export function checkSessionTimeout(): {
  hasTimedOut: boolean;
  minutesSinceActivity: number;
  timeoutMinutes: number;
} {
  const pinSettings = loadPinSettings();

  // No timeout if no PIN configured or timeout disabled
  if (!pinSettings || pinSettings.lockTimeoutMinutes === 0) {
    return {
      hasTimedOut: false,
      minutesSinceActivity: 0,
      timeoutMinutes: 0,
    };
  }

  const minutesSinceActivity = getMinutesSinceLastActivity();
  const hasTimedOut = minutesSinceActivity >= pinSettings.lockTimeoutMinutes;

  return {
    hasTimedOut,
    minutesSinceActivity,
    timeoutMinutes: pinSettings.lockTimeoutMinutes,
  };
}

/**
 * Should lock on visibility change (app goes to background)
 */
export function shouldLockOnBackground(): boolean {
  const pinSettings = loadPinSettings();
  return pinSettings?.lockOnBackground ?? false;
}

/**
 * Should lock on app close/unload
 */
export function shouldLockOnClose(): boolean {
  const pinSettings = loadPinSettings();
  return pinSettings?.lockOnClose ?? false;
}

// ============================================================================
// Lock State Management
// ============================================================================

/**
 * Get current lock state
 */
export function getLockState(): LockState {
  try {
    const stored = localStorage.getItem(LOCK_STATE_KEY);
    if (!stored) {
      return { isLocked: false, lockedAt: null, lockReason: null };
    }

    return JSON.parse(stored) as LockState;
  } catch {
    return { isLocked: false, lockedAt: null, lockReason: null };
  }
}

/**
 * Lock the session
 */
export function lockSession(
  reason:
    | "timeout"
    | "manual"
    | "close"
    | "background"
    | "failed_attempts" = "manual",
): void {
  try {
    const lockState: LockState = {
      isLocked: true,
      lockedAt: new Date().toISOString(),
      lockReason: reason,
    };

    localStorage.setItem(LOCK_STATE_KEY, JSON.stringify(lockState));
  } catch (error) {
    logger.error("Failed to lock session:", error);
  }
}

/**
 * Unlock the session
 */
export function unlockSession(): void {
  try {
    const lockState: LockState = {
      isLocked: false,
      lockedAt: null,
      lockReason: null,
    };

    localStorage.setItem(LOCK_STATE_KEY, JSON.stringify(lockState));
    updateLastActivity();
  } catch (error) {
    logger.error("Failed to unlock session:", error);
  }
}

/**
 * Check if session is currently locked
 */
export function isSessionLocked(): boolean {
  return getLockState().isLocked;
}

/**
 * Clear lock state (used when disabling PIN)
 */
export function clearLockState(): void {
  try {
    localStorage.removeItem(LOCK_STATE_KEY);
  } catch (error) {
    logger.error("Failed to clear lock state:", error);
  }
}

// ============================================================================
// Auto-Lock Logic
// ============================================================================

/**
 * Check if session should be locked and lock if necessary
 * Returns true if session was locked
 */
export function checkAndLockIfNeeded(): boolean {
  // Skip if already locked
  if (isSessionLocked()) {
    return true;
  }

  // Check timeout
  const { hasTimedOut } = checkSessionTimeout();
  if (hasTimedOut) {
    lockSession("timeout");
    return true;
  }

  return false;
}

/**
 * Setup auto-lock interval checker
 * Checks every minute if session should be locked
 */
export function setupAutoLockChecker(onLocked: () => void): () => void {
  // Initial check
  if (checkAndLockIfNeeded()) {
    onLocked();
  }

  // Check every minute
  const interval = setInterval(() => {
    if (checkAndLockIfNeeded()) {
      onLocked();
    }
  }, 60 * 1000); // Check every 60 seconds

  return () => clearInterval(interval);
}

/**
 * Setup activity listeners to track user interaction
 */
export function setupActivityListeners(): () => void {
  if (typeof window === "undefined") return () => {};

  const events = [
    "mousedown",
    "mousemove",
    "keypress",
    "scroll",
    "touchstart",
    "click",
  ];

  let activityTimeout: NodeJS.Timeout | null = null;

  const handleActivity = () => {
    // Debounce activity updates (max once per 30 seconds)
    if (activityTimeout) return;

    updateLastActivity();

    activityTimeout = setTimeout(() => {
      activityTimeout = null;
    }, 30 * 1000);
  };

  events.forEach((event) => {
    window.addEventListener(event, handleActivity, { passive: true });
  });

  return () => {
    events.forEach((event) => {
      window.removeEventListener(event, handleActivity);
    });
    if (activityTimeout) {
      clearTimeout(activityTimeout);
    }
  };
}

// ============================================================================
// App Lifecycle Hooks
// ============================================================================

/**
 * Handle app becoming visible (from background)
 */
export function handleAppVisible(): {
  shouldLock: boolean;
  reason: "timeout" | "background" | null;
} {
  // Check if already locked
  if (isSessionLocked()) {
    return { shouldLock: true, reason: null };
  }

  // Check for timeout
  const { hasTimedOut } = checkSessionTimeout();
  if (hasTimedOut) {
    lockSession("timeout");
    return { shouldLock: true, reason: "timeout" };
  }

  // Update activity
  updateLastActivity();

  return { shouldLock: false, reason: null };
}

/**
 * Handle app going to background (hidden)
 */
export function handleAppHidden(): void {
  // Lock if configured to lock on background
  if (shouldLockOnBackground()) {
    lockSession("background");
  }

  // Update last visible time
  updateLastActivity();
}

/**
 * Handle app close/unload
 */
export function handleAppClose(): void {
  // Lock if configured to lock on close
  if (shouldLockOnClose()) {
    lockSession("close");
  }
}

/**
 * Setup beforeunload listener to lock on close
 */
export function setupBeforeUnloadListener(): () => void {
  if (typeof window === "undefined") return () => {};

  const handleBeforeUnload = () => {
    handleAppClose();
  };

  window.addEventListener("beforeunload", handleBeforeUnload);

  return () => {
    window.removeEventListener("beforeunload", handleBeforeUnload);
  };
}

// ============================================================================
// Session Info
// ============================================================================

/**
 * Get session activity information
 */
export function getSessionActivity(): SessionActivity {
  return {
    lastActivityTime: getLastActivityTime(),
    lastVisibleTime: parseInt(
      localStorage.getItem(SESSION_VISIBLE_KEY) || "0",
      10,
    ),
    isVisible: getVisibilityState(),
  };
}

/**
 * Get human-readable time since last activity
 */
export function getFormattedTimeSinceActivity(): string {
  const minutes = getMinutesSinceLastActivity();

  if (minutes < 1) return "Just now";
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;

  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

// ============================================================================
// Development Utilities
// ============================================================================

/**
 * Force lock (for testing)
 */
export function forceLock(
  reason: NonNullable<LockState["lockReason"]> = "manual",
): void {
  lockSession(reason);
}

/**
 * Get debug info
 */
export function getSessionDebugInfo() {
  return {
    lockState: getLockState(),
    activity: getSessionActivity(),
    timeSinceActivity: getFormattedTimeSinceActivity(),
    timeout: checkSessionTimeout(),
    pinSettings: loadPinSettings(),
    shouldLockOnBackground: shouldLockOnBackground(),
    shouldLockOnClose: shouldLockOnClose(),
  };
}
