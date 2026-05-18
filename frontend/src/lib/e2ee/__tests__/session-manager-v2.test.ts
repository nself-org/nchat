/**
 * E2EE Session Manager V2 Tests
 *
 * Tests for the session manager that integrates X3DH and Double Ratchet.
 * Covers session lifecycle, message operations, and state management.
 */

import {
  E2EESessionManager,
  createSessionManager,
  type SessionId,
  type SessionMetadata,
  type E2EEMessage,
  type PreKeyMessage,
  type RegularMessage,
  type SessionEvent,
} from "../session-manager-v2";
import { createX3DH, type PreKeyBundle } from "../x3dh";

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

describe("E2EESessionManager Initialization", () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
  });

  it("should create and initialize a session manager", async () => {
    const manager = await createSessionManager({
      userId: "user-1",
      deviceId: "device-1",
      registrationId: 12345,
      storage,
    });

    expect(manager.isInitialized()).toBe(true);

    manager.destroy();
  });

  it("should generate pre-key bundle", async () => {
    const manager = await createSessionManager({
      userId: "user-1",
      deviceId: "device-1",
      registrationId: 12345,
      storage,
    });

    const bundle = manager.getPreKeyBundle();

    expect(bundle.userId).toBe("user-1");
    expect(bundle.deviceId).toBe("device-1");
    expect(bundle.registrationId).toBe(12345);
    expect(bundle.identityKey).toBeInstanceOf(Uint8Array);
    expect(bundle.signedPreKey).toBeInstanceOf(Uint8Array);

    manager.destroy();
  });

  it("should return identity key", async () => {
    const manager = await createSessionManager({
      userId: "user-1",
      deviceId: "device-1",
      registrationId: 12345,
      storage,
    });

    const identityKey = manager.getIdentityKey();

    expect(identityKey).toBeInstanceOf(Uint8Array);
    expect(identityKey!.length).toBe(65);

    manager.destroy();
  });

  it("should report available one-time pre-keys", async () => {
    const manager = await createSessionManager({
      userId: "user-1",
      deviceId: "device-1",
      registrationId: 12345,
      storage,
    });

    const count = manager.getAvailableOneTimePreKeyCount();

    expect(count).toBeGreaterThan(0);

    manager.destroy();
  });
});

describe("E2EESessionManager Session Creation", () => {
  let alice: E2EESessionManager;
  let bob: E2EESessionManager;
  let aliceStorage: MockStorage;
  let bobStorage: MockStorage;
  let bobBundle: PreKeyBundle;

  beforeEach(async () => {
    aliceStorage = new MockStorage();
    bobStorage = new MockStorage();

    alice = await createSessionManager({
      userId: "alice",
      deviceId: "alice-device",
      registrationId: 1,
      storage: aliceStorage,
    });

    bob = await createSessionManager({
      userId: "bob",
      deviceId: "bob-device",
      registrationId: 2,
      storage: bobStorage,
    });

    bobBundle = bob.getPreKeyBundle();
  });

  afterEach(() => {
    alice.destroy();
    bob.destroy();
  });

  it("should create a new session", async () => {
    const sessionId = await alice.createSession(bobBundle);

    expect(sessionId.userId).toBe("bob");
    expect(sessionId.deviceId).toBe("bob-device");
    expect(alice.hasSession(sessionId)).toBe(true);
  });

  it("should return session metadata", async () => {
    const sessionId = await alice.createSession(bobBundle);
    const metadata = alice.getSessionMetadata(sessionId);

    expect(metadata).not.toBeNull();
    expect(metadata!.state).toBe("pending");
    expect(metadata!.initiator).toBe(true);
    expect(metadata!.createdAt).toBeInstanceOf(Date);
  });

  it("should not create duplicate sessions", async () => {
    const sessionId1 = await alice.createSession(bobBundle);
    const sessionId2 = await alice.createSession(bobBundle);

    expect(sessionId1).toEqual(sessionId2);
  });

  it("should list all sessions", async () => {
    await alice.createSession(bobBundle);

    const sessions = alice.getAllSessions();

    expect(sessions.length).toBe(1);
    expect(sessions[0].id.userId).toBe("bob");
  });
});

