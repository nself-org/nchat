/**
 * Key Manager Unit Tests
 *
 * Comprehensive tests for cryptographic key management including
 * key generation, storage, export/import, rotation, and derivation.
 */

import {
  KeyManager,
  KeyPair,
  ExportedKeyPair,
  StoredKeyData,
  KeyMetadata,
  generateKeyPair,
  generateSigningKeyPair,
  generateDeviceId,
  exportKey,
  exportKeyPair,
  importPublicKey,
  importPrivateKey,
  importKeyPair,
  importSigningPublicKey,
  importSigningPrivateKey,
  storeKeyPair,
  retrieveKeyPair,
  retrieveKeyMetadata,
  clearStoredKeys,
  rotateKeyPair,
  isKeyRotationNeeded,
  deriveSharedSecret,
  deriveEncryptionKey,
  getKeyFingerprint,
  compareFingerprints,
  openKeyDatabase,
  deleteKeyDatabase,
} from "../key-manager";

// ============================================================================
// Mock Setup
// ============================================================================

const mockPublicKey = {} as CryptoKey;
const mockPrivateKey = {} as CryptoKey;
const mockKeyPair: CryptoKeyPair = {
  publicKey: mockPublicKey,
  privateKey: mockPrivateKey,
};

const mockJwk: JsonWebKey = {
  kty: "EC",
  crv: "P-256",
  x: "test-x-coordinate",
  y: "test-y-coordinate",
};

const mockPrivateJwk: JsonWebKey = {
  ...mockJwk,
  d: "test-d-private",
};

const mockExportedKeyPair: ExportedKeyPair = {
  publicKey: mockJwk,
  privateKey: mockPrivateJwk,
};

// Mock IndexedDB
const createMockIDBRequest = <T>(
  result: T,
  error: DOMException | null = null,
) => {
  const request = {
    result,
    error,
    onsuccess: null as ((ev: Event) => void) | null,
    onerror: null as ((ev: Event) => void) | null,
    onupgradeneeded: null as ((ev: IDBVersionChangeEvent) => void) | null,
  };
  setTimeout(() => {
    if (error && request.onerror) {
      request.onerror({} as Event);
    } else if (request.onsuccess) {
      request.onsuccess({} as Event);
    }
  }, 0);
  return request;
};

const createMockObjectStore = () => ({
  put: jest.fn().mockReturnValue(createMockIDBRequest(undefined)),
  get: jest.fn().mockReturnValue(createMockIDBRequest(undefined)),
  clear: jest.fn().mockReturnValue(createMockIDBRequest(undefined)),
});

const createMockTransaction = () => {
  const store = createMockObjectStore();
  const transaction = {
    objectStore: jest.fn().mockReturnValue(store),
    oncomplete: null as (() => void) | null,
    onerror: null as (() => void) | null,
  };
  setTimeout(() => {
    if (transaction.oncomplete) {
      transaction.oncomplete();
    }
  }, 10);
  return { transaction, store };
};

const createMockDatabase = () => {
  const { transaction, store } = createMockTransaction();
  return {
    db: {
      transaction: jest.fn().mockReturnValue(transaction),
      objectStoreNames: { contains: jest.fn().mockReturnValue(true) },
      createObjectStore: jest.fn(),
      close: jest.fn(),
    },
    transaction,
    store,
  };
};

// Mock crypto.subtle
const mockCryptoSubtle = {
  generateKey: jest.fn(),
  exportKey: jest.fn(),
  importKey: jest.fn(),
  deriveKey: jest.fn(),
  deriveBits: jest.fn(),
  digest: jest.fn(),
  encrypt: jest.fn(),
  decrypt: jest.fn(),
};

const mockGetRandomValues = jest.fn((arr: Uint8Array) => {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = Math.floor(Math.random() * 256);
  }
  return arr;
});

// Store original crypto
const originalCrypto = global.crypto;

beforeAll(() => {
  // Mock crypto globally
  Object.defineProperty(global, "crypto", {
    value: {
      subtle: mockCryptoSubtle,
      getRandomValues: mockGetRandomValues,
    },
    writable: true,
  });
});

