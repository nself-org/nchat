/**
 * Double Ratchet Algorithm Tests
 *
 * Tests for the Double Ratchet algorithm implementation.
 * Covers encryption, decryption, key ratcheting, and state management.
 */

import {
  DoubleRatchet,
  createInitiatorRatchet,
  createResponderRatchet,
  generateRatchetKey,
  encodeEncryptedMessage,
  decodeEncryptedMessage,
  type EncryptedMessage,
  type RatchetKeyPair,
  type SerializedRatchetState,
} from "../double-ratchet";

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

describe("Double Ratchet Key Generation", () => {
  describe("generateRatchetKey", () => {
    it("should generate a valid ratchet key pair", async () => {
      const keyPair = await generateRatchetKey();

      expect(keyPair.publicKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.privateKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.publicKey.length).toBe(65); // Uncompressed P-256
      expect(keyPair.privateKey.length).toBe(32); // 256-bit
    });

    it("should generate unique key pairs", async () => {
      const keyPair1 = await generateRatchetKey();
      const keyPair2 = await generateRatchetKey();

      expect(keyPair1.publicKey).not.toEqual(keyPair2.publicKey);
    });
  });
});

describe("Double Ratchet Initialization", () => {
  describe("createInitiatorRatchet", () => {
    it("should create an initiator ratchet", async () => {
      const sharedSecret = new Uint8Array(32);
      crypto.getRandomValues(sharedSecret);
      const remoteRatchetKey = await generateRatchetKey();

      const ratchet = await createInitiatorRatchet(
        sharedSecret,
        remoteRatchetKey.publicKey,
      );

      expect(ratchet.isInitialized()).toBe(true);
      expect(ratchet.getSendingRatchetPublicKey()).toBeInstanceOf(Uint8Array);

      ratchet.destroy();
    });

    it("should accept configuration options", async () => {
      const sharedSecret = new Uint8Array(32);
      crypto.getRandomValues(sharedSecret);
      const remoteRatchetKey = await generateRatchetKey();
      const associatedData = new Uint8Array([1, 2, 3, 4]);

      const ratchet = await createInitiatorRatchet(
        sharedSecret,
        remoteRatchetKey.publicKey,
        {
          maxSkip: 500,
          associatedData,
        },
      );

      expect(ratchet.isInitialized()).toBe(true);

      ratchet.destroy();
    });
  });

  describe("createResponderRatchet", () => {
    it("should create a responder ratchet", async () => {
      const sharedSecret = new Uint8Array(32);
      crypto.getRandomValues(sharedSecret);
      const ownRatchetKey = await generateRatchetKey();

      const ratchet = await createResponderRatchet(sharedSecret, ownRatchetKey);

      expect(ratchet.isInitialized()).toBe(true);

      ratchet.destroy();
    });
  });

  describe("DoubleRatchet class", () => {
    it("should not be initialized by default", () => {
      const ratchet = new DoubleRatchet();

      expect(ratchet.isInitialized()).toBe(false);
    });

    it("should throw when encrypting without initialization", async () => {
      const ratchet = new DoubleRatchet();
      const plaintext = new Uint8Array([1, 2, 3]);

      await expect(ratchet.encrypt(plaintext)).rejects.toThrow(
        "not initialized",
      );
    });

    it("should throw when decrypting without initialization", async () => {
      const ratchet = new DoubleRatchet();
      const fakeMessage: EncryptedMessage = {
        header: {
          publicKey: new Uint8Array(65),
          previousCounter: 0,
          messageNumber: 0,
        },
        ciphertext: new Uint8Array(16),
        nonce: new Uint8Array(12),
      };

      await expect(ratchet.decrypt(fakeMessage)).rejects.toThrow(
        "not initialized",
      );
    });
  });
});

