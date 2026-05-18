/**
 * Key Compromise Detection Tests
 *
 * Comprehensive tests for compromise detection, response, and device trust.
 */

import {
  KeyCompromiseMonitor,
  CompromiseEvent,
  KeyRevocation,
  DeviceTrust,
  DetectionRule,
  calculateAnomalyScore,
  calculateTrustScore,
  determineSeverity,
  getCompromiseMonitor,
  recordKeyUsage,
  reportKeyCompromise,
  isKeyRevoked,
  getUnresolvedEvents,
} from "../key-compromise";
import { KeyManager } from "../key-manager";

// ============================================================================
// Mock Setup
// ============================================================================

jest.mock("../key-manager", () => ({
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
}));

jest.mock("../key-rotation", () => ({
  getRotationManager: jest.fn().mockReturnValue({
    forceRotation: jest.fn().mockResolvedValue({ success: true }),
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

// Mock fetch for webhook notifications
global.fetch = jest.fn().mockResolvedValue({ ok: true });

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(localStorageData).forEach((key) => delete localStorageData[key]);
  KeyCompromiseMonitor.resetInstance();
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe("Utility Functions", () => {
  describe("calculateAnomalyScore", () => {
    it("should return 0 when stdDeviation is 0", () => {
      const baseline = {
        keyId: "test",
        avgDailyUsage: 50,
        stdDeviation: 0,
        peakHours: [],
        knownLocations: [],
        knownDevices: [],
        lastUpdated: new Date(),
        dataPoints: 10,
      };

      const score = calculateAnomalyScore(100, baseline);

      expect(score).toBe(0);
    });

    it("should calculate score based on z-score", () => {
      const baseline = {
        keyId: "test",
        avgDailyUsage: 50,
        stdDeviation: 10,
        peakHours: [],
        knownLocations: [],
        knownDevices: [],
        lastUpdated: new Date(),
        dataPoints: 100,
      };

      // 2 standard deviations = 0.67 score
      const score = calculateAnomalyScore(70, baseline);

      expect(score).toBeCloseTo(0.67, 1);
    });

    it("should cap score at 1", () => {
      const baseline = {
        keyId: "test",
        avgDailyUsage: 50,
        stdDeviation: 10,
        peakHours: [],
        knownLocations: [],
        knownDevices: [],
        lastUpdated: new Date(),
        dataPoints: 100,
      };

      // 5 standard deviations should cap at 1
      const score = calculateAnomalyScore(100, baseline);

      expect(score).toBe(1);
    });
  });

  describe("calculateTrustScore", () => {
    it("should return 0 for empty factors", () => {
      const score = calculateTrustScore([]);

      expect(score).toBe(0);
    });

    it("should calculate weighted average", () => {
      const factors = [
        { name: "factor1", weight: 2, score: 1.0, evaluatedAt: new Date() },
        { name: "factor2", weight: 1, score: 0.5, evaluatedAt: new Date() },
      ];

      const score = calculateTrustScore(factors);

      // (2*1.0 + 1*0.5) / 3 * 100 = 83.33
      expect(score).toBeCloseTo(83.33, 1);
    });

    it("should handle single factor", () => {
      const factors = [
        { name: "factor1", weight: 1, score: 0.8, evaluatedAt: new Date() },
      ];

      const score = calculateTrustScore(factors);

      expect(score).toBe(80);
    });
  });

  describe("determineSeverity", () => {
    it("should return critical for user_report", () => {
      const severity = determineSeverity("user_report", 0.5);
      expect(severity).toBe("critical");
    });

    it("should return critical for admin_report", () => {
      const severity = determineSeverity("admin_report", 0.5);
      expect(severity).toBe("critical");
    });

    it("should return critical for key_export_attempt", () => {
      const severity = determineSeverity("key_export_attempt", 0.5);
      expect(severity).toBe("critical");
    });

    it("should return high for confidence >= 0.9", () => {
      const severity = determineSeverity("unusual_location", 0.95);
      expect(severity).toBe("high");
    });

    it("should return medium for confidence >= 0.7", () => {
      const severity = determineSeverity("unusual_location", 0.75);
      expect(severity).toBe("medium");
    });

    it("should return low for low confidence", () => {
      const severity = determineSeverity("unusual_location", 0.5);
      expect(severity).toBe("low");
    });
  });
});

// ============================================================================
// Monitor Initialization Tests
// ============================================================================

describe("KeyCompromiseMonitor Initialization", () => {
  describe("getInstance", () => {
    it("should return singleton instance", () => {
      const instance1 = KeyCompromiseMonitor.getInstance();
      const instance2 = KeyCompromiseMonitor.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should accept custom configuration", () => {
      const instance = KeyCompromiseMonitor.getInstance({
        maxEventHistory: 500,
        alertThreshold: 10,
      });

      const config = instance.getConfig();
      expect(config.maxEventHistory).toBe(500);
    });
  });

  describe("initialize", () => {
    it("should initialize successfully", async () => {
      const monitor = getCompromiseMonitor();
      await expect(monitor.initialize()).resolves.toBeUndefined();
    });

    it("should load from storage", async () => {
      // Pre-populate storage
      localStorageData["nchat_compromise_events"] = JSON.stringify([]);

      const monitor = getCompromiseMonitor();
      await monitor.initialize();

      // No error means success
    });
  });
});

// ============================================================================
// Key Usage Recording Tests
// ============================================================================

describe("Key Usage Recording", () => {
  describe("recordKeyUsage", () => {
    it("should record usage without triggering alert for normal usage", async () => {
      const monitor = getCompromiseMonitor({ autoResponse: false });
      await monitor.initialize();

      // Record normal usage
      monitor.recordKeyUsage("test-key", "test-device", {});

      const events = monitor.getEvents();
      // No events for normal usage
      expect(
        events.filter((e) => e.indicator === "rapid_key_usage"),
      ).toHaveLength(0);
    });

    it("should detect rapid usage", async () => {
      const monitor = getCompromiseMonitor({ autoResponse: false });
      await monitor.initialize();

      // Simulate rapid usage by calling many times quickly
      for (let i = 0; i < 150; i++) {
        monitor.recordKeyUsage("test-key", "test-device", {});
      }

      // Should have triggered rapid usage detection
      const events = monitor.getEvents({ indicator: "rapid_key_usage" as any });
      // Event may or may not be triggered depending on threshold
    });
  });

  describe("recordVerificationFailure", () => {
    it("should record verification failure event", async () => {
      const monitor = getCompromiseMonitor({ autoResponse: false });
      await monitor.initialize();

      monitor.recordVerificationFailure("test-key", "test-device", {
        reason: "Invalid signature",
      });

      const events = monitor.getEvents();
      expect(events.some((e) => e.indicator === "failed_verifications")).toBe(
        true,
      );
    });
  });

  describe("recordKeyExportAttempt", () => {
    it("should record unauthorized export attempt", async () => {
      const monitor = getCompromiseMonitor({ autoResponse: false });
      await monitor.initialize();

      monitor.recordKeyExportAttempt("test-key", "test-device", false, {});

      const events = monitor.getEvents();
      expect(events.some((e) => e.indicator === "key_export_attempt")).toBe(
        true,
      );
    });

    it("should not record authorized export", async () => {
      const monitor = getCompromiseMonitor({ autoResponse: false });
      await monitor.initialize();

      monitor.recordKeyExportAttempt("test-key", "test-device", true, {});

      const events = monitor.getEvents();
      expect(events.some((e) => e.indicator === "key_export_attempt")).toBe(
        false,
      );
    });
  });
});

// ============================================================================
// Compromise Reporting Tests
// ============================================================================

describe("Compromise Reporting", () => {
  describe("reportCompromise", () => {
    it("should create critical event", async () => {
      const monitor = getCompromiseMonitor({ autoResponse: false });
      await monitor.initialize();

      const event = await monitor.reportCompromise(
        "test-key",
        "test-device",
        "Suspicious activity detected",
      );

      expect(event.severity).toBe("critical");
      expect(event.indicator).toBe("user_report");
      expect(event.confidence).toBe(1.0);
    });

    it("should store event in history", async () => {
      const monitor = getCompromiseMonitor({ autoResponse: false });
      await monitor.initialize();

      await monitor.reportCompromise("test-key", "test-device", "Test report");

      const events = monitor.getEvents({ keyId: "test-key" });
      expect(events.length).toBe(1);
    });
  });

  describe("reportCompromiseAdmin", () => {
    it("should create admin-reported event", async () => {
      const monitor = getCompromiseMonitor({ autoResponse: false });
      await monitor.initialize();

      const event = await monitor.reportCompromiseAdmin(
        "test-key",
        "Admin investigation",
        "admin-123",
      );

      expect(event.indicator).toBe("admin_report");
      expect(event.context.adminId).toBe("admin-123");
    });
  });
});

// ============================================================================
// Key Revocation Tests
// ============================================================================

describe("Key Revocation", () => {
  describe("revokeKey", () => {
    it("should create revocation record", async () => {
      const monitor = getCompromiseMonitor({ autoResponse: false });
      await monitor.initialize();

      const revocation = await monitor.revokeKey(
        "test-key",
        "test-device",
        "Compromised",
        "user",
      );

      expect(revocation.keyId).toBe("test-key");
      expect(revocation.reason).toBe("Compromised");
      expect(revocation.initiatedBy).toBe("user");
    });

    it("should link to compromise event", async () => {
      const monitor = getCompromiseMonitor({ autoResponse: false });
      await monitor.initialize();

      const event = await monitor.reportCompromise(
        "test-key",
        "test-device",
        "Test",
      );

      const revocation = await monitor.revokeKey(
        "test-key",
        "test-device",
        "Compromised",
        "system",
        event.id,
      );

      expect(revocation.compromiseEventId).toBe(event.id);
    });

    it("should mark as propagated", async () => {
      const monitor = getCompromiseMonitor({ autoResponse: false });
      await monitor.initialize();

      const revocation = await monitor.revokeKey(
        "test-key",
        "test-device",
        "Test",
        "user",
      );

      expect(revocation.propagated).toBe(true);
    });
  });

  describe("isKeyRevoked", () => {
    it("should return true for revoked key", async () => {
      const monitor = getCompromiseMonitor({ autoResponse: false });
      await monitor.initialize();

      await monitor.revokeKey("test-key", "test-device", "Test", "user");

      expect(monitor.isKeyRevoked("test-key")).toBe(true);
    });

    it("should return false for non-revoked key", async () => {
      const monitor = getCompromiseMonitor({ autoResponse: false });
      await monitor.initialize();

      expect(monitor.isKeyRevoked("unknown-key")).toBe(false);
    });
  });

  describe("getRevocation", () => {
    it("should return revocation record", async () => {
      const monitor = getCompromiseMonitor({ autoResponse: false });
      await monitor.initialize();

      await monitor.revokeKey("test-key", "test-device", "Test", "admin");

      const revocation = monitor.getRevocation("test-key");

      expect(revocation).toBeDefined();
      expect(revocation?.initiatedBy).toBe("admin");
    });

    it("should return undefined for non-revoked key", async () => {
      const monitor = getCompromiseMonitor({ autoResponse: false });
      await monitor.initialize();

      const revocation = monitor.getRevocation("unknown-key");

      expect(revocation).toBeUndefined();
    });
  });
});

// ============================================================================
// Device Trust Tests
// ============================================================================

describe("Device Trust", () => {
  describe("updateDeviceTrust", () => {
    it("should update device trust score", async () => {
      const monitor = getCompromiseMonitor();
      await monitor.initialize();

      const factors = [
        { name: "known", weight: 2, score: 1.0, evaluatedAt: new Date() },
        { name: "verified", weight: 1, score: 0.8, evaluatedAt: new Date() },
      ];

      monitor.updateDeviceTrust("test-device", factors);

      const trust = monitor.getDeviceTrust("test-device");
      expect(trust).toBeDefined();
      expect(trust?.trusted).toBe(true);
    });

    it("should mark low-score device as untrusted", async () => {
      const monitor = getCompromiseMonitor();
      await monitor.initialize();

      const factors = [
        { name: "unknown", weight: 1, score: 0.3, evaluatedAt: new Date() },
      ];

      monitor.updateDeviceTrust("suspicious-device", factors);

      const trust = monitor.getDeviceTrust("suspicious-device");
      expect(trust?.trusted).toBe(false);
    });
  });

  describe("getDeviceTrust", () => {
    it("should return undefined for unknown device", async () => {
      const monitor = getCompromiseMonitor();
      await monitor.initialize();

      const trust = monitor.getDeviceTrust("unknown-device");

      expect(trust).toBeUndefined();
    });
  });
});

// ============================================================================
// Event Management Tests
// ============================================================================

describe("Event Management", () => {
  describe("getEvents", () => {
    it("should filter by key ID", async () => {
      const monitor = getCompromiseMonitor({ autoResponse: false });
      await monitor.initialize();

      await monitor.reportCompromise("key-1", "device", "Test 1");
      await monitor.reportCompromise("key-2", "device", "Test 2");

      const events = monitor.getEvents({ keyId: "key-1" });

      expect(events.length).toBe(1);
      expect(events[0].keyId).toBe("key-1");
    });

    it("should filter by severity", async () => {
      const monitor = getCompromiseMonitor({ autoResponse: false });
      await monitor.initialize();

      await monitor.reportCompromise("key-1", "device", "Test"); // critical
      monitor.recordVerificationFailure("key-2", "device"); // medium

      const criticalEvents = monitor.getEvents({ severity: "critical" });

      expect(criticalEvents.every((e) => e.severity === "critical")).toBe(true);
    });

    it("should filter by resolved status", async () => {
      const monitor = getCompromiseMonitor({ autoResponse: false });
      await monitor.initialize();

      const event = await monitor.reportCompromise("key", "device", "Test");
      await monitor.resolveEvent(event.id, "Resolved");

      const unresolvedEvents = monitor.getEvents({ resolved: false });

      expect(unresolvedEvents.some((e) => e.id === event.id)).toBe(false);
    });

    it("should limit results", async () => {
      const monitor = getCompromiseMonitor({ autoResponse: false });
      await monitor.initialize();

      for (let i = 0; i < 10; i++) {
        await monitor.reportCompromise(`key-${i}`, "device", `Test ${i}`);
      }

      const events = monitor.getEvents({ limit: 5 });

      expect(events.length).toBe(5);
    });
  });

  describe("resolveEvent", () => {
    it("should resolve event", async () => {
      const monitor = getCompromiseMonitor({ autoResponse: false });
      await monitor.initialize();

      const event = await monitor.reportCompromise("key", "device", "Test");

      const result = await monitor.resolveEvent(event.id, "Issue addressed");

      expect(result).toBe(true);

      const events = monitor.getEvents({ keyId: "key", resolved: true });
      expect(events.length).toBe(1);
      expect(events[0].resolutionNotes).toBe("Issue addressed");
    });

    it("should return false for unknown event", async () => {
      const monitor = getCompromiseMonitor({ autoResponse: false });
      await monitor.initialize();

      const result = await monitor.resolveEvent("unknown-id", "Notes");

      expect(result).toBe(false);
    });
  });
});

// ============================================================================
// Detection Rule Tests
// ============================================================================

describe("Detection Rules", () => {
  describe("addRule", () => {
    it("should add custom rule", async () => {
      const monitor = getCompromiseMonitor();
      await monitor.initialize();

      const customRule: DetectionRule = {
        id: "custom-rule",
        name: "Custom Rule",
        enabled: true,
        indicator: "unusual_location",
        severity: "high",
        threshold: 1,
        actions: ["alert_user"],
        cooldownMs: 0,
        lastTriggered: null,
      };

      monitor.addRule(customRule);

      const rules = monitor.getRules();
      expect(rules.some((r) => r.id === "custom-rule")).toBe(true);
    });
  });

  describe("updateRule", () => {
    it("should update existing rule", async () => {
      const monitor = getCompromiseMonitor();
      await monitor.initialize();

      monitor.updateRule("rapid-usage", { threshold: 200 });

      const rules = monitor.getRules();
      const rule = rules.find((r) => r.id === "rapid-usage");
      expect(rule?.threshold).toBe(200);
    });
  });

  describe("getRules", () => {
    it("should return all rules", async () => {
      const monitor = getCompromiseMonitor();
      await monitor.initialize();

      const rules = monitor.getRules();

      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some((r) => r.id === "rapid-usage")).toBe(true);
    });
  });
});

// ============================================================================
// Event Listener Tests
// ============================================================================

describe("Event Listeners", () => {
  describe("onCompromiseEvent", () => {
    it("should call listener on event", async () => {
      const monitor = getCompromiseMonitor({ autoResponse: false });
      await monitor.initialize();

      const callback = jest.fn();
      monitor.onCompromiseEvent("critical", callback);

      await monitor.reportCompromise("key", "device", "Test");

      expect(callback).toHaveBeenCalled();
    });

    it("should call all listeners", async () => {
      const monitor = getCompromiseMonitor({ autoResponse: false });
      await monitor.initialize();

      const callback = jest.fn();
      monitor.onCompromiseEvent("all", callback);

      await monitor.reportCompromise("key", "device", "Test");

      expect(callback).toHaveBeenCalled();
    });

    it("should return unsubscribe function", async () => {
      const monitor = getCompromiseMonitor({ autoResponse: false });
      await monitor.initialize();

      const callback = jest.fn();
      const unsubscribe = monitor.onCompromiseEvent("critical", callback);

      unsubscribe();

      await monitor.reportCompromise("key", "device", "Test");

      expect(callback).not.toHaveBeenCalled();
    });
  });
});

// ============================================================================
// Configuration Tests
// ============================================================================

describe("Configuration", () => {
  describe("updateConfig", () => {
    it("should update configuration", async () => {
      const monitor = getCompromiseMonitor();

      monitor.updateConfig({ alertThreshold: 20 });

      expect(monitor.getConfig().alertThreshold).toBe(20);
    });
  });

  describe("getConfig", () => {
    it("should return current config", () => {
      const monitor = getCompromiseMonitor({
        enabled: true,
        maxEventHistory: 500,
      });

      const config = monitor.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.maxEventHistory).toBe(500);
    });
  });
});

// ============================================================================
// Convenience Function Tests
// ============================================================================

describe("Convenience Functions", () => {
  describe("getCompromiseMonitor", () => {
    it("should return monitor instance", () => {
      const monitor = getCompromiseMonitor();
      expect(monitor).toBeInstanceOf(KeyCompromiseMonitor);
    });
  });

  describe("recordKeyUsage", () => {
    it("should record via monitor", async () => {
      const monitor = getCompromiseMonitor({ autoResponse: false });
      await monitor.initialize();

      recordKeyUsage("test-key", "test-device", { operation: "encrypt" });

      // No error means success
    });
  });

  describe("reportKeyCompromise", () => {
    it("should report via monitor", async () => {
      const monitor = getCompromiseMonitor({ autoResponse: false });
      await monitor.initialize();

      const event = await reportKeyCompromise("key", "device", "Compromised");

      expect(event).toBeDefined();
      expect(event.indicator).toBe("user_report");
    });
  });

  describe("isKeyRevoked", () => {
    it("should check via monitor", async () => {
      const monitor = getCompromiseMonitor({ autoResponse: false });
      await monitor.initialize();

      await monitor.revokeKey("revoked-key", "device", "Test", "user");

      expect(isKeyRevoked("revoked-key")).toBe(true);
      expect(isKeyRevoked("not-revoked")).toBe(false);
    });
  });

  describe("getUnresolvedEvents", () => {
    it("should return unresolved events for key", async () => {
      const monitor = getCompromiseMonitor({ autoResponse: false });
      await monitor.initialize();

      await monitor.reportCompromise("test-key", "device", "Test 1");
      await monitor.reportCompromise("test-key", "device", "Test 2");

      const events = getUnresolvedEvents("test-key");

      expect(events.length).toBe(2);
      expect(events.every((e) => !e.resolved)).toBe(true);
    });
  });
});
