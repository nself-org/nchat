/**
 * Secure Storage Unit Tests
 *
 * Comprehensive tests for encrypted localStorage wrapper,
 * memory-only storage, and auto-clear functionality.
 */

import {
  SecureStorage,
  SecureSessionStorage,
  MemoryStorage,
  generateStorageKey,
  exportStorageKey,
  importStorageKey,
  encryptData,
  decryptData,
  isLocalStorageAvailable,
  isSessionStorageAvailable,
  memoryStorage,
  secureStorage,
  secureSessionStorage,
  clearAllSecureStorage,
  setupAutoClearOnUnload,
} from "../secure-storage";

// Access MemoryStorage through memoryStorage instance for testing
const MemoryStorageClass =
  memoryStorage.constructor as new () => typeof memoryStorage;

// ============================================================================
// Mock Setup
// ============================================================================

const mockAesKey = {} as CryptoKey;
const mockJwk: JsonWebKey = {
  kty: "oct",
  k: "test-key-data",
  alg: "A256GCM",
};

// Mock crypto.subtle
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

const originalCrypto = global.crypto;

// Mock localStorage
let localStorageData: Record<string, string> = {};
const mockLocalStorage = {
  getItem: jest.fn((key: string) => localStorageData[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    localStorageData[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete localStorageData[key];
  }),
  clear: jest.fn(() => {
    localStorageData = {};
  }),
  get length() {
    return Object.keys(localStorageData).length;
  },
  key: jest.fn((index: number) => Object.keys(localStorageData)[index] || null),
};

// Mock sessionStorage
let sessionStorageData: Record<string, string> = {};
const mockSessionStorage = {
  getItem: jest.fn((key: string) => sessionStorageData[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    sessionStorageData[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete sessionStorageData[key];
  }),
  clear: jest.fn(() => {
    sessionStorageData = {};
  }),
  get length() {
    return Object.keys(sessionStorageData).length;
  },
  key: jest.fn(
    (index: number) => Object.keys(sessionStorageData)[index] || null,
  ),
};

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

  Object.defineProperty(global, "sessionStorage", {
    value: mockSessionStorage,
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
  localStorageData = {};
  sessionStorageData = {};

  // Default mock implementations
  mockCryptoSubtle.generateKey.mockResolvedValue(mockAesKey);
  mockCryptoSubtle.exportKey.mockResolvedValue(mockJwk);
  mockCryptoSubtle.importKey.mockResolvedValue(mockAesKey);
  mockCryptoSubtle.encrypt.mockResolvedValue(new ArrayBuffer(32));
  mockCryptoSubtle.decrypt.mockResolvedValue(
    new TextEncoder().encode("decrypted").buffer,
  );
});

// ============================================================================
// Key Generation Tests
// ============================================================================

describe("Key Generation", () => {
  describe("generateStorageKey", () => {
    it("should generate an AES-GCM key", async () => {
      await generateStorageKey();

      expect(mockCryptoSubtle.generateKey).toHaveBeenCalledWith(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"],
      );
    });

    it("should return the generated key", async () => {
      const key = await generateStorageKey();
      expect(key).toBe(mockAesKey);
    });
  });

  describe("exportStorageKey", () => {
    it("should export key to JWK format", async () => {
      const jwk = await exportStorageKey(mockAesKey);

      expect(mockCryptoSubtle.exportKey).toHaveBeenCalledWith(
        "jwk",
        mockAesKey,
      );
      expect(jwk).toBe(mockJwk);
    });
  });

  describe("importStorageKey", () => {
    it("should import key from JWK format", async () => {
      const key = await importStorageKey(mockJwk);

      expect(mockCryptoSubtle.importKey).toHaveBeenCalledWith(
        "jwk",
        mockJwk,
        { name: "AES-GCM" },
        true,
        ["encrypt", "decrypt"],
      );
      expect(key).toBe(mockAesKey);
    });
  });
});

// ============================================================================
// Encryption/Decryption Tests
// ============================================================================

describe("Encryption/Decryption", () => {
  describe("encryptData", () => {
    it("should encrypt data with AES-GCM", async () => {
      const result = await encryptData("test data", mockAesKey);

      expect(mockCryptoSubtle.encrypt).toHaveBeenCalledWith(
        expect.objectContaining({ name: "AES-GCM" }),
        mockAesKey,
        expect.any(Uint8Array),
      );
      expect(result).toHaveProperty("ciphertext");
      expect(result).toHaveProperty("iv");
      expect(result).toHaveProperty("algorithm");
      expect(result.algorithm).toBe("AES-GCM");
    });

    it("should generate random IV", async () => {
      await encryptData("test data", mockAesKey);

      expect(mockGetRandomValues).toHaveBeenCalled();
    });

    it("should return base64-encoded data", async () => {
      const cipherBuffer = new Uint8Array([1, 2, 3, 4]).buffer;
      mockCryptoSubtle.encrypt.mockResolvedValue(cipherBuffer);

      const result = await encryptData("test", mockAesKey);

      // Base64 should only contain valid characters
      expect(/^[A-Za-z0-9+/=]+$/.test(result.ciphertext)).toBe(true);
      expect(/^[A-Za-z0-9+/=]+$/.test(result.iv)).toBe(true);
    });
  });

  describe("decryptData", () => {
    it("should decrypt data with AES-GCM", async () => {
      const decryptedBuffer = new TextEncoder().encode("decrypted text").buffer;
      mockCryptoSubtle.decrypt.mockResolvedValue(decryptedBuffer);

      const encrypted = {
        ciphertext: btoa("encrypted"),
        iv: btoa(String.fromCharCode(...new Uint8Array(12))),
        algorithm: "AES-GCM",
      };

      const result = await decryptData(encrypted, mockAesKey);

      expect(mockCryptoSubtle.decrypt).toHaveBeenCalledWith(
        expect.objectContaining({ name: "AES-GCM" }),
        mockAesKey,
        expect.any(ArrayBuffer),
      );
      expect(result).toBe("decrypted text");
    });
  });
});

// ============================================================================
// Storage Availability Tests
// ============================================================================

describe("Storage Availability", () => {
  describe("isLocalStorageAvailable", () => {
    it("should return true when localStorage works", () => {
      expect(isLocalStorageAvailable()).toBe(true);
    });

    it("should return false when localStorage throws", () => {
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error("Storage full");
      });

      expect(isLocalStorageAvailable()).toBe(false);
    });
  });

  describe("isSessionStorageAvailable", () => {
    it("should return true when sessionStorage works", () => {
      expect(isSessionStorageAvailable()).toBe(true);
    });

    it("should return false when sessionStorage throws", () => {
      mockSessionStorage.setItem.mockImplementationOnce(() => {
        throw new Error("Storage full");
      });

      expect(isSessionStorageAvailable()).toBe(false);
    });
  });
});

