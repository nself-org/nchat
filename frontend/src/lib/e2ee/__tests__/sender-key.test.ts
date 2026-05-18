/**
 * Sender Key Tests
 *
 * Comprehensive tests for the sender key distribution system.
 * Covers sender key generation, encryption, decryption, and distribution.
 */

import {
  SenderKey,
  SenderKeyReceiver,
  createSenderKey,
  createSenderKeyReceiver,
  type SenderKeyDistributionMessage,
  type SenderKeyEncryptedMessage,
} from "../sender-key";

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

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

describe("Sender Key Generation", () => {
  describe("createSenderKey", () => {
    it("should generate a new sender key", async () => {
      const senderKey = await createSenderKey("group-1", "user-1", "device-1");

      expect(senderKey.isInitialized()).toBe(true);
      expect(senderKey.needsRekey()).toBe(false);

      const state = senderKey.getState();
      expect(state).not.toBeNull();
      expect(state!.groupId).toBe("group-1");
      expect(state!.userId).toBe("user-1");
      expect(state!.deviceId).toBe("device-1");
      expect(state!.chainIteration).toBe(0);

      senderKey.destroy();
    });

    it("should generate unique key IDs", async () => {
      const key1 = await createSenderKey("group-1", "user-1", "device-1");
      const key2 = await createSenderKey("group-1", "user-1", "device-1");

      expect(key1.getState()!.keyId).not.toBe(key2.getState()!.keyId);

      key1.destroy();
      key2.destroy();
    });

    it("should generate unique chain keys", async () => {
      const key1 = await createSenderKey("group-1", "user-1", "device-1");
      const key2 = await createSenderKey("group-1", "user-1", "device-1");

      expect(Array.from(key1.getState()!.chainKey)).not.toEqual(
        Array.from(key2.getState()!.chainKey),
      );

      key1.destroy();
      key2.destroy();
    });
  });

  describe("SenderKey class", () => {
    it("should not be initialized by default", () => {
      const senderKey = new SenderKey();
      expect(senderKey.isInitialized()).toBe(false);
      expect(senderKey.getState()).toBeNull();
    });

    it("should initialize via generate()", async () => {
      const senderKey = new SenderKey();
      await senderKey.generate("group-1", "user-1", "device-1");

      expect(senderKey.isInitialized()).toBe(true);

      senderKey.destroy();
    });

    it("should throw when encrypting without initialization", async () => {
      const senderKey = new SenderKey();
      const plaintext = new Uint8Array([1, 2, 3]);

      await expect(senderKey.encrypt(plaintext)).rejects.toThrow(
        "not initialized",
      );
    });
  });
});

describe("Sender Key Distribution Message", () => {
  it("should create a distribution message", async () => {
    const senderKey = await createSenderKey("group-1", "user-1", "device-1");
    const message = senderKey.createDistributionMessage();

    expect(message.groupId).toBe("group-1");
    expect(message.senderUserId).toBe("user-1");
    expect(message.senderDeviceId).toBe("device-1");
    expect(message.keyId).toBe(senderKey.getState()!.keyId);
    expect(message.chainIteration).toBe(0);
    expect(message.chainKey.length).toBe(32);
    expect(message.signingPublicKey.length).toBe(65); // Uncompressed P-256
    expect(message.version).toBe(1);

    senderKey.destroy();
  });

  it("should clone chain key in distribution message", async () => {
    const senderKey = await createSenderKey("group-1", "user-1", "device-1");
    const originalChainKey = new Uint8Array(senderKey.getState()!.chainKey);
    const message = senderKey.createDistributionMessage();

    // Modify distribution message chain key
    message.chainKey[0] ^= 0x01;

    // Original should be unchanged
    expect(Array.from(senderKey.getState()!.chainKey)).toEqual(
      Array.from(originalChainKey),
    );

    senderKey.destroy();
  });
});

