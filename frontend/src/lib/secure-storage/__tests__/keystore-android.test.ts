/**
 * Android Keystore Storage Tests
 *
 * Tests for Android Keystore integration.
 */

import {
  AndroidKeystoreStorage,
  isAndroidKeystoreAvailable,
  createAndroidKeystoreStorage,
} from "../keystore-android";
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
  isStrongBoxAvailable: jest.fn(),
};

// Mock Capacitor
const mockCapacitor = {
  platform: "android",
  Plugins: {
    SecureStoragePlugin: mockBridge,
  },
};

const originalGlobalThis = { ...globalThis };

beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(globalThis, { Capacitor: mockCapacitor });
  mockBridge.isAvailable.mockResolvedValue(true);
  mockBridge.getBiometricType.mockResolvedValue("fingerprint");
  mockBridge.isStrongBoxAvailable.mockResolvedValue(false);
});

afterAll(() => {
  Object.assign(globalThis, originalGlobalThis);
});

// ============================================================================
// Platform Detection Tests
// ============================================================================

describe("isAndroidKeystoreAvailable", () => {
  it("should return true on Android platform", () => {
    expect(isAndroidKeystoreAvailable()).toBe(true);
  });

  it("should return false on non-Android platform", () => {
    Object.assign(globalThis, { Capacitor: { platform: "ios" } });
    expect(isAndroidKeystoreAvailable()).toBe(false);
  });

  it("should return false when Capacitor is not available", () => {
    Object.assign(globalThis, { Capacitor: undefined });
    expect(isAndroidKeystoreAvailable()).toBe(false);
  });
});

describe("createAndroidKeystoreStorage", () => {
  it("should create storage instance", () => {
    const storage = createAndroidKeystoreStorage();
    expect(storage).toBeInstanceOf(AndroidKeystoreStorage);
    expect(storage.os).toBe("android");
  });

  it("should accept custom service", () => {
    const storage = createAndroidKeystoreStorage("custom.service");
    expect(storage).toBeInstanceOf(AndroidKeystoreStorage);
  });
});

// ============================================================================
// AndroidKeystoreStorage Tests
// ============================================================================

describe("AndroidKeystoreStorage", () => {
  let storage: AndroidKeystoreStorage;

  beforeEach(() => {
    storage = new AndroidKeystoreStorage();
  });

  describe("initialization", () => {
    it("should initialize successfully", async () => {
      await expect(storage.initialize()).resolves.toBeUndefined();
      expect(storage.isInitialized()).toBe(true);
    });

    it("should detect fingerprint", async () => {
      mockBridge.getBiometricType.mockResolvedValue("fingerprint");
      await storage.initialize();
      expect(await storage.isBiometricAvailable()).toBe(true);
    });

    it("should detect face", async () => {
      mockBridge.getBiometricType.mockResolvedValue("face");
      await storage.initialize();
      expect(await storage.isBiometricAvailable()).toBe(true);
    });

    it("should detect iris", async () => {
      mockBridge.getBiometricType.mockResolvedValue("iris");
      await storage.initialize();
      expect(await storage.isBiometricAvailable()).toBe(true);
    });

    it("should detect StrongBox availability", async () => {
      mockBridge.isStrongBoxAvailable.mockResolvedValue(true);
      await storage.initialize();
      const caps = await storage.getCapabilities();
      expect(caps.secureEnclave).toBe(true);
    });

    it("should throw if not available", async () => {
      mockBridge.isAvailable.mockResolvedValue(false);
      await expect(storage.initialize()).rejects.toThrow(SecureStorageError);
    });
  });

  describe("getCapabilities", () => {
    it("should return Android capabilities without StrongBox", async () => {
      mockBridge.isStrongBoxAvailable.mockResolvedValue(false);
      await storage.initialize();
      const caps = await storage.getCapabilities();

      expect(caps.hardwareStorage).toBe(true);
      expect(caps.secureEnclave).toBe(false);
      expect(caps.syncSupported).toBe(false);
      expect(caps.os).toBe("android");
      expect(caps.securityLevel).toBe("system");
    });

    it("should return Android capabilities with StrongBox", async () => {
      mockBridge.isStrongBoxAvailable.mockResolvedValue(true);
      await storage.initialize();
      const caps = await storage.getCapabilities();

      expect(caps.secureEnclave).toBe(true);
      expect(caps.securityLevel).toBe("hardware");
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
    });

    it("should include StrongBox option when available", async () => {
      mockBridge.isStrongBoxAvailable.mockResolvedValue(true);
      const strongBoxStorage = new AndroidKeystoreStorage();
      await strongBoxStorage.initialize();

      mockBridge.setItem.mockResolvedValue(true);
      await strongBoxStorage.setItem("key", "value");

      expect(mockBridge.setItem).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ useStrongBox: true }),
      );
    });

    it("should handle storage failure", async () => {
      mockBridge.setItem.mockResolvedValue(false);

      const result = await storage.setItem("test-key", "test-value");

      expect(result.success).toBe(false);
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
  });

  describe("hasItem", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("should return true for existing item", async () => {
      mockBridge.getItem.mockResolvedValue("value");
      expect(await storage.hasItem("key")).toBe(true);
    });

    it("should return false for missing item", async () => {
      mockBridge.getItem.mockResolvedValue(null);
      expect(await storage.hasItem("missing")).toBe(false);
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
  });

  describe("getAllKeys", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("should return all keys", async () => {
      mockBridge.getAllKeys.mockResolvedValue([
        "nchat_secure_key1",
        "nchat_secure_key2",
      ]);

      const keys = await storage.getAllKeys();

      expect(keys.length).toBe(2);
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
  });

  describe("authenticateBiometric", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("should authenticate successfully", async () => {
      mockBridge.authenticateBiometric.mockResolvedValue(true);

      const result = await storage.authenticateBiometric("Unlock");

      expect(result.success).toBe(true);
    });

    it("should handle authentication failure", async () => {
      mockBridge.authenticateBiometric.mockResolvedValue(false);

      const result = await storage.authenticateBiometric("Unlock");

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BIOMETRIC_FAILED");
    });

    it("should fail when biometric not available", async () => {
      mockBridge.getBiometricType.mockResolvedValue("none");
      const noAuthStorage = new AndroidKeystoreStorage();
      await noAuthStorage.initialize();

      const result = await noAuthStorage.authenticateBiometric("Unlock");

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BIOMETRIC_NOT_AVAILABLE");
    });
  });
});
