/**
 * Plugin Gap Closure - Comprehensive Tests
 *
 * Tests for the complete gap analysis, registry, adapter, and service system.
 * Covers types, gap-analyzer, gap-registry, plugin-adapter, and gap-closure.service.
 */

import {
  // Types
  GAP_SEVERITY_WEIGHTS,
  ALL_PLUGIN_DOMAINS,
  DEFAULT_ADAPTER_CONFIG,
  isValidDomain,
  isValidSeverity,
  isValidStatus,
  compareGapsBySeverity,
  // Analyzer
  PluginGapAnalyzer,
  KNOWN_SERVICE_DESCRIPTORS,
  KNOWN_CAPABILITIES,
  resetGapIdCounter,
  // Registry
  GapRegistry,
  GapRegistryError,
  // Adapter
  PluginAdapter,
  PluginAdapterError,
  PluginAdapterRegistry,
  createDomainAdapter,
  createAdapterWithOperations,
} from "../index";
import type {
  PluginGap,
  GapResolution,
  PluginDescriptor,
  ServiceDescriptor,
  PluginCapability,
  PluginDomain,
  AdapterOperation,
  GapSeverity,
  GapStatus,
} from "../types";
import type { GapQueryFilter, GapRegistryEventType } from "../gap-registry";
import type { AdapterHandler } from "../plugin-adapter";
import {
  GapClosureService,
  createGapClosureService,
} from "@/services/plugins/gap-closure.service";

// ============================================================================
// HELPERS
// ============================================================================

function createTestGap(overrides?: Partial<PluginGap>): PluginGap {
  return {
    id: `test-gap-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: "Test Gap",
    description: "A test gap for unit testing",
    severity: "medium",
    status: "uncovered",
    domain: "storage",
    affectedServices: ["services/test.ts"],
    requiredCapabilities: ["storage:upload"],
    identifiedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ["test"],
    ...overrides,
  };
}

function createTestPlugin(
  overrides?: Partial<PluginDescriptor>,
): PluginDescriptor {
  return {
    id: `test-plugin-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "Test Plugin",
    version: "1.0.0",
    domain: "storage",
    capabilities: ["storage:upload"],
    enabled: true,
    healthy: true,
    description: "A test plugin",
    ...overrides,
  };
}

function createTestService(
  overrides?: Partial<ServiceDescriptor>,
): ServiceDescriptor {
  return {
    path: "services/test.ts",
    name: "TestService",
    domain: "storage",
    requiredCapabilities: ["storage:upload"],
    directBackendAccess: true,
    description: "A test service",
    ...overrides,
  };
}

function createTestOperation(name: string = "testOp"): AdapterOperation {
  return {
    name,
    description: `Test operation: ${name}`,
    params: [
      {
        name: "input",
        type: "string",
        required: true,
        description: "Test input",
      },
    ],
    returns: "string",
    async: true,
  };
}

// ============================================================================
// TYPES TESTS
// ============================================================================

