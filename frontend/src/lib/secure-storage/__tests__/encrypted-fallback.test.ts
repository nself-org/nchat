/**
 * Encrypted Fallback Storage Tests
 *
 * Tests for software-encrypted fallback storage.
 */

import {
  EncryptedFallbackStorage,
  createEncryptedFallbackStorage,
  isEncryptedFallbackAvailable,
} from "../encrypted-fallback";
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

// Mock crypto
const mockCryptoSubtle = {
  generateKey: jest.fn(),
  exportKey: jest.fn(),
  importKey: jest.fn(),
  encrypt: jest.fn(),
  decrypt: jest.fn(),
};

const mockGetRandomValues = jest.fn((arr: Uint8Array) => {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = Math.floor(Math.random() * 256);
  }
  return arr;
});

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

// Mock IndexedDB
let mockIDBData: Record<string, { key: string; value: unknown }> = {};
const createMockIDBRequest = <T>(result: T) => {
  const request = {
    result,
    error: null as DOMException | null,
    onsuccess: null as ((ev: Event) => void) | null,
    onerror: null as ((ev: Event) => void) | null,
    onupgradeneeded: null as ((ev: IDBVersionChangeEvent) => void) | null,
  };
  setTimeout(() => {
    if (request.onsuccess) request.onsuccess({} as Event);
  }, 0);
  return request;
};

const mockObjectStore = {
  put: jest.fn((data: { key: string; value: unknown }) => {
    mockIDBData[data.key] = data;
    return createMockIDBRequest(undefined);
  }),
  get: jest.fn((key: string) => {
    return createMockIDBRequest(mockIDBData[key] || undefined);
  }),
  delete: jest.fn((key: string) => {
    delete mockIDBData[key];
    return createMockIDBRequest(undefined);
  }),
  getAllKeys: jest.fn(() => {
    return createMockIDBRequest(Object.keys(mockIDBData));
  }),
};

const mockTransaction = {
  objectStore: jest.fn().mockReturnValue(mockObjectStore),
};

const mockDB = {
  transaction: jest.fn().mockReturnValue(mockTransaction),
  objectStoreNames: { contains: jest.fn().mockReturnValue(true) },
  createObjectStore: jest.fn(),
};

const mockIndexedDB = {
  open: jest.fn(() => {
    const request = createMockIDBRequest(mockDB);
    setTimeout(() => {
      if (request.onupgradeneeded) {
        const event = { target: request } as unknown as IDBVersionChangeEvent;
        request.onupgradeneeded(event);
      }
    }, 0);
    return request;
  }),
};

const originalCrypto = global.crypto;