describe("Double Ratchet Encryption/Decryption", () => {
  let alice: DoubleRatchet;
  let bob: DoubleRatchet;
  let sharedSecret: Uint8Array;
  let bobRatchetKey: RatchetKeyPair;

  beforeEach(async () => {
    // Setup shared secret (simulating X3DH output)
    sharedSecret = new Uint8Array(32);
    crypto.getRandomValues(sharedSecret);

    // Bob generates his ratchet key
    bobRatchetKey = await generateRatchetKey();

    // Initialize Alice as initiator with Bob's ratchet key
    alice = await createInitiatorRatchet(sharedSecret, bobRatchetKey.publicKey);

    // Initialize Bob as responder with his own ratchet key
    bob = await createResponderRatchet(sharedSecret, bobRatchetKey);
  });

  afterEach(() => {
    alice.destroy();
    bob.destroy();
  });

  describe("basic message exchange", () => {
    it("should encrypt a message", async () => {
      const plaintext = new TextEncoder().encode("Hello, Bob!");
      const encrypted = await alice.encrypt(plaintext);

      expect(encrypted.header).toBeDefined();
      expect(encrypted.header.publicKey).toBeInstanceOf(Uint8Array);
      expect(encrypted.header.messageNumber).toBe(0);
      expect(encrypted.ciphertext).toBeInstanceOf(Uint8Array);
      expect(encrypted.nonce).toBeInstanceOf(Uint8Array);
      expect(encrypted.nonce.length).toBe(12);
    });

    it("should encrypt and decrypt a message (Alice -> Bob)", async () => {
      const plaintext = new TextEncoder().encode("Hello, Bob!");
      const encrypted = await alice.encrypt(plaintext);
      const decrypted = await bob.decrypt(encrypted);

      expect(new TextDecoder().decode(decrypted)).toBe("Hello, Bob!");
    });

    it("should encrypt and decrypt multiple messages in one direction", async () => {
      const messages = ["Message 1", "Message 2", "Message 3"];

      for (const message of messages) {
        const plaintext = new TextEncoder().encode(message);
        const encrypted = await alice.encrypt(plaintext);
        const decrypted = await bob.decrypt(encrypted);

        expect(new TextDecoder().decode(decrypted)).toBe(message);
      }
    });

    it("should handle bidirectional messaging", async () => {
      // Alice -> Bob
      const msg1 = new TextEncoder().encode("Hello, Bob!");
      const enc1 = await alice.encrypt(msg1);
      const dec1 = await bob.decrypt(enc1);
      expect(new TextDecoder().decode(dec1)).toBe("Hello, Bob!");

      // Bob -> Alice
      const msg2 = new TextEncoder().encode("Hello, Alice!");
      const enc2 = await bob.encrypt(msg2);
      const dec2 = await alice.decrypt(enc2);
      expect(new TextDecoder().decode(dec2)).toBe("Hello, Alice!");

      // Alice -> Bob again
      const msg3 = new TextEncoder().encode("How are you?");
      const enc3 = await alice.encrypt(msg3);
      const dec3 = await bob.decrypt(enc3);
      expect(new TextDecoder().decode(dec3)).toBe("How are you?");
    });

    it("should handle multiple round trips", async () => {
      for (let i = 0; i < 10; i++) {
        // Alice -> Bob
        const msgA = new TextEncoder().encode(`Alice message ${i}`);
        const encA = await alice.encrypt(msgA);
        const decA = await bob.decrypt(encA);
        expect(new TextDecoder().decode(decA)).toBe(`Alice message ${i}`);

        // Bob -> Alice
        const msgB = new TextEncoder().encode(`Bob message ${i}`);
        const encB = await bob.encrypt(msgB);
        const decB = await alice.decrypt(encB);
        expect(new TextDecoder().decode(decB)).toBe(`Bob message ${i}`);
      }
    });
  });

  describe("forward secrecy", () => {
    it("should use different keys for different messages", async () => {
      const msg1 = new TextEncoder().encode("Message 1");
      const msg2 = new TextEncoder().encode("Message 2");

      const enc1 = await alice.encrypt(msg1);
      const enc2 = await alice.encrypt(msg2);

      // Same ratchet key (no DH ratchet yet), but different message numbers
      expect(enc1.header.messageNumber).toBe(0);
      expect(enc2.header.messageNumber).toBe(1);

      // Different ciphertexts (different message keys)
      expect(enc1.ciphertext).not.toEqual(enc2.ciphertext);
    });

    it("should perform DH ratchet on direction change", async () => {
      // Alice sends
      const msg1 = await alice.encrypt(new TextEncoder().encode("Hello"));
      const aliceRatchetKey1 = Array.from(alice.getSendingRatchetPublicKey()!);

      // Bob receives and sends back
      await bob.decrypt(msg1);
      const msg2 = await bob.encrypt(new TextEncoder().encode("Hi"));

      // Alice receives
      await alice.decrypt(msg2);

      // Alice sends again - should have new ratchet key
      const msg3 = await alice.encrypt(
        new TextEncoder().encode("How are you?"),
      );
      const aliceRatchetKey2 = Array.from(alice.getSendingRatchetPublicKey()!);

      // Ratchet key should have changed
      expect(aliceRatchetKey2).not.toEqual(aliceRatchetKey1);
    });
  });

  describe("message ordering", () => {
    it("should increment message number", async () => {
      const messages: EncryptedMessage[] = [];

      for (let i = 0; i < 5; i++) {
        const msg = await alice.encrypt(
          new TextEncoder().encode(`Message ${i}`),
        );
        messages.push(msg);
      }

      for (let i = 0; i < 5; i++) {
        expect(messages[i].header.messageNumber).toBe(i);
      }
    });

    it("should handle out-of-order messages (skipped messages)", async () => {
      // Alice sends three messages
      const msg1 = await alice.encrypt(new TextEncoder().encode("Message 1"));
      const msg2 = await alice.encrypt(new TextEncoder().encode("Message 2"));
      const msg3 = await alice.encrypt(new TextEncoder().encode("Message 3"));

      // Bob receives them out of order
      const dec3 = await bob.decrypt(msg3);
      expect(new TextDecoder().decode(dec3)).toBe("Message 3");

      const dec1 = await bob.decrypt(msg1);
      expect(new TextDecoder().decode(dec1)).toBe("Message 1");

      const dec2 = await bob.decrypt(msg2);
      expect(new TextDecoder().decode(dec2)).toBe("Message 2");
    });

    it("should track skipped message keys", async () => {
      // Send multiple messages
      const msg1 = await alice.encrypt(new TextEncoder().encode("Message 1"));
      const msg2 = await alice.encrypt(new TextEncoder().encode("Message 2"));
      const msg3 = await alice.encrypt(new TextEncoder().encode("Message 3"));

      // Bob skips to message 3
      await bob.decrypt(msg3);

      // Check that skipped keys were stored
      expect(bob.getSkippedMessageKeyCount()).toBe(2);
    });

    it("should throw for too many skipped messages", async () => {
      const ratchet = new DoubleRatchet({ maxSkip: 5 });
      await ratchet.initializeAsResponder(sharedSecret, bobRatchetKey);

      // Create initiator to send messages
      const sender = await createInitiatorRatchet(
        sharedSecret,
        bobRatchetKey.publicKey,
        {
          maxSkip: 5,
        },
      );

      // Send 10 messages
      const messages: EncryptedMessage[] = [];
      for (let i = 0; i < 10; i++) {
        messages.push(
          await sender.encrypt(new TextEncoder().encode(`Message ${i}`)),
        );
      }

      // Try to decrypt message 9 first (skipping 0-8)
      await expect(ratchet.decrypt(messages[9])).rejects.toThrow(
        "Too many skipped",
      );

      sender.destroy();
      ratchet.destroy();
    });
  });

  describe("associated data", () => {
    it("should use associated data in encryption", async () => {
      const associatedData = new TextEncoder().encode("channel:123");

      const aliceWithAD = await createInitiatorRatchet(
        sharedSecret,
        bobRatchetKey.publicKey,
        {
          associatedData,
        },
      );
      const bobWithAD = await createResponderRatchet(
        sharedSecret,
        bobRatchetKey,
        {
          associatedData,
        },
      );

      const plaintext = new TextEncoder().encode("Secret message");
      const encrypted = await aliceWithAD.encrypt(plaintext);
      const decrypted = await bobWithAD.decrypt(encrypted);

      expect(new TextDecoder().decode(decrypted)).toBe("Secret message");

      aliceWithAD.destroy();
      bobWithAD.destroy();
    });

    it("should fail decryption with wrong associated data", async () => {
      const aliceAD = new TextEncoder().encode("channel:123");
      const bobAD = new TextEncoder().encode("channel:456");

      const aliceWithAD = await createInitiatorRatchet(
        sharedSecret,
        bobRatchetKey.publicKey,
        {
          associatedData: aliceAD,
        },
      );
      const bobWithAD = await createResponderRatchet(
        sharedSecret,
        bobRatchetKey,
        {
          associatedData: bobAD,
        },
      );

      const plaintext = new TextEncoder().encode("Secret message");
      const encrypted = await aliceWithAD.encrypt(plaintext);

      // Decryption should fail due to AD mismatch
      await expect(bobWithAD.decrypt(encrypted)).rejects.toThrow();

      aliceWithAD.destroy();
      bobWithAD.destroy();
    });
  });
});

