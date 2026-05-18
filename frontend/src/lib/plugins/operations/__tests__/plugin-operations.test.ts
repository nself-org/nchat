/**
 * Plugin Operations - Operational Hardening Tests
 *
 * Comprehensive test suite covering:
 * - Health checking and monitoring
 * - Version compatibility validation
 * - Rollback management with snapshots
 * - Circuit breaker pattern
 * - Graceful degradation with fallbacks
 * - Operations service integration
 *
 * 150+ tests covering all operational hardening scenarios.
 */

import { PluginHealthChecker, HealthCheckError } from "../health-checker";
import type { HealthCheckEvent, HealthCheckFn } from "../health-checker";
import {
  VersionCompatibilityChecker,
  VersionCompatibilityError,
  parseSemVer,
  compareSemVer,
  compareVersionStrings,
  isVersionInRange,
  isSameMajor,
  isCompatible,
} from "../version-compatibility";
import {
  RollbackManager,
  RollbackError,
  resetRollbackIdCounter,
} from "../rollback-manager";
import type { RollbackEvent } from "../rollback-manager";
import { CircuitBreakerManager, CircuitBreakerError } from "../circuit-breaker";
import type { CircuitBreakerNotification } from "../circuit-breaker";
import {
  GracefulDegradationManager,
  DegradationError,
} from "../graceful-degradation";
import type { DegradationEvent } from "../graceful-degradation";
import {
  PluginOperationsService,
  createPluginOperationsService,
} from "@/services/plugins/operations.service";
import type {
  PluginHealthCheckResult,
  HealthCheckConfig,
  FallbackConfig,
} from "../types";
import {
  DEFAULT_HEALTH_CHECK_CONFIG,
  DEFAULT_VERSION_COMPATIBILITY_CONFIG,
  DEFAULT_ROLLBACK_CONFIG,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  DEFAULT_GRACEFUL_DEGRADATION_CONFIG,
  DEFAULT_PLUGIN_OPERATIONS_CONFIG,
} from "../types";

// ============================================================================
// HELPERS
// ============================================================================

function createHealthyCheck(): HealthCheckFn {
  return async () => ({ healthy: true, message: "OK" });
}

function createUnhealthyCheck(msg: string = "Unhealthy"): HealthCheckFn {
  return async () => ({ healthy: false, message: msg });
}

function createSlowCheck(delayMs: number): HealthCheckFn {
  return () =>
    new Promise((resolve) => {
      setTimeout(
        () => resolve({ healthy: true, message: "Slow but OK" }),
        delayMs,
      );
    });
}

function createThrowingCheck(msg: string = "Check failed"): HealthCheckFn {
  return async () => {
    throw new Error(msg);
  };
}

// ============================================================================
// HEALTH CHECKER TESTS
// ============================================================================

describe("PluginHealthChecker", () => {
  let checker: PluginHealthChecker;

  beforeEach(() => {
    checker = new PluginHealthChecker();
  });

  afterEach(() => {
    checker.clear();
  });

  describe("registration", () => {
    it("should register a plugin for health checking", () => {
      checker.registerPlugin("test-plugin", createHealthyCheck());
      expect(checker.isRegistered("test-plugin")).toBe(true);
    });

    it("should throw if registering a duplicate plugin", () => {
      checker.registerPlugin("test-plugin", createHealthyCheck());
      expect(() => {
        checker.registerPlugin("test-plugin", createHealthyCheck());
      }).toThrow(HealthCheckError);
    });

    it("should unregister a plugin", () => {
      checker.registerPlugin("test-plugin", createHealthyCheck());
      expect(checker.unregisterPlugin("test-plugin")).toBe(true);
      expect(checker.isRegistered("test-plugin")).toBe(false);
    });

    it("should return false when unregistering non-existent plugin", () => {
      expect(checker.unregisterPlugin("nonexistent")).toBe(false);
    });

    it("should list all registered plugins", () => {
      checker.registerPlugin("plugin-a", createHealthyCheck());
      checker.registerPlugin("plugin-b", createHealthyCheck());
      const plugins = checker.getRegisteredPlugins();
      expect(plugins).toContain("plugin-a");
      expect(plugins).toContain("plugin-b");
      expect(plugins).toHaveLength(2);
    });
  });

  describe("health checking", () => {
    it("should check a healthy plugin", async () => {
      checker.registerPlugin("test-plugin", createHealthyCheck());
      const result = await checker.checkPlugin("test-plugin");
      expect(result.pluginId).toBe("test-plugin");
      expect(result.totalChecks).toBe(1);
      expect(result.consecutiveSuccesses).toBe(1);
      expect(result.consecutiveFailures).toBe(0);
    });

    it("should check an unhealthy plugin", async () => {
      checker.registerPlugin("test-plugin", createUnhealthyCheck("Down"));
      const result = await checker.checkPlugin("test-plugin");
      expect(result.pluginId).toBe("test-plugin");
      expect(result.consecutiveFailures).toBe(1);
      expect(result.lastError).toBeTruthy();
    });

    it("should handle throwing health check", async () => {
      checker.registerPlugin("test-plugin", createThrowingCheck("Boom"));
      const result = await checker.checkPlugin("test-plugin");
      expect(result.consecutiveFailures).toBe(1);
      expect(result.lastError).toContain("Boom");
    });

    it("should throw when checking unregistered plugin", async () => {
      await expect(checker.checkPlugin("nonexistent")).rejects.toThrow(
        HealthCheckError,
      );
    });

    it("should track consecutive successes", async () => {
      checker.registerPlugin("test-plugin", createHealthyCheck());
      await checker.checkPlugin("test-plugin");
      await checker.checkPlugin("test-plugin");
      await checker.checkPlugin("test-plugin");
      const result = await checker.checkPlugin("test-plugin");
      expect(result.consecutiveSuccesses).toBe(4);
      expect(result.consecutiveFailures).toBe(0);
    });

    it("should track consecutive failures", async () => {
      checker.registerPlugin("test-plugin", createUnhealthyCheck());
      await checker.checkPlugin("test-plugin");
      await checker.checkPlugin("test-plugin");
      const result = await checker.checkPlugin("test-plugin");
      expect(result.consecutiveFailures).toBe(3);
      expect(result.consecutiveSuccesses).toBe(0);
    });

    it("should reset consecutive count on alternation", async () => {
      let healthy = true;
      checker.registerPlugin("test-plugin", async () => {
        const h = healthy;
        healthy = !healthy;
        return { healthy: h };
      });

      await checker.checkPlugin("test-plugin"); // success
      await checker.checkPlugin("test-plugin"); // failure
      const result = await checker.checkPlugin("test-plugin"); // success
      expect(result.consecutiveSuccesses).toBe(1);
    });

    it("should calculate uptime percent", async () => {
      let callCount = 0;
      checker.registerPlugin("test-plugin", async () => {
        callCount++;
        return { healthy: callCount <= 3 };
      });

      for (let i = 0; i < 4; i++) {
        await checker.checkPlugin("test-plugin");
      }

      const result = checker.getStatus("test-plugin")!;
      expect(result.uptimePercent).toBe(75);
    });

    it("should check all plugins", async () => {
      checker.registerPlugin("plugin-a", createHealthyCheck());
      checker.registerPlugin("plugin-b", createUnhealthyCheck());

      const results = await checker.checkAll();
      expect(results.size).toBe(2);
      expect(results.get("plugin-a")!.consecutiveSuccesses).toBe(1);
      expect(results.get("plugin-b")!.consecutiveFailures).toBe(1);
    });

    it("should handle health check timeout", async () => {
      checker.registerPlugin("test-plugin", createSlowCheck(10000), {
        ...DEFAULT_HEALTH_CHECK_CONFIG,
        timeoutMs: 50,
      });
      const result = await checker.checkPlugin("test-plugin");
      expect(result.consecutiveFailures).toBe(1);
      expect(result.lastError).toContain("timed out");
    });
  });

  describe("state transitions", () => {
    it("should start in unknown state", () => {
      checker.registerPlugin("test-plugin", createHealthyCheck());
      expect(checker.getState("test-plugin")).toBe("unknown");
    });

    it("should transition from unknown to healthy after threshold successes", async () => {
      checker.registerPlugin("test-plugin", createHealthyCheck(), {
        ...DEFAULT_HEALTH_CHECK_CONFIG,
        healthyThreshold: 2,
      });

      await checker.checkPlugin("test-plugin");
      expect(checker.getState("test-plugin")).toBe("degraded"); // 1 success, need 2

      await checker.checkPlugin("test-plugin");
      expect(checker.getState("test-plugin")).toBe("healthy");
    });

    it("should transition to degraded on initial failures", async () => {
      checker.registerPlugin("test-plugin", createUnhealthyCheck(), {
        ...DEFAULT_HEALTH_CHECK_CONFIG,
        degradedThreshold: 1,
        unhealthyThreshold: 3,
      });

      await checker.checkPlugin("test-plugin");
      expect(checker.getState("test-plugin")).toBe("degraded");
    });

    it("should transition to unhealthy after threshold failures", async () => {
      checker.registerPlugin("test-plugin", createUnhealthyCheck(), {
        ...DEFAULT_HEALTH_CHECK_CONFIG,
        unhealthyThreshold: 2,
      });

      await checker.checkPlugin("test-plugin");
      await checker.checkPlugin("test-plugin");
      expect(checker.getState("test-plugin")).toBe("unhealthy");
    });

    it("should recover from unhealthy to healthy", async () => {
      let healthy = false;
      checker.registerPlugin("test-plugin", async () => ({ healthy }), {
        ...DEFAULT_HEALTH_CHECK_CONFIG,
        unhealthyThreshold: 2,
        healthyThreshold: 2,
      });

      await checker.checkPlugin("test-plugin");
      await checker.checkPlugin("test-plugin");
      expect(checker.getState("test-plugin")).toBe("unhealthy");

      healthy = true;
      await checker.checkPlugin("test-plugin"); // 1 success
      expect(checker.getState("test-plugin")).toBe("degraded");

      await checker.checkPlugin("test-plugin"); // 2 successes
      expect(checker.getState("test-plugin")).toBe("healthy");
    });

    it("should return null state for unregistered plugin", () => {
      expect(checker.getState("nonexistent")).toBeNull();
    });

    it("should report isHealthy correctly", async () => {
      checker.registerPlugin("test-plugin", createHealthyCheck(), {
        ...DEFAULT_HEALTH_CHECK_CONFIG,
        healthyThreshold: 1,
      });

      expect(checker.isHealthy("test-plugin")).toBe(false); // unknown
      await checker.checkPlugin("test-plugin");
      expect(checker.isHealthy("test-plugin")).toBe(true);
    });

    it("should return false for isHealthy on unregistered plugin", () => {
      expect(checker.isHealthy("nonexistent")).toBe(false);
    });
  });

  describe("events", () => {
    it("should emit check_completed event", async () => {
      const events: HealthCheckEvent[] = [];
      checker.addEventListener((e) => events.push(e));
      checker.registerPlugin("test-plugin", createHealthyCheck());

      await checker.checkPlugin("test-plugin");
      const checkEvents = events.filter((e) => e.type === "check_completed");
      expect(checkEvents.length).toBeGreaterThanOrEqual(1);
    });

    it("should emit state_changed event", async () => {
      const events: HealthCheckEvent[] = [];
      checker.addEventListener((e) => events.push(e));
      checker.registerPlugin("test-plugin", createHealthyCheck(), {
        ...DEFAULT_HEALTH_CHECK_CONFIG,
        healthyThreshold: 1,
      });

      await checker.checkPlugin("test-plugin");
      const stateEvents = events.filter((e) => e.type === "state_changed");
      expect(stateEvents.length).toBeGreaterThanOrEqual(1);
    });

    it("should emit plugin_registered event", () => {
      const events: HealthCheckEvent[] = [];
      checker.addEventListener((e) => events.push(e));
      checker.registerPlugin("test-plugin", createHealthyCheck());

      expect(events.some((e) => e.type === "plugin_registered")).toBe(true);
    });

    it("should emit plugin_unregistered event", () => {
      checker.registerPlugin("test-plugin", createHealthyCheck());
      const events: HealthCheckEvent[] = [];
      checker.addEventListener((e) => events.push(e));
      checker.unregisterPlugin("test-plugin");

      expect(events.some((e) => e.type === "plugin_unregistered")).toBe(true);
    });

    it("should remove event listener", async () => {
      const events: HealthCheckEvent[] = [];
      const listener = (e: HealthCheckEvent) => events.push(e);
      checker.addEventListener(listener);
      checker.registerPlugin("test-plugin", createHealthyCheck());
      checker.removeEventListener(listener);

      await checker.checkPlugin("test-plugin");
      // Only the registration event should be there
      expect(events.filter((e) => e.type === "check_completed")).toHaveLength(
        0,
      );
    });
  });

  describe("aggregate stats", () => {
    it("should return empty stats with no plugins", () => {
      const stats = checker.getAggregateStats();
      expect(stats.totalPlugins).toBe(0);
      expect(stats.healthy).toBe(0);
    });

    it("should count healthy and unhealthy plugins", async () => {
      checker.registerPlugin("healthy", createHealthyCheck(), {
        ...DEFAULT_HEALTH_CHECK_CONFIG,
        healthyThreshold: 1,
      });
      checker.registerPlugin("unhealthy", createUnhealthyCheck(), {
        ...DEFAULT_HEALTH_CHECK_CONFIG,
        unhealthyThreshold: 1,
      });

      await checker.checkPlugin("healthy");
      await checker.checkPlugin("unhealthy");

      const stats = checker.getAggregateStats();
      expect(stats.totalPlugins).toBe(2);
      expect(stats.healthy).toBe(1);
      expect(stats.unhealthy).toBe(1);
    });
  });

  describe("getStatus", () => {
    it("should return null for unregistered plugin", () => {
      expect(checker.getStatus("nonexistent")).toBeNull();
    });

    it("should return current status without running a check", async () => {
      checker.registerPlugin("test-plugin", createHealthyCheck());
      await checker.checkPlugin("test-plugin");

      const status = checker.getStatus("test-plugin");
      expect(status).not.toBeNull();
      expect(status!.pluginId).toBe("test-plugin");
      expect(status!.totalChecks).toBe(1);
    });
  });

  describe("resetStats", () => {
    it("should reset health statistics", async () => {
      checker.registerPlugin("test-plugin", createHealthyCheck());
      await checker.checkPlugin("test-plugin");
      await checker.checkPlugin("test-plugin");

      checker.resetStats("test-plugin");
      const status = checker.getStatus("test-plugin")!;
      expect(status.totalChecks).toBe(0);
      expect(status.state).toBe("unknown");
    });
  });
});