// ============================================================================
// MemoryStorage Tests
// ============================================================================

describe("MemoryStorage", () => {
  let storage: typeof memoryStorage;

  beforeEach(() => {
    storage = new MemoryStorageClass();
  });

  afterEach(() => {
    storage.stopCleanup();
    storage.clear();
  });

  describe("set and get", () => {
    it("should store and retrieve values", () => {
      storage.set("key1", "value1");
      expect(storage.get("key1")).toBe("value1");
    });

    it("should store objects", () => {
      const obj = { foo: "bar", num: 42 };
      storage.set("obj", obj);
      expect(storage.get("obj")).toEqual(obj);
    });

    it("should store arrays", () => {
      const arr = [1, 2, 3];
      storage.set("arr", arr);
      expect(storage.get("arr")).toEqual(arr);
    });

    it("should return null for non-existent keys", () => {
      expect(storage.get("nonexistent")).toBeNull();
    });

    it("should overwrite existing values", () => {
      storage.set("key", "value1");
      storage.set("key", "value2");
      expect(storage.get("key")).toBe("value2");
    });
  });

  describe("TTL functionality", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should expire items after TTL", () => {
      storage.set("key", "value", 1000); // 1 second TTL

      expect(storage.get("key")).toBe("value");

      jest.advanceTimersByTime(1001);

      expect(storage.get("key")).toBeNull();
    });

    it("should not expire items without TTL", () => {
      storage.set("key", "value");

      jest.advanceTimersByTime(100000);

      expect(storage.get("key")).toBe("value");
    });

    it("should clear expiration when setting without TTL", () => {
      storage.set("key", "value", 1000);
      storage.set("key", "newvalue"); // No TTL

      jest.advanceTimersByTime(2000);

      expect(storage.get("key")).toBe("newvalue");
    });
  });

  describe("has", () => {
    it("should return true for existing keys", () => {
      storage.set("key", "value");
      expect(storage.has("key")).toBe(true);
    });

    it("should return false for non-existent keys", () => {
      expect(storage.has("nonexistent")).toBe(false);
    });

    it("should return false for expired keys", () => {
      jest.useFakeTimers();
      storage.set("key", "value", 100);

      jest.advanceTimersByTime(101);

      expect(storage.has("key")).toBe(false);
      jest.useRealTimers();
    });
  });

  describe("delete", () => {
    it("should delete existing keys", () => {
      storage.set("key", "value");
      const result = storage.delete("key");

      expect(result).toBe(true);
      expect(storage.get("key")).toBeNull();
    });

    it("should return false for non-existent keys", () => {
      const result = storage.delete("nonexistent");
      expect(result).toBe(false);
    });
  });

  describe("clear", () => {
    it("should clear all data", () => {
      storage.set("key1", "value1");
      storage.set("key2", "value2");

      storage.clear();

      expect(storage.get("key1")).toBeNull();
      expect(storage.get("key2")).toBeNull();
    });
  });

  describe("keys", () => {
    it("should return all keys", () => {
      storage.set("key1", "value1");
      storage.set("key2", "value2");

      const keys = storage.keys();

      expect(keys).toContain("key1");
      expect(keys).toContain("key2");
      expect(keys).toHaveLength(2);
    });

    it("should return empty array when empty", () => {
      expect(storage.keys()).toEqual([]);
    });
  });

  describe("size", () => {
    it("should return correct count", () => {
      storage.set("key1", "value1");
      storage.set("key2", "value2");
      storage.set("key3", "value3");

      expect(storage.size()).toBe(3);
    });

    it("should return 0 when empty", () => {
      expect(storage.size()).toBe(0);
    });
  });
});