describe("Double Ratchet State Management", () => {
  let alice: DoubleRatchet;
  let sharedSecret: Uint8Array;
  let bobRatchetKey: RatchetKeyPair;

  beforeEach(async () => {
    sharedSecret = new Uint8Array(32);
    crypto.getRandomValues(sharedSecret);
    bobRatchetKey = await generateRatchetKey();
    alice = await createInitiatorRatchet(sharedSecret, bobRatchetKey.publicKey);
  });

  afterEach(() => {
    alice.destroy();
  });

  describe("serializeState / deserializeState", () => {
    it("should serialize state", () => {
      const serialized = alice.serializeState();

      expect(typeof serialized.rootKey).toBe("string");
      expect(serialized.sendingRatchetKey).not.toBeNull();
      expect(serialized.sendingChain).not.toBeNull();
      expect(serialized.skippedMessageKeys).toBeInstanceOf(Array);
    });

    it("should deserialize state", async () => {
      // Send some messages to create state
      await alice.encrypt(new TextEncoder().encode("Message 1"));
      await alice.encrypt(new TextEncoder().encode("Message 2"));

      const serialized = alice.serializeState();

      const restored = new DoubleRatchet();
      await restored.deserializeState(serialized);

      expect(restored.isInitialized()).toBe(true);
      expect(restored.getSendingRatchetPublicKey()).toEqual(
        alice.getSendingRatchetPublicKey(),
      );

      restored.destroy();
    });

    it("should continue messaging after state restoration", async () => {
      // Setup Bob
      const bob = await createResponderRatchet(sharedSecret, bobRatchetKey);

      // Send initial message
      const msg1 = await alice.encrypt(new TextEncoder().encode("Before save"));
      await bob.decrypt(msg1);

      // Serialize and restore Alice
      const serialized = alice.serializeState();
      const restoredAlice = new DoubleRatchet();
      await restoredAlice.deserializeState(serialized);

      // Continue messaging
      const msg2 = await restoredAlice.encrypt(
        new TextEncoder().encode("After restore"),
      );
      const dec2 = await bob.decrypt(msg2);

      expect(new TextDecoder().decode(dec2)).toBe("After restore");

      restoredAlice.destroy();
      bob.destroy();
    });
  });

  describe("destroy", () => {
    it("should wipe all key material", () => {
      alice.destroy();

      expect(alice.isInitialized()).toBe(false);
      expect(alice.getSendingRatchetPublicKey()).toBeNull();
    });

    it("should not be usable after destroy", async () => {
      alice.destroy();

      await expect(
        alice.encrypt(new TextEncoder().encode("Test")),
      ).rejects.toThrow("not initialized");
    });
  });
});

