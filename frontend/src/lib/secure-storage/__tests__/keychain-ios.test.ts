/**
 * iOS Keychain Storage Tests
 *
 * Tests for iOS Keychain integration.
 */

import {
  iOSKeychainStorage,
  isiOSKeychainAvailable,
  createiOSKeychainStorage,
} from "../keychain-ios";
import { SecureStorageError } from "../types";

// Mock logger before imports
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// ============================================================================
// Mock Setup
// ============================================================================

const mockBridge = {
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  clear: jest.fn(),
  isAvailable: jest.fn(),
  getBiometricType: jest.fn(),
  authenticateBiometric: jest.fn(),
};

// Mock Capacitor
const mockCapacitor = {
  platform: "ios",
  Plugins: {
    SecureStoragePlugin: mockBridge,
  },
};

const originalGlobalThis = { ...globalThis };

beforeEach(() => {
  jest.clearAllMocks();
  // Reset globalThis
  Object.assign(globalThis, { Capacitor: mockCapacitor });
  mockBridge.isAvailable.mockResolvedValue(true);
  mockBridge.getBiometricType.mockResolvedValue("faceId");
});

afterAll(() => {
  Object.assign(globalThis, originalGlobalThis);
});

// ============================================================================
// Platform Detection Tests
// ============================================================================

describe("isiOSKeychainAvailable", () => {
  it("should return true on iOS platform", () => {
    expect(isiOSKeychainAvailable()).toBe(true);
  });

  it("should return false on non-iOS platform", () => {
    Object.assign(globalThis, { Capacitor: { platform: "android" } });
    expect(isiOSKeychainAvailable()).toBe(false);
  });

  it("should return false when Capacitor is not available", () => {
    Object.assign(globalThis, { Capacitor: undefined });
    expect(isiOSKeychainAvailable()).toBe(false);
  });
});

describe("createiOSKeychainStorage", () => {
  it("should create storage instance", () => {
    const storage = createiOSKeychainStorage();
    expect(storage).toBeInstanceOf(iOSKeychainStorage);
    expect(storage.os).toBe("ios");
  });

  it("should accept custom service", () => {
    const storage = createiOSKeychainStorage("custom.service");
    expect(storage).toBeInstanceOf(iOSKeychainStorage);
  });
});

// ============================================================================
// iOSKeychainStorage Tests
// ============================================================================

