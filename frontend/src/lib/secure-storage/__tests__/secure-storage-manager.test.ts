/**
 * SecureStorageManager Tests
 *
 * Comprehensive tests for the unified secure storage manager.
 */

import {
  SecureStorageManager,
  getSecureStorage,
  resetSecureStorage,
  initializeSecureStorage,
  createSecureStorageManager,
  detectOperatingSystem,
} from "../secure-storage-manager";
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
  clear: jest.fn(),
  get length() {
    return Object.keys(localStorageData).length;
  },
  key: jest.fn(),
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
  resetSecureStorage();

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

describe("detectOperatingSystem", () => {
  const originalWindow = global.window;

  beforeEach(() => {
    // @ts-ignore
    global.window = {};
  });

  afterEach(() => {
    // @ts-ignore
    global.window = originalWindow;
  });

  it("should detect iOS via Capacitor", () => {
    Object.assign(globalThis, { Capacitor: { platform: "ios" } });
    expect(detectOperatingSystem()).toBe("ios");
    // @ts-ignore
    delete globalThis.Capacitor;
  });

  it("should detect Android via Capacitor", () => {
    Object.assign(globalThis, { Capacitor: { platform: "android" } });
    expect(detectOperatingSystem()).toBe("android");
    // @ts-ignore
    delete globalThis.Capacitor;
  });

  it("should detect macOS via Electron", () => {
    Object.assign(globalThis, {
      electron: {},
      process: { platform: "darwin" },
    });
    expect(detectOperatingSystem()).toBe("macos");
    // @ts-ignore
    delete globalThis.electron;
    // @ts-ignore
    delete globalThis.process;
  });

  it("should detect Windows via Electron", () => {
    Object.assign(globalThis, {
      electron: {},
      process: { platform: "win32" },
    });
    expect(detectOperatingSystem()).toBe("windows");
    // @ts-ignore
    delete globalThis.electron;
    // @ts-ignore
    delete globalThis.process;
  });

  it("should detect Linux via Electron", () => {
    Object.assign(globalThis, {
      electron: {},
      process: { platform: "linux" },
    });
    expect(detectOperatingSystem()).toBe("linux");
    // @ts-ignore
    delete globalThis.electron;
    // @ts-ignore
    delete globalThis.process;
  });

  it("should default to web", () => {
    expect(detectOperatingSystem()).toBe("web");
  });
});

// ============================================================================
// Factory Function Tests
// ============================================================================

describe("Factory Functions", () => {
  describe("createSecureStorageManager", () => {
    it("should create a new instance", () => {
      const manager = createSecureStorageManager();
      expect(manager).toBeInstanceOf(SecureStorageManager);
    });

    it("should accept options", () => {
      const manager = createSecureStorageManager({
        service: "custom.service",
        preferHardwareStorage: true,
      });
      expect(manager).toBeInstanceOf(SecureStorageManager);
    });
  });

  describe("getSecureStorage", () => {
    it("should return singleton instance", () => {
      const storage1 = getSecureStorage();
      const storage2 = getSecureStorage();
      expect(storage1).toBe(storage2);
    });

    it("should return same instance with different options", () => {
      const storage1 = getSecureStorage({ service: "test1" });
      const storage2 = getSecureStorage({ service: "test2" });
      expect(storage1).toBe(storage2); // First call creates, subsequent return same
    });
  });

  describe("resetSecureStorage", () => {
    it("should reset singleton", () => {
      const storage1 = getSecureStorage();
      resetSecureStorage();
      const storage2 = getSecureStorage();
      expect(storage1).not.toBe(storage2);
    });
  });

  describe("initializeSecureStorage", () => {
    it("should initialize and return storage", async () => {
      const storage = await initializeSecureStorage();
      expect(storage).toBeInstanceOf(SecureStorageManager);
      expect(storage.isInitialized()).toBe(true);
    });
  });
});

// ============================================================================
// SecureStorageManager Tests
// ============================================================================

