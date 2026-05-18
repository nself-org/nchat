/**
 * E2EE Service Tests
 *
 * Tests for the high-level E2EE service that integrates all components.
 * Covers end-to-end message encryption/decryption scenarios.
 */

import {
  E2EEService,
  createE2EEService,
  getE2EEService,
  resetE2EEService,
  type E2EEServiceConfig,
  type TransmittableMessage,
  type DecryptedMessage,
  type E2EEServiceStatus,
} from "../e2ee.service";
import { type PreKeyBundle, type OneTimePreKey } from "@/lib/e2ee/x3dh";

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

// Reset singleton between tests
afterEach(() => {
  resetE2EEService();
});

describe("E2EEService Initialization", () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
  });

  it("should create and initialize a service", async () => {
    const service = await createE2EEService({
      userId: "user-1",
      deviceId: "device-1",
      storage,
    });

    expect(service.isInitialized()).toBe(true);

    service.destroy();
  });

  it("should return correct status", async () => {
    const service = await createE2EEService({
      userId: "user-1",
      deviceId: "device-1",
      storage,
    });

    const status = service.getStatus();

    expect(status.initialized).toBe(true);
    expect(status.userId).toBe("user-1");
    expect(status.deviceId).toBe("device-1");
    expect(status.activeSessions).toBe(0);
    expect(status.availableOneTimePreKeys).toBeGreaterThan(0);
    expect(status.preKeysNeedReplenishment).toBe(false);

    service.destroy();
  });

  it("should get pre-key bundle", async () => {
    const service = await createE2EEService({
      userId: "user-1",
      deviceId: "device-1",
      storage,
    });

    const bundle = service.getPreKeyBundle();

    expect(bundle.userId).toBe("user-1");
    expect(bundle.deviceId).toBe("device-1");
    expect(bundle.identityKey).toBeInstanceOf(Uint8Array);

    service.destroy();
  });

  it("should validate bundle", async () => {
    const service = await createE2EEService({
      userId: "user-1",
      deviceId: "device-1",
      storage,
    });

    const validation = service.validateBundle();

    expect(validation.valid).toBe(true);
    expect(validation.errors.length).toBe(0);

    service.destroy();
  });

  it("should get identity key fingerprint", async () => {
    const service = await createE2EEService({
      userId: "user-1",
      deviceId: "device-1",
      storage,
    });

    const fingerprint = service.getIdentityKeyFingerprint();

    expect(typeof fingerprint).toBe("string");
    expect(fingerprint!.length).toBe(16); // 8 bytes hex

    service.destroy();
  });
});

describe("E2EEService Singleton", () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
  });

  it("should create singleton on first call", async () => {
    const service = await getE2EEService({
      userId: "user-1",
      deviceId: "device-1",
      storage,
    });

    expect(service.isInitialized()).toBe(true);
  });

  it("should return same instance on subsequent calls", async () => {
    const service1 = await getE2EEService({
      userId: "user-1",
      deviceId: "device-1",
      storage,
    });

    const service2 = await getE2EEService();

    expect(service1).toBe(service2);
  });

  it("should throw without config on first call", async () => {
    await expect(getE2EEService()).rejects.toThrow("not configured");
  });

  it("should reset singleton", async () => {
    const service1 = await getE2EEService({
      userId: "user-1",
      deviceId: "device-1",
      storage,
    });

    resetE2EEService();

    // Should need config again
    await expect(getE2EEService()).rejects.toThrow("not configured");
  });
});

