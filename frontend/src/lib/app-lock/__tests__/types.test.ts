/**
 * App Lock Types Tests
 *
 * Tests for type definitions and default values.
 */

import {
  DEFAULT_IDLE_TIMEOUT_CONFIG,
  DEFAULT_LOCK_ON_LAUNCH_CONFIG,
  DEFAULT_DAILY_BIOMETRIC_CONFIG,
  DEFAULT_LOCK_SETTINGS,
  DEFAULT_LOCK_STATE_INFO,
  DEFAULT_BIOMETRIC_INFO,
  STORAGE_KEYS,
  SECURE_STORAGE_SERVICE,
  type LockPolicyMode,
  type LockState,
  type AuthMethod,
  type BiometricType,
  type Platform,
  type IdleResetEvent,
  type LockErrorCode,
  type LockEventType,
} from "../types";

describe("App Lock Types", () => {
  describe("Default Values", () => {
    describe("DEFAULT_IDLE_TIMEOUT_CONFIG", () => {
      it("should have enabled set to false by default", () => {
        expect(DEFAULT_IDLE_TIMEOUT_CONFIG.enabled).toBe(false);
      });

      it("should have a reasonable timeout in minutes", () => {
        expect(DEFAULT_IDLE_TIMEOUT_CONFIG.timeoutMinutes).toBe(5);
        expect(
          DEFAULT_IDLE_TIMEOUT_CONFIG.timeoutMinutes,
        ).toBeGreaterThanOrEqual(1);
        expect(DEFAULT_IDLE_TIMEOUT_CONFIG.timeoutMinutes).toBeLessThanOrEqual(
          60,
        );
      });

      it("should have warning seconds less than timeout", () => {
        const warningMinutes = DEFAULT_IDLE_TIMEOUT_CONFIG.warningSeconds / 60;
        expect(warningMinutes).toBeLessThan(
          DEFAULT_IDLE_TIMEOUT_CONFIG.timeoutMinutes,
        );
      });

      it("should have standard reset events", () => {
        expect(DEFAULT_IDLE_TIMEOUT_CONFIG.resetEvents).toContain("keypress");
        expect(DEFAULT_IDLE_TIMEOUT_CONFIG.resetEvents).toContain("mousemove");
        expect(DEFAULT_IDLE_TIMEOUT_CONFIG.resetEvents).toContain("touchstart");
      });
    });

    describe("DEFAULT_LOCK_ON_LAUNCH_CONFIG", () => {
      it("should have enabled set to true by default", () => {
        expect(DEFAULT_LOCK_ON_LAUNCH_CONFIG.enabled).toBe(true);
      });

      it("should have a reasonable background threshold", () => {
        expect(DEFAULT_LOCK_ON_LAUNCH_CONFIG.backgroundThresholdSeconds).toBe(
          60,
        );
        expect(
          DEFAULT_LOCK_ON_LAUNCH_CONFIG.backgroundThresholdSeconds,
        ).toBeGreaterThanOrEqual(0);
      });
    });

    describe("DEFAULT_DAILY_BIOMETRIC_CONFIG", () => {
      it("should start with verifiedToday as false", () => {
        expect(DEFAULT_DAILY_BIOMETRIC_CONFIG.verifiedToday).toBe(false);
      });

      it("should have lastVerifiedDate as null", () => {
        expect(DEFAULT_DAILY_BIOMETRIC_CONFIG.lastVerifiedDate).toBeNull();
      });

      it("should have a valid reset hour", () => {
        expect(DEFAULT_DAILY_BIOMETRIC_CONFIG.resetHour).toBeGreaterThanOrEqual(
          0,
        );
        expect(DEFAULT_DAILY_BIOMETRIC_CONFIG.resetHour).toBeLessThanOrEqual(
          23,
        );
      });
    });

    describe("DEFAULT_LOCK_SETTINGS", () => {
      it("should have mode set to none by default", () => {
        expect(DEFAULT_LOCK_SETTINGS.mode).toBe("none");
      });

      it("should have valid PIN settings", () => {
        expect(DEFAULT_LOCK_SETTINGS.pinLength).toBeGreaterThanOrEqual(4);
        expect(DEFAULT_LOCK_SETTINGS.pinLength).toBeLessThanOrEqual(8);
        expect(DEFAULT_LOCK_SETTINGS.maxPinAttempts).toBeGreaterThanOrEqual(3);
        expect(DEFAULT_LOCK_SETTINGS.lockoutMinutes).toBeGreaterThanOrEqual(1);
      });

      it("should include all nested configs", () => {
        expect(DEFAULT_LOCK_SETTINGS.idleTimeout).toBeDefined();
        expect(DEFAULT_LOCK_SETTINGS.lockOnLaunch).toBeDefined();
        expect(DEFAULT_LOCK_SETTINGS.dailyBiometric).toBeDefined();
      });

      it("should have a valid updatedAt timestamp", () => {
        const date = new Date(DEFAULT_LOCK_SETTINGS.updatedAt);
        expect(date.getTime()).not.toBeNaN();
      });
    });

    describe("DEFAULT_LOCK_STATE_INFO", () => {
      it("should have state set to uninitialized", () => {
        expect(DEFAULT_LOCK_STATE_INFO.state).toBe("uninitialized");
      });

      it("should have null timestamps", () => {
        expect(DEFAULT_LOCK_STATE_INFO.lockedAt).toBeNull();
        expect(DEFAULT_LOCK_STATE_INFO.unlockedAt).toBeNull();
      });

      it("should have no failed attempts", () => {
        expect(DEFAULT_LOCK_STATE_INFO.failedAttempts).toBe(0);
      });

      it("should not be locked out", () => {
        expect(DEFAULT_LOCK_STATE_INFO.isLockedOut).toBe(false);
        expect(DEFAULT_LOCK_STATE_INFO.lockoutEndTime).toBeNull();
      });
    });

    describe("DEFAULT_BIOMETRIC_INFO", () => {
      it("should have available as false", () => {
        expect(DEFAULT_BIOMETRIC_INFO.available).toBe(false);
      });

      it("should have type as none", () => {
        expect(DEFAULT_BIOMETRIC_INFO.type).toBe("none");
      });

      it("should have enrolled as false", () => {
        expect(DEFAULT_BIOMETRIC_INFO.enrolled).toBe(false);
      });

      it("should have a display name", () => {
        expect(DEFAULT_BIOMETRIC_INFO.displayName).toBeTruthy();
      });
    });
  });

  describe("Storage Keys", () => {
    it("should have unique storage keys", () => {
      const keys = Object.values(STORAGE_KEYS);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });

    it("should have nchat prefix for all keys", () => {
      Object.values(STORAGE_KEYS).forEach((key) => {
        expect(key).toMatch(/^nchat_/);
      });
    });

    it("should have all required keys", () => {
      expect(STORAGE_KEYS.SETTINGS).toBeDefined();
      expect(STORAGE_KEYS.PIN_HASH).toBeDefined();
      expect(STORAGE_KEYS.LOCK_STATE).toBeDefined();
      expect(STORAGE_KEYS.DAILY_BIOMETRIC).toBeDefined();
    });
  });

  describe("Secure Storage Service", () => {
    it("should be a valid service identifier", () => {
      expect(SECURE_STORAGE_SERVICE).toMatch(/^com\./);
      expect(SECURE_STORAGE_SERVICE).toContain("nchat");
    });
  });

  describe("Type Validation", () => {
    it("should allow all valid LockPolicyMode values", () => {
      const modes: LockPolicyMode[] = [
        "none",
        "pin",
        "biometric",
        "pin_or_biometric",
        "pin_and_biometric",
      ];
      expect(modes).toHaveLength(5);
    });

    it("should allow all valid LockState values", () => {
      const states: LockState[] = ["locked", "unlocked", "uninitialized"];
      expect(states).toHaveLength(3);
    });

    it("should allow all valid AuthMethod values", () => {
      const methods: AuthMethod[] = ["pin", "biometric", "none"];
      expect(methods).toHaveLength(3);
    });

    it("should allow all valid BiometricType values", () => {
      const types: BiometricType[] = [
        "faceId",
        "touchId",
        "fingerprint",
        "face",
        "iris",
        "none",
      ];
      expect(types).toHaveLength(6);
    });

    it("should allow all valid Platform values", () => {
      const platforms: Platform[] = [
        "web",
        "ios",
        "android",
        "macos",
        "windows",
        "linux",
        "electron",
        "tauri",
      ];
      expect(platforms).toHaveLength(8);
    });

    it("should allow all valid IdleResetEvent values", () => {
      const events: IdleResetEvent[] = [
        "keypress",
        "mousemove",
        "mousedown",
        "scroll",
        "touchstart",
        "visibilitychange",
      ];
      expect(events).toHaveLength(6);
    });

    it("should allow all valid LockErrorCode values", () => {
      const codes: LockErrorCode[] = [
        "NOT_INITIALIZED",
        "ALREADY_LOCKED",
        "ALREADY_UNLOCKED",
        "INVALID_PIN",
        "PIN_TOO_SHORT",
        "PIN_TOO_LONG",
        "PIN_NOT_SET",
        "BIOMETRIC_FAILED",
        "BIOMETRIC_CANCELLED",
        "BIOMETRIC_NOT_AVAILABLE",
        "BIOMETRIC_NOT_ENROLLED",
        "LOCKED_OUT",
        "STORAGE_ERROR",
        "ENCRYPTION_ERROR",
        "UNKNOWN_ERROR",
      ];
      expect(codes).toHaveLength(15);
    });

    it("should allow all valid LockEventType values", () => {
      const types: LockEventType[] = [
        "locked",
        "unlocked",
        "lock_failed",
        "unlock_failed",
        "lockout_started",
        "lockout_ended",
        "idle_warning",
        "settings_changed",
        "pin_changed",
        "biometric_enrolled",
      ];
      expect(types).toHaveLength(10);
    });
  });
});
