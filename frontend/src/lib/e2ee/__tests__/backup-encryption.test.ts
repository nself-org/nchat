/**
 * Backup Encryption Tests
 *
 * Tests for backup encryption, serialization, and restoration.
 */

import { describe, it, expect } from "@jest/globals";
import {
  createEncryptedBackup,
  restoreBackup,
  validateBackup,
  parseBackup,
  parseBackupFromBytes,
  serializeBackup,
  serializeBackupToBytes,
  createKeyEntry,
  createSessionEntry,
  createDeviceInfo,
  extractKeyFromEntry,
  extractSessionState,
  compareBackups,
  BackupKeyType,
  BACKUP_FORMAT_VERSION,
  type BackupPayload,
  type BackupDeviceInfo,
  type BackupKeyEntry,
} from "../backup-encryption";
import { stringToBytes, bytesToString } from "../crypto";

describe("Backup Encryption", () => {
  // Helper to create test payload
  function createTestPayload(): BackupPayload {
    const deviceInfo: BackupDeviceInfo = {
      deviceId: "test-device-001",
      registrationId: 12345,
      deviceName: "Test Device",
      platform: "web",
      appVersion: "1.0.0",
      deviceFingerprint: "abcd1234",
    };

    return {
      userId: "user-123",
      device: deviceInfo,
      identityKeys: [
        createKeyEntry(
          BackupKeyType.IDENTITY_KEY,
          "identity-1",
          new Uint8Array(32).fill(1),
          new Uint8Array(32).fill(2),
        ),
      ],
      signedPreKeys: [
        createKeyEntry(
          BackupKeyType.SIGNED_PREKEY,
          "spk-1",
          new Uint8Array(32).fill(3),
          new Uint8Array(32).fill(4),
          {
            keyId: 1,
            signature: new Uint8Array(64).fill(5),
            expiresAt: Date.now() + 86400000,
          },
        ),
      ],
      oneTimePreKeys: [
        createKeyEntry(
          BackupKeyType.ONE_TIME_PREKEY,
          "opk-1",
          new Uint8Array(32).fill(6),
          new Uint8Array(32).fill(7),
          { keyId: 100 },
        ),
        createKeyEntry(
          BackupKeyType.ONE_TIME_PREKEY,
          "opk-2",
          new Uint8Array(32).fill(8),
          new Uint8Array(32).fill(9),
          { keyId: 101 },
        ),
      ],
      sessions: [
        createSessionEntry(
          "peer-user-1",
          "peer-device-1",
          new Uint8Array(256).fill(10),
          new Uint8Array(32).fill(11),
          { sending: 5, receiving: 3 },
          { created: Date.now() - 3600000, lastActivity: Date.now() },
        ),
      ],
      senderKeys: [],
      createdAt: Date.now(),
      messageCount: 100,
    };
  }

  const testEncryptionKey = new Uint8Array(32).fill(42);
  const testKdfParams = {
    algorithm: "pbkdf2-sha512" as const,
    iterations: 310000,
    salt: "00".repeat(32),
  };

  describe("createEncryptedBackup", () => {
    it("creates an encrypted backup", async () => {
      const payload = createTestPayload();
      const backup = await createEncryptedBackup(
        payload,
        testEncryptionKey,
        testKdfParams,
      );

      expect(backup).toHaveProperty("header");
      expect(backup).toHaveProperty("encryptedPayload");
      expect(backup).toHaveProperty("integrityTag");
    });

    it("includes correct header information", async () => {
      const payload = createTestPayload();
      const backup = await createEncryptedBackup(
        payload,
        testEncryptionKey,
        testKdfParams,
      );

      expect(backup.header.version).toBe(BACKUP_FORMAT_VERSION);
      expect(backup.header.userId).toBe(payload.userId);
      expect(backup.header.deviceId).toBe(payload.device.deviceId);
      expect(backup.header.kdf.algorithm).toBe("pbkdf2-sha512");
      expect(backup.header.kdf.iterations).toBe(310000);
    });

    it("includes magic bytes in header", async () => {
      const payload = createTestPayload();
      const backup = await createEncryptedBackup(
        payload,
        testEncryptionKey,
        testKdfParams,
      );

      expect(backup.header.magic).toBe("4e43484154424b"); // "NCHATBK"
    });

    it("generates payload checksum", async () => {
      const payload = createTestPayload();
      const backup = await createEncryptedBackup(
        payload,
        testEncryptionKey,
        testKdfParams,
      );

      expect(backup.header.payloadChecksum).toMatch(/^[0-9a-f]{64}$/i);
    });

    it("generates header checksum", async () => {
      const payload = createTestPayload();
      const backup = await createEncryptedBackup(
        payload,
        testEncryptionKey,
        testKdfParams,
      );

      expect(backup.header.headerChecksum).toMatch(/^[0-9a-f]{64}$/i);
    });

    it("generates integrity tag", async () => {
      const payload = createTestPayload();
      const backup = await createEncryptedBackup(
        payload,
        testEncryptionKey,
        testKdfParams,
      );

      expect(backup.integrityTag).toMatch(/^[0-9a-f]{64}$/i);
    });

    it("encrypts payload as base64", async () => {
      const payload = createTestPayload();
      const backup = await createEncryptedBackup(
        payload,
        testEncryptionKey,
        testKdfParams,
      );

      // Should be valid base64
      expect(() => atob(backup.encryptedPayload)).not.toThrow();
    });
  });

  describe("serializeBackup / parseBackup", () => {
    it("serializes backup to JSON string", async () => {
      const payload = createTestPayload();
      const backup = await createEncryptedBackup(
        payload,
        testEncryptionKey,
        testKdfParams,
      );

      const serialized = serializeBackup(backup);
      expect(typeof serialized).toBe("string");
      expect(() => JSON.parse(serialized)).not.toThrow();
    });

    it("parses serialized backup", async () => {
      const payload = createTestPayload();
      const backup = await createEncryptedBackup(
        payload,
        testEncryptionKey,
        testKdfParams,
      );

      const serialized = serializeBackup(backup);
      const parsed = parseBackup(serialized);

      expect(parsed.header.version).toBe(backup.header.version);
      expect(parsed.header.userId).toBe(backup.header.userId);
      expect(parsed.encryptedPayload).toBe(backup.encryptedPayload);
      expect(parsed.integrityTag).toBe(backup.integrityTag);
    });

    it("serializes and parses backup bytes", async () => {
      const payload = createTestPayload();
      const backup = await createEncryptedBackup(
        payload,
        testEncryptionKey,
        testKdfParams,
      );

      const bytes = serializeBackupToBytes(backup);
      expect(bytes).toBeInstanceOf(Uint8Array);

      const parsed = parseBackupFromBytes(bytes);
      expect(parsed.header.version).toBe(backup.header.version);
    });

    it("throws on invalid JSON", () => {
      expect(() => parseBackup("not valid json")).toThrow(
        "Failed to parse backup",
      );
    });

    it("throws on missing required fields", () => {
      expect(() => parseBackup("{}")).toThrow("Invalid backup structure");
    });
  });

  describe("validateBackup", () => {
    it("validates a correct backup", async () => {
      const payload = createTestPayload();
      const backup = await createEncryptedBackup(
        payload,
        testEncryptionKey,
        testKdfParams,
      );

      const result = validateBackup(backup);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("returns metadata for valid backup", async () => {
      const payload = createTestPayload();
      const backup = await createEncryptedBackup(
        payload,
        testEncryptionKey,
        testKdfParams,
      );

      const result = validateBackup(backup);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.userId).toBe(payload.userId);
      expect(result.metadata?.deviceId).toBe(payload.device.deviceId);
      expect(result.metadata?.version).toBe(BACKUP_FORMAT_VERSION);
    });

    it("detects invalid magic bytes", async () => {
      const payload = createTestPayload();
      const backup = await createEncryptedBackup(
        payload,
        testEncryptionKey,
        testKdfParams,
      );
      backup.header.magic = "00000000000000";

      const result = validateBackup(backup);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("identifier"))).toBe(true);
    });

    it("detects invalid version", async () => {
      const payload = createTestPayload();
      const backup = await createEncryptedBackup(
        payload,
        testEncryptionKey,
        testKdfParams,
      );
      backup.header.version = 999;

      const result = validateBackup(backup);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("version"))).toBe(true);
    });

    it("detects invalid payload checksum format", async () => {
      const payload = createTestPayload();
      const backup = await createEncryptedBackup(
        payload,
        testEncryptionKey,
        testKdfParams,
      );
      backup.header.payloadChecksum = "invalid";

      const result = validateBackup(backup);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("payload checksum"))).toBe(
        true,
      );
    });

    it("detects weak KDF parameters", async () => {
      const payload = createTestPayload();
      const backup = await createEncryptedBackup(
        payload,
        testEncryptionKey,
        testKdfParams,
      );
      backup.header.kdf.iterations = 1000;

      const result = validateBackup(backup);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("key derivation"))).toBe(
        true,
      );
    });
  });

  describe("restoreBackup", () => {
    it("restores backup with correct key", async () => {
      const payload = createTestPayload();
      const backup = await createEncryptedBackup(
        payload,
        testEncryptionKey,
        testKdfParams,
      );

      const result = await restoreBackup(backup, testEncryptionKey);

      expect(result.payload.userId).toBe(payload.userId);
      expect(result.payload.device.deviceId).toBe(payload.device.deviceId);
      expect(result.payload.identityKeys.length).toBe(
        payload.identityKeys.length,
      );
      expect(result.payload.sessions.length).toBe(payload.sessions.length);
    });

    it("verifies device when provided", async () => {
      const payload = createTestPayload();
      const backup = await createEncryptedBackup(
        payload,
        testEncryptionKey,
        testKdfParams,
      );

      const result = await restoreBackup(
        backup,
        testEncryptionKey,
        "test-device-001",
      );
      expect(result.deviceVerified).toBe(true);
    });

    it("warns when device does not match", async () => {
      const payload = createTestPayload();
      const backup = await createEncryptedBackup(
        payload,
        testEncryptionKey,
        testKdfParams,
      );

      const result = await restoreBackup(
        backup,
        testEncryptionKey,
        "different-device",
      );
      expect(result.deviceVerified).toBe(false);
      expect(result.warnings.some((w) => w.includes("different device"))).toBe(
        true,
      );
    });

    it("includes metadata in result", async () => {
      const payload = createTestPayload();
      const backup = await createEncryptedBackup(
        payload,
        testEncryptionKey,
        testKdfParams,
      );

      const result = await restoreBackup(backup, testEncryptionKey);

      expect(result.metadata.version).toBe(BACKUP_FORMAT_VERSION);
      expect(result.metadata.deviceId).toBe(payload.device.deviceId);
      expect(result.metadata.messageCount).toBe(payload.messageCount);
    });

    it("throws on tampered integrity tag", async () => {
      const payload = createTestPayload();
      const backup = await createEncryptedBackup(
        payload,
        testEncryptionKey,
        testKdfParams,
      );
      backup.integrityTag = "00".repeat(32);

      await expect(restoreBackup(backup, testEncryptionKey)).rejects.toThrow(
        "integrity verification failed",
      );
    });

    it("throws on wrong encryption key", async () => {
      const payload = createTestPayload();
      const backup = await createEncryptedBackup(
        payload,
        testEncryptionKey,
        testKdfParams,
      );
      const wrongKey = new Uint8Array(32).fill(99);

      await expect(restoreBackup(backup, wrongKey)).rejects.toThrow();
    });
  });

  describe("createKeyEntry", () => {
    it("creates entry with required fields", () => {
      const entry = createKeyEntry(
        BackupKeyType.IDENTITY_KEY,
        "key-id",
        new Uint8Array(32).fill(1),
        new Uint8Array(32).fill(2),
      );

      expect(entry.type).toBe(BackupKeyType.IDENTITY_KEY);
      expect(entry.id).toBe("key-id");
      expect(entry.publicKey).toBeDefined();
      expect(entry.privateKey).toBeDefined();
      expect(entry.createdAt).toBeGreaterThan(0);
    });

    it("handles null public key", () => {
      const entry = createKeyEntry(
        BackupKeyType.SESSION_STATE,
        "key-id",
        null,
        new Uint8Array(32),
      );
      expect(entry.publicKey).toBeUndefined();
    });

    it("handles null private key", () => {
      const entry = createKeyEntry(
        BackupKeyType.IDENTITY_KEY,
        "key-id",
        new Uint8Array(32),
        null,
      );
      expect(entry.privateKey).toBeUndefined();
    });

    it("includes optional fields when provided", () => {
      const entry = createKeyEntry(
        BackupKeyType.SIGNED_PREKEY,
        "spk-1",
        new Uint8Array(32),
        new Uint8Array(32),
        {
          keyId: 42,
          signature: new Uint8Array(64).fill(5),
          expiresAt: 1234567890,
          metadata: { custom: "data" },
        },
      );

      expect(entry.keyId).toBe(42);
      expect(entry.signature).toBeDefined();
      expect(entry.expiresAt).toBe(1234567890);
      expect(entry.metadata).toEqual({ custom: "data" });
    });

    it("converts bytes to hex", () => {
      const entry = createKeyEntry(
        BackupKeyType.IDENTITY_KEY,
        "key-id",
        new Uint8Array([0x01, 0x02, 0x03]),
        new Uint8Array([0xab, 0xcd, 0xef]),
      );

      expect(entry.publicKey).toBe("010203");
      expect(entry.privateKey).toBe("abcdef");
    });
  });

  describe("createSessionEntry", () => {
    it("creates session entry with all fields", () => {
      const entry = createSessionEntry(
        "peer-user",
        "peer-device",
        new Uint8Array(100),
        new Uint8Array(32),
        { sending: 10, receiving: 5 },
        { created: 1000, lastActivity: 2000 },
      );

      expect(entry.peerUserId).toBe("peer-user");
      expect(entry.peerDeviceId).toBe("peer-device");
      expect(entry.sessionState).toBeDefined();
      expect(entry.rootKeyFingerprint.length).toBe(16);
      expect(entry.sendingCounter).toBe(10);
      expect(entry.receivingCounter).toBe(5);
      expect(entry.createdAt).toBe(1000);
      expect(entry.lastActivity).toBe(2000);
    });

    it("encodes session state as base64", () => {
      const entry = createSessionEntry(
        "peer-user",
        "peer-device",
        new Uint8Array([1, 2, 3]),
        new Uint8Array(32),
        { sending: 0, receiving: 0 },
        { created: 0, lastActivity: 0 },
      );

      expect(() => atob(entry.sessionState)).not.toThrow();
    });
  });

  describe("createDeviceInfo", () => {
    it("creates device info with all fields", () => {
      const info = createDeviceInfo(
        "device-123",
        12345,
        "ios",
        "2.0.0",
        "My iPhone",
      );

      expect(info.deviceId).toBe("device-123");
      expect(info.registrationId).toBe(12345);
      expect(info.platform).toBe("ios");
      expect(info.appVersion).toBe("2.0.0");
      expect(info.deviceName).toBe("My iPhone");
      expect(info.deviceFingerprint.length).toBe(32);
    });

    it("handles undefined device name", () => {
      const info = createDeviceInfo("device-123", 12345, "web", "1.0.0");
      expect(info.deviceName).toBeUndefined();
    });

    it("generates consistent fingerprint for same inputs", () => {
      const info1 = createDeviceInfo("device-123", 12345, "ios", "2.0.0");
      const info2 = createDeviceInfo("device-123", 12345, "ios", "2.0.0");
      expect(info1.deviceFingerprint).toBe(info2.deviceFingerprint);
    });

    it("generates different fingerprints for different inputs", () => {
      const info1 = createDeviceInfo("device-1", 12345, "ios", "2.0.0");
      const info2 = createDeviceInfo("device-2", 12345, "ios", "2.0.0");
      expect(info1.deviceFingerprint).not.toBe(info2.deviceFingerprint);
    });
  });

  describe("extractKeyFromEntry", () => {
    it("extracts key bytes from entry", () => {
      const entry = createKeyEntry(
        BackupKeyType.IDENTITY_KEY,
        "key-id",
        new Uint8Array(32).fill(1),
        new Uint8Array(32).fill(2),
        {
          signature: new Uint8Array(64).fill(3),
          data: new Uint8Array(16).fill(4),
        },
      );

      const extracted = extractKeyFromEntry(entry);

      expect(extracted.publicKey).toEqual(new Uint8Array(32).fill(1));
      expect(extracted.privateKey).toEqual(new Uint8Array(32).fill(2));
      expect(extracted.signature).toEqual(new Uint8Array(64).fill(3));
      expect(extracted.data).toEqual(new Uint8Array(16).fill(4));
    });

    it("handles missing optional fields", () => {
      const entry = createKeyEntry(
        BackupKeyType.IDENTITY_KEY,
        "key-id",
        new Uint8Array(32),
        null,
      );

      const extracted = extractKeyFromEntry(entry);

      expect(extracted.publicKey).not.toBeNull();
      expect(extracted.privateKey).toBeNull();
      expect(extracted.signature).toBeNull();
      expect(extracted.data).toBeNull();
    });
  });

  describe("extractSessionState", () => {
    it("extracts session state bytes", () => {
      const originalState = new Uint8Array([1, 2, 3, 4, 5]);
      const entry = createSessionEntry(
        "peer-user",
        "peer-device",
        originalState,
        new Uint8Array(32),
        { sending: 0, receiving: 0 },
        { created: 0, lastActivity: 0 },
      );

      const extracted = extractSessionState(entry);
      expect(extracted).toEqual(originalState);
    });
  });

  describe("compareBackups", () => {
    it("compares identical backups", () => {
      const payload = createTestPayload();
      const comparison = compareBackups(payload, payload);

      expect(comparison.addedKeys).toBe(0);
      expect(comparison.removedKeys).toBe(0);
      expect(comparison.addedSessions).toBe(0);
      expect(comparison.removedSessions).toBe(0);
      expect(comparison.messageCountDiff).toBe(0);
    });

    it("detects added keys", () => {
      const older = createTestPayload();
      const newer = createTestPayload();
      newer.oneTimePreKeys.push(
        createKeyEntry(
          BackupKeyType.ONE_TIME_PREKEY,
          "opk-new",
          new Uint8Array(32),
          new Uint8Array(32),
          { keyId: 999 },
        ),
      );

      const comparison = compareBackups(older, newer);
      expect(comparison.addedKeys).toBe(1);
      expect(comparison.removedKeys).toBe(0);
    });

    it("detects removed keys", () => {
      const older = createTestPayload();
      const newer = createTestPayload();
      newer.oneTimePreKeys = [];

      const comparison = compareBackups(older, newer);
      expect(comparison.removedKeys).toBe(2);
    });

    it("detects added sessions", () => {
      const older = createTestPayload();
      const newer = createTestPayload();
      newer.sessions.push(
        createSessionEntry(
          "new-peer",
          "new-device",
          new Uint8Array(100),
          new Uint8Array(32),
          { sending: 0, receiving: 0 },
          { created: Date.now(), lastActivity: Date.now() },
        ),
      );

      const comparison = compareBackups(older, newer);
      expect(comparison.addedSessions).toBe(1);
    });

    it("calculates message count difference", () => {
      const older = createTestPayload();
      older.messageCount = 100;
      const newer = createTestPayload();
      newer.messageCount = 150;

      const comparison = compareBackups(older, newer);
      expect(comparison.messageCountDiff).toBe(50);
    });
  });
});