// Test re-enabled after source fixes for Uint8Array cast against Node.js 20 WebCrypto APIs.
describe("E2EEService Message Encryption/Decryption", () => {
  let alice: E2EEService;
  let bob: E2EEService;
  let aliceStorage: MockStorage;
  let bobStorage: MockStorage;
  let bobBundle: PreKeyBundle;

  beforeEach(async () => {
    aliceStorage = new MockStorage();
    bobStorage = new MockStorage();

    alice = await createE2EEService({
      userId: "alice",
      deviceId: "alice-device",
      storage: aliceStorage,
    });

    bob = await createE2EEService({
      userId: "bob",
      deviceId: "bob-device",
      storage: bobStorage,
    });

    bobBundle = bob.getPreKeyBundle();
  });

  afterEach(() => {
    alice.destroy();
    bob.destroy();
  });

  describe("session establishment", () => {
    it("should create session with remote bundle", async () => {
      const sessionId = await alice.getOrCreateSession(bobBundle);

      expect(sessionId.userId).toBe("bob");
      expect(sessionId.deviceId).toBe("bob-device");
      expect(alice.hasSession("bob", "bob-device")).toBe(true);
    });

    it("should return existing session", async () => {
      const sessionId1 = await alice.getOrCreateSession(bobBundle);
      const sessionId2 = await alice.getOrCreateSession(bobBundle);

      expect(sessionId1).toEqual(sessionId2);
    });
  });

  describe("message encryption", () => {
    it("should encrypt a message", async () => {
      const encrypted = await alice.encryptMessage(
        "bob",
        "bob-device",
        "Hello, Bob!",
        bobBundle,
      );

      expect(encrypted.type).toBe("prekey");
      expect(encrypted.senderUserId).toBe("alice");
      expect(encrypted.senderDeviceId).toBe("alice-device");
      expect(encrypted.recipientUserId).toBe("bob");
      expect(encrypted.recipientDeviceId).toBe("bob-device");
      expect(encrypted.ciphertext).toBeTruthy();
      expect(encrypted.messageId).toBeTruthy();
    });

    it("should include pre-key info in first message", async () => {
      const encrypted = await alice.encryptMessage(
        "bob",
        "bob-device",
        "Hello!",
        bobBundle,
      );

      expect(encrypted.type).toBe("prekey");
      expect(encrypted.identityKey).toBeTruthy();
      expect(encrypted.ephemeralKey).toBeTruthy();
    });

    it("should send regular message after session established", async () => {
      // First message establishes session
      const enc1 = await alice.encryptMessage(
        "bob",
        "bob-device",
        "Hello!",
        bobBundle,
      );
      await bob.decryptMessage(enc1);

      // Second message should be regular
      const enc2 = await alice.encryptMessage(
        "bob",
        "bob-device",
        "How are you?",
      );

      expect(enc2.type).toBe("message");
      expect(enc2.identityKey).toBeUndefined();
    });
  });

  describe("message decryption", () => {
    it("should decrypt a pre-key message", async () => {
      const encrypted = await alice.encryptMessage(
        "bob",
        "bob-device",
        "Hello, Bob!",
        bobBundle,
      );
      const decrypted = await bob.decryptMessage(encrypted);

      expect(decrypted.content).toBe("Hello, Bob!");
      expect(decrypted.senderUserId).toBe("alice");
      expect(decrypted.senderDeviceId).toBe("alice-device");
      expect(decrypted.newSession).toBe(true);
    });

    it("should decrypt a regular message", async () => {
      // Establish session
      const enc1 = await alice.encryptMessage(
        "bob",
        "bob-device",
        "Hello!",
        bobBundle,
      );
      await bob.decryptMessage(enc1);

      // Send and decrypt regular message
      const enc2 = await alice.encryptMessage(
        "bob",
        "bob-device",
        "How are you?",
      );
      const decrypted = await bob.decryptMessage(enc2);

      expect(decrypted.content).toBe("How are you?");
      expect(decrypted.newSession).toBe(false);
    });

    it("should handle bidirectional messaging", async () => {
      // Alice -> Bob
      const enc1 = await alice.encryptMessage(
        "bob",
        "bob-device",
        "Hello, Bob!",
        bobBundle,
      );
      const dec1 = await bob.decryptMessage(enc1);
      expect(dec1.content).toBe("Hello, Bob!");

      // Bob -> Alice
      const aliceBundle = alice.getPreKeyBundle();
      const enc2 = await bob.encryptMessage(
        "alice",
        "alice-device",
        "Hi, Alice!",
        aliceBundle,
      );
      const dec2 = await alice.decryptMessage(enc2);
      expect(dec2.content).toBe("Hi, Alice!");

      // Continue conversation
      const enc3 = await alice.encryptMessage(
        "bob",
        "bob-device",
        "How are you?",
      );
      const dec3 = await bob.decryptMessage(enc3);
      expect(dec3.content).toBe("How are you?");

      const enc4 = await bob.encryptMessage(
        "alice",
        "alice-device",
        "I'm good!",
      );
      const dec4 = await alice.decryptMessage(enc4);
      expect(dec4.content).toBe("I'm good!");
    });

    it("should handle multiple messages", async () => {
      // Establish session
      const enc1 = await alice.encryptMessage(
        "bob",
        "bob-device",
        "Message 1",
        bobBundle,
      );
      await bob.decryptMessage(enc1);

      // Send multiple messages
      for (let i = 2; i <= 10; i++) {
        const encrypted = await alice.encryptMessage(
          "bob",
          "bob-device",
          `Message ${i}`,
        );
        const decrypted = await bob.decryptMessage(encrypted);
        expect(decrypted.content).toBe(`Message ${i}`);
      }
    });
  });

  describe("batch encryption", () => {
    it("should encrypt for multiple devices", async () => {
      const device2Storage = new MockStorage();
      const bobDevice2 = await createE2EEService({
        userId: "bob",
        deviceId: "bob-device-2",
        storage: device2Storage,
      });

      const bundle1 = bob.getPreKeyBundle();
      const bundle2 = bobDevice2.getPreKeyBundle();

      const messages = await alice.encryptForMultipleDevices(
        [
          { userId: "bob", deviceId: "bob-device", bundle: bundle1 },
          { userId: "bob", deviceId: "bob-device-2", bundle: bundle2 },
        ],
        "Hello, all Bobs!",
      );

      expect(messages.length).toBe(2);
      expect(messages[0].recipientDeviceId).toBe("bob-device");
      expect(messages[1].recipientDeviceId).toBe("bob-device-2");

      // Both should decrypt correctly
      const dec1 = await bob.decryptMessage(messages[0]);
      const dec2 = await bobDevice2.decryptMessage(messages[1]);

      expect(dec1.content).toBe("Hello, all Bobs!");
      expect(dec2.content).toBe("Hello, all Bobs!");

      bobDevice2.destroy();
    });
  });
});

