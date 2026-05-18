/**
 * Pre-Key Bundle Manager Tests
 *
 * Tests for pre-key bundle generation, storage, and lifecycle management.
 */

import {
  PreKeyBundleManager,
  createPreKeyBundleManager,
  type PreKeyBundleState,
  type PreKeySyncRequest,
  type ValidationResult,
} from "../prekey-bundle";
import { type PreKeyBundle } from "../x3dh";

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock storage
class MockStorage implements Storage {
  private data: Map<string, string> = new Map();

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

// Setup Web Crypto API
const originalCrypto = global.crypto;
beforeAll(() => {
  if (!global.crypto?.subtle) {
    const { webcrypto } = require("crypto");
    global.crypto = webcrypto as Crypto;
  }
});

afterAll(() => {
  global.crypto = originalCrypto;
});

describe("PreKeyBundleManager Initialization", () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
  });

  it("should create and initialize a bundle manager", async () => {
    const manager = await createPreKeyBundleManager(
      "user-1",
      "device-1",
      storage,
    );

    expect(manager.isInitialized()).toBe(true);

    manager.destroy();
  });

  it("should generate identity key pair on init", async () => {
    const manager = await createPreKeyBundleManager(
      "user-1",
      "device-1",
      storage,
    );

    const identityKeyPair = manager.getIdentityKeyPair();

    expect(identityKeyPair).not.toBeNull();
    expect(identityKeyPair!.type).toBe("identity");
    expect(identityKeyPair!.publicKey).toBeInstanceOf(Uint8Array);
    expect(identityKeyPair!.privateKey).toBeInstanceOf(Uint8Array);

    manager.destroy();
  });

  it("should generate signed pre-key on init", async () => {
    const manager = await createPreKeyBundleManager(
      "user-1",
      "device-1",
      storage,
    );

    const signedPreKey = manager.getSignedPreKey();

    expect(signedPreKey).not.toBeNull();
    expect(signedPreKey!.type).toBe("signed-prekey");
    expect(signedPreKey!.signature).toBeInstanceOf(Uint8Array);

    manager.destroy();
  });

  it("should generate one-time pre-keys on init", async () => {
    const manager = await createPreKeyBundleManager(
      "user-1",
      "device-1",
      storage,
    );

    const count = manager.getUnusedOneTimePreKeyCount();

    expect(count).toBe(100); // Default count

    manager.destroy();
  });

  it("should generate registration ID", async () => {
    const manager = await createPreKeyBundleManager(
      "user-1",
      "device-1",
      storage,
    );

    const registrationId = manager.getRegistrationId();

    expect(typeof registrationId).toBe("number");
    expect(registrationId).toBeGreaterThan(0);

    manager.destroy();
  });

  it("should load existing state from storage", async () => {
    // Create first manager
    const manager1 = await createPreKeyBundleManager(
      "user-1",
      "device-1",
      storage,
    );
    const originalRegistrationId = manager1.getRegistrationId();
    manager1.destroy();

    // Create second manager - should load state
    const manager2 = await createPreKeyBundleManager(
      "user-1",
      "device-1",
      storage,
    );

    expect(manager2.getRegistrationId()).toBe(originalRegistrationId);

    manager2.destroy();
  });

  it("should generate new state for different user", async () => {
    // Create manager for user-1
    const manager1 = await createPreKeyBundleManager(
      "user-1",
      "device-1",
      storage,
    );
    const user1RegistrationId = manager1.getRegistrationId();

    // Create manager for user-2 (different user)
    const manager2 = await createPreKeyBundleManager(
      "user-2",
      "device-1",
      storage,
    );

    // Should have different registration ID (new state generated)
    expect(manager2.getRegistrationId()).not.toBe(user1RegistrationId);

    manager1.destroy();
    manager2.destroy();
  });
});

