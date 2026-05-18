/**
 * X3DH Key Agreement Protocol Tests
 *
 * Tests for the Extended Triple Diffie-Hellman (X3DH) protocol implementation.
 * Covers key generation, bundle creation, key agreement, and state management.
 */

import {
  X3DH,
  createX3DH,
  generateKeyPair,
  generateIdentityKeyPair,
  generateSignedPreKey,
  generateOneTimePreKeys,
  generateRegistrationId,
  importPublicKey,
  importPrivateKey,
  exportKeyPair,
  importKeyPair,
  performX3DHInitiator,
  performX3DHResponder,
  type PreKeyBundle,
  type IdentityKeyPair,
  type SignedPreKey,
  type OneTimePreKey,
  type X3DHResult,
} from "../x3dh";

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Setup Web Crypto API for Node.js test environment
beforeAll(() => {
  // Node.js webcrypto is already available in jest setup
  // The global crypto should be configured in jest.setup.js
});

afterAll(() => {
  // Nothing to clean up
});

describe("X3DH Key Generation", () => {
  describe("generateKeyPair", () => {
    it("should generate a valid ECDH key pair", async () => {
      const keyPair = await generateKeyPair();

      expect(keyPair.publicKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.privateKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.publicKey.length).toBe(65); // Uncompressed P-256 point
      expect(keyPair.privateKey.length).toBe(32); // 256-bit private key
    });

    it("should generate unique key pairs", async () => {
      const keyPair1 = await generateKeyPair();
      const keyPair2 = await generateKeyPair();

      expect(keyPair1.publicKey).not.toEqual(keyPair2.publicKey);
      expect(keyPair1.privateKey).not.toEqual(keyPair2.privateKey);
    });

    it("should include CryptoKey objects", async () => {
      const keyPair = await generateKeyPair();

      expect(keyPair.cryptoPublicKey).toBeDefined();
      expect(keyPair.cryptoPrivateKey).toBeDefined();
    });
  });

  describe("generateIdentityKeyPair", () => {
    it("should generate an identity key pair with metadata", async () => {
      const identityKeyPair = await generateIdentityKeyPair("device-123");

      expect(identityKeyPair.type).toBe("identity");
      expect(identityKeyPair.deviceId).toBe("device-123");
      expect(identityKeyPair.createdAt).toBeInstanceOf(Date);
      expect(identityKeyPair.publicKey).toBeInstanceOf(Uint8Array);
      expect(identityKeyPair.privateKey).toBeInstanceOf(Uint8Array);
    });

    it("should work without device ID", async () => {
      const identityKeyPair = await generateIdentityKeyPair();

      expect(identityKeyPair.type).toBe("identity");
      expect(identityKeyPair.deviceId).toBeUndefined();
    });
  });

  describe("generateSignedPreKey", () => {
    it("should generate a signed pre-key", async () => {
      const identityKeyPair = await generateIdentityKeyPair();
      const signedPreKey = await generateSignedPreKey(identityKeyPair, 1);

      expect(signedPreKey.type).toBe("signed-prekey");
      expect(signedPreKey.keyId).toBe(1);
      expect(signedPreKey.publicKey).toBeInstanceOf(Uint8Array);
      expect(signedPreKey.privateKey).toBeInstanceOf(Uint8Array);
      expect(signedPreKey.signature).toBeInstanceOf(Uint8Array);
      expect(signedPreKey.timestamp).toBeGreaterThan(0);
    });

    it("should generate signed pre-keys with different IDs", async () => {
      const identityKeyPair = await generateIdentityKeyPair();
      const signedPreKey1 = await generateSignedPreKey(identityKeyPair, 1);
      const signedPreKey2 = await generateSignedPreKey(identityKeyPair, 2);

      expect(signedPreKey1.keyId).toBe(1);
      expect(signedPreKey2.keyId).toBe(2);
      expect(signedPreKey1.publicKey).not.toEqual(signedPreKey2.publicKey);
    });

    it("should set expiration time", async () => {
      const identityKeyPair = await generateIdentityKeyPair();
      const signedPreKey = await generateSignedPreKey(identityKeyPair, 1);

      expect(signedPreKey.expiresAt).toBeDefined();
      expect(signedPreKey.expiresAt).toBeGreaterThan(Date.now());
    });
  });

  describe("generateOneTimePreKeys", () => {
    it("should generate multiple one-time pre-keys", async () => {
      const preKeys = await generateOneTimePreKeys(1, 10);

      expect(preKeys.length).toBe(10);

      preKeys.forEach((key, index) => {
        expect(key.type).toBe("one-time-prekey");
        expect(key.keyId).toBe(index + 1);
        expect(key.publicKey).toBeInstanceOf(Uint8Array);
        expect(key.privateKey).toBeInstanceOf(Uint8Array);
        expect(key.used).toBe(false);
      });
    });

    it("should generate keys with sequential IDs starting from specified ID", async () => {
      const preKeys = await generateOneTimePreKeys(100, 5);

      expect(preKeys.map((k) => k.keyId)).toEqual([100, 101, 102, 103, 104]);
    });

    it("should generate unique keys", async () => {
      const preKeys = await generateOneTimePreKeys(1, 5);
      const publicKeys = preKeys.map((k) => Array.from(k.publicKey).join(","));
      const uniquePublicKeys = new Set(publicKeys);

      expect(uniquePublicKeys.size).toBe(5);
    });
  });

  describe("generateRegistrationId", () => {
    it("should generate a 24-bit registration ID", async () => {
      const registrationId = generateRegistrationId();

      expect(typeof registrationId).toBe("number");
      expect(registrationId).toBeGreaterThanOrEqual(0);
      expect(registrationId).toBeLessThan(0x1000000); // 2^24
    });

    it("should generate different registration IDs", () => {
      const ids = new Set<number>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateRegistrationId());
      }
      // Should have at least 90% unique values
      expect(ids.size).toBeGreaterThan(90);
    });
  });
});

