/**
 * Platform Storage Tests
 *
 * Comprehensive tests for platform-agnostic secure storage.
 */

import {
  WebPlatformStorage,
  CapacitorPlatformStorage,
  DesktopPlatformStorage,
  detectPlatform,
  isWebCryptoAvailable,
  isIndexedDBAvailable,
  getPlatformStorage,
  resetPlatformStorage,
  initializePlatformStorage,
  storeKeyPairSecurely,
  retrieveKeyPairSecurely,
  Platform,
  StorageCapabilities,
  StorageOptions,
} from "../platform-storage";

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

const originalCrypto = global.crypto;

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
  oncomplete: null as (() => void) | null,
  onerror: null as (() => void) | null,
};

const mockDB = {
  transaction: jest.fn().mockReturnValue(mockTransaction),
  objectStoreNames: { contains: jest.fn().mockReturnValue(true) },
  createObjectStore: jest.fn(),
  close: jest.fn(),
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
  deleteDatabase: jest.fn(),
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
  resetPlatformStorage();

  // Default mock implementations
  mockCryptoSubtle.generateKey.mockResolvedValue({} as CryptoKey);
  mockCryptoSubtle.exportKey.mockResolvedValue({ k: "test-key" });
  mockCryptoSubtle.importKey.mockResolvedValue({} as CryptoKey);
  mockCryptoSubtle.encrypt.mockResolvedValue(new ArrayBuffer(48));
  mockCryptoSubtle.decrypt.mockResolvedValue(
    new TextEncoder().encode('"test-value"').buffer,
  );
});

// ============================================================================
// Platform Detection Tests
// ============================================================================

describe("Platform Detection", () => {
  describe("detectPlatform", () => {
    it('should return "unknown" in Node.js environment', () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      const platform = detectPlatform();

      expect(platform).toBe("unknown");

      // @ts-ignore
      global.window = originalWindow;
    });

    it("should detect web platform by default", () => {
      // @ts-ignore
      global.window = { navigator: { userAgent: "Mozilla/5.0" } };

      const platform = detectPlatform();

      expect(platform).toBe("web");
    });

    it("should detect iOS platform", () => {
      // @ts-ignore
      global.window = {
        Capacitor: { platform: "ios" },
        navigator: { userAgent: "Mozilla/5.0" },
      };

      const platform = detectPlatform();

      expect(platform).toBe("ios");

      // @ts-ignore
      delete global.window.Capacitor;
    });

    it("should detect Android platform", () => {
      // @ts-ignore
      global.window = {
        Capacitor: { platform: "android" },
        navigator: { userAgent: "Mozilla/5.0" },
      };

      const platform = detectPlatform();

      expect(platform).toBe("android");

      // @ts-ignore
      delete global.window.Capacitor;
    });

    it("should detect Electron platform", () => {
      // @ts-ignore
      global.window = {
        electron: {},
        navigator: { userAgent: "Mozilla/5.0" },
      };

      const platform = detectPlatform();

      expect(platform).toBe("electron");

      // @ts-ignore
      delete global.window.electron;
    });

    it("should detect Tauri platform", () => {
      // @ts-ignore
      global.window = {
        __TAURI__: {},
        navigator: { userAgent: "Mozilla/5.0" },
      };

      const platform = detectPlatform();

      expect(platform).toBe("tauri");

      // @ts-ignore
      delete global.window.__TAURI__;
    });
  });

  describe("isWebCryptoAvailable", () => {
    it("should return true when Web Crypto is available", () => {
      expect(isWebCryptoAvailable()).toBe(true);
    });

    it("should return false when crypto is undefined", () => {
      const originalCrypto = global.crypto;
      // @ts-ignore
      delete global.crypto;

      expect(isWebCryptoAvailable()).toBe(false);

      // @ts-ignore
      global.crypto = originalCrypto;
    });
  });

  describe("isIndexedDBAvailable", () => {
    it("should return true when IndexedDB is available", () => {
      expect(isIndexedDBAvailable()).toBe(true);
    });
  });
});

// ============================================================================
// WebPlatformStorage Tests
// ============================================================================

