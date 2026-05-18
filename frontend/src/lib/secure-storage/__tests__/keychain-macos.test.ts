/**
 * macOS Keychain Storage Tests
 *
 * Tests for macOS Keychain integration.
 */

import {
  macOSKeychainStorage,
  ismacOSKeychainAvailable,
  createmacOSKeychainStorage,
} from "../keychain-macos";
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
  setPassword: jest.fn(),
  getPassword: jest.fn(),
  deletePassword: jest.fn(),
  findCredentials: jest.fn(),
  isAvailable: jest.fn(),
};

const mockElectron = {
  keytar: mockBridge,
  systemPreferences: {
    canPromptTouchID: jest.fn(),
    promptTouchID: jest.fn(),
  },
  process: {
    arch: "arm64",
  },
};

const originalGlobalThis = { ...globalThis };

beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(globalThis, {
    electron: mockElectron,
    process: { platform: "darwin" },
  });
  mockBridge.isAvailable.mockResolvedValue(true);
  mockElectron.systemPreferences.canPromptTouchID.mockReturnValue(true);
});

afterAll(() => {
  Object.assign(globalThis, originalGlobalThis);
});

// ============================================================================
// Platform Detection Tests
// ============================================================================

describe("ismacOSKeychainAvailable", () => {
  it("should return true on macOS with Electron", () => {
    expect(ismacOSKeychainAvailable()).toBe(true);
  });

  it("should return false on non-macOS platform", () => {
    Object.assign(globalThis, { process: { platform: "win32" } });
    expect(ismacOSKeychainAvailable()).toBe(false);
  });

  it("should return false without Electron", () => {
    Object.assign(globalThis, { electron: undefined });
    expect(ismacOSKeychainAvailable()).toBe(false);
  });
});

describe("createmacOSKeychainStorage", () => {
  it("should create storage instance", () => {
    const storage = createmacOSKeychainStorage();
    expect(storage).toBeInstanceOf(macOSKeychainStorage);
    expect(storage.os).toBe("macos");
  });
});

// ============================================================================
// macOSKeychainStorage Tests
// ============================================================================

describe("macOSKeychainStorage", () => {
  let storage: macOSKeychainStorage;

  beforeEach(() => {
    storage = new macOSKeychainStorage();
  });

  describe("initialization", () => {
    it("should initialize successfully", async () => {
      await expect(storage.initialize()).resolves.toBeUndefined();
      expect(storage.isInitialized()).toBe(true);
    });

    it("should detect Touch ID availability", async () => {
      mockElectron.systemPreferences.canPromptTouchID.mockReturnValue(true);
      await storage.initialize();
      expect(await storage.isBiometricAvailable()).toBe(true);
    });

    it("should handle no Touch ID", async () => {
      mockElectron.systemPreferences.canPromptTouchID.mockReturnValue(false);
      await storage.initialize();
      expect(await storage.isBiometricAvailable()).toBe(false);
    });

    it("should throw if not available", async () => {
      mockBridge.isAvailable.mockResolvedValue(false);
      await expect(storage.initialize()).rejects.toThrow(SecureStorageError);
    });
  });

  describe("getCapabilities", () => {
    it("should return macOS capabilities", async () => {
      await storage.initialize();
      const caps = await storage.getCapabilities();

      expect(caps.hardwareStorage).toBe(true);
      expect(caps.syncSupported).toBe(true); // iCloud Keychain
      expect(caps.os).toBe("macos");
      expect(caps.securityLevel).toBe("system");
      expect(caps.accessGroupsSupported).toBe(true);
    });

    it("should detect Secure Enclave on Apple Silicon", async () => {
      mockElectron.process.arch = "arm64";
      await storage.initialize();
      const caps = await storage.getCapabilities();
      expect(caps.secureEnclave).toBe(true);
    });
  });

  describe("setItem", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("should store item successfully", async () => {
      mockBridge.setPassword.mockResolvedValue(true);

      const result = await storage.setItem("test-key", "test-value");

      expect(result.success).toBe(true);
      expect(mockBridge.setPassword).toHaveBeenCalled();
    });

    it("should handle storage failure", async () => {
      mockBridge.setPassword.mockResolvedValue(false);

      const result = await storage.setItem("test-key", "test-value");

      expect(result.success).toBe(false);
    });
  });

  describe("getItem", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("should retrieve item successfully", async () => {
      mockBridge.getPassword.mockResolvedValue("test-value");

      const result = await storage.getItem("test-key");

      expect(result.success).toBe(true);
      expect(result.data).toBe("test-value");
    });

    it("should return null for missing item", async () => {
      mockBridge.getPassword.mockResolvedValue(null);

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
      mockBridge.getPassword.mockResolvedValue("value");
      expect(await storage.hasItem("key")).toBe(true);
    });

    it("should return false for missing item", async () => {
      mockBridge.getPassword.mockResolvedValue(null);
      expect(await storage.hasItem("missing")).toBe(false);
    });
  });

  describe("removeItem", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("should remove item successfully", async () => {
      mockBridge.deletePassword.mockResolvedValue(true);

      const result = await storage.removeItem("test-key");

      expect(result.success).toBe(true);
    });
  });

  describe("getAllKeys", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("should return all keys", async () => {
      mockBridge.findCredentials.mockResolvedValue([
        { account: "nchat_secure_key1", password: "val1" },
        { account: "nchat_secure_key2", password: "val2" },
      ]);

      const keys = await storage.getAllKeys();

      expect(keys).toEqual(["key1", "key2"]);
    });
  });

  describe("clear", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("should clear all items", async () => {
      mockBridge.findCredentials.mockResolvedValue([
        { account: "nchat_secure_key1", password: "val1" },
      ]);
      mockBridge.deletePassword.mockResolvedValue(true);

      const result = await storage.clear();

      expect(result.success).toBe(true);
    });
  });

  describe("authenticateBiometric", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("should authenticate successfully with Touch ID", async () => {
      mockElectron.systemPreferences.promptTouchID.mockResolvedValue(undefined);

      const result = await storage.authenticateBiometric(
        "Unlock secure storage",
      );

      expect(result.success).toBe(true);
    });

    it("should handle Touch ID failure", async () => {
      mockElectron.systemPreferences.promptTouchID.mockRejectedValue(
        new Error("Failed"),
      );

      const result = await storage.authenticateBiometric("Unlock");

      expect(result.success).toBe(false);
    });

    it("should handle Touch ID cancellation", async () => {
      mockElectron.systemPreferences.promptTouchID.mockRejectedValue(
        new Error("User cancel"),
      );

      const result = await storage.authenticateBiometric("Unlock");

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BIOMETRIC_CANCELLED");
    });

    it("should fail when Touch ID not available", async () => {
      mockElectron.systemPreferences.canPromptTouchID.mockReturnValue(false);
      const noAuthStorage = new macOSKeychainStorage();
      await noAuthStorage.initialize();

      const result = await noAuthStorage.authenticateBiometric("Unlock");

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BIOMETRIC_NOT_AVAILABLE");
    });
  });
});