describe("SecureStorageManager", () => {
  let manager: SecureStorageManager;

  beforeEach(() => {
    manager = new SecureStorageManager();
  });

  describe("initialization", () => {
    it("should initialize successfully", async () => {
      await expect(manager.initialize()).resolves.toBeUndefined();
      expect(manager.isInitialized()).toBe(true);
    });

    it("should not reinitialize", async () => {
      await manager.initialize();
      await manager.initialize();
      expect(manager.isInitialized()).toBe(true);
    });

    it("should prevent concurrent initialization", async () => {
      const p1 = manager.initialize();
      const p2 = manager.initialize();
      await Promise.all([p1, p2]);
      expect(manager.isInitialized()).toBe(true);
    });

    it("should use fallback on web", async () => {
      await manager.initialize();
      const caps = await manager.getCapabilities();
      expect(caps.os).toBe("web");
    });
  });

  describe("getCapabilities", () => {
    it("should return capabilities", async () => {
      await manager.initialize();
      const caps = await manager.getCapabilities();

      expect(caps).toHaveProperty("hardwareStorage");
      expect(caps).toHaveProperty("biometricAuth");
      expect(caps).toHaveProperty("secureEnclave");
      expect(caps).toHaveProperty("maxItemSize");
    });
  });

  describe("setItem and getItem", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should store and retrieve value", async () => {
      mockCryptoSubtle.decrypt.mockResolvedValue(
        new TextEncoder().encode("test-value").buffer,
      );

      const setResult = await manager.setItem("test-key", "test-value");
      expect(setResult.success).toBe(true);

      const getResult = await manager.getItem("test-key");
      expect(getResult.success).toBe(true);
    });

    it("should auto-initialize if needed", async () => {
      const newManager = new SecureStorageManager();
      await newManager.setItem("key", "value");
      expect(newManager.isInitialized()).toBe(true);
    });

    it("should return null for non-existent key", async () => {
      const result = await manager.getItem("non-existent");
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe("hasItem", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should return true for existing item", async () => {
      await manager.setItem("key", "value");
      expect(await manager.hasItem("key")).toBe(true);
    });

    it("should return false for missing item", async () => {
      expect(await manager.hasItem("missing")).toBe(false);
    });
  });

  describe("removeItem", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should remove item", async () => {
      await manager.setItem("key", "value");
      const result = await manager.removeItem("key");
      expect(result.success).toBe(true);
    });
  });

  describe("getAllKeys", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should return all keys", async () => {
      await manager.setItem("key1", "value1");
      await manager.setItem("key2", "value2");

      const keys = await manager.getAllKeys();
      expect(keys).toContain("key1");
      expect(keys).toContain("key2");
    });
  });

  describe("clear", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should clear all items", async () => {
      await manager.setItem("key1", "value1");
      await manager.setItem("key2", "value2");

      const result = await manager.clear();
      expect(result.success).toBe(true);
    });
  });

  describe("setJSON and getJSON", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should store and retrieve JSON value", async () => {
      const data = { name: "test", count: 42 };

      mockCryptoSubtle.decrypt.mockResolvedValue(
        new TextEncoder().encode(JSON.stringify(data)).buffer,
      );

      const setResult = await manager.setJSON("json-key", data);
      expect(setResult.success).toBe(true);

      const getResult = await manager.getJSON<typeof data>("json-key");
      expect(getResult.success).toBe(true);
    });

    it("should handle serialization error", async () => {
      const circular: { self?: unknown } = {};
      circular.self = circular;

      const result = await manager.setJSON("key", circular);
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("SERIALIZATION_FAILED");
    });

    it("should handle deserialization error", async () => {
      mockCryptoSubtle.decrypt.mockResolvedValue(
        new TextEncoder().encode("not-valid-json").buffer,
      );

      await manager.setItem("key", "not-valid-json");
      const result = await manager.getJSON("key");

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("DESERIALIZATION_FAILED");
    });

    it("should return null for non-existent JSON key", async () => {
      const result = await manager.getJSON("missing");
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe("storeKeyPair and retrieveKeyPair", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should store and retrieve key pair", async () => {
      const keyPair = {
        publicKey: { x: "public" } as JsonWebKey,
        privateKey: { x: "public", d: "private" } as JsonWebKey,
      };

      mockCryptoSubtle.decrypt.mockResolvedValue(
        new TextEncoder().encode(JSON.stringify(keyPair)).buffer,
      );

      const storeResult = await manager.storeKeyPair("identity", keyPair);
      expect(storeResult.success).toBe(true);

      const retrieveResult = await manager.retrieveKeyPair("identity");
      expect(retrieveResult.success).toBe(true);
    });
  });

  describe("storeEncryptionKey and retrieveEncryptionKey", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should store and retrieve encryption key", async () => {
      const key = { k: "test-key", alg: "A256GCM" } as JsonWebKey;

      mockCryptoSubtle.decrypt.mockResolvedValue(
        new TextEncoder().encode(JSON.stringify(key)).buffer,
      );

      const storeResult = await manager.storeEncryptionKey("aes-key", key);
      expect(storeResult.success).toBe(true);

      const retrieveResult = await manager.retrieveEncryptionKey("aes-key");
      expect(retrieveResult.success).toBe(true);
    });
  });

  describe("isBiometricAvailable", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should check biometric availability", async () => {
      const available = await manager.isBiometricAvailable();
      expect(typeof available).toBe("boolean");
    });
  });

  describe("authenticateBiometric", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should attempt biometric authentication", async () => {
      const result = await manager.authenticateBiometric("Test authentication");
      expect(result).toHaveProperty("success");
    });
  });
});

// ============================================================================
// Fallback Behavior Tests
// ============================================================================

describe("Fallback Behavior", () => {
  it("should use fallback when primary fails", async () => {
    const manager = new SecureStorageManager();
    await manager.initialize();

    // Even if primary fails, fallback should work
    const result = await manager.setItem("key", "value");
    expect(result.success).toBe(true);
  });

  it("should check fallback for getItem when primary returns null", async () => {
    const manager = new SecureStorageManager();
    await manager.initialize();

    // Store in fallback
    await manager.setItem("key", "value");

    // Should find in fallback
    const result = await manager.getItem("key");
    expect(result.success).toBe(true);
  });
});