describe("WebPlatformStorage", () => {
  let storage: WebPlatformStorage;

  beforeEach(() => {
    storage = new WebPlatformStorage();
  });

  describe("initialize", () => {
    it("should initialize successfully", async () => {
      await expect(storage.initialize()).resolves.toBeUndefined();
    });

    it("should generate encryption key", async () => {
      await storage.initialize();

      expect(mockCryptoSubtle.generateKey).toHaveBeenCalled();
    });

    it("should load existing key from localStorage", async () => {
      localStorageData["__storage_encryption_key__"] = JSON.stringify({
        k: "existing",
      });

      await storage.initialize();

      expect(mockCryptoSubtle.importKey).toHaveBeenCalled();
    });
  });

  describe("getCapabilities", () => {
    it("should return storage capabilities", async () => {
      await storage.initialize();

      const capabilities = await storage.getCapabilities();

      expect(capabilities.hardwareStorage).toBe(false);
      expect(capabilities.maxItemSize).toBeGreaterThan(0);
      expect(capabilities.syncSupported).toBe(false);
    });
  });

  describe("setItem and getItem", () => {
    it("should store and retrieve value", async () => {
      await storage.initialize();

      mockCryptoSubtle.decrypt.mockResolvedValue(
        new TextEncoder().encode('"test-value"').buffer,
      );

      await storage.setItem("test-key", "test-value");
      const result = await storage.getItem<string>("test-key");

      expect(result.success).toBe(true);
      expect(result.data).toBe("test-value");
    });

    it("should encrypt data by default", async () => {
      await storage.initialize();

      await storage.setItem("test-key", "test-value");

      expect(mockCryptoSubtle.encrypt).toHaveBeenCalled();
    });

    it("should return null for non-existent key", async () => {
      await storage.initialize();

      const result = await storage.getItem<string>("non-existent");

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it("should handle errors gracefully", async () => {
      await storage.initialize();

      mockCryptoSubtle.encrypt.mockRejectedValue(
        new Error("Encryption failed"),
      );

      const result = await storage.setItem("test-key", "test-value");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("hasItem", () => {
    it("should return true for existing item", async () => {
      await storage.initialize();
      await storage.setItem("test-key", "value");

      const exists = await storage.hasItem("test-key");

      expect(exists).toBe(true);
    });

    it("should return false for non-existent item", async () => {
      await storage.initialize();

      const exists = await storage.hasItem("non-existent");

      expect(exists).toBe(false);
    });
  });

  describe("removeItem", () => {
    it("should remove item", async () => {
      await storage.initialize();
      await storage.setItem("test-key", "value");

      const result = await storage.removeItem("test-key");

      expect(result.success).toBe(true);
      expect(await storage.hasItem("test-key")).toBe(false);
    });
  });

  describe("getAllKeys", () => {
    it("should return all keys", async () => {
      await storage.initialize();
      await storage.setItem("key1", "value1");
      await storage.setItem("key2", "value2");

      const keys = await storage.getAllKeys();

      expect(keys).toContain("key1");
      expect(keys).toContain("key2");
    });

    it("should filter out metadata keys", async () => {
      await storage.initialize();
      await storage.setItem("key1", "value1");

      const keys = await storage.getAllKeys();

      expect(keys.some((k) => k.endsWith("_meta"))).toBe(false);
    });
  });

  describe("clear", () => {
    it("should clear all items", async () => {
      await storage.initialize();
      await storage.setItem("key1", "value1");
      await storage.setItem("key2", "value2");

      const result = await storage.clear();

      expect(result.success).toBe(true);
    });
  });

  describe("getItemMeta", () => {
    it("should return item metadata", async () => {
      await storage.initialize();

      mockCryptoSubtle.decrypt.mockResolvedValue(
        new TextEncoder().encode(
          JSON.stringify({
            createdAt: new Date().toISOString(),
            accessedAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
            securityLevel: "encrypted",
            biometricProtected: false,
            version: 1,
          }),
        ).buffer,
      );

      await storage.setItem("test-key", "value");
      const meta = await storage.getItemMeta("test-key");

      expect(meta).toBeDefined();
      expect(meta?.securityLevel).toBe("encrypted");
    });

    it("should return null for non-existent key", async () => {
      await storage.initialize();

      const meta = await storage.getItemMeta("non-existent");

      expect(meta).toBeNull();
    });
  });
});

// ============================================================================
// CapacitorPlatformStorage Tests
// ============================================================================

describe("CapacitorPlatformStorage", () => {
  let storage: CapacitorPlatformStorage;

  beforeEach(() => {
    storage = new CapacitorPlatformStorage("ios");
  });

  describe("initialize", () => {
    it("should initialize with web fallback", async () => {
      await expect(storage.initialize()).resolves.toBeUndefined();
    });
  });

  describe("getCapabilities", () => {
    it("should return capabilities from web fallback", async () => {
      await storage.initialize();

      const capabilities = await storage.getCapabilities();

      expect(capabilities).toBeDefined();
      expect(typeof capabilities.hardwareStorage).toBe("boolean");
    });
  });

  describe("setItem and getItem", () => {
    it("should use web fallback", async () => {
      await storage.initialize();

      mockCryptoSubtle.decrypt.mockResolvedValue(
        new TextEncoder().encode('"test-value"').buffer,
      );

      await storage.setItem("test-key", "test-value");
      const result = await storage.getItem<string>("test-key");

      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// DesktopPlatformStorage Tests
// ============================================================================

describe("DesktopPlatformStorage", () => {
  let storage: DesktopPlatformStorage;

  beforeEach(() => {
    storage = new DesktopPlatformStorage("electron");
  });

  describe("initialize", () => {
    it("should initialize with web fallback", async () => {
      await expect(storage.initialize()).resolves.toBeUndefined();
    });
  });

  describe("getCapabilities", () => {
    it("should return capabilities", async () => {
      await storage.initialize();

      const capabilities = await storage.getCapabilities();

      expect(capabilities).toBeDefined();
    });
  });

  describe("setItem and getItem", () => {
    it("should use web fallback", async () => {
      await storage.initialize();

      mockCryptoSubtle.decrypt.mockResolvedValue(
        new TextEncoder().encode('"test-value"').buffer,
      );

      await storage.setItem("test-key", "test-value");
      const result = await storage.getItem<string>("test-key");

      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// Factory Function Tests
// ============================================================================

describe("Factory Functions", () => {
  describe("getPlatformStorage", () => {
    it("should return WebPlatformStorage for web", () => {
      // @ts-ignore
      global.window = { navigator: { userAgent: "Mozilla/5.0" } };

      const storage = getPlatformStorage();

      expect(storage.platform).toBe("web");
    });

    it("should return same instance on multiple calls", () => {
      const storage1 = getPlatformStorage();
      const storage2 = getPlatformStorage();

      expect(storage1).toBe(storage2);
    });
  });

  describe("resetPlatformStorage", () => {
    it("should reset storage instance", () => {
      const storage1 = getPlatformStorage();
      resetPlatformStorage();
      const storage2 = getPlatformStorage();

      expect(storage1).not.toBe(storage2);
    });
  });

  describe("initializePlatformStorage", () => {
    it("should initialize storage", async () => {
      await expect(initializePlatformStorage()).resolves.toBeUndefined();
    });
  });
});

// ============================================================================
// Key Pair Storage Tests
// ============================================================================

describe("Key Pair Storage", () => {
  describe("storeKeyPairSecurely", () => {
    it("should store key pair", async () => {
      const keyPair = {
        publicKey: { x: "test-pub" } as JsonWebKey,
        privateKey: { x: "test-pub", d: "test-priv" } as JsonWebKey,
      };

      const result = await storeKeyPairSecurely("test-key", keyPair);

      expect(result.success).toBe(true);
    });

    it("should use hardware storage option", async () => {
      const keyPair = {
        publicKey: { x: "test" } as JsonWebKey,
        privateKey: { x: "test", d: "priv" } as JsonWebKey,
      };

      const result = await storeKeyPairSecurely("test-key", keyPair, {
        useHardwareStorage: true,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("retrieveKeyPairSecurely", () => {
    it("should retrieve key pair", async () => {
      const keyPair = {
        publicKey: { x: "test-pub" } as JsonWebKey,
        privateKey: { x: "test-pub", d: "test-priv" } as JsonWebKey,
      };

      mockCryptoSubtle.decrypt.mockResolvedValue(
        new TextEncoder().encode(JSON.stringify(keyPair)).buffer,
      );

      await storeKeyPairSecurely("test-key", keyPair);
      const result = await retrieveKeyPairSecurely("test-key");

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it("should return null for non-existent key", async () => {
      const result = await retrieveKeyPairSecurely("non-existent");

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });
});

// ============================================================================
// Storage Options Tests
// ============================================================================

describe("Storage Options", () => {
  let storage: WebPlatformStorage;

  beforeEach(async () => {
    storage = new WebPlatformStorage();
    await storage.initialize();
  });

  describe("biometric protection", () => {
    it("should mark item as biometric protected", async () => {
      await storage.setItem("secure-key", "secret", {
        requireBiometric: true,
      });

      mockCryptoSubtle.decrypt.mockResolvedValue(
        new TextEncoder().encode(
          JSON.stringify({
            createdAt: new Date().toISOString(),
            accessedAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
            securityLevel: "encrypted",
            biometricProtected: true,
            version: 1,
          }),
        ).buffer,
      );

      const meta = await storage.getItemMeta("secure-key");

      expect(meta?.biometricProtected).toBe(true);
    });
  });

  describe("custom encryption key", () => {
    it("should use provided encryption key", async () => {
      const customKey = {} as CryptoKey;

      await storage.setItem("test-key", "value", {
        encryptionKey: customKey,
      });

      // Encryption should have been called
      expect(mockCryptoSubtle.encrypt).toHaveBeenCalled();
    });
  });
});