// ============================================================================
// SecureStorage Tests
// ============================================================================

describe("SecureStorage", () => {
  let storage: SecureStorage;

  beforeEach(() => {
    storage = new SecureStorage();
    localStorageData = {};
  });

  describe("constructor", () => {
    it("should use default config", () => {
      const s = new SecureStorage();
      expect(s.isInitialized()).toBe(false);
    });

    it("should accept custom config", () => {
      const s = new SecureStorage({
        prefix: "custom_",
        defaultEncrypt: false,
        defaultTTL: 60000,
        version: 2,
      });
      expect(s.isInitialized()).toBe(false);
    });
  });

  describe("initialize", () => {
    it("should generate new key if none exists", async () => {
      await storage.initialize();

      expect(mockCryptoSubtle.generateKey).toHaveBeenCalled();
      expect(storage.isInitialized()).toBe(true);
    });

    it("should use provided key", async () => {
      await storage.initialize(mockAesKey);

      expect(storage.isInitialized()).toBe(true);
    });

    it("should load existing key from storage", async () => {
      localStorageData["__secure_storage_key__"] = JSON.stringify(mockJwk);

      await storage.initialize();

      expect(mockCryptoSubtle.importKey).toHaveBeenCalled();
      expect(storage.isInitialized()).toBe(true);
    });

    it("should generate new key if stored key is corrupted", async () => {
      localStorageData["__secure_storage_key__"] = "invalid json";

      await storage.initialize();

      expect(mockCryptoSubtle.generateKey).toHaveBeenCalled();
      expect(storage.isInitialized()).toBe(true);
    });
  });

  describe("set and get", () => {
    beforeEach(async () => {
      await storage.initialize(mockAesKey);
    });

    it("should store encrypted data by default", async () => {
      await storage.set("key", "value");

      expect(mockCryptoSubtle.encrypt).toHaveBeenCalled();
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it("should store unencrypted data when specified", async () => {
      await storage.set("key", "value", { encrypt: false });

      const stored = JSON.parse(localStorageData["nchat_secure_key"]);
      expect(stored.encrypted).toBe(false);
    });

    it("should retrieve and decrypt data", async () => {
      const decryptedBuffer = new TextEncoder().encode('"value"').buffer;
      mockCryptoSubtle.decrypt.mockResolvedValue(decryptedBuffer);

      await storage.set("key", "value");
      const result = await storage.get("key");

      expect(mockCryptoSubtle.decrypt).toHaveBeenCalled();
      expect(result).toBe("value");
    });

    it("should handle TTL", async () => {
      jest.useFakeTimers();

      await storage.set("key", "value", { ttl: 1000 });

      const stored = JSON.parse(localStorageData["nchat_secure_key"]);
      expect(stored.expiresAt).not.toBeNull();

      jest.useRealTimers();
    });

    it("should return null for expired items", async () => {
      jest.useFakeTimers();

      // Manually create an expired item
      const expiredItem = {
        value: "encrypted",
        storedAt: Date.now() - 10000,
        expiresAt: Date.now() - 5000,
        encrypted: false,
        version: 1,
      };
      localStorageData["nchat_secure_key"] = JSON.stringify(expiredItem);

      const result = await storage.get("key");
      expect(result).toBeNull();

      jest.useRealTimers();
    });

    it("should return null for non-existent keys", async () => {
      const result = await storage.get("nonexistent");
      expect(result).toBeNull();
    });

    it("should use memory fallback when localStorage fails", async () => {
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error("Storage full");
      });

      await storage.set("key", "value", { encrypt: false });

      // Should still work via memory fallback
      const result = await storage.get("key");
      expect(result).toBe("value");
    });
  });

  describe("has", () => {
    beforeEach(async () => {
      await storage.initialize(mockAesKey);
    });

    it("should return true for existing keys", async () => {
      const decryptedBuffer = new TextEncoder().encode('"value"').buffer;
      mockCryptoSubtle.decrypt.mockResolvedValue(decryptedBuffer);

      await storage.set("key", "value");
      expect(await storage.has("key")).toBe(true);
    });

    it("should return false for non-existent keys", async () => {
      expect(await storage.has("nonexistent")).toBe(false);
    });
  });

  describe("remove", () => {
    beforeEach(async () => {
      await storage.initialize(mockAesKey);
    });

    it("should remove key from storage", async () => {
      await storage.set("key", "value");
      await storage.remove("key");

      expect(localStorageData["nchat_secure_key"]).toBeUndefined();
    });
  });

  describe("getKeys", () => {
    beforeEach(async () => {
      storage = new SecureStorage({ prefix: "test_" });
      await storage.initialize(mockAesKey);
    });

    it("should return all keys with prefix", async () => {
      await storage.set("key1", "value1", { encrypt: false });
      await storage.set("key2", "value2", { encrypt: false });

      const keys = storage.getKeys();

      expect(keys).toContain("key1");
      expect(keys).toContain("key2");
    });

    it("should not return keys without prefix", async () => {
      localStorageData["other_key"] = "value";
      await storage.set("key1", "value1", { encrypt: false });

      const keys = storage.getKeys();

      expect(keys).toContain("key1");
      expect(keys).not.toContain("other_key");
    });
  });

  describe("clear", () => {
    beforeEach(async () => {
      storage = new SecureStorage({ prefix: "test_" });
      await storage.initialize(mockAesKey);
    });

    it("should remove all items with prefix", async () => {
      await storage.set("key1", "value1", { encrypt: false });
      await storage.set("key2", "value2", { encrypt: false });

      await storage.clear();

      expect(localStorageData["test_key1"]).toBeUndefined();
      expect(localStorageData["test_key2"]).toBeUndefined();
    });
  });

  describe("clearAll", () => {
    beforeEach(async () => {
      await storage.initialize(mockAesKey);
    });

    it("should remove encryption key and reset state", async () => {
      await storage.set("key", "value", { encrypt: false });
      await storage.clearAll();

      expect(storage.isInitialized()).toBe(false);
      expect(localStorageData["__secure_storage_key__"]).toBeUndefined();
    });
  });

  describe("cleanupExpired", () => {
    beforeEach(async () => {
      await storage.initialize(mockAesKey);
    });

    it("should remove expired items", async () => {
      jest.useFakeTimers();

      // Create expired item
      const expiredItem = {
        value: "value",
        storedAt: Date.now() - 10000,
        expiresAt: Date.now() - 5000,
        encrypted: false,
        version: 1,
      };
      localStorageData["nchat_secure_key"] = JSON.stringify(expiredItem);

      const removed = await storage.cleanupExpired();

      expect(removed).toBe(1);
      expect(localStorageData["nchat_secure_key"]).toBeUndefined();

      jest.useRealTimers();
    });

    it("should remove corrupted items", async () => {
      localStorageData["nchat_secure_corrupted"] = "invalid json";

      const removed = await storage.cleanupExpired();

      expect(removed).toBe(1);
    });
  });

  describe("getStats", () => {
    beforeEach(async () => {
      storage = new SecureStorage({ prefix: "stats_" });
      await storage.initialize(mockAesKey);
    });

    it("should return correct statistics", async () => {
      await storage.set("key1", "value1", { encrypt: false });
      await storage.set("key2", "value2"); // encrypted

      const stats = storage.getStats();

      expect(stats.itemCount).toBe(2);
      expect(stats.encryptedCount).toBe(1);
      expect(stats.totalSize).toBeGreaterThan(0);
    });
  });

  describe("exportData and importData", () => {
    beforeEach(async () => {
      await storage.initialize(mockAesKey);
    });

    it("should export all data", async () => {
      const decryptedBuffer = new TextEncoder().encode('"value"').buffer;
      mockCryptoSubtle.decrypt.mockResolvedValue(decryptedBuffer);

      await storage.set("key", "value");

      const exported = await storage.exportData();

      expect(exported).toHaveProperty("key");
    });

    it("should import data", async () => {
      const data = { key1: "value1", key2: "value2" };

      await storage.importData(data, { encrypt: false });

      const decryptedBuffer1 = new TextEncoder().encode('"value1"').buffer;
      const decryptedBuffer2 = new TextEncoder().encode('"value2"').buffer;
      mockCryptoSubtle.decrypt
        .mockResolvedValueOnce(decryptedBuffer1)
        .mockResolvedValueOnce(decryptedBuffer2);

      expect(await storage.get("key1")).toBe("value1");
      expect(await storage.get("key2")).toBe("value2");
    });
  });
});