describe("X3DH Key Import/Export", () => {
  describe("importPublicKey", () => {
    it("should import a public key from raw bytes", async () => {
      const keyPair = await generateKeyPair();
      const imported = await importPublicKey(keyPair.publicKey);

      expect(imported).toBeDefined();
      expect(imported.type).toBe("public");
    });

    it("should throw for invalid public key", async () => {
      const invalidKey = new Uint8Array(10);
      await expect(importPublicKey(invalidKey)).rejects.toThrow();
    });
  });

  describe("importPrivateKey", () => {
    it("should import a private key from raw bytes", async () => {
      const keyPair = await generateKeyPair();
      const imported = await importPrivateKey(
        keyPair.privateKey,
        keyPair.publicKey,
      );

      expect(imported).toBeDefined();
      expect(imported.type).toBe("private");
    });
  });

  describe("exportKeyPair / importKeyPair", () => {
    it("should export and import a key pair", async () => {
      const original = await generateKeyPair();
      const exported = await exportKeyPair(original);

      expect(typeof exported.publicKey).toBe("string");
      expect(typeof exported.privateKey).toBe("string");

      const imported = await importKeyPair(exported);

      expect(Array.from(imported.publicKey)).toEqual(
        Array.from(original.publicKey),
      );
      expect(Array.from(imported.privateKey)).toEqual(
        Array.from(original.privateKey),
      );
    });
  });
});

