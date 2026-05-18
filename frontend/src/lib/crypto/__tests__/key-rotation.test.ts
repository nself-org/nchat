/**
 * Key Rotation System Tests
 *
 * Comprehensive tests for key rotation policies, scheduling, and execution.
 */

import {
  KeyRotationManager,
  RotationPolicy,
  RotationEvent,
  ScheduledRotation,
  PolicyPresets,
  calculateNextRotation,
  shouldRotateKey,
  canRotate,
  getRotationManager,
} from "../key-rotation";
import { KeyManager, KeyMetadata } from "../key-manager";

// ============================================================================
// Mock Setup
// ============================================================================

// Mock KeyManager
jest.mock("../key-manager", () => ({
  ...jest.requireActual("../key-manager"),
  KeyManager: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    getKeyMetadata: jest.fn().mockResolvedValue({
      id: "test-key",
      deviceId: "test-device",
      status: "active",
      createdAt: new Date(),
      rotatedAt: null,
      version: 1,
    }),
    rotateKeys: jest.fn().mockResolvedValue({
      publicKey: {} as CryptoKey,
      privateKey: {} as CryptoKey,
    }),
    getFingerprint: jest.fn().mockResolvedValue("ABCD 1234 EFGH 5678"),
  })),
  openKeyDatabase: jest.fn().mockResolvedValue({
    close: jest.fn(),
  }),
}));

// Mock localStorage
const localStorageData: Record<string, string> = {};
const mockLocalStorage = {
  getItem: jest.fn((key: string) => localStorageData[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    localStorageData[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete localStorageData[key];
  }),
  clear: jest.fn(() => {
    Object.keys(localStorageData).forEach(
      (key) => delete localStorageData[key],
    );
  }),
  get length() {
    return Object.keys(localStorageData).length;
  },
  key: jest.fn((index: number) => Object.keys(localStorageData)[index] || null),
};

Object.defineProperty(global, "localStorage", {
  value: mockLocalStorage,
  writable: true,
});

// Mock indexedDB
const mockIndexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
};
Object.defineProperty(global, "indexedDB", {
  value: mockIndexedDB,
  writable: true,
});

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(localStorageData).forEach((key) => delete localStorageData[key]);
  KeyRotationManager.resetInstance();
});

// ============================================================================
// Policy Tests
// ============================================================================