afterAll(() => {
  // Restore original crypto
  Object.defineProperty(global, "crypto", {
    value: originalCrypto,
    writable: true,
  });
});

beforeEach(() => {
  jest.clearAllMocks();

  // Default mock implementations
  mockCryptoSubtle.generateKey.mockResolvedValue(mockKeyPair);
  mockCryptoSubtle.exportKey.mockResolvedValue(mockJwk);
  mockCryptoSubtle.importKey.mockResolvedValue(mockPublicKey);
  mockCryptoSubtle.deriveKey.mockResolvedValue({} as CryptoKey);
  mockCryptoSubtle.deriveBits.mockResolvedValue(new ArrayBuffer(32));
  mockCryptoSubtle.digest.mockResolvedValue(new ArrayBuffer(32));
});

// ============================================================================
// Key Generation Tests
// ============================================================================

describe("Key Generation", () => {
  describe("generateKeyPair", () => {
    it("should generate an ECDH key pair with default algorithm", async () => {
      const result = await generateKeyPair();

      expect(mockCryptoSubtle.generateKey).toHaveBeenCalledWith(
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey", "deriveBits"],
      );
      expect(result).toEqual({
        publicKey: mockPublicKey,
        privateKey: mockPrivateKey,
      });
    });

    it("should generate key pair with custom algorithm", async () => {
      const customAlgorithm: EcKeyGenParams = {
        name: "ECDH",
        namedCurve: "P-384",
      };
      await generateKeyPair(customAlgorithm);

      expect(mockCryptoSubtle.generateKey).toHaveBeenCalledWith(
        customAlgorithm,
        true,
        ["deriveKey", "deriveBits"],
      );
    });

    it("should throw error on generation failure", async () => {
      mockCryptoSubtle.generateKey.mockRejectedValue(
        new Error("Generation failed"),
      );

      await expect(generateKeyPair()).rejects.toThrow(
        "Failed to generate key pair: Generation failed",
      );
    });

    it("should handle unknown errors", async () => {
      mockCryptoSubtle.generateKey.mockRejectedValue("unknown error");

      await expect(generateKeyPair()).rejects.toThrow(
        "Failed to generate key pair: Unknown error",
      );
    });
  });

  describe("generateSigningKeyPair", () => {
    it("should generate an ECDSA signing key pair", async () => {
      await generateSigningKeyPair();

      expect(mockCryptoSubtle.generateKey).toHaveBeenCalledWith(
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign", "verify"],
      );
    });

    it("should throw error on generation failure", async () => {
      mockCryptoSubtle.generateKey.mockRejectedValue(
        new Error("Signing key generation failed"),
      );

      await expect(generateSigningKeyPair()).rejects.toThrow(
        "Failed to generate signing key pair: Signing key generation failed",
      );
    });
  });

  describe("generateDeviceId", () => {
    it("should generate a 32-character hex string", () => {
      const deviceId = generateDeviceId();

      expect(deviceId).toHaveLength(32);
      expect(/^[0-9a-f]{32}$/.test(deviceId)).toBe(true);
    });

    it("should generate unique IDs", () => {
      const id1 = generateDeviceId();
      const id2 = generateDeviceId();

      expect(id1).not.toBe(id2);
    });

    it("should use crypto.getRandomValues", () => {
      generateDeviceId();

      expect(mockGetRandomValues).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// Key Export/Import Tests
// ============================================================================

describe("Key Export/Import", () => {
  describe("exportKey", () => {
    it("should export a key to JWK format", async () => {
      const result = await exportKey(mockPublicKey);

      expect(mockCryptoSubtle.exportKey).toHaveBeenCalledWith(
        "jwk",
        mockPublicKey,
      );
      expect(result).toEqual(mockJwk);
    });

    it("should throw error on export failure", async () => {
      mockCryptoSubtle.exportKey.mockRejectedValue(new Error("Export failed"));

      await expect(exportKey(mockPublicKey)).rejects.toThrow(
        "Failed to export key: Export failed",
      );
    });
  });

  describe("exportKeyPair", () => {
    it("should export both public and private keys", async () => {
      mockCryptoSubtle.exportKey
        .mockResolvedValueOnce(mockJwk)
        .mockResolvedValueOnce(mockPrivateJwk);

      const result = await exportKeyPair({
        publicKey: mockPublicKey,
        privateKey: mockPrivateKey,
      });

      expect(result).toEqual({
        publicKey: mockJwk,
        privateKey: mockPrivateJwk,
      });
    });

    it("should call exportKey for both keys", async () => {
      await exportKeyPair({
        publicKey: mockPublicKey,
        privateKey: mockPrivateKey,
      });

      expect(mockCryptoSubtle.exportKey).toHaveBeenCalledTimes(2);
    });
  });

  describe("importPublicKey", () => {
    it("should import a public key from JWK", async () => {
      const result = await importPublicKey(mockJwk);

      expect(mockCryptoSubtle.importKey).toHaveBeenCalledWith(
        "jwk",
        mockJwk,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        [],
      );
      expect(result).toBe(mockPublicKey);
    });

    it("should import with custom algorithm", async () => {
      const customAlgorithm: EcKeyImportParams = {
        name: "ECDH",
        namedCurve: "P-384",
      };
      await importPublicKey(mockJwk, customAlgorithm);

      expect(mockCryptoSubtle.importKey).toHaveBeenCalledWith(
        "jwk",
        mockJwk,
        customAlgorithm,
        true,
        [],
      );
    });

    it("should throw error on import failure", async () => {
      mockCryptoSubtle.importKey.mockRejectedValue(new Error("Import failed"));

      await expect(importPublicKey(mockJwk)).rejects.toThrow(
        "Failed to import public key: Import failed",
      );
    });
  });

  describe("importPrivateKey", () => {
    it("should import a private key from JWK", async () => {
      await importPrivateKey(mockPrivateJwk);

      expect(mockCryptoSubtle.importKey).toHaveBeenCalledWith(
        "jwk",
        mockPrivateJwk,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey", "deriveBits"],
      );
    });

    it("should throw error on import failure", async () => {
      mockCryptoSubtle.importKey.mockRejectedValue(
        new Error("Private key import failed"),
      );

      await expect(importPrivateKey(mockPrivateJwk)).rejects.toThrow(
        "Failed to import private key: Private key import failed",
      );
    });
  });

  describe("importKeyPair", () => {
    it("should import both public and private keys", async () => {
      mockCryptoSubtle.importKey
        .mockResolvedValueOnce(mockPublicKey)
        .mockResolvedValueOnce(mockPrivateKey);

      const result = await importKeyPair(mockExportedKeyPair);

      expect(result).toEqual({
        publicKey: mockPublicKey,
        privateKey: mockPrivateKey,
      });
    });

    it("should use custom algorithm for both imports", async () => {
      const customAlgorithm: EcKeyImportParams = {
        name: "ECDH",
        namedCurve: "P-384",
      };
      await importKeyPair(mockExportedKeyPair, customAlgorithm);

      expect(mockCryptoSubtle.importKey).toHaveBeenCalledTimes(2);
    });
  });

  describe("importSigningPublicKey", () => {
    it("should import a signing public key", async () => {
      await importSigningPublicKey(mockJwk);

      expect(mockCryptoSubtle.importKey).toHaveBeenCalledWith(
        "jwk",
        mockJwk,
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["verify"],
      );
    });

    it("should throw error on import failure", async () => {
      mockCryptoSubtle.importKey.mockRejectedValue(
        new Error("Signing key import failed"),
      );

      await expect(importSigningPublicKey(mockJwk)).rejects.toThrow(
        "Failed to import signing public key: Signing key import failed",
      );
    });
  });

  describe("importSigningPrivateKey", () => {
    it("should import a signing private key", async () => {
      await importSigningPrivateKey(mockPrivateJwk);

      expect(mockCryptoSubtle.importKey).toHaveBeenCalledWith(
        "jwk",
        mockPrivateJwk,
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign"],
      );
    });

    it("should throw error on import failure", async () => {
      mockCryptoSubtle.importKey.mockRejectedValue(
        new Error("Signing private key import failed"),
      );

      await expect(importSigningPrivateKey(mockPrivateJwk)).rejects.toThrow(
        "Failed to import signing private key: Signing private key import failed",
      );
    });
  });
});

// ============================================================================
// Key Derivation Tests
// ============================================================================

describe("Key Derivation", () => {
  describe("deriveSharedSecret", () => {
    it("should derive a shared secret", async () => {
      const mockBits = new ArrayBuffer(32);
      mockCryptoSubtle.deriveBits.mockResolvedValue(mockBits);

      const result = await deriveSharedSecret(mockPrivateKey, mockPublicKey);

      expect(mockCryptoSubtle.deriveBits).toHaveBeenCalledWith(
        { name: "ECDH", public: mockPublicKey },
        mockPrivateKey,
        256,
      );
      expect(result).toBe(mockBits);
    });

    it("should use custom bit length", async () => {
      await deriveSharedSecret(mockPrivateKey, mockPublicKey, 384);

      expect(mockCryptoSubtle.deriveBits).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        384,
      );
    });

    it("should throw error on derivation failure", async () => {
      mockCryptoSubtle.deriveBits.mockRejectedValue(
        new Error("Derivation failed"),
      );

      await expect(
        deriveSharedSecret(mockPrivateKey, mockPublicKey),
      ).rejects.toThrow("Failed to derive shared secret: Derivation failed");
    });
  });

  describe("deriveEncryptionKey", () => {
    it("should derive an AES-GCM encryption key", async () => {
      const mockDerivedKey = {} as CryptoKey;
      mockCryptoSubtle.deriveKey.mockResolvedValue(mockDerivedKey);

      const result = await deriveEncryptionKey(mockPrivateKey, mockPublicKey);

      expect(mockCryptoSubtle.deriveKey).toHaveBeenCalledWith(
        { name: "ECDH", public: mockPublicKey },
        mockPrivateKey,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"],
      );
      expect(result).toBe(mockDerivedKey);
    });

    it("should throw error on derivation failure", async () => {
      mockCryptoSubtle.deriveKey.mockRejectedValue(
        new Error("Key derivation failed"),
      );

      await expect(
        deriveEncryptionKey(mockPrivateKey, mockPublicKey),
      ).rejects.toThrow(
        "Failed to derive encryption key: Key derivation failed",
      );
    });
  });
});

// ============================================================================
// Key Fingerprinting Tests
// ============================================================================

describe("Key Fingerprinting", () => {
  describe("getKeyFingerprint", () => {
    it("should generate a fingerprint from public key", async () => {
      const mockHashBuffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer;
      mockCryptoSubtle.digest.mockResolvedValue(mockHashBuffer);

      const result = await getKeyFingerprint(mockPublicKey);

      expect(mockCryptoSubtle.exportKey).toHaveBeenCalledWith(
        "jwk",
        mockPublicKey,
      );
      expect(mockCryptoSubtle.digest).toHaveBeenCalledWith(
        "SHA-256",
        expect.any(Uint8Array),
      );
      expect(typeof result).toBe("string");
    });

    it("should format fingerprint as uppercase hex groups", async () => {
      const mockHashBuffer = new Uint8Array([
        0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
      ]).buffer;
      mockCryptoSubtle.digest.mockResolvedValue(mockHashBuffer);

      const result = await getKeyFingerprint(mockPublicKey);

      expect(result).toMatch(/^[0-9A-F]{4}(\s[0-9A-F]{4})*$/i);
    });
  });

  describe("compareFingerprints", () => {
    it("should return true for matching fingerprints", () => {
      const fp1 = "0102 0304 0506 0708";
      const fp2 = "0102 0304 0506 0708";

      expect(compareFingerprints(fp1, fp2)).toBe(true);
    });

    it("should ignore whitespace differences", () => {
      const fp1 = "0102 0304 0506 0708";
      const fp2 = "01020304 05060708";

      expect(compareFingerprints(fp1, fp2)).toBe(true);
    });

    it("should ignore case differences", () => {
      const fp1 = "ABCD EFGH";
      const fp2 = "abcd efgh";

      expect(compareFingerprints(fp1, fp2)).toBe(true);
    });

    it("should return false for non-matching fingerprints", () => {
      const fp1 = "0102 0304 0506 0708";
      const fp2 = "0102 0304 0506 0709";

      expect(compareFingerprints(fp1, fp2)).toBe(false);
    });
  });
});

// ============================================================================
// Key Rotation Tests
// ============================================================================

describe("Key Rotation", () => {
  describe("isKeyRotationNeeded", () => {
    it("should return false for recent keys", () => {
      const metadata: KeyMetadata = {
        id: "test-key",
        deviceId: "device-123",
        status: "active",
        createdAt: new Date(),
        rotatedAt: null,
        version: 1,
      };

      expect(isKeyRotationNeeded(metadata, 30)).toBe(false);
    });

    it("should return true for old keys", () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);

      const metadata: KeyMetadata = {
        id: "test-key",
        deviceId: "device-123",
        status: "active",
        createdAt: oldDate,
        rotatedAt: null,
        version: 1,
      };

      expect(isKeyRotationNeeded(metadata, 30)).toBe(true);
    });

    it("should use custom max age", () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 8);

      const metadata: KeyMetadata = {
        id: "test-key",
        deviceId: "device-123",
        status: "active",
        createdAt: oldDate,
        rotatedAt: null,
        version: 1,
      };

      expect(isKeyRotationNeeded(metadata, 7)).toBe(true);
      expect(isKeyRotationNeeded(metadata, 14)).toBe(false);
    });

    it("should handle exactly max age", () => {
      const exactDate = new Date();
      exactDate.setDate(exactDate.getDate() - 30);

      const metadata: KeyMetadata = {
        id: "test-key",
        deviceId: "device-123",
        status: "active",
        createdAt: exactDate,
        rotatedAt: null,
        version: 1,
      };

      expect(isKeyRotationNeeded(metadata, 30)).toBe(true);
    });
  });
});

// ============================================================================
// IndexedDB Helper Tests
// ============================================================================

describe("IndexedDB Helpers", () => {
  let mockIndexedDB: {
    open: jest.Mock;
    deleteDatabase: jest.Mock;
  };

  beforeEach(() => {
    mockIndexedDB = {
      open: jest.fn(),
      deleteDatabase: jest.fn(),
    };
    Object.defineProperty(global, "indexedDB", {
      value: mockIndexedDB,
      writable: true,
    });
  });

  describe("openKeyDatabase", () => {
    it("should open database with default name", async () => {
      const { db } = createMockDatabase();
      const request = createMockIDBRequest(db);
      mockIndexedDB.open.mockReturnValue(request);

      const promise = openKeyDatabase();
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockIndexedDB.open).toHaveBeenCalledWith("nchat-encryption", 1);
      await expect(promise).resolves.toBe(db);
    });

    it("should open database with custom name", async () => {
      const { db } = createMockDatabase();
      const request = createMockIDBRequest(db);
      mockIndexedDB.open.mockReturnValue(request);

      openKeyDatabase("custom-db", "custom-store");

      expect(mockIndexedDB.open).toHaveBeenCalledWith("custom-db", 1);
    });

    it("should create object store on upgrade", async () => {
      const { db } = createMockDatabase();
      db.objectStoreNames.contains = jest.fn().mockReturnValue(false);

      const request = {
        result: db,
        error: null,
        onsuccess: null as ((ev: Event) => void) | null,
        onerror: null as ((ev: Event) => void) | null,
        onupgradeneeded: null as ((ev: IDBVersionChangeEvent) => void) | null,
      };

      mockIndexedDB.open.mockReturnValue(request);

      const promise = openKeyDatabase();

      // Trigger upgrade
      setTimeout(() => {
        if (request.onupgradeneeded) {
          request.onupgradeneeded({
            target: request,
          } as unknown as IDBVersionChangeEvent);
        }
        if (request.onsuccess) {
          request.onsuccess({} as Event);
        }
      }, 0);

      await promise;

      expect(db.createObjectStore).toHaveBeenCalledWith("keys", {
        keyPath: "id",
      });
    });

    it("should reject on error", async () => {
      const error = { message: "Database error" } as DOMException;
      const request = {
        result: null,
        error,
        onsuccess: null as ((ev: Event) => void) | null,
        onerror: null as ((ev: Event) => void) | null,
        onupgradeneeded: null as ((ev: IDBVersionChangeEvent) => void) | null,
      };

      mockIndexedDB.open.mockReturnValue(request);

      const promise = openKeyDatabase();

      setTimeout(() => {
        if (request.onerror) {
          request.onerror({} as Event);
        }
      }, 0);

      await expect(promise).rejects.toThrow(
        "Failed to open key database: Database error",
      );
    });
  });

  describe("deleteKeyDatabase", () => {
    it("should delete database with default name", async () => {
      const request = createMockIDBRequest(undefined);
      mockIndexedDB.deleteDatabase.mockReturnValue(request);

      const promise = deleteKeyDatabase();
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockIndexedDB.deleteDatabase).toHaveBeenCalledWith(
        "nchat-encryption",
      );
      await expect(promise).resolves.toBeUndefined();
    });

    it("should delete database with custom name", async () => {
      const request = createMockIDBRequest(undefined);
      mockIndexedDB.deleteDatabase.mockReturnValue(request);

      deleteKeyDatabase("custom-db");

      expect(mockIndexedDB.deleteDatabase).toHaveBeenCalledWith("custom-db");
    });

    it("should reject on error", async () => {
      const error = { message: "Delete error" } as DOMException;
      const request = {
        result: undefined,
        error,
        onsuccess: null as ((ev: Event) => void) | null,
        onerror: null as ((ev: Event) => void) | null,
      };

      mockIndexedDB.deleteDatabase.mockReturnValue(request);

      const promise = deleteKeyDatabase();

      setTimeout(() => {
        if (request.onerror) {
          request.onerror({} as Event);
        }
      }, 0);

      await expect(promise).rejects.toThrow(
        "Failed to delete key database: Delete error",
      );
    });
  });
});