describe("Message Encoding/Decoding", () => {
  describe("encodeEncryptedMessage / decodeEncryptedMessage", () => {
    it("should encode and decode a message", async () => {
      const original: EncryptedMessage = {
        header: {
          publicKey: new Uint8Array(65).fill(1),
          previousCounter: 42,
          messageNumber: 7,
        },
        ciphertext: new Uint8Array([10, 20, 30, 40, 50]),
        nonce: new Uint8Array(12).fill(99),
      };

      const encoded = encodeEncryptedMessage(original);
      const decoded = decodeEncryptedMessage(encoded);

      expect(Array.from(decoded.header.publicKey)).toEqual(
        Array.from(original.header.publicKey),
      );
      expect(decoded.header.previousCounter).toBe(
        original.header.previousCounter,
      );
      expect(decoded.header.messageNumber).toBe(original.header.messageNumber);
      expect(Array.from(decoded.ciphertext)).toEqual(
        Array.from(original.ciphertext),
      );
      expect(Array.from(decoded.nonce)).toEqual(Array.from(original.nonce));
    });

    it("should handle various message sizes", async () => {
      const sizes = [0, 1, 100, 1000, 10000];

      for (const size of sizes) {
        const original: EncryptedMessage = {
          header: {
            publicKey: new Uint8Array(65),
            previousCounter: 0,
            messageNumber: 0,
          },
          ciphertext: new Uint8Array(size),
          nonce: new Uint8Array(12),
        };

        const encoded = encodeEncryptedMessage(original);
        const decoded = decodeEncryptedMessage(encoded);

        expect(decoded.ciphertext.length).toBe(size);
      }
    });
  });
});

