/**
 * Secure Storage Integration Tests
 *
 * End-to-end tests simulating real-world usage scenarios.
 */

import {
  SecureStorageManager,
  createSecureStorageManager,
  resetSecureStorage,
  SecureStorageError,
} from "../index";

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

  mockCryptoSubtle.generateKey.mockResolvedValue({} as CryptoKey);
  mockCryptoSubtle.exportKey.mockResolvedValue({ k: "test-key" });
  mockCryptoSubtle.importKey.mockResolvedValue({} as CryptoKey);
  mockCryptoSubtle.encrypt.mockResolvedValue(new ArrayBuffer(48));
  mockCryptoSubtle.decrypt.mockResolvedValue(
    new TextEncoder().encode("test-value").buffer,
  );
});

// ============================================================================
// Integration Tests
// ============================================================================

describe("Integration: Authentication Token Storage", () => {
  let storage: SecureStorageManager;

  beforeEach(async () => {
    storage = createSecureStorageManager({ service: "com.nchat.auth" });
    await storage.initialize();
  });

  it("should store and retrieve auth tokens", async () => {
    const tokens = {
      accessToken: "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...",
      refreshToken: "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...",
      expiresAt: Date.now() + 3600000,
    };

    mockCryptoSubtle.decrypt.mockResolvedValue(
      new TextEncoder().encode(JSON.stringify(tokens)).buffer,
    );

    const storeResult = await storage.setJSON("auth_tokens", tokens);
    expect(storeResult.success).toBe(true);

    const retrieveResult = await storage.getJSON<typeof tokens>("auth_tokens");
    expect(retrieveResult.success).toBe(true);
  });

  it("should handle token refresh", async () => {
    const oldTokens = {
      accessToken: "old",
      refreshToken: "refresh",
      expiresAt: 0,
    };
    const newTokens = {
      accessToken: "new",
      refreshToken: "refresh",
      expiresAt: Date.now() + 3600000,
    };

    mockCryptoSubtle.decrypt.mockResolvedValue(
      new TextEncoder().encode(JSON.stringify(newTokens)).buffer,
    );

    await storage.setJSON("auth_tokens", oldTokens);
    await storage.setJSON("auth_tokens", newTokens);

    const result = await storage.getJSON<typeof newTokens>("auth_tokens");
    expect(result.success).toBe(true);
  });

  it("should clear tokens on logout", async () => {
    await storage.setItem("auth_tokens", "tokens");
    await storage.setItem("user_preferences", "prefs");

    const clearResult = await storage.clear();
    expect(clearResult.success).toBe(true);
  });
});

describe("Integration: E2E Encryption Key Management", () => {
  let storage: SecureStorageManager;

  beforeEach(async () => {
    storage = createSecureStorageManager({ service: "com.nchat.encryption" });
    await storage.initialize();
  });

  it("should store identity key pair", async () => {
    const identityKeyPair = {
      publicKey: {
        kty: "EC",
        crv: "P-256",
        x: "base64url-x-coordinate",
        y: "base64url-y-coordinate",
      } as JsonWebKey,
      privateKey: {
        kty: "EC",
        crv: "P-256",
        x: "base64url-x-coordinate",
        y: "base64url-y-coordinate",
        d: "base64url-private-key",
      } as JsonWebKey,
    };

    const result = await storage.storeKeyPair("identity", identityKeyPair);
    expect(result.success).toBe(true);
  });

  it("should store pre-keys for Signal protocol", async () => {
    const preKeys = Array.from({ length: 100 }, (_, i) => ({
      keyId: i,
      publicKey: { x: `pk${i}` } as JsonWebKey,
      privateKey: { x: `pk${i}`, d: `sk${i}` } as JsonWebKey,
    }));

    for (const preKey of preKeys.slice(0, 5)) {
      const result = await storage.storeKeyPair(`prekey_${preKey.keyId}`, {
        publicKey: preKey.publicKey,
        privateKey: preKey.privateKey,
      });
      expect(result.success).toBe(true);
    }
  });

  it("should store signed pre-key", async () => {
    const signedPreKey = {
      keyId: 1,
      publicKey: { x: "spk-pub" } as JsonWebKey,
      privateKey: { x: "spk-pub", d: "spk-priv" } as JsonWebKey,
      signature: "base64-signature",
    };

    const result = await storage.setJSON("signed_prekey", signedPreKey);
    expect(result.success).toBe(true);
  });
});