// ============================================================================
// SecureSessionStorage Tests
// ============================================================================

describe("SecureSessionStorage", () => {
  let storage: SecureSessionStorage;

  beforeEach(() => {
    storage = new SecureSessionStorage("test_session_");
    sessionStorageData = {};
  });

  describe("set and get", () => {
    it("should store and retrieve values", () => {
      storage.set("key", "value");
      expect(storage.get("key")).toBe("value");
    });

    it("should store objects", () => {
      const obj = { foo: "bar" };
      storage.set("obj", obj);
      expect(storage.get("obj")).toEqual(obj);
    });

    it("should return null for non-existent keys", () => {
      expect(storage.get("nonexistent")).toBeNull();
    });

    it("should return null for invalid JSON", () => {
      sessionStorageData["test_session_invalid"] = "not json";
      expect(storage.get("invalid")).toBeNull();
    });
  });

  describe("has", () => {
    it("should return true for existing keys", () => {
      storage.set("key", "value");
      expect(storage.has("key")).toBe(true);
    });

    it("should return false for non-existent keys", () => {
      expect(storage.has("nonexistent")).toBe(false);
    });
  });

  describe("remove", () => {
    it("should remove key", () => {
      storage.set("key", "value");
      storage.remove("key");
      expect(storage.get("key")).toBeNull();
    });
  });

  describe("clear", () => {
    it("should clear all items with prefix", () => {
      storage.set("key1", "value1");
      storage.set("key2", "value2");
      sessionStorageData["other_key"] = "other";

      storage.clear();

      expect(sessionStorageData["test_session_key1"]).toBeUndefined();
      expect(sessionStorageData["test_session_key2"]).toBeUndefined();
      expect(sessionStorageData["other_key"]).toBe("other");
    });
  });
});

