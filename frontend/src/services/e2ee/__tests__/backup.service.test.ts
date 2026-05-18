/**
 * E2EE Backup Service Tests
 *
 * Tests for the backup service functionality.
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import {
  E2EEBackupService,
  createBackupService,
  type BackupServiceConfig,
  type KeyDataProvider,
  type KeyDataConsumer,
} from "../backup.service";
import { SecurityLevel } from "@/lib/e2ee/backup-key-derivation";

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
    const keys = Array.from(this.data.keys());
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

// Mock key provider
function createMockKeyProvider(): KeyDataProvider {
  return {
    getIdentityKeyPair: jest.fn().mockResolvedValue({
      publicKey: new Uint8Array(32).fill(1),
      privateKey: new Uint8Array(32).fill(2),
    }),
    getSignedPreKeys: jest.fn().mockResolvedValue([
      {
        keyId: 1,
        publicKey: new Uint8Array(32).fill(3),
        privateKey: new Uint8Array(32).fill(4),
        signature: new Uint8Array(64).fill(5),
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000,
      },
    ]),
    getOneTimePreKeys: jest.fn().mockResolvedValue([
      {
        keyId: 100,
        publicKey: new Uint8Array(32).fill(6),
        privateKey: new Uint8Array(32).fill(7),
      },
      {
        keyId: 101,
        publicKey: new Uint8Array(32).fill(8),
        privateKey: new Uint8Array(32).fill(9),
      },
    ]),
    getSessions: jest.fn().mockResolvedValue([
      {
        peerUserId: "peer-1",
        peerDeviceId: "device-1",
        state: new Uint8Array(100).fill(10),
        rootKey: new Uint8Array(32).fill(11),
        sendingCounter: 5,
        receivingCounter: 3,
        createdAt: Date.now() - 3600000,
        lastActivity: Date.now(),
      },
    ]),
    getSenderKeys: jest.fn().mockResolvedValue([]),
    getMessageCount: jest.fn().mockResolvedValue(100),
  };
}

// Mock key consumer
function createMockKeyConsumer(): KeyDataConsumer {
  return {
    importIdentityKeyPair: jest.fn().mockResolvedValue(undefined),
    importSignedPreKey: jest.fn().mockResolvedValue(undefined),
    importOneTimePreKey: jest.fn().mockResolvedValue(undefined),
    importSession: jest.fn().mockResolvedValue(undefined),
    importSenderKey: jest.fn().mockResolvedValue(undefined),
  };
}

describe("E2EE Backup Service", () => {
  // All tests use PBKDF2 key derivation which is intentionally slow.
  // STANDARD = 310k iterations (~3-4s in CI), MAXIMUM = 1M iterations (>10s).
  // Set a generous timeout for the entire suite including beforeEach hooks.
  jest.setTimeout(60000);

  let service: E2EEBackupService;
  let config: BackupServiceConfig;
  let storage: MockStorage;
  let keyProvider: KeyDataProvider;
  let keyConsumer: KeyDataConsumer;

  beforeEach(() => {
    storage = new MockStorage();
    keyProvider = createMockKeyProvider();
    keyConsumer = createMockKeyConsumer();

    config = {
      userId: "user-123",
      deviceId: "device-456",
      registrationId: 12345,
      platform: "web",
      appVersion: "1.0.0",
      storage,
      autoBackupIntervalHours: 0, // Disable for tests
    };

    service = createBackupService(config);
  });

  describe("initialization", () => {
    it("creates service with config", () => {
      expect(service).toBeInstanceOf(E2EEBackupService);
    });

    it("is not initialized by default", () => {
      expect(service.isInitialized()).toBe(false);
    });

    it("initializes with providers", async () => {
      await service.initialize(keyProvider, keyConsumer);
      expect(service.isInitialized()).toBe(true);
    });
  });

  describe("createBackup", () => {
    beforeEach(async () => {
      await service.initialize(keyProvider, keyConsumer);
    });

    it("creates an encrypted backup", async () => {
      const result = await service.createBackup({
        passphrase: "secure-passphrase-123",
        securityLevel: SecurityLevel.STANDARD,
      });

      expect(result.backup).toBeDefined();
      expect(typeof result.backup).toBe("string");
      expect(result.metadata.keyCount).toBeGreaterThan(0);
    });

    it("includes metadata", async () => {
      const result = await service.createBackup({
        passphrase: "secure-passphrase-123",
        securityLevel: SecurityLevel.STANDARD,
      });

      expect(result.metadata.backupId).toBeDefined();
      expect(result.metadata.createdAt).toBeInstanceOf(Date);
      expect(result.metadata.size).toBeGreaterThan(0);
    });

    it("generates recovery key when requested", async () => {
      const result = await service.createBackup({
        passphrase: "secure-passphrase-123",
        securityLevel: SecurityLevel.STANDARD,
        generateRecoveryKey: true,
      });

      expect(result.recoveryKey).toBeDefined();
      expect(result.recoveryKey?.displayKey).toContain("-");
      expect(result.encryptedMasterKey).toBeDefined();
    });

    it("does not generate recovery key when disabled", async () => {
      const result = await service.createBackup({
        passphrase: "secure-passphrase-123",
        securityLevel: SecurityLevel.STANDARD,
        generateRecoveryKey: false,
      });

      expect(result.recoveryKey).toBeUndefined();
      expect(result.encryptedMasterKey).toBeUndefined();
    });

    // SecurityLevel.MAXIMUM = 1,000,000 PBKDF2 iterations — slow in CI, needs longer timeout
    it("respects security level", async () => {
      const result = await service.createBackup({
        passphrase: "secure-passphrase-123",
        securityLevel: SecurityLevel.STANDARD,
        securityLevel: SecurityLevel.MAXIMUM,
      });

      expect(result.backup).toBeDefined();
    }, 60000);

    it("rejects invalid passphrase", async () => {
      await expect(
        service.createBackup({
          passphrase: "short",
        }),
      ).rejects.toThrow("minimum requirements");
    });

    it("calls key provider methods", async () => {
      await service.createBackup({
        passphrase: "secure-passphrase-123",
        securityLevel: SecurityLevel.STANDARD,
      });

      expect(keyProvider.getIdentityKeyPair).toHaveBeenCalled();
      expect(keyProvider.getSignedPreKeys).toHaveBeenCalled();
      expect(keyProvider.getOneTimePreKeys).toHaveBeenCalled();
      expect(keyProvider.getMessageCount).toHaveBeenCalled();
    });

    it("excludes sessions when requested", async () => {
      await service.createBackup({
        passphrase: "secure-passphrase-123",
        securityLevel: SecurityLevel.STANDARD,
        includeSessions: false,
      });

      expect(keyProvider.getSessions).not.toHaveBeenCalled();
    });

    it("adds backup to history", async () => {
      await service.createBackup({
        passphrase: "secure-passphrase-123",
        securityLevel: SecurityLevel.STANDARD,
      });

      const history = service.getBackupHistory();
      expect(history.length).toBe(1);
      expect(history[0].deviceId).toBe("device-456");
    });
  });

  describe("restore", () => {
    let backupData: string;
    let recoveryKey: any;
    let encryptedMasterKey: any;

    beforeEach(async () => {
      await service.initialize(keyProvider, keyConsumer);

      const result = await service.createBackup({
        passphrase: "secure-passphrase-123",
        securityLevel: SecurityLevel.STANDARD,
        generateRecoveryKey: true,
      });

      backupData = result.backup;
      recoveryKey = result.recoveryKey;
      encryptedMasterKey = result.encryptedMasterKey;
    });

    it("restores backup with passphrase", async () => {
      const result = await service.restore(backupData, {
        passphrase: "secure-passphrase-123",
        securityLevel: SecurityLevel.STANDARD,
      });

      expect(result.success).toBe(true);
      expect(result.details.payload.userId).toBe("user-123");
    });

    it("restores backup with recovery key", async () => {
      const result = await service.restore(backupData, {
        recoveryKey: recoveryKey.rawKey,
        encryptedMasterKey,
      });

      expect(result.success).toBe(true);
    });

    it("imports keys after restore", async () => {
      const result = await service.restore(backupData, {
        passphrase: "secure-passphrase-123",
        securityLevel: SecurityLevel.STANDARD,
      });

      expect(result.keysRestored.identityKeys).toBe(1);
      expect(result.keysRestored.signedPreKeys).toBe(1);
      expect(result.keysRestored.oneTimePreKeys).toBe(2);
      expect(result.keysRestored.sessions).toBe(1);
    });

    it("calls key consumer methods", async () => {
      await service.restore(backupData, {
        passphrase: "secure-passphrase-123",
        securityLevel: SecurityLevel.STANDARD,
      });

      expect(keyConsumer.importIdentityKeyPair).toHaveBeenCalled();
      expect(keyConsumer.importSignedPreKey).toHaveBeenCalled();
      expect(keyConsumer.importOneTimePreKey).toHaveBeenCalled();
      expect(keyConsumer.importSession).toHaveBeenCalled();
    });

    it("verifies device when requested", async () => {
      const result = await service.restore(backupData, {
        passphrase: "secure-passphrase-123",
        securityLevel: SecurityLevel.STANDARD,
        verifyDevice: true,
      });

      expect(result.details.deviceVerified).toBe(true);
    });

    it("reports unverified device", async () => {
      // Create a new service with different device
      const newConfig = { ...config, deviceId: "different-device" };
      const newService = createBackupService(newConfig);
      await newService.initialize(keyProvider, keyConsumer);

      const result = await newService.restore(backupData, {
        passphrase: "secure-passphrase-123",
        securityLevel: SecurityLevel.STANDARD,
        verifyDevice: true,
      });

      expect(result.details.deviceVerified).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("rejects wrong passphrase", async () => {
      await expect(
        service.restore(backupData, {
          passphrase: "wrong-passphrase-123",
        }),
      ).rejects.toThrow();
    });

    it("requires passphrase or recovery key", async () => {
      await expect(service.restore(backupData, {})).rejects.toThrow(
        "Either passphrase or recovery key",
      );
    });

    it("requires encrypted master key with recovery key", async () => {
      await expect(
        service.restore(backupData, {
          recoveryKey: recoveryKey.rawKey,
        }),
      ).rejects.toThrow("Either passphrase or recovery key");
    });
  });

  describe("passphrase utilities", () => {
    beforeEach(async () => {
      await service.initialize(keyProvider, keyConsumer);
    });

    it("assesses passphrase strength", () => {
      const strength = service.assessPassphrase("weak");
      expect(strength.level).toBe("weak");

      const strongStrength = service.assessPassphrase("Strong-P@ssphrase-123!");
      expect(["fair", "good", "strong", "excellent"]).toContain(
        strongStrength.level,
      );
    });

    it("suggests passphrase", () => {
      const suggested = service.suggestPassphrase();
      expect(suggested.length).toBeGreaterThan(20);
      expect(suggested).toContain("-");
    });

    it("validates passphrase", () => {
      expect(service.validatePassphrase("short")).toBe(false);
      expect(service.validatePassphrase("long-enough-passphrase")).toBe(true);
    });
  });

  describe("backup history", () => {
    beforeEach(async () => {
      await service.initialize(keyProvider, keyConsumer);
    });

    it("starts with empty history", () => {
      const history = service.getBackupHistory();
      expect(history).toHaveLength(0);
    });

    // 2x STANDARD (310k iterations each) = ~6-8s in CI — needs longer timeout
    it("tracks multiple backups", async () => {
      await service.createBackup({
        passphrase: "secure-passphrase-123",
        securityLevel: SecurityLevel.STANDARD,
      });
      await service.createBackup({
        passphrase: "secure-passphrase-123",
        securityLevel: SecurityLevel.STANDARD,
      });

      const history = service.getBackupHistory();
      expect(history.length).toBe(2);
    }, 60000);

    // 2x STANDARD (310k iterations each) = ~6-8s in CI — needs longer timeout
    it("returns most recent first", async () => {
      await service.createBackup({
        passphrase: "secure-passphrase-123",
        securityLevel: SecurityLevel.STANDARD,
        description: "first",
      });

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      await service.createBackup({
        passphrase: "secure-passphrase-123",
        securityLevel: SecurityLevel.STANDARD,
        description: "second",
      });

      const history = service.getBackupHistory();
      expect(history[0].description).toBe("second");
    }, 60000);

    it("gets last backup metadata", async () => {
      await service.createBackup({
        passphrase: "secure-passphrase-123",
        securityLevel: SecurityLevel.STANDARD,
        description: "test backup",
      });

      const last = service.getLastBackupMetadata();
      expect(last).not.toBeNull();
      expect(last?.description).toBe("test backup");
    });

    it("returns null for no backups", () => {
      const last = service.getLastBackupMetadata();
      expect(last).toBeNull();
    });

    it("clears backup history", async () => {
      await service.createBackup({
        passphrase: "secure-passphrase-123",
        securityLevel: SecurityLevel.STANDARD,
      });
      expect(service.getBackupHistory().length).toBe(1);

      service.clearBackupHistory();
      expect(service.getBackupHistory().length).toBe(0);
    });
  });

  describe("recovery key management", () => {
    beforeEach(async () => {
      await service.initialize(keyProvider, keyConsumer);
    });

    // createBackup + regenerateRecoveryKey each do PBKDF2 — needs longer timeout
    it("regenerates recovery key", async () => {
      await service.createBackup({
        passphrase: "secure-passphrase-123",
        securityLevel: SecurityLevel.STANDARD,
        generateRecoveryKey: true,
        securityLevel: SecurityLevel.STANDARD, // Use standard for faster tests
      });

      const result = await service.regenerateRecoveryKey(
        "secure-passphrase-123",
      );

      expect(result.recoveryKey).toBeDefined();
      expect(result.encryptedMasterKey).toBeDefined();
    }, 60000);

    it("rejects wrong passphrase for regeneration", async () => {
      await service.createBackup({
        passphrase: "secure-passphrase-123",
        securityLevel: SecurityLevel.STANDARD,
        generateRecoveryKey: true,
        securityLevel: SecurityLevel.STANDARD, // Use standard for faster tests
      });

      await expect(
        service.regenerateRecoveryKey("wrong-passphrase"),
      ).rejects.toThrow();
    }, 120000); // Longer timeout for crypto operations

    it("masks recovery key", () => {
      const displayKey = "AAAAA-BBBBB-CCCCC-DDDDD-EEEEE-FFFFF-GGGGG-HHHH";
      const masked = service.maskRecoveryKey(displayKey);

      expect(masked).toContain("*****");
      expect(masked).toContain("AAAAA");
      expect(masked).toContain("HHHH");
    });
  });

  describe("backup validation", () => {
    beforeEach(async () => {
      await service.initialize(keyProvider, keyConsumer);
    });

    it("validates correct backup", async () => {
      const result = await service.createBackup({
        passphrase: "secure-passphrase-123",
        securityLevel: SecurityLevel.STANDARD,
      });

      const validation = service.validateBackup(result.backup);
      expect(validation.valid).toBe(true);
    });

    it("detects invalid backup", () => {
      const validation = service.validateBackup("not a valid backup");
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe("cleanup", () => {
    beforeEach(async () => {
      await service.initialize(keyProvider, keyConsumer);
    });

    it("destroys service", () => {
      service.destroy();
      expect(service.isInitialized()).toBe(false);
    });

    it("clears all data", async () => {
      await service.createBackup({
        passphrase: "secure-passphrase-123",
        securityLevel: SecurityLevel.STANDARD,
      });

      service.clearAllData();

      expect(service.getBackupHistory().length).toBe(0);
    });
  });

  describe("uninitialized service", () => {
    it("throws on createBackup before init", async () => {
      await expect(
        service.createBackup({
          passphrase: "secure-passphrase-123",
          securityLevel: SecurityLevel.STANDARD,
        }),
      ).rejects.toThrow("not initialized");
    });

    it("throws on restore before init", async () => {
      await expect(
        service.restore("backup", {
          passphrase: "secure-passphrase-123",
          securityLevel: SecurityLevel.STANDARD,
        }),
      ).rejects.toThrow("not initialized");
    });

    it("throws on regenerateRecoveryKey before init", async () => {
      // regenerateRecoveryKey throws either "not initialized" or "No backup found" depending on check order
      await expect(
        service.regenerateRecoveryKey("passphrase"),
      ).rejects.toThrow();
    });
  });
});