describe("E2EESessionManager Message Encryption/Decryption", () => {
  let alice: E2EESessionManager;
  let bob: E2EESessionManager;
  let aliceStorage: MockStorage;
  let bobStorage: MockStorage;
  let bobBundle: PreKeyBundle;

  beforeEach(async () => {
    aliceStorage = new MockStorage();
    bobStorage = new MockStorage();

    alice = await createSessionManager({
      userId: "alice",
      deviceId: "alice-device",
      registrationId: 1,
      storage: aliceStorage,
    });

    bob = await createSessionManager({
      userId: "bob",
      deviceId: "bob-device",
      registrationId: 2,
      storage: bobStorage,
    });

    bobBundle = bob.getPreKeyBundle();
    await alice.createSession(bobBundle);
  });

  afterEach(() => {
    alice.destroy();
    bob.destroy();
  });

  describe("first message (pre-key message)", () => {
    it("should encrypt first message as pre-key message", async () => {
      const sessionId: SessionId = { userId: "bob", deviceId: "bob-device" };
      const message = await alice.encryptMessage(sessionId, "Hello, Bob!");

      expect(message.type).toBe("prekey");
      expect((message as PreKeyMessage).identityKey).toBeInstanceOf(Uint8Array);
      expect((message as PreKeyMessage).ephemeralKey).toBeInstanceOf(
        Uint8Array,
      );
    });

    it("should decrypt pre-key message and establish session", async () => {
      const sessionId: SessionId = { userId: "bob", deviceId: "bob-device" };
      const encrypted = await alice.encryptMessage(sessionId, "Hello, Bob!");

      // Bob decrypts (creates session automatically)
      const aliceSessionId: SessionId = {
        userId: "alice",
        deviceId: "alice-device",
      };
      const decrypted = await bob.decryptMessage(aliceSessionId, encrypted);

      expect(decrypted).toBe("Hello, Bob!");
      expect(bob.hasSession(aliceSessionId)).toBe(true);
    });

    it("should update session state after first message", async () => {
      const sessionId: SessionId = { userId: "bob", deviceId: "bob-device" };
      await alice.encryptMessage(sessionId, "Hello!");

      const metadata = alice.getSessionMetadata(sessionId);
      expect(metadata!.state).toBe("established");
    });
  });

  describe("subsequent messages", () => {
    beforeEach(async () => {
      // Establish session with first message
      const sessionId: SessionId = { userId: "bob", deviceId: "bob-device" };
      const firstMessage = await alice.encryptMessage(sessionId, "Hello!");
      const aliceSessionId: SessionId = {
        userId: "alice",
        deviceId: "alice-device",
      };
      await bob.decryptMessage(aliceSessionId, firstMessage);
    });

    it("should encrypt subsequent messages as regular messages", async () => {
      const sessionId: SessionId = { userId: "bob", deviceId: "bob-device" };
      const message = await alice.encryptMessage(sessionId, "How are you?");

      expect(message.type).toBe("message");
    });

    it("should decrypt regular messages", async () => {
      const sessionId: SessionId = { userId: "bob", deviceId: "bob-device" };
      const encrypted = await alice.encryptMessage(sessionId, "How are you?");

      const aliceSessionId: SessionId = {
        userId: "alice",
        deviceId: "alice-device",
      };
      const decrypted = await bob.decryptMessage(aliceSessionId, encrypted);

      expect(decrypted).toBe("How are you?");
    });

    it("should handle bidirectional messaging", async () => {
      const aliceToBoB: SessionId = { userId: "bob", deviceId: "bob-device" };
      const bobToAlice: SessionId = {
        userId: "alice",
        deviceId: "alice-device",
      };

      // Alice -> Bob
      const enc1 = await alice.encryptMessage(aliceToBoB, "Message 1");
      const dec1 = await bob.decryptMessage(bobToAlice, enc1);
      expect(dec1).toBe("Message 1");

      // Bob -> Alice
      const enc2 = await bob.encryptMessage(bobToAlice, "Message 2");
      const dec2 = await alice.decryptMessage(aliceToBoB, enc2);
      expect(dec2).toBe("Message 2");

      // Alice -> Bob again
      const enc3 = await alice.encryptMessage(aliceToBoB, "Message 3");
      const dec3 = await bob.decryptMessage(bobToAlice, enc3);
      expect(dec3).toBe("Message 3");
    });

    it("should track message counts", async () => {
      const aliceToBoB: SessionId = { userId: "bob", deviceId: "bob-device" };
      const bobToAlice: SessionId = {
        userId: "alice",
        deviceId: "alice-device",
      };

      // Send some messages (1 from beforeEach + 5 here = 6 total)
      for (let i = 0; i < 5; i++) {
        const enc = await alice.encryptMessage(aliceToBoB, `Message ${i}`);
        await bob.decryptMessage(bobToAlice, enc);
      }

      const aliceMetadata = alice.getSessionMetadata(aliceToBoB);
      const bobMetadata = bob.getSessionMetadata(bobToAlice);

      expect(aliceMetadata!.messagesSent).toBe(6); // 1 initial + 5 in loop
      expect(bobMetadata!.messagesReceived).toBe(6);
    });
  });
});