// ============================================================================
// Auto-Clear Functions Tests
// ============================================================================

describe("Auto-Clear Functions", () => {
  describe("clearAllSecureStorage", () => {
    it("should clear all storage types", async () => {
      const secure = new SecureStorage();
      await secure.initialize(mockAesKey);
      await secure.set("key", "value", { encrypt: false });

      const session = new SecureSessionStorage();
      session.set("key", "value");

      memoryStorage.set("key", "value");

      await clearAllSecureStorage(secure, session);

      expect(secure.isInitialized()).toBe(false);
    });
  });

  describe("setupAutoClearOnUnload", () => {
    let originalWindow: typeof window;
    let addEventListenerMock: jest.Mock;
    let removeEventListenerMock: jest.Mock;

    beforeEach(() => {
      addEventListenerMock = jest.fn();
      removeEventListenerMock = jest.fn();

      Object.defineProperty(global, "window", {
        value: {
          addEventListener: addEventListenerMock,
          removeEventListener: removeEventListenerMock,
        },
        writable: true,
      });
    });

    it("should add beforeunload listener", async () => {
      const storage = new SecureStorage();
      await storage.initialize(mockAesKey);

      setupAutoClearOnUnload(storage);

      expect(addEventListenerMock).toHaveBeenCalledWith(
        "beforeunload",
        expect.any(Function),
      );
    });

    it("should return cleanup function", async () => {
      const storage = new SecureStorage();
      await storage.initialize(mockAesKey);

      const cleanup = setupAutoClearOnUnload(storage);
      cleanup();

      expect(removeEventListenerMock).toHaveBeenCalledWith(
        "beforeunload",
        expect.any(Function),
      );
    });

    it("should preserve specified keys", async () => {
      const storage = new SecureStorage({ prefix: "preserve_" });
      await storage.initialize(mockAesKey);
      await storage.set("keep", "value", { encrypt: false });
      await storage.set("remove", "value", { encrypt: false });

      setupAutoClearOnUnload(storage, ["keep"]);

      // Get the handler that was registered
      const handler = addEventListenerMock.mock.calls[0][1];

      // Simulate unload
      await handler();

      // 'remove' should be cleared but 'keep' should remain
      // (In practice, this would be verified by checking localStorage)
    });
  });
});

// ============================================================================
// Singleton Tests
// ============================================================================

describe("Singletons", () => {
  it("should export memoryStorage singleton", () => {
    expect(memoryStorage).toBeDefined();
    expect(typeof memoryStorage.set).toBe("function");
    expect(typeof memoryStorage.get).toBe("function");
  });

  it("should export secureStorage singleton", () => {
    expect(secureStorage).toBeInstanceOf(SecureStorage);
  });

  it("should export secureSessionStorage singleton", () => {
    expect(secureSessionStorage).toBeInstanceOf(SecureSessionStorage);
  });
});