describe("iOSKeychainStorage", () => {
  let storage: iOSKeychainStorage;

  beforeEach(() => {
    storage = new iOSKeychainStorage();
  });

  describe("initialization", () => {
    it("should initialize successfully", async () => {
      await expect(storage.initialize()).resolves.toBeUndefined();
      expect(storage.isInitialized()).toBe(true);
    });

    it("should detect Face ID", async () => {
      mockBridge.getBiometricType.mockResolvedValue("faceId");
      await storage.initialize();
      expect(await storage.isBiometricAvailable()).toBe(true);
    });

    it("should detect Touch ID", async () => {
      mockBridge.getBiometricType.mockResolvedValue("touchId");
      await storage.initialize();
      expect(await storage.isBiometricAvailable()).toBe(true);
    });

    it("should handle no biometric", async () => {
      mockBridge.getBiometricType.mockResolvedValue("none");
      await storage.initialize();
      expect(await storage.isBiometricAvailable()).toBe(false);
    });

    it("should throw if not available", async () => {
      mockBridge.isAvailable.mockResolvedValue(false);
      await expect(storage.initialize()).rejects.toThrow(SecureStorageError);
    });

    it("should not reinitialize", async () => {
      await storage.initialize();
      await storage.initialize();
      expect(mockBridge.isAvailable).toHaveBeenCalledTimes(1);
    });
  });

  describe("getCapabilities", () => {
    it("should return iOS capabilities", async () => {
      await storage.initialize();
      const caps = await storage.getCapabilities();

      expect(caps.hardwareStorage).toBe(true);
      expect(caps.secureEnclave).toBe(true);
      expect(caps.syncSupported).toBe(true);
      expect(caps.os).toBe("ios");
      expect(caps.securityLevel).toBe("hardware");
      expect(caps.accessGroupsSupported).toBe(true);
    });

    it("should include biometric types", async () => {
      mockBridge.getBiometricType.mockResolvedValue("faceId");
      await storage.initialize();
      const caps = await storage.getCapabilities();

      expect(caps.biometricAuth).toBe(true);
      expect(caps.biometricTypes).toContain("faceId");
    });
  });

  describe("setItem", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("should store item successfully", async () => {
      mockBridge.setItem.mockResolvedValue(true);

      const result = await storage.setItem("test-key", "test-value");

      expect(result.success).toBe(true);
      expect(mockBridge.setItem).toHaveBeenCalled();
    });

    it("should handle storage failure", async () => {
      mockBridge.setItem.mockResolvedValue(false);

      const result = await storage.setItem("test-key", "test-value");

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("PLATFORM_ERROR");
    });

    it("should store metadata", async () => {
      mockBridge.setItem.mockResolvedValue(true);

      const result = await storage.setItem("test-key", "test-value", {
        requireBiometric: true,
        synchronizable: true,
      });

      expect(result.success).toBe(true);
      expect(result.meta?.biometricProtected).toBe(true);
      expect(result.meta?.synchronizable).toBe(true);
    });

    it("should throw if not initialized", async () => {
      const uninitStorage = new iOSKeychainStorage();
      await expect(uninitStorage.setItem("key", "value")).rejects.toThrow(
        SecureStorageError,
      );
    });
  });

  describe("getItem", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("should retrieve item successfully", async () => {
      mockBridge.getItem.mockResolvedValue("test-value");

      const result = await storage.getItem("test-key");

      expect(result.success).toBe(true);
      expect(result.data).toBe("test-value");
    });

    it("should return null for missing item", async () => {
      mockBridge.getItem.mockResolvedValue(null);

      const result = await storage.getItem("non-existent");

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it("should require biometric when protected", async () => {
      // Store with biometric protection
      mockBridge.setItem.mockResolvedValue(true);
      await storage.setItem("protected-key", "secret", {
        requireBiometric: true,
      });

      // Fail biometric
      mockBridge.authenticateBiometric.mockResolvedValue(false);
      mockBridge.getItem.mockResolvedValue("secret");

      const result = await storage.getItem("protected-key", {
        biometricPrompt: "Authenticate",
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BIOMETRIC_FAILED");
    });
  });

  describe("hasItem", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("should return true for existing item", async () => {
      mockBridge.getItem.mockResolvedValue("value");

      const exists = await storage.hasItem("existing-key");

      expect(exists).toBe(true);
    });

    it("should return false for missing item", async () => {
      mockBridge.getItem.mockResolvedValue(null);

      const exists = await storage.hasItem("missing-key");

      expect(exists).toBe(false);
    });
  });

  describe("removeItem", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("should remove item successfully", async () => {
      mockBridge.removeItem.mockResolvedValue(true);

      const result = await storage.removeItem("test-key");

      expect(result.success).toBe(true);
    });

    it("should handle missing item gracefully", async () => {
      mockBridge.removeItem.mockResolvedValue(false);

      const result = await storage.removeItem("non-existent");

      expect(result.success).toBe(true);
    });
  });

  describe("getAllKeys", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("should return all keys", async () => {
      mockBridge.getAllKeys.mockResolvedValue([
        "nchat_secure_key1",
        "nchat_secure_key2",
        "nchat_secure_key1_meta",
      ]);

      const keys = await storage.getAllKeys();

      expect(keys).toEqual(["key1", "key2"]);
    });

    it("should filter metadata keys", async () => {
      mockBridge.getAllKeys.mockResolvedValue([
        "nchat_secure_data",
        "nchat_secure_data_meta",
      ]);

      const keys = await storage.getAllKeys();

      expect(keys).not.toContain("data_meta");
    });
  });

  describe("clear", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("should clear all items", async () => {
      mockBridge.clear.mockResolvedValue(true);

      const result = await storage.clear();

      expect(result.success).toBe(true);
    });

    it("should handle clear failure", async () => {
      mockBridge.clear.mockResolvedValue(false);

      const result = await storage.clear();

      expect(result.success).toBe(false);
    });
  });

  describe("authenticateBiometric", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("should authenticate successfully", async () => {
      mockBridge.authenticateBiometric.mockResolvedValue(true);

      const result = await storage.authenticateBiometric(
        "Unlock secure storage",
      );

      expect(result.success).toBe(true);
    });

    it("should handle authentication failure", async () => {
      mockBridge.authenticateBiometric.mockResolvedValue(false);

      const result = await storage.authenticateBiometric("Unlock");

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BIOMETRIC_FAILED");
    });

    it("should handle cancellation", async () => {
      mockBridge.authenticateBiometric.mockRejectedValue(
        new Error("User cancelled"),
      );

      const result = await storage.authenticateBiometric("Unlock");

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BIOMETRIC_CANCELLED");
    });

    it("should fail when biometric not available", async () => {
      mockBridge.getBiometricType.mockResolvedValue("none");
      const noAuthStorage = new iOSKeychainStorage();
      await noAuthStorage.initialize();

      const result = await noAuthStorage.authenticateBiometric("Unlock");

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BIOMETRIC_NOT_AVAILABLE");
    });
  });
});
