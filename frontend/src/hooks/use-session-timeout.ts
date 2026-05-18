/**
 * useSessionTimeout Hook
 *
 * React hook for monitoring session timeouts and auto-locking
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  checkSessionTimeout,
  getLastActivityTime,
  updateLastActivity,
  getMinutesSinceLastActivity,
  getFormattedTimeSinceActivity,
  setupActivityListeners,
  setupVisibilityListener,
  handleAppVisible,
  handleAppHidden,
} from "@/lib/security/session";
import { hasPinConfigured } from "@/lib/security/pin";

// ============================================================================
// Types
// ============================================================================

export interface UseSessionTimeoutOptions {
  onTimeout?: () => void;
  checkInterval?: number; // milliseconds
}

export interface UseSessionTimeoutReturn {
  // Timeout state
  hasTimedOut: boolean;
  minutesSinceActivity: number;
  timeoutMinutes: number;
  formattedTimeSinceActivity: string;

  // Activity management
  updateActivity: () => void;
  getActivityTime: () => number;
  getMinutesSinceActivity: () => number;

  // Timeout check
  checkTimeout: () => {
    hasTimedOut: boolean;
    minutesSinceActivity: number;
    timeoutMinutes: number;
  };
}

// ============================================================================
// Hook
// ============================================================================

export function useSessionTimeout(
  options: UseSessionTimeoutOptions = {},
): UseSessionTimeoutReturn {
  const { onTimeout, checkInterval = 30000 } = options;

  // State
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [minutesSinceActivity, setMinutesSinceActivity] = useState(0);
  const [timeoutMinutes, setTimeoutMinutes] = useState(0);
  const [formattedTime, setFormattedTime] = useState("");

  // Check if PIN is configured
  const [isPinConfigured, setIsPinConfigured] = useState(false);

  useEffect(() => {
    setIsPinConfigured(hasPinConfigured());
  }, []);

  // Check timeout
  const checkTimeout = useCallback(() => {
    const result = checkSessionTimeout();

    setHasTimedOut(result.hasTimedOut);
    setMinutesSinceActivity(result.minutesSinceActivity);
    setTimeoutMinutes(result.timeoutMinutes);
    setFormattedTime(getFormattedTimeSinceActivity());

    if (result.hasTimedOut && onTimeout) {
      onTimeout();
    }

    return result;
  }, [onTimeout]);

  // Periodic timeout check
  useEffect(() => {
    if (!isPinConfigured) return;

    // Initial check
    checkTimeout();

    // Setup interval
    const interval = setInterval(checkTimeout, checkInterval);

    return () => clearInterval(interval);
  }, [isPinConfigured, checkTimeout, checkInterval]);

  // Setup activity listeners
  useEffect(() => {
    if (!isPinConfigured) return;

    const cleanup = setupActivityListeners();
    return cleanup;
  }, [isPinConfigured]);

  // Setup visibility listener
  useEffect(() => {
    if (!isPinConfigured) return;

    const cleanup = setupVisibilityListener(
      // On visible
      () => {
        const result = handleAppVisible();
        if (result.shouldLock && onTimeout) {
          onTimeout();
        }
        checkTimeout();
      },
      // On hidden
      () => {
        handleAppHidden();
      },
    );

    return cleanup;
  }, [isPinConfigured, onTimeout, checkTimeout]);

  // Update formatted time periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setFormattedTime(getFormattedTimeSinceActivity());
      setMinutesSinceActivity(getMinutesSinceLastActivity());
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Getter for minutes since activity
  const getMinutesSinceActivity = useCallback(() => {
    return minutesSinceActivity;
  }, [minutesSinceActivity]);

  return {
    // Timeout state
    hasTimedOut,
    minutesSinceActivity,
    timeoutMinutes,
    formattedTimeSinceActivity: formattedTime,

    // Activity management
    updateActivity: updateLastActivity,
    getActivityTime: getLastActivityTime,
    getMinutesSinceActivity,

    // Timeout check
    checkTimeout,
  };
}

// ============================================================================
// Simplified Hook for Display Only
// ============================================================================

/**
 * Simplified hook for just displaying session activity
 * (without auto-lock functionality)
 */
export function useSessionActivity() {
  const [formattedTime, setFormattedTime] = useState("");
  const [minutesSinceActivity, setMinutesSinceActivity] = useState(0);

  useEffect(() => {
    function updateDisplay() {
      setFormattedTime(getFormattedTimeSinceActivity());
      setMinutesSinceActivity(getMinutesSinceLastActivity());
    }

    // Initial update
    updateDisplay();

    // Update every 10 seconds
    const interval = setInterval(updateDisplay, 10000);

    return () => clearInterval(interval);
  }, []);

  return {
    formattedTimeSinceActivity: formattedTime,
    minutesSinceActivity,
    lastActivityTime: getLastActivityTime(),
  };
}