describe("PreKeyBundleManager Bundle Access", () => {
  let manager: PreKeyBundleManager;
  let storage: MockStorage;

  beforeEach(async () => {
    storage = new MockStorage();
    manager = await createPreKeyBundleManager("user-1", "device-1", storage);
  });

  afterEach(() => {
    manager.destroy();
  });

  it("should return a valid pre-key bundle", () => {
    const bundle = manager.getPreKeyBundle();

    expect(bundle.userId).toBe("user-1");
    expect(bundle.deviceId).toBe("device-1");
    expect(bundle.registrationId).toBe(manager.getRegistrationId());
    expect(bundle.identityKey).toBeInstanceOf(Uint8Array);
    expect(bundle.signedPreKey).toBeInstanceOf(Uint8Array);
    expect(bundle.signedPreKeySignature).toBeInstanceOf(Uint8Array);
    expect(bundle.signedPreKeyId).toBeDefined();
    expect(bundle.version).toBe(1);
  });

  it("should include one-time pre-key when available", () => {
    const bundle = manager.getPreKeyBundle();

    expect(bundle.oneTimePreKeyId).toBeDefined();
    expect(bundle.oneTimePreKey).toBeInstanceOf(Uint8Array);
  });

  it("should return unused one-time pre-keys", () => {
    const preKeys = manager.getUnusedOneTimePreKeys();

    expect(preKeys.length).toBeGreaterThan(0);
    preKeys.forEach((key) => {
      expect(key.type).toBe("one-time-prekey");
      expect(key.used).toBe(false);
    });
  });

  it("should get specific one-time pre-key by ID", () => {
    const preKeys = manager.getUnusedOneTimePreKeys();
    const firstKey = preKeys[0];

    const retrieved = manager.getOneTimePreKey(firstKey.keyId);

    expect(retrieved).not.toBeNull();
    expect(retrieved!.keyId).toBe(firstKey.keyId);
  });

  it("should return null for non-existent one-time pre-key", () => {
    const retrieved = manager.getOneTimePreKey(999999);

    expect(retrieved).toBeNull();
  });
});

describe("PreKeyBundleManager One-Time Pre-Key Management", () => {
  let manager: PreKeyBundleManager;
  let storage: MockStorage;

  beforeEach(async () => {
    storage = new MockStorage();
    manager = await createPreKeyBundleManager("user-1", "device-1", storage);
  });

  afterEach(() => {
    manager.destroy();
  });

  it("should mark one-time pre-key as used", () => {
    const preKeys = manager.getUnusedOneTimePreKeys();
    const keyId = preKeys[0].keyId;

    manager.markOneTimePreKeyUsed(keyId);

    const retrieved = manager.getOneTimePreKey(keyId);
    expect(retrieved!.used).toBe(true);
  });

  it("should not include used keys in unused list", () => {
    const preKeys = manager.getUnusedOneTimePreKeys();
    const keyId = preKeys[0].keyId;

    manager.markOneTimePreKeyUsed(keyId);

    const unusedKeys = manager.getUnusedOneTimePreKeys();
    expect(unusedKeys.find((k) => k.keyId === keyId)).toBeUndefined();
  });

  it("should decrease unused count after marking used", () => {
    const initialCount = manager.getUnusedOneTimePreKeyCount();
    const preKeys = manager.getUnusedOneTimePreKeys();

    manager.markOneTimePreKeyUsed(preKeys[0].keyId);
    manager.markOneTimePreKeyUsed(preKeys[1].keyId);

    expect(manager.getUnusedOneTimePreKeyCount()).toBe(initialCount - 2);
  });

  it("should cleanup used one-time pre-keys", () => {
    const preKeys = manager.getUnusedOneTimePreKeys();
    manager.markOneTimePreKeyUsed(preKeys[0].keyId);
    manager.markOneTimePreKeyUsed(preKeys[1].keyId);

    const removed = manager.cleanupUsedOneTimePreKeys();

    expect(removed).toBe(2);
  });

  it("should replenish one-time pre-keys if needed", async () => {
    // Mark many keys as used to trigger low count
    const preKeys = manager.getUnusedOneTimePreKeys();
    for (let i = 0; i < 95; i++) {
      manager.markOneTimePreKeyUsed(preKeys[i].keyId);
    }
    manager.cleanupUsedOneTimePreKeys();

    // Should be below threshold (10)
    expect(manager.getUnusedOneTimePreKeyCount()).toBeLessThan(10);

    const newKeys = await manager.replenishOneTimePreKeysIfNeeded();

    expect(newKeys.length).toBeGreaterThan(0);
    expect(manager.getUnusedOneTimePreKeyCount()).toBeGreaterThan(10);
  });

  it("should not replenish if count is sufficient", async () => {
    const newKeys = await manager.replenishOneTimePreKeysIfNeeded();

    expect(newKeys.length).toBe(0);
  });

  it("should generate more one-time pre-keys on demand", async () => {
    const initialCount = manager.getUnusedOneTimePreKeyCount();

    const newKeys = await manager.generateMoreOneTimePreKeys(20);

    expect(newKeys.length).toBe(20);
    expect(manager.getUnusedOneTimePreKeyCount()).toBe(initialCount + 20);
  });

  it("should generate keys with sequential IDs", async () => {
    const existingKeys = manager.getUnusedOneTimePreKeys();
    const maxExistingId = Math.max(...existingKeys.map((k) => k.keyId));

    const newKeys = await manager.generateMoreOneTimePreKeys(5);

    expect(newKeys[0].keyId).toBe(maxExistingId + 1);
    expect(newKeys[4].keyId).toBe(maxExistingId + 5);
  });
});