// ============================================================================
// KeyManager Class Tests
// ============================================================================

describe("KeyManager Class", () => {
  let keyManager: KeyManager;
  let mockIndexedDB: {
    open: jest.Mock;
    deleteDatabase: jest.Mock;
  };

  beforeEach(() => {
    keyManager = new KeyManager();

    mockIndexedDB = {
      open: jest.fn(),
      deleteDatabase: jest.fn(),
    };
    Object.defineProperty(global, "indexedDB", {
      value: mockIndexedDB,
      writable: true,
    });
  });

  describe("constructor", () => {
    it("should create with default config", () => {
      const km = new KeyManager();
      expect(km).toBeDefined();
    });

    it("should create with custom config", () => {
      const km = new KeyManager({
        dbName: "custom-db",
        storeName: "custom-store",
        keyAlgorithm: { name: "ECDH", namedCurve: "P-384" },
      });
      expect(km).toBeDefined();
    });
  });

  describe("getCurrentKeyPair", () => {
    it("should return null before initialization", () => {
      expect(keyManager.getCurrentKeyPair()).toBeNull();
    });
  });

  describe("getDeviceId", () => {
    it("should return null before initialization", () => {
      expect(keyManager.getDeviceId()).toBeNull();
    });
  });

  describe("getFingerprint", () => {
    it("should return null before initialization", async () => {
      const result = await keyManager.getFingerprint();
      expect(result).toBeNull();
    });
  });

  describe("exportPublicKey", () => {
    it("should return null before initialization", async () => {
      const result = await keyManager.exportPublicKey();
      expect(result).toBeNull();
    });
  });

  describe("deriveKeyWithPeer", () => {
    it("should throw error before initialization", async () => {
      await expect(keyManager.deriveKeyWithPeer(mockJwk)).rejects.toThrow(
        "Key manager not initialized",
      );
    });
  });
});

