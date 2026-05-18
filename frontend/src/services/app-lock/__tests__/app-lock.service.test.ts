/**
 * App Lock Service Tests
 *
 * Tests for the high-level app lock service.
 */

import { AppLockService, resetAppLockService } from "../app-lock.service";
import { resetAppLockManager } from "@/lib/app-lock";

// ============================================================================
// Mock Setup
// ============================================================================

// Mock the environment module
jest.mock("@/lib/environment", () => ({
  isClient: jest.fn().mockReturnValue(false),
  isDevelopment: jest.fn().mockReturnValue(true),
  isProduction: jest.fn().mockReturnValue(false),
}));

// Mock the secure storage
jest.mock("@/lib/secure-storage", () => ({
  getSecureStorage: jest.fn().mockReturnValue({
    os: "web",
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
  }),
  resetSecureStorage: jest.fn(),
}));

// ============================================================================
// Tests
// ============================================================================

describe("AppLockService", () => {
  let service: AppLockService;

  beforeEach(() => {
    jest.clearAllMocks();
    resetAppLockService();
    resetAppLockManager();
    service = new AppLockService({ autoInitialize: false });
  });

  afterEach(() => {
    service.destroy();
  });

  describe("Initialization", () => {
    it("should initialize successfully", async () => {
      await service.initialize();
      expect(service.isInitialized()).toBe(true);
    });

    it("should only initialize once", async () => {
      await service.initialize();
      await service.initialize();
      expect(service.isInitialized()).toBe(true);
    });

    it("should auto-initialize on first access if enabled", async () => {
      const autoService = new AppLockService({ autoInitialize: true });
      await autoService.isLocked();
      expect(autoService.isInitialized()).toBe(true);
      autoService.destroy();
    });
  });

  describe("Lock Screen Mode", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should return none when mode is none", async () => {
      const mode = await service.getLockScreenMode();
      expect(mode).toBe("none");
    });

    it("should return pin when mode is pin", async () => {
      await service.updateSettings({ mode: "pin" });
      const mode = await service.getLockScreenMode();
      expect(mode).toBe("pin");
    });

    it("should return either when mode is pin_or_biometric", async () => {
      await service.updateSettings({ mode: "pin_or_biometric" });
      const mode = await service.getLockScreenMode();
      // Will return 'pin' because biometric is not available
      expect(mode).toBe("pin");
    });
  });

  describe("Lock Operations", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should lock the app", async () => {
      await service.updateSettings({ mode: "pin" });
      const result = await service.lock();
      expect(result.success).toBe(true);

      const isLocked = await service.isLocked();
      expect(isLocked).toBe(true);
    });

    it("should unlock with PIN", async () => {
      await service.updateSettings({ mode: "pin" });
      await service.setupPin("123456");
      await service.lock();

      // Mock the PIN retrieval
      const { getSecureStorage } = require("@/lib/secure-storage");
      const mockStorage = getSecureStorage();
      const storedPinData = mockStorage.setItem.mock.calls.find(
        (call: any) => call[0] === "nchat_app_lock_pin_hash",
      )?.[1];

      mockStorage.getItem.mockImplementation((key: string) => {
        if (key === "nchat_app_lock_pin_hash") {
          return Promise.resolve({
            success: true,
            data: storedPinData,
            error: null,
          });
        }
        return Promise.resolve({ success: true, data: null, error: null });
      });

      const result = await service.unlockWithPin("123456");
      expect(result.success).toBe(true);

      const isLocked = await service.isLocked();
      expect(isLocked).toBe(false);
    });
  });

  describe("Enable/Disable Lock", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should require PIN setup before enabling PIN mode", async () => {
      const result = await service.enableLock("pin");
      expect(result.success).toBe(false);
      expect(result.requiresPinSetup).toBe(true);
    });

    it("should enable PIN mode after PIN is set", async () => {
      await service.setupPin("123456");

      const { getSecureStorage } = require("@/lib/secure-storage");
      const mockStorage = getSecureStorage();
      mockStorage.hasItem.mockResolvedValue(true);

      const result = await service.enableLock("pin");
      expect(result.success).toBe(true);
    });

    it("should reject biometric mode when not available", async () => {
      const result = await service.enableLock("biometric");
      expect(result.success).toBe(false);
      expect(result.biometricAvailable).toBe(false);
    });

    it("should disable lock", async () => {
      await service.updateSettings({ mode: "pin" });
      const result = await service.disableLock();

      expect(result.success).toBe(true);
      const settings = await service.getSettings();
      expect(settings.mode).toBe("none");
    });
  });

  describe("Idle Timeout", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should enable idle timeout", async () => {
      const result = await service.enableIdleTimeout(10);
      expect(result.success).toBe(true);

      const settings = await service.getSettings();
      expect(settings.idleTimeout.enabled).toBe(true);
      expect(settings.idleTimeout.timeoutMinutes).toBe(10);
    });

    it("should disable idle timeout", async () => {
      await service.enableIdleTimeout(10);
      const result = await service.disableIdleTimeout();

      expect(result.success).toBe(true);
      const settings = await service.getSettings();
      expect(settings.idleTimeout.enabled).toBe(false);
    });
  });

  describe("PIN Management", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should setup PIN", async () => {
      const result = await service.setupPin("123456");
      expect(result.success).toBe(true);
    });

    it("should check if PIN is set", async () => {
      const { getSecureStorage } = require("@/lib/secure-storage");
      const mockStorage = getSecureStorage();
      mockStorage.hasItem.mockResolvedValue(false);

      let hasPinSet = await service.hasPinSet();
      expect(hasPinSet).toBe(false);

      await service.setupPin("123456");
      mockStorage.hasItem.mockResolvedValue(true);

      hasPinSet = await service.hasPinSet();
      expect(hasPinSet).toBe(true);
    });
  });

  describe("Event Subscription", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should subscribe to events", async () => {
      const callback = jest.fn();
      const unsubscribe = service.subscribe("locked", callback);

      await service.updateSettings({ mode: "pin" });
      await service.lock();

      expect(callback).toHaveBeenCalled();
      unsubscribe();
    });

    it("should unsubscribe from events", async () => {
      const callback = jest.fn();
      const unsubscribe = service.subscribe("locked", callback);
      unsubscribe();

      await service.updateSettings({ mode: "pin" });
      await service.lock();

      expect(callback).not.toHaveBeenCalled();
    });

    it("should track lock state changes", async () => {
      const callback = jest.fn();
      service.onLockStateChange(callback);

      await service.updateSettings({ mode: "pin" });
      await service.lock();

      expect(callback).toHaveBeenCalledWith(true);
    });
  });

  describe("Fallback Checks", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should check biometric fallback availability", async () => {
      const canUseBiometric = await service.canUseBiometricFallback();
      expect(canUseBiometric).toBe(false); // Biometric not available
    });

    it("should check PIN fallback availability", async () => {
      let canUsePin = await service.canUsePinFallback();
      expect(canUsePin).toBe(false); // PIN not set

      await service.setupPin("123456");
      await service.updateSettings({ mode: "pin_or_biometric" });

      const { getSecureStorage } = require("@/lib/secure-storage");
      const mockStorage = getSecureStorage();
      mockStorage.hasItem.mockResolvedValue(true);

      canUsePin = await service.canUsePinFallback();
      expect(canUsePin).toBe(true);
    });
  });

  describe("Lockout Status", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should check lockout status", async () => {
      const isLockedOut = await service.isLockedOut();
      expect(isLockedOut).toBe(false);
    });

    it("should get lockout remaining time", async () => {
      const remaining = await service.getLockoutRemaining();
      expect(remaining).toBe(0);
    });
  });

  describe("Quick Unlock", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should require PIN when biometric not available", async () => {
      await service.updateSettings({ mode: "pin" });
      await service.lock();

      const result = await service.quickUnlock();
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("PIN_NOT_SET");
    });
  });

  describe("Cleanup", () => {
    it("should cleanup on destroy", async () => {
      await service.initialize();
      service.destroy();

      expect(service.isInitialized()).toBe(false);
    });
  });

  describe("Reset Activity", () => {
    it("should reset activity timer", async () => {
      await service.initialize();
      // Should not throw
      service.resetActivity();
    });
  });
});
