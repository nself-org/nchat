/**
 * App Lock Manager Tests
 *
 * Comprehensive tests for the main lock manager.
 */

import {
  AppLockManager,
  createAppLockManager,
  resetAppLockManager,
} from "../app-lock-manager";
import {
  DEFAULT_LOCK_SETTINGS,
  DEFAULT_LOCK_STATE_INFO,
  STORAGE_KEYS,
  type LockEvent,
} from "../types";

// ============================================================================
// Mock Setup
// ============================================================================

// Mock the environment module
jest.mock("@/lib/environment", () => ({
  isClient: jest.fn().mockReturnValue(false), // Start with server-side
  isDevelopment: jest.fn().mockReturnValue(true),
  isProduction: jest.fn().mockReturnValue(false),
}));

const mockStorage = {
  os: "web" as const,
  isInitialized: jest.fn().mockReturnValue(true),
  initialize: jest.fn().mockResolvedValue(undefined),
  getCapabilities: jest.fn().mockResolvedValue({
    hardwareStorage: false,
    biometricAuth: false,
    biometricTypes: [],
    secureEnclave: false,
    syncSupported: false,
    maxItemSize: 5 * 1024 * 1024,
    accessGroupsSupported: false,
    os: "web",
    securityLevel: "encrypted",
  }),
  setItem: jest
    .fn()
    .mockResolvedValue({ success: true, data: null, error: null }),
  getItem: jest
    .fn()
    .mockResolvedValue({ success: true, data: null, error: null }),
  hasItem: jest.fn().mockResolvedValue(false),
  removeItem: jest
    .fn()
    .mockResolvedValue({ success: true, data: null, error: null }),
  getAllKeys: jest.fn().mockResolvedValue([]),
  clear: jest
    .fn()
    .mockResolvedValue({ success: true, data: null, error: null }),
  getItemMeta: jest.fn().mockResolvedValue(null),
  isBiometricAvailable: jest.fn().mockResolvedValue(false),
  authenticateBiometric: jest.fn().mockResolvedValue({
    success: false,
    data: null,
    error: "Not available",
  }),
};

// ============================================================================
// Tests
// ============================================================================