describe("Rotation Policies", () => {
  describe("PolicyPresets", () => {
    it("should have DEFAULT policy with 30-day rotation", () => {
      expect(PolicyPresets.DEFAULT.maxAgeDays).toBe(30);
      expect(PolicyPresets.DEFAULT.enabled).toBe(true);
    });

    it("should have HIGH_SECURITY policy with 7-day rotation", () => {
      expect(PolicyPresets.HIGH_SECURITY.maxAgeDays).toBe(7);
      expect(PolicyPresets.HIGH_SECURITY.requireApproval).toBe(true);
    });

    it("should have SIGNING_KEY policy with 90-day rotation", () => {
      expect(PolicyPresets.SIGNING_KEY.maxAgeDays).toBe(90);
      expect(PolicyPresets.SIGNING_KEY.keyType).toBe("signing");
    });

    it("should have PREKEY policy with 7-day rotation and usage limit", () => {
      expect(PolicyPresets.PREKEY.maxAgeDays).toBe(7);
      expect(PolicyPresets.PREKEY.maxUsageCount).toBe(100);
    });
  });

  describe("calculateNextRotation", () => {
    it("should calculate next rotation based on max age", () => {
      const createdAt = new Date("2025-01-01");
      const policy: RotationPolicy = {
        ...PolicyPresets.DEFAULT,
        maxAgeDays: 30,
      };

      const nextRotation = calculateNextRotation(createdAt, policy);

      expect(nextRotation.getTime()).toBe(new Date("2025-01-31").getTime());
    });

    it("should handle leap years correctly", () => {
      const createdAt = new Date("2024-02-01T00:00:00.000Z");
      const policy: RotationPolicy = {
        ...PolicyPresets.DEFAULT,
        maxAgeDays: 29,
      };

      const nextRotation = calculateNextRotation(createdAt, policy);

      // Use UTC methods to avoid timezone issues
      expect(nextRotation.getUTCDate()).toBe(1);
      expect(nextRotation.getUTCMonth()).toBe(2); // March
    });
  });

  describe("shouldRotateKey", () => {
    const createMetadata = (daysOld: number): KeyMetadata => ({
      id: "test-key",
      deviceId: "test-device",
      status: "active",
      createdAt: new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000),
      rotatedAt: null,
      version: 1,
    });

    it("should return false for new keys", () => {
      const metadata = createMetadata(1);
      const result = shouldRotateKey(metadata, PolicyPresets.DEFAULT, 0);

      expect(result.shouldRotate).toBe(false);
      expect(result.reason).toBeNull();
    });

    it("should return true for keys exceeding max age", () => {
      const metadata = createMetadata(31);
      const result = shouldRotateKey(metadata, PolicyPresets.DEFAULT, 0);

      expect(result.shouldRotate).toBe(true);
      expect(result.reason).toBe("scheduled");
    });

    it("should return true for keys exceeding usage count", () => {
      const metadata = createMetadata(1);
      const policy: RotationPolicy = {
        ...PolicyPresets.DEFAULT,
        maxUsageCount: 100,
      };

      const result = shouldRotateKey(metadata, policy, 101);

      expect(result.shouldRotate).toBe(true);
      expect(result.reason).toBe("usage_threshold");
    });

    it("should return false when policy is disabled", () => {
      const metadata = createMetadata(100);
      const policy: RotationPolicy = {
        ...PolicyPresets.DEFAULT,
        enabled: false,
      };

      const result = shouldRotateKey(metadata, policy, 0);

      expect(result.shouldRotate).toBe(false);
    });

    it("should ignore usage count when set to 0 (unlimited)", () => {
      const metadata = createMetadata(1);
      const result = shouldRotateKey(metadata, PolicyPresets.DEFAULT, 1000000);

      expect(result.shouldRotate).toBe(false);
    });
  });

  describe("canRotate", () => {
    const createPolicy = (minIntervalHours: number): RotationPolicy => ({
      ...PolicyPresets.DEFAULT,
      minRotationIntervalHours: minIntervalHours,
    });

    it("should return true when no previous rotation", () => {
      const result = canRotate(null, createPolicy(24));
      expect(result).toBe(true);
    });

    it("should return true when minimum interval has passed", () => {
      const lastRotation = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const result = canRotate(lastRotation, createPolicy(24));
      expect(result).toBe(true);
    });

    it("should return false when minimum interval not met", () => {
      const lastRotation = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12 hours ago
      const result = canRotate(lastRotation, createPolicy(24));
      expect(result).toBe(false);
    });

    it("should handle 1-hour minimum interval", () => {
      const lastRotation = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      const result = canRotate(lastRotation, createPolicy(1));
      expect(result).toBe(false);
    });
  });
});

// ============================================================================
// Manager Tests
// ============================================================================

describe("KeyRotationManager", () => {
  describe("getInstance", () => {
    it("should return singleton instance", () => {
      const instance1 = KeyRotationManager.getInstance();
      const instance2 = KeyRotationManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should accept custom configuration", () => {
      const instance = KeyRotationManager.getInstance({
        checkIntervalMs: 30000,
        autoStart: false,
      });

      expect(instance).toBeDefined();
    });
  });

  describe("initialize", () => {
    it("should initialize successfully", async () => {
      const manager = getRotationManager({ autoStart: false });
      await expect(manager.initialize()).resolves.toBeUndefined();
    });

    it("should not reinitialize if already initialized", async () => {
      const manager = getRotationManager({ autoStart: false });
      await manager.initialize();
      await manager.initialize(); // Second call should be no-op

      // No error means success
    });
  });

  describe("registerPolicy", () => {
    it("should register a new policy", () => {
      const manager = getRotationManager({ autoStart: false });
      const customPolicy: RotationPolicy = {
        ...PolicyPresets.DEFAULT,
        id: "custom",
        name: "Custom Policy",
        maxAgeDays: 14,
      };

      manager.registerPolicy(customPolicy);
      const retrieved = manager.getPolicy("custom");

      expect(retrieved).toBeDefined();
      expect(retrieved?.maxAgeDays).toBe(14);
    });

    it("should override existing policy with same ID", () => {
      const manager = getRotationManager({ autoStart: false });

      manager.registerPolicy({
        ...PolicyPresets.DEFAULT,
        id: "test",
        maxAgeDays: 10,
      });
      manager.registerPolicy({
        ...PolicyPresets.DEFAULT,
        id: "test",
        maxAgeDays: 20,
      });

      const policy = manager.getPolicy("test");
      expect(policy?.maxAgeDays).toBe(20);
    });
  });

  describe("updatePolicy", () => {
    it("should update existing policy", () => {
      const manager = getRotationManager({ autoStart: false });

      manager.updatePolicy("default", { maxAgeDays: 45 });
      const policy = manager.getPolicy("default");

      expect(policy?.maxAgeDays).toBe(45);
    });

    it("should throw error for non-existent policy", () => {
      const manager = getRotationManager({ autoStart: false });

      expect(() => {
        manager.updatePolicy("non-existent", { maxAgeDays: 10 });
      }).toThrow("Policy not found");
    });
  });

  describe("getAllPolicies", () => {
    it("should return all registered policies", () => {
      const manager = getRotationManager({ autoStart: false });
      const policies = manager.getAllPolicies();

      expect(policies.length).toBeGreaterThan(0);
      expect(policies.some((p) => p.id === "default")).toBe(true);
    });
  });

  describe("getPolicyForKeyType", () => {
    it("should return highest priority policy for key type", () => {
      const manager = getRotationManager({ autoStart: false });
      const policy = manager.getPolicyForKeyType("identity");

      expect(policy).toBeDefined();
    });

    it("should return undefined for unknown key type", () => {
      const manager = getRotationManager({ autoStart: false });
      const policy = manager.getPolicyForKeyType("unknown" as any);

      expect(policy).toBeUndefined();
    });
  });
});