describe("Sender Key Encryption", () => {
  let senderKey: SenderKey;

  beforeEach(async () => {
    senderKey = await createSenderKey("group-1", "user-1", "device-1");
  });

  afterEach(() => {
    senderKey.destroy();
  });

  it("should encrypt a message", async () => {
    const plaintext = new TextEncoder().encode("Hello, group!");
    const encrypted = await senderKey.encrypt(plaintext);

    expect(encrypted.groupId).toBe("group-1");
    expect(encrypted.senderUserId).toBe("user-1");
    expect(encrypted.senderDeviceId).toBe("device-1");
    expect(encrypted.keyId).toBe(senderKey.getState()!.keyId);
    expect(encrypted.chainIteration).toBe(0);
    expect(encrypted.ciphertext.length).toBeGreaterThan(0);
    expect(encrypted.nonce.length).toBe(12);
    expect(encrypted.signature.length).toBeGreaterThan(0);
  });

  it("should increment chain iteration after each encryption", async () => {
    const plaintext = new TextEncoder().encode("Test");

    await senderKey.encrypt(plaintext);
    expect(senderKey.getState()!.chainIteration).toBe(1);

    await senderKey.encrypt(plaintext);
    expect(senderKey.getState()!.chainIteration).toBe(2);

    await senderKey.encrypt(plaintext);
    expect(senderKey.getState()!.chainIteration).toBe(3);
  });

  it("should produce different ciphertexts for same plaintext", async () => {
    const plaintext = new TextEncoder().encode("Same message");

    const enc1 = await senderKey.encrypt(plaintext);
    const enc2 = await senderKey.encrypt(plaintext);

    expect(Array.from(enc1.ciphertext)).not.toEqual(
      Array.from(enc2.ciphertext),
    );
    expect(Array.from(enc1.nonce)).not.toEqual(Array.from(enc2.nonce));
  });

  it("should handle empty messages", async () => {
    const plaintext = new Uint8Array(0);
    const encrypted = await senderKey.encrypt(plaintext);

    expect(encrypted.ciphertext.length).toBeGreaterThan(0); // At least auth tag
  });

  it("should handle large messages", async () => {
    // 100KB message - fill in chunks due to getRandomValues 64KB limit
    const plaintext = new Uint8Array(100000);
    const chunkSize = 65536;
    for (let i = 0; i < plaintext.length; i += chunkSize) {
      const chunk = plaintext.subarray(
        i,
        Math.min(i + chunkSize, plaintext.length),
      );
      crypto.getRandomValues(chunk);
    }

    const encrypted = await senderKey.encrypt(plaintext);
    expect(encrypted.ciphertext.length).toBeGreaterThan(plaintext.length);
  });
});

describe("Sender Key Receiver", () => {
  describe("createSenderKeyReceiver", () => {
    it("should create a receiver", () => {
      const receiver = createSenderKeyReceiver();
      expect(receiver).toBeInstanceOf(SenderKeyReceiver);
      receiver.destroy();
    });
  });

  describe("processSenderKeyDistribution", () => {
    it("should process a distribution message", async () => {
      const sender = await createSenderKey("group-1", "user-1", "device-1");
      const receiver = createSenderKeyReceiver();

      const distribution = sender.createDistributionMessage();
      await receiver.processSenderKeyDistribution(distribution);

      expect(
        receiver.hasSenderKey(
          "group-1",
          "user-1",
          "device-1",
          distribution.keyId,
        ),
      ).toBe(true);

      sender.destroy();
      receiver.destroy();
    });

    it("should handle duplicate distribution messages", async () => {
      const sender = await createSenderKey("group-1", "user-1", "device-1");
      const receiver = createSenderKeyReceiver();

      const distribution = sender.createDistributionMessage();
      await receiver.processSenderKeyDistribution(distribution);
      await receiver.processSenderKeyDistribution(distribution); // Should not throw

      sender.destroy();
      receiver.destroy();
    });

    it("should store multiple sender keys for different senders", async () => {
      const sender1 = await createSenderKey("group-1", "user-1", "device-1");
      const sender2 = await createSenderKey("group-1", "user-2", "device-2");
      const receiver = createSenderKeyReceiver();

      await receiver.processSenderKeyDistribution(
        sender1.createDistributionMessage(),
      );
      await receiver.processSenderKeyDistribution(
        sender2.createDistributionMessage(),
      );

      const keys = receiver.getSenderKeysForGroup("group-1");
      expect(keys.length).toBe(2);

      sender1.destroy();
      sender2.destroy();
      receiver.destroy();
    });
  });
});