describe("AppLockManager", () => {
  let manager: AppLockManager;

  beforeEach(() => {
    jest.clearAllMocks();
    resetAppLockManager();
    manager = createAppLockManager(mockStorage as any);
  });

  afterEach(() => {
    manager.destroy();
  });

  describe("Initialization", () => {
    it("should initialize successfully", async () => {
      await manager.initialize();
      const state = manager.getState();
      expect(state.initialized).toBe(true);
    });

    it("should load settings from storage", async () => {
      const customSettings = {
        ...DEFAULT_LOCK_SETTINGS,
        mode: "pin" as const,
        pinLength: 4,
      };

      mockStorage.getItem.mockResolvedValueOnce({
        success: true,
        data: JSON.stringify(customSettings),
        error: null,
      });

      await manager.initialize();
      const settings = manager.getSettings();

      expect(settings.mode).toBe("pin");
      expect(settings.pinLength).toBe(4);
    });

    it("should use default settings when storage is empty", async () => {
      mockStorage.getItem.mockResolvedValue({
        success: true,
        data: null,
        error: null,
      });

      await manager.initialize();
      const settings = manager.getSettings();

      expect(settings.mode).toBe(DEFAULT_LOCK_SETTINGS.mode);
    });

    it("should only initialize once", async () => {
      await manager.initialize();
      await manager.initialize();

      // Initialize should only be called once on the storage
      expect(mockStorage.getItem).toHaveBeenCalledTimes(2); // settings + lock state
    });
  });

  describe("Lock State", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should start unlocked when mode is none", async () => {
      expect(manager.isLocked()).toBe(false);
    });

    it("should allow locking when mode is set", async () => {
      await manager.updateSettings({ mode: "pin" });
      const result = await manager.lock();

      expect(result.success).toBe(true);
      expect(manager.isLocked()).toBe(true);
    });

    it("should reject locking when mode is none", async () => {
      await manager.updateSettings({ mode: "none" });
      const result = await manager.lock();

      expect(result.success).toBe(false);
    });

    it("should track lock time", async () => {
      await manager.updateSettings({ mode: "pin" });
      await manager.lock();

      const state = await manager.getStateAsync();
      expect(state.lockState.lockedAt).toBeTruthy();
    });
  });

  describe("Unlock with PIN", () => {
    beforeEach(async () => {
      // Setup PIN
      mockStorage.setItem.mockResolvedValue({
        success: true,
        data: null,
        error: null,
      });
      await manager.initialize();
      await manager.updateSettings({ mode: "pin" });
      await manager.setPin("123456");
      await manager.lock();
    });

    it("should unlock with correct PIN", async () => {
      // Get the stored PIN hash
      const storedValue = mockStorage.setItem.mock.calls.find(
        (call) => call[0] === STORAGE_KEYS.PIN_HASH,
      )?.[1];

      mockStorage.getItem.mockImplementation((key) => {
        if (key === STORAGE_KEYS.PIN_HASH) {
          return Promise.resolve({
            success: true,
            data: storedValue,
            error: null,
          });
        }
        return Promise.resolve({ success: true, data: null, error: null });
      });

      const result = await manager.unlockWithPin("123456");

      expect(result.success).toBe(true);
      expect(manager.isLocked()).toBe(false);
    });

    it("should reject unlock with wrong PIN", async () => {
      const storedValue = mockStorage.setItem.mock.calls.find(
        (call) => call[0] === STORAGE_KEYS.PIN_HASH,
      )?.[1];

      mockStorage.getItem.mockImplementation((key) => {
        if (key === STORAGE_KEYS.PIN_HASH) {
          return Promise.resolve({
            success: true,
            data: storedValue,
            error: null,
          });
        }
        return Promise.resolve({ success: true, data: null, error: null });
      });

      const result = await manager.unlockWithPin("654321");

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("INVALID_PIN");
      expect(manager.isLocked()).toBe(true);
    });

    it("should track failed attempts", async () => {
      const storedValue = mockStorage.setItem.mock.calls.find(
        (call) => call[0] === STORAGE_KEYS.PIN_HASH,
      )?.[1];

      mockStorage.getItem.mockImplementation((key) => {
        if (key === STORAGE_KEYS.PIN_HASH) {
          return Promise.resolve({
            success: true,
            data: storedValue,
            error: null,
          });
        }
        return Promise.resolve({ success: true, data: null, error: null });
      });

      await manager.unlockWithPin("wrong1");
      await manager.unlockWithPin("wrong2");

      const state = await manager.getStateAsync();
      expect(state.lockState.failedAttempts).toBe(2);
    });

    it("should trigger lockout after max attempts", async () => {
      await manager.updateSettings({ maxPinAttempts: 3 });

      const storedValue = mockStorage.setItem.mock.calls.find(
        (call) => call[0] === STORAGE_KEYS.PIN_HASH,
      )?.[1];

      mockStorage.getItem.mockImplementation((key) => {
        if (key === STORAGE_KEYS.PIN_HASH) {
          return Promise.resolve({
            success: true,
            data: storedValue,
            error: null,
          });
        }
        return Promise.resolve({ success: true, data: null, error: null });
      });

      await manager.unlockWithPin("wrong1");
      await manager.unlockWithPin("wrong2");
      await manager.unlockWithPin("wrong3");

      expect(manager.isLockedOut()).toBe(true);
    });

    it("should reject unlock attempts during lockout", async () => {
      await manager.updateSettings({ maxPinAttempts: 1 });

      const storedValue = mockStorage.setItem.mock.calls.find(
        (call) => call[0] === STORAGE_KEYS.PIN_HASH,
      )?.[1];

      mockStorage.getItem.mockImplementation((key) => {
        if (key === STORAGE_KEYS.PIN_HASH) {
          return Promise.resolve({
            success: true,
            data: storedValue,
            error: null,
          });
        }
        return Promise.resolve({ success: true, data: null, error: null });
      });

      await manager.unlockWithPin("wrong");

      const result = await manager.unlockWithPin("123456");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("LOCKED_OUT");
    });
  });

  describe("Unlock with Biometric", () => {
    it("should reject when biometric not enabled", async () => {
      await manager.initialize();
      await manager.updateSettings({ mode: "pin" });
      await manager.lock();

      const result = await manager.unlockWithBiometric();
      expect(result.success).toBe(false);
    });

    it("should authenticate when biometric is enabled and available", async () => {
      mockStorage.isBiometricAvailable.mockResolvedValue(true);
      mockStorage.getCapabilities.mockResolvedValue({
        hardwareStorage: true,
        biometricAuth: true,
        biometricTypes: ["fingerprint"],
        secureEnclave: false,
        syncSupported: false,
        maxItemSize: 5 * 1024 * 1024,
        accessGroupsSupported: false,
        os: "android",
        securityLevel: "hardware",
      });
      mockStorage.authenticateBiometric.mockResolvedValue({
        success: true,
        data: null,
        error: null,
      });

      await manager.initialize();
      await manager.updateSettings({ mode: "biometric" });
      await manager.lock();

      const result = await manager.unlockWithBiometric();
      expect(result.success).toBe(true);
      expect(manager.isLocked()).toBe(false);
    });
  });

  describe("Settings Management", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should update settings", async () => {
      const result = await manager.updateSettings({
        mode: "pin_or_biometric",
        pinLength: 4,
      });

      expect(result.success).toBe(true);

      const settings = manager.getSettings();
      expect(settings.mode).toBe("pin_or_biometric");
      expect(settings.pinLength).toBe(4);
    });

    it("should persist settings to storage", async () => {
      await manager.updateSettings({ mode: "pin" });

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.SETTINGS,
        expect.any(String),
        expect.any(Object),
      );
    });

    it("should update idle timeout settings", async () => {
      await manager.updateSettings({
        idleTimeout: {
          enabled: true,
          timeoutMinutes: 10,
          warningSeconds: 60,
          resetEvents: ["keypress"],
        },
      });

      const settings = manager.getSettings();
      expect(settings.idleTimeout.enabled).toBe(true);
      expect(settings.idleTimeout.timeoutMinutes).toBe(10);
    });
  });

  describe("PIN Management", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should set PIN", async () => {
      const result = await manager.setPin("123456");
      expect(result.success).toBe(true);
    });

    it("should check if PIN is set", async () => {
      mockStorage.hasItem.mockResolvedValueOnce(false);
      let hasPinSet = await manager.hasPinSet();
      expect(hasPinSet).toBe(false);

      await manager.setPin("123456");
      mockStorage.hasItem.mockResolvedValueOnce(true);

      hasPinSet = await manager.hasPinSet();
      expect(hasPinSet).toBe(true);
    });

    it("should reject PIN removal when mode requires PIN", async () => {
      await manager.updateSettings({ mode: "pin" });
      await manager.setPin("123456");

      const result = await manager.removePin("123456");
      expect(result.success).toBe(false);
    });
  });

  describe("Event Handling", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should emit locked event", async () => {
      const listener = jest.fn();
      manager.addEventListener("locked", listener);

      await manager.updateSettings({ mode: "pin" });
      await manager.lock();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "locked",
          timestamp: expect.any(String),
        }),
      );
    });

    it("should emit unlocked event", async () => {
      const listener = jest.fn();
      manager.addEventListener("unlocked", listener);

      await manager.updateSettings({ mode: "pin" });
      await manager.setPin("123456");
      await manager.lock();

      // Setup PIN verification
      const storedValue = mockStorage.setItem.mock.calls.find(
        (call) => call[0] === STORAGE_KEYS.PIN_HASH,
      )?.[1];

      mockStorage.getItem.mockImplementation((key) => {
        if (key === STORAGE_KEYS.PIN_HASH) {
          return Promise.resolve({
            success: true,
            data: storedValue,
            error: null,
          });
        }
        return Promise.resolve({ success: true, data: null, error: null });
      });

      await manager.unlockWithPin("123456");

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "unlocked",
          data: expect.objectContaining({ method: "pin" }),
        }),
      );
    });

    it("should emit settings_changed event", async () => {
      const listener = jest.fn();
      manager.addEventListener("settings_changed", listener);

      await manager.updateSettings({ mode: "biometric" });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "settings_changed",
          data: expect.objectContaining({
            previousMode: "none",
            newMode: "biometric",
          }),
        }),
      );
    });

    it("should emit lockout_started event", async () => {
      const listener = jest.fn();
      manager.addEventListener("lockout_started", listener);

      await manager.updateSettings({ mode: "pin", maxPinAttempts: 1 });
      await manager.setPin("123456");
      await manager.lock();

      const storedValue = mockStorage.setItem.mock.calls.find(
        (call) => call[0] === STORAGE_KEYS.PIN_HASH,
      )?.[1];

      mockStorage.getItem.mockImplementation((key) => {
        if (key === STORAGE_KEYS.PIN_HASH) {
          return Promise.resolve({
            success: true,
            data: storedValue,
            error: null,
          });
        }
        return Promise.resolve({ success: true, data: null, error: null });
      });

      await manager.unlockWithPin("wrong");

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "lockout_started",
        }),
      );
    });

    it("should remove event listener", async () => {
      const listener = jest.fn();
      manager.addEventListener("locked", listener);
      manager.removeEventListener("locked", listener);

      await manager.updateSettings({ mode: "pin" });
      await manager.lock();

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("Platform Capabilities", () => {
    it("should return platform capabilities", async () => {
      await manager.initialize();
      const capabilities = await manager.getCapabilities();

      expect(capabilities.supportsPin).toBe(true);
      expect(capabilities.platform).toBeDefined();
    });
  });

  describe("Lockout Management", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should calculate remaining lockout time", async () => {
      await manager.updateSettings({
        mode: "pin",
        maxPinAttempts: 1,
        lockoutMinutes: 15,
      });
      await manager.setPin("123456");
      await manager.lock();

      const storedValue = mockStorage.setItem.mock.calls.find(
        (call) => call[0] === STORAGE_KEYS.PIN_HASH,
      )?.[1];

      mockStorage.getItem.mockImplementation((key) => {
        if (key === STORAGE_KEYS.PIN_HASH) {
          return Promise.resolve({
            success: true,
            data: storedValue,
            error: null,
          });
        }
        return Promise.resolve({ success: true, data: null, error: null });
      });

      await manager.unlockWithPin("wrong");

      const remaining = manager.getRemainingLockoutTime();
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(15 * 60);
    });

    it("should return 0 when not locked out", () => {
      const remaining = manager.getRemainingLockoutTime();
      expect(remaining).toBe(0);
    });
  });

  describe("Cleanup", () => {
    it("should cleanup on destroy", async () => {
      await manager.initialize();
      manager.destroy();

      const state = manager.getState();
      expect(state.initialized).toBe(false);
    });
  });
});