// ============================================================================
// Scheduling Tests
// ============================================================================

describe("Rotation Scheduling", () => {
  describe("scheduleRotation", () => {
    it("should schedule a future rotation", () => {
      const manager = getRotationManager({ autoStart: false });
      const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const schedule = manager.scheduleRotation(
        "test-key",
        "default",
        scheduledAt,
      );

      expect(schedule.id).toMatch(/^sch_/);
      expect(schedule.keyId).toBe("test-key");
      expect(schedule.policyId).toBe("default");
    });

    it("should allow forced rotation scheduling", () => {
      const manager = getRotationManager({ autoStart: false });
      const scheduledAt = new Date(Date.now() + 1000);

      const schedule = manager.scheduleRotation(
        "test-key",
        "default",
        scheduledAt,
        true,
      );

      expect(schedule.isForced).toBe(true);
    });
  });

  describe("cancelScheduledRotation", () => {
    it("should cancel existing schedule", () => {
      const manager = getRotationManager({ autoStart: false });
      const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const schedule = manager.scheduleRotation(
        "test-key",
        "default",
        scheduledAt,
      );

      const result = manager.cancelScheduledRotation(schedule.id);

      expect(result).toBe(true);
    });

    it("should return false for non-existent schedule", () => {
      const manager = getRotationManager({ autoStart: false });

      const result = manager.cancelScheduledRotation("non-existent");

      expect(result).toBe(false);
    });
  });

  describe("getScheduledRotations", () => {
    it("should return all scheduled rotations", () => {
      const manager = getRotationManager({ autoStart: false });
      const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      manager.scheduleRotation("key-1", "default", scheduledAt);
      manager.scheduleRotation("key-2", "default", scheduledAt);

      const rotations = manager.getScheduledRotations();

      expect(rotations.length).toBe(2);
    });

    it("should filter by key ID", () => {
      const manager = getRotationManager({ autoStart: false });
      const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      manager.scheduleRotation("key-1", "default", scheduledAt);
      manager.scheduleRotation("key-2", "default", scheduledAt);

      const rotations = manager.getScheduledRotations("key-1");

      expect(rotations.length).toBe(1);
      expect(rotations[0].keyId).toBe("key-1");
    });
  });
});

// ============================================================================
// Rotation Execution Tests
// ============================================================================

