/**
 * Key Recovery System Tests
 *
 * Comprehensive tests for recovery codes, backup/restore, and social recovery.
 */

import {
  KeyRecoveryManager,
  RecoveryCode,
  EncryptedBackup,
  RecoveryGuardian,
  generateRecoveryCode,
  formatRecoveryCode,
  normalizeRecoveryCode,
  hashRecoveryCode,
  deriveKeyFromPassword,
  isValidRecoveryCodeFormat,
  getRecoveryManager,
} from "../key-recovery";
import { KeyPair, exportKeyPair, importKeyPair } from "../key-manager";

// ============================================================================
// Mock Setup
// ============================================================================

// Mock localStorage
const localStorageData: Record<string, string> = {};
const mockLocalStorage = {
  getItem: jest.fn((key: string) => localStorageData[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    localStorageData[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete localStorageData[key];
  }),
  clear: jest.fn(() => {
    Object.keys(localStorageData).forEach(
      (key) => delete localStorageData[key],
    );
  }),
  get length() {
    return Object.keys(localStorageData).length;
  },
  key: jest.fn((index: number) => Object.keys(localStorageData)[index] || null),
};

Object.defineProperty(global, "localStorage", {
  value: mockLocalStorage,
  writable: true,
});

// Track generated hashes for consistent behavior
const codeHashMap = new Map<string, ArrayBuffer>();

// Create digest implementation that produces unique hashes per input
const digestImplementation = (_algorithm: string, data: ArrayBuffer) => {
  const inputStr = new TextDecoder().decode(new Uint8Array(data));
  if (!codeHashMap.has(inputStr)) {
    // Create unique hash for this input based on content
    const hash = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      hash[i] = (inputStr.charCodeAt(i % inputStr.length) + i * 7) % 256;
    }
    codeHashMap.set(inputStr, hash.buffer);
  }
  return Promise.resolve(codeHashMap.get(inputStr)!);
};

// Mock crypto
const mockCryptoSubtle = {
  generateKey: jest.fn(),
  exportKey: jest.fn(),
  importKey: jest.fn(),
  encrypt: jest.fn(),
  decrypt: jest.fn(),
  digest: jest.fn(digestImplementation),
  deriveBits: jest.fn(),
  deriveKey: jest.fn(),
  sign: jest.fn(),
};

const originalCrypto = global.crypto;
const mockGetRandomValues = jest.fn((arr: Uint8Array) => {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = Math.floor(Math.random() * 256);
  }
  return arr;
});

beforeAll(() => {
  Object.defineProperty(global, "crypto", {
    value: {
      subtle: mockCryptoSubtle,
      getRandomValues: mockGetRandomValues,
    },
    writable: true,
  });
});

afterAll(() => {
  Object.defineProperty(global, "crypto", {
    value: originalCrypto,
    writable: true,
  });
});

beforeEach(() => {
  jest.clearAllMocks();
  codeHashMap.clear();
  Object.keys(localStorageData).forEach((key) => delete localStorageData[key]);
  KeyRecoveryManager.resetInstance();

  // Restore digest implementation after clearAllMocks
  mockCryptoSubtle.digest.mockImplementation(digestImplementation);

  // Default mock implementations
  mockCryptoSubtle.generateKey.mockResolvedValue({} as CryptoKey);
  mockCryptoSubtle.exportKey.mockResolvedValue({ k: "test-key" });
  mockCryptoSubtle.importKey.mockResolvedValue({} as CryptoKey);
  mockCryptoSubtle.encrypt.mockResolvedValue(new ArrayBuffer(48));
  mockCryptoSubtle.decrypt.mockResolvedValue(
    new TextEncoder().encode("decrypted").buffer,
  );
  mockCryptoSubtle.deriveKey.mockResolvedValue({} as CryptoKey);
  mockCryptoSubtle.sign.mockResolvedValue(new ArrayBuffer(32));
});

// ============================================================================
// Recovery Code Generation Tests
// ============================================================================

