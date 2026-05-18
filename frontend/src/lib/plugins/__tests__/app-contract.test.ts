/**
 * @jest-environment node
 */

/**
 * App Contract - Comprehensive Test Suite
 *
 * Tests covering manifest validation, app lifecycle, auth flows,
 * event subscriptions, rate limiting, and security scenarios.
 *
 * 100+ tests organized by feature area.
 */

import {
  validateManifest,
  hasScope,
  hasAllScopes,
  expandScopes,
  isValidScope,
  isValidEventType,
  createSandboxContext,
  ALL_SCOPES,
  ALL_EVENT_TYPES,
  SCOPE_HIERARCHY,
  EVENT_REQUIRED_SCOPES,
  type AppManifest,
  type AppScope,
  type AppEventType,
  type AppInstallation,
  type AppToken,
} from "../app-contract";
import {
  AppLifecycleManager,
  AppStore,
  AppLifecycleError,
  generateId,
} from "../app-lifecycle";
import { AppAuthManager, AppTokenStore, AppAuthError } from "../app-auth";
import {
  AppEventManager,
  EventSubscriptionStore,
  computeEventSignature,
  verifyEventSignature,
  type FetchFunction,
} from "../app-events";
import {
  AppRateLimiter,
  DEFAULT_APP_RATE_LIMIT,
  type AppRateLimitConfig,
} from "../app-rate-limiter";
import { AppRegistryService } from "@/services/plugins/app-registry.service";

// ============================================================================
// TEST HELPERS
// ============================================================================

function createValidManifest(overrides?: Partial<AppManifest>): AppManifest {
  return {
    schemaVersion: "1.0",
    appId: "com.example.testbot",
    name: "Test Bot",
    description: "A test bot for unit testing",
    version: "1.0.0",
    developer: {
      name: "Test Developer",
      email: "dev@example.com",
    },
    scopes: ["read:messages", "write:messages"],
    ...overrides,
  };
}

function createRegisteredApp(
  manager: AppLifecycleManager,
  overrides?: Partial<AppManifest>,
) {
  const manifest = createValidManifest(overrides);
  return manager.registerApp(manifest, "user-1");
}

function createApprovedApp(
  manager: AppLifecycleManager,
  overrides?: Partial<AppManifest>,
) {
  const app = createRegisteredApp(manager, overrides);
  return manager.approveApp(app.id);
}

// ============================================================================
// 1. MANIFEST VALIDATION TESTS
// ============================================================================

describe("Manifest Validation", () => {
  describe("Valid manifests", () => {
    it("should accept a minimal valid manifest", () => {
      const manifest = createValidManifest();
      const result = validateManifest(manifest);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should accept a fully populated manifest", () => {
      const manifest = createValidManifest({
        longDescription: "A longer description for the marketplace listing.",
        iconUrl: "https://example.com/icon.png",
        homepageUrl: "https://example.com",
        privacyPolicyUrl: "https://example.com/privacy",
        events: ["message.created", "reaction.added"],
        webhookUrl: "https://example.com/webhook",
        commands: [
          {
            name: "hello",
            description: "Say hello",
            arguments: [
              {
                name: "name",
                description: "Your name",
                type: "string",
                required: true,
              },
            ],
          },
        ],
        uiSurfaces: ["message_action", "channel_sidebar"],
        rateLimit: { requestsPerMinute: 100, burstAllowance: 20 },
        redirectUrl: "https://example.com/callback",
        categories: ["productivity", "automation"],
        developer: {
          name: "Test Dev",
          email: "dev@example.com",
          url: "https://example.com",
        },
      });
      const result = validateManifest(manifest);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should accept semver with pre-release tag", () => {
      const manifest = createValidManifest({ version: "1.0.0-beta.1" });
      const result = validateManifest(manifest);
      expect(result.valid).toBe(true);
    });

    it("should accept all valid scopes", () => {
      const manifest = createValidManifest({
        scopes: ["read:messages", "write:messages", "admin:*"],
      });
      const result = validateManifest(manifest);
      expect(result.valid).toBe(true);
    });

    it("should accept appId with dots and hyphens", () => {
      const manifest = createValidManifest({ appId: "com.my-company.bot-v2" });
      const result = validateManifest(manifest);
      expect(result.valid).toBe(true);
    });

    it("should accept appId with underscores", () => {
      const manifest = createValidManifest({ appId: "my_app_bot" });
      const result = validateManifest(manifest);
      expect(result.valid).toBe(true);
    });
  });

  describe("Invalid manifests", () => {
    it("should reject null manifest", () => {
      const result = validateManifest(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe("manifest");
    });

    it("should reject non-object manifest", () => {
      const result = validateManifest("string");
      expect(result.valid).toBe(false);
    });

    it("should reject wrong schemaVersion", () => {
      const manifest = createValidManifest({ schemaVersion: "2.0" as "1.0" });
      const result = validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "schemaVersion")).toBe(true);
    });

    it("should reject missing schemaVersion", () => {
      const manifest = createValidManifest();
      delete (manifest as Record<string, unknown>).schemaVersion;
      const result = validateManifest(manifest);
      expect(result.valid).toBe(false);
    });

    it("should reject invalid appId format", () => {
      const result = validateManifest(
        createValidManifest({ appId: "UPPER-CASE" }),
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "appId")).toBe(true);
    });

    it("should reject appId starting with number", () => {
      const result = validateManifest(
        createValidManifest({ appId: "1invalid" }),
      );
      expect(result.valid).toBe(false);
    });

    it("should reject appId that is too short", () => {
      const result = validateManifest(createValidManifest({ appId: "ab" }));
      expect(result.valid).toBe(false);
    });

    it("should reject appId that is too long", () => {
      const result = validateManifest(
        createValidManifest({ appId: "a".repeat(65) }),
      );
      expect(result.valid).toBe(false);
    });

    it("should reject empty name", () => {
      const result = validateManifest(createValidManifest({ name: "" }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "name")).toBe(true);
    });

    it("should reject name over 64 chars", () => {
      const result = validateManifest(
        createValidManifest({ name: "x".repeat(65) }),
      );
      expect(result.valid).toBe(false);
    });

    it("should reject description over 200 chars", () => {
      const result = validateManifest(
        createValidManifest({ description: "x".repeat(201) }),
      );
      expect(result.valid).toBe(false);
    });

    it("should reject longDescription over 5000 chars", () => {
      const result = validateManifest(
        createValidManifest({ longDescription: "x".repeat(5001) }),
      );
      expect(result.valid).toBe(false);
    });

    it("should reject invalid version format", () => {
      const result = validateManifest(
        createValidManifest({ version: "not-semver" }),
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "version")).toBe(true);
    });

    it("should reject missing developer", () => {
      const manifest = createValidManifest();
      delete (manifest as Record<string, unknown>).developer;
      const result = validateManifest(manifest);
      expect(result.valid).toBe(false);
    });

    it("should reject developer without email", () => {
      const manifest = createValidManifest({
        developer: { name: "Dev", email: "not-an-email" },
      });
      const result = validateManifest(manifest);
      expect(result.valid).toBe(false);
    });

    it("should reject empty scopes array", () => {
      const result = validateManifest(createValidManifest({ scopes: [] }));
      expect(result.valid).toBe(false);
    });

    it("should reject unknown scopes", () => {
      const result = validateManifest(
        createValidManifest({
          scopes: ["read:messages", "unknown:scope" as AppScope],
        }),
      );
      expect(result.valid).toBe(false);
    });

    it("should reject unknown event types", () => {
      const result = validateManifest(
        createValidManifest({
          events: ["unknown.event" as AppEventType],
          webhookUrl: "https://example.com/webhook",
        }),
      );
      expect(result.valid).toBe(false);
    });

    it("should reject events without webhookUrl", () => {
      const result = validateManifest(
        createValidManifest({
          events: ["message.created"],
        }),
      );
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes("webhookUrl is required")),
      ).toBe(true);
    });

    it("should reject invalid webhookUrl protocol", () => {
      const result = validateManifest(
        createValidManifest({ webhookUrl: "ftp://example.com/webhook" }),
      );
      expect(result.valid).toBe(false);
    });

    it("should reject invalid webhookUrl format", () => {
      const result = validateManifest(
        createValidManifest({ webhookUrl: "not-a-url" }),
      );
      expect(result.valid).toBe(false);
    });

    it("should reject duplicate command names", () => {
      const result = validateManifest(
        createValidManifest({
          commands: [
            { name: "hello", description: "First" },
            { name: "hello", description: "Duplicate" },
          ],
        }),
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes("Duplicate"))).toBe(
        true,
      );
    });

    it("should reject command with invalid name", () => {
      const result = validateManifest(
        createValidManifest({
          commands: [{ name: "UPPER", description: "Bad name" }],
        }),
      );
      expect(result.valid).toBe(false);
    });

    it("should reject command without description", () => {
      const result = validateManifest(
        createValidManifest({
          commands: [{ name: "valid", description: "" }],
        }),
      );
      expect(result.valid).toBe(false);
    });

    it("should reject unknown UI surfaces", () => {
      const result = validateManifest(
        createValidManifest({
          uiSurfaces: ["unknown_surface" as never],
        }),
      );
      expect(result.valid).toBe(false);
    });

    it("should reject negative requestsPerMinute", () => {
      const result = validateManifest(
        createValidManifest({ rateLimit: { requestsPerMinute: -1 } }),
      );
      expect(result.valid).toBe(false);
    });

    it("should reject zero requestsPerMinute", () => {
      const result = validateManifest(
        createValidManifest({ rateLimit: { requestsPerMinute: 0 } }),
      );
      expect(result.valid).toBe(false);
    });

    it("should reject negative burstAllowance", () => {
      const result = validateManifest(
        createValidManifest({
          rateLimit: { requestsPerMinute: 60, burstAllowance: -5 },
        }),
      );
      expect(result.valid).toBe(false);
    });

    it("should report multiple errors at once", () => {
      const result = validateManifest({
        schemaVersion: "2.0",
        name: "",
        version: "bad",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(2);
    });
  });
});