describe("X3DH Class", () => {
  let x3dh: X3DH;

  beforeEach(async () => {
    x3dh = await createX3DH();
  });

  afterEach(() => {
    x3dh.destroy();
  });

  describe("initialization", () => {
    it("should initialize with default keys", async () => {
      expect(x3dh.getIdentityKeyPair()).not.toBeNull();
      expect(x3dh.getSignedPreKey()).not.toBeNull();
      expect(x3dh.getOneTimePreKeys().length).toBeGreaterThan(0);
    });

    it("should initialize with provided keys", async () => {
      const identityKeyPair = await generateIdentityKeyPair();
      const signedPreKey = await generateSignedPreKey(identityKeyPair, 1);
      const oneTimePreKeys = await generateOneTimePreKeys(1, 10);

      const customX3DH = await createX3DH({
        identityKeyPair,
        signedPreKey,
        oneTimePreKeys,
      });

      expect(customX3DH.getIdentityKeyPair()).toEqual(identityKeyPair);
      expect(customX3DH.getSignedPreKey()).toEqual(signedPreKey);
      expect(customX3DH.getOneTimePreKeys().length).toBe(10);

      customX3DH.destroy();
    });
  });

  describe("createPreKeyBundle", () => {
    it("should create a valid pre-key bundle", () => {
      const bundle = x3dh.createPreKeyBundle("user-123", "device-456", 12345);

      expect(bundle.userId).toBe("user-123");
      expect(bundle.deviceId).toBe("device-456");
      expect(bundle.registrationId).toBe(12345);
      expect(bundle.identityKey).toBeInstanceOf(Uint8Array);
      expect(bundle.signedPreKey).toBeInstanceOf(Uint8Array);
      expect(bundle.signedPreKeySignature).toBeInstanceOf(Uint8Array);
      expect(bundle.signedPreKeyId).toBeDefined();
      expect(bundle.version).toBe(1);
    });

    it("should include one-time pre-key when available", () => {
      const bundle = x3dh.createPreKeyBundle("user-123", "device-456", 12345);

      expect(bundle.oneTimePreKeyId).toBeDefined();
      expect(bundle.oneTimePreKey).toBeInstanceOf(Uint8Array);
    });
  });

  describe("key agreement", () => {
    let alice: X3DH;
    let bob: X3DH;
    let bobBundle: PreKeyBundle;

    beforeEach(async () => {
      alice = await createX3DH();
      bob = await createX3DH();
      bobBundle = bob.createPreKeyBundle("bob", "device-1", 1);
    });

    afterEach(() => {
      alice.destroy();
      bob.destroy();
    });

    it("should perform key agreement as initiator", async () => {
      const result = await alice.initiateKeyAgreement(bobBundle);

      expect(result.sharedSecret).toBeInstanceOf(Uint8Array);
      expect(result.sharedSecret.length).toBe(32);
      expect(result.associatedData).toBeInstanceOf(Uint8Array);
      expect(result.ephemeralPublicKey).toBeInstanceOf(Uint8Array);
    });

    it("should perform key agreement as responder", async () => {
      const aliceIdentityKey = alice.getIdentityKeyPair()!.publicKey;
      const ephemeralKey = (await generateKeyPair()).publicKey;
      const oneTimePreKeyId = bobBundle.oneTimePreKeyId;

      const result = await bob.completeKeyAgreement(
        aliceIdentityKey,
        ephemeralKey,
        oneTimePreKeyId,
      );

      expect(result.sharedSecret).toBeInstanceOf(Uint8Array);
      expect(result.sharedSecret.length).toBe(32);
      expect(result.associatedData).toBeInstanceOf(Uint8Array);
    });

    it("should derive same shared secret for initiator and responder", async () => {
      // Alice initiates
      const aliceResult = await alice.initiateKeyAgreement(bobBundle);

      // Bob completes (using Alice's ephemeral key from result)
      const bobResult = await bob.completeKeyAgreement(
        alice.getIdentityKeyPair()!.publicKey,
        aliceResult.ephemeralPublicKey,
        bobBundle.oneTimePreKeyId,
      );

      // Shared secrets should match
      expect(Array.from(aliceResult.sharedSecret)).toEqual(
        Array.from(bobResult.sharedSecret),
      );
    });

    it("should work without one-time pre-key", async () => {
      // Create bundle without one-time pre-key
      const bundleWithoutOTPK: PreKeyBundle = {
        ...bobBundle,
        oneTimePreKeyId: undefined,
        oneTimePreKey: undefined,
      };

      const aliceResult = await alice.initiateKeyAgreement(bundleWithoutOTPK);
      expect(aliceResult.usedOneTimePreKey).toBe(false);

      const bobResult = await bob.completeKeyAgreement(
        alice.getIdentityKeyPair()!.publicKey,
        aliceResult.ephemeralPublicKey,
        undefined, // No one-time pre-key
      );

      expect(Array.from(aliceResult.sharedSecret)).toEqual(
        Array.from(bobResult.sharedSecret),
      );
    });
  });

  describe("one-time pre-key management", () => {
    it("should mark one-time pre-key as used", () => {
      const keys = x3dh.getOneTimePreKeys();
      const keyId = keys[0].keyId;

      x3dh.markOneTimePreKeyUsed(keyId);

      const remainingKeys = x3dh.getOneTimePreKeys();
      expect(remainingKeys.find((k) => k.keyId === keyId)).toBeUndefined();
    });

    it("should remove one-time pre-key", () => {
      const keys = x3dh.getOneTimePreKeys();
      const initialCount = keys.length;
      const keyId = keys[0].keyId;

      x3dh.removeOneTimePreKey(keyId);

      const newCount = x3dh.getAvailableOneTimePreKeyCount();
      expect(newCount).toBe(initialCount - 1);
    });

    it("should add new one-time pre-keys", async () => {
      const initialCount = x3dh.getAvailableOneTimePreKeyCount();
      const newKeys = await generateOneTimePreKeys(1000, 10);

      x3dh.addOneTimePreKeys(newKeys);

      const newCount = x3dh.getAvailableOneTimePreKeyCount();
      expect(newCount).toBe(initialCount + 10);
    });

    it("should report correct available count", () => {
      const keys = x3dh.getOneTimePreKeys();
      const count = x3dh.getAvailableOneTimePreKeyCount();

      expect(count).toBe(keys.length);
    });
  });

  describe("signed pre-key rotation", () => {
    it("should rotate signed pre-key", async () => {
      const originalKeyId = x3dh.getSignedPreKey()!.keyId;

      const newSignedPreKey = await x3dh.rotateSignedPreKey();

      expect(newSignedPreKey.keyId).toBe(originalKeyId + 1);
      expect(x3dh.getSignedPreKey()!.keyId).toBe(originalKeyId + 1);
    });

    it("should generate new key material on rotation", async () => {
      const originalPublicKey = x3dh.getSignedPreKey()!.publicKey;

      await x3dh.rotateSignedPreKey();

      const newPublicKey = x3dh.getSignedPreKey()!.publicKey;
      expect(Array.from(newPublicKey)).not.toEqual(
        Array.from(originalPublicKey),
      );
    });
  });

  describe("state export/import", () => {
    it("should export state", async () => {
      const state = await x3dh.exportState();

      expect(state.identityKeyPair).toBeDefined();
      expect(state.signedPreKey).toBeDefined();
      expect(state.oneTimePreKeys).toBeInstanceOf(Array);
    });

    it("should import state", async () => {
      const state = await x3dh.exportState();

      const newX3DH = new X3DH();
      await newX3DH.importState(state);

      expect(newX3DH.getIdentityKeyPair()).not.toBeNull();
      expect(newX3DH.getSignedPreKey()).not.toBeNull();
      expect(newX3DH.getAvailableOneTimePreKeyCount()).toBe(
        x3dh.getAvailableOneTimePreKeyCount(),
      );

      newX3DH.destroy();
    });

    it("should preserve key material through export/import", async () => {
      const originalIdentityKey = x3dh.getIdentityKeyPair()!.publicKey;
      const state = await x3dh.exportState();

      const newX3DH = new X3DH();
      await newX3DH.importState(state);

      const importedIdentityKey = newX3DH.getIdentityKeyPair()!.publicKey;
      expect(Array.from(importedIdentityKey)).toEqual(
        Array.from(originalIdentityKey),
      );

      newX3DH.destroy();
    });
  });

  describe("cleanup", () => {
    it("should cleanup expired keys", async () => {
      // Mark some keys as used
      const keys = x3dh.getOneTimePreKeys();
      x3dh.markOneTimePreKeyUsed(keys[0].keyId);
      x3dh.markOneTimePreKeyUsed(keys[1].keyId);

      const removed = x3dh.cleanupExpiredKeys();

      expect(removed).toBe(2);
    });

    it("should destroy all key material", () => {
      x3dh.destroy();

      expect(x3dh.getIdentityKeyPair()).toBeNull();
      expect(x3dh.getSignedPreKey()).toBeNull();
      expect(x3dh.getOneTimePreKeys().length).toBe(0);
    });
  });
});