// ============================================================================
// VERSION COMPATIBILITY TESTS
// ============================================================================

describe("VersionCompatibilityChecker", () => {
  let checker: VersionCompatibilityChecker;

  beforeEach(() => {
    checker = new VersionCompatibilityChecker({
      platformVersion: "0.9.1",
    });
  });

  describe("semver parsing", () => {
    it("should parse valid semver", () => {
      const v = parseSemVer("1.2.3");
      expect(v).toEqual({ major: 1, minor: 2, patch: 3, prerelease: null });
    });

    it("should parse semver with prerelease", () => {
      const v = parseSemVer("1.2.3-beta.1");
      expect(v).toEqual({ major: 1, minor: 2, patch: 3, prerelease: "beta.1" });
    });

    it("should return null for invalid semver", () => {
      expect(parseSemVer("not-a-version")).toBeNull();
      expect(parseSemVer("1.2")).toBeNull();
      expect(parseSemVer("")).toBeNull();
    });

    it("should parse 0.x versions", () => {
      const v = parseSemVer("0.9.1");
      expect(v).toEqual({ major: 0, minor: 9, patch: 1, prerelease: null });
    });
  });

  describe("semver comparison", () => {
    it("should compare major versions", () => {
      expect(compareSemVer(parseSemVer("2.0.0")!, parseSemVer("1.0.0")!)).toBe(
        1,
      );
      expect(compareSemVer(parseSemVer("1.0.0")!, parseSemVer("2.0.0")!)).toBe(
        -1,
      );
    });

    it("should compare minor versions", () => {
      expect(compareSemVer(parseSemVer("1.2.0")!, parseSemVer("1.1.0")!)).toBe(
        1,
      );
      expect(compareSemVer(parseSemVer("1.1.0")!, parseSemVer("1.2.0")!)).toBe(
        -1,
      );
    });

    it("should compare patch versions", () => {
      expect(compareSemVer(parseSemVer("1.0.2")!, parseSemVer("1.0.1")!)).toBe(
        1,
      );
      expect(compareSemVer(parseSemVer("1.0.1")!, parseSemVer("1.0.2")!)).toBe(
        -1,
      );
    });

    it("should return 0 for equal versions", () => {
      expect(compareSemVer(parseSemVer("1.2.3")!, parseSemVer("1.2.3")!)).toBe(
        0,
      );
    });

    it("should rank prerelease lower than release", () => {
      expect(
        compareSemVer(parseSemVer("1.0.0-alpha")!, parseSemVer("1.0.0")!),
      ).toBe(-1);
      expect(
        compareSemVer(parseSemVer("1.0.0")!, parseSemVer("1.0.0-alpha")!),
      ).toBe(1);
    });

    it("should compare version strings", () => {
      expect(compareVersionStrings("1.1.0", "1.0.0")).toBe(1);
      expect(compareVersionStrings("1.0.0", "1.1.0")).toBe(-1);
      expect(compareVersionStrings("1.0.0", "1.0.0")).toBe(0);
    });

    it("should throw for invalid version strings", () => {
      expect(() => compareVersionStrings("invalid", "1.0.0")).toThrow(
        VersionCompatibilityError,
      );
    });
  });

  describe("version range checks", () => {
    it("should check version in range", () => {
      expect(isVersionInRange("1.2.0", "1.0.0", "2.0.0")).toBe(true);
      expect(isVersionInRange("1.0.0", "1.0.0", "2.0.0")).toBe(true);
      expect(isVersionInRange("2.0.0", "1.0.0", "2.0.0")).toBe(true);
    });

    it("should reject version outside range", () => {
      expect(isVersionInRange("3.0.0", "1.0.0", "2.0.0")).toBe(false);
      expect(isVersionInRange("0.5.0", "1.0.0", "2.0.0")).toBe(false);
    });

    it("should handle invalid versions in range check", () => {
      expect(isVersionInRange("invalid", "1.0.0", "2.0.0")).toBe(false);
    });

    it("should check same major version", () => {
      expect(isSameMajor("1.2.3", "1.5.0")).toBe(true);
      expect(isSameMajor("1.0.0", "2.0.0")).toBe(false);
    });

    it("should check compatibility", () => {
      expect(isCompatible("0.9.0", "0.9.1")).toBe(true);
      expect(isCompatible("1.0.0", "0.9.1")).toBe(false);
    });
  });

  describe("compatibility checking", () => {
    it("should accept compatible version", () => {
      const result = checker.checkCompatibility("test-plugin", "0.9.0");
      expect(result.compatible).toBe(true);
      expect(result.pluginId).toBe("test-plugin");
      expect(result.platformVersion).toBe("0.9.1");
    });

    it("should reject incompatible major version", () => {
      const result = checker.checkCompatibility("test-plugin", "1.0.0");
      expect(result.compatible).toBe(false);
      expect(result.issues.some((i) => i.field === "majorVersion")).toBe(true);
    });

    it("should reject invalid plugin version", () => {
      const result = checker.checkCompatibility("test-plugin", "invalid");
      expect(result.compatible).toBe(false);
      expect(result.issues.some((i) => i.field === "pluginVersion")).toBe(true);
    });

    it("should warn about prerelease versions", () => {
      const result = checker.checkCompatibility("test-plugin", "0.9.1-beta.1");
      expect(result.issues.some((i) => i.field === "prerelease")).toBe(true);
    });

    it("should include deprecation warnings", () => {
      checker.registerDeprecation(
        "test-plugin",
        "0.8.0",
        "Deprecated",
        "1.0.0",
      );
      const result = checker.checkCompatibility("test-plugin", "0.8.0");
      expect(result.deprecations.length).toBeGreaterThan(0);
    });
  });

  describe("rules", () => {
    it("should add and check custom rules", () => {
      checker.addRule({
        pluginId: "test-plugin",
        minVersion: "0.8.0",
        maxVersion: "0.9.5",
        allowPrerelease: false,
        description: "Test rule",
      });

      const result = checker.checkCompatibility("test-plugin", "0.9.0");
      expect(result.compatible).toBe(true);
    });

    it("should reject versions outside rule range", () => {
      checker.addRule({
        pluginId: "test-plugin",
        minVersion: "0.8.0",
        maxVersion: "0.8.5",
        allowPrerelease: false,
        description: "Restricted range",
      });

      const result = checker.checkCompatibility("test-plugin", "0.9.0");
      expect(result.compatible).toBe(false);
    });

    it("should get rules for a plugin", () => {
      checker.addRule({
        pluginId: "test-plugin",
        minVersion: "0.8.0",
        maxVersion: "0.9.5",
        allowPrerelease: false,
        description: "Test",
      });
      expect(checker.getRules("test-plugin")).toHaveLength(1);
    });

    it("should get all rules", () => {
      checker.addRule({
        pluginId: "a",
        minVersion: "0.1.0",
        maxVersion: "0.9.0",
        allowPrerelease: false,
        description: "A",
      });
      checker.addRule({
        pluginId: "b",
        minVersion: "0.1.0",
        maxVersion: "0.9.0",
        allowPrerelease: false,
        description: "B",
      });
      expect(checker.getAllRules()).toHaveLength(2);
    });

    it("should remove rules", () => {
      checker.addRule({
        pluginId: "test-plugin",
        minVersion: "0.1.0",
        maxVersion: "0.9.0",
        allowPrerelease: false,
        description: "Test",
      });
      expect(checker.removeRules("test-plugin")).toBe(true);
      expect(checker.getRules("test-plugin")).toHaveLength(0);
    });
  });

  describe("bulk compatibility", () => {
    it("should check multiple plugins at once", () => {
      const results = checker.checkBulkCompatibility([
        { pluginId: "a", version: "0.9.0" },
        { pluginId: "b", version: "1.0.0" },
      ]);
      expect(results.get("a")!.compatible).toBe(true);
      expect(results.get("b")!.compatible).toBe(false);
    });
  });

  describe("upgrade safety", () => {
    it("should allow safe upgrade", () => {
      const result = checker.isUpgradeSafe("test-plugin", "0.8.0", "0.9.0");
      expect(result.safe).toBe(true);
    });

    it("should warn about downgrade", () => {
      const result = checker.isUpgradeSafe("test-plugin", "0.9.0", "0.8.0");
      expect(result.issues.some((i) => i.field === "downgrade")).toBe(true);
    });

    it("should reject major version change", () => {
      const result = checker.isUpgradeSafe("test-plugin", "0.9.0", "1.0.0");
      expect(result.safe).toBe(false);
      expect(result.issues.some((i) => i.field === "majorVersion")).toBe(true);
    });
  });

  describe("known versions", () => {
    it("should register and retrieve known versions", () => {
      checker.registerKnownVersions("test-plugin", ["0.8.0", "0.9.0", "0.9.1"]);
      expect(checker.getLatestVersion("test-plugin")).toBe("0.9.1");
    });

    it("should suggest compatible version", () => {
      checker.registerKnownVersions("test-plugin", [
        "0.8.0",
        "0.9.0",
        "0.9.1",
        "1.0.0",
      ]);
      const suggested = checker.getSuggestedVersion("test-plugin");
      expect(suggested).toBe("0.9.1");
    });

    it("should return null for unknown plugin", () => {
      expect(checker.getLatestVersion("unknown")).toBeNull();
      expect(checker.getSuggestedVersion("unknown")).toBeNull();
    });
  });

  describe("platform version", () => {
    it("should get platform version", () => {
      expect(checker.getPlatformVersion()).toBe("0.9.1");
    });

    it("should update platform version", () => {
      checker.setPlatformVersion("1.0.0");
      expect(checker.getPlatformVersion()).toBe("1.0.0");
    });

    it("should reject invalid platform version", () => {
      expect(() => checker.setPlatformVersion("invalid")).toThrow(
        VersionCompatibilityError,
      );
    });
  });

  describe("clear", () => {
    it("should clear all state", () => {
      checker.addRule({
        pluginId: "test",
        minVersion: "0.1.0",
        maxVersion: "0.9.0",
        allowPrerelease: false,
        description: "Test",
      });
      checker.registerDeprecation("test", "0.5.0", "Old");
      checker.registerKnownVersions("test", ["0.5.0"]);
      checker.clear();
      expect(checker.getRules("test")).toHaveLength(0);
      expect(checker.getLatestVersion("test")).toBeNull();
    });
  });
});