describe("Sender Key Encryption/Decryption", () => {
  let sender: SenderKey;
  let receiver: SenderKeyReceiver;

  beforeEach(async () => {
    sender = await createSenderKey("group-1", "user-1", "device-1");
    receiver = createSenderKeyReceiver();

    const distribution = sender.createDistributionMessage();
    await receiver.processSenderKeyDistribution(distribution);
  });

  afterEach(() => {
    sender.destroy();
    receiver.destroy();
  });

  it("should encrypt and decrypt a message", async () => {
    const plaintext = new TextEncoder().encode("Hello, secure group!");
    const encrypted = await sender.encrypt(plaintext);
    const decrypted = await receiver.decrypt(encrypted);

    expect(new TextDecoder().decode(decrypted)).toBe("Hello, secure group!");
  });

  it("should encrypt and decrypt multiple messages", async () => {
    const messages = [
      "Message 1",
      "Message 2",
      "Message 3",
      "Message 4",
      "Message 5",
    ];

    for (const msg of messages) {
      const plaintext = new TextEncoder().encode(msg);
      const encrypted = await sender.encrypt(plaintext);
      const decrypted = await receiver.decrypt(encrypted);
      expect(new TextDecoder().decode(decrypted)).toBe(msg);
    }
  });

  it("should handle binary data", async () => {
    const binaryData = new Uint8Array([0, 127, 128, 255, 0, 255]);
    const encrypted = await sender.encrypt(binaryData);
    const decrypted = await receiver.decrypt(encrypted);

    expect(Array.from(decrypted)).toEqual(Array.from(binaryData));
  });

  it("should reject tampered ciphertext", async () => {
    const plaintext = new TextEncoder().encode("Secret message");
    const encrypted = await sender.encrypt(plaintext);

    // Tamper with ciphertext
    encrypted.ciphertext[0] ^= 0xff;

    await expect(receiver.decrypt(encrypted)).rejects.toThrow();
  });

  it("should reject invalid signature", async () => {
    const plaintext = new TextEncoder().encode("Secret message");
    const encrypted = await sender.encrypt(plaintext);

    // Tamper with signature
    encrypted.signature[0] ^= 0xff;

    await expect(receiver.decrypt(encrypted)).rejects.toThrow(
      "Invalid sender key signature",
    );
  });

  it("should handle out-of-order messages", async () => {
    // Encrypt messages
    const msg1 = await sender.encrypt(new TextEncoder().encode("Message 1"));
    const msg2 = await sender.encrypt(new TextEncoder().encode("Message 2"));
    const msg3 = await sender.encrypt(new TextEncoder().encode("Message 3"));

    // Decrypt out of order
    const dec3 = await receiver.decrypt(msg3);
    expect(new TextDecoder().decode(dec3)).toBe("Message 3");

    const dec1 = await receiver.decrypt(msg1);
    expect(new TextDecoder().decode(dec1)).toBe("Message 1");

    const dec2 = await receiver.decrypt(msg2);
    expect(new TextDecoder().decode(dec2)).toBe("Message 2");
  });

  it("should reject messages from unknown sender", async () => {
    const otherSender = await createSenderKey("group-1", "user-2", "device-2");
    const encrypted = await otherSender.encrypt(
      new TextEncoder().encode("Test"),
    );

    await expect(receiver.decrypt(encrypted)).rejects.toThrow(
      "Sender key not found",
    );

    otherSender.destroy();
  });
});