// Test re-enabled.
describe("E2EEService Session Management", () => {
  let alice: E2EEService;
  let bob: E2EEService;
  let aliceStorage: MockStorage;
  let bobStorage: MockStorage;

  beforeEach(async () => {
    aliceStorage = new MockStorage();
    bobStorage = new MockStorage();

    alice = await createE2EEService({
      userId: "alice",
      deviceId: "alice-device",
      storage: aliceStorage,
    });

    bob = await createE2EEService({
      userId: "bob",
      deviceId: "bob-device",
      storage: bobStorage,
    });
  });

  afterEach(() => {
    alice.destroy();
    bob.destroy();
  });

  it("should get session info", async () => {
    const bobBundle = bob.getPreKeyBundle();
    await alice.getOrCreateSession(bobBundle);

    // Establish session
    const enc = await alice.encryptMessage("bob", "bob-device", "Hello!");
    await bob.decryptMessage(enc);

    const info = await alice.getSessionInfo("bob", "bob-device");

    expect(info).not.toBeNull();
    expect(info!.sessionId.userId).toBe("bob");
    expect(info!.state).toBe("established");
    expect(info!.safetyNumber).toBeTruthy();
    expect(info!.messagesSent).toBeGreaterThan(0);
  });

  it("should list all sessions", async () => {
    const bobBundle = bob.getPreKeyBundle();
    await alice.getOrCreateSession(bobBundle);
    await alice.encryptMessage("bob", "bob-device", "Hello!", bobBundle);

    const sessions = alice.getAllSessions();

    expect(sessions.length).toBe(1);
    expect(sessions[0].id.userId).toBe("bob");
  });

  it("should close a session", async () => {
    const bobBundle = bob.getPreKeyBundle();
    await alice.getOrCreateSession(bobBundle);
    await alice.encryptMessage("bob", "bob-device", "Hello!", bobBundle);

    await alice.closeSession("bob", "bob-device");

    // Session should be closed but still trackable
    const info = await alice.getSessionInfo("bob", "bob-device");
    expect(info?.state).toBe("closed");
  });
});

// Test re-enabled.
describe("E2EEService Identity Verification", () => {
  let alice: E2EEService;
  let bob: E2EEService;
  let aliceStorage: MockStorage;
  let bobStorage: MockStorage;

  beforeEach(async () => {
    aliceStorage = new MockStorage();
    bobStorage = new MockStorage();

    alice = await createE2EEService({
      userId: "alice",
      deviceId: "alice-device",
      storage: aliceStorage,
    });

    bob = await createE2EEService({
      userId: "bob",
      deviceId: "bob-device",
      storage: bobStorage,
    });

    // Establish session
    const bobBundle = bob.getPreKeyBundle();
    const enc = await alice.encryptMessage(
      "bob",
      "bob-device",
      "Hello!",
      bobBundle,
    );
    await bob.decryptMessage(enc);
  });

  afterEach(() => {
    alice.destroy();
    bob.destroy();
  });

  it("should get safety number", async () => {
    const safetyNumber = await alice.getSafetyNumber("bob", "bob-device");

    expect(typeof safetyNumber).toBe("string");
    expect(safetyNumber.length).toBe(60);
  });

  it("should format safety number", async () => {
    const safetyNumber = await alice.getSafetyNumber("bob", "bob-device");
    const formatted = alice.formatSafetyNumber(safetyNumber);

    expect(formatted).toContain(" ");
    expect(formatted.split(" ").length).toBe(12);
  });
});