describe("Recovery Code Generation", () => {
  describe("generateRecoveryCode", () => {
    it("should generate code with default length", () => {
      const code = generateRecoveryCode();

      // Default is 8 characters, formatted as XXXX-XXXX
      expect(code.replace("-", "").length).toBe(8);
    });

    it("should generate code with custom length", () => {
      const code = generateRecoveryCode(12);

      expect(code.length).toBe(12);
    });

    it("should only use allowed characters", () => {
      const code = generateRecoveryCode();
      const cleanCode = code.replace(/-/g, "");
      const allowedChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

      for (const char of cleanCode) {
        expect(allowedChars).toContain(char);
      }
    });

    it("should not include confusable characters", () => {
      // Generate many codes to ensure no I, O, 0, 1
      for (let i = 0; i < 100; i++) {
        const code = generateRecoveryCode();
        expect(code).not.toContain("I");
        expect(code).not.toContain("O");
        expect(code).not.toContain("0");
        expect(code).not.toContain("1");
      }
    });

    it("should format 8-character codes with dash", () => {
      const code = generateRecoveryCode(8);

      expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    });
  });

  describe("formatRecoveryCode", () => {
    it("should format code with dashes", () => {
      const formatted = formatRecoveryCode("ABCD1234");

      expect(formatted).toBe("ABCD-1234");
    });

    it("should handle already formatted codes", () => {
      const formatted = formatRecoveryCode("ABCD-1234");

      expect(formatted).toBe("ABCD-1234");
    });

    it("should uppercase the code", () => {
      const formatted = formatRecoveryCode("abcd1234");

      expect(formatted).toBe("ABCD-1234");
    });

    it("should remove extra spaces", () => {
      const formatted = formatRecoveryCode("ABCD 1234");

      expect(formatted).toBe("ABCD-1234");
    });
  });

  describe("normalizeRecoveryCode", () => {
    it("should remove dashes and spaces", () => {
      const normalized = normalizeRecoveryCode("ABCD-1234");

      expect(normalized).toBe("ABCD1234");
    });

    it("should uppercase the code", () => {
      const normalized = normalizeRecoveryCode("abcd-1234");

      expect(normalized).toBe("ABCD1234");
    });

    it("should handle multiple formats", () => {
      expect(normalizeRecoveryCode("abcd 1234")).toBe("ABCD1234");
      expect(normalizeRecoveryCode("ABCD1234")).toBe("ABCD1234");
      expect(normalizeRecoveryCode("a-b-c-d")).toBe("ABCD");
    });
  });

  describe("hashRecoveryCode", () => {
    it("should return hex string", async () => {
      mockCryptoSubtle.digest.mockResolvedValue(
        new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer,
      );

      const hash = await hashRecoveryCode("ABCD-1234");

      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it("should normalize before hashing", async () => {
      await hashRecoveryCode("abcd-1234");

      const digestCall = mockCryptoSubtle.digest.mock.calls[0];
      const data = new TextDecoder().decode(digestCall[1]);
      expect(data).toBe("ABCD1234");
    });

    it("should produce consistent hashes", async () => {
      const hash1 = await hashRecoveryCode("ABCD-1234");
      const hash2 = await hashRecoveryCode("abcd 1234");

      expect(hash1).toBe(hash2);
    });
  });

  describe("isValidRecoveryCodeFormat", () => {
    it("should accept valid codes", () => {
      expect(isValidRecoveryCodeFormat("ABCD-EFGH")).toBe(true);
      expect(isValidRecoveryCodeFormat("ABCDEFGH")).toBe(true);
      expect(isValidRecoveryCodeFormat("2345-6789")).toBe(true);
    });

    it("should reject too short codes", () => {
      expect(isValidRecoveryCodeFormat("ABCDE")).toBe(false);
    });

    it("should reject too long codes", () => {
      expect(isValidRecoveryCodeFormat("ABCDEFGHIJKLMNOPQR")).toBe(false);
    });

    it("should reject codes with invalid characters", () => {
      expect(isValidRecoveryCodeFormat("ABCD-0000")).toBe(false); // 0 not allowed
      expect(isValidRecoveryCodeFormat("ABCD-1111")).toBe(false); // 1 not allowed
      expect(isValidRecoveryCodeFormat("ABCD-OOOO")).toBe(false); // O not allowed
      expect(isValidRecoveryCodeFormat("ABCD-IIII")).toBe(false); // I not allowed
    });
  });
});

// ============================================================================
// Password Derivation Tests
// ============================================================================

describe("Password Derivation", () => {
  describe("deriveKeyFromPassword", () => {
    it("should derive key with default iterations", async () => {
      const salt = new Uint8Array(32);
      mockGetRandomValues(salt);

      await deriveKeyFromPassword("test-password", salt);

      expect(mockCryptoSubtle.importKey).toHaveBeenCalled();
      expect(mockCryptoSubtle.deriveKey).toHaveBeenCalled();
    });

    it("should use PBKDF2 algorithm", async () => {
      const salt = new Uint8Array(32);
      await deriveKeyFromPassword("test-password", salt);

      const deriveKeyCall = mockCryptoSubtle.deriveKey.mock.calls[0];
      expect(deriveKeyCall[0].name).toBe("PBKDF2");
    });

    it("should use SHA-256 hash", async () => {
      const salt = new Uint8Array(32);
      await deriveKeyFromPassword("test-password", salt);

      const deriveKeyCall = mockCryptoSubtle.deriveKey.mock.calls[0];
      expect(deriveKeyCall[0].hash).toBe("SHA-256");
    });

    it("should support custom iteration count", async () => {
      const salt = new Uint8Array(32);
      await deriveKeyFromPassword("test-password", salt, 50000);

      const deriveKeyCall = mockCryptoSubtle.deriveKey.mock.calls[0];
      expect(deriveKeyCall[0].iterations).toBe(50000);
    });
  });
});

// ============================================================================
// Recovery Manager Tests
// ============================================================================

describe("KeyRecoveryManager", () => {
  describe("getInstance", () => {
    it("should return singleton instance", () => {
      const instance1 = KeyRecoveryManager.getInstance();
      const instance2 = KeyRecoveryManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should accept custom configuration", () => {
      const instance = KeyRecoveryManager.getInstance({
        recoveryCodeCount: 5,
        maxRecoveryAttempts: 3,
      });

      expect(instance.getConfig().recoveryCodeCount).toBe(5);
    });
  });

  describe("initialize", () => {
    it("should initialize successfully", async () => {
      const manager = getRecoveryManager();
      await expect(manager.initialize()).resolves.toBeUndefined();
    });

    it("should not reinitialize", async () => {
      const manager = getRecoveryManager();
      await manager.initialize();
      await manager.initialize();

      // No error means success
    });
  });

  describe("getState", () => {
    it("should return recovery state", async () => {
      const manager = getRecoveryManager();
      await manager.initialize();

      const state = await manager.getState();

      expect(state).toHaveProperty("isSetUp");
      expect(state).toHaveProperty("availableMethods");
      expect(state).toHaveProperty("unusedRecoveryCodes");
    });

    it("should show not set up initially", async () => {
      const manager = getRecoveryManager();
      await manager.initialize();

      const state = await manager.getState();

      expect(state.isSetUp).toBe(false);
      expect(state.unusedRecoveryCodes).toBe(0);
    });
  });
});

// ============================================================================
// Recovery Code Management Tests
// ============================================================================

describe("Recovery Code Management", () => {
  describe("generateRecoveryCodes", () => {
    it("should generate configured number of codes", async () => {
      const manager = getRecoveryManager({ recoveryCodeCount: 5 });
      await manager.initialize();

      const codes = await manager.generateRecoveryCodes();

      expect(codes.length).toBe(5);
    });

    it("should return formatted codes", async () => {
      const manager = getRecoveryManager();
      await manager.initialize();

      const codes = await manager.generateRecoveryCodes();

      for (const code of codes) {
        expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      }
    });

    it("should update state after generation", async () => {
      const manager = getRecoveryManager({ recoveryCodeCount: 10 });
      await manager.initialize();

      await manager.generateRecoveryCodes();
      const state = await manager.getState();

      expect(state.isSetUp).toBe(true);
      expect(state.unusedRecoveryCodes).toBe(10);
    });
  });

  describe("verifyRecoveryCode", () => {
    it("should verify valid code", async () => {
      const manager = getRecoveryManager();
      await manager.initialize();

      const codes = await manager.generateRecoveryCodes();
      const result = await manager.verifyRecoveryCode(codes[0]);

      expect(result.valid).toBe(true);
      expect(result.codeIndex).toBe(0);
    });

    it("should reject invalid code", async () => {
      const manager = getRecoveryManager();
      await manager.initialize();

      await manager.generateRecoveryCodes();
      const result = await manager.verifyRecoveryCode("INVALID-CODE");

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should reject already used code", async () => {
      const manager = getRecoveryManager();
      await manager.initialize();

      const codes = await manager.generateRecoveryCodes();
      await manager.verifyRecoveryCode(codes[0]);

      const result = await manager.verifyRecoveryCode(codes[0]);

      expect(result.valid).toBe(false);
    });

    it("should decrement unused count after use", async () => {
      const manager = getRecoveryManager({ recoveryCodeCount: 10 });
      await manager.initialize();

      const codes = await manager.generateRecoveryCodes();
      await manager.verifyRecoveryCode(codes[0]);

      const state = await manager.getState();
      expect(state.unusedRecoveryCodes).toBe(9);
    });
  });
});

// ============================================================================
// Backup/Restore Tests
// ============================================================================

describe("Key Backup and Restore", () => {
  const mockKeyPair: KeyPair = {
    publicKey: {} as CryptoKey,
    privateKey: {} as CryptoKey,
  };

  describe("createBackup", () => {
    it("should create encrypted backup", async () => {
      const manager = getRecoveryManager();
      await manager.initialize();

      mockCryptoSubtle.exportKey
        .mockResolvedValueOnce({ x: "pub-x", y: "pub-y" })
        .mockResolvedValueOnce({ x: "pub-x", y: "pub-y", d: "priv-d" });

      const backup = await manager.createBackup(
        mockKeyPair,
        "test-password",
        "device-123",
        1,
      );

      expect(backup.version).toBe(1);
      expect(backup.algorithm).toBe("AES-256-GCM");
      expect(backup.encryptedData).toBeDefined();
      expect(backup.salt).toBeDefined();
      expect(backup.iv).toBeDefined();
      expect(backup.hmac).toBeDefined();
    });

    it("should include device and version info", async () => {
      const manager = getRecoveryManager();
      await manager.initialize();

      mockCryptoSubtle.exportKey.mockResolvedValue({ x: "test" });

      const backup = await manager.createBackup(
        mockKeyPair,
        "password",
        "device-456",
        3,
      );

      expect(backup.deviceId).toBe("device-456");
      expect(backup.keyVersion).toBe(3);
    });
  });

  describe("restoreFromBackup", () => {
    it("should restore with correct password", async () => {
      const manager = getRecoveryManager();
      await manager.initialize();

      // Mock successful decryption
      const mockDecrypted = JSON.stringify({
        publicKey: { x: "test" },
        privateKey: { x: "test", d: "priv" },
      });
      mockCryptoSubtle.decrypt.mockResolvedValue(
        new TextEncoder().encode(mockDecrypted).buffer,
      );

      // Return consistent HMAC signature
      const hmacSignature = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer;
      mockCryptoSubtle.sign.mockResolvedValue(hmacSignature);

      // The computed HMAC will be base64 of the signature
      const computedHmac = btoa(
        String.fromCharCode(...new Uint8Array(hmacSignature)),
      );

      const backup: EncryptedBackup = {
        version: 1,
        algorithm: "AES-256-GCM",
        salt: btoa("saltsaltsaltsaltsaltsaltsaltsalt"), // 32 bytes needed
        iv: btoa("iv12bytes123"),
        encryptedData: btoa("encrypted"),
        hmac: computedHmac, // Use matching HMAC
        createdAt: new Date().toISOString(),
        deviceId: "device-123",
        keyVersion: 1,
      };

      const result = await manager.restoreFromBackup(backup, "test-password");

      expect(result.success).toBe(true);
      expect(result.keyPair).toBeDefined();
    });

    it("should fail with wrong password", async () => {
      const manager = getRecoveryManager();
      await manager.initialize();

      // Mock HMAC mismatch
      mockCryptoSubtle.sign
        .mockResolvedValueOnce(new ArrayBuffer(32)) // For verification
        .mockResolvedValueOnce(new ArrayBuffer(16)); // Different result

      const backup: EncryptedBackup = {
        version: 1,
        algorithm: "AES-256-GCM",
        salt: btoa("salt"),
        iv: btoa("iv12bytes123"),
        encryptedData: btoa("encrypted"),
        hmac: btoa("different-hmac"),
        createdAt: new Date().toISOString(),
        deviceId: "device-123",
        keyVersion: 1,
      };

      const result = await manager.restoreFromBackup(backup, "wrong-password");

      expect(result.success).toBe(false);
      expect(result.error).toContain("integrity check failed");
    });

    it("should reject unsupported backup version", async () => {
      const manager = getRecoveryManager();
      await manager.initialize();

      const backup: EncryptedBackup = {
        version: 99,
        algorithm: "AES-256-GCM",
        salt: btoa("salt"),
        iv: btoa("iv"),
        encryptedData: btoa("data"),
        hmac: btoa("hmac"),
        createdAt: new Date().toISOString(),
        deviceId: "device",
        keyVersion: 1,
      };

      const result = await manager.restoreFromBackup(backup, "password");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unsupported backup version");
    });
  });

  describe("exportBackupAsFile", () => {
    it("should export as JSON string", async () => {
      const manager = getRecoveryManager();

      const backup: EncryptedBackup = {
        version: 1,
        algorithm: "AES-256-GCM",
        salt: "test-salt",
        iv: "test-iv",
        encryptedData: "test-data",
        hmac: "test-hmac",
        createdAt: "2025-01-01T00:00:00Z",
        deviceId: "device-123",
        keyVersion: 1,
      };

      const fileContent = manager.exportBackupAsFile(backup);

      expect(() => JSON.parse(fileContent)).not.toThrow();
    });
  });

  describe("importBackupFromFile", () => {
    it("should import valid backup file", () => {
      const manager = getRecoveryManager();

      const backup: EncryptedBackup = {
        version: 1,
        algorithm: "AES-256-GCM",
        salt: "test-salt",
        iv: "test-iv",
        encryptedData: "test-data",
        hmac: "test-hmac",
        createdAt: "2025-01-01T00:00:00Z",
        deviceId: "device-123",
        keyVersion: 1,
      };

      const imported = manager.importBackupFromFile(JSON.stringify(backup));

      expect(imported).toEqual(backup);
    });

    it("should return null for invalid JSON", () => {
      const manager = getRecoveryManager();

      const imported = manager.importBackupFromFile("not json");

      expect(imported).toBeNull();
    });

    it("should return null for missing fields", () => {
      const manager = getRecoveryManager();

      const imported = manager.importBackupFromFile('{"version": 1}');

      expect(imported).toBeNull();
    });
  });
});

// ============================================================================
// Guardian Management Tests
// ============================================================================

describe("Social Recovery Guardians", () => {
  describe("addGuardian", () => {
    it("should add guardian", async () => {
      const manager = getRecoveryManager({ enableSocialRecovery: true });
      await manager.initialize();

      const guardian = await manager.addGuardian(
        "John Doe",
        "john@example.com",
        "public-key-here",
      );

      expect(guardian.id).toBeDefined();
      expect(guardian.name).toBe("John Doe");
      expect(guardian.confirmed).toBe(false);
    });

    it("should enforce maximum guardians", async () => {
      const manager = getRecoveryManager({
        enableSocialRecovery: true,
        socialRecoveryGuardians: 2,
      });
      await manager.initialize();

      await manager.addGuardian("Guardian 1", "g1@example.com", "key1");
      await manager.addGuardian("Guardian 2", "g2@example.com", "key2");

      await expect(
        manager.addGuardian("Guardian 3", "g3@example.com", "key3"),
      ).rejects.toThrow("Maximum number of guardians");
    });
  });

  describe("confirmGuardian", () => {
    it("should confirm guardian", async () => {
      const manager = getRecoveryManager({ enableSocialRecovery: true });
      await manager.initialize();

      const guardian = await manager.addGuardian(
        "Jane Doe",
        "jane@example.com",
        "key",
      );

      const result = await manager.confirmGuardian(guardian.id);

      expect(result).toBe(true);

      const guardians = manager.getGuardians();
      expect(guardians.find((g) => g.id === guardian.id)?.confirmed).toBe(true);
    });

    it("should return false for unknown guardian", async () => {
      const manager = getRecoveryManager({ enableSocialRecovery: true });
      await manager.initialize();

      const result = await manager.confirmGuardian("unknown-id");

      expect(result).toBe(false);
    });
  });

  describe("removeGuardian", () => {
    it("should remove guardian", async () => {
      const manager = getRecoveryManager({ enableSocialRecovery: true });
      await manager.initialize();

      const guardian = await manager.addGuardian(
        "Test",
        "test@example.com",
        "key",
      );

      const result = await manager.removeGuardian(guardian.id);

      expect(result).toBe(true);
      expect(manager.getGuardians()).toHaveLength(0);
    });

    it("should return false for unknown guardian", async () => {
      const manager = getRecoveryManager({ enableSocialRecovery: true });
      await manager.initialize();

      const result = await manager.removeGuardian("unknown-id");

      expect(result).toBe(false);
    });
  });
});

// ============================================================================
// Rate Limiting and Lockout Tests
// ============================================================================

describe("Rate Limiting and Lockout", () => {
  describe("lockout behavior", () => {
    it("should lock out after max attempts", async () => {
      const manager = getRecoveryManager({
        maxRecoveryAttempts: 3,
        lockoutDurationMinutes: 30,
      });
      await manager.initialize();

      await manager.generateRecoveryCodes();

      // Make failed attempts
      for (let i = 0; i < 3; i++) {
        await manager.verifyRecoveryCode("INVALID-CODE");
      }

      const state = await manager.getState();
      expect(state.isLockedOut).toBe(true);
    });

    it("should reject verification when locked out", async () => {
      const manager = getRecoveryManager({
        maxRecoveryAttempts: 1,
        lockoutDurationMinutes: 30,
      });
      await manager.initialize();

      const codes = await manager.generateRecoveryCodes();

      // Trigger lockout
      await manager.verifyRecoveryCode("INVALID");

      // Try valid code while locked
      const result = await manager.verifyRecoveryCode(codes[0]);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("locked");
    });
  });
});

// ============================================================================
// Configuration Tests
// ============================================================================

describe("Configuration", () => {
  describe("updateConfig", () => {
    it("should update configuration", () => {
      const manager = getRecoveryManager();

      manager.updateConfig({ maxRecoveryAttempts: 10 });

      expect(manager.getConfig().maxRecoveryAttempts).toBe(10);
    });

    it("should preserve other config values", () => {
      const manager = getRecoveryManager({ recoveryCodeCount: 15 });

      manager.updateConfig({ maxRecoveryAttempts: 10 });

      const config = manager.getConfig();
      expect(config.recoveryCodeCount).toBe(15);
      expect(config.maxRecoveryAttempts).toBe(10);
    });
  });

  describe("getConfig", () => {
    it("should return current configuration", () => {
      const manager = getRecoveryManager({
        recoveryCodeCount: 8,
        allowPasswordRecovery: false,
      });

      const config = manager.getConfig();

      expect(config.recoveryCodeCount).toBe(8);
      expect(config.allowPasswordRecovery).toBe(false);
    });
  });
});

// ============================================================================
// Cleanup Tests
// ============================================================================

describe("Cleanup", () => {
  describe("clearAllRecoveryData", () => {
    it("should clear all data", async () => {
      const manager = getRecoveryManager();
      await manager.initialize();

      await manager.generateRecoveryCodes();
      await manager.clearAllRecoveryData();

      const state = await manager.getState();
      expect(state.isSetUp).toBe(false);
      expect(state.unusedRecoveryCodes).toBe(0);
    });

    it("should clear guardians", async () => {
      const manager = getRecoveryManager({ enableSocialRecovery: true });
      await manager.initialize();

      await manager.addGuardian("Test", "test@example.com", "key");
      await manager.clearAllRecoveryData();

      expect(manager.getGuardians()).toHaveLength(0);
    });
  });
});