describe("PreKeyBundleManager Signed Pre-Key Management", () => {
  let manager: PreKeyBundleManager;
  let storage: MockStorage;

  beforeEach(async () => {
    storage = new MockStorage();
    manager = await createPreKeyBundleManager("user-1", "device-1", storage);
  });

  afterEach(() => {
    manager.destroy();
  });

  it("should rotate signed pre-key", async () => {
    const originalKeyId = manager.getSignedPreKey()!.keyId;

    const newKey = await manager.rotateSignedPreKey();

    expect(newKey.keyId).toBe(originalKeyId + 1);
    expect(manager.getSignedPreKey()!.keyId).toBe(originalKeyId + 1);
  });

  it("should generate new key material on rotation", async () => {
    const originalPublicKey = Array.from(manager.getSignedPreKey()!.publicKey);

    await manager.rotateSignedPreKey();

    const newPublicKey = Array.from(manager.getSignedPreKey()!.publicKey);
    expect(newPublicKey).not.toEqual(originalPublicKey);
  });

  it("should detect when rotation is needed", async () => {
    // Default is 7 days, so fresh key should not need rotation
    expect(manager.needsSignedPreKeyRotation()).toBe(false);
  });

  it("should not rotate if not needed", async () => {
    const originalKeyId = manager.getSignedPreKey()!.keyId;

    const rotated = await manager.rotateSignedPreKeyIfNeeded();

    expect(rotated).toBeNull();
    expect(manager.getSignedPreKey()!.keyId).toBe(originalKeyId);
  });
});

describe("PreKeyBundleManager Server Synchronization", () => {
  let manager: PreKeyBundleManager;
  let storage: MockStorage;

  beforeEach(async () => {
    storage = new MockStorage();
    manager = await createPreKeyBundleManager("user-1", "device-1", storage);
  });

  afterEach(() => {
    manager.destroy();
  });

  it("should create sync request", () => {
    const request = manager.createSyncRequest();

    expect(request.registrationId).toBe(manager.getRegistrationId());
    expect(typeof request.identityKey).toBe("string"); // Base64
    expect(request.signedPreKey.keyId).toBeDefined();
    expect(typeof request.signedPreKey.publicKey).toBe("string");
    expect(typeof request.signedPreKey.signature).toBe("string");
    expect(request.oneTimePreKeys.length).toBeGreaterThan(0);
  });

  it("should only include unused one-time pre-keys in sync request", () => {
    const preKeys = manager.getUnusedOneTimePreKeys();
    manager.markOneTimePreKeyUsed(preKeys[0].keyId);

    const request = manager.createSyncRequest();

    expect(
      request.oneTimePreKeys.find((k) => k.keyId === preKeys[0].keyId),
    ).toBeUndefined();
  });

  it("should handle consumption response", () => {
    const preKeys = manager.getUnusedOneTimePreKeys();
    const keyIds = [preKeys[0].keyId, preKeys[1].keyId];

    manager.handleConsumptionResponse({
      consumedKeyIds: keyIds,
      remainingCount: 98,
    });

    // Keys should be marked as used
    expect(manager.getOneTimePreKey(keyIds[0])!.used).toBe(true);
    expect(manager.getOneTimePreKey(keyIds[1])!.used).toBe(true);
  });

  it("should create replenishment request", async () => {
    const newKeys = await manager.generateMoreOneTimePreKeys(5);

    const request = manager.createReplenishmentRequest(newKeys);

    expect(request.length).toBe(5);
    request.forEach((key, index) => {
      expect(key.keyId).toBe(newKeys[index].keyId);
      expect(typeof key.publicKey).toBe("string");
    });
  });
});