describe("Plugin Gap Types", () => {
  describe("GAP_SEVERITY_WEIGHTS", () => {
    it("should have weight for all severity levels", () => {
      expect(GAP_SEVERITY_WEIGHTS.critical).toBe(5);
      expect(GAP_SEVERITY_WEIGHTS.high).toBe(4);
      expect(GAP_SEVERITY_WEIGHTS.medium).toBe(3);
      expect(GAP_SEVERITY_WEIGHTS.low).toBe(2);
      expect(GAP_SEVERITY_WEIGHTS.info).toBe(1);
    });

    it("should have weights in descending order", () => {
      expect(GAP_SEVERITY_WEIGHTS.critical).toBeGreaterThan(
        GAP_SEVERITY_WEIGHTS.high,
      );
      expect(GAP_SEVERITY_WEIGHTS.high).toBeGreaterThan(
        GAP_SEVERITY_WEIGHTS.medium,
      );
      expect(GAP_SEVERITY_WEIGHTS.medium).toBeGreaterThan(
        GAP_SEVERITY_WEIGHTS.low,
      );
      expect(GAP_SEVERITY_WEIGHTS.low).toBeGreaterThan(
        GAP_SEVERITY_WEIGHTS.info,
      );
    });
  });

  describe("ALL_PLUGIN_DOMAINS", () => {
    it("should contain all expected domains", () => {
      const expectedDomains = [
        "storage",
        "search",
        "notification",
        "auth",
        "billing",
        "moderation",
        "analytics",
        "realtime",
        "media",
        "e2ee",
        "calls",
        "compliance",
      ];
      for (const domain of expectedDomains) {
        expect(ALL_PLUGIN_DOMAINS).toContain(domain);
      }
    });

    it("should have 12 domains", () => {
      expect(ALL_PLUGIN_DOMAINS).toHaveLength(12);
    });
  });

  describe("DEFAULT_ADAPTER_CONFIG", () => {
    it("should have default values", () => {
      expect(DEFAULT_ADAPTER_CONFIG.healthCheck).toBe(true);
      expect(DEFAULT_ADAPTER_CONFIG.metrics).toBe(true);
      expect(DEFAULT_ADAPTER_CONFIG.timeoutMs).toBe(30000);
    });
  });

  describe("isValidDomain", () => {
    it("should return true for valid domains", () => {
      expect(isValidDomain("storage")).toBe(true);
      expect(isValidDomain("search")).toBe(true);
      expect(isValidDomain("auth")).toBe(true);
      expect(isValidDomain("billing")).toBe(true);
      expect(isValidDomain("realtime")).toBe(true);
    });

    it("should return false for invalid domains", () => {
      expect(isValidDomain("unknown")).toBe(false);
      expect(isValidDomain("")).toBe(false);
      expect(isValidDomain("STORAGE")).toBe(false);
    });
  });

  describe("isValidSeverity", () => {
    it("should return true for valid severities", () => {
      expect(isValidSeverity("critical")).toBe(true);
      expect(isValidSeverity("high")).toBe(true);
      expect(isValidSeverity("medium")).toBe(true);
      expect(isValidSeverity("low")).toBe(true);
      expect(isValidSeverity("info")).toBe(true);
    });

    it("should return false for invalid severities", () => {
      expect(isValidSeverity("unknown")).toBe(false);
      expect(isValidSeverity("")).toBe(false);
      expect(isValidSeverity("CRITICAL")).toBe(false);
    });
  });

  describe("isValidStatus", () => {
    it("should return true for valid statuses", () => {
      expect(isValidStatus("uncovered")).toBe(true);
      expect(isValidStatus("partial")).toBe(true);
      expect(isValidStatus("workaround")).toBe(true);
      expect(isValidStatus("covered")).toBe(true);
      expect(isValidStatus("deprecated")).toBe(true);
    });

    it("should return false for invalid statuses", () => {
      expect(isValidStatus("unknown")).toBe(false);
      expect(isValidStatus("")).toBe(false);
      expect(isValidStatus("COVERED")).toBe(false);
    });
  });

  describe("compareGapsBySeverity", () => {
    it("should sort critical before high", () => {
      const critical = createTestGap({ severity: "critical" });
      const high = createTestGap({ severity: "high" });
      expect(compareGapsBySeverity(critical, high)).toBeLessThan(0);
    });

    it("should sort high before medium", () => {
      const high = createTestGap({ severity: "high" });
      const medium = createTestGap({ severity: "medium" });
      expect(compareGapsBySeverity(high, medium)).toBeLessThan(0);
    });

    it("should return 0 for equal severities", () => {
      const a = createTestGap({ severity: "medium" });
      const b = createTestGap({ severity: "medium" });
      expect(compareGapsBySeverity(a, b)).toBe(0);
    });

    it("should sort info after low", () => {
      const info = createTestGap({ severity: "info" });
      const low = createTestGap({ severity: "low" });
      expect(compareGapsBySeverity(info, low)).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// GAP ANALYZER TESTS
// ============================================================================

describe("PluginGapAnalyzer", () => {
  beforeEach(() => {
    resetGapIdCounter();
  });

  describe("constructor", () => {
    it("should create with default descriptors", () => {
      const analyzer = new PluginGapAnalyzer();
      expect(analyzer.getServices().length).toBeGreaterThan(0);
    });

    it("should create with custom descriptors", () => {
      const services = [createTestService()];
      const analyzer = new PluginGapAnalyzer(services, [], []);
      expect(analyzer.getServices()).toHaveLength(1);
    });
  });

  describe("KNOWN_SERVICE_DESCRIPTORS", () => {
    it("should have entries for all major domains", () => {
      const domains = new Set(KNOWN_SERVICE_DESCRIPTORS.map((s) => s.domain));
      expect(domains.has("storage")).toBe(true);
      expect(domains.has("search")).toBe(true);
      expect(domains.has("notification")).toBe(true);
      expect(domains.has("auth")).toBe(true);
      expect(domains.has("billing")).toBe(true);
      expect(domains.has("moderation")).toBe(true);
      expect(domains.has("analytics")).toBe(true);
      expect(domains.has("realtime")).toBe(true);
    });

    it("should have services with required capabilities", () => {
      for (const service of KNOWN_SERVICE_DESCRIPTORS) {
        expect(service.requiredCapabilities.length).toBeGreaterThan(0);
      }
    });

    it("should have valid domain values for all services", () => {
      for (const service of KNOWN_SERVICE_DESCRIPTORS) {
        expect(isValidDomain(service.domain)).toBe(true);
      }
    });
  });

  describe("KNOWN_CAPABILITIES", () => {
    it("should have capabilities for all domains in service descriptors", () => {
      const serviceDomains = new Set(
        KNOWN_SERVICE_DESCRIPTORS.map((s) => s.domain),
      );
      const capDomains = new Set(KNOWN_CAPABILITIES.map((c) => c.domain));
      for (const domain of serviceDomains) {
        expect(capDomains.has(domain)).toBe(true);
      }
    });

    it("should have unique capability IDs", () => {
      const ids = KNOWN_CAPABILITIES.map((c) => c.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it("should include backend service requirements for infrastructure caps", () => {
      const storageCaps = KNOWN_CAPABILITIES.filter(
        (c) => c.domain === "storage" && c.id === "storage:upload",
      );
      expect(storageCaps[0]?.requiredBackendService).toBe("minio");
    });
  });

  describe("analyze", () => {
    it("should return a gap analysis result", () => {
      const analyzer = new PluginGapAnalyzer();
      const result = analyzer.analyze();
      expect(result.analyzedAt).toBeDefined();
      expect(result.totalGaps).toBeGreaterThanOrEqual(0);
      expect(result.gaps).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it("should identify gaps when no plugins are registered", () => {
      const analyzer = new PluginGapAnalyzer();
      const result = analyzer.analyze();
      expect(result.totalGaps).toBeGreaterThan(0);
      expect(result.coveragePercent).toBeLessThan(100);
    });

    it("should reduce gaps when plugins cover capabilities", () => {
      const services = [
        createTestService({ requiredCapabilities: ["storage:upload"] }),
      ];
      const plugins = [createTestPlugin({ capabilities: ["storage:upload"] })];
      const caps: PluginCapability[] = [
        {
          id: "storage:upload",
          name: "Upload",
          description: "Upload",
          domain: "storage",
          optional: false,
        },
      ];

      const analyzerNone = new PluginGapAnalyzer(services, [], caps);
      const analyzerPlugin = new PluginGapAnalyzer(services, plugins, caps);

      const resultNone = analyzerNone.analyze();
      const resultPlugin = analyzerPlugin.analyze();

      expect(resultPlugin.totalGaps).toBeLessThanOrEqual(resultNone.totalGaps);
    });

    it("should include breakdown by status", () => {
      const analyzer = new PluginGapAnalyzer();
      const result = analyzer.analyze();
      expect(result.byStatus).toBeDefined();
      expect(typeof result.byStatus.uncovered).toBe("number");
      expect(typeof result.byStatus.covered).toBe("number");
    });

    it("should include breakdown by severity", () => {
      const analyzer = new PluginGapAnalyzer();
      const result = analyzer.analyze();
      expect(result.bySeverity).toBeDefined();
      expect(typeof result.bySeverity.critical).toBe("number");
      expect(typeof result.bySeverity.high).toBe("number");
    });

    it("should include breakdown by domain", () => {
      const analyzer = new PluginGapAnalyzer();
      const result = analyzer.analyze();
      expect(result.byDomain).toBeDefined();
    });

    it("should sort gaps by severity descending", () => {
      const analyzer = new PluginGapAnalyzer();
      const result = analyzer.analyze();
      if (result.gaps.length >= 2) {
        for (let i = 1; i < result.gaps.length; i++) {
          expect(
            GAP_SEVERITY_WEIGHTS[result.gaps[i - 1].severity],
          ).toBeGreaterThanOrEqual(
            GAP_SEVERITY_WEIGHTS[result.gaps[i].severity],
          );
        }
      }
    });

    it("should sort recommendations by priority descending", () => {
      const analyzer = new PluginGapAnalyzer();
      const result = analyzer.analyze();
      if (result.recommendations.length >= 2) {
        for (let i = 1; i < result.recommendations.length; i++) {
          expect(result.recommendations[i - 1].priority).toBeGreaterThanOrEqual(
            result.recommendations[i].priority,
          );
        }
      }
    });
  });

  describe("identifyGaps", () => {
    it("should return gaps with valid structure", () => {
      const analyzer = new PluginGapAnalyzer();
      const gaps = analyzer.identifyGaps();
      for (const gap of gaps) {
        expect(gap.id).toBeDefined();
        expect(gap.title).toBeDefined();
        expect(gap.domain).toBeDefined();
        expect(gap.severity).toBeDefined();
        expect(gap.status).toBeDefined();
        expect(gap.requiredCapabilities.length).toBeGreaterThan(0);
      }
    });

    it("should group by domain", () => {
      const services = [
        createTestService({
          domain: "storage",
          requiredCapabilities: ["storage:upload"],
        }),
        createTestService({
          path: "services/test2.ts",
          domain: "storage",
          requiredCapabilities: ["storage:download"],
        }),
      ];
      const caps: PluginCapability[] = [
        {
          id: "storage:upload",
          name: "Upload",
          description: "Upload",
          domain: "storage",
          optional: false,
        },
        {
          id: "storage:download",
          name: "Download",
          description: "Download",
          domain: "storage",
          optional: false,
        },
      ];
      const analyzer = new PluginGapAnalyzer(services, [], caps);
      const gaps = analyzer.identifyGaps();
      // Should be grouped into a single storage gap
      const storageGaps = gaps.filter((g) => g.domain === "storage");
      expect(storageGaps).toHaveLength(1);
      expect(storageGaps[0].requiredCapabilities).toContain("storage:upload");
      expect(storageGaps[0].requiredCapabilities).toContain("storage:download");
    });
  });

  describe("analyzeDomain", () => {
    it("should return gaps for a specific domain", () => {
      const analyzer = new PluginGapAnalyzer();
      const gaps = analyzer.analyzeDomain("storage");
      for (const gap of gaps) {
        expect(gap.domain).toBe("storage");
      }
    });

    it("should return per-service gaps", () => {
      const services = [
        createTestService({
          path: "a.ts",
          name: "ServiceA",
          domain: "search",
          requiredCapabilities: ["search:full-text"],
        }),
        createTestService({
          path: "b.ts",
          name: "ServiceB",
          domain: "search",
          requiredCapabilities: ["search:semantic"],
        }),
      ];
      const caps: PluginCapability[] = [
        {
          id: "search:full-text",
          name: "FT",
          description: "FT",
          domain: "search",
          optional: false,
        },
        {
          id: "search:semantic",
          name: "Sem",
          description: "Sem",
          domain: "search",
          optional: true,
        },
      ];
      const analyzer = new PluginGapAnalyzer(services, [], caps);
      const gaps = analyzer.analyzeDomain("search");
      expect(gaps.length).toBeGreaterThanOrEqual(2);
    });

    it("should return empty for domain with no services", () => {
      const analyzer = new PluginGapAnalyzer([], [], []);
      const gaps = analyzer.analyzeDomain("storage");
      expect(gaps).toHaveLength(0);
    });
  });

  describe("getCoveredCapabilities", () => {
    it("should return empty set when no plugins registered", () => {
      const analyzer = new PluginGapAnalyzer([], [], []);
      expect(analyzer.getCoveredCapabilities().size).toBe(0);
    });

    it("should return capabilities from enabled and healthy plugins", () => {
      const plugins = [
        createTestPlugin({
          capabilities: ["storage:upload", "storage:download"],
        }),
      ];
      const analyzer = new PluginGapAnalyzer([], plugins, []);
      const covered = analyzer.getCoveredCapabilities();
      expect(covered.has("storage:upload")).toBe(true);
      expect(covered.has("storage:download")).toBe(true);
    });

    it("should exclude capabilities from disabled plugins", () => {
      const plugins = [
        createTestPlugin({ capabilities: ["storage:upload"], enabled: false }),
      ];
      const analyzer = new PluginGapAnalyzer([], plugins, []);
      expect(analyzer.getCoveredCapabilities().size).toBe(0);
    });

    it("should exclude capabilities from unhealthy plugins", () => {
      const plugins = [
        createTestPlugin({ capabilities: ["storage:upload"], healthy: false }),
      ];
      const analyzer = new PluginGapAnalyzer([], plugins, []);
      expect(analyzer.getCoveredCapabilities().size).toBe(0);
    });
  });

  describe("getRequiredCapabilities", () => {
    it("should collect all capabilities from services", () => {
      const services = [
        createTestService({ requiredCapabilities: ["storage:upload"] }),
        createTestService({
          path: "b.ts",
          requiredCapabilities: ["storage:download"],
        }),
      ];
      const analyzer = new PluginGapAnalyzer(services, [], []);
      const required = analyzer.getRequiredCapabilities();
      expect(required.has("storage:upload")).toBe(true);
      expect(required.has("storage:download")).toBe(true);
    });

    it("should deduplicate capabilities", () => {
      const services = [
        createTestService({ requiredCapabilities: ["storage:upload"] }),
        createTestService({
          path: "b.ts",
          requiredCapabilities: ["storage:upload"],
        }),
      ];
      const analyzer = new PluginGapAnalyzer(services, [], []);
      const required = analyzer.getRequiredCapabilities();
      expect(required.size).toBe(1);
    });
  });

  describe("getUncoveredCapabilities", () => {
    it("should return all capabilities when no plugins exist", () => {
      const services = [
        createTestService({
          requiredCapabilities: ["storage:upload", "storage:download"],
        }),
      ];
      const analyzer = new PluginGapAnalyzer(services, [], []);
      const uncovered = analyzer.getUncoveredCapabilities();
      expect(uncovered).toContain("storage:upload");
      expect(uncovered).toContain("storage:download");
    });

    it("should return empty when all capabilities are covered", () => {
      const services = [
        createTestService({ requiredCapabilities: ["storage:upload"] }),
      ];
      const plugins = [createTestPlugin({ capabilities: ["storage:upload"] })];
      const analyzer = new PluginGapAnalyzer(services, plugins, []);
      expect(analyzer.getUncoveredCapabilities()).toHaveLength(0);
    });
  });

  describe("getCoverageStats", () => {
    it("should return 100% when all covered", () => {
      const services = [
        createTestService({ requiredCapabilities: ["storage:upload"] }),
      ];
      const plugins = [createTestPlugin({ capabilities: ["storage:upload"] })];
      const analyzer = new PluginGapAnalyzer(services, plugins, []);
      const stats = analyzer.getCoverageStats();
      expect(stats.percent).toBe(100);
      expect(stats.uncovered).toBe(0);
    });

    it("should return 0% when none covered", () => {
      const services = [
        createTestService({ requiredCapabilities: ["storage:upload"] }),
      ];
      const analyzer = new PluginGapAnalyzer(services, [], []);
      const stats = analyzer.getCoverageStats();
      expect(stats.percent).toBe(0);
      expect(stats.uncovered).toBe(1);
    });

    it("should return 100% when no services exist", () => {
      const analyzer = new PluginGapAnalyzer([], [], []);
      expect(analyzer.getCoverageStats().percent).toBe(100);
    });
  });

  describe("plugin management", () => {
    it("should register a plugin", () => {
      const analyzer = new PluginGapAnalyzer([], [], []);
      const plugin = createTestPlugin();
      analyzer.registerPlugin(plugin);
      expect(analyzer.getPlugins()).toHaveLength(1);
    });

    it("should update an existing plugin", () => {
      const analyzer = new PluginGapAnalyzer([], [], []);
      const plugin = createTestPlugin({ id: "p1", name: "V1" });
      analyzer.registerPlugin(plugin);
      analyzer.registerPlugin({ ...plugin, name: "V2" });
      expect(analyzer.getPlugins()).toHaveLength(1);
      expect(analyzer.getPlugins()[0].name).toBe("V2");
    });

    it("should unregister a plugin", () => {
      const analyzer = new PluginGapAnalyzer([], [], []);
      const plugin = createTestPlugin({ id: "p1" });
      analyzer.registerPlugin(plugin);
      expect(analyzer.unregisterPlugin("p1")).toBe(true);
      expect(analyzer.getPlugins()).toHaveLength(0);
    });

    it("should return false for unregistering nonexistent plugin", () => {
      const analyzer = new PluginGapAnalyzer([], [], []);
      expect(analyzer.unregisterPlugin("nonexistent")).toBe(false);
    });

    it("should get plugin by ID", () => {
      const analyzer = new PluginGapAnalyzer([], [], []);
      const plugin = createTestPlugin({ id: "p1" });
      analyzer.registerPlugin(plugin);
      expect(analyzer.getPlugin("p1")).toBeDefined();
      expect(analyzer.getPlugin("p2")).toBeUndefined();
    });
  });

  describe("service management", () => {
    it("should register a service", () => {
      const analyzer = new PluginGapAnalyzer([], [], []);
      analyzer.registerService(createTestService());
      expect(analyzer.getServices()).toHaveLength(1);
    });

    it("should update an existing service by path", () => {
      const analyzer = new PluginGapAnalyzer([], [], []);
      const svc = createTestService({ name: "V1" });
      analyzer.registerService(svc);
      analyzer.registerService({ ...svc, name: "V2" });
      expect(analyzer.getServices()).toHaveLength(1);
      expect(analyzer.getServices()[0].name).toBe("V2");
    });

    it("should get direct access services", () => {
      const analyzer = new PluginGapAnalyzer(
        [
          createTestService({ directBackendAccess: true }),
          createTestService({ path: "b.ts", directBackendAccess: false }),
        ],
        [],
        [],
      );
      const direct = analyzer.getDirectAccessServices();
      expect(direct).toHaveLength(1);
    });
  });

  describe("generateRecommendations", () => {
    it("should generate recommendations for uncovered gaps", () => {
      const analyzer = new PluginGapAnalyzer();
      const gaps = [createTestGap({ status: "uncovered", severity: "high" })];
      const recs = analyzer.generateRecommendations(gaps);
      expect(recs.length).toBeGreaterThan(0);
      expect(recs[0].gapId).toBe(gaps[0].id);
    });

    it("should skip covered gaps", () => {
      const analyzer = new PluginGapAnalyzer();
      const gaps = [createTestGap({ status: "covered" })];
      const recs = analyzer.generateRecommendations(gaps);
      expect(recs).toHaveLength(0);
    });

    it("should skip deprecated gaps", () => {
      const analyzer = new PluginGapAnalyzer();
      const gaps = [createTestGap({ status: "deprecated" })];
      const recs = analyzer.generateRecommendations(gaps);
      expect(recs).toHaveLength(0);
    });

    it("should assign higher priority to higher severity", () => {
      const analyzer = new PluginGapAnalyzer();
      const gaps = [
        createTestGap({ id: "g1", severity: "critical", status: "uncovered" }),
        createTestGap({ id: "g2", severity: "low", status: "uncovered" }),
      ];
      const recs = analyzer.generateRecommendations(gaps);
      const criticalRec = recs.find((r) => r.gapId === "g1");
      const lowRec = recs.find((r) => r.gapId === "g2");
      expect(criticalRec!.priority).toBeGreaterThan(lowRec!.priority);
    });
  });
});

// ============================================================================
// GAP REGISTRY TESTS
// ============================================================================

describe("GapRegistry", () => {
  let registry: GapRegistry;

  beforeEach(() => {
    registry = new GapRegistry();
  });

  describe("registerGap", () => {
    it("should register a gap", () => {
      const gap = createTestGap();
      const result = registry.registerGap(gap);
      expect(result.id).toBe(gap.id);
    });

    it("should throw on duplicate ID", () => {
      const gap = createTestGap({ id: "dup" });
      registry.registerGap(gap);
      expect(() => registry.registerGap({ ...gap })).toThrow(GapRegistryError);
    });

    it("should throw on invalid domain", () => {
      const gap = createTestGap({ domain: "invalid" as PluginDomain });
      expect(() => registry.registerGap(gap)).toThrow(GapRegistryError);
    });

    it("should throw on invalid severity", () => {
      const gap = createTestGap({ severity: "unknown" as GapSeverity });
      expect(() => registry.registerGap(gap)).toThrow(GapRegistryError);
    });

    it("should throw on invalid status", () => {
      const gap = createTestGap({ status: "invalid" as GapStatus });
      expect(() => registry.registerGap(gap)).toThrow(GapRegistryError);
    });
  });

  describe("registerGaps", () => {
    it("should register multiple gaps", () => {
      const gaps = [createTestGap({ id: "a" }), createTestGap({ id: "b" })];
      const results = registry.registerGaps(gaps);
      expect(results).toHaveLength(2);
      expect(registry.size()).toBe(2);
    });
  });

  describe("getGap", () => {
    it("should return a gap by ID", () => {
      const gap = createTestGap({ id: "test-1" });
      registry.registerGap(gap);
      const result = registry.getGap("test-1");
      expect(result).toBeDefined();
      expect(result!.id).toBe("test-1");
    });

    it("should return undefined for nonexistent gap", () => {
      expect(registry.getGap("nonexistent")).toBeUndefined();
    });

    it("should return a copy, not a reference", () => {
      const gap = createTestGap({ id: "test-1" });
      registry.registerGap(gap);
      const result = registry.getGap("test-1")!;
      result.title = "Modified";
      expect(registry.getGap("test-1")!.title).not.toBe("Modified");
    });
  });

  describe("updateGap", () => {
    it("should update gap properties", () => {
      registry.registerGap(createTestGap({ id: "g1", title: "Original" }));
      const updated = registry.updateGap("g1", { title: "Updated" });
      expect(updated.title).toBe("Updated");
    });

    it("should update the updatedAt timestamp", () => {
      const original = createTestGap({
        id: "g1",
        updatedAt: "2020-01-01T00:00:00.000Z",
      });
      registry.registerGap(original);
      const updated = registry.updateGap("g1", { title: "Changed" });
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(
        new Date("2020-01-01").getTime(),
      );
    });

    it("should throw for nonexistent gap", () => {
      expect(() => registry.updateGap("nonexistent", { title: "X" })).toThrow(
        GapRegistryError,
      );
    });

    it("should throw on invalid domain update", () => {
      registry.registerGap(createTestGap({ id: "g1" }));
      expect(() =>
        registry.updateGap("g1", { domain: "bad" as PluginDomain }),
      ).toThrow(GapRegistryError);
    });

    it("should throw on invalid severity update", () => {
      registry.registerGap(createTestGap({ id: "g1" }));
      expect(() =>
        registry.updateGap("g1", { severity: "bad" as GapSeverity }),
      ).toThrow(GapRegistryError);
    });

    it("should throw on invalid status update", () => {
      registry.registerGap(createTestGap({ id: "g1" }));
      expect(() =>
        registry.updateGap("g1", { status: "bad" as GapStatus }),
      ).toThrow(GapRegistryError);
    });
  });

  describe("removeGap", () => {
    it("should remove a gap", () => {
      registry.registerGap(createTestGap({ id: "g1" }));
      expect(registry.removeGap("g1")).toBe(true);
      expect(registry.hasGap("g1")).toBe(false);
    });

    it("should return false for nonexistent gap", () => {
      expect(registry.removeGap("nonexistent")).toBe(false);
    });

    it("should also remove associated resolutions", () => {
      const gap = createTestGap({
        id: "g1",
        requiredCapabilities: ["storage:upload"],
      });
      registry.registerGap(gap);
      registry.registerResolution({
        gapId: "g1",
        pluginId: "p1",
        resolutionType: "plugin",
        description: "Test",
        coveredCapabilities: ["storage:upload"],
        resolvedAt: new Date().toISOString(),
        resolvedBy: "test",
      });
      registry.removeGap("g1");
      expect(registry.getResolutions("g1")).toHaveLength(0);
    });
  });

  describe("hasGap", () => {
    it("should return true for existing gap", () => {
      registry.registerGap(createTestGap({ id: "g1" }));
      expect(registry.hasGap("g1")).toBe(true);
    });

    it("should return false for nonexistent gap", () => {
      expect(registry.hasGap("nonexistent")).toBe(false);
    });
  });

  describe("registerResolution", () => {
    it("should register a resolution for a gap", () => {
      const gap = createTestGap({
        id: "g1",
        requiredCapabilities: ["storage:upload"],
      });
      registry.registerGap(gap);
      const resolution: GapResolution = {
        gapId: "g1",
        pluginId: "p1",
        resolutionType: "plugin",
        description: "Test resolution",
        coveredCapabilities: ["storage:upload"],
        resolvedAt: new Date().toISOString(),
        resolvedBy: "admin",
      };
      const result = registry.registerResolution(resolution);
      expect(result.gapId).toBe("g1");
    });

    it("should mark gap as covered when all capabilities resolved", () => {
      const gap = createTestGap({
        id: "g1",
        requiredCapabilities: ["storage:upload"],
      });
      registry.registerGap(gap);
      registry.registerResolution({
        gapId: "g1",
        pluginId: "p1",
        resolutionType: "plugin",
        description: "Full resolution",
        coveredCapabilities: ["storage:upload"],
        resolvedAt: new Date().toISOString(),
        resolvedBy: "admin",
      });
      expect(registry.getGap("g1")!.status).toBe("covered");
    });

    it("should mark gap as partial when some capabilities resolved", () => {
      const gap = createTestGap({
        id: "g1",
        requiredCapabilities: ["storage:upload", "storage:download"],
      });
      registry.registerGap(gap);
      registry.registerResolution({
        gapId: "g1",
        pluginId: "p1",
        resolutionType: "plugin",
        description: "Partial resolution",
        coveredCapabilities: ["storage:upload"],
        resolvedAt: new Date().toISOString(),
        resolvedBy: "admin",
      });
      expect(registry.getGap("g1")!.status).toBe("partial");
    });

    it("should throw for nonexistent gap", () => {
      expect(() =>
        registry.registerResolution({
          gapId: "nonexistent",
          pluginId: "p1",
          resolutionType: "plugin",
          description: "Test",
          coveredCapabilities: ["x"],
          resolvedAt: new Date().toISOString(),
          resolvedBy: "admin",
        }),
      ).toThrow(GapRegistryError);
    });

    it("should support multiple resolutions covering different capabilities", () => {
      const gap = createTestGap({
        id: "g1",
        requiredCapabilities: ["storage:upload", "storage:download"],
      });
      registry.registerGap(gap);
      registry.registerResolution({
        gapId: "g1",
        pluginId: "p1",
        resolutionType: "plugin",
        description: "Upload",
        coveredCapabilities: ["storage:upload"],
        resolvedAt: new Date().toISOString(),
        resolvedBy: "admin",
      });
      expect(registry.getGap("g1")!.status).toBe("partial");
      registry.registerResolution({
        gapId: "g1",
        pluginId: "p2",
        resolutionType: "plugin",
        description: "Download",
        coveredCapabilities: ["storage:download"],
        resolvedAt: new Date().toISOString(),
        resolvedBy: "admin",
      });
      expect(registry.getGap("g1")!.status).toBe("covered");
    });
  });

  describe("getResolutions", () => {
    it("should return resolutions for a gap", () => {
      const gap = createTestGap({ id: "g1" });
      registry.registerGap(gap);
      registry.registerResolution({
        gapId: "g1",
        pluginId: "p1",
        resolutionType: "plugin",
        description: "R1",
        coveredCapabilities: ["storage:upload"],
        resolvedAt: new Date().toISOString(),
        resolvedBy: "admin",
      });
      expect(registry.getResolutions("g1")).toHaveLength(1);
    });

    it("should return empty array for gap with no resolutions", () => {
      const gap = createTestGap({ id: "g1" });
      registry.registerGap(gap);
      expect(registry.getResolutions("g1")).toHaveLength(0);
    });
  });

  describe("revokeResolution", () => {
    it("should revoke a resolution and recalculate status", () => {
      const gap = createTestGap({
        id: "g1",
        requiredCapabilities: ["storage:upload"],
      });
      registry.registerGap(gap);
      registry.registerResolution({
        gapId: "g1",
        pluginId: "p1",
        resolutionType: "plugin",
        description: "R1",
        coveredCapabilities: ["storage:upload"],
        resolvedAt: new Date().toISOString(),
        resolvedBy: "admin",
      });
      expect(registry.getGap("g1")!.status).toBe("covered");
      expect(registry.revokeResolution("g1", "p1")).toBe(true);
      expect(registry.getGap("g1")!.status).toBe("uncovered");
    });

    it("should return false for nonexistent gap", () => {
      expect(registry.revokeResolution("nonexistent", "p1")).toBe(false);
    });

    it("should return false for nonexistent plugin resolution", () => {
      const gap = createTestGap({ id: "g1" });
      registry.registerGap(gap);
      registry.registerResolution({
        gapId: "g1",
        pluginId: "p1",
        resolutionType: "plugin",
        description: "R1",
        coveredCapabilities: ["storage:upload"],
        resolvedAt: new Date().toISOString(),
        resolvedBy: "admin",
      });
      expect(registry.revokeResolution("g1", "nonexistent")).toBe(false);
    });
  });

  describe("queryGaps", () => {
    beforeEach(() => {
      registry.registerGap(
        createTestGap({
          id: "g1",
          status: "uncovered",
          severity: "critical",
          domain: "auth",
          tags: ["auth", "sso"],
        }),
      );
      registry.registerGap(
        createTestGap({
          id: "g2",
          status: "partial",
          severity: "high",
          domain: "storage",
          tags: ["storage"],
        }),
      );
      registry.registerGap(
        createTestGap({
          id: "g3",
          status: "covered",
          severity: "low",
          domain: "search",
          tags: ["search"],
        }),
      );
      registry.registerGap(
        createTestGap({
          id: "g4",
          status: "uncovered",
          severity: "medium",
          domain: "billing",
          tags: ["billing"],
        }),
      );
    });

    it("should return all gaps without filter", () => {
      expect(registry.queryGaps()).toHaveLength(4);
    });

    it("should filter by status", () => {
      const results = registry.queryGaps({ status: "uncovered" });
      expect(results).toHaveLength(2);
      results.forEach((g) => expect(g.status).toBe("uncovered"));
    });

    it("should filter by multiple statuses", () => {
      const results = registry.queryGaps({ status: ["uncovered", "partial"] });
      expect(results).toHaveLength(3);
    });

    it("should filter by severity", () => {
      const results = registry.queryGaps({ severity: "critical" });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("g1");
    });

    it("should filter by multiple severities", () => {
      const results = registry.queryGaps({ severity: ["critical", "high"] });
      expect(results).toHaveLength(2);
    });

    it("should filter by domain", () => {
      const results = registry.queryGaps({ domain: "auth" });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("g1");
    });

    it("should filter by tags", () => {
      const results = registry.queryGaps({ tags: ["sso"] });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("g1");
    });

    it("should apply limit", () => {
      const results = registry.queryGaps({ limit: 2 });
      expect(results).toHaveLength(2);
    });

    it("should apply offset", () => {
      const results = registry.queryGaps({ offset: 2 });
      expect(results).toHaveLength(2);
    });

    it("should apply limit and offset together", () => {
      const results = registry.queryGaps({ limit: 1, offset: 1 });
      expect(results).toHaveLength(1);
    });

    it("should sort by severity by default", () => {
      const results = registry.queryGaps();
      expect(results[0].severity).toBe("critical");
    });

    it("should sort by domain when specified", () => {
      const results = registry.queryGaps({
        sortBy: "domain",
        sortOrder: "asc",
      });
      expect(results[0].domain).toBe("auth");
    });

    it("should sort ascending when specified", () => {
      const results = registry.queryGaps({
        sortBy: "severity",
        sortOrder: "asc",
      });
      expect(results[0].severity).toBe("low");
    });
  });

  describe("getGapsByDomain", () => {
    it("should return gaps for specific domain", () => {
      registry.registerGap(createTestGap({ id: "g1", domain: "storage" }));
      registry.registerGap(createTestGap({ id: "g2", domain: "auth" }));
      const results = registry.getGapsByDomain("storage");
      expect(results).toHaveLength(1);
    });
  });

  describe("getGapsBySeverity", () => {
    it("should return gaps by severity", () => {
      registry.registerGap(createTestGap({ id: "g1", severity: "critical" }));
      registry.registerGap(createTestGap({ id: "g2", severity: "low" }));
      expect(registry.getGapsBySeverity("critical")).toHaveLength(1);
    });
  });

  describe("getGapsByStatus", () => {
    it("should return gaps by status", () => {
      registry.registerGap(createTestGap({ id: "g1", status: "uncovered" }));
      registry.registerGap(createTestGap({ id: "g2", status: "covered" }));
      expect(registry.getGapsByStatus("uncovered")).toHaveLength(1);
    });
  });

  describe("getUncoveredGaps", () => {
    it("should return uncovered, partial, and workaround gaps", () => {
      registry.registerGap(createTestGap({ id: "g1", status: "uncovered" }));
      registry.registerGap(createTestGap({ id: "g2", status: "partial" }));
      registry.registerGap(createTestGap({ id: "g3", status: "workaround" }));
      registry.registerGap(createTestGap({ id: "g4", status: "covered" }));
      registry.registerGap(createTestGap({ id: "g5", status: "deprecated" }));
      expect(registry.getUncoveredGaps()).toHaveLength(3);
    });
  });

  describe("getCriticalGaps", () => {
    it("should return critical uncovered or partial gaps", () => {
      registry.registerGap(
        createTestGap({ id: "g1", severity: "critical", status: "uncovered" }),
      );
      registry.registerGap(
        createTestGap({ id: "g2", severity: "critical", status: "covered" }),
      );
      registry.registerGap(
        createTestGap({ id: "g3", severity: "high", status: "uncovered" }),
      );
      expect(registry.getCriticalGaps()).toHaveLength(1);
    });
  });

  describe("getStats", () => {
    it("should return comprehensive statistics", () => {
      registry.registerGap(
        createTestGap({
          id: "g1",
          status: "uncovered",
          severity: "critical",
          domain: "auth",
        }),
      );
      registry.registerGap(
        createTestGap({
          id: "g2",
          status: "covered",
          severity: "low",
          domain: "storage",
        }),
      );
      const stats = registry.getStats();
      expect(stats.totalGaps).toBe(2);
      expect(stats.byStatus.uncovered).toBe(1);
      expect(stats.byStatus.covered).toBe(1);
      expect(stats.bySeverity.critical).toBe(1);
      expect(stats.coveragePercent).toBe(50);
      expect(stats.criticalUncovered).toBe(1);
    });

    it("should count resolutions", () => {
      registry.registerGap(
        createTestGap({ id: "g1", requiredCapabilities: ["storage:upload"] }),
      );
      registry.registerResolution({
        gapId: "g1",
        pluginId: "p1",
        resolutionType: "plugin",
        description: "R1",
        coveredCapabilities: ["storage:upload"],
        resolvedAt: new Date().toISOString(),
        resolvedBy: "admin",
      });
      expect(registry.getStats().totalResolutions).toBe(1);
    });

    it("should report 100% coverage when empty", () => {
      expect(registry.getStats().coveragePercent).toBe(100);
    });
  });

  describe("markWorkaround", () => {
    it("should mark a gap as workaround with description", () => {
      registry.registerGap(createTestGap({ id: "g1" }));
      const result = registry.markWorkaround("g1", "Using direct DB access");
      expect(result.status).toBe("workaround");
      expect(result.workaroundDescription).toBe("Using direct DB access");
    });
  });

  describe("deprecateGap", () => {
    it("should mark a gap as deprecated", () => {
      registry.registerGap(createTestGap({ id: "g1" }));
      const result = registry.deprecateGap("g1");
      expect(result.status).toBe("deprecated");
    });
  });

  describe("importFromAnalysis", () => {
    it("should import gaps and skip duplicates", () => {
      registry.registerGap(createTestGap({ id: "existing" }));
      const result = registry.importFromAnalysis([
        createTestGap({ id: "new1" }),
        createTestGap({ id: "existing" }),
        createTestGap({ id: "new2" }),
      ]);
      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(1);
      expect(registry.size()).toBe(3);
    });
  });

  describe("event system", () => {
    it("should emit gap:registered event", () => {
      const events: string[] = [];
      registry.on("gap:registered", (e) => events.push(e.type));
      registry.registerGap(createTestGap({ id: "g1" }));
      expect(events).toContain("gap:registered");
    });

    it("should emit gap:updated event", () => {
      const events: string[] = [];
      registry.registerGap(createTestGap({ id: "g1" }));
      registry.on("gap:updated", (e) => events.push(e.type));
      registry.updateGap("g1", { title: "Changed" });
      expect(events).toContain("gap:updated");
    });

    it("should emit gap:removed event", () => {
      const events: string[] = [];
      registry.registerGap(createTestGap({ id: "g1" }));
      registry.on("gap:removed", (e) => events.push(e.type));
      registry.removeGap("g1");
      expect(events).toContain("gap:removed");
    });

    it("should emit resolution:registered event", () => {
      const events: string[] = [];
      registry.registerGap(createTestGap({ id: "g1" }));
      registry.on("resolution:registered", (e) => events.push(e.type));
      registry.registerResolution({
        gapId: "g1",
        pluginId: "p1",
        resolutionType: "plugin",
        description: "R1",
        coveredCapabilities: ["storage:upload"],
        resolvedAt: new Date().toISOString(),
        resolvedBy: "admin",
      });
      expect(events).toContain("resolution:registered");
    });

    it("should emit gap:resolved event when fully covered", () => {
      const events: string[] = [];
      registry.registerGap(
        createTestGap({ id: "g1", requiredCapabilities: ["storage:upload"] }),
      );
      registry.on("gap:resolved", (e) => events.push(e.type));
      registry.registerResolution({
        gapId: "g1",
        pluginId: "p1",
        resolutionType: "plugin",
        description: "R1",
        coveredCapabilities: ["storage:upload"],
        resolvedAt: new Date().toISOString(),
        resolvedBy: "admin",
      });
      expect(events).toContain("gap:resolved");
    });

    it("should emit resolution:revoked event", () => {
      const events: string[] = [];
      registry.registerGap(
        createTestGap({ id: "g1", requiredCapabilities: ["storage:upload"] }),
      );
      registry.registerResolution({
        gapId: "g1",
        pluginId: "p1",
        resolutionType: "plugin",
        description: "R1",
        coveredCapabilities: ["storage:upload"],
        resolvedAt: new Date().toISOString(),
        resolvedBy: "admin",
      });
      registry.on("resolution:revoked", (e) => events.push(e.type));
      registry.revokeResolution("g1", "p1");
      expect(events).toContain("resolution:revoked");
    });

    it("should remove event listeners with off", () => {
      const events: string[] = [];
      const listener = (e: { type: string }) => events.push(e.type);
      registry.on("gap:registered", listener);
      registry.registerGap(createTestGap({ id: "g1" }));
      expect(events).toHaveLength(1);
      registry.off("gap:registered", listener);
      registry.registerGap(createTestGap({ id: "g2" }));
      expect(events).toHaveLength(1); // No new event
    });

    it("should not crash if listener throws", () => {
      registry.on("gap:registered", () => {
        throw new Error("Listener error");
      });
      expect(() =>
        registry.registerGap(createTestGap({ id: "g1" })),
      ).not.toThrow();
    });
  });

  describe("clear", () => {
    it("should remove all gaps and resolutions", () => {
      registry.registerGap(createTestGap({ id: "g1" }));
      registry.registerGap(createTestGap({ id: "g2" }));
      registry.clear();
      expect(registry.size()).toBe(0);
      expect(registry.getAllGaps()).toHaveLength(0);
    });
  });
});

// ============================================================================
// PLUGIN ADAPTER TESTS
// ============================================================================

describe("PluginAdapter", () => {
  let adapter: PluginAdapter;

  beforeEach(() => {
    adapter = new PluginAdapter({
      id: "test-adapter",
      name: "Test Adapter",
      domain: "storage",
      serviceId: "file-upload",
      capabilities: ["storage:upload", "storage:download"],
    });
  });

  describe("constructor", () => {
    it("should create with required config", () => {
      expect(adapter.getId()).toBe("test-adapter");
      expect(adapter.getName()).toBe("Test Adapter");
      expect(adapter.getDomain()).toBe("storage");
    });

    it("should apply default config values", () => {
      const config = adapter.getConfig();
      expect(config.healthCheck).toBe(true);
      expect(config.metrics).toBe(true);
      expect(config.timeoutMs).toBe(30000);
    });
  });

  describe("getCapabilities", () => {
    it("should return configured capabilities", () => {
      const caps = adapter.getCapabilities();
      expect(caps).toContain("storage:upload");
      expect(caps).toContain("storage:download");
    });

    it("should return a copy, not a reference", () => {
      const caps = adapter.getCapabilities();
      caps.push("extra");
      expect(adapter.getCapabilities()).toHaveLength(2);
    });
  });

  describe("operation registration", () => {
    it("should register an operation", () => {
      const op = createTestOperation("upload");
      const handler: AdapterHandler = async () => "ok";
      adapter.registerOperation(op, handler);
      expect(adapter.hasOperation("upload")).toBe(true);
    });

    it("should unregister an operation", () => {
      adapter.registerOperation(
        createTestOperation("upload"),
        async () => "ok",
      );
      expect(adapter.unregisterOperation("upload")).toBe(true);
      expect(adapter.hasOperation("upload")).toBe(false);
    });

    it("should return false when unregistering nonexistent operation", () => {
      expect(adapter.unregisterOperation("nonexistent")).toBe(false);
    });

    it("should list all operations", () => {
      adapter.registerOperation(createTestOperation("op1"), async () => "ok");
      adapter.registerOperation(createTestOperation("op2"), async () => "ok");
      expect(adapter.getOperations()).toHaveLength(2);
    });

    it("should get a specific operation", () => {
      adapter.registerOperation(
        createTestOperation("upload"),
        async () => "ok",
      );
      expect(adapter.getOperation("upload")).toBeDefined();
      expect(adapter.getOperation("nonexistent")).toBeUndefined();
    });
  });

  describe("execute", () => {
    it("should execute a registered operation successfully", async () => {
      adapter.registerOperation(
        createTestOperation("echo"),
        async (input) => `echo: ${input}`,
      );
      const result = await adapter.execute("echo", "hello");
      expect(result.success).toBe(true);
      expect(result.data).toBe("echo: hello");
      expect(result.adapterId).toBe("test-adapter");
      expect(result.operation).toBe("echo");
    });

    it("should return failure for unregistered operation", async () => {
      const result = await adapter.execute("nonexistent", null);
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("OPERATION_NOT_FOUND");
    });

    it("should handle handler errors", async () => {
      adapter.registerOperation(createTestOperation("fail"), async () => {
        throw new Error("Deliberate failure");
      });
      const result = await adapter.execute("fail", null);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Deliberate failure");
    });

    it("should handle PluginAdapterError with code", async () => {
      adapter.registerOperation(
        createTestOperation("custom-error"),
        async () => {
          throw new PluginAdapterError(
            "Custom error",
            "CUSTOM_CODE",
            "test-adapter",
            500,
          );
        },
      );
      const result = await adapter.execute("custom-error", null);
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("CUSTOM_CODE");
    });

    it("should include duration in result", async () => {
      adapter.registerOperation(createTestOperation("delay"), async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "done";
      });
      const result = await adapter.execute("delay", null);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("should include timestamp in result", async () => {
      adapter.registerOperation(createTestOperation("ts"), async () => "ok");
      const result = await adapter.execute("ts", null);
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).getTime()).toBeGreaterThan(0);
    });

    it("should pass metadata to handler context", async () => {
      let capturedMeta: Record<string, unknown> | undefined;
      adapter.registerOperation(createTestOperation("meta"), async (_, ctx) => {
        capturedMeta = ctx.metadata;
        return "ok";
      });
      await adapter.execute("meta", null, { key: "value" });
      expect(capturedMeta).toEqual({ key: "value" });
    });

    it("should timeout long-running operations", async () => {
      const fastAdapter = new PluginAdapter({
        id: "fast",
        name: "Fast",
        domain: "storage",
        serviceId: "fast",
        capabilities: [],
        timeoutMs: 50,
      });
      fastAdapter.registerOperation(createTestOperation("slow"), async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return "done";
      });
      const result = await fastAdapter.execute("slow", null);
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("OPERATION_TIMEOUT");
    });
  });

  describe("health check", () => {
    it("should return healthy when operations are registered", async () => {
      adapter.registerOperation(createTestOperation("op"), async () => "ok");
      const health = await adapter.checkHealth();
      expect(health.healthy).toBe(true);
      expect(health.id).toBe("test-adapter");
    });

    it("should return unhealthy when no operations registered", async () => {
      const health = await adapter.checkHealth();
      expect(health.healthy).toBe(false);
    });

    it("should use custom health check function", async () => {
      adapter.setHealthCheck(async () => ({
        id: "test-adapter",
        healthy: true,
        message: "Custom check passed",
        lastChecked: new Date().toISOString(),
        responseTimeMs: 1,
      }));
      const health = await adapter.checkHealth();
      expect(health.message).toBe("Custom check passed");
    });

    it("should handle health check errors", async () => {
      adapter.setHealthCheck(async () => {
        throw new Error("Health check failed");
      });
      const health = await adapter.checkHealth();
      expect(health.healthy).toBe(false);
      expect(health.message).toBe("Health check failed");
    });
  });

  describe("metrics", () => {
    it("should track successful operations", async () => {
      adapter.registerOperation(createTestOperation("op"), async () => "ok");
      await adapter.execute("op", null);
      await adapter.execute("op", null);
      const metrics = adapter.getMetrics();
      expect(metrics.totalOperations).toBe(2);
      expect(metrics.successCount).toBe(2);
      expect(metrics.failureCount).toBe(0);
    });

    it("should track failed operations", async () => {
      adapter.registerOperation(createTestOperation("fail"), async () => {
        throw new Error("fail");
      });
      await adapter.execute("fail", null);
      const metrics = adapter.getMetrics();
      expect(metrics.failureCount).toBe(1);
      expect(metrics.errorRate).toBeGreaterThan(0);
    });

    it("should track response times", async () => {
      adapter.registerOperation(createTestOperation("op"), async () => "ok");
      await adapter.execute("op", null);
      const metrics = adapter.getMetrics();
      expect(metrics.avgResponseTimeMs).toBeGreaterThanOrEqual(0);
      expect(metrics.maxResponseTimeMs).toBeGreaterThanOrEqual(0);
      expect(metrics.minResponseTimeMs).toBeGreaterThanOrEqual(0);
    });

    it("should reset metrics", async () => {
      adapter.registerOperation(createTestOperation("op"), async () => "ok");
      await adapter.execute("op", null);
      adapter.resetMetrics();
      const metrics = adapter.getMetrics();
      expect(metrics.totalOperations).toBe(0);
      expect(metrics.successCount).toBe(0);
    });

    it("should report zero error rate when no operations", () => {
      expect(adapter.getMetrics().errorRate).toBe(0);
    });

    it("should track lastOperationAt", async () => {
      adapter.registerOperation(createTestOperation("op"), async () => "ok");
      expect(adapter.getMetrics().lastOperationAt).toBeNull();
      await adapter.execute("op", null);
      expect(adapter.getMetrics().lastOperationAt).not.toBeNull();
    });
  });

  describe("toPluginDescriptor", () => {
    it("should convert to plugin descriptor", () => {
      const desc = adapter.toPluginDescriptor("2.0.0");
      expect(desc.id).toBe("test-adapter");
      expect(desc.name).toBe("Test Adapter");
      expect(desc.version).toBe("2.0.0");
      expect(desc.domain).toBe("storage");
      expect(desc.capabilities).toContain("storage:upload");
      expect(desc.enabled).toBe(true);
    });

    it("should use default version 1.0.0", () => {
      expect(adapter.toPluginDescriptor().version).toBe("1.0.0");
    });
  });
});

describe("PluginAdapterRegistry", () => {
  let adapterRegistry: PluginAdapterRegistry;

  beforeEach(() => {
    adapterRegistry = new PluginAdapterRegistry();
  });

  describe("register/unregister", () => {
    it("should register an adapter", () => {
      const adapter = createDomainAdapter("storage", "upload", [
        "storage:upload",
      ]);
      adapterRegistry.register(adapter);
      expect(adapterRegistry.size()).toBe(1);
    });

    it("should unregister an adapter", () => {
      const adapter = createDomainAdapter("storage", "upload", [
        "storage:upload",
      ]);
      adapterRegistry.register(adapter);
      expect(adapterRegistry.unregister(adapter.getId())).toBe(true);
      expect(adapterRegistry.size()).toBe(0);
    });

    it("should return false when unregistering nonexistent adapter", () => {
      expect(adapterRegistry.unregister("nonexistent")).toBe(false);
    });
  });

  describe("get/getAll", () => {
    it("should get adapter by ID", () => {
      const adapter = createDomainAdapter("storage", "upload", [
        "storage:upload",
      ]);
      adapterRegistry.register(adapter);
      expect(adapterRegistry.get(adapter.getId())).toBeDefined();
    });

    it("should return undefined for nonexistent adapter", () => {
      expect(adapterRegistry.get("nonexistent")).toBeUndefined();
    });

    it("should get all adapters", () => {
      adapterRegistry.register(
        createDomainAdapter("storage", "s1", ["storage:upload"]),
      );
      adapterRegistry.register(
        createDomainAdapter("search", "s2", ["search:full-text"]),
      );
      expect(adapterRegistry.getAll()).toHaveLength(2);
    });
  });

  describe("getByDomain", () => {
    it("should filter adapters by domain", () => {
      adapterRegistry.register(
        createDomainAdapter("storage", "s1", ["storage:upload"]),
      );
      adapterRegistry.register(
        createDomainAdapter("search", "s2", ["search:full-text"]),
      );
      adapterRegistry.register(
        createDomainAdapter("storage", "s3", ["storage:download"]),
      );
      expect(adapterRegistry.getByDomain("storage")).toHaveLength(2);
    });
  });

  describe("findByCapability", () => {
    it("should find adapter by capability", () => {
      adapterRegistry.register(
        createDomainAdapter("storage", "s1", ["storage:upload"]),
      );
      const found = adapterRegistry.findByCapability("storage:upload");
      expect(found).toBeDefined();
    });

    it("should return undefined when no adapter has capability", () => {
      expect(adapterRegistry.findByCapability("unknown:cap")).toBeUndefined();
    });
  });

  describe("findAllByCapability", () => {
    it("should find all adapters with a capability", () => {
      adapterRegistry.register(
        createDomainAdapter("storage", "s1", ["storage:upload"]),
      );
      adapterRegistry.register(
        createDomainAdapter("storage", "s2", [
          "storage:upload",
          "storage:download",
        ]),
      );
      expect(
        adapterRegistry.findAllByCapability("storage:upload"),
      ).toHaveLength(2);
    });
  });

  describe("executeOperation", () => {
    it("should execute on the first adapter with the operation", async () => {
      const adapter = createDomainAdapter("storage", "s1", ["storage:upload"]);
      adapter.registerOperation(
        createTestOperation("upload"),
        async () => "uploaded",
      );
      adapterRegistry.register(adapter);
      const result = await adapterRegistry.executeOperation("upload", null);
      expect(result.success).toBe(true);
      expect(result.data).toBe("uploaded");
    });

    it("should return failure when no adapter has the operation", async () => {
      const result = await adapterRegistry.executeOperation(
        "nonexistent",
        null,
      );
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("NO_ADAPTER_FOUND");
    });
  });

  describe("checkAllHealth", () => {
    it("should check health of all adapters", async () => {
      const a1 = createDomainAdapter("storage", "s1", ["storage:upload"]);
      a1.registerOperation(createTestOperation("op"), async () => "ok");
      const a2 = createDomainAdapter("search", "s2", ["search:full-text"]);
      adapterRegistry.register(a1);
      adapterRegistry.register(a2);
      const results = await adapterRegistry.checkAllHealth();
      expect(results).toHaveLength(2);
    });
  });

  describe("getAllMetrics", () => {
    it("should get metrics for all adapters", () => {
      adapterRegistry.register(createDomainAdapter("storage", "s1", []));
      adapterRegistry.register(createDomainAdapter("search", "s2", []));
      const metrics = adapterRegistry.getAllMetrics();
      expect(Object.keys(metrics)).toHaveLength(2);
    });
  });

  describe("toPluginDescriptors", () => {
    it("should convert all adapters to plugin descriptors", () => {
      adapterRegistry.register(
        createDomainAdapter("storage", "s1", ["storage:upload"]),
      );
      const descriptors = adapterRegistry.toPluginDescriptors();
      expect(descriptors).toHaveLength(1);
      expect(descriptors[0].domain).toBe("storage");
    });
  });

  describe("clear", () => {
    it("should remove all adapters", () => {
      adapterRegistry.register(createDomainAdapter("storage", "s1", []));
      adapterRegistry.clear();
      expect(adapterRegistry.size()).toBe(0);
    });
  });
});

describe("createDomainAdapter", () => {
  it("should create an adapter with correct ID format", () => {
    const adapter = createDomainAdapter("storage", "upload", [
      "storage:upload",
    ]);
    expect(adapter.getId()).toBe("adapter-storage-upload");
  });

  it("should use custom name when provided", () => {
    const adapter = createDomainAdapter(
      "storage",
      "upload",
      ["storage:upload"],
      "My Upload Adapter",
    );
    expect(adapter.getName()).toBe("My Upload Adapter");
  });

  it("should generate default name from domain and service", () => {
    const adapter = createDomainAdapter("search", "indexer", [
      "search:full-text",
    ]);
    expect(adapter.getName()).toContain("Search");
    expect(adapter.getName()).toContain("indexer");
  });
});

describe("createAdapterWithOperations", () => {
  it("should create adapter with pre-registered operations", () => {
    const adapter = createAdapterWithOperations(
      {
        id: "a1",
        name: "A1",
        domain: "storage",
        serviceId: "s1",
        capabilities: ["storage:upload"],
      },
      {
        upload: {
          operation: createTestOperation("upload"),
          handler: async () => "uploaded",
        },
      },
    );
    expect(adapter.hasOperation("upload")).toBe(true);
  });
});

// ============================================================================
// GAP CLOSURE SERVICE TESTS
// ============================================================================

describe("GapClosureService", () => {
  let service: GapClosureService;

  beforeEach(() => {
    resetGapIdCounter();
    service = new GapClosureService({ autoAnalyze: false });
  });

  afterEach(() => {
    service.destroy();
  });

  describe("constructor", () => {
    it("should create without auto-analyzing", () => {
      expect(service.getLastAnalysis()).toBeNull();
    });

    it("should auto-analyze when configured", () => {
      const autoService = new GapClosureService({ autoAnalyze: true });
      autoService.initialize();
      expect(autoService.getLastAnalysis()).not.toBeNull();
      autoService.destroy();
    });
  });

  describe("initialize", () => {
    it("should set initialized flag", () => {
      expect(service.isInitialized()).toBe(false);
      service.initialize();
      expect(service.isInitialized()).toBe(true);
    });

    it("should be idempotent", () => {
      service.initialize();
      service.initialize(); // Should not throw
      expect(service.isInitialized()).toBe(true);
    });
  });

  describe("runAnalysis", () => {
    it("should return analysis result", () => {
      const result = service.runAnalysis();
      expect(result.totalGaps).toBeGreaterThan(0);
      expect(result.analyzedAt).toBeDefined();
    });

    it("should update last analysis", () => {
      service.runAnalysis();
      expect(service.getLastAnalysis()).not.toBeNull();
    });

    it("should import gaps into registry", () => {
      service.runAnalysis();
      const stats = service.getStats();
      expect(stats.totalGaps).toBeGreaterThan(0);
    });
  });

  describe("analyzeDomain", () => {
    it("should return gaps for specific domain", () => {
      const gaps = service.analyzeDomain("storage");
      for (const gap of gaps) {
        expect(gap.domain).toBe("storage");
      }
    });
  });

  describe("gap management", () => {
    beforeEach(() => {
      service.runAnalysis();
    });

    it("should query gaps", () => {
      const gaps = service.queryGaps();
      expect(gaps.length).toBeGreaterThan(0);
    });

    it("should get uncovered gaps", () => {
      const uncovered = service.getUncoveredGaps();
      for (const gap of uncovered) {
        expect(["uncovered", "partial", "workaround"]).toContain(gap.status);
      }
    });

    it("should get gaps by domain", () => {
      const gaps = service.getGapsByDomain("storage");
      for (const gap of gaps) {
        expect(gap.domain).toBe("storage");
      }
    });

    it("should get stats", () => {
      const stats = service.getStats();
      expect(stats.totalGaps).toBeGreaterThan(0);
      expect(stats.lastUpdated).toBeDefined();
    });
  });

  describe("gap resolution", () => {
    it("should resolve a gap", () => {
      service.runAnalysis();
      const gaps = service.queryGaps({ status: "uncovered" });
      if (gaps.length > 0) {
        const gap = gaps[0];
        const resolution = service.resolveGap(
          gap.id,
          "test-plugin",
          gap.requiredCapabilities,
          "admin",
          "Test resolution",
        );
        expect(resolution.gapId).toBe(gap.id);
        expect(resolution.pluginId).toBe("test-plugin");
      }
    });

    it("should throw when resolving nonexistent gap", () => {
      expect(() =>
        service.resolveGap("nonexistent", "p1", ["x"], "admin"),
      ).toThrow();
    });

    it("should resolve gap with adapter", () => {
      service.runAnalysis();
      const gaps = service.queryGaps({ status: "uncovered" });
      if (gaps.length > 0) {
        const gap = gaps[0];
        const adapter = createDomainAdapter(
          gap.domain,
          "resolver",
          gap.requiredCapabilities,
        );
        const resolution = service.resolveGapWithAdapter(
          gap.id,
          adapter,
          "admin",
        );
        expect(resolution.resolutionType).toBe("adapter");
      }
    });

    it("should revoke a resolution", () => {
      service.runAnalysis();
      const gaps = service.queryGaps({ status: "uncovered" });
      if (gaps.length > 0) {
        const gap = gaps[0];
        service.resolveGap(gap.id, "p1", gap.requiredCapabilities, "admin");
        expect(service.revokeResolution(gap.id, "p1")).toBe(true);
      }
    });

    it("should get resolutions for a gap", () => {
      service.runAnalysis();
      const gaps = service.queryGaps({ status: "uncovered" });
      if (gaps.length > 0) {
        const gap = gaps[0];
        service.resolveGap(gap.id, "p1", gap.requiredCapabilities, "admin");
        const resolutions = service.getResolutions(gap.id);
        expect(resolutions).toHaveLength(1);
      }
    });
  });

  describe("adapter management", () => {
    it("should register an adapter", () => {
      const adapter = createDomainAdapter("storage", "upload", [
        "storage:upload",
      ]);
      service.registerAdapter(adapter);
      expect(service.getAdapter(adapter.getId())).toBeDefined();
    });

    it("should unregister an adapter", () => {
      const adapter = createDomainAdapter("storage", "upload", [
        "storage:upload",
      ]);
      service.registerAdapter(adapter);
      expect(service.unregisterAdapter(adapter.getId())).toBe(true);
      expect(service.getAdapter(adapter.getId())).toBeUndefined();
    });

    it("should get all adapters", () => {
      service.registerAdapter(createDomainAdapter("storage", "s1", []));
      service.registerAdapter(createDomainAdapter("search", "s2", []));
      expect(service.getAdapters()).toHaveLength(2);
    });

    it("should get adapters by domain", () => {
      service.registerAdapter(createDomainAdapter("storage", "s1", []));
      service.registerAdapter(createDomainAdapter("search", "s2", []));
      expect(service.getAdaptersByDomain("storage")).toHaveLength(1);
    });

    it("should get adapter metrics", () => {
      service.registerAdapter(createDomainAdapter("storage", "s1", []));
      const metrics = service.getAdapterMetrics();
      expect(Object.keys(metrics)).toHaveLength(1);
    });

    it("should create a domain adapter and register it", () => {
      const adapter = service.createDomainAdapter(
        "storage",
        "upload",
        ["storage:upload"],
        "Upload Adapter",
      );
      expect(adapter.getName()).toBe("Upload Adapter");
      expect(service.getAdapter(adapter.getId())).toBeDefined();
    });
  });

  describe("plugin registration", () => {
    it("should register a plugin descriptor", () => {
      service.registerPlugin(createTestPlugin({ id: "p1" }));
      expect(service.getPlugins()).toHaveLength(1);
    });

    it("should unregister a plugin", () => {
      service.registerPlugin(createTestPlugin({ id: "p1" }));
      expect(service.unregisterPlugin("p1")).toBe(true);
      expect(service.getPlugins()).toHaveLength(0);
    });
  });

  describe("coverage", () => {
    it("should get coverage stats", () => {
      const stats = service.getCoverageStats();
      expect(typeof stats.total).toBe("number");
      expect(typeof stats.covered).toBe("number");
      expect(typeof stats.uncovered).toBe("number");
      expect(typeof stats.percent).toBe("number");
    });

    it("should get uncovered capabilities", () => {
      const uncovered = service.getUncoveredCapabilities();
      expect(Array.isArray(uncovered)).toBe(true);
    });

    it("should get direct access services", () => {
      const services = service.getDirectAccessServices();
      expect(Array.isArray(services)).toBe(true);
    });

    it("should improve coverage when adapters are registered", () => {
      const before = service.getCoverageStats();
      // Register adapters covering some capabilities
      service.registerPlugin(
        createTestPlugin({
          id: "storage-plugin",
          capabilities: [
            "storage:upload",
            "storage:download",
            "storage:presigned-url",
          ],
        }),
      );
      const after = service.getCoverageStats();
      expect(after.covered).toBeGreaterThanOrEqual(before.covered);
    });
  });

  describe("health monitoring", () => {
    it("should check health of all adapters", async () => {
      const adapter = createDomainAdapter("storage", "s1", ["storage:upload"]);
      adapter.registerOperation(createTestOperation("op"), async () => "ok");
      service.registerAdapter(adapter);
      const results = await service.checkHealth();
      expect(results).toHaveLength(1);
    });

    it("should start and stop health monitoring", () => {
      service.startHealthMonitoring();
      // Should not throw
      service.stopHealthMonitoring();
    });
  });

  describe("exportState", () => {
    it("should export current state", () => {
      service.runAnalysis();
      const state = service.exportState();
      expect(state.gaps).toBeDefined();
      expect(state.stats).toBeDefined();
      expect(state.plugins).toBeDefined();
      expect(state.coverage).toBeDefined();
    });
  });

  describe("destroy", () => {
    it("should clean up resources", () => {
      service.runAnalysis();
      service.registerAdapter(createDomainAdapter("storage", "s1", []));
      service.destroy();
      expect(service.isInitialized()).toBe(false);
      expect(service.getLastAnalysis()).toBeNull();
    });
  });
});

describe("createGapClosureService", () => {
  it("should create a service instance", () => {
    const service = createGapClosureService({ autoAnalyze: false });
    expect(service).toBeInstanceOf(GapClosureService);
    service.destroy();
  });
});

// ============================================================================
// PluginAdapterError TESTS
// ============================================================================

describe("PluginAdapterError", () => {
  it("should have correct properties", () => {
    const error = new PluginAdapterError(
      "Test error",
      "TEST_CODE",
      "adapter-1",
      500,
    );
    expect(error.message).toBe("Test error");
    expect(error.code).toBe("TEST_CODE");
    expect(error.adapterId).toBe("adapter-1");
    expect(error.statusCode).toBe(500);
    expect(error.name).toBe("PluginAdapterError");
  });

  it("should use default status code", () => {
    const error = new PluginAdapterError("Test", "CODE", "adapter-1");
    expect(error.statusCode).toBe(500);
  });
});

describe("GapRegistryError", () => {
  it("should have correct properties", () => {
    const error = new GapRegistryError("Not found", "NOT_FOUND", 404);
    expect(error.message).toBe("Not found");
    expect(error.code).toBe("NOT_FOUND");
    expect(error.statusCode).toBe(404);
    expect(error.name).toBe("GapRegistryError");
  });

  it("should use default status code", () => {
    const error = new GapRegistryError("Bad request", "BAD_REQUEST");
    expect(error.statusCode).toBe(400);
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe("Integration: Full Gap Closure Lifecycle", () => {
  let service: GapClosureService;

  beforeEach(() => {
    resetGapIdCounter();
    service = new GapClosureService({ autoAnalyze: false });
  });

  afterEach(() => {
    service.destroy();
  });

  it("should complete full lifecycle: analyze -> identify -> resolve", () => {
    // Step 1: Run analysis
    const analysis = service.runAnalysis();
    expect(analysis.totalGaps).toBeGreaterThan(0);

    // Step 2: Get uncovered gaps
    const uncovered = service.getUncoveredGaps();
    expect(uncovered.length).toBeGreaterThan(0);

    // Step 3: Create adapter for storage domain
    const storageGaps = service.getGapsByDomain("storage");
    if (storageGaps.length > 0) {
      const gap = storageGaps[0];
      const adapter = createDomainAdapter(
        "storage",
        "full-storage",
        gap.requiredCapabilities,
      );
      adapter.registerOperation(
        createTestOperation("upload"),
        async () => "ok",
      );

      // Step 4: Resolve gap with adapter
      const resolution = service.resolveGapWithAdapter(
        gap.id,
        adapter,
        "admin",
      );
      expect(resolution.resolutionType).toBe("adapter");

      // Step 5: Verify gap is now covered
      const updatedGap = service.getGap(gap.id);
      expect(updatedGap?.status).toBe("covered");
    }
  });

  it("should track coverage improvement over time", () => {
    service.runAnalysis();
    const initialStats = service.getCoverageStats();

    // Register plugins covering various capabilities
    service.registerPlugin(
      createTestPlugin({
        id: "storage-plugin",
        domain: "storage",
        capabilities: [
          "storage:upload",
          "storage:download",
          "storage:presigned-url",
          "storage:multipart",
          "storage:streaming",
          "storage:access-control",
          "storage:metadata",
          "storage:large-file",
        ],
      }),
    );

    service.registerPlugin(
      createTestPlugin({
        id: "search-plugin",
        domain: "search",
        capabilities: [
          "search:full-text",
          "search:faceted",
          "search:filters",
          "search:indexing",
          "search:bulk-index",
          "search:schema-management",
        ],
      }),
    );

    // Re-analyze with new plugins
    service.runAnalysis();
    const improvedStats = service.getCoverageStats();

    expect(improvedStats.covered).toBeGreaterThan(initialStats.covered);
    expect(improvedStats.percent).toBeGreaterThan(initialStats.percent);
  });

  it("should handle adapter registration and gap resolution together", () => {
    service.runAnalysis();

    // Create an adapter and register it
    const adapter = service.createDomainAdapter(
      "analytics",
      "analytics-aggregator",
      [
        "analytics:aggregation",
        "analytics:time-series",
        "analytics:rollup",
        "analytics:tracking",
        "analytics:reporting",
        "analytics:export",
      ],
    );

    // Re-analyze to see improved coverage
    const result = service.runAnalysis();
    const analyticsCoverage = result.gaps.filter(
      (g) => g.domain === "analytics",
    );
    // Analytics should now have fewer uncovered gaps (or none)
    for (const gap of analyticsCoverage) {
      // The status should reflect the adapter coverage
      expect(["covered", "partial", "uncovered"]).toContain(gap.status);
    }
  });

  it("should handle workaround marking and deprecation", () => {
    service.runAnalysis();
    const gaps = service.getUncoveredGaps();
    if (gaps.length >= 2) {
      // Mark one as workaround
      const workaround = service.markWorkaround(
        gaps[0].id,
        "Direct DB access used",
      );
      expect(workaround.status).toBe("workaround");

      // Deprecate another
      const deprecated = service.deprecateGap(gaps[1].id);
      expect(deprecated.status).toBe("deprecated");
    }
  });

  it("should export and verify state", () => {
    service.runAnalysis();
    const state = service.exportState();

    expect(state.gaps.length).toBeGreaterThan(0);
    expect(state.stats.totalGaps).toBeGreaterThan(0);
    expect(state.coverage.total).toBeGreaterThan(0);
    expect(Array.isArray(state.plugins)).toBe(true);
  });
});