beforeAll(() => {
  Object.defineProperty(global, "crypto", {
    value: {
      subtle: mockCryptoSubtle,
      getRandomValues: mockGetRandomValues,
    },
    writable: true,
  });

  Object.defineProperty(global, "localStorage", {
    value: mockLocalStorage,
    writable: true,
  });

  Object.defineProperty(global, "indexedDB", {
    value: mockIndexedDB,
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
  Object.keys(localStorageData).forEach((key) => delete localStorageData[key]);
  mockIDBData = {};

  // Default mock implementations
  mockCryptoSubtle.generateKey.mockResolvedValue({} as CryptoKey);
  mockCryptoSubtle.exportKey.mockResolvedValue({ k: "test-key" });
  mockCryptoSubtle.importKey.mockResolvedValue({} as CryptoKey);
  mockCryptoSubtle.encrypt.mockResolvedValue(new ArrayBuffer(48));
  mockCryptoSubtle.decrypt.mockResolvedValue(
    new TextEncoder().encode("test-value").buffer,
  );
});

// ============================================================================
// Platform Detection Tests
// ============================================================================

describe("isEncryptedFallbackAvailable", () => {
  it("should return true when crypto and IndexedDB available", () => {
    expect(isEncryptedFallbackAvailable()).toBe(true);
  });

  it("should return false when crypto not available", () => {
    const originalCrypto = global.crypto;
    // @ts-ignore
    delete global.crypto;
    expect(isEncryptedFallbackAvailable()).toBe(false);
    Object.defineProperty(global, "crypto", {
      value: originalCrypto,
      writable: true,
    });
  });

  it("should return false when IndexedDB not available", () => {
    const originalIndexedDB = global.indexedDB;
    Object.defineProperty(global, "indexedDB", {
      value: undefined,
      writable: true,
    });
    expect(isEncryptedFallbackAvailable()).toBe(false);
    Object.defineProperty(global, "indexedDB", {
      value: originalIndexedDB,
      writable: true,
    });
  });
});

describe("createEncryptedFallbackStorage", () => {
  it("should create storage instance", () => {
    const storage = createEncryptedFallbackStorage();
    expect(storage).toBeInstanceOf(EncryptedFallbackStorage);
    expect(storage.os).toBe("web");
  });

  it("should accept custom service", () => {
    const storage = createEncryptedFallbackStorage("custom.service");
    expect(storage).toBeInstanceOf(EncryptedFallbackStorage);
  });
});

// ============================================================================
// EncryptedFallbackStorage Tests
// ============================================================================

describe("EncryptedFallbackStorage", () => {
  let storage: EncryptedFallbackStorage;

  beforeEach(() => {
    storage = new EncryptedFallbackStorage();
  });

  describe("initialization", () => {
    it("should initialize successfully", async () => {
      await expect(storage.initialize()).resolves.toBeUndefined();
      expect(storage.isInitialized()).toBe(true);
    });

    it("should generate encryption key", async () => {
      await storage.initialize();
      expect(mockCryptoSubtle.generateKey).toHaveBeenCalled();
    });

    it("should load existing encryption key", async () => {
      localStorageData["__secure_storage_encryption_key__"] = JSON.stringify({
        k: "existing",
      });
      await storage.initialize();
      expect(mockCryptoSubtle.importKey).toHaveBeenCalled();
    });

    it("should not reinitialize", async () => {
      await storage.initialize();
      await storage.initialize();
      expect(mockCryptoSubtle.generateKey).toHaveBeenCalledTimes(1);
    });
  });

  describe("getCapabilities", () => {
    it("should return web capabilities", async () => {
      await storage.initialize();
      const caps = await storage.getCapabilities();

      expect(caps.hardwareStorage).toBe(false);
      expect(caps.secureEnclave).toBe(false);
      expect(caps.syncSupported).toBe(false);
      expect(caps.os).toBe("web");
      expect(caps.securityLevel).toBe("encrypted");
    });
  });

  describe("setItem", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("should store item with encryption", async () => {
      const result = await storage.setItem("test-key", "test-value");

      expect(result.success).toBe(true);
      expect(mockCryptoSubtle.encrypt).toHaveBeenCalled();
    });

    it("should store metadata", async () => {
      const result = await storage.setItem("test-key", "test-value", {
        requireBiometric: true,
      });

      expect(result.success).toBe(true);
      expect(result.meta?.biometricProtected).toBe(true);
      expect(result.meta?.securityLevel).toBe("encrypted");
    });

    it("should handle encryption failure", async () => {
      mockCryptoSubtle.encrypt.mockRejectedValue(
        new Error("Encryption failed"),
      );

      const result = await storage.setItem("test-key", "test-value");

      expect(result.success).toBe(false);
    });
  });

  describe("getItem", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("should retrieve and decrypt item", async () => {
      mockCryptoSubtle.decrypt.mockResolvedValue(
        new TextEncoder().encode("test-value").buffer,
      );

      // Store item first
      await storage.setItem("test-key", "test-value");

      const result = await storage.getItem("test-key");

      expect(result.success).toBe(true);
      expect(mockCryptoSubtle.decrypt).toHaveBeenCalled();
    });

    it("should return null for missing item", async () => {
      const result = await storage.getItem("non-existent");

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it("should handle decryption failure", async () => {
      await storage.setItem("test-key", "test-value");
      mockCryptoSubtle.decrypt.mockRejectedValue(
        new Error("Decryption failed"),
      );

      const result = await storage.getItem("test-key");

      expect(result.success).toBe(false);
    });
  });

  describe("hasItem", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("should return true for existing item", async () => {
      await storage.setItem("key", "value");
      expect(await storage.hasItem("key")).toBe(true);
    });

    it("should return false for missing item", async () => {
      expect(await storage.hasItem("missing")).toBe(false);
    });
  });

  describe("removeItem", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("should remove item", async () => {
      await storage.setItem("test-key", "value");
      const result = await storage.removeItem("test-key");

      expect(result.success).toBe(true);
      expect(await storage.hasItem("test-key")).toBe(false);
    });
  });

  describe("getAllKeys", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("should return all keys", async () => {
      await storage.setItem("key1", "value1");
      await storage.setItem("key2", "value2");

      const keys = await storage.getAllKeys();

      expect(keys).toContain("key1");
      expect(keys).toContain("key2");
    });

    it("should filter metadata keys", async () => {
      await storage.setItem("data", "value");

      const keys = await storage.getAllKeys();

      expect(keys.some((k) => k.endsWith("_meta"))).toBe(false);
    });
  });

  describe("clear", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("should clear all items", async () => {
      await storage.setItem("key1", "value1");
      await storage.setItem("key2", "value2");

      const result = await storage.clear();

      expect(result.success).toBe(true);
    });
  });

  describe("getItemMeta", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("should return item metadata", async () => {
      mockCryptoSubtle.decrypt.mockResolvedValue(
        new TextEncoder().encode(
          JSON.stringify({
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
            securityLevel: "encrypted",
            biometricProtected: false,
            synchronizable: false,
            accessControl: "whenUnlocked",
            service: "test",
            account: "test",
          }),
        ).buffer,
      );

      await storage.setItem("test-key", "value");
      const meta = await storage.getItemMeta("test-key");

      expect(meta).toBeDefined();
      expect(meta?.securityLevel).toBe("encrypted");
    });

    it("should return null for non-existent key", async () => {
      const meta = await storage.getItemMeta("non-existent");
      expect(meta).toBeNull();
    });
  });

  describe("isBiometricAvailable", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("should check WebAuthn availability", async () => {
      const available = await storage.isBiometricAvailable();
      expect(typeof available).toBe("boolean");
    });
  });
});