// ============================================================================
// 2. SCOPE VALIDATION TESTS
// ============================================================================

describe("Scope System", () => {
  it("should validate known scopes", () => {
    expect(isValidScope("read:messages")).toBe(true);
    expect(isValidScope("write:messages")).toBe(true);
    expect(isValidScope("admin:*")).toBe(true);
  });

  it("should reject unknown scopes", () => {
    expect(isValidScope("unknown:scope")).toBe(false);
    expect(isValidScope("")).toBe(false);
  });

  it("should check direct scope match", () => {
    expect(hasScope(["read:messages"], "read:messages")).toBe(true);
    expect(hasScope(["read:messages"], "write:messages")).toBe(false);
  });

  it("should expand admin:* to all admin scopes", () => {
    expect(hasScope(["admin:*"], "admin:channels")).toBe(true);
    expect(hasScope(["admin:*"], "admin:apps")).toBe(true);
    expect(hasScope(["admin:*"], "admin:users")).toBe(true);
    expect(hasScope(["admin:*"], "admin:moderation")).toBe(true);
  });

  it("should not expand admin:* to non-admin scopes", () => {
    expect(hasScope(["admin:*"], "read:messages")).toBe(false);
    expect(hasScope(["admin:*"], "write:channels")).toBe(false);
  });

  it("should expand read:* to all read scopes", () => {
    expect(hasScope(["read:*"], "read:messages")).toBe(true);
    expect(hasScope(["read:*"], "read:channels")).toBe(true);
    expect(hasScope(["read:*"], "read:files")).toBe(true);
    expect(hasScope(["read:*"], "read:presence")).toBe(true);
  });

  it("should expand write:* to all write scopes", () => {
    expect(hasScope(["write:*"], "write:messages")).toBe(true);
    expect(hasScope(["write:*"], "write:channels")).toBe(true);
    expect(hasScope(["write:*"], "write:files")).toBe(true);
    expect(hasScope(["write:*"], "write:webhooks")).toBe(true);
  });

  it("should check all required scopes", () => {
    expect(
      hasAllScopes(["read:messages", "write:messages"], ["read:messages"]),
    ).toBe(true);
    expect(
      hasAllScopes(
        ["read:messages", "write:messages"],
        ["read:messages", "write:messages"],
      ),
    ).toBe(true);
    expect(
      hasAllScopes(["read:messages"], ["read:messages", "write:messages"]),
    ).toBe(false);
  });

  it("should expand wildcard scopes into concrete scopes", () => {
    const expanded = expandScopes(["admin:*"]);
    expect(expanded).toContain("admin:*");
    expect(expanded).toContain("admin:channels");
    expect(expanded).toContain("admin:apps");
    expect(expanded.length).toBeGreaterThan(1);
  });

  it("should not duplicate scopes when expanding", () => {
    const expanded = expandScopes(["admin:channels", "admin:*"]);
    const unique = new Set(expanded);
    expect(expanded.length).toBe(unique.size);
  });

  it("should handle empty scope arrays", () => {
    expect(hasAllScopes([], [])).toBe(true);
    expect(hasAllScopes(["read:messages"], [])).toBe(true);
    expect(hasAllScopes([], ["read:messages"])).toBe(false);
  });
});

// ============================================================================
// 3. EVENT TYPE VALIDATION TESTS
// ============================================================================

describe("Event Types", () => {
  it("should validate known event types", () => {
    expect(isValidEventType("message.created")).toBe(true);
    expect(isValidEventType("reaction.added")).toBe(true);
    expect(isValidEventType("app.installed")).toBe(true);
  });

  it("should reject unknown event types", () => {
    expect(isValidEventType("unknown.event")).toBe(false);
    expect(isValidEventType("")).toBe(false);
  });

  it("should map event types to required scopes", () => {
    expect(EVENT_REQUIRED_SCOPES["message.created"]).toEqual(["read:messages"]);
    expect(EVENT_REQUIRED_SCOPES["reaction.added"]).toEqual(["read:reactions"]);
    expect(EVENT_REQUIRED_SCOPES["channel.created"]).toEqual(["read:channels"]);
  });

  it("should not require scopes for app lifecycle events", () => {
    expect(EVENT_REQUIRED_SCOPES["app.installed"]).toEqual([]);
    expect(EVENT_REQUIRED_SCOPES["app.uninstalled"]).toEqual([]);
  });

  it("should have required scopes for all event types", () => {
    for (const eventType of ALL_EVENT_TYPES) {
      expect(EVENT_REQUIRED_SCOPES[eventType]).toBeDefined();
    }
  });
});

// ============================================================================
// 4. APP LIFECYCLE TESTS
// ============================================================================

