/**
 * usePinLock Hook
 *
 * React hook for managing PIN lock state and interactions
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  hasPinConfigured,
  loadPinSettings,
  verifyPin,
  recordLocalPinAttempt,
  checkLocalLockout,
  type PinSettings,
} from "@/lib/security/pin";
import { logger } from "@/lib/logger";
import {
  isSessionLocked,
  getLockState,
  lockSession,
  unlockSession,
  checkSessionTimeout,
  handleAppVisible,
  handleAppHidden,
  setupAutoLockChecker,
  setupActivityListeners,
  setupVisibilityListener,
  setupBeforeUnloadListener,
  type LockState,
} from "@/lib/security/session";

// ============================================================================
// Types
// ============================================================================

export interface UsePinLockReturn {
  // State
  isLocked: boolean;
  hasPinSetup: boolean;
  lockState: LockState | null;
  pinSettings: PinSettings | null;

  // Lock controls
  lock: (reason?: LockState["lockReason"]) => void;
  unlock: () => void;

  // PIN verification
  verifyAndUnlock: (pin: string) => Promise<{
    success: boolean;
    error?: string;
  }>;

  // Lockout info
  lockoutInfo: {
    isLocked: boolean;
    remainingMinutes: number;
    failedAttempts: number;
  };

  // Timeout info
  timeoutInfo: {
    hasTimedOut: boolean;
    minutesSinceActivity: number;
    timeoutMinutes: number;
  };
}

// ============================================================================
// Hook
// ============================================================================

export function usePinLock(): UsePinLockReturn {
  // State
  const [isLocked, setIsLocked] = useState(false);
  const [hasPinSetup, setHasPinSetup] = useState(false);
  const [lockState, setLockState] = useState<LockState | null>(null);
  const [pinSettings, setPinSettings] = useState<PinSettings | null>(null);
  const [lockoutInfo, setLockoutInfo] = useState({
    isLocked: false,
    remainingMinutes: 0,
    failedAttempts: 0,
  });
  const [timeoutInfo, setTimeoutInfo] = useState({
    hasTimedOut: false,
    minutesSinceActivity: 0,
    timeoutMinutes: 0,
  });

  // Initialize state
  useEffect(() => {
    const hasPin = hasPinConfigured();
    setHasPinSetup(hasPin);

    if (hasPin) {
      const settings = loadPinSettings();
      setPinSettings(settings);

      const locked = isSessionLocked();
      setIsLocked(locked);

      if (locked) {
        const state = getLockState();
        setLockState(state);
      }
    }
  }, []);

  // Update lockout info periodically
  useEffect(() => {
    function updateLockout() {
      const lockout = checkLocalLockout();
      setLockoutInfo(lockout);
    }

    updateLockout();
    const interval = setInterval(updateLockout, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Update timeout info periodically
  useEffect(() => {
    function updateTimeout() {
      const timeout = checkSessionTimeout();
      setTimeoutInfo(timeout);
    }

    updateTimeout();
    const interval = setInterval(updateTimeout, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Setup auto-lock checker
  useEffect(() => {
    if (!hasPinSetup) return;

    const cleanup = setupAutoLockChecker(() => {
      setIsLocked(true);
      const state = getLockState();
      setLockState(state);
    });

    return cleanup;
  }, [hasPinSetup]);

  // Setup activity listeners
  useEffect(() => {
    if (!hasPinSetup) return;

    const cleanup = setupActivityListeners();
    return cleanup;
  }, [hasPinSetup]);

  // Setup visibility listener
  useEffect(() => {
    if (!hasPinSetup) return;

    const cleanup = setupVisibilityListener(
      // On visible
      () => {
        const result = handleAppVisible();
        if (result.shouldLock) {
          setIsLocked(true);
          const state = getLockState();
          setLockState(state);
        }
      },
      // On hidden
      () => {
        handleAppHidden();
        // Check if locked immediately
        if (isSessionLocked()) {
          setIsLocked(true);
          const state = getLockState();
          setLockState(state);
        }
      },
    );

    return cleanup;
  }, [hasPinSetup]);

  // Setup beforeunload listener
  useEffect(() => {
    if (!hasPinSetup) return;

    const cleanup = setupBeforeUnloadListener();
    return cleanup;
  }, [hasPinSetup]);

  // Lock function
  const lock = useCallback((reason?: LockState["lockReason"]) => {
    lockSession(reason ?? "manual");
    setIsLocked(true);
    const state = getLockState();
    setLockState(state);
  }, []);

  // Unlock function
  const unlock = useCallback(() => {
    unlockSession();
    setIsLocked(false);
    setLockState(null);
  }, []);

  // Verify and unlock
  const verifyAndUnlock = useCallback(
    async (pin: string): Promise<{ success: boolean; error?: string }> => {
      try {
        // Check lockout
        const lockout = checkLocalLockout();
        if (lockout.isLocked) {
          return {
            success: false,
            error: `Too many failed attempts. Try again in ${lockout.remainingMinutes} minute${lockout.remainingMinutes !== 1 ? "s" : ""}.`,
          };
        }

        // Load settings
        const settings = loadPinSettings();
        if (!settings) {
          return { success: false, error: "PIN not configured" };
        }

        // Verify PIN
        const isValid = await verifyPin(
          pin,
          settings.pinHash,
          settings.pinSalt,
        );

        if (isValid) {
          // Record success
          recordLocalPinAttempt(true);

          // Unlock
          unlock();

          return { success: true };
        } else {
          // Record failure
          recordLocalPinAttempt(false, "incorrect_pin");

          // Update lockout info
          const newLockout = checkLocalLockout();
          setLockoutInfo(newLockout);

          if (newLockout.isLocked) {
            return {
              success: false,
              error: `Too many failed attempts. Try again in ${newLockout.remainingMinutes} minute${newLockout.remainingMinutes !== 1 ? "s" : ""}.`,
            };
          } else {
            const remaining = 5 - newLockout.failedAttempts;
            return {
              success: false,
              error: `Incorrect PIN. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`,
            };
          }
        }
      } catch (error) {
        logger.error("PIN verification error:", error);
        return { success: false, error: "An error occurred" };
      }
    },
    [unlock],
  );

  return {
    // State
    isLocked,
    hasPinSetup,
    lockState,
    pinSettings,

    // Controls
    lock,
    unlock,

    // Verification
    verifyAndUnlock,

    // Info
    lockoutInfo,
    timeoutInfo,
  };
}