// ============================================================================
// ROLLBACK MANAGER TESTS
// ============================================================================

describe("RollbackManager", () => {
  let manager: RollbackManager;

  beforeEach(() => {
    resetRollbackIdCounter();
    manager = new RollbackManager();
  });

  afterEach(() => {
    manager.clear();
  });

  describe("snapshots", () => {
    it("should create a snapshot", () => {
      const snapshot = manager.createSnapshot(
        "test-plugin",
        "1.0.0",
        { key: "value" },
        { state: "data" },
        "Before update",
      );
      expect(snapshot.pluginId).toBe("test-plugin");
      expect(snapshot.version).toBe("1.0.0");
      expect(snapshot.config).toEqual({ key: "value" });
      expect(snapshot.stateData).toEqual({ state: "data" });
      expect(snapshot.reason).toBe("Before update");
      expect(snapshot.verified).toBe(true);
      expect(snapshot.checksum).toBeTruthy();
    });

    it("should get snapshots for a plugin", () => {
      manager.createSnapshot("p1", "1.0.0", {}, {}, "First");
      manager.createSnapshot("p1", "1.1.0", {}, {}, "Second");
      manager.createSnapshot("p2", "1.0.0", {}, {}, "Other");

      expect(manager.getSnapshots("p1")).toHaveLength(2);
      expect(manager.getSnapshots("p2")).toHaveLength(1);
    });

    it("should get a specific snapshot by ID", () => {
      const snap = manager.createSnapshot("p1", "1.0.0", {}, {}, "Test");
      expect(manager.getSnapshot(snap.id)).toBeDefined();
      expect(manager.getSnapshot(snap.id)!.id).toBe(snap.id);
    });

    it("should get latest snapshot", () => {
      manager.createSnapshot("p1", "1.0.0", {}, {}, "First");
      const latest = manager.createSnapshot("p1", "1.1.0", {}, {}, "Latest");
      expect(manager.getLatestSnapshot("p1")!.id).toBe(latest.id);
    });

    it("should get snapshot for version", () => {
      manager.createSnapshot("p1", "1.0.0", { v: 1 }, {}, "V1");
      manager.createSnapshot("p1", "1.1.0", { v: 2 }, {}, "V1.1");

      const snap = manager.getSnapshotForVersion("p1", "1.0.0");
      expect(snap).toBeDefined();
      expect(snap!.version).toBe("1.0.0");
    });

    it("should enforce max snapshots per plugin", () => {
      const mgr = new RollbackManager({
        ...DEFAULT_ROLLBACK_CONFIG,
        maxSnapshotsPerPlugin: 2,
      });
      mgr.createSnapshot("p1", "1.0.0", {}, {}, "First");
      mgr.createSnapshot("p1", "1.1.0", {}, {}, "Second");
      mgr.createSnapshot("p1", "1.2.0", {}, {}, "Third");

      expect(mgr.getSnapshots("p1")).toHaveLength(2);
      // First snapshot should be removed
      expect(mgr.getSnapshots("p1")[0].version).toBe("1.1.0");
    });

    it("should delete a snapshot", () => {
      const snap = manager.createSnapshot("p1", "1.0.0", {}, {}, "Test");
      expect(manager.deleteSnapshot(snap.id)).toBe(true);
      expect(manager.getSnapshot(snap.id)).toBeUndefined();
    });

    it("should return false when deleting non-existent snapshot", () => {
      expect(manager.deleteSnapshot("nonexistent")).toBe(false);
    });

    it("should delete all plugin snapshots", () => {
      manager.createSnapshot("p1", "1.0.0", {}, {}, "A");
      manager.createSnapshot("p1", "1.1.0", {}, {}, "B");
      expect(manager.deletePluginSnapshots("p1")).toBe(2);
      expect(manager.getSnapshots("p1")).toHaveLength(0);
    });

    it("should verify snapshot integrity", () => {
      const snap = manager.createSnapshot(
        "p1",
        "1.0.0",
        { a: 1 },
        { b: 2 },
        "Test",
      );
      expect(manager.verifySnapshot(snap.id)).toBe(true);
    });

    it("should return false for non-existent snapshot verification", () => {
      expect(manager.verifySnapshot("nonexistent")).toBe(false);
    });

    it("should return undefined for non-existent latest snapshot", () => {
      expect(manager.getLatestSnapshot("nonexistent")).toBeUndefined();
    });
  });

  describe("rollback operations", () => {
    it("should perform a successful rollback", async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      manager.registerHandler("p1", handler);

      const snap = manager.createSnapshot(
        "p1",
        "1.0.0",
        { a: 1 },
        { b: 2 },
        "Before update",
      );
      const record = await manager.rollback("p1", snap.id, "admin");

      expect(record.status).toBe("completed");
      expect(record.pluginId).toBe("p1");
      expect(record.toVersion).toBe("1.0.0");
      expect(record.error).toBeNull();
      expect(record.durationMs).not.toBeNull();
      expect(handler).toHaveBeenCalledWith("p1", snap);
    });

    it("should handle rollback failure", async () => {
      manager.registerHandler("p1", async () => {
        throw new Error("Restore failed");
      });
      const snap = manager.createSnapshot("p1", "1.0.0", {}, {}, "Test");

      await expect(manager.rollback("p1", snap.id, "admin")).rejects.toThrow(
        RollbackError,
      );

      const record = manager.getLatestRollback("p1");
      expect(record!.status).toBe("failed");
      expect(record!.error).toContain("Restore failed");
    });

    it("should throw if snapshot not found", async () => {
      manager.registerHandler("p1", async () => {});
      await expect(
        manager.rollback("p1", "nonexistent", "admin"),
      ).rejects.toThrow(RollbackError);
    });

    it("should throw if snapshot belongs to different plugin", async () => {
      manager.registerHandler("p1", async () => {});
      const snap = manager.createSnapshot("p2", "1.0.0", {}, {}, "Test");

      await expect(manager.rollback("p1", snap.id, "admin")).rejects.toThrow(
        RollbackError,
      );
    });

    it("should throw if no handler registered", async () => {
      const snap = manager.createSnapshot("p1", "1.0.0", {}, {}, "Test");
      await expect(manager.rollback("p1", snap.id, "admin")).rejects.toThrow(
        RollbackError,
      );
    });

    it("should rollback to latest snapshot", async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      manager.registerHandler("p1", handler);

      manager.createSnapshot("p1", "1.0.0", {}, {}, "First");
      const latest = manager.createSnapshot("p1", "1.1.0", {}, {}, "Latest");

      const record = await manager.rollbackToLatest("p1", "admin");
      expect(handler).toHaveBeenCalledWith("p1", latest);
      expect(record.toVersion).toBe("1.1.0");
    });

    it("should throw rollbackToLatest with no snapshots", async () => {
      manager.registerHandler("p1", async () => {});
      await expect(manager.rollbackToLatest("p1", "admin")).rejects.toThrow(
        RollbackError,
      );
    });

    it("should rollback to specific version", async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      manager.registerHandler("p1", handler);

      manager.createSnapshot("p1", "1.0.0", {}, {}, "V1");
      manager.createSnapshot("p1", "1.1.0", {}, {}, "V1.1");

      const record = await manager.rollbackToVersion("p1", "1.0.0", "admin");
      expect(record.toVersion).toBe("1.0.0");
    });

    it("should throw rollbackToVersion with unknown version", async () => {
      manager.registerHandler("p1", async () => {});
      manager.createSnapshot("p1", "1.0.0", {}, {}, "V1");

      await expect(
        manager.rollbackToVersion("p1", "2.0.0", "admin"),
      ).rejects.toThrow(RollbackError);
    });
  });

  describe("handler registration", () => {
    it("should register a handler", () => {
      manager.registerHandler("p1", async () => {});
      expect(manager.hasHandler("p1")).toBe(true);
    });

    it("should unregister a handler", () => {
      manager.registerHandler("p1", async () => {});
      expect(manager.unregisterHandler("p1")).toBe(true);
      expect(manager.hasHandler("p1")).toBe(false);
    });

    it("should return false when unregistering non-existent handler", () => {
      expect(manager.unregisterHandler("nonexistent")).toBe(false);
    });
  });

  describe("rollback records", () => {
    it("should get rollback records for a plugin", async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      manager.registerHandler("p1", handler);
      const snap = manager.createSnapshot("p1", "1.0.0", {}, {}, "Test");
      await manager.rollback("p1", snap.id, "admin");

      const records = manager.getRollbackRecords("p1");
      expect(records).toHaveLength(1);
      expect(records[0].status).toBe("completed");
    });

    it("should get a specific rollback record", async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      manager.registerHandler("p1", handler);
      const snap = manager.createSnapshot("p1", "1.0.0", {}, {}, "Test");
      const record = await manager.rollback("p1", snap.id, "admin");

      expect(manager.getRollbackRecord(record.id)).toBeDefined();
    });

    it("should return undefined for non-existent rollback record", () => {
      expect(manager.getRollbackRecord("nonexistent")).toBeUndefined();
    });
  });

  describe("events", () => {
    it("should emit snapshot_created event", () => {
      const events: RollbackEvent[] = [];
      manager.addEventListener((e) => events.push(e));
      manager.createSnapshot("p1", "1.0.0", {}, {}, "Test");
      expect(events.some((e) => e.type === "snapshot_created")).toBe(true);
    });

    it("should emit rollback events", async () => {
      const events: RollbackEvent[] = [];
      manager.addEventListener((e) => events.push(e));
      manager.registerHandler("p1", async () => {});
      const snap = manager.createSnapshot("p1", "1.0.0", {}, {}, "Test");
      await manager.rollback("p1", snap.id, "admin");

      expect(events.some((e) => e.type === "rollback_started")).toBe(true);
      expect(events.some((e) => e.type === "rollback_completed")).toBe(true);
    });

    it("should emit rollback_failed event", async () => {
      const events: RollbackEvent[] = [];
      manager.addEventListener((e) => events.push(e));
      manager.registerHandler("p1", async () => {
        throw new Error("fail");
      });
      const snap = manager.createSnapshot("p1", "1.0.0", {}, {}, "Test");

      try {
        await manager.rollback("p1", snap.id, "admin");
      } catch {
        /* expected */
      }
      expect(events.some((e) => e.type === "rollback_failed")).toBe(true);
    });
  });

  describe("stats", () => {
    it("should return correct stats", async () => {
      manager.registerHandler("p1", async () => {});
      manager.createSnapshot("p1", "1.0.0", {}, {}, "V1");
      manager.createSnapshot("p1", "1.1.0", {}, {}, "V1.1");
      const snap = manager.createSnapshot("p2", "1.0.0", {}, {}, "V1");
      manager.registerHandler("p2", async () => {});
      await manager.rollback("p2", snap.id, "admin");

      const stats = manager.getStats();
      expect(stats.totalSnapshots).toBe(3);
      expect(stats.totalRollbacks).toBe(1);
      expect(stats.successfulRollbacks).toBe(1);
      expect(stats.pluginsWithSnapshots).toBe(2);
    });
  });

  describe("configuration", () => {
    it("should return config", () => {
      const config = manager.getConfig();
      expect(config.maxSnapshotsPerPlugin).toBe(
        DEFAULT_ROLLBACK_CONFIG.maxSnapshotsPerPlugin,
      );
    });

    it("should report auto-rollback enabled", () => {
      expect(manager.isAutoRollbackEnabled()).toBe(
        DEFAULT_ROLLBACK_CONFIG.autoRollbackOnFailure,
      );
    });
  });
});