describe("Rotation Execution", () => {
  describe("rotateKey", () => {
    it("should rotate key successfully", async () => {
      const manager = getRotationManager({ autoStart: false });
      await manager.initialize();

      const keyManager = new KeyManager();

      const result = await manager.rotateKey(keyManager, "manual");

      expect(result.success).toBe(true);
      expect(result.newKeyPair).toBeDefined();
      expect(result.event.status).toBe("completed");
    });

    it("should fail when no key metadata", async () => {
      const manager = getRotationManager({ autoStart: false });
      await manager.initialize();

      const mockKeyManager = {
        initialize: jest.fn(),
        getKeyMetadata: jest.fn().mockResolvedValue(null),
        rotateKeys: jest.fn(),
        getFingerprint: jest.fn(),
      } as unknown as KeyManager;

      const result = await manager.rotateKey(mockKeyManager, "manual");

      expect(result.success).toBe(false);
      expect(result.error).toBe("No key metadata found");
    });

    it("should record rotation trigger correctly", async () => {
      const manager = getRotationManager({ autoStart: false });
      await manager.initialize();

      const keyManager = new KeyManager();
      const result = await manager.rotateKey(keyManager, "compromise");

      expect(result.event.trigger).toBe("compromise");
    });
  });

  describe("forceRotation", () => {
    it("should bypass minimum interval check", async () => {
      const manager = getRotationManager({ autoStart: false });
      await manager.initialize();

      const keyManager = new KeyManager();

      // Force rotation should always work
      const result = await manager.forceRotation(
        keyManager,
        "Emergency rotation",
      );

      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// Usage Tracking Tests
// ============================================================================

describe("Usage Tracking", () => {
  describe("recordKeyUsage", () => {
    it("should record key usage", () => {
      const manager = getRotationManager({ autoStart: false });

      manager.recordKeyUsage("test-key", 5);

      expect(manager.getKeyUsageCount("test-key")).toBe(5);
    });

    it("should accumulate usage counts", () => {
      const manager = getRotationManager({ autoStart: false });

      manager.recordKeyUsage("test-key", 5);
      manager.recordKeyUsage("test-key", 3);

      expect(manager.getKeyUsageCount("test-key")).toBe(8);
    });

    it("should return 0 for unknown keys", () => {
      const manager = getRotationManager({ autoStart: false });

      expect(manager.getKeyUsageCount("unknown")).toBe(0);
    });
  });
});

// ============================================================================
// Event Listener Tests
// ============================================================================

describe("Event Listeners", () => {
  describe("onRotation", () => {
    it("should subscribe to rotation events", async () => {
      const manager = getRotationManager({ autoStart: false });
      await manager.initialize();

      const callback = jest.fn();
      manager.onRotation("completed", callback);

      const keyManager = new KeyManager();
      await manager.rotateKey(keyManager, "manual");

      expect(callback).toHaveBeenCalled();
    });

    it("should subscribe to all events", async () => {
      const manager = getRotationManager({ autoStart: false });
      await manager.initialize();

      const callback = jest.fn();
      manager.onRotation("all", callback);

      const keyManager = new KeyManager();
      await manager.rotateKey(keyManager, "manual");

      // Should be called for pending, in_progress, and completed
      expect(callback).toHaveBeenCalled();
    });

    it("should return unsubscribe function", async () => {
      const manager = getRotationManager({ autoStart: false });
      await manager.initialize();

      const callback = jest.fn();
      const unsubscribe = manager.onRotation("completed", callback);

      unsubscribe();

      const keyManager = new KeyManager();
      await manager.rotateKey(keyManager, "manual");

      expect(callback).not.toHaveBeenCalled();
    });
  });
});

// ============================================================================
// Key History Tests
// ============================================================================

describe("Key History", () => {
  describe("getKeyHistory", () => {
    it("should return empty array for new keys", () => {
      const manager = getRotationManager({ autoStart: false });

      const history = manager.getKeyHistory("test-key");

      expect(history).toEqual([]);
    });

    it("should maintain history after rotations", async () => {
      const manager = getRotationManager({ autoStart: false });
      await manager.initialize();

      const keyManager = new KeyManager();
      await manager.rotateKey(keyManager, "manual");

      const history = manager.getKeyHistory("test-key");

      expect(history.length).toBe(1);
    });
  });

  describe("isVersionValidForDecryption", () => {
    it("should return false for unknown key", () => {
      const manager = getRotationManager({ autoStart: false });

      const isValid = manager.isVersionValidForDecryption("unknown", 1);

      expect(isValid).toBe(false);
    });
  });
});

// ============================================================================
// Scheduler Tests
// ============================================================================

describe("Rotation Scheduler", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("start", () => {
    it("should start the scheduler", () => {
      const manager = getRotationManager({
        autoStart: false,
        checkIntervalMs: 1000,
      });

      manager.start();

      // Scheduler should be running
      jest.advanceTimersByTime(1000);

      manager.stop();
    });

    it("should not start multiple times", () => {
      const manager = getRotationManager({
        autoStart: false,
        checkIntervalMs: 1000,
      });

      manager.start();
      manager.start(); // Second call should be no-op

      manager.stop();
    });
  });

  describe("stop", () => {
    it("should stop the scheduler", () => {
      const manager = getRotationManager({
        autoStart: false,
        checkIntervalMs: 1000,
      });

      manager.start();
      manager.stop();

      // Should be able to stop cleanly
    });

    it("should handle stop when not started", () => {
      const manager = getRotationManager({ autoStart: false });

      // Should not throw
      manager.stop();
    });
  });
});

// ============================================================================
// Convenience Function Tests
// ============================================================================

describe("Convenience Functions", () => {
  describe("getRotationManager", () => {
    it("should return manager instance", () => {
      const manager = getRotationManager();
      expect(manager).toBeInstanceOf(KeyRotationManager);
    });
  });
});