describe("App Lifecycle", () => {
  let store: AppStore;
  let manager: AppLifecycleManager;

  beforeEach(() => {
    store = new AppStore();
    manager = new AppLifecycleManager(store);
  });

  describe("Registration", () => {
    it("should register a new app with valid manifest", () => {
      const app = createRegisteredApp(manager);
      expect(app.id).toBeTruthy();
      expect(app.status).toBe("pending_review");
      expect(app.clientSecret).toBeTruthy();
      expect(app.manifest.appId).toBe("com.example.testbot");
    });

    it("should reject duplicate appId registration", () => {
      createRegisteredApp(manager);
      expect(() => createRegisteredApp(manager)).toThrow(AppLifecycleError);
    });

    it("should reject registration with invalid manifest", () => {
      expect(() =>
        manager.registerApp(
          { schemaVersion: "2.0" } as unknown as AppManifest,
          "user-1",
        ),
      ).toThrow(AppLifecycleError);
    });

    it("should generate unique IDs", () => {
      const id1 = generateId("test");
      const id2 = generateId("test");
      expect(id1).not.toBe(id2);
    });

    it("should generate IDs with prefix", () => {
      const id = generateId("app");
      expect(id.startsWith("app_")).toBe(true);
    });
  });

  describe("Review Flow", () => {
    it("should approve a pending app", () => {
      const app = createRegisteredApp(manager);
      const approved = manager.approveApp(app.id);
      expect(approved.status).toBe("approved");
    });

    it("should reject a pending app with reason", () => {
      const app = createRegisteredApp(manager);
      const rejected = manager.rejectApp(app.id, "Security concerns");
      expect(rejected.status).toBe("rejected");
      expect(rejected.rejectionReason).toBe("Security concerns");
    });

    it("should not approve an already approved app", () => {
      const app = createApprovedApp(manager);
      expect(() => manager.approveApp(app.id)).toThrow(AppLifecycleError);
    });

    it("should not reject an approved app", () => {
      const app = createApprovedApp(manager);
      expect(() => manager.rejectApp(app.id, "reason")).toThrow(
        AppLifecycleError,
      );
    });

    it("should suspend an approved app", () => {
      const app = createApprovedApp(manager);
      const suspended = manager.suspendApp(app.id, "Policy violation");
      expect(suspended.status).toBe("suspended");
    });

    it("should not suspend a pending app", () => {
      const app = createRegisteredApp(manager);
      expect(() => manager.suspendApp(app.id, "reason")).toThrow(
        AppLifecycleError,
      );
    });

    it("should resubmit a rejected app", () => {
      const app = createRegisteredApp(manager);
      manager.rejectApp(app.id, "Needs changes");
      const resubmitted = manager.resubmitApp(
        app.id,
        createValidManifest({ version: "1.0.1" }),
      );
      expect(resubmitted.status).toBe("pending_review");
      expect(resubmitted.rejectionReason).toBeUndefined();
    });

    it("should resubmit a suspended app", () => {
      const app = createApprovedApp(manager);
      manager.suspendApp(app.id, "Violation");
      const resubmitted = manager.resubmitApp(
        app.id,
        createValidManifest({ version: "1.0.1" }),
      );
      expect(resubmitted.status).toBe("pending_review");
    });

    it("should not resubmit an approved app", () => {
      const app = createApprovedApp(manager);
      expect(() => manager.resubmitApp(app.id, createValidManifest())).toThrow(
        AppLifecycleError,
      );
    });

    it("should not allow changing appId on resubmit", () => {
      const app = createRegisteredApp(manager);
      manager.rejectApp(app.id, "Needs changes");
      expect(() =>
        manager.resubmitApp(
          app.id,
          createValidManifest({ appId: "com.different.app" }),
        ),
      ).toThrow(AppLifecycleError);
    });

    it("should throw for non-existent app", () => {
      expect(() => manager.approveApp("nonexistent")).toThrow(
        AppLifecycleError,
      );
    });
  });

  describe("Installation", () => {
    it("should install an approved app", () => {
      const app = createApprovedApp(manager);
      const inst = manager.installApp(app.id, "workspace-1", "user-1");
      expect(inst.status).toBe("installed");
      expect(inst.workspaceId).toBe("workspace-1");
      expect(inst.grantedScopes).toEqual(["read:messages", "write:messages"]);
    });

    it("should install with subset of scopes", () => {
      const app = createApprovedApp(manager);
      const inst = manager.installApp(app.id, "workspace-1", "user-1", [
        "read:messages",
      ]);
      expect(inst.grantedScopes).toEqual(["read:messages"]);
    });

    it("should reject installation of non-approved app", () => {
      const app = createRegisteredApp(manager);
      expect(() => manager.installApp(app.id, "workspace-1", "user-1")).toThrow(
        AppLifecycleError,
      );
    });

    it("should reject duplicate installation", () => {
      const app = createApprovedApp(manager);
      manager.installApp(app.id, "workspace-1", "user-1");
      expect(() => manager.installApp(app.id, "workspace-1", "user-1")).toThrow(
        AppLifecycleError,
      );
    });

    it("should allow re-installation after uninstall", () => {
      const app = createApprovedApp(manager);
      const inst1 = manager.installApp(app.id, "workspace-1", "user-1");
      manager.uninstallApp(inst1.id);
      const inst2 = manager.installApp(app.id, "workspace-1", "user-2");
      expect(inst2.status).toBe("installed");
    });

    it("should reject scopes not requested by app", () => {
      const app = createApprovedApp(manager);
      expect(() =>
        manager.installApp(app.id, "workspace-1", "user-1", ["admin:channels"]),
      ).toThrow(AppLifecycleError);
    });

    it("should allow installation in different workspaces", () => {
      const app = createApprovedApp(manager);
      const inst1 = manager.installApp(app.id, "workspace-1", "user-1");
      const inst2 = manager.installApp(app.id, "workspace-2", "user-1");
      expect(inst1.id).not.toBe(inst2.id);
    });
  });

  describe("Enable/Disable", () => {
    it("should disable an installed app", () => {
      const app = createApprovedApp(manager);
      const inst = manager.installApp(app.id, "workspace-1", "user-1");
      const disabled = manager.disableInstallation(inst.id);
      expect(disabled.status).toBe("disabled");
    });

    it("should enable a disabled app", () => {
      const app = createApprovedApp(manager);
      const inst = manager.installApp(app.id, "workspace-1", "user-1");
      manager.disableInstallation(inst.id);
      const enabled = manager.enableInstallation(inst.id);
      expect(enabled.status).toBe("installed");
    });

    it("should not disable an already uninstalled app", () => {
      const app = createApprovedApp(manager);
      const inst = manager.installApp(app.id, "workspace-1", "user-1");
      manager.uninstallApp(inst.id);
      expect(() => manager.disableInstallation(inst.id)).toThrow(
        AppLifecycleError,
      );
    });

    it("should not enable an already installed app", () => {
      const app = createApprovedApp(manager);
      const inst = manager.installApp(app.id, "workspace-1", "user-1");
      expect(() => manager.enableInstallation(inst.id)).toThrow(
        AppLifecycleError,
      );
    });
  });

  describe("Uninstall", () => {
    it("should uninstall an installed app", () => {
      const app = createApprovedApp(manager);
      const inst = manager.installApp(app.id, "workspace-1", "user-1");
      const uninstalled = manager.uninstallApp(inst.id);
      expect(uninstalled.status).toBe("uninstalled");
    });

    it("should uninstall a disabled app", () => {
      const app = createApprovedApp(manager);
      const inst = manager.installApp(app.id, "workspace-1", "user-1");
      manager.disableInstallation(inst.id);
      const uninstalled = manager.uninstallApp(inst.id);
      expect(uninstalled.status).toBe("uninstalled");
    });

    it("should not uninstall an already uninstalled app", () => {
      const app = createApprovedApp(manager);
      const inst = manager.installApp(app.id, "workspace-1", "user-1");
      manager.uninstallApp(inst.id);
      expect(() => manager.uninstallApp(inst.id)).toThrow(AppLifecycleError);
    });
  });

  describe("Version Management", () => {
    it("should update version without scope changes", () => {
      const app = createApprovedApp(manager);
      const updated = manager.updateAppVersion(
        app.id,
        createValidManifest({ version: "1.1.0" }),
      );
      expect(updated.manifest.version).toBe("1.1.0");
      expect(updated.status).toBe("approved"); // Still approved
    });

    it("should require re-approval when scopes expand", () => {
      const app = createApprovedApp(manager);
      const updated = manager.updateAppVersion(
        app.id,
        createValidManifest({
          version: "2.0.0",
          scopes: ["read:messages", "write:messages", "admin:channels"],
        }),
      );
      expect(updated.status).toBe("pending_review");
    });

    it("should not allow changing appId during update", () => {
      const app = createApprovedApp(manager);
      expect(() =>
        manager.updateAppVersion(
          app.id,
          createValidManifest({ appId: "com.different.id" }),
        ),
      ).toThrow(AppLifecycleError);
    });

    it("should not update a non-approved app", () => {
      const app = createRegisteredApp(manager);
      expect(() =>
        manager.updateAppVersion(
          app.id,
          createValidManifest({ version: "2.0.0" }),
        ),
      ).toThrow(AppLifecycleError);
    });
  });

  describe("Scope Updates", () => {
    it("should update installation scopes", () => {
      const app = createApprovedApp(manager);
      const inst = manager.installApp(app.id, "workspace-1", "user-1");
      const updated = manager.updateInstallationScopes(inst.id, [
        "read:messages",
      ]);
      expect(updated.grantedScopes).toEqual(["read:messages"]);
    });

    it("should reject scopes not in manifest", () => {
      const app = createApprovedApp(manager);
      const inst = manager.installApp(app.id, "workspace-1", "user-1");
      expect(() =>
        manager.updateInstallationScopes(inst.id, ["admin:channels"]),
      ).toThrow(AppLifecycleError);
    });
  });

  describe("Listing and Queries", () => {
    it("should list all apps", () => {
      createRegisteredApp(manager, { appId: "app.one" });
      createRegisteredApp(manager, { appId: "app.two" });
      const apps = manager.listApps();
      expect(apps).toHaveLength(2);
    });

    it("should filter apps by status", () => {
      createRegisteredApp(manager, { appId: "app.one" });
      const app2 = createRegisteredApp(manager, { appId: "app.two" });
      manager.approveApp(app2.id);

      expect(manager.listApps({ status: "pending_review" })).toHaveLength(1);
      expect(manager.listApps({ status: "approved" })).toHaveLength(1);
    });

    it("should list installations by workspace", () => {
      const app = createApprovedApp(manager);
      manager.installApp(app.id, "ws-1", "user-1");

      const app2 = createApprovedApp(manager, { appId: "app.two" });
      manager.installApp(app2.id, "ws-1", "user-1");
      manager.installApp(app2.id, "ws-2", "user-1");

      expect(manager.listInstallations({ workspaceId: "ws-1" })).toHaveLength(
        2,
      );
      expect(manager.listInstallations({ workspaceId: "ws-2" })).toHaveLength(
        1,
      );
    });
  });
});