// ============================================================================
// CIRCUIT BREAKER TESTS
// ============================================================================

describe("CircuitBreakerManager", () => {
  let breaker: CircuitBreakerManager;

  beforeEach(() => {
    breaker = new CircuitBreakerManager({
      failureThreshold: 3,
      successThreshold: 2,
      resetTimeoutMs: 100,
      failureWindowMs: 60000,
      halfOpenMaxRequests: 2,
    });
  });

  afterEach(() => {
    breaker.clear();
  });

  describe("registration", () => {
    it("should register a plugin", () => {
      breaker.registerPlugin("test-plugin");
      expect(breaker.isRegistered("test-plugin")).toBe(true);
    });

    it("should not duplicate registration", () => {
      breaker.registerPlugin("test-plugin");
      breaker.registerPlugin("test-plugin"); // should not throw
      expect(breaker.isRegistered("test-plugin")).toBe(true);
    });

    it("should unregister a plugin", () => {
      breaker.registerPlugin("test-plugin");
      expect(breaker.unregisterPlugin("test-plugin")).toBe(true);
      expect(breaker.isRegistered("test-plugin")).toBe(false);
    });
  });

  describe("state management", () => {
    it("should start in closed state", () => {
      breaker.registerPlugin("test-plugin");
      expect(breaker.getState("test-plugin")).toBe("closed");
      expect(breaker.isClosed("test-plugin")).toBe(true);
    });

    it("should open after failure threshold", () => {
      breaker.registerPlugin("test-plugin");
      breaker.recordFailure("test-plugin", "Error 1");
      breaker.recordFailure("test-plugin", "Error 2");
      breaker.recordFailure("test-plugin", "Error 3");

      expect(breaker.getState("test-plugin")).toBe("open");
      expect(breaker.isOpen("test-plugin")).toBe(true);
    });

    it("should transition from open to half-open after timeout", async () => {
      breaker.registerPlugin("test-plugin");
      breaker.recordFailure("test-plugin", "E1");
      breaker.recordFailure("test-plugin", "E2");
      breaker.recordFailure("test-plugin", "E3");

      expect(breaker.getState("test-plugin")).toBe("open");

      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(breaker.getState("test-plugin")).toBe("half_open");
    });

    it("should close from half-open after success threshold", async () => {
      breaker.registerPlugin("test-plugin");
      breaker.recordFailure("test-plugin", "E1");
      breaker.recordFailure("test-plugin", "E2");
      breaker.recordFailure("test-plugin", "E3");

      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(breaker.getState("test-plugin")).toBe("half_open");

      breaker.recordSuccess("test-plugin");
      breaker.recordSuccess("test-plugin");
      expect(breaker.getState("test-plugin")).toBe("closed");
    });

    it("should return to open from half-open on failure", async () => {
      breaker.registerPlugin("test-plugin");
      breaker.recordFailure("test-plugin", "E1");
      breaker.recordFailure("test-plugin", "E2");
      breaker.recordFailure("test-plugin", "E3");

      await new Promise((resolve) => setTimeout(resolve, 150));
      breaker.getState("test-plugin"); // trigger transition check

      breaker.recordFailure("test-plugin", "E4");
      expect(breaker.getState("test-plugin")).toBe("open");
    });
  });

  describe("request gating", () => {
    it("should allow requests when closed", () => {
      breaker.registerPlugin("test-plugin");
      expect(breaker.allowRequest("test-plugin")).toBe(true);
    });

    it("should reject requests when open", () => {
      breaker.registerPlugin("test-plugin");
      breaker.recordFailure("test-plugin", "E1");
      breaker.recordFailure("test-plugin", "E2");
      breaker.recordFailure("test-plugin", "E3");

      expect(breaker.allowRequest("test-plugin")).toBe(false);
    });

    it("should allow limited requests in half-open", async () => {
      breaker.registerPlugin("test-plugin");
      breaker.recordFailure("test-plugin", "E1");
      breaker.recordFailure("test-plugin", "E2");
      breaker.recordFailure("test-plugin", "E3");

      await new Promise((resolve) => setTimeout(resolve, 150));
      breaker.getState("test-plugin"); // trigger transition

      expect(breaker.allowRequest("test-plugin")).toBe(true);
      expect(breaker.allowRequest("test-plugin")).toBe(true);
      expect(breaker.allowRequest("test-plugin")).toBe(false); // exceeded halfOpenMaxRequests
    });

    it("should allow unregistered plugins through", () => {
      expect(breaker.allowRequest("unregistered")).toBe(true);
    });
  });

  describe("execute", () => {
    it("should execute function when circuit is closed", async () => {
      breaker.registerPlugin("test-plugin");
      const result = await breaker.execute("test-plugin", async () => 42);
      expect(result).toBe(42);
    });

    it("should throw when circuit is open", async () => {
      breaker.registerPlugin("test-plugin");
      breaker.recordFailure("test-plugin", "E1");
      breaker.recordFailure("test-plugin", "E2");
      breaker.recordFailure("test-plugin", "E3");

      await expect(
        breaker.execute("test-plugin", async () => 42),
      ).rejects.toThrow(CircuitBreakerError);
    });

    it("should record success on successful execution", async () => {
      breaker.registerPlugin("test-plugin");
      await breaker.execute("test-plugin", async () => 42);

      const status = breaker.getStatus("test-plugin")!;
      expect(status.successCount).toBe(1);
    });

    it("should record failure and rethrow on failed execution", async () => {
      breaker.registerPlugin("test-plugin");

      await expect(
        breaker.execute("test-plugin", async () => {
          throw new Error("Test error");
        }),
      ).rejects.toThrow("Test error");

      const status = breaker.getStatus("test-plugin")!;
      expect(status.failureCount).toBe(1);
    });
  });

  describe("manual control", () => {
    it("should force open a circuit", () => {
      breaker.registerPlugin("test-plugin");
      breaker.forceOpen("test-plugin", "Manual");
      expect(breaker.isOpen("test-plugin")).toBe(true);
    });

    it("should force close a circuit", () => {
      breaker.registerPlugin("test-plugin");
      breaker.forceOpen("test-plugin", "Manual");
      breaker.forceClose("test-plugin", "Recovery");
      expect(breaker.isClosed("test-plugin")).toBe(true);
    });

    it("should force half-open", () => {
      breaker.registerPlugin("test-plugin");
      breaker.forceHalfOpen("test-plugin", "Testing");
      expect(breaker.getState("test-plugin")).toBe("half_open");
    });

    it("should reset a circuit", () => {
      breaker.registerPlugin("test-plugin");
      breaker.recordFailure("test-plugin", "E1");
      breaker.recordFailure("test-plugin", "E2");
      breaker.recordFailure("test-plugin", "E3");

      breaker.reset("test-plugin");
      expect(breaker.isClosed("test-plugin")).toBe(true);

      const status = breaker.getStatus("test-plugin")!;
      expect(status.failureCount).toBe(0);
      expect(status.successCount).toBe(0);
    });
  });

  describe("status", () => {
    it("should return null status for unregistered plugin", () => {
      expect(breaker.getStatus("nonexistent")).toBeNull();
    });

    it("should return null state for unregistered plugin", () => {
      expect(breaker.getState("nonexistent")).toBeNull();
    });

    it("should return full status", () => {
      breaker.registerPlugin("test-plugin");
      breaker.recordSuccess("test-plugin");
      breaker.recordFailure("test-plugin", "Error");

      const status = breaker.getStatus("test-plugin")!;
      expect(status.pluginId).toBe("test-plugin");
      expect(status.state).toBe("closed");
      expect(status.failureCount).toBe(1);
      expect(status.successCount).toBe(1);
    });

    it("should get open circuits", () => {
      breaker.registerPlugin("a");
      breaker.registerPlugin("b");
      breaker.forceOpen("a", "Test");

      const open = breaker.getOpenCircuits();
      expect(open).toContain("a");
      expect(open).not.toContain("b");
    });

    it("should get all statuses", () => {
      breaker.registerPlugin("a");
      breaker.registerPlugin("b");

      const statuses = breaker.getAllStatuses();
      expect(statuses.size).toBe(2);
    });

    it("should track history of state changes", () => {
      breaker.registerPlugin("test-plugin");
      breaker.forceOpen("test-plugin", "Test");
      breaker.forceClose("test-plugin", "Recovery");

      const status = breaker.getStatus("test-plugin")!;
      expect(status.history.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("events", () => {
    it("should emit state_changed events", () => {
      const events: CircuitBreakerNotification[] = [];
      breaker.addEventListener((e) => events.push(e));
      breaker.registerPlugin("test-plugin");
      breaker.forceOpen("test-plugin", "Test");

      expect(events.some((e) => e.type === "state_changed")).toBe(true);
    });

    it("should emit request events", () => {
      const events: CircuitBreakerNotification[] = [];
      breaker.addEventListener((e) => events.push(e));
      breaker.registerPlugin("test-plugin");
      breaker.allowRequest("test-plugin");

      expect(events.some((e) => e.type === "request_allowed")).toBe(true);
    });

    it("should remove event listener", () => {
      const events: CircuitBreakerNotification[] = [];
      const listener = (e: CircuitBreakerNotification) => events.push(e);
      breaker.addEventListener(listener);
      breaker.removeEventListener(listener);
      breaker.registerPlugin("test-plugin");
      breaker.forceOpen("test-plugin", "Test");

      expect(events).toHaveLength(0);
    });
  });
});

// ============================================================================
// GRACEFUL DEGRADATION TESTS
// ============================================================================

describe("GracefulDegradationManager", () => {
  let manager: GracefulDegradationManager;

  beforeEach(() => {
    manager = new GracefulDegradationManager();
  });

  afterEach(() => {
    manager.clear();
  });

  describe("plugin registration", () => {
    it("should register a plugin", () => {
      manager.registerPlugin("test-plugin");
      expect(manager.isRegistered("test-plugin")).toBe(true);
    });

    it("should not fail on duplicate registration", () => {
      manager.registerPlugin("test-plugin");
      manager.registerPlugin("test-plugin"); // should not throw
    });

    it("should unregister a plugin", () => {
      manager.registerPlugin("test-plugin");
      expect(manager.unregisterPlugin("test-plugin")).toBe(true);
      expect(manager.isRegistered("test-plugin")).toBe(false);
    });
  });

  describe("feature registration", () => {
    it("should register a feature", () => {
      manager.registerPlugin("test-plugin");
      manager.registerFeature("test-plugin", "search");
      expect(manager.isFeatureAvailable("test-plugin", "search")).toBe(true);
    });

    it("should auto-create plugin on feature registration", () => {
      manager.registerFeature("auto-created", "feature");
      expect(manager.isRegistered("auto-created")).toBe(true);
    });

    it("should register a fallback", () => {
      manager.registerPlugin("test-plugin");
      manager.registerFallback({
        featureId: "search",
        pluginId: "test-plugin",
        handler: async () => [],
        cacheable: false,
        cacheTtlMs: 0,
        priority: 1,
        description: "Empty search results",
      });
      expect(manager.hasFallback("test-plugin", "search")).toBe(true);
    });

    it("should remove a fallback", () => {
      manager.registerPlugin("test-plugin");
      manager.registerFallback({
        featureId: "search",
        pluginId: "test-plugin",
        handler: async () => [],
        cacheable: false,
        cacheTtlMs: 0,
        priority: 1,
        description: "Test",
      });
      expect(manager.removeFallback("test-plugin", "search")).toBe(true);
      expect(manager.hasFallback("test-plugin", "search")).toBe(false);
    });

    it("should return false for hasFallback on unregistered plugin", () => {
      expect(manager.hasFallback("nonexistent", "feature")).toBe(false);
    });

    it("should return false for removeFallback on unregistered plugin", () => {
      expect(manager.removeFallback("nonexistent", "feature")).toBe(false);
    });
  });

  describe("degradation control", () => {
    it("should degrade a plugin", () => {
      manager.registerPlugin("test-plugin");
      manager.degradePlugin("test-plugin", "partial", "Testing");
      expect(manager.getLevel("test-plugin")).toBe("partial");
      expect(manager.isDegraded("test-plugin")).toBe(true);
    });

    it("should restore a plugin", () => {
      manager.registerPlugin("test-plugin");
      manager.degradePlugin("test-plugin", "partial", "Testing");
      manager.restorePlugin("test-plugin");
      expect(manager.getLevel("test-plugin")).toBe("none");
      expect(manager.isDegraded("test-plugin")).toBe(false);
    });

    it("should degrade a specific feature", () => {
      manager.registerPlugin("test-plugin");
      manager.registerFeature("test-plugin", "search");
      manager.degradeFeature("test-plugin", "search", "Search down");

      const status = manager.getStatus("test-plugin")!;
      expect(status.disabledFeatures).toContain("search");
    });

    it("should degrade feature to fallback if fallback exists", () => {
      manager.registerPlugin("test-plugin");
      manager.registerFallback({
        featureId: "search",
        pluginId: "test-plugin",
        handler: async () => [],
        cacheable: false,
        cacheTtlMs: 0,
        priority: 1,
        description: "Test",
      });
      manager.degradeFeature("test-plugin", "search", "Search down");

      const status = manager.getStatus("test-plugin")!;
      expect(status.fallbackFeatures).toContain("search");
    });

    it("should disable a feature", () => {
      manager.registerPlugin("test-plugin");
      manager.registerFeature("test-plugin", "search");
      manager.disableFeature("test-plugin", "search");

      expect(manager.isFeatureAvailable("test-plugin", "search")).toBe(false);
    });

    it("should restore a feature", () => {
      manager.registerPlugin("test-plugin");
      manager.registerFeature("test-plugin", "search");
      manager.disableFeature("test-plugin", "search");
      manager.restoreFeature("test-plugin", "search");

      expect(manager.isFeatureAvailable("test-plugin", "search")).toBe(true);
    });

    it("should update features on plugin-level degradation", () => {
      manager.registerPlugin("test-plugin");
      manager.registerFeature("test-plugin", "search");
      manager.registerFeature("test-plugin", "analytics");
      manager.degradePlugin("test-plugin", "disabled", "Down");

      expect(manager.isFeatureAvailable("test-plugin", "search")).toBe(false);
      expect(manager.isFeatureAvailable("test-plugin", "analytics")).toBe(
        false,
      );
    });

    it("should return none level for unregistered plugin", () => {
      expect(manager.getLevel("nonexistent")).toBe("none");
    });

    it("should return false for isDegraded on unregistered plugin", () => {
      expect(manager.isDegraded("nonexistent")).toBe(false);
    });
  });

  describe("fallback execution", () => {
    it("should execute a fallback", async () => {
      manager.registerPlugin("test-plugin");
      manager.registerFallback({
        featureId: "search",
        pluginId: "test-plugin",
        handler: async () => ["cached-result"],
        cacheable: false,
        cacheTtlMs: 0,
        priority: 1,
        description: "Test",
      });

      const result = await manager.executeFallback<string[]>(
        "test-plugin",
        "search",
        new Error("Primary failed"),
      );
      expect(result).toEqual(["cached-result"]);
    });

    it("should throw when degradation is disabled", async () => {
      const mgr = new GracefulDegradationManager({
        ...DEFAULT_GRACEFUL_DEGRADATION_CONFIG,
        enabled: false,
      });
      await expect(mgr.executeFallback("test", "feat", null)).rejects.toThrow(
        DegradationError,
      );
    });

    it("should throw for unregistered plugin", async () => {
      await expect(
        manager.executeFallback("nonexistent", "feat", null),
      ).rejects.toThrow(DegradationError);
    });

    it("should throw for unregistered feature", async () => {
      manager.registerPlugin("test-plugin");
      await expect(
        manager.executeFallback("test-plugin", "nonexistent", null),
      ).rejects.toThrow(DegradationError);
    });

    it("should throw when no fallback registered", async () => {
      manager.registerPlugin("test-plugin");
      manager.registerFeature("test-plugin", "search");
      await expect(
        manager.executeFallback("test-plugin", "search", null),
      ).rejects.toThrow(DegradationError);
    });

    it("should throw for disabled feature", async () => {
      manager.registerPlugin("test-plugin");
      manager.registerFallback({
        featureId: "search",
        pluginId: "test-plugin",
        handler: async () => [],
        cacheable: false,
        cacheTtlMs: 0,
        priority: 1,
        description: "Test",
      });
      manager.disableFeature("test-plugin", "search");

      await expect(
        manager.executeFallback("test-plugin", "search", null),
      ).rejects.toThrow(DegradationError);
    });

    it("should cache fallback results", async () => {
      let callCount = 0;
      manager.registerPlugin("test-plugin");
      manager.registerFallback({
        featureId: "search",
        pluginId: "test-plugin",
        handler: async () => {
          callCount++;
          return "cached";
        },
        cacheable: true,
        cacheTtlMs: 60000,
        priority: 1,
        description: "Test",
      });

      await manager.executeFallback("test-plugin", "search", null);
      await manager.executeFallback("test-plugin", "search", null);
      expect(callCount).toBe(1); // Second call should use cache
    });

    it("should disable feature when fallback handler throws", async () => {
      manager.registerPlugin("test-plugin");
      manager.registerFallback({
        featureId: "search",
        pluginId: "test-plugin",
        handler: async () => {
          throw new Error("Fallback failed");
        },
        cacheable: false,
        cacheTtlMs: 0,
        priority: 1,
        description: "Test",
      });

      await expect(
        manager.executeFallback("test-plugin", "search", null),
      ).rejects.toThrow(DegradationError);

      expect(manager.isFeatureAvailable("test-plugin", "search")).toBe(false);
    });
  });

  describe("status", () => {
    it("should return null status for unregistered plugin", () => {
      expect(manager.getStatus("nonexistent")).toBeNull();
    });

    it("should return correct status", () => {
      manager.registerPlugin("test-plugin");
      manager.registerFeature("test-plugin", "search");
      manager.registerFeature("test-plugin", "analytics");
      manager.disableFeature("test-plugin", "search");

      const status = manager.getStatus("test-plugin")!;
      expect(status.disabledFeatures).toContain("search");
      expect(status.level).not.toBe("none");
    });

    it("should get degraded plugins", () => {
      manager.registerPlugin("a");
      manager.registerPlugin("b");
      manager.degradePlugin("a", "partial", "Test");

      const degraded = manager.getDegradedPlugins();
      expect(degraded).toHaveLength(1);
      expect(degraded[0].pluginId).toBe("a");
    });
  });

  describe("events", () => {
    it("should emit level_changed event", () => {
      const events: DegradationEvent[] = [];
      manager.addEventListener((e) => events.push(e));
      manager.registerPlugin("test-plugin");
      manager.degradePlugin("test-plugin", "partial", "Test");

      expect(events.some((e) => e.type === "level_changed")).toBe(true);
    });

    it("should emit feature_disabled event", () => {
      const events: DegradationEvent[] = [];
      manager.addEventListener((e) => events.push(e));
      manager.registerPlugin("test-plugin");
      manager.registerFeature("test-plugin", "search");
      manager.disableFeature("test-plugin", "search");

      expect(events.some((e) => e.type === "feature_disabled")).toBe(true);
    });

    it("should emit feature_restored event", () => {
      const events: DegradationEvent[] = [];
      manager.registerPlugin("test-plugin");
      manager.registerFeature("test-plugin", "search");
      manager.disableFeature("test-plugin", "search");
      manager.addEventListener((e) => events.push(e));
      manager.restoreFeature("test-plugin", "search");

      expect(events.some((e) => e.type === "feature_restored")).toBe(true);
    });

    it("should remove event listener", () => {
      const events: DegradationEvent[] = [];
      const listener = (e: DegradationEvent) => events.push(e);
      manager.addEventListener(listener);
      manager.removeEventListener(listener);
      manager.registerPlugin("test-plugin");
      manager.degradePlugin("test-plugin", "partial", "Test");

      expect(events).toHaveLength(0);
    });
  });
});

// ============================================================================
// OPERATIONS SERVICE TESTS
// ============================================================================

describe("PluginOperationsService", () => {
  let service: PluginOperationsService;

  beforeEach(() => {
    service = new PluginOperationsService({
      healthCheck: {
        ...DEFAULT_HEALTH_CHECK_CONFIG,
        healthyThreshold: 1,
        unhealthyThreshold: 2,
      },
      circuitBreaker: {
        ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
        failureThreshold: 3,
        resetTimeoutMs: 100,
      },
      gracefulDegradation: DEFAULT_GRACEFUL_DEGRADATION_CONFIG,
      rollback: DEFAULT_ROLLBACK_CONFIG,
      versionCompatibility: {
        ...DEFAULT_VERSION_COMPATIBILITY_CONFIG,
        platformVersion: "0.9.1",
      },
      autoRollbackEnabled: true,
      autoDegradeOnCircuitOpen: true,
      autoRestoreOnCircuitClose: true,
    });
    service.initialize();
  });

  afterEach(() => {
    service.destroy();
  });

  describe("initialization", () => {
    it("should initialize the service", () => {
      expect(service.isInitialized()).toBe(true);
    });

    it("should not re-initialize", () => {
      service.initialize(); // Should not throw
      expect(service.isInitialized()).toBe(true);
    });

    it("should create via factory function", () => {
      const svc = createPluginOperationsService();
      expect(svc).toBeInstanceOf(PluginOperationsService);
      svc.destroy();
    });
  });

  describe("plugin registration", () => {
    it("should register a plugin with health check", async () => {
      service.registerPlugin("test-plugin", {
        healthCheck: createHealthyCheck(),
        features: ["search", "analytics"],
      });

      const health = await service.checkHealth("test-plugin");
      expect(health.pluginId).toBe("test-plugin");
    });

    it("should register a plugin with all options", () => {
      service.registerPlugin("test-plugin", {
        healthCheck: createHealthyCheck(),
        version: "0.9.0",
        rollbackHandler: async () => {},
        features: ["search"],
        fallbacks: [
          {
            featureId: "search",
            pluginId: "test-plugin",
            handler: async () => [],
            cacheable: false,
            cacheTtlMs: 0,
            priority: 1,
            description: "Empty results",
          },
        ],
      });

      const status = service.getOperationalStatus("test-plugin");
      expect(status.pluginId).toBe("test-plugin");
    });

    it("should unregister a plugin", async () => {
      service.registerPlugin("test-plugin", {
        healthCheck: createHealthyCheck(),
      });
      service.unregisterPlugin("test-plugin");

      await expect(service.checkHealth("test-plugin")).rejects.toThrow();
    });
  });

  describe("executeProtected", () => {
    it("should execute function when healthy", async () => {
      service.registerPlugin("test-plugin", {
        healthCheck: createHealthyCheck(),
      });

      const result = await service.executeProtected(
        "test-plugin",
        "search",
        async () => 42,
      );
      expect(result).toBe(42);
    });

    it("should use fallback when circuit is open", async () => {
      service.registerPlugin("test-plugin", {
        features: ["search"],
        fallbacks: [
          {
            featureId: "search",
            pluginId: "test-plugin",
            handler: async () => "fallback-value",
            cacheable: false,
            cacheTtlMs: 0,
            priority: 1,
            description: "Fallback",
          },
        ],
      });

      // Open the circuit
      service.forceOpenCircuit("test-plugin", "Testing");

      const result = await service.executeProtected<string>(
        "test-plugin",
        "search",
        async () => "primary-value",
      );
      expect(result).toBe("fallback-value");
    });

    it("should use fallback value when function throws", async () => {
      service.registerPlugin("test-plugin", {});

      const result = await service.executeProtected(
        "test-plugin",
        "search",
        async () => {
          throw new Error("Failed");
        },
        "default-value",
      );
      expect(result).toBe("default-value");
    });

    it("should throw when no fallback available and circuit open", async () => {
      service.registerPlugin("test-plugin", {});
      service.forceOpenCircuit("test-plugin", "Testing");

      await expect(
        service.executeProtected("test-plugin", "search", async () => 42),
      ).rejects.toThrow();
    });
  });

  describe("health checks", () => {
    it("should run health check", async () => {
      service.registerPlugin("test-plugin", {
        healthCheck: createHealthyCheck(),
      });

      const result = await service.checkHealth("test-plugin");
      expect(result.pluginId).toBe("test-plugin");
    });

    it("should run all health checks", async () => {
      service.registerPlugin("a", { healthCheck: createHealthyCheck() });
      service.registerPlugin("b", { healthCheck: createHealthyCheck() });

      const results = await service.checkAllHealth();
      expect(results.size).toBe(2);
    });
  });

  describe("version compatibility", () => {
    it("should check version compatibility", () => {
      const result = service.checkVersionCompatibility("test-plugin", "0.9.0");
      expect(result.compatible).toBe(true);
    });

    it("should check upgrade safety", () => {
      const result = service.isUpgradeSafe("test-plugin", "0.8.0", "0.9.0");
      expect(result.safe).toBe(true);
    });
  });

  describe("circuit breaker", () => {
    it("should get circuit breaker status", () => {
      service.registerPlugin("test-plugin", {});
      const status = service.getCircuitBreakerStatus("test-plugin");
      expect(status).not.toBeNull();
      expect(status!.state).toBe("closed");
    });

    it("should force open circuit", () => {
      service.registerPlugin("test-plugin", {});
      service.forceOpenCircuit("test-plugin", "Test");
      const status = service.getCircuitBreakerStatus("test-plugin");
      expect(status!.state).toBe("open");
    });

    it("should force close circuit", () => {
      service.registerPlugin("test-plugin", {});
      service.forceOpenCircuit("test-plugin", "Test");
      service.forceCloseCircuit("test-plugin", "Recovery");
      const status = service.getCircuitBreakerStatus("test-plugin");
      expect(status!.state).toBe("closed");
    });

    it("should reset circuit breaker", () => {
      service.registerPlugin("test-plugin", {});
      service.forceOpenCircuit("test-plugin", "Test");
      service.resetCircuitBreaker("test-plugin");
      const status = service.getCircuitBreakerStatus("test-plugin");
      expect(status!.state).toBe("closed");
    });
  });

  describe("degradation", () => {
    it("should get degradation status", () => {
      service.registerPlugin("test-plugin", { features: ["search"] });
      const status = service.getDegradationStatus("test-plugin");
      expect(status).not.toBeNull();
      expect(status!.level).toBe("none");
    });

    it("should manually degrade a plugin", () => {
      service.registerPlugin("test-plugin", { features: ["search"] });
      service.degradePlugin("test-plugin", "partial", "Testing");
      const status = service.getDegradationStatus("test-plugin");
      expect(status!.level).toBe("partial");
    });

    it("should restore a plugin", () => {
      service.registerPlugin("test-plugin", { features: ["search"] });
      service.degradePlugin("test-plugin", "partial", "Testing");
      service.restorePlugin("test-plugin");
      const status = service.getDegradationStatus("test-plugin");
      expect(status!.level).toBe("none");
    });

    it("should get degraded plugins", () => {
      service.registerPlugin("a", { features: ["f1"] });
      service.registerPlugin("b", { features: ["f2"] });
      service.degradePlugin("a", "partial", "Test");

      const degraded = service.getDegradedPlugins();
      expect(degraded).toHaveLength(1);
    });
  });

  describe("rollback", () => {
    it("should create a snapshot", () => {
      const snapshot = service.createSnapshot(
        "test-plugin",
        "1.0.0",
        { key: "value" },
        { state: "data" },
        "Before update",
      );
      expect(snapshot.pluginId).toBe("test-plugin");
    });

    it("should get snapshots", () => {
      service.createSnapshot("test-plugin", "1.0.0", {}, {}, "V1");
      service.createSnapshot("test-plugin", "1.1.0", {}, {}, "V1.1");

      const snapshots = service.getSnapshots("test-plugin");
      expect(snapshots).toHaveLength(2);
    });

    it("should rollback to snapshot", async () => {
      service.registerPlugin("test-plugin", {
        rollbackHandler: async () => {},
      });

      const snapshot = service.createSnapshot(
        "test-plugin",
        "1.0.0",
        {},
        {},
        "V1",
      );
      const record = await service.rollback(
        "test-plugin",
        snapshot.id,
        "admin",
      );
      expect(record.status).toBe("completed");
    });

    it("should rollback to latest", async () => {
      service.registerPlugin("test-plugin", {
        rollbackHandler: async () => {},
      });

      service.createSnapshot("test-plugin", "1.0.0", {}, {}, "V1");
      service.createSnapshot("test-plugin", "1.1.0", {}, {}, "V1.1");

      const record = await service.rollbackToLatest("test-plugin", "admin");
      expect(record.status).toBe("completed");
      expect(record.toVersion).toBe("1.1.0");
    });
  });

  describe("operational status", () => {
    it("should return operational status for a healthy plugin", async () => {
      service.registerPlugin("test-plugin", {
        healthCheck: createHealthyCheck(),
        features: ["search"],
      });
      await service.checkHealth("test-plugin");

      const status = service.getOperationalStatus("test-plugin");
      expect(status.pluginId).toBe("test-plugin");
      expect(status.operational).toBe(true);
      expect(status.summary).toContain("operational");
    });

    it("should report non-operational when circuit is open", () => {
      service.registerPlugin("test-plugin", {});
      service.forceOpenCircuit("test-plugin", "Down");

      const status = service.getOperationalStatus("test-plugin");
      expect(status.operational).toBe(false);
      expect(status.summary).toContain("not operational");
    });

    it("should report degraded operational status", async () => {
      service.registerPlugin("test-plugin", {
        healthCheck: createHealthyCheck(),
        features: ["search"],
      });
      await service.checkHealth("test-plugin");
      service.degradePlugin("test-plugin", "partial", "Testing");

      const status = service.getOperationalStatus("test-plugin");
      expect(status.operational).toBe(true);
      expect(status.summary).toContain("degraded");
    });

    it("should get all operational statuses", async () => {
      service.registerPlugin("a", { healthCheck: createHealthyCheck() });
      service.registerPlugin("b", { healthCheck: createHealthyCheck() });
      await service.checkAllHealth();

      const statuses = service.getAllOperationalStatuses();
      expect(statuses.size).toBe(2);
    });
  });

  describe("cross-cutting concerns", () => {
    it("should auto-degrade on circuit open", () => {
      service.registerPlugin("test-plugin", { features: ["search"] });
      service.forceOpenCircuit("test-plugin", "Down");

      const degradation = service.getDegradationStatus("test-plugin");
      expect(degradation!.level).not.toBe("none");
    });

    it("should auto-restore on circuit close", () => {
      service.registerPlugin("test-plugin", { features: ["search"] });
      service.forceOpenCircuit("test-plugin", "Down");
      service.forceCloseCircuit("test-plugin", "Recovery");

      const degradation = service.getDegradationStatus("test-plugin");
      expect(degradation!.level).toBe("none");
    });

    it("should open circuit when health reports unhealthy", async () => {
      service.registerPlugin("test-plugin", {
        healthCheck: createUnhealthyCheck(),
      });

      await service.checkHealth("test-plugin");
      await service.checkHealth("test-plugin");

      // After 2 unhealthy checks (unhealthyThreshold=2), health becomes unhealthy
      // Which should trigger circuit open
      const cbStatus = service.getCircuitBreakerStatus("test-plugin");
      expect(cbStatus!.state).toBe("open");
    });
  });

  describe("subsystem access", () => {
    it("should provide access to health checker", () => {
      expect(service.getHealthChecker()).toBeInstanceOf(PluginHealthChecker);
    });

    it("should provide access to version checker", () => {
      expect(service.getVersionChecker()).toBeInstanceOf(
        VersionCompatibilityChecker,
      );
    });

    it("should provide access to rollback manager", () => {
      expect(service.getRollbackManager()).toBeInstanceOf(RollbackManager);
    });

    it("should provide access to circuit breaker manager", () => {
      expect(service.getCircuitBreakerManager()).toBeInstanceOf(
        CircuitBreakerManager,
      );
    });

    it("should provide access to degradation manager", () => {
      expect(service.getDegradationManager()).toBeInstanceOf(
        GracefulDegradationManager,
      );
    });
  });

  describe("cleanup", () => {
    it("should destroy the service cleanly", () => {
      service.registerPlugin("test-plugin", {
        healthCheck: createHealthyCheck(),
      });
      service.destroy();
      expect(service.isInitialized()).toBe(false);
    });
  });
});

// ============================================================================
// DEFAULTS / TYPES TESTS
// ============================================================================

describe("Default configurations", () => {
  it("should have valid health check defaults", () => {
    expect(DEFAULT_HEALTH_CHECK_CONFIG.intervalMs).toBeGreaterThan(0);
    expect(DEFAULT_HEALTH_CHECK_CONFIG.timeoutMs).toBeGreaterThan(0);
    expect(DEFAULT_HEALTH_CHECK_CONFIG.unhealthyThreshold).toBeGreaterThan(0);
    expect(DEFAULT_HEALTH_CHECK_CONFIG.healthyThreshold).toBeGreaterThan(0);
    expect(DEFAULT_HEALTH_CHECK_CONFIG.enabled).toBe(true);
  });

  it("should have valid version compatibility defaults", () => {
    expect(DEFAULT_VERSION_COMPATIBILITY_CONFIG.platformVersion).toBeTruthy();
    expect(DEFAULT_VERSION_COMPATIBILITY_CONFIG.strictSemver).toBe(true);
  });

  it("should have valid rollback defaults", () => {
    expect(DEFAULT_ROLLBACK_CONFIG.maxSnapshotsPerPlugin).toBeGreaterThan(0);
    expect(DEFAULT_ROLLBACK_CONFIG.rollbackTimeoutMs).toBeGreaterThan(0);
  });

  it("should have valid circuit breaker defaults", () => {
    expect(DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold).toBeGreaterThan(0);
    expect(DEFAULT_CIRCUIT_BREAKER_CONFIG.successThreshold).toBeGreaterThan(0);
    expect(DEFAULT_CIRCUIT_BREAKER_CONFIG.resetTimeoutMs).toBeGreaterThan(0);
  });

  it("should have valid graceful degradation defaults", () => {
    expect(DEFAULT_GRACEFUL_DEGRADATION_CONFIG.enabled).toBe(true);
    expect(
      DEFAULT_GRACEFUL_DEGRADATION_CONFIG.maxFallbackInvocations,
    ).toBeGreaterThan(0);
  });

  it("should have valid composite operations defaults", () => {
    expect(DEFAULT_PLUGIN_OPERATIONS_CONFIG.healthCheck).toBeDefined();
    expect(DEFAULT_PLUGIN_OPERATIONS_CONFIG.versionCompatibility).toBeDefined();
    expect(DEFAULT_PLUGIN_OPERATIONS_CONFIG.rollback).toBeDefined();
    expect(DEFAULT_PLUGIN_OPERATIONS_CONFIG.circuitBreaker).toBeDefined();
    expect(DEFAULT_PLUGIN_OPERATIONS_CONFIG.gracefulDegradation).toBeDefined();
  });
});