// Test re-enabled.
describe("E2EEService Pre-Key Management", () => {
  let service: E2EEService;
  let storage: MockStorage;
  let replenishedKeys: OneTimePreKey[] = [];

  beforeEach(async () => {
    storage = new MockStorage();
    replenishedKeys = [];

    service = await createE2EEService({
      userId: "user-1",
      deviceId: "device-1",
      storage,
      minOneTimePreKeys: 10,
      autoReplenishPreKeys: true,
      onPreKeyReplenishNeeded: async (keys) => {
        replenishedKeys = keys;
      },
    });
  });

  afterEach(() => {
    service.destroy();
  });

  it("should check and replenish pre-keys", async () => {
    // Force low pre-key count by marking many as consumed
    for (let i = 1; i <= 95; i++) {
      service.markOneTimePreKeyConsumed(i);
    }

    const newKeys = await service.checkAndReplenishPreKeys();

    expect(newKeys.length).toBeGreaterThan(0);
  });

  it("should call replenishment callback", async () => {
    // Force low pre-key count
    for (let i = 1; i <= 95; i++) {
      service.markOneTimePreKeyConsumed(i);
    }

    await service.checkAndReplenishPreKeys();

    expect(replenishedKeys.length).toBeGreaterThan(0);
  });

  it("should rotate signed pre-key if needed", async () => {
    // In fresh state, rotation should not be needed
    const rotated = await service.rotateSignedPreKeyIfNeeded();

    expect(rotated).toBe(false);
  });

  it("should create sync request", () => {
    const request = service.createSyncRequest();

    expect(request.registrationId).toBeDefined();
    expect(request.identityKey).toBeTruthy();
    expect(request.signedPreKey).toBeDefined();
    expect(request.oneTimePreKeys.length).toBeGreaterThan(0);
  });
});

// Test re-enabled.
describe("E2EEService Maintenance", () => {
  let service: E2EEService;
  let storage: MockStorage;

  beforeEach(async () => {
    storage = new MockStorage();
    service = await createE2EEService({
      userId: "user-1",
      deviceId: "device-1",
      storage,
    });
  });

  afterEach(() => {
    service.destroy();
  });

  it("should perform maintenance without errors", async () => {
    await expect(service.performMaintenance()).resolves.not.toThrow();

    const status = service.getStatus();
    expect(status.lastSyncAt).not.toBeNull();
  });
});

// Test re-enabled.
describe("E2EEService Events", () => {
  let alice: E2EEService;
  let bob: E2EEService;
  let aliceStorage: MockStorage;
  let bobStorage: MockStorage;

  beforeEach(async () => {
    aliceStorage = new MockStorage();
    bobStorage = new MockStorage();

    alice = await createE2EEService({
      userId: "alice",
      deviceId: "alice-device",
      storage: aliceStorage,
    });

    bob = await createE2EEService({
      userId: "bob",
      deviceId: "bob-device",
      storage: bobStorage,
    });
  });

  afterEach(() => {
    alice.destroy();
    bob.destroy();
  });

  it("should emit session events", async () => {
    const events: string[] = [];

    alice.on("session_created", () => events.push("created"));
    alice.on("session_established", () => events.push("established"));
    alice.on("message_sent", () => events.push("message_sent"));

    const bobBundle = bob.getPreKeyBundle();
    await alice.encryptMessage("bob", "bob-device", "Hello!", bobBundle);

    expect(events).toContain("created");
    expect(events).toContain("established");
    expect(events).toContain("message_sent");
  });

  it("should allow unsubscribing", async () => {
    const events: string[] = [];

    const unsubscribe = alice.on("message_sent", () => events.push("sent"));

    const bobBundle = bob.getPreKeyBundle();
    await alice.encryptMessage("bob", "bob-device", "Message 1", bobBundle);

    unsubscribe();

    await alice.encryptMessage("bob", "bob-device", "Message 2");

    // Should only have 1 event (before unsubscribe)
    expect(events.length).toBe(1);
  });
});

describe("E2EEService Cleanup", () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
  });

  it("should destroy service", async () => {
    const service = await createE2EEService({
      userId: "user-1",
      deviceId: "device-1",
      storage,
    });

    service.destroy();

    expect(service.isInitialized()).toBe(false);
  });

  it("should clear all data", async () => {
    const service = await createE2EEService({
      userId: "user-1",
      deviceId: "device-1",
      storage,
    });

    // Create some data
    const bundle = service.getPreKeyBundle();

    // Clear everything
    service.clearAllData();

    expect(service.isInitialized()).toBe(false);
  });
});

describe("E2EEService Error Handling", () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
  });

  it("should throw when not initialized", async () => {
    const service = new E2EEService({
      userId: "user-1",
      deviceId: "device-1",
      storage,
    });

    expect(() => service.getPreKeyBundle()).toThrow("not initialized");
  });

  it("should throw when encrypting without session or bundle", async () => {
    const service = await createE2EEService({
      userId: "user-1",
      deviceId: "device-1",
      storage,
    });

    await expect(
      service.encryptMessage("bob", "bob-device", "Hello!"),
    ).rejects.toThrow("No session exists");

    service.destroy();
  });
});