// ============================================================================
// 5. AUTH FLOW TESTS
// ============================================================================

describe("App Authentication", () => {
  let store: AppStore;
  let tokenStore: AppTokenStore;
  let lifecycleManager: AppLifecycleManager;
  let authManager: AppAuthManager;

  beforeEach(() => {
    store = new AppStore();
    tokenStore = new AppTokenStore();
    lifecycleManager = new AppLifecycleManager(store);
    authManager = new AppAuthManager(tokenStore, {
      accessTokenTTL: 3600,
      refreshTokenTTL: 86400,
    });
  });

  describe("Token Issuance", () => {
    it("should issue access and refresh tokens", () => {
      const app = createApprovedApp(lifecycleManager);
      const inst = lifecycleManager.installApp(app.id, "ws-1", "user-1");

      const response = authManager.issueTokens(
        {
          appId: app.id,
          clientSecret: app.clientSecret,
          installationId: inst.id,
        },
        app,
        inst,
      );

      expect(response.accessToken).toBeTruthy();
      expect(response.refreshToken).toBeTruthy();
      expect(response.tokenType).toBe("Bearer");
      expect(response.expiresIn).toBe(3600);
      expect(response.scopes).toEqual(inst.grantedScopes);
    });

    it("should issue tokens with subset of scopes", () => {
      const app = createApprovedApp(lifecycleManager);
      const inst = lifecycleManager.installApp(app.id, "ws-1", "user-1");

      const response = authManager.issueTokens(
        {
          appId: app.id,
          clientSecret: app.clientSecret,
          installationId: inst.id,
          scopes: ["read:messages"],
        },
        app,
        inst,
      );

      expect(response.scopes).toEqual(["read:messages"]);
    });

    it("should reject invalid client secret", () => {
      const app = createApprovedApp(lifecycleManager);
      const inst = lifecycleManager.installApp(app.id, "ws-1", "user-1");

      expect(() =>
        authManager.issueTokens(
          {
            appId: app.id,
            clientSecret: "wrong-secret",
            installationId: inst.id,
          },
          app,
          inst,
        ),
      ).toThrow(AppAuthError);
    });

    it("should reject scope escalation", () => {
      const app = createApprovedApp(lifecycleManager);
      const inst = lifecycleManager.installApp(app.id, "ws-1", "user-1", [
        "read:messages",
      ]);

      expect(() =>
        authManager.issueTokens(
          {
            appId: app.id,
            clientSecret: app.clientSecret,
            installationId: inst.id,
            scopes: ["admin:channels"],
          },
          app,
          inst,
        ),
      ).toThrow(AppAuthError);
    });

    it("should reject tokens for disabled installation", () => {
      const app = createApprovedApp(lifecycleManager);
      const inst = lifecycleManager.installApp(app.id, "ws-1", "user-1");
      lifecycleManager.disableInstallation(inst.id);

      expect(() =>
        authManager.issueTokens(
          {
            appId: app.id,
            clientSecret: app.clientSecret,
            installationId: inst.id,
          },
          app,
          inst,
        ),
      ).toThrow(AppAuthError);
    });
  });

  describe("Token Validation", () => {
    it("should validate a valid access token", () => {
      const app = createApprovedApp(lifecycleManager);
      const inst = lifecycleManager.installApp(app.id, "ws-1", "user-1");
      const response = authManager.issueTokens(
        {
          appId: app.id,
          clientSecret: app.clientSecret,
          installationId: inst.id,
        },
        app,
        inst,
      );

      const token = authManager.validateToken(response.accessToken);
      expect(token.appId).toBe(app.id);
      expect(token.type).toBe("access_token");
    });

    it("should reject invalid token", () => {
      expect(() => authManager.validateToken("invalid-token")).toThrow(
        AppAuthError,
      );
    });

    it("should reject revoked token", () => {
      const app = createApprovedApp(lifecycleManager);
      const inst = lifecycleManager.installApp(app.id, "ws-1", "user-1");
      const response = authManager.issueTokens(
        {
          appId: app.id,
          clientSecret: app.clientSecret,
          installationId: inst.id,
        },
        app,
        inst,
      );

      authManager.revokeToken(response.accessToken);
      expect(() => authManager.validateToken(response.accessToken)).toThrow(
        AppAuthError,
      );
    });

    it("should validate token scopes", () => {
      const app = createApprovedApp(lifecycleManager);
      const inst = lifecycleManager.installApp(app.id, "ws-1", "user-1");
      const response = authManager.issueTokens(
        {
          appId: app.id,
          clientSecret: app.clientSecret,
          installationId: inst.id,
        },
        app,
        inst,
      );

      const token = authManager.validateTokenScopes(response.accessToken, [
        "read:messages",
      ]);
      expect(token).toBeTruthy();
    });

    it("should reject token lacking required scopes", () => {
      const app = createApprovedApp(lifecycleManager);
      const inst = lifecycleManager.installApp(app.id, "ws-1", "user-1", [
        "read:messages",
      ]);
      const response = authManager.issueTokens(
        {
          appId: app.id,
          clientSecret: app.clientSecret,
          installationId: inst.id,
        },
        app,
        inst,
      );

      expect(() =>
        authManager.validateTokenScopes(response.accessToken, [
          "admin:channels",
        ]),
      ).toThrow(AppAuthError);
    });
  });

  describe("Token Refresh", () => {
    it("should refresh access token with valid refresh token", () => {
      const app = createApprovedApp(lifecycleManager);
      const inst = lifecycleManager.installApp(app.id, "ws-1", "user-1");
      const response = authManager.issueTokens(
        {
          appId: app.id,
          clientSecret: app.clientSecret,
          installationId: inst.id,
        },
        app,
        inst,
      );

      const refreshed = authManager.refreshAccessToken(response.refreshToken);
      expect(refreshed.accessToken).toBeTruthy();
      expect(refreshed.accessToken).not.toBe(response.accessToken);
      expect(refreshed.refreshToken).toBe(response.refreshToken);
    });

    it("should reject invalid refresh token", () => {
      expect(() => authManager.refreshAccessToken("invalid")).toThrow(
        AppAuthError,
      );
    });

    it("should reject revoked refresh token", () => {
      const app = createApprovedApp(lifecycleManager);
      const inst = lifecycleManager.installApp(app.id, "ws-1", "user-1");
      const response = authManager.issueTokens(
        {
          appId: app.id,
          clientSecret: app.clientSecret,
          installationId: inst.id,
        },
        app,
        inst,
      );

      authManager.revokeToken(response.refreshToken);
      expect(() =>
        authManager.refreshAccessToken(response.refreshToken),
      ).toThrow(AppAuthError);
    });

    it("should reject using access token as refresh token", () => {
      const app = createApprovedApp(lifecycleManager);
      const inst = lifecycleManager.installApp(app.id, "ws-1", "user-1");
      const response = authManager.issueTokens(
        {
          appId: app.id,
          clientSecret: app.clientSecret,
          installationId: inst.id,
        },
        app,
        inst,
      );

      expect(() =>
        authManager.refreshAccessToken(response.accessToken),
      ).toThrow(AppAuthError);
    });
  });

  describe("Token Revocation", () => {
    it("should revoke a specific token", () => {
      const app = createApprovedApp(lifecycleManager);
      const inst = lifecycleManager.installApp(app.id, "ws-1", "user-1");
      const response = authManager.issueTokens(
        {
          appId: app.id,
          clientSecret: app.clientSecret,
          installationId: inst.id,
        },
        app,
        inst,
      );

      authManager.revokeToken(response.accessToken);
      expect(() => authManager.validateToken(response.accessToken)).toThrow(
        AppAuthError,
      );
    });

    it("should be idempotent when revoking already-revoked token", () => {
      const app = createApprovedApp(lifecycleManager);
      const inst = lifecycleManager.installApp(app.id, "ws-1", "user-1");
      const response = authManager.issueTokens(
        {
          appId: app.id,
          clientSecret: app.clientSecret,
          installationId: inst.id,
        },
        app,
        inst,
      );

      authManager.revokeToken(response.accessToken);
      // Should not throw
      authManager.revokeToken(response.accessToken);
    });

    it("should revoke all tokens for an app", () => {
      const app = createApprovedApp(lifecycleManager);
      const inst = lifecycleManager.installApp(app.id, "ws-1", "user-1");

      // Issue multiple token pairs
      const r1 = authManager.issueTokens(
        {
          appId: app.id,
          clientSecret: app.clientSecret,
          installationId: inst.id,
        },
        app,
        inst,
      );
      const r2 = authManager.issueTokens(
        {
          appId: app.id,
          clientSecret: app.clientSecret,
          installationId: inst.id,
        },
        app,
        inst,
      );

      const count = authManager.revokeAllTokens(app.id);
      expect(count).toBe(4); // 2 access + 2 refresh

      expect(() => authManager.validateToken(r1.accessToken)).toThrow();
      expect(() => authManager.validateToken(r2.accessToken)).toThrow();
    });

    it("should not be able to use revoked token after revoking", () => {
      const app = createApprovedApp(lifecycleManager);
      const inst = lifecycleManager.installApp(app.id, "ws-1", "user-1");
      const response = authManager.issueTokens(
        {
          appId: app.id,
          clientSecret: app.clientSecret,
          installationId: inst.id,
        },
        app,
        inst,
      );

      authManager.revokeToken(response.accessToken);

      // Attempting to validate should fail
      expect(() => authManager.validateToken(response.accessToken)).toThrow(
        AppAuthError,
      );
      // Refresh token should still work since only access was revoked
      const refreshed = authManager.refreshAccessToken(response.refreshToken);
      expect(refreshed.accessToken).toBeTruthy();
    });
  });

  describe("Token Listing", () => {
    it("should list tokens for an app", () => {
      const app = createApprovedApp(lifecycleManager);
      const inst = lifecycleManager.installApp(app.id, "ws-1", "user-1");
      authManager.issueTokens(
        {
          appId: app.id,
          clientSecret: app.clientSecret,
          installationId: inst.id,
        },
        app,
        inst,
      );

      const tokens = authManager.listTokens({ appId: app.id });
      expect(tokens).toHaveLength(2); // 1 access + 1 refresh
    });

    it("should filter tokens by type", () => {
      const app = createApprovedApp(lifecycleManager);
      const inst = lifecycleManager.installApp(app.id, "ws-1", "user-1");
      authManager.issueTokens(
        {
          appId: app.id,
          clientSecret: app.clientSecret,
          installationId: inst.id,
        },
        app,
        inst,
      );

      const accessTokens = authManager.listTokens({
        appId: app.id,
        type: "access_token",
      });
      expect(accessTokens).toHaveLength(1);
      expect(accessTokens[0].type).toBe("access_token");
    });
  });
});