describe("PreKeyBundleManager Validation", () => {
  let manager: PreKeyBundleManager;
  let storage: MockStorage;

  beforeEach(async () => {
    storage = new MockStorage();
    manager = await createPreKeyBundleManager("user-1", "device-1", storage);
  });

  afterEach(() => {
    manager.destroy();
  });

  it("should validate bundle as valid", () => {
    const result = manager.validateBundle();

    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it("should warn when one-time pre-keys are low", () => {
    // Use most of the keys
    const preKeys = manager.getUnusedOneTimePreKeys();
    for (let i = 0; i < 95; i++) {
      manager.markOneTimePreKeyUsed(preKeys[i].keyId);
    }
    manager.cleanupUsedOneTimePreKeys();

    const result = manager.validateBundle();

    expect(result.valid).toBe(true);
    expect(
      result.warnings.some((w) => w.includes("Low one-time pre-key")),
    ).toBe(true);
  });

  describe("validateRemoteBundle", () => {
    it("should validate a valid remote bundle", () => {
      const bundle = manager.getPreKeyBundle();

      const result = PreKeyBundleManager.validateRemoteBundle(bundle);

      expect(result.valid).toBe(true);
    });

    it("should reject bundle without user ID", () => {
      const bundle = manager.getPreKeyBundle();
      (bundle as any).userId = "";

      const result = PreKeyBundleManager.validateRemoteBundle(bundle);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("user ID"))).toBe(true);
    });

    it("should reject bundle without identity key", () => {
      const bundle = manager.getPreKeyBundle();
      (bundle as any).identityKey = new Uint8Array(0);

      const result = PreKeyBundleManager.validateRemoteBundle(bundle);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("identity key"))).toBe(true);
    });

    it("should warn when one-time pre-key is missing", () => {
      const bundle = manager.getPreKeyBundle();
      bundle.oneTimePreKey = undefined;

      const result = PreKeyBundleManager.validateRemoteBundle(bundle);

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes("one-time pre-key"))).toBe(
        true,
      );
    });
  });
});

describe("PreKeyBundleManager State Export/Import", () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
  });

  it("should export state", async () => {
    const manager = await createPreKeyBundleManager(
      "user-1",
      "device-1",
      storage,
    );

    const state = manager.exportState();

    expect(state).not.toBeNull();
    expect(state!.userId).toBe("user-1");
    expect(state!.deviceId).toBe("device-1");
    expect(state!.identityKeyPair).toBeDefined();
    expect(state!.signedPreKey).toBeDefined();
    expect(state!.oneTimePreKeys.length).toBeGreaterThan(0);

    manager.destroy();
  });

  it("should import state", async () => {
    // Create and export state
    const manager1 = await createPreKeyBundleManager(
      "user-1",
      "device-1",
      storage,
    );
    const exportedState = manager1.exportState()!;
    manager1.destroy();

    // Create new manager and import
    const manager2 = new PreKeyBundleManager(new MockStorage());
    manager2.importState(exportedState);

    expect(manager2.isInitialized()).toBe(true);
    expect(manager2.getRegistrationId()).toBe(exportedState.registrationId);

    manager2.destroy();
  });

  it("should preserve keys through export/import", async () => {
    const manager1 = await createPreKeyBundleManager(
      "user-1",
      "device-1",
      storage,
    );
    const originalBundle = manager1.getPreKeyBundle();
    const exportedState = manager1.exportState()!;
    manager1.destroy();

    const manager2 = new PreKeyBundleManager(new MockStorage());
    manager2.importState(exportedState);
    const restoredBundle = manager2.getPreKeyBundle();

    expect(Array.from(restoredBundle.identityKey)).toEqual(
      Array.from(originalBundle.identityKey),
    );
    expect(Array.from(restoredBundle.signedPreKey)).toEqual(
      Array.from(originalBundle.signedPreKey),
    );

    manager2.destroy();
  });
});

describe("PreKeyBundleManager Cleanup", () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
  });

  it("should destroy and wipe key material", async () => {
    const manager = await createPreKeyBundleManager(
      "user-1",
      "device-1",
      storage,
    );

    manager.destroy();

    expect(manager.isInitialized()).toBe(false);
  });

  it("should clear stored state", async () => {
    const manager = await createPreKeyBundleManager(
      "user-1",
      "device-1",
      storage,
    );

    // Verify storage has data
    expect(storage.length).toBeGreaterThan(0);

    manager.clearState();

    // Manager should be reset
    expect(manager.isInitialized()).toBe(false);

    manager.destroy();
  });
});