// ============================================================================
// Integration-like Tests (with mocked DB)
// ============================================================================

describe("Key Storage Integration", () => {
  let mockIndexedDB: {
    open: jest.Mock;
    deleteDatabase: jest.Mock;
  };
  let storedData: Map<string, StoredKeyData>;

  beforeEach(() => {
    storedData = new Map();

    const createMockStore = () => ({
      put: jest.fn((data: StoredKeyData) => {
        storedData.set(data.id, data);
        return createMockIDBRequest(undefined);
      }),
      get: jest.fn((id: string) => {
        return createMockIDBRequest(storedData.get(id));
      }),
      clear: jest.fn(() => {
        storedData.clear();
        return createMockIDBRequest(undefined);
      }),
    });

    const createMockTx = () => {
      const store = createMockStore();
      const tx = {
        objectStore: jest.fn().mockReturnValue(store),
        oncomplete: null as (() => void) | null,
        onerror: null as (() => void) | null,
      };
      setTimeout(() => {
        if (tx.oncomplete) tx.oncomplete();
      }, 5);
      return { tx, store };
    };

    const { tx } = createMockTx();
    const mockDb = {
      transaction: jest.fn().mockReturnValue(tx),
      objectStoreNames: { contains: jest.fn().mockReturnValue(true) },
      createObjectStore: jest.fn(),
      close: jest.fn(),
    };

    mockIndexedDB = {
      open: jest.fn().mockReturnValue(createMockIDBRequest(mockDb)),
      deleteDatabase: jest
        .fn()
        .mockReturnValue(createMockIDBRequest(undefined)),
    };

    Object.defineProperty(global, "indexedDB", {
      value: mockIndexedDB,
      writable: true,
    });
  });

  describe("storeKeyPair", () => {
    it("should store a key pair with device ID", async () => {
      const keyPair: KeyPair = {
        publicKey: mockPublicKey,
        privateKey: mockPrivateKey,
      };

      mockCryptoSubtle.exportKey
        .mockResolvedValueOnce(mockJwk)
        .mockResolvedValueOnce(mockPrivateJwk);

      const result = await storeKeyPair(keyPair, "device-123");

      expect(result).toMatchObject({
        id: "current-identity-key",
        deviceId: "device-123",
        version: 1,
      });
      expect(result.publicKey).toEqual(mockJwk);
      expect(result.privateKey).toEqual(mockPrivateJwk);
    });

    it("should use custom database config", async () => {
      const keyPair: KeyPair = {
        publicKey: mockPublicKey,
        privateKey: mockPrivateKey,
      };

      mockCryptoSubtle.exportKey
        .mockResolvedValueOnce(mockJwk)
        .mockResolvedValueOnce(mockPrivateJwk);

      await storeKeyPair(keyPair, "device-123", {
        dbName: "custom-db",
        storeName: "custom-store",
      });

      expect(mockIndexedDB.open).toHaveBeenCalledWith("custom-db", 1);
    });
  });
});

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