describe("X3DH Helper Functions", () => {
  describe("performX3DHInitiator", () => {
    it("should perform X3DH as initiator", async () => {
      const localIdentity = await generateIdentityKeyPair();
      const remoteX3DH = await createX3DH();
      const remoteBundle = remoteX3DH.createPreKeyBundle(
        "remote",
        "device-1",
        1,
      );

      const result = await performX3DHInitiator(localIdentity, remoteBundle);

      expect(result.sharedSecret).toBeInstanceOf(Uint8Array);
      expect(result.remoteIdentityKey).toEqual(remoteBundle.identityKey);
      expect(result.localIdentityKey).toEqual(localIdentity.publicKey);
      expect(result.initiator).toBe(true);

      remoteX3DH.destroy();
    });
  });

  describe("performX3DHResponder", () => {
    it("should perform X3DH as responder", async () => {
      const localX3DH = await createX3DH();
      const senderIdentity = (await generateIdentityKeyPair()).publicKey;
      const senderEphemeral = (await generateKeyPair()).publicKey;

      const result = await performX3DHResponder(
        localX3DH,
        senderIdentity,
        senderEphemeral,
        undefined,
      );

      expect(result.sharedSecret).toBeInstanceOf(Uint8Array);
      expect(result.remoteIdentityKey).toEqual(senderIdentity);
      expect(result.initiator).toBe(false);

      localX3DH.destroy();
    });
  });
});