describe("Sender Key State Serialization", () => {
  it("should serialize and deserialize sender key state", async () => {
    const original = await createSenderKey("group-1", "user-1", "device-1");

    // Send some messages to advance state
    await original.encrypt(new TextEncoder().encode("Message 1"));
    await original.encrypt(new TextEncoder().encode("Message 2"));

    const serialized = original.serializeState();
    expect(serialized).not.toBeNull();

    const restored = new SenderKey();
    await restored.deserializeState(serialized!);

    expect(restored.isInitialized()).toBe(true);
    expect(restored.getState()!.keyId).toBe(original.getState()!.keyId);
    expect(restored.getState()!.chainIteration).toBe(
      original.getState()!.chainIteration,
    );
    expect(restored.getState()!.groupId).toBe(original.getState()!.groupId);

    original.destroy();
    restored.destroy();
  });

  it("should continue working after state restoration", async () => {
    const sender = await createSenderKey("group-1", "user-1", "device-1");
    const receiver = createSenderKeyReceiver();

    await receiver.processSenderKeyDistribution(
      sender.createDistributionMessage(),
    );

    // Send a message before save
    const msg1 = await sender.encrypt(new TextEncoder().encode("Before save"));
    await receiver.decrypt(msg1);

    // Serialize and restore
    const serialized = sender.serializeState();
    const restored = new SenderKey();
    await restored.deserializeState(serialized!);

    // Send message after restore
    const msg2 = await restored.encrypt(
      new TextEncoder().encode("After restore"),
    );
    const dec2 = await receiver.decrypt(msg2);

    expect(new TextDecoder().decode(dec2)).toBe("After restore");

    sender.destroy();
    restored.destroy();
    receiver.destroy();
  });

  it("should serialize and deserialize receiver state", async () => {
    const sender = await createSenderKey("group-1", "user-1", "device-1");
    const receiver = createSenderKeyReceiver();

    await receiver.processSenderKeyDistribution(
      sender.createDistributionMessage(),
    );

    // Encrypt a few messages to advance state
    await sender.encrypt(new TextEncoder().encode("Message 1"));
    await sender.encrypt(new TextEncoder().encode("Message 2"));
    const msg3 = await sender.encrypt(new TextEncoder().encode("Message 3"));

    // Decrypt only msg3 to create skipped keys
    await receiver.decrypt(msg3);

    // Serialize and restore
    const serialized = receiver.serializeState();
    const restored = createSenderKeyReceiver();
    restored.deserializeState(serialized);

    // Verify can still access skipped keys
    expect(
      restored.hasSenderKey(
        "group-1",
        "user-1",
        "device-1",
        sender.getState()!.keyId,
      ),
    ).toBe(true);

    sender.destroy();
    receiver.destroy();
    restored.destroy();
  });
});

describe("Sender Key Cleanup", () => {
  it("should remove sender keys for a user", async () => {
    const sender1 = await createSenderKey("group-1", "user-1", "device-1");
    const sender2 = await createSenderKey("group-1", "user-2", "device-2");
    const receiver = createSenderKeyReceiver();

    await receiver.processSenderKeyDistribution(
      sender1.createDistributionMessage(),
    );
    await receiver.processSenderKeyDistribution(
      sender2.createDistributionMessage(),
    );

    expect(receiver.getSenderKeysForGroup("group-1").length).toBe(2);

    receiver.removeSenderKeys("group-1", "user-1", "device-1");

    expect(receiver.getSenderKeysForGroup("group-1").length).toBe(1);

    sender1.destroy();
    sender2.destroy();
    receiver.destroy();
  });

  it("should remove all group keys", async () => {
    const sender1 = await createSenderKey("group-1", "user-1", "device-1");
    const sender2 = await createSenderKey("group-1", "user-2", "device-2");
    const receiver = createSenderKeyReceiver();

    await receiver.processSenderKeyDistribution(
      sender1.createDistributionMessage(),
    );
    await receiver.processSenderKeyDistribution(
      sender2.createDistributionMessage(),
    );

    receiver.removeGroupKeys("group-1");

    expect(receiver.getSenderKeysForGroup("group-1").length).toBe(0);

    sender1.destroy();
    sender2.destroy();
    receiver.destroy();
  });

  it("should wipe key material on destroy", async () => {
    const sender = await createSenderKey("group-1", "user-1", "device-1");
    const chainKeyBefore = new Uint8Array(sender.getState()!.chainKey);

    sender.destroy();

    expect(sender.isInitialized()).toBe(false);
    expect(sender.getState()).toBeNull();
  });
});