describe("Double Ratchet Edge Cases", () => {
  let sharedSecret: Uint8Array;
  let bobRatchetKey: RatchetKeyPair;

  beforeEach(async () => {
    sharedSecret = new Uint8Array(32);
    crypto.getRandomValues(sharedSecret);
    bobRatchetKey = await generateRatchetKey();
  });

  it("should handle empty messages", async () => {
    const alice = await createInitiatorRatchet(
      sharedSecret,
      bobRatchetKey.publicKey,
    );
    const bob = await createResponderRatchet(sharedSecret, bobRatchetKey);

    const plaintext = new Uint8Array(0);
    const encrypted = await alice.encrypt(plaintext);
    const decrypted = await bob.decrypt(encrypted);

    expect(decrypted.length).toBe(0);

    alice.destroy();
    bob.destroy();
  });

  it("should handle large messages", async () => {
    const alice = await createInitiatorRatchet(
      sharedSecret,
      bobRatchetKey.publicKey,
    );
    const bob = await createResponderRatchet(sharedSecret, bobRatchetKey);

    // Create large message (100KB) - fill in chunks due to getRandomValues 64KB limit
    const plaintext = new Uint8Array(100000);
    const chunkSize = 65536;
    for (let i = 0; i < plaintext.length; i += chunkSize) {
      const chunk = plaintext.subarray(
        i,
        Math.min(i + chunkSize, plaintext.length),
      );
      crypto.getRandomValues(chunk);
    }

    const encrypted = await alice.encrypt(plaintext);
    const decrypted = await bob.decrypt(encrypted);

    expect(Array.from(decrypted)).toEqual(Array.from(plaintext));

    alice.destroy();
    bob.destroy();
  });

  it("should handle binary data", async () => {
    const alice = await createInitiatorRatchet(
      sharedSecret,
      bobRatchetKey.publicKey,
    );
    const bob = await createResponderRatchet(sharedSecret, bobRatchetKey);

    const binaryData = new Uint8Array([0, 127, 128, 255, 0, 255]);
    const encrypted = await alice.encrypt(binaryData);
    const decrypted = await bob.decrypt(encrypted);

    expect(Array.from(decrypted)).toEqual(Array.from(binaryData));

    alice.destroy();
    bob.destroy();
  });

  it("should fail on tampered ciphertext", async () => {
    const alice = await createInitiatorRatchet(
      sharedSecret,
      bobRatchetKey.publicKey,
    );
    const bob = await createResponderRatchet(sharedSecret, bobRatchetKey);

    const plaintext = new TextEncoder().encode("Secret message");
    const encrypted = await alice.encrypt(plaintext);

    // Tamper with ciphertext
    encrypted.ciphertext[0] ^= 0xff;

    await expect(bob.decrypt(encrypted)).rejects.toThrow();

    alice.destroy();
    bob.destroy();
  });

  it("should fail on tampered nonce", async () => {
    const alice = await createInitiatorRatchet(
      sharedSecret,
      bobRatchetKey.publicKey,
    );
    const bob = await createResponderRatchet(sharedSecret, bobRatchetKey);

    const plaintext = new TextEncoder().encode("Secret message");
    const encrypted = await alice.encrypt(plaintext);

    // Tamper with nonce
    encrypted.nonce[0] ^= 0xff;

    await expect(bob.decrypt(encrypted)).rejects.toThrow();

    alice.destroy();
    bob.destroy();
  });

  it("should handle many consecutive messages without reply", async () => {
    const alice = await createInitiatorRatchet(
      sharedSecret,
      bobRatchetKey.publicKey,
    );
    const bob = await createResponderRatchet(sharedSecret, bobRatchetKey);

    // Send 50 messages without Bob replying
    const messages: EncryptedMessage[] = [];
    for (let i = 0; i < 50; i++) {
      messages.push(
        await alice.encrypt(new TextEncoder().encode(`Message ${i}`)),
      );
    }

    // Bob receives all messages
    for (let i = 0; i < 50; i++) {
      const decrypted = await bob.decrypt(messages[i]);
      expect(new TextDecoder().decode(decrypted)).toBe(`Message ${i}`);
    }

    alice.destroy();
    bob.destroy();
  });
});
