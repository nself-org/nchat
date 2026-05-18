/**
 * Windows Credential Manager Storage Tests
 *
 * Tests for Windows Credential Manager integration.
 */

import {
  WindowsCredentialManagerStorage,
  isWindowsCredentialManagerAvailable,
  createWindowsCredentialManagerStorage,
} from "../credential-manager-windows";
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

const mockCredentialBridge = {
  setPassword: jest.fn(),
  getPassword: jest.fn(),
  deletePassword: jest.fn(),
  findCredentials: jest.fn(),
  isAvailable: jest.fn(),
};

const mockHelloBridge = {
  isAvailable: jest.fn(),
  authenticate: jest.fn(),
  getBiometricType: jest.fn(),
};

const mockElectron = {
  keytar: mockCredentialBridge,
  windowsHello: mockHelloBridge,
  tpm: {
    isAvailable: jest.fn(),
  },
};

const originalGlobalThis = { ...globalThis };

beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(globalThis, {
    electron: mockElectron,
    process: { platform: "win32" },
  });
  mockCredentialBridge.isAvailable.mockResolvedValue(true);
  mockHelloBridge.isAvailable.mockResolvedValue(true);
  mockHelloBridge.getBiometricType.mockResolvedValue("fingerprint");
  mockElectron.tpm.isAvailable.mockResolvedValue(false);
});

afterAll(() => {
  Object.assign(globalThis, originalGlobalThis);
});

// ============================================================================
// Platform Detection Tests
// ============================================================================

describe("isWindowsCredentialManagerAvailable", () => {
  it("should return true on Windows with Electron", () => {
    expect(isWindowsCredentialManagerAvailable()).toBe(true);
  });

  it("should return false on non-Windows platform", () => {
    Object.assign(globalThis, { process: { platform: "darwin" } });
    expect(isWindowsCredentialManagerAvailable()).toBe(false);
  });

  it("should return false without Electron", () => {
    Object.assign(globalThis, { electron: undefined });
    expect(isWindowsCredentialManagerAvailable()).toBe(false);
  });
});

describe("createWindowsCredentialManagerStorage", () => {
  it("should create storage instance", () => {
    const storage = createWindowsCredentialManagerStorage();
    expect(storage).toBeInstanceOf(WindowsCredentialManagerStorage);
    expect(storage.os).toBe("windows");
  });
});

// ============================================================================
// WindowsCredentialManagerStorage Tests
// ============================================================================

describe("WindowsCredentialManagerStorage", () => {
  let storage: WindowsCredentialManagerStorage;

  beforeEach(() => {
    storage = new WindowsCredentialManagerStorage();
  });

  describe("initialization", () => {
    it("should initialize successfully", async () => {
      await expect(storage.initialize()).resolves.toBeUndefined();
      expect(storage.isInitialized()).toBe(true);
    });

    it("should detect Windows Hello", async () => {
      mockHelloBridge.isAvailable.mockResolvedValue(true);
      await storage.initialize();
      expect(await storage.isBiometricAvailable()).toBe(true);
    });

    it("should handle no Windows Hello", async () => {
      mockHelloBridge.isAvailable.mockResolvedValue(false);
      await storage.initialize();
      expect(await storage.isBiometricAvailable()).toBe(false);
    });

    it("should detect TPM availability", async () => {
      mockElectron.tpm.isAvailable.mockResolvedValue(true);
      await storage.initialize();
      const caps = await storage.getCapabilities();
      expect(caps.hardwareStorage).toBe(true);
      expect(caps.secureEnclave).toBe(true);
    });

    it("should throw if not available", async () => {
      mockCredentialBridge.isAvailable.mockResolvedValue(false);
      await expect(storage.initialize()).rejects.toThrow(SecureStorageError);
    });
  });

  describe("getCapabilities", () => {
    it("should return Windows capabilities without TPM", async () => {
      mockElectron.tpm.isAvailable.mockResolvedValue(false);
      await storage.initialize();
      const caps = await storage.getCapabilities();

      expect(caps.hardwareStorage).toBe(false);
      expect(caps.secureEnclave).toBe(false);
      expect(caps.syncSupported).toBe(false);
      expect(caps.os).toBe("windows");
      expect(caps.securityLevel).toBe("system");
    });

    it("should return Windows capabilities with TPM", async () => {
      mockElectron.tpm.isAvailable.mockResolvedValue(true);
      await storage.initialize();
      const caps = await storage.getCapabilities();

      expect(caps.hardwareStorage).toBe(true);
      expect(caps.secureEnclave).toBe(true);
      expect(caps.securityLevel).toBe("hardware");
    });
  });

  describe("setItem", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("should store item successfully", async () => {
      mockCredentialBridge.setPassword.mockResolvedValue(true);

      const result = await storage.setItem("test-key", "test-value");

      expect(result.success).toBe(true);
      expect(mockCredentialBridge.setPassword).toHaveBeenCalled();
    });

    it("should handle storage failure", async () => {
      mockCredentialBridge.setPassword.mockResolvedValue(false);

      const result = await storage.setItem("test-key", "test-value");

      expect(result.success).toBe(false);
    });
  });

  describe("getItem", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("should retrieve item successfully", async () => {
      mockCredentialBridge.getPassword.mockResolvedValue("test-value");

      const result = await storage.getItem("test-key");

      expect(result.success).toBe(true);
      expect(result.data).toBe("test-value");
    });

    it("should return null for missing item", async () => {
      mockCredentialBridge.getPassword.mockResolvedValue(null);

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
      mockCredentialBridge.getPassword.mockResolvedValue("value");
      expect(await storage.hasItem("key")).toBe(true);
    });

    it("should return false for missing item", async () => {
      mockCredentialBridge.getPassword.mockResolvedValue(null);
      expect(await storage.hasItem("missing")).toBe(false);
    });
  });

  describe("removeItem", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("should remove item successfully", async () => {
      mockCredentialBridge.deletePassword.mockResolvedValue(true);

      const result = await storage.removeItem("test-key");

      expect(result.success).toBe(true);
    });
  });

  describe("getAllKeys", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("should return all keys", async () => {
      mockCredentialBridge.findCredentials.mockResolvedValue([
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
      mockCredentialBridge.findCredentials.mockResolvedValue([
        { account: "nchat_secure_key1", password: "val1" },
      ]);
      mockCredentialBridge.deletePassword.mockResolvedValue(true);

      const result = await storage.clear();

      expect(result.success).toBe(true);
    });
  });

  describe("authenticateBiometric", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("should authenticate successfully with Windows Hello", async () => {
      mockHelloBridge.authenticate.mockResolvedValue(true);

      const result = await storage.authenticateBiometric("Unlock");

      expect(result.success).toBe(true);
    });

    it("should handle Windows Hello failure", async () => {
      mockHelloBridge.authenticate.mockResolvedValue(false);

      const result = await storage.authenticateBiometric("Unlock");

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BIOMETRIC_FAILED");
    });

    it("should handle Windows Hello cancellation", async () => {
      mockHelloBridge.authenticate.mockRejectedValue(
        new Error("User cancelled"),
      );

      const result = await storage.authenticateBiometric("Unlock");

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BIOMETRIC_CANCELLED");
    });

    it("should fail when Windows Hello not available", async () => {
      mockHelloBridge.isAvailable.mockResolvedValue(false);
      const noAuthStorage = new WindowsCredentialManagerStorage();
      await noAuthStorage.initialize();

      const result = await noAuthStorage.authenticateBiometric("Unlock");

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BIOMETRIC_NOT_AVAILABLE");
    });
  });
});