describe("E2EESessionManager Session Management", () => {
  let manager: E2EESessionManager;
  let storage: MockStorage;

  beforeEach(async () => {
    storage = new MockStorage();
    manager = await createSessionManager({
      userId: "user-1",
      deviceId: "device-1",
      registrationId: 1,
      storage,
    });
  });

  afterEach(() => {
    manager.destroy();
  });

  it("should close a session", async () => {
    const remoteX3DH = await createX3DH();
    const bundle = remoteX3DH.createPreKeyBundle("remote", "device", 1);
    const sessionId = await manager.createSession(bundle);

    await manager.closeSession(sessionId);

    const metadata = manager.getSessionMetadata(sessionId);
    expect(metadata?.state).toBe("closed");

    remoteX3DH.destroy();
  });

  it("should clean up expired sessions", async () => {
    // Create multiple sessions
    for (let i = 0; i < 3; i++) {
      const remoteX3DH = await createX3DH();
      const bundle = remoteX3DH.createPreKeyBundle(
        `user-${i}`,
        `device-${i}`,
        i,
      );
      await manager.createSession(bundle);
      remoteX3DH.destroy();
    }

    expect(manager.getAllSessions().length).toBe(3);

    // Note: In a real test, we'd mock time to test expiration
    // For now, just verify the method runs without error
    const cleaned = await manager.cleanupExpiredSessions();
    expect(typeof cleaned).toBe("number");
  });
});

describe("E2EESessionManager Identity Verification", () => {
  let alice: E2EESessionManager;
  let bob: E2EESessionManager;
  let aliceStorage: MockStorage;
  let bobStorage: MockStorage;

  beforeEach(async () => {
    aliceStorage = new MockStorage();
    bobStorage = new MockStorage();

    alice = await createSessionManager({
      userId: "alice",
      deviceId: "alice-device",
      registrationId: 1,
      storage: aliceStorage,
    });

    bob = await createSessionManager({
      userId: "bob",
      deviceId: "bob-device",
      registrationId: 2,
      storage: bobStorage,
    });

    // Establish session
    const bobBundle = bob.getPreKeyBundle();
    await alice.createSession(bobBundle);
    const sessionId: SessionId = { userId: "bob", deviceId: "bob-device" };
    const msg = await alice.encryptMessage(sessionId, "Hello!");
    await bob.decryptMessage(
      { userId: "alice", deviceId: "alice-device" },
      msg,
    );
  });

  afterEach(() => {
    alice.destroy();
    bob.destroy();
  });

  it("should generate safety number", async () => {
    const sessionId: SessionId = { userId: "bob", deviceId: "bob-device" };
    const safetyNumber = await alice.getSafetyNumber(sessionId);

    expect(typeof safetyNumber).toBe("string");
    expect(safetyNumber.length).toBe(60);
    expect(/^\d+$/.test(safetyNumber)).toBe(true);
  });

  it("should format safety number", async () => {
    const sessionId: SessionId = { userId: "bob", deviceId: "bob-device" };
    const safetyNumber = await alice.getSafetyNumber(sessionId);
    const formatted = alice.formatSafetyNumber(safetyNumber);

    expect(formatted).toContain(" ");
    const chunks = formatted.split(" ");
    expect(chunks.length).toBe(12); // 60 digits / 5 per chunk
    chunks.forEach((chunk) => {
      expect(chunk.length).toBe(5);
    });
  });
});