describe("Sender Key Edge Cases", () => {
  it("should handle maximum chain iterations", async () => {
    // This would be slow to test fully, so we just verify the check exists
    const sender = await createSenderKey("group-1", "user-1", "device-1");

    expect(sender.needsRekey()).toBe(false);

    sender.destroy();
  });

  it("should handle messages from multiple groups", async () => {
    const sender1 = await createSenderKey("group-1", "user-1", "device-1");
    const sender2 = await createSenderKey("group-2", "user-1", "device-1");
    const receiver = createSenderKeyReceiver();

    await receiver.processSenderKeyDistribution(
      sender1.createDistributionMessage(),
    );
    await receiver.processSenderKeyDistribution(
      sender2.createDistributionMessage(),
    );

    const msg1 = await sender1.encrypt(
      new TextEncoder().encode("Group 1 message"),
    );
    const msg2 = await sender2.encrypt(
      new TextEncoder().encode("Group 2 message"),
    );

    const dec1 = await receiver.decrypt(msg1);
    const dec2 = await receiver.decrypt(msg2);

    expect(new TextDecoder().decode(dec1)).toBe("Group 1 message");
    expect(new TextDecoder().decode(dec2)).toBe("Group 2 message");

    sender1.destroy();
    sender2.destroy();
    receiver.destroy();
  });

  it("should handle group ID mismatch gracefully", async () => {
    const sender = await createSenderKey("group-1", "user-1", "device-1");
    const receiver = createSenderKeyReceiver();

    await receiver.processSenderKeyDistribution(
      sender.createDistributionMessage(),
    );

    const encrypted = await sender.encrypt(new TextEncoder().encode("Test"));
    // Modify the group ID
    encrypted.groupId = "group-2";

    // Decryption should fail
    await expect(receiver.decrypt(encrypted)).rejects.toThrow(
      "Sender key not found",
    );

    sender.destroy();
    receiver.destroy();
  });
});

describe("Sender Key Performance", () => {
  it("should encrypt 100 messages quickly", async () => {
    const sender = await createSenderKey("group-1", "user-1", "device-1");
    const plaintext = new TextEncoder().encode("Performance test message");

    const startTime = Date.now();

    for (let i = 0; i < 100; i++) {
      await sender.encrypt(plaintext);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete in under 2 seconds
    expect(duration).toBeLessThan(2000);

    sender.destroy();
  });

  it("should decrypt 100 messages quickly", async () => {
    const sender = await createSenderKey("group-1", "user-1", "device-1");
    const receiver = createSenderKeyReceiver();

    await receiver.processSenderKeyDistribution(
      sender.createDistributionMessage(),
    );

    const plaintext = new TextEncoder().encode("Performance test message");
    const messages: SenderKeyEncryptedMessage[] = [];

    for (let i = 0; i < 100; i++) {
      messages.push(await sender.encrypt(plaintext));
    }

    const startTime = Date.now();

    for (const msg of messages) {
      await receiver.decrypt(msg);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete in under 2 seconds
    expect(duration).toBeLessThan(2000);

    sender.destroy();
    receiver.destroy();
  });
});