describe("Edge Cases", () => {
  describe("Error Message Handling", () => {
    it("should handle Error instances", async () => {
      mockCryptoSubtle.generateKey.mockRejectedValue(
        new Error("Specific error"),
      );

      await expect(generateKeyPair()).rejects.toThrow(
        "Failed to generate key pair: Specific error",
      );
    });

    it("should handle non-Error throws", async () => {
      mockCryptoSubtle.generateKey.mockRejectedValue("string error");

      await expect(generateKeyPair()).rejects.toThrow(
        "Failed to generate key pair: Unknown error",
      );
    });

    it("should handle null/undefined throws", async () => {
      mockCryptoSubtle.generateKey.mockRejectedValue(null);

      await expect(generateKeyPair()).rejects.toThrow(
        "Failed to generate key pair: Unknown error",
      );
    });
  });

  describe("Empty and Boundary Values", () => {
    it("should handle empty fingerprints comparison", () => {
      expect(compareFingerprints("", "")).toBe(true);
    });

    it("should handle whitespace-only fingerprints", () => {
      expect(compareFingerprints("   ", "")).toBe(true);
    });

    it("should handle zero-day rotation check", () => {
      const metadata: KeyMetadata = {
        id: "test",
        deviceId: "device",
        status: "active",
        createdAt: new Date(),
        rotatedAt: null,
        version: 1,
      };

      expect(isKeyRotationNeeded(metadata, 0)).toBe(true);
    });
  });
});