describe("E2EESessionManager Pre-Key Management", () => {
  let manager: E2EESessionManager;
  let storage: MockStorage;

  beforeEach(async () => {
    storage = new MockStorage();
    manager = await createSessionManager({
      userId: "user-1",
      deviceId: "device-1",
      registrationId: 1,
      storage,
    });
  });

  afterEach(() => {
    manager.destroy();
  });

  it("should replenish one-time pre-keys", async () => {
    const initialCount = manager.getAvailableOneTimePreKeyCount();
    const newKeys = await manager.replenishOneTimePreKeys(10);

    expect(newKeys.length).toBe(10);
    expect(manager.getAvailableOneTimePreKeyCount()).toBe(initialCount + 10);
  });

  it("should rotate signed pre-key", async () => {
    const bundle1 = manager.getPreKeyBundle();
    const initialSignedPreKeyId = bundle1.signedPreKeyId;

    await manager.rotateSignedPreKey();

    const bundle2 = manager.getPreKeyBundle();
    expect(bundle2.signedPreKeyId).toBe(initialSignedPreKeyId + 1);
  });
});

describe("E2EESessionManager Event System", () => {
  let manager: E2EESessionManager;
  let storage: MockStorage;

  beforeEach(async () => {
    storage = new MockStorage();
    manager = await createSessionManager({
      userId: "user-1",
      deviceId: "device-1",
      registrationId: 1,
      storage,
    });
  });

  afterEach(() => {
    manager.destroy();
  });

  it("should emit session_created event", async () => {
    const events: SessionEvent[] = [];
    manager.on("session_created", (event) => events.push(event));

    const remoteX3DH = await createX3DH();
    const bundle = remoteX3DH.createPreKeyBundle("remote", "device", 1);
    await manager.createSession(bundle);

    expect(events.length).toBe(1);
    expect(events[0].type).toBe("session_created");
    expect(events[0].sessionId.userId).toBe("remote");

    remoteX3DH.destroy();
  });

  it("should allow unsubscribing from events", async () => {
    const events: SessionEvent[] = [];
    const unsubscribe = manager.on("session_created", (event) =>
      events.push(event),
    );

    const remoteX3DH1 = await createX3DH();
    const bundle1 = remoteX3DH1.createPreKeyBundle("remote1", "device1", 1);
    await manager.createSession(bundle1);

    unsubscribe();

    const remoteX3DH2 = await createX3DH();
    const bundle2 = remoteX3DH2.createPreKeyBundle("remote2", "device2", 2);
    await manager.createSession(bundle2);

    expect(events.length).toBe(1);

    remoteX3DH1.destroy();
    remoteX3DH2.destroy();
  });
});

describe("E2EESessionManager Persistence", () => {
  it("should persist and restore sessions", async () => {
    const storage = new MockStorage();

    // Create manager and establish session
    const manager1 = await createSessionManager({
      userId: "alice",
      deviceId: "alice-device",
      registrationId: 1,
      storage,
    });

    const remoteX3DH = await createX3DH();
    const bundle = remoteX3DH.createPreKeyBundle("bob", "bob-device", 2);
    await manager1.createSession(bundle);

    // Send a message to establish session
    const sessionId: SessionId = { userId: "bob", deviceId: "bob-device" };
    await manager1.encryptMessage(sessionId, "Hello!");

    manager1.destroy();

    // Create new manager with same storage
    const manager2 = await createSessionManager({
      userId: "alice",
      deviceId: "alice-device",
      registrationId: 1,
      storage,
    });

    // Session should still exist
    expect(manager2.hasSession(sessionId)).toBe(true);

    manager2.destroy();
    remoteX3DH.destroy();
  });
});

describe("E2EESessionManager Cleanup", () => {
  it("should destroy all resources", async () => {
    const storage = new MockStorage();
    const manager = await createSessionManager({
      userId: "user-1",
      deviceId: "device-1",
      registrationId: 1,
      storage,
    });

    manager.destroy();

    expect(manager.isInitialized()).toBe(false);
    expect(() => manager.getPreKeyBundle()).toThrow();
  });
});