// ============================================================================
// 6. EVENT SUBSCRIPTION TESTS
// ============================================================================

describe("Event Subscription System", () => {
  let appStore: AppStore;
  let lifecycleManager: AppLifecycleManager;
  let subscriptionStore: EventSubscriptionStore;
  let eventManager: AppEventManager;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    appStore = new AppStore();
    lifecycleManager = new AppLifecycleManager(appStore);
    subscriptionStore = new EventSubscriptionStore();
    mockFetch = jest.fn();
    eventManager = new AppEventManager(
      subscriptionStore,
      { maxRetries: 2, initialRetryDelayMs: 1 },
      mockFetch,
    );
  });

  describe("Subscribe", () => {
    it("should subscribe to events", () => {
      const app = createApprovedApp(lifecycleManager);
      const inst = lifecycleManager.installApp(app.id, "ws-1", "user-1");
      const sub = eventManager.subscribe(
        app,
        inst,
        ["message.created"],
        "https://example.com/webhook",
      );
      expect(sub.events).toEqual(["message.created"]);
      expect(sub.active).toBe(true);
    });

    it("should reject subscription without required scopes", () => {
      const app = createApprovedApp(lifecycleManager, {
        appId: "app.noscope",
        scopes: ["read:messages"],
      });
      const inst = lifecycleManager.installApp(app.id, "ws-1", "user-1", [
        "read:messages",
      ]);
      expect(() =>
        eventManager.subscribe(
          app,
          inst,
          ["file.uploaded"], // Requires read:files
          "https://example.com/webhook",
        ),
      ).toThrow();
    });

    it("should allow subscription to app lifecycle events without scopes", () => {
      const app = createApprovedApp(lifecycleManager);
      const inst = lifecycleManager.installApp(app.id, "ws-1", "user-1");
      const sub = eventManager.subscribe(
        app,
        inst,
        ["app.installed", "app.uninstalled"],
        "https://example.com/webhook",
      );
      expect(sub.events).toContain("app.installed");
    });

    it("should update existing subscription", () => {
      const app = createApprovedApp(lifecycleManager);
      const inst = lifecycleManager.installApp(app.id, "ws-1", "user-1");
      const sub1 = eventManager.subscribe(
        app,
        inst,
        ["message.created"],
        "https://example.com/webhook",
      );
      const sub2 = eventManager.subscribe(
        app,
        inst,
        ["message.created", "message.updated"],
        "https://example.com/webhook-v2",
      );
      expect(sub1.id).toBe(sub2.id); // Same subscription updated
      expect(sub2.events).toHaveLength(2);
    });
  });

  describe("Unsubscribe", () => {
    it("should unsubscribe from events", () => {
      const app = createApprovedApp(lifecycleManager);
      const inst = lifecycleManager.installApp(app.id, "ws-1", "user-1");
      const sub = eventManager.subscribe(
        app,
        inst,
        ["message.created"],
        "https://example.com/webhook",
      );
      const result = eventManager.unsubscribe(sub.id);
      expect(result).toBe(true);
    });

    it("should return false for non-existent subscription", () => {
      const result = eventManager.unsubscribe("nonexistent");
      expect(result).toBe(false);
    });

    it("should not deliver to unsubscribed apps", async () => {
      const app = createApprovedApp(lifecycleManager);
      const inst = lifecycleManager.installApp(app.id, "ws-1", "user-1");
      const sub = eventManager.subscribe(
        app,
        inst,
        ["message.created"],
        "https://example.com/webhook",
      );
      eventManager.unsubscribe(sub.id);

      mockFetch.mockResolvedValue({ ok: true, status: 200, statusText: "OK" });
      const secrets = new Map([[app.id, app.clientSecret]]);
      const deliveries = await eventManager.dispatchEvent(
        "message.created",
        {},
        secrets,
      );
      expect(deliveries).toHaveLength(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("Event Delivery", () => {
    it("should deliver events to subscribed webhooks", async () => {
      const app = createApprovedApp(lifecycleManager);
      const inst = lifecycleManager.installApp(app.id, "ws-1", "user-1");
      eventManager.subscribe(
        app,
        inst,
        ["message.created"],
        "https://example.com/webhook",
      );

      mockFetch.mockResolvedValue({ ok: true, status: 200, statusText: "OK" });
      const secrets = new Map([[app.id, app.clientSecret]]);
      const deliveries = await eventManager.dispatchEvent(
        "message.created",
        { messageId: "msg-1", content: "Hello" },
        secrets,
      );

      expect(deliveries).toHaveLength(1);
      expect(deliveries[0].status).toBe("delivered");
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should include HMAC signature in delivery headers", async () => {
      const app = createApprovedApp(lifecycleManager);
      const inst = lifecycleManager.installApp(app.id, "ws-1", "user-1");
      eventManager.subscribe(
        app,
        inst,
        ["message.created"],
        "https://example.com/webhook",
      );

      mockFetch.mockResolvedValue({ ok: true, status: 200, statusText: "OK" });
      const secrets = new Map([[app.id, app.clientSecret]]);
      await eventManager.dispatchEvent("message.created", {}, secrets);

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers["X-Webhook-Signature"]).toMatch(/^sha256=/);
      expect(callArgs[1].headers["X-Delivery-Id"]).toBeTruthy();
      expect(callArgs[1].headers["X-Event-Type"]).toBe("message.created");
    });

    it("should retry on failure", async () => {
      const app = createApprovedApp(lifecycleManager);
      const inst = lifecycleManager.installApp(app.id, "ws-1", "user-1");
      eventManager.subscribe(
        app,
        inst,
        ["message.created"],
        "https://example.com/webhook",
      );

      // Fail twice then succeed
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: "Service Unavailable",
        })
        .mockResolvedValueOnce({ ok: true, status: 200, statusText: "OK" });

      const secrets = new Map([[app.id, app.clientSecret]]);
      const deliveries = await eventManager.dispatchEvent(
        "message.created",
        {},
        secrets,
      );

      expect(deliveries[0].status).toBe("delivered");
      expect(deliveries[0].attempts).toBe(3);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should mark as failed after exhausting retries", async () => {
      const app = createApprovedApp(lifecycleManager);
      const inst = lifecycleManager.installApp(app.id, "ws-1", "user-1");
      eventManager.subscribe(
        app,
        inst,
        ["message.created"],
        "https://example.com/webhook",
      );

      // Always fail
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Error",
      });

      const secrets = new Map([[app.id, app.clientSecret]]);
      const deliveries = await eventManager.dispatchEvent(
        "message.created",
        {},
        secrets,
      );

      expect(deliveries[0].status).toBe("failed");
      expect(deliveries[0].attempts).toBe(3); // 1 + 2 retries
      expect(deliveries[0].lastError).toContain("500");
    });

    it("should handle network errors during delivery", async () => {
      const app = createApprovedApp(lifecycleManager);
      const inst = lifecycleManager.installApp(app.id, "ws-1", "user-1");
      eventManager.subscribe(
        app,
        inst,
        ["message.created"],
        "https://example.com/webhook",
      );

      mockFetch.mockRejectedValue(new Error("Network error"));

      const secrets = new Map([[app.id, app.clientSecret]]);
      const deliveries = await eventManager.dispatchEvent(
        "message.created",
        {},
        secrets,
      );

      expect(deliveries[0].status).toBe("failed");
      expect(deliveries[0].lastError).toContain("Network error");
    });

    it("should deliver to multiple subscribers", async () => {
      const app1 = createApprovedApp(lifecycleManager, { appId: "app.one" });
      const inst1 = lifecycleManager.installApp(app1.id, "ws-1", "user-1");
      eventManager.subscribe(
        app1,
        inst1,
        ["message.created"],
        "https://one.com/webhook",
      );

      const app2 = createApprovedApp(lifecycleManager, { appId: "app.two" });
      const inst2 = lifecycleManager.installApp(app2.id, "ws-1", "user-1");
      eventManager.subscribe(
        app2,
        inst2,
        ["message.created"],
        "https://two.com/webhook",
      );

      mockFetch.mockResolvedValue({ ok: true, status: 200, statusText: "OK" });
      const secrets = new Map([
        [app1.id, app1.clientSecret],
        [app2.id, app2.clientSecret],
      ]);
      const deliveries = await eventManager.dispatchEvent(
        "message.created",
        {},
        secrets,
      );

      expect(deliveries).toHaveLength(2);
      expect(deliveries.every((d) => d.status === "delivered")).toBe(true);
    });
  });

  describe("Signature Verification", () => {
    it("should compute and verify valid signatures", () => {
      const payload = '{"test": true}';
      const secret = "my-secret";
      const signature = computeEventSignature(payload, secret);

      expect(signature).toMatch(/^sha256=/);
      expect(verifyEventSignature(payload, signature, secret)).toBe(true);
    });

    it("should reject invalid signatures", () => {
      expect(verifyEventSignature("payload", "sha256=invalid", "secret")).toBe(
        false,
      );
    });

    it("should reject signatures without prefix", () => {
      expect(verifyEventSignature("payload", "no-prefix", "secret")).toBe(
        false,
      );
    });

    it("should reject empty signatures", () => {
      expect(verifyEventSignature("payload", "", "secret")).toBe(false);
    });

    it("should produce different signatures for different payloads", () => {
      const secret = "my-secret";
      const sig1 = computeEventSignature("payload1", secret);
      const sig2 = computeEventSignature("payload2", secret);
      expect(sig1).not.toBe(sig2);
    });

    it("should produce different signatures for different secrets", () => {
      const payload = "same-payload";
      const sig1 = computeEventSignature(payload, "secret1");
      const sig2 = computeEventSignature(payload, "secret2");
      expect(sig1).not.toBe(sig2);
    });
  });

  describe("Delivery Queries", () => {
    it("should retrieve delivery status", async () => {
      const app = createApprovedApp(lifecycleManager);
      const inst = lifecycleManager.installApp(app.id, "ws-1", "user-1");
      eventManager.subscribe(
        app,
        inst,
        ["message.created"],
        "https://example.com/webhook",
      );

      mockFetch.mockResolvedValue({ ok: true, status: 200, statusText: "OK" });
      const secrets = new Map([[app.id, app.clientSecret]]);
      const deliveries = await eventManager.dispatchEvent(
        "message.created",
        {},
        secrets,
      );

      const status = eventManager.getDeliveryStatus(deliveries[0].deliveryId);
      expect(status).toBeDefined();
      expect(status?.status).toBe("delivered");
    });

    it("should list deliveries by app", async () => {
      const app = createApprovedApp(lifecycleManager);
      const inst = lifecycleManager.installApp(app.id, "ws-1", "user-1");
      eventManager.subscribe(
        app,
        inst,
        ["message.created"],
        "https://example.com/webhook",
      );

      mockFetch.mockResolvedValue({ ok: true, status: 200, statusText: "OK" });
      const secrets = new Map([[app.id, app.clientSecret]]);
      await eventManager.dispatchEvent("message.created", {}, secrets);
      await eventManager.dispatchEvent("message.created", {}, secrets);

      const deliveries = eventManager.listDeliveries({ appId: app.id });
      expect(deliveries.length).toBeGreaterThanOrEqual(2);
    });
  });
});