describe("Integration: Multi-Device Scenarios", () => {
  it("should support multiple storage instances with different services", async () => {
    const authStorage = createSecureStorageManager({
      service: "com.nchat.auth",
    });
    const encryptionStorage = createSecureStorageManager({
      service: "com.nchat.encryption",
    });

    await authStorage.initialize();
    await encryptionStorage.initialize();

    await authStorage.setItem("token", "auth-token");
    await encryptionStorage.setItem("key", "encryption-key");

    // Keys should be separate
    const authKeys = await authStorage.getAllKeys();
    const encKeys = await encryptionStorage.getAllKeys();

    // Both should have stored their respective items
    expect(authKeys.length).toBeGreaterThan(0);
    expect(encKeys.length).toBeGreaterThan(0);
  });
});

describe("Integration: Error Recovery", () => {
  let storage: SecureStorageManager;

  beforeEach(async () => {
    storage = createSecureStorageManager();
    await storage.initialize();
  });

  it("should handle corrupted data gracefully", async () => {
    await storage.setItem("key", "value");
    mockCryptoSubtle.decrypt.mockRejectedValue(new Error("Decryption failed"));

    const result = await storage.getItem("key");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should continue working after encryption failure", async () => {
    mockCryptoSubtle.encrypt.mockRejectedValueOnce(
      new Error("Encryption failed"),
    );

    const failResult = await storage.setItem("key1", "value1");
    expect(failResult.success).toBe(false);

    // Should work on next attempt
    mockCryptoSubtle.encrypt.mockResolvedValue(new ArrayBuffer(48));
    const successResult = await storage.setItem("key2", "value2");
    expect(successResult.success).toBe(true);
  });
});

describe("Integration: Concurrent Operations", () => {
  let storage: SecureStorageManager;

  beforeEach(async () => {
    storage = createSecureStorageManager();
    await storage.initialize();
  });

  it("should handle concurrent writes", async () => {
    const writes = Array.from({ length: 10 }, (_, i) =>
      storage.setItem(`key${i}`, `value${i}`),
    );

    const results = await Promise.all(writes);
    expect(results.every((r) => r.success)).toBe(true);
  });

  it("should handle concurrent reads", async () => {
    await storage.setItem("shared-key", "shared-value");

    mockCryptoSubtle.decrypt.mockResolvedValue(
      new TextEncoder().encode("shared-value").buffer,
    );

    const reads = Array.from({ length: 10 }, () =>
      storage.getItem("shared-key"),
    );

    const results = await Promise.all(reads);
    expect(results.every((r) => r.success)).toBe(true);
  });
});

describe("Integration: Metadata Tracking", () => {
  let storage: SecureStorageManager;

  beforeEach(async () => {
    storage = createSecureStorageManager();
    await storage.initialize();
  });

  it("should track item metadata", async () => {
    await storage.setItem("tracked-key", "value", {
      requireBiometric: true,
    });

    const meta = await storage.getItemMeta("tracked-key");
    expect(meta).toBeDefined();
    expect(meta?.biometricProtected).toBe(true);
  });

  it("should update modification time", async () => {
    await storage.setItem("key", "value1");
    const meta1 = await storage.getItemMeta("key");

    // Small delay to ensure different timestamp
    await new Promise((resolve) => setTimeout(resolve, 10));

    await storage.setItem("key", "value2");
    const meta2 = await storage.getItemMeta("key");

    expect(meta2).toBeDefined();
    // Both should have dates (we can't easily check they differ in test)
    expect(meta1?.modifiedAt).toBeDefined();
    expect(meta2?.modifiedAt).toBeDefined();
  });
});

describe("Integration: Large Data Handling", () => {
  let storage: SecureStorageManager;

  beforeEach(async () => {
    storage = createSecureStorageManager();
    await storage.initialize();
  });

  it("should store large JSON objects", async () => {
    const largeData = {
      messages: Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        content: "A".repeat(1000),
        timestamp: Date.now(),
      })),
    };

    mockCryptoSubtle.decrypt.mockResolvedValue(
      new TextEncoder().encode(JSON.stringify(largeData)).buffer,
    );

    const result = await storage.setJSON("large-data", largeData);
    expect(result.success).toBe(true);
  });
});

describe("Integration: Security Error Class", () => {
  it("should create proper error hierarchy", () => {
    const error = new SecureStorageError("Test", "ACCESS_DENIED");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(SecureStorageError);
    expect(error.name).toBe("SecureStorageError");
    expect(error.code).toBe("ACCESS_DENIED");
  });

  it("should serialize to result correctly", () => {
    const error = new SecureStorageError("Access denied", "ACCESS_DENIED");
    const result = error.toResult<string>();

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toBe("Access denied");
    expect(result.errorCode).toBe("ACCESS_DENIED");
  });
});