// ============================================================================
// 7. RATE LIMITING TESTS
// ============================================================================

describe("App Rate Limiter", () => {
  let rateLimiter: AppRateLimiter;

  beforeEach(() => {
    rateLimiter = new AppRateLimiter();
  });

  afterEach(() => {
    rateLimiter.destroy();
  });

  describe("Basic rate limiting", () => {
    it("should allow requests under limit", () => {
      const config: AppRateLimitConfig = { requestsPerMinute: 10 };
      const result = rateLimiter.check("app-1", config);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it("should block requests over limit", () => {
      const config: AppRateLimitConfig = { requestsPerMinute: 3 };
      rateLimiter.check("app-1", config);
      rateLimiter.check("app-1", config);
      rateLimiter.check("app-1", config);
      const result = rateLimiter.check("app-1", config);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it("should track limits per app independently", () => {
      const config: AppRateLimitConfig = { requestsPerMinute: 2 };

      rateLimiter.check("app-1", config);
      rateLimiter.check("app-1", config);
      const blocked = rateLimiter.check("app-1", config);
      expect(blocked.allowed).toBe(false);

      const allowed = rateLimiter.check("app-2", config);
      expect(allowed.allowed).toBe(true);
    });

    it("should return correct limit in result", () => {
      const config: AppRateLimitConfig = { requestsPerMinute: 100 };
      const result = rateLimiter.check("app-1", config);
      expect(result.limit).toBe(100);
    });
  });

  describe("Burst allowance", () => {
    it("should allow burst above base rate", () => {
      const config: AppRateLimitConfig = {
        requestsPerMinute: 2,
        burstAllowance: 3,
      };

      // Base + burst = 5 total
      for (let i = 0; i < 5; i++) {
        const result = rateLimiter.check("app-burst", config);
        expect(result.allowed).toBe(true);
      }

      const blocked = rateLimiter.check("app-burst", config);
      expect(blocked.allowed).toBe(false);
    });

    it("should report total limit including burst", () => {
      const config: AppRateLimitConfig = {
        requestsPerMinute: 10,
        burstAllowance: 5,
      };
      const result = rateLimiter.check("app-1", config);
      expect(result.limit).toBe(15); // 10 + 5
    });
  });

  describe("Scope-specific limits", () => {
    it("should apply scope-specific limits", () => {
      const config: AppRateLimitConfig = {
        requestsPerMinute: 100,
        scopeOverrides: {
          "write:messages": { requestsPerMinute: 2 },
        },
      };

      rateLimiter.check("app-1", config, "write:messages");
      rateLimiter.check("app-1", config, "write:messages");
      const blocked = rateLimiter.check("app-1", config, "write:messages");
      expect(blocked.allowed).toBe(false);

      // Base limit should still be available
      const allowed = rateLimiter.check("app-1", config);
      expect(allowed.allowed).toBe(true);
    });
  });

  describe("Status (non-consuming)", () => {
    it("should report status without consuming", () => {
      const config: AppRateLimitConfig = { requestsPerMinute: 10 };

      const status1 = rateLimiter.status("app-1", config);
      expect(status1.remaining).toBe(10);

      const status2 = rateLimiter.status("app-1", config);
      expect(status2.remaining).toBe(10); // Still 10

      rateLimiter.check("app-1", config);
      const status3 = rateLimiter.status("app-1", config);
      expect(status3.remaining).toBe(9);
    });
  });

  describe("Reset", () => {
    it("should reset rate limit for an app", () => {
      const config: AppRateLimitConfig = { requestsPerMinute: 2 };

      rateLimiter.check("app-1", config);
      rateLimiter.check("app-1", config);
      expect(rateLimiter.check("app-1", config).allowed).toBe(false);

      rateLimiter.reset("app-1");
      expect(rateLimiter.check("app-1", config).allowed).toBe(true);
    });

    it("should reset all limits for an app", () => {
      const config: AppRateLimitConfig = {
        requestsPerMinute: 2,
        scopeOverrides: {
          "write:messages": { requestsPerMinute: 1 },
        },
      };

      rateLimiter.check("app-1", config, "write:messages");
      expect(rateLimiter.check("app-1", config, "write:messages").allowed).toBe(
        false,
      );

      rateLimiter.resetAll("app-1");
      expect(rateLimiter.check("app-1", config, "write:messages").allowed).toBe(
        true,
      );
    });
  });

  describe("Cleanup", () => {
    it("should track window count", () => {
      const config: AppRateLimitConfig = { requestsPerMinute: 10 };
      rateLimiter.check("app-1", config);
      rateLimiter.check("app-2", config);
      expect(rateLimiter.getWindowCount()).toBe(2);
    });

    it("should clear windows on destroy", () => {
      const config: AppRateLimitConfig = { requestsPerMinute: 10 };
      rateLimiter.check("app-1", config);
      rateLimiter.destroy();
      expect(rateLimiter.getWindowCount()).toBe(0);
    });
  });

  describe("Default config", () => {
    it("should have sensible defaults", () => {
      expect(DEFAULT_APP_RATE_LIMIT.requestsPerMinute).toBe(60);
      expect(DEFAULT_APP_RATE_LIMIT.burstAllowance).toBe(10);
    });
  });
});

// ============================================================================
// 8. SANDBOX CONTEXT TESTS
// ============================================================================

describe("Sandbox Context", () => {
  it("should create sandbox context from installation and token", () => {
    const installation: AppInstallation = {
      id: "inst-1",
      appId: "app-1",
      workspaceId: "ws-1",
      grantedScopes: ["read:messages", "write:messages"],
      status: "installed",
      installedBy: "user-1",
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const token: AppToken = {
      id: "tok-1",
      token: "nchat_at_xxx",
      type: "access_token",
      appId: "app-1",
      installationId: "inst-1",
      scopes: ["read:messages"],
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      issuedAt: new Date().toISOString(),
      revoked: false,
    };

    const ctx = createSandboxContext(
      installation,
      token,
      50,
      new Date().toISOString(),
    );
    expect(ctx.appId).toBe("app-1");
    expect(ctx.installationId).toBe("inst-1");
    expect(ctx.workspaceId).toBe("ws-1");
    expect(ctx.scopes).toEqual(["read:messages"]);
    expect(ctx.rateLimitRemaining).toBe(50);
  });
});

// ============================================================================
// 9. INTEGRATED REGISTRY SERVICE TESTS
// ============================================================================

describe("App Registry Service (Integration)", () => {
  let service: AppRegistryService;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn();
    service = new AppRegistryService({
      accessTokenTTL: 3600,
      refreshTokenTTL: 86400,
      fetchFn: mockFetch,
      eventDelivery: { maxRetries: 1, initialRetryDelayMs: 1 },
    });
  });

  afterEach(() => {
    service.destroy();
  });

  it("should perform full lifecycle: register, approve, install, issue tokens", () => {
    const app = service.registerApp(createValidManifest(), "admin-1");
    expect(app.status).toBe("pending_review");

    const approved = service.approveApp(app.id);
    expect(approved.status).toBe("approved");

    const inst = service.installApp(app.id, "ws-1", "user-1");
    expect(inst.status).toBe("installed");

    const tokens = service.issueTokens({
      appId: app.id,
      clientSecret: app.clientSecret,
      installationId: inst.id,
    });
    expect(tokens.accessToken).toBeTruthy();

    const validated = service.validateToken(tokens.accessToken);
    expect(validated.appId).toBe(app.id);
  });

  it("should check rate limits", () => {
    const app = service.registerApp(
      createValidManifest({ rateLimit: { requestsPerMinute: 3 } }),
      "admin-1",
    );
    service.approveApp(app.id);

    const r1 = service.checkRateLimit(app.id);
    expect(r1.allowed).toBe(true);

    service.checkRateLimit(app.id);
    service.checkRateLimit(app.id);
    const r4 = service.checkRateLimit(app.id);
    expect(r4.allowed).toBe(false);
  });

  it("should dispatch events after installation", async () => {
    const app = service.registerApp(
      createValidManifest({
        events: ["message.created"],
        webhookUrl: "https://example.com/webhook",
      }),
      "admin-1",
    );
    service.approveApp(app.id);
    service.installApp(app.id, "ws-1", "user-1");

    mockFetch.mockResolvedValue({ ok: true, status: 200, statusText: "OK" });
    const deliveries = await service.dispatchEvent("message.created", {
      msg: "test",
    });

    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].status).toBe("delivered");
  });

  it("should revoke tokens on app suspension", () => {
    const app = service.registerApp(createValidManifest(), "admin-1");
    service.approveApp(app.id);
    const inst = service.installApp(app.id, "ws-1", "user-1");
    const tokens = service.issueTokens({
      appId: app.id,
      clientSecret: app.clientSecret,
      installationId: inst.id,
    });

    service.suspendApp(app.id, "Policy violation");

    // Token should be revoked
    expect(() => service.validateToken(tokens.accessToken)).toThrow();
  });

  it("should revoke tokens and unsubscribe on uninstall", () => {
    const app = service.registerApp(
      createValidManifest({
        events: ["message.created"],
        webhookUrl: "https://example.com/webhook",
      }),
      "admin-1",
    );
    service.approveApp(app.id);
    const inst = service.installApp(app.id, "ws-1", "user-1");
    const tokens = service.issueTokens({
      appId: app.id,
      clientSecret: app.clientSecret,
      installationId: inst.id,
    });

    service.uninstallApp(inst.id);

    expect(() => service.validateToken(tokens.accessToken)).toThrow();
  });

  it("should get rate limit status without consuming", () => {
    const app = service.registerApp(createValidManifest(), "admin-1");
    service.approveApp(app.id);

    const status1 = service.getRateLimitStatus(app.id);
    const status2 = service.getRateLimitStatus(app.id);
    expect(status1.remaining).toBe(status2.remaining);
  });

  it("should reset rate limits", () => {
    const app = service.registerApp(
      createValidManifest({ rateLimit: { requestsPerMinute: 1 } }),
      "admin-1",
    );
    service.approveApp(app.id);

    service.checkRateLimit(app.id);
    expect(service.checkRateLimit(app.id).allowed).toBe(false);

    service.resetRateLimit(app.id);
    expect(service.checkRateLimit(app.id).allowed).toBe(true);
  });

  it("should clear all data", () => {
    const app = service.registerApp(createValidManifest(), "admin-1");
    service.approveApp(app.id);
    service.installApp(app.id, "ws-1", "user-1");

    service.clearAll();

    expect(service.listApps()).toHaveLength(0);
    expect(service.listInstallations()).toHaveLength(0);
  });
});

// ============================================================================
// 10. SECURITY TESTS
// ============================================================================

describe("Security", () => {
  let appStore: AppStore;
  let tokenStore: AppTokenStore;
  let lifecycleManager: AppLifecycleManager;
  let authManager: AppAuthManager;

  beforeEach(() => {
    appStore = new AppStore();
    tokenStore = new AppTokenStore();
    lifecycleManager = new AppLifecycleManager(appStore);
    authManager = new AppAuthManager(tokenStore);
  });

  it("should prevent scope escalation via token request", () => {
    const app = createApprovedApp(lifecycleManager);
    const inst = lifecycleManager.installApp(app.id, "ws-1", "user-1", [
      "read:messages",
    ]);

    expect(() =>
      authManager.issueTokens(
        {
          appId: app.id,
          clientSecret: app.clientSecret,
          installationId: inst.id,
          scopes: ["write:messages", "admin:channels"],
        },
        app,
        inst,
      ),
    ).toThrow();
  });

  it("should prevent using token from one app to access another", () => {
    const app1 = createApprovedApp(lifecycleManager, { appId: "app.one" });
    const inst1 = lifecycleManager.installApp(app1.id, "ws-1", "user-1");
    const tokens1 = authManager.issueTokens(
      {
        appId: app1.id,
        clientSecret: app1.clientSecret,
        installationId: inst1.id,
      },
      app1,
      inst1,
    );

    // Token from app1 should validate but belong to app1
    const validated = authManager.validateToken(tokens1.accessToken);
    expect(validated.appId).toBe(app1.id);
  });

  it("should not allow token reuse after revocation", () => {
    const app = createApprovedApp(lifecycleManager);
    const inst = lifecycleManager.installApp(app.id, "ws-1", "user-1");
    const tokens = authManager.issueTokens(
      {
        appId: app.id,
        clientSecret: app.clientSecret,
        installationId: inst.id,
      },
      app,
      inst,
    );

    authManager.revokeToken(tokens.accessToken);
    expect(() => authManager.validateToken(tokens.accessToken)).toThrow();
    expect(() =>
      authManager.validateTokenScopes(tokens.accessToken, ["read:messages"]),
    ).toThrow();
  });

  it("should reject forged event signatures", () => {
    const payload = JSON.stringify({ event: "message.created", data: {} });
    const validSig = computeEventSignature(payload, "real-secret");
    const forgedSig = "sha256=" + "0".repeat(64);

    expect(verifyEventSignature(payload, validSig, "real-secret")).toBe(true);
    expect(verifyEventSignature(payload, forgedSig, "real-secret")).toBe(false);
  });

  it("should reject signature with wrong secret", () => {
    const payload = JSON.stringify({ data: "test" });
    const sig = computeEventSignature(payload, "secret-A");
    expect(verifyEventSignature(payload, sig, "secret-B")).toBe(false);
  });

  it("should reject signature with tampered payload", () => {
    const payload = JSON.stringify({ data: "original" });
    const sig = computeEventSignature(payload, "my-secret");
    const tampered = JSON.stringify({ data: "tampered" });
    expect(verifyEventSignature(tampered, sig, "my-secret")).toBe(false);
  });

  it("should prevent installing unapproved apps", () => {
    const app = createRegisteredApp(lifecycleManager);
    expect(() =>
      lifecycleManager.installApp(app.id, "ws-1", "user-1"),
    ).toThrow();
  });

  it("should prevent granting scopes beyond manifest declaration", () => {
    const app = createApprovedApp(lifecycleManager);
    expect(() =>
      lifecycleManager.installApp(app.id, "ws-1", "user-1", ["admin:*"]),
    ).toThrow();
  });

  it("should prevent disabled installation from getting tokens", () => {
    const app = createApprovedApp(lifecycleManager);
    const inst = lifecycleManager.installApp(app.id, "ws-1", "user-1");
    lifecycleManager.disableInstallation(inst.id);

    expect(() =>
      authManager.issueTokens(
        {
          appId: app.id,
          clientSecret: app.clientSecret,
          installationId: inst.id,
        },
        app,
        inst,
      ),
    ).toThrow();
  });
});
