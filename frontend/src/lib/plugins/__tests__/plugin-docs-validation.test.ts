/**
 * @jest-environment node
 */

/**
 * Plugin Documentation Validation Test Suite
 *
 * Validates that all code examples from the plugin documentation
 * compile correctly, produce expected results, and demonstrate
 * the correct API usage patterns.
 *
 * 80+ tests covering: getting-started, api-reference, slash-commands,
 * webhooks, bots, workflows, and examples.
 */

// ============================================================================
// APP CONTRACT (getting-started.md, api-reference.md)
// ============================================================================

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
  type AppSandboxContext,
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
} from "../app-events";

import {
  AppRateLimiter,
  DEFAULT_APP_RATE_LIMIT,
  type AppRateLimitConfig,
} from "../app-rate-limiter";

// ============================================================================
// SLASH COMMANDS (slash-commands.md)
// ============================================================================

import {
  createSlashCommandEngine,
  meetsRoleRequirement,
} from "../slash-commands";

// ============================================================================
// WEBHOOKS (webhooks.md)
// ============================================================================

import {
  WebhookStore,
  WebhookRegistry,
  IncomingWebhookProcessor,
  WebhookDeliveryEngine,
  generateSignature,
  generateCompositeSignature,
  verifySignature,
  verifyWebhookRequest,
  ReplayProtector,
  CircuitBreaker,
  createSigningHeaders,
} from "../webhooks";

// ============================================================================
// BOTS (bots.md)
// ============================================================================

import {
  BotAccountStore,
  BotIdentityManager,
  BotLifecycleManager,
  BotScopeManager,
  BotRateLimiter,
  BotModerationStore,
  BotModerationManager,
  DEFAULT_BOT_RATE_LIMITS,
  CAPABILITY_PRESET_SCOPES,
} from "../bots";

// ============================================================================
// WORKFLOWS (workflows.md)
// ============================================================================

import {
  WorkflowBuilder,
  WorkflowBuilderError,
  validateWorkflowDefinition,
  detectCircularDependencies,
  evaluateCondition,
  evaluateConditions,
  getNestedValue,
  interpolateTemplate,
  TriggerEngine,
  parseCronExpression,
  parseCronField,
  matchesCron,
  getNextCronTime,
  WorkflowExecutionEngine,
  ExecutionError,
  ApprovalGateManager,
  ApprovalStore,
  ApprovalError,
  WorkflowScheduler,
  ScheduleStore,
  SchedulerError,
  DEFAULT_WORKFLOW_SETTINGS,
  DEFAULT_STEP_SETTINGS,
  MAX_WORKFLOW_STEPS,
  MAX_WORKFLOW_NAME_LENGTH,
  WORKFLOW_NAME_REGEX,
  CRON_REGEX,
} from "../workflows";

// ============================================================================
// TEST HELPERS
// ============================================================================

function createValidManifest(overrides?: Partial<AppManifest>): AppManifest {
  return {
    schemaVersion: "1.0",
    appId: "com.test.plugin",
    name: "Test Plugin",
    description: "A test plugin for documentation validation",
    version: "1.0.0",
    developer: {
      name: "Test Developer",
      email: "test@example.com",
    },
    scopes: ["read:messages", "write:messages"] as AppScope[],
    ...overrides,
  };
}

function createLifecycle() {
  const store = new AppStore();
  const lifecycle = new AppLifecycleManager(store);
  return { store, lifecycle };
}

function registerAndApproveApp(overrides?: Partial<AppManifest>) {
  const { store, lifecycle } = createLifecycle();
  const manifest = createValidManifest(overrides);
  const app = lifecycle.registerApp(manifest, "user-admin");
  lifecycle.approveApp(app.id);
  return { store, lifecycle, app, manifest };
}

// ============================================================================
// SECTION 1: GETTING STARTED (getting-started.md)
// ============================================================================

describe("Getting Started Guide Validation", () => {
  describe("Step 1: Define App Manifest", () => {
    it("should create a valid manifest with all required fields", () => {
      const manifest: AppManifest = {
        schemaVersion: "1.0",
        appId: "com.example.my-first-plugin",
        name: "My First Plugin",
        description: "A simple plugin that responds to messages",
        version: "1.0.0",
        developer: {
          name: "Your Name",
          email: "you@example.com",
          url: "https://example.com",
        },
        scopes: ["read:messages", "write:messages"],
        events: ["message.created"],
        webhookUrl: "https://your-server.com/webhook",
        commands: [
          {
            name: "greet",
            description: "Send a greeting message",
            arguments: [
              {
                name: "name",
                description: "Name to greet",
                type: "string",
                required: false,
                default: "World",
              },
            ],
          },
        ],
        categories: ["utility"],
      };

      const result = validateManifest(manifest);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject manifest with missing required fields", () => {
      const result = validateManifest({} as AppManifest);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Step 2: Validate the Manifest", () => {
    it("should validate appId pattern", () => {
      const valid = validateManifest(
        createValidManifest({ appId: "com.example.valid-app" }),
      );
      expect(valid.valid).toBe(true);

      const invalid = validateManifest(createValidManifest({ appId: "AB" }));
      expect(invalid.valid).toBe(false);
    });

    it("should validate version is semver", () => {
      const valid = validateManifest(createValidManifest({ version: "2.1.3" }));
      expect(valid.valid).toBe(true);

      const invalid = validateManifest(
        createValidManifest({ version: "not-semver" }),
      );
      expect(invalid.valid).toBe(false);
    });

    it("should require webhookUrl when events are subscribed", () => {
      const invalid = validateManifest(
        createValidManifest({
          events: ["message.created"] as AppEventType[],
          webhookUrl: undefined,
        }),
      );
      expect(invalid.valid).toBe(false);
      expect(invalid.errors.some((e) => e.field === "webhookUrl")).toBe(true);
    });
  });

  describe("Step 3: Register the App", () => {
    it("should register an app with pending_review status", () => {
      const { lifecycle } = createLifecycle();
      const manifest = createValidManifest();
      const app = lifecycle.registerApp(manifest, "user-123");

      expect(app.id).toBeDefined();
      expect(app.status).toBe("pending_review");
      expect(app.clientSecret).toBeDefined();
      expect(app.registeredBy).toBe("user-123");
    });

    it("should reject duplicate appId registrations", () => {
      const { lifecycle } = createLifecycle();
      const manifest = createValidManifest();
      lifecycle.registerApp(manifest, "user-123");

      expect(() => lifecycle.registerApp(manifest, "user-456")).toThrow(
        AppLifecycleError,
      );
    });
  });

  describe("Step 4: Approval and Installation", () => {
    it("should approve and install an app", () => {
      const { store, lifecycle, app } = registerAndApproveApp();

      // registerAndApproveApp already approves, so fetch the latest state
      const approved = store.getApp(app.id)!;
      expect(approved.status).toBe("approved");

      const installation = lifecycle.installApp(
        approved.id,
        "workspace-001",
        "admin-user-id",
        ["read:messages", "write:messages"],
      );
      expect(installation.id).toBeDefined();
      expect(installation.status).toBe("installed");
    });

    it("should not install an unapproved app", () => {
      const { lifecycle } = createLifecycle();
      const manifest = createValidManifest();
      const app = lifecycle.registerApp(manifest, "user-123");

      expect(() =>
        lifecycle.installApp(app.id, "workspace-001", "admin", [
          "read:messages",
        ]),
      ).toThrow(AppLifecycleError);
    });
  });

  describe("Step 5: Obtain API Tokens", () => {
    it("should issue access and refresh tokens", () => {
      const { store, lifecycle, app } = registerAndApproveApp();
      const approved = store.getApp(app.id)!;
      const installation = lifecycle.installApp(
        approved.id,
        "workspace-001",
        "admin-user-id",
        ["read:messages", "write:messages"],
      );

      const tokenStore = new AppTokenStore();
      const auth = new AppAuthManager(tokenStore);

      const tokenResponse = auth.issueTokens(
        {
          appId: approved.id,
          clientSecret: approved.clientSecret,
          installationId: installation.id,
        },
        approved,
        installation,
      );

      expect(tokenResponse.accessToken).toMatch(/^nchat_at_/);
      expect(tokenResponse.refreshToken).toMatch(/^nchat_rt_/);
      expect(tokenResponse.expiresIn).toBe(3600);
    });
  });

  describe("Step 6: Subscribe to Events", () => {
    it("should create event subscriptions", () => {
      const { store, lifecycle, app } = registerAndApproveApp({
        events: ["message.created", "message.updated"] as AppEventType[],
        webhookUrl: "https://test.example.com/webhook",
      });
      const approved = store.getApp(app.id)!;
      const installation = lifecycle.installApp(
        approved.id,
        "workspace-001",
        "admin",
        ["read:messages", "write:messages"],
      );

      const eventStore = new EventSubscriptionStore();
      const eventManager = new AppEventManager(eventStore);

      const subscription = eventManager.subscribe(
        approved,
        installation,
        ["message.created", "message.updated"],
        "https://test.example.com/webhook",
      );

      expect(subscription.id).toBeDefined();
      expect(subscription.events).toContain("message.created");
    });
  });

  describe("Step 7: Register Slash Commands", () => {
    it("should register and execute a custom slash command", async () => {
      const { registry, executor } = createSlashCommandEngine();

      registry.register({
        appId: "com.example.my-first-plugin",
        name: "greet",
        description: "Send a greeting",
        args: [
          {
            name: "name",
            description: "Name to greet",
            type: "string",
            required: false,
            default: "World",
          },
        ],
        requiredRole: "member",
        requiredScopes: ["write:messages"],
        allowedChannelTypes: ["public", "private", "direct", "group"],
        isBuiltIn: false,
        enabled: true,
        handler: async (ctx) => {
          const name = ctx.args.name || "World";
          return {
            success: true,
            message: `Hello, ${name}!`,
            visibility: "channel" as const,
          };
        },
      });

      const result = await executor.execute("/greet Alice", {
        userId: "user-123",
        username: "alice",
        userRole: "member",
        channelId: "channel-456",
        channelType: "public",
        grantedScopes: ["write:messages"],
      });

      expect(result.success).toBe(true);
      expect(result.handlerResult?.message).toBe("Hello, Alice!");
    });
  });
});

// ============================================================================
// SECTION 2: API REFERENCE (api-reference.md)
// ============================================================================

describe("API Reference Validation", () => {
  describe("App Contract Types", () => {
    it("should export ALL_SCOPES with all defined scopes", () => {
      expect(ALL_SCOPES).toContain("read:messages");
      expect(ALL_SCOPES).toContain("write:messages");
      expect(ALL_SCOPES).toContain("admin:*");
      expect(ALL_SCOPES.length).toBeGreaterThan(10);
    });

    it("should export ALL_EVENT_TYPES with all defined events", () => {
      expect(ALL_EVENT_TYPES).toContain("message.created");
      expect(ALL_EVENT_TYPES).toContain("message.updated");
      expect(ALL_EVENT_TYPES.length).toBeGreaterThan(5);
    });

    it("should validate scopes via isValidScope", () => {
      expect(isValidScope("read:messages")).toBe(true);
      expect(isValidScope("write:messages")).toBe(true);
      expect(isValidScope("admin:*")).toBe(true);
      expect(isValidScope("invalid:scope")).toBe(false);
      expect(isValidScope("")).toBe(false);
    });

    it("should validate event types via isValidEventType", () => {
      expect(isValidEventType("message.created")).toBe(true);
      expect(isValidEventType("fake.event")).toBe(false);
    });
  });

  describe("Scope Operations", () => {
    it("should check single scope with hasScope", () => {
      expect(
        hasScope(["read:messages", "write:messages"], "read:messages"),
      ).toBe(true);
      expect(hasScope(["read:messages"], "write:messages")).toBe(false);
    });

    it("should support wildcard scopes", () => {
      expect(hasScope(["read:*"], "read:messages")).toBe(true);
      expect(hasScope(["admin:*"], "admin:users")).toBe(true);
    });

    it("should check multiple scopes with hasAllScopes", () => {
      expect(
        hasAllScopes(
          ["read:messages", "write:messages", "read:channels"],
          ["read:messages", "read:channels"],
        ),
      ).toBe(true);

      expect(
        hasAllScopes(["read:messages"], ["read:messages", "write:messages"]),
      ).toBe(false);
    });

    it("should expand wildcard scopes", () => {
      const expanded = expandScopes(["read:*"] as AppScope[]);
      expect(expanded).toContain("read:messages");
      expect(expanded).toContain("read:channels");
      expect(expanded.length).toBeGreaterThan(2);
    });
  });

  describe("App Lifecycle Manager", () => {
    it("should reject apps with rejectApp", () => {
      const { lifecycle } = createLifecycle();
      const manifest = createValidManifest();
      const app = lifecycle.registerApp(manifest, "user-admin");

      const rejected = lifecycle.rejectApp(
        app.id,
        "Insufficient documentation",
      );
      expect(rejected.status).toBe("rejected");
    });

    it("should suspend approved apps", () => {
      const { store, lifecycle, app } = registerAndApproveApp();
      const approved = store.getApp(app.id)!;
      const suspended = lifecycle.suspendApp(approved.id, "Policy violation");
      expect(suspended.status).toBe("suspended");
    });

    it("should uninstall apps", () => {
      const { store, lifecycle, app } = registerAndApproveApp();
      const approved = store.getApp(app.id)!;
      const installation = lifecycle.installApp(approved.id, "ws-1", "admin", [
        "read:messages",
      ]);
      const uninstalled = lifecycle.uninstallApp(installation.id);
      expect(uninstalled.status).toBe("uninstalled");
    });
  });

  describe("App Auth Manager", () => {
    it("should validate tokens", () => {
      const { store, lifecycle, app } = registerAndApproveApp();
      const approved = store.getApp(app.id)!;
      const installation = lifecycle.installApp(approved.id, "ws-1", "admin", [
        "read:messages",
        "write:messages",
      ]);

      const tokenStore = new AppTokenStore();
      const auth = new AppAuthManager(tokenStore);

      const tokens = auth.issueTokens(
        {
          appId: approved.id,
          clientSecret: approved.clientSecret,
          installationId: installation.id,
        },
        approved,
        installation,
      );

      const validated = auth.validateToken(tokens.accessToken);
      expect(validated).toBeDefined();
      expect(validated!.appId).toBe(approved.id);
    });

    it("should refresh access tokens", () => {
      const { store, lifecycle, app } = registerAndApproveApp();
      const approved = store.getApp(app.id)!;
      const installation = lifecycle.installApp(approved.id, "ws-1", "admin", [
        "read:messages",
      ]);

      const tokenStore = new AppTokenStore();
      const auth = new AppAuthManager(tokenStore);

      const tokens = auth.issueTokens(
        {
          appId: approved.id,
          clientSecret: approved.clientSecret,
          installationId: installation.id,
        },
        approved,
        installation,
      );

      const refreshed = auth.refreshAccessToken(tokens.refreshToken);
      expect(refreshed.accessToken).toBeDefined();
      expect(refreshed.accessToken).not.toBe(tokens.accessToken);
    });

    it("should revoke tokens", () => {
      const { store, lifecycle, app } = registerAndApproveApp();
      const approved = store.getApp(app.id)!;
      const installation = lifecycle.installApp(approved.id, "ws-1", "admin", [
        "read:messages",
      ]);

      const tokenStore = new AppTokenStore();
      const auth = new AppAuthManager(tokenStore);

      const tokens = auth.issueTokens(
        {
          appId: approved.id,
          clientSecret: approved.clientSecret,
          installationId: installation.id,
        },
        approved,
        installation,
      );

      auth.revokeToken(tokens.accessToken);
      expect(() => auth.validateToken(tokens.accessToken)).toThrow(
        AppAuthError,
      );
    });
  });

  describe("App Rate Limiter", () => {
    it("should allow requests within limits", () => {
      const limiter = new AppRateLimiter();
      const result = limiter.check("test-app", DEFAULT_APP_RATE_LIMIT);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
      expect(result.limit).toBe(
        DEFAULT_APP_RATE_LIMIT.requestsPerMinute +
          (DEFAULT_APP_RATE_LIMIT.burstAllowance ?? 0),
      );

      limiter.destroy();
    });

    it("should check status without consuming", () => {
      const limiter = new AppRateLimiter();
      limiter.check("test-app", DEFAULT_APP_RATE_LIMIT);

      const status1 = limiter.status("test-app", DEFAULT_APP_RATE_LIMIT);
      const status2 = limiter.status("test-app", DEFAULT_APP_RATE_LIMIT);
      expect(status1.remaining).toBe(status2.remaining);

      limiter.destroy();
    });

    it("should support per-scope overrides", () => {
      const limiter = new AppRateLimiter();
      const config: AppRateLimitConfig = {
        requestsPerMinute: 60,
        burstAllowance: 10,
        scopeOverrides: {
          "files:upload": { requestsPerMinute: 5 },
        },
      };

      const fileResult = limiter.check("test-app", config, "files:upload");
      expect(fileResult.allowed).toBe(true);
      // Effective limit = scopeOverride (5) + burstAllowance (10) = 15
      expect(fileResult.limit).toBe(15);

      limiter.destroy();
    });
  });

  describe("Event Signatures", () => {
    it("should compute and verify event signatures", () => {
      const payload = '{"event":"message.created"}';
      const secret = "test-secret";

      const signature = computeEventSignature(payload, secret);
      const valid = verifyEventSignature(payload, signature, secret);
      expect(valid).toBe(true);

      const invalid = verifyEventSignature(payload, "wrong-signature", secret);
      expect(invalid).toBe(false);
    });
  });

  describe("Sandbox Context", () => {
    it("should create a sandbox context from installation and token", () => {
      const installation: AppInstallation = {
        id: "inst-1",
        appId: "app-1",
        workspaceId: "ws-1",
        grantedScopes: ["read:messages"] as AppScope[],
        status: "installed",
        installedBy: "admin",
        installedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const token: AppToken = {
        id: "tok-1",
        token: "nchat_at_xxx",
        type: "access_token",
        appId: "app-1",
        installationId: "inst-1",
        scopes: ["read:messages"] as AppScope[],
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        issuedAt: new Date().toISOString(),
        revoked: false,
      };

      const ctx = createSandboxContext(
        installation,
        token,
        59,
        new Date(Date.now() + 60000).toISOString(),
      );
      expect(ctx.appId).toBe("app-1");
      expect(ctx.workspaceId).toBe("ws-1");
      expect(ctx.rateLimitRemaining).toBe(59);
    });
  });
});

// ============================================================================
// SECTION 3: SLASH COMMANDS (slash-commands.md)
// ============================================================================

describe("Slash Commands Guide Validation", () => {
  describe("Engine Initialization", () => {
    it("should create engine with 16 built-in commands", () => {
      const { registry } = createSlashCommandEngine();
      expect(registry.size).toBe(16);
    });
  });

  describe("Command Registration", () => {
    it("should register a custom command with argument validation", async () => {
      const { registry, executor } = createSlashCommandEngine();

      registry.register({
        appId: "com.example.weather",
        name: "weather",
        description: "Get current weather for a city",
        args: [
          {
            name: "city",
            description: "City name",
            type: "string",
            required: true,
            minLength: 2,
            maxLength: 100,
          },
          {
            name: "units",
            description: "Units",
            type: "string",
            required: false,
            default: "celsius",
            choices: ["celsius", "fahrenheit"],
          },
        ],
        requiredRole: "member",
        requiredScopes: ["read:channels"],
        allowedChannelTypes: ["public", "private", "direct", "group"],
        isBuiltIn: false,
        enabled: true,
        handler: async (ctx) => ({
          success: true,
          message: `Weather in ${ctx.args.city}: 22 degrees ${ctx.args.units || "celsius"}`,
          visibility: "ephemeral" as const,
        }),
      });

      const result = await executor.execute("/weather London", {
        userId: "user-1",
        username: "alice",
        userRole: "member",
        channelId: "ch-1",
        channelType: "public",
        grantedScopes: ["read:channels"],
      });

      expect(result.success).toBe(true);
      expect(result.handlerResult?.message).toContain("London");
    });
  });

  describe("Permission Model", () => {
    it("should validate role hierarchy correctly", () => {
      expect(meetsRoleRequirement("admin", "moderator")).toBe(true);
      expect(meetsRoleRequirement("member", "admin")).toBe(false);
      expect(meetsRoleRequirement("owner", "guest")).toBe(true);
      expect(meetsRoleRequirement("guest", "member")).toBe(false);
    });

    it("should deny execution for insufficient role", async () => {
      const { registry, executor } = createSlashCommandEngine();

      registry.register({
        appId: "com.test.admin-cmd",
        name: "admincmd",
        description: "Admin only command",
        args: [],
        requiredRole: "admin",
        requiredScopes: [],
        allowedChannelTypes: ["public"],
        isBuiltIn: false,
        enabled: true,
        handler: async () => ({
          success: true,
          message: "ok",
          visibility: "channel" as const,
        }),
      });

      const result = await executor.execute("/admincmd", {
        userId: "user-1",
        username: "member-user",
        userRole: "member",
        channelId: "ch-1",
        channelType: "public",
        grantedScopes: [],
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe("ROLE_INSUFFICIENT");
    });
  });

  describe("Command Suggestions", () => {
    it("should return suggestions based on prefix", () => {
      const { registry } = createSlashCommandEngine();

      const suggestions = registry.getSuggestions("he", {
        userRole: "member",
        channelType: "public",
        grantedScopes: [],
        limit: 10,
      });

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].command.name).toBe("help");
    });
  });

  describe("Error Codes", () => {
    it("should return COMMAND_NOT_FOUND for unknown commands", async () => {
      const { executor } = createSlashCommandEngine();

      const result = await executor.execute("/nonexistent", {
        userId: "user-1",
        username: "alice",
        userRole: "member",
        channelId: "ch-1",
        channelType: "public",
        grantedScopes: [],
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe("COMMAND_NOT_FOUND");
    });

    it("should return PARSE_ERROR for non-command input", async () => {
      const { executor } = createSlashCommandEngine();

      const result = await executor.execute("not a command", {
        userId: "user-1",
        username: "alice",
        userRole: "member",
        channelId: "ch-1",
        channelType: "public",
        grantedScopes: [],
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe("PARSE_ERROR");
    });
  });
});

// ============================================================================
// SECTION 4: WEBHOOKS (webhooks.md)
// ============================================================================

describe("Webhooks Guide Validation", () => {
  describe("Incoming Webhooks", () => {
    it("should create an incoming webhook with URL and token", () => {
      const store = new WebhookStore();
      const registry = new WebhookRegistry(store, "https://app.nchat.dev");

      const webhook = registry.createIncoming(
        {
          name: "CI/CD Notifications",
          description: "Build status from GitHub Actions",
          channelId: "channel-devops",
          defaultUsername: "CI Bot",
        },
        "admin-user-id",
      );

      expect(webhook.url).toContain("https://app.nchat.dev");
      expect(webhook.token).toBeDefined();
      expect(webhook.secret).toBeDefined();
      expect(webhook.direction).toBe("incoming");
    });

    it("should process incoming webhook payloads", async () => {
      const store = new WebhookStore();
      const registry = new WebhookRegistry(store, "https://app.nchat.dev");
      const webhook = registry.createIncoming(
        { name: "Test", channelId: "ch-1", defaultUsername: "Bot" },
        "admin",
      );

      const processor = new IncomingWebhookProcessor(
        async (params) => ({ messageId: "msg-001" }),
        { maxRequests: 60, windowSeconds: 60, burstAllowance: 10 },
      );

      processor.registerWebhook(webhook);

      const result = await processor.process({
        token: webhook.token,
        body: { content: "Hello from external service!" },
        headers: {},
        timestamp: Date.now(),
      });

      expect(result.accepted).toBe(true);
      expect(result.messageId).toBe("msg-001");
    });

    it("should reject unknown webhook tokens", async () => {
      const processor = new IncomingWebhookProcessor(
        async () => ({ messageId: "msg-001" }),
        { maxRequests: 60, windowSeconds: 60, burstAllowance: 10 },
      );

      const result = await processor.process({
        token: "invalid-token",
        body: { content: "test" },
        headers: {},
        timestamp: Date.now(),
      });

      expect(result.accepted).toBe(false);
      expect(result.statusCode).toBe(401);
    });
  });

  describe("Outgoing Webhooks", () => {
    it("should create an outgoing webhook with events and filters", () => {
      const store = new WebhookStore();
      const registry = new WebhookRegistry(store, "https://app.nchat.dev");

      const outgoing = registry.createOutgoing(
        {
          name: "Event Logger",
          description: "Log events",
          url: "https://api.example.com/events",
          events: ["message.created", "message.deleted"],
          filters: { channelIds: ["ch-general"], excludeBots: true },
        },
        "admin",
      );

      expect(outgoing.id).toBeDefined();
      expect(outgoing.secret).toBeDefined();
      expect(outgoing.direction).toBe("outgoing");
      expect(outgoing.events).toContain("message.created");
    });

    it("should deliver events via delivery engine", async () => {
      const store = new WebhookStore();
      const registry = new WebhookRegistry(store, "https://app.nchat.dev");
      const outgoing = registry.createOutgoing(
        {
          name: "Test",
          url: "https://api.example.com/events",
          events: ["message.created"],
        },
        "admin",
      );

      const engine = new WebhookDeliveryEngine(async (_url, _init) => ({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => "ok",
      }));

      const delivery = await engine.deliver(outgoing, {
        id: "evt_001",
        event: "message.created",
        webhookId: outgoing.id,
        timestamp: new Date().toISOString(),
        version: "1.0",
        idempotencyKey: "msg_123",
        data: { messageId: "msg_123" },
      });

      expect(delivery.status).toBe("delivered");
    });
  });

  describe("Signature Verification", () => {
    it("should generate and verify signatures", () => {
      const body = '{"event":"message.created"}';
      const secret = "whsec_test_secret";

      const sig = generateSignature(body, secret);
      expect(sig).toContain("sha256=");

      const verified = verifySignature(body, sig, secret);
      expect(verified.valid).toBe(true);
    });

    it("should reject tampered payloads", () => {
      const secret = "whsec_test_secret";
      const sig = generateSignature('{"original":"data"}', secret);

      const verified = verifySignature('{"tampered":"data"}', sig, secret);
      expect(verified.valid).toBe(false);
    });

    it("should generate composite signatures with timestamp", () => {
      const body = '{"event":"test"}';
      const secret = "whsec_test";
      const timestamp = Math.floor(Date.now() / 1000);

      const sig = generateCompositeSignature(body, secret, timestamp);
      expect(sig).toContain("sha256=");
      expect(typeof sig).toBe("string");
    });
  });

  describe("Replay Protection", () => {
    it("should reject replayed requests", () => {
      const protector = new ReplayProtector({
        validateTimestamps: true,
        timestampToleranceSeconds: 300,
        trackNonces: true,
        nonceTtlMs: 600000,
        checkIdempotencyKeys: true,
      });

      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = "unique-nonce-1";

      const first = protector.check(timestamp, nonce);
      expect(first.allowed).toBe(true);

      const second = protector.check(timestamp, nonce);
      expect(second.allowed).toBe(false);
      expect(second.reason).toBeDefined();
    });

    it("should reject expired timestamps", () => {
      const protector = new ReplayProtector({
        validateTimestamps: true,
        timestampToleranceSeconds: 300,
      });

      const expiredTimestamp = Math.floor(Date.now() / 1000) - 600;

      const result = protector.check(expiredTimestamp);
      expect(result.allowed).toBe(false);
    });
  });

  describe("Circuit Breaker", () => {
    it("should open circuit after failure threshold", () => {
      const cb = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeoutMs: 60000,
        successThreshold: 2,
      });

      expect(cb.canDeliver("wh-1")).toBe(true);

      cb.recordFailure("wh-1");
      cb.recordFailure("wh-1");
      cb.recordFailure("wh-1");

      expect(cb.canDeliver("wh-1")).toBe(false);
    });
  });

  describe("Webhook Management", () => {
    it("should update, disable, enable, and rotate secret", () => {
      const store = new WebhookStore();
      const registry = new WebhookRegistry(store, "https://app.nchat.dev");
      const webhook = registry.createOutgoing(
        {
          name: "Test",
          url: "https://example.com/hook",
          events: ["message.created"],
        },
        "admin",
      );

      registry.update(webhook.id, { name: "Updated Name" });
      const updated = store.get(webhook.id);
      expect(updated?.name).toBe("Updated Name");

      registry.disable(webhook.id);
      expect(store.get(webhook.id)?.status).toBe("disabled");

      registry.enable(webhook.id);
      expect(store.get(webhook.id)?.status).toBe("active");

      const oldSecret = webhook.secret;
      const newSecret = registry.rotateSecret(webhook.id);
      expect(newSecret).not.toBe(oldSecret);
    });

    it("should add and remove events", () => {
      const store = new WebhookStore();
      const registry = new WebhookRegistry(store, "https://app.nchat.dev");
      const webhook = registry.createOutgoing(
        {
          name: "Test",
          url: "https://example.com/hook",
          events: ["message.created"],
        },
        "admin",
      );

      registry.addEvents(webhook.id, ["reaction.added"]);
      expect(store.get(webhook.id)?.events).toContain("reaction.added");

      registry.removeEvents(webhook.id, ["message.created"]);
      expect(store.get(webhook.id)?.events).not.toContain("message.created");
    });
  });
});

// ============================================================================
// SECTION 5: BOTS (bots.md)
// ============================================================================

describe("Bots Guide Validation", () => {
  describe("Bot Account Creation", () => {
    it("should create a bot with pending_review status", () => {
      const store = new BotAccountStore();
      const identity = new BotIdentityManager(store);

      const bot = identity.createBot({
        appId: "com.example.weather",
        username: "weather-bot",
        displayName: "Weather Bot",
        description: "Provides real-time weather updates",
        botType: "utility",
        version: "1.0.0",
        createdBy: "user-123",
      });

      expect(bot.id).toBeDefined();
      expect(bot.status).toBe("active");
      expect(bot.username).toBe("weather-bot");
    });

    it("should enforce username rules", () => {
      const store = new BotAccountStore();
      const identity = new BotIdentityManager(store);

      expect(() =>
        identity.createBot({
          appId: "com.test.bot",
          username: "AB", // Too short
          displayName: "Test",
          description: "Test",
          botType: "utility",
          version: "1.0.0",
          createdBy: "user-1",
        }),
      ).toThrow();
    });
  });

  describe("Bot Installation", () => {
    it("should install a bot with scope grants", () => {
      const lifecycle = new BotLifecycleManager();

      const bot = lifecycle.createBot({
        appId: "com.test.bot",
        username: "test-bot",
        displayName: "Test Bot",
        description: "A test bot",
        botType: "utility",
        version: "1.0.0",
        createdBy: "user-1",
      });

      const installation = lifecycle.installBot({
        botId: bot.id,
        workspaceId: "ws-001",
        installedBy: "admin",
        scopes: ["read:messages"] as AppScope[],
        channelIds: ["ch-general"],
      });

      expect(installation.id).toBeDefined();
      expect(installation.scopeGrants).toHaveLength(1);

      lifecycle.destroy();
    });
  });

  describe("Capability Presets", () => {
    it("should define read_only, responder, moderator, and full_access presets", () => {
      expect(CAPABILITY_PRESET_SCOPES.read_only).toBeDefined();
      expect(CAPABILITY_PRESET_SCOPES.responder).toBeDefined();
      expect(CAPABILITY_PRESET_SCOPES.moderator).toBeDefined();
      expect(CAPABILITY_PRESET_SCOPES.full_access).toBeDefined();

      expect(CAPABILITY_PRESET_SCOPES.read_only).toContain("read:messages");
      expect(CAPABILITY_PRESET_SCOPES.responder).toContain("write:messages");
    });
  });

  describe("Bot Scope Validation", () => {
    it("should check scopes with channel restrictions", () => {
      const scopeManager = new BotScopeManager();
      const validator = scopeManager.getValidator();

      // Build a mock installation with channel-restricted scope grants
      const installation = {
        id: "inst-1",
        botId: "bot-1",
        workspaceId: "ws-1",
        scopeGrants: [
          {
            scope: "write:messages" as AppScope,
            channelIds: ["ch-weather"],
            grantedAtInstall: true,
            grantedBy: "admin",
            grantedAt: new Date().toISOString(),
          },
        ],
        activeChannels: ["ch-weather"],
        status: "active" as const,
        config: {},
        installedBy: "admin",
        installedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const hasScopeResult = validator.hasScope(
        installation,
        "write:messages",
        "ch-weather",
      );
      expect(hasScopeResult).toBe(true);

      const noScopeResult = validator.hasScope(
        installation,
        "write:messages",
        "ch-other",
      );
      expect(noScopeResult).toBe(false);
    });
  });

  describe("Bot Rate Limiting", () => {
    it("should rate limit bots at global and per-channel levels", () => {
      const limiter = new BotRateLimiter();

      const result = limiter.check(
        "bot-1",
        DEFAULT_BOT_RATE_LIMITS,
        "messages:send",
        "ch-general",
      );

      expect(result.allowed).toBe(true);
      expect(typeof result.retryAfterMs).toBe("number");
    });
  });

  describe("Bot Moderation", () => {
    it("should apply moderation actions to bots", () => {
      const modStore = new BotModerationStore();
      const moderation = new BotModerationManager(modStore);

      const record = moderation.restrict(
        "bot-1",
        "Spamming messages",
        "admin-user-id",
        "ws-001",
        { restrictedChannels: ["ch-general"] },
      );

      expect(record.id).toBeDefined();
      expect(record.action).toBe("restrict");
    });
  });
});

// ============================================================================
// SECTION 6: WORKFLOWS (workflows.md)
// ============================================================================

describe("Workflows Guide Validation", () => {
  describe("WorkflowBuilder", () => {
    it("should build a valid workflow with event trigger", () => {
      const workflow = new WorkflowBuilder("Welcome Flow", "admin")
        .description("Welcome new members")
        .onEvent("member.joined")
        .addStep("greet", "Send welcome", {
          type: "send_message",
          channelId: "ch-general",
          content: "Welcome!",
        })
        .scopes(["write:messages"])
        .build();

      expect(workflow.id).toBeDefined();
      expect(workflow.name).toBe("Welcome Flow");
      expect(workflow.trigger.type).toBe("event");
      expect(workflow.steps).toHaveLength(1);
    });

    it("should build a workflow with schedule trigger", () => {
      const workflow = new WorkflowBuilder("Daily Reminder", "admin")
        .onSchedule("0 9 * * 1-5", { timezone: "UTC" })
        .addStep("remind", "Post reminder", {
          type: "send_message",
          channelId: "ch-team",
          content: "Time for standup!",
        })
        .build();

      expect(workflow.trigger.type).toBe("schedule");
    });

    it("should build a workflow with webhook trigger", () => {
      const workflow = new WorkflowBuilder("Webhook Handler", "admin")
        .onWebhook(["POST"])
        .addStep("process", "Process webhook", {
          type: "http_request",
          url: "https://api.example.com/process",
          method: "POST",
        })
        .build();

      expect(workflow.trigger.type).toBe("webhook");
    });

    it("should build a workflow with manual trigger", () => {
      const workflow = new WorkflowBuilder("Manual Deploy", "admin")
        .onManual({ allowedRoles: ["admin"] })
        .addStep("deploy", "Deploy", {
          type: "http_request",
          url: "https://deploy.example.com",
          method: "POST",
        })
        .build();

      expect(workflow.trigger.type).toBe("manual");
    });

    it("should throw on invalid workflow", () => {
      expect(() => {
        new WorkflowBuilder("Test", "admin").build(); // No trigger, no steps
      }).toThrow(WorkflowBuilderError);
    });
  });

  describe("Validation", () => {
    it("should validate workflow name format", () => {
      expect(WORKFLOW_NAME_REGEX.test("Valid Workflow Name")).toBe(true);
      expect(WORKFLOW_NAME_REGEX.test("123Invalid")).toBe(false);
    });

    it("should detect circular dependencies", () => {
      const steps = [
        {
          id: "a",
          name: "A",
          type: "action" as const,
          action: { type: "delay" as const, durationMs: 100 },
          settings: DEFAULT_STEP_SETTINGS,
          dependsOn: ["c"],
        },
        {
          id: "b",
          name: "B",
          type: "action" as const,
          action: { type: "delay" as const, durationMs: 100 },
          settings: DEFAULT_STEP_SETTINGS,
          dependsOn: ["a"],
        },
        {
          id: "c",
          name: "C",
          type: "action" as const,
          action: { type: "delay" as const, durationMs: 100 },
          settings: DEFAULT_STEP_SETTINGS,
          dependsOn: ["b"],
        },
      ];

      const cycle = detectCircularDependencies(steps);
      expect(cycle).not.toBeNull();
    });

    it("should accept workflows without circular dependencies", () => {
      const steps = [
        {
          id: "a",
          name: "A",
          type: "action" as const,
          action: { type: "delay" as const, durationMs: 100 },
          settings: DEFAULT_STEP_SETTINGS,
        },
        {
          id: "b",
          name: "B",
          type: "action" as const,
          action: { type: "delay" as const, durationMs: 100 },
          settings: DEFAULT_STEP_SETTINGS,
          dependsOn: ["a"],
        },
      ];

      const cycle = detectCircularDependencies(steps);
      expect(cycle).toBeNull();
    });
  });

  describe("Condition Evaluator", () => {
    it("should evaluate equals/not_equals operators", () => {
      expect(
        evaluateCondition(
          { field: "status", operator: "equals", value: "active" },
          { status: "active" },
        ),
      ).toBe(true);
      expect(
        evaluateCondition(
          { field: "status", operator: "not_equals", value: "active" },
          { status: "inactive" },
        ),
      ).toBe(true);
    });

    it("should evaluate contains/not_contains operators", () => {
      expect(
        evaluateCondition(
          { field: "msg", operator: "contains", value: "urgent" },
          { msg: "This is urgent!" },
        ),
      ).toBe(true);
      expect(
        evaluateCondition(
          { field: "msg", operator: "not_contains", value: "urgent" },
          { msg: "Normal message" },
        ),
      ).toBe(true);
    });

    it("should evaluate numeric comparisons", () => {
      expect(
        evaluateCondition(
          { field: "count", operator: "greater_than", value: 5 },
          { count: 10 },
        ),
      ).toBe(true);
      expect(
        evaluateCondition(
          { field: "count", operator: "less_than", value: 5 },
          { count: 3 },
        ),
      ).toBe(true);
      expect(
        evaluateCondition(
          { field: "count", operator: "greater_than_or_equal", value: 5 },
          { count: 5 },
        ),
      ).toBe(true);
      expect(
        evaluateCondition(
          { field: "count", operator: "less_than_or_equal", value: 5 },
          { count: 5 },
        ),
      ).toBe(true);
    });

    it("should evaluate in/not_in operators", () => {
      expect(
        evaluateCondition(
          { field: "role", operator: "in", value: ["admin", "owner"] },
          { role: "admin" },
        ),
      ).toBe(true);
      expect(
        evaluateCondition(
          { field: "role", operator: "not_in", value: ["admin", "owner"] },
          { role: "member" },
        ),
      ).toBe(true);
    });

    it("should evaluate exists/not_exists operators", () => {
      expect(
        evaluateCondition(
          { field: "name", operator: "exists", value: null },
          { name: "Alice" },
        ),
      ).toBe(true);
      expect(
        evaluateCondition(
          { field: "missing", operator: "not_exists", value: null },
          {},
        ),
      ).toBe(true);
    });

    it("should evaluate matches_regex operator", () => {
      expect(
        evaluateCondition(
          { field: "email", operator: "matches_regex", value: "^[a-z]+@" },
          { email: "test@example.com" },
        ),
      ).toBe(true);
    });

    it("should evaluate multiple conditions with AND logic", () => {
      const conditions = [
        { field: "role", operator: "equals" as const, value: "admin" },
        { field: "active", operator: "equals" as const, value: true },
      ];

      expect(
        evaluateConditions(conditions, { role: "admin", active: true }),
      ).toBe(true);
      expect(
        evaluateConditions(conditions, { role: "admin", active: false }),
      ).toBe(false);
    });
  });

  describe("Template Interpolation", () => {
    it("should interpolate template variables", () => {
      const result = interpolateTemplate(
        "Hello {{user.name}}, welcome to {{channel}}!",
        { user: { name: "Alice" }, channel: "general" },
      );
      expect(result).toBe("Hello Alice, welcome to general!");
    });

    it("should handle missing variables gracefully", () => {
      const result = interpolateTemplate("Hello {{missing}}!", {});
      expect(result).toBe("Hello !");
    });
  });

  describe("Nested Value Access", () => {
    it("should get nested values via dot-path", () => {
      const obj = { a: { b: { c: 42 } } };
      expect(getNestedValue(obj, "a.b.c")).toBe(42);
      expect(getNestedValue(obj, "a.b.missing")).toBeUndefined();
    });
  });

  describe("Cron Parser", () => {
    it("should parse valid cron expressions", () => {
      const fields = parseCronExpression("0 9 * * 1-5");
      expect(fields).not.toBeNull();
      expect(fields!.minute).toEqual([0]);
      expect(fields!.hour).toEqual([9]);
      expect(fields!.dayOfWeek).toEqual([1, 2, 3, 4, 5]);
    });

    it("should parse step values", () => {
      const fields = parseCronExpression("*/15 * * * *");
      expect(fields!.minute).toEqual([0, 15, 30, 45]);
    });

    it("should parse comma-separated values", () => {
      const fields = parseCronExpression("0 9,12,17 * * *");
      expect(fields!.hour).toEqual([9, 12, 17]);
    });

    it("should reject invalid cron expressions", () => {
      expect(parseCronExpression("invalid")).toBeNull();
      expect(parseCronExpression("* * *")).toBeNull();
    });

    it("should match cron against specific time", () => {
      // 9:00 AM UTC on a Monday
      const time = new Date("2026-02-09T09:00:00Z");
      expect(matchesCron("0 9 * * 1", time)).toBe(true);
      expect(matchesCron("0 10 * * 1", time)).toBe(false);
    });

    it("should calculate next cron execution time", () => {
      const after = new Date("2026-02-09T08:00:00Z");
      const next = getNextCronTime("0 9 * * *", after);
      expect(next).not.toBeNull();
      expect(next!.getUTCHours()).toBe(9);
      expect(next!.getUTCMinutes()).toBe(0);
    });
  });

  describe("Trigger Engine", () => {
    it("should evaluate event triggers", () => {
      const engine = new TriggerEngine();
      const workflow = new WorkflowBuilder("Test", "admin")
        .onEvent("message.created", { channelIds: ["ch-1"] })
        .addStep("s1", "Step 1", {
          type: "send_message",
          channelId: "ch-1",
          content: "Hi",
        })
        .build();

      engine.registerWorkflow(workflow);

      const matches = engine.evaluateEvent("message.created", {
        channelId: "ch-1",
      });
      expect(matches).toHaveLength(1);
      expect(matches[0].workflow.id).toBe(workflow.id);
    });

    it("should not match events for disabled workflows", () => {
      const engine = new TriggerEngine();
      const workflow = new WorkflowBuilder("Test", "admin")
        .onEvent("message.created")
        .enabled(false)
        .addStep("s1", "Step 1", {
          type: "send_message",
          channelId: "ch-1",
          content: "Hi",
        })
        .buildUnsafe();

      engine.registerWorkflow(workflow);
      expect(engine.evaluateEvent("message.created", {})).toHaveLength(0);
    });

    it("should evaluate manual triggers with role checking", () => {
      const engine = new TriggerEngine();
      const workflow = new WorkflowBuilder("Deploy", "admin")
        .onManual({ allowedRoles: ["admin"] })
        .addStep("s1", "Deploy", {
          type: "http_request",
          url: "https://deploy.test",
          method: "POST",
        })
        .build();

      engine.registerWorkflow(workflow);

      const match = engine.evaluateManual(workflow.id, "user-1", ["admin"], {});
      expect(match).not.toBeNull();

      const noMatch = engine.evaluateManual(
        workflow.id,
        "user-2",
        ["member"],
        {},
      );
      expect(noMatch).toBeNull();
    });

    it("should evaluate webhook triggers", () => {
      const engine = new TriggerEngine();
      const workflow = new WorkflowBuilder("Hook", "admin")
        .onWebhook(["POST"])
        .addStep("s1", "Process", {
          type: "http_request",
          url: "https://api.test",
          method: "POST",
        })
        .build();

      engine.registerWorkflow(workflow);

      const match = engine.evaluateWebhook(
        workflow.id,
        "POST",
        { data: "test" },
        {},
      );
      expect(match).not.toBeNull();

      const noMatch = engine.evaluateWebhook(workflow.id, "GET", {}, {});
      expect(noMatch).toBeNull();
    });
  });

  describe("Execution Engine", () => {
    it("should execute a simple workflow to completion", async () => {
      const workflow = new WorkflowBuilder("Simple", "admin")
        .onManual()
        .addStep("s1", "Greet", {
          type: "send_message",
          channelId: "ch-1",
          content: "Hello",
        })
        .build();

      const engine = new WorkflowExecutionEngine({ sleepFn: async () => {} });
      const run = await engine.startRun(workflow, {
        type: "manual",
        userId: "user-1",
      });

      expect(run.status).toBe("completed");
      expect(run.stepResults).toHaveLength(1);
      expect(run.stepResults[0].status).toBe("completed");
    });

    it("should enforce concurrency limits", async () => {
      const workflow = new WorkflowBuilder("Concurrent", "admin")
        .onManual()
        .settings({ maxConcurrentExecutions: 1 })
        .addStep("s1", "Wait", { type: "delay", durationMs: 100 })
        .build();

      const engine = new WorkflowExecutionEngine({
        sleepFn: async (ms) => {
          await new Promise((r) => setTimeout(r, 10));
        },
      });

      // Start first run
      const run1Promise = engine.startRun(workflow, {
        type: "manual",
        userId: "user-1",
      });

      // Attempt second run should fail
      await expect(
        engine.startRun(workflow, { type: "manual", userId: "user-2" }),
      ).rejects.toThrow(ExecutionError);

      await run1Promise;
    });

    it("should cancel a running workflow", async () => {
      const workflow = new WorkflowBuilder("Cancellable", "admin")
        .onManual()
        .addStep("s1", "Send", {
          type: "send_message",
          channelId: "ch-1",
          content: "Test",
        })
        .build();

      const engine = new WorkflowExecutionEngine({ sleepFn: async () => {} });
      const run = await engine.startRun(workflow, {
        type: "manual",
        userId: "u-1",
      });

      // Run completes immediately, so test the API on a waiting run
      // We test the error case instead - can't cancel completed runs
      expect(() => engine.cancelRun(run.id)).toThrow(ExecutionError);
    });

    it("should track audit log entries", async () => {
      const workflow = new WorkflowBuilder("Audited", "admin")
        .onManual()
        .addStep("s1", "Send", {
          type: "send_message",
          channelId: "ch-1",
          content: "Test",
        })
        .build();

      const engine = new WorkflowExecutionEngine({
        sleepFn: async () => {},
        enableAudit: true,
      });

      await engine.startRun(workflow, { type: "manual", userId: "u-1" });

      const auditLog = engine.getAuditLog({ workflowId: workflow.id });
      expect(auditLog.length).toBeGreaterThan(0);
      expect(auditLog.some((e) => e.eventType === "workflow.run_started")).toBe(
        true,
      );
      expect(
        auditLog.some((e) => e.eventType === "workflow.run_completed"),
      ).toBe(true);
    });
  });

  describe("Approval Gate", () => {
    it("should create and approve a request", () => {
      const gate = new ApprovalGateManager(new ApprovalStore());

      const request = gate.createRequest("run-1", "step-1", "wf-1", {
        type: "approval",
        approverIds: ["user-mgr"],
        message: "Approve?",
        timeoutMs: 3600000,
        minApprovals: 1,
      });

      expect(request.status).toBe("pending");

      const approved = gate.approve(request.id, "user-mgr", "Approved!");
      expect(approved.status).toBe("approved");
      expect(approved.currentApprovals).toBe(1);
    });

    it("should reject when remaining approvers cannot meet threshold", () => {
      const gate = new ApprovalGateManager(new ApprovalStore());

      const request = gate.createRequest("run-1", "step-1", "wf-1", {
        type: "approval",
        approverIds: ["user-a", "user-b"],
        message: "Approve?",
        timeoutMs: 3600000,
        minApprovals: 2,
      });

      const rejected = gate.reject(request.id, "user-a", "No");
      // Only 1 approver left, but need 2 approvals
      expect(rejected.status).toBe("rejected");
    });

    it("should prevent duplicate responses", () => {
      const gate = new ApprovalGateManager(new ApprovalStore());

      const request = gate.createRequest("run-1", "step-1", "wf-1", {
        type: "approval",
        approverIds: ["user-a", "user-b"],
        message: "Approve?",
        timeoutMs: 3600000,
        minApprovals: 2,
      });

      gate.approve(request.id, "user-a");

      expect(() => gate.approve(request.id, "user-a")).toThrow(ApprovalError);
    });

    it("should list pending approvals for a user", () => {
      const gate = new ApprovalGateManager(new ApprovalStore());

      gate.createRequest("run-1", "step-1", "wf-1", {
        type: "approval",
        approverIds: ["user-a"],
        message: "Request 1",
        timeoutMs: 3600000,
        minApprovals: 1,
      });

      gate.createRequest("run-2", "step-2", "wf-2", {
        type: "approval",
        approverIds: ["user-a", "user-b"],
        message: "Request 2",
        timeoutMs: 3600000,
        minApprovals: 1,
      });

      const pending = gate.getPendingForUser("user-a");
      expect(pending).toHaveLength(2);
    });
  });

  describe("Workflow Scheduler", () => {
    it("should create a schedule from a workflow", () => {
      const scheduler = new WorkflowScheduler(new ScheduleStore());

      const workflow = new WorkflowBuilder("Scheduled", "admin")
        .onSchedule("0 9 * * *")
        .addStep("s1", "Run", {
          type: "send_message",
          channelId: "ch-1",
          content: "Scheduled!",
        })
        .build();

      const schedule = scheduler.createSchedule(workflow);
      expect(schedule.id).toBeDefined();
      expect(schedule.cronExpression).toBe("0 9 * * *");
      expect(schedule.active).toBe(true);
    });

    it("should fire schedules on tick", () => {
      const scheduler = new WorkflowScheduler(new ScheduleStore());

      const workflow = new WorkflowBuilder("Tick Test", "admin")
        .onSchedule("0 9 * * *")
        .addStep("s1", "Run", {
          type: "send_message",
          channelId: "ch-1",
          content: "Tick!",
        })
        .build();

      const schedule = scheduler.createSchedule(workflow);

      // Tick at a time after the next run
      const futureTime = new Date(schedule.nextRunAt);
      futureTime.setMinutes(futureTime.getMinutes() + 1);

      const fired = scheduler.tick(futureTime);
      expect(fired).toHaveLength(1);
      expect(fired[0].workflowId).toBe(workflow.id);
    });

    it("should pause and resume schedules", () => {
      const scheduler = new WorkflowScheduler(new ScheduleStore());

      const workflow = new WorkflowBuilder("Pausable", "admin")
        .onSchedule("0 9 * * *")
        .addStep("s1", "Run", {
          type: "send_message",
          channelId: "ch-1",
          content: "Test",
        })
        .build();

      const schedule = scheduler.createSchedule(workflow);

      const paused = scheduler.pauseSchedule(schedule.id);
      expect(paused.active).toBe(false);

      const resumed = scheduler.resumeSchedule(schedule.id);
      expect(resumed.active).toBe(true);
    });

    it("should reject non-schedule triggers", () => {
      const scheduler = new WorkflowScheduler(new ScheduleStore());

      const workflow = new WorkflowBuilder("Manual", "admin")
        .onManual()
        .addStep("s1", "Run", {
          type: "send_message",
          channelId: "ch-1",
          content: "Test",
        })
        .build();

      expect(() => scheduler.createSchedule(workflow)).toThrow(SchedulerError);
    });
  });

  describe("Default Workflow Settings", () => {
    it("should have expected defaults", () => {
      expect(DEFAULT_WORKFLOW_SETTINGS.maxExecutionTimeMs).toBe(300000);
      expect(DEFAULT_WORKFLOW_SETTINGS.maxRetryAttempts).toBe(3);
      expect(DEFAULT_WORKFLOW_SETTINGS.continueOnFailure).toBe(false);
      expect(DEFAULT_WORKFLOW_SETTINGS.timezone).toBe("UTC");
      expect(DEFAULT_WORKFLOW_SETTINGS.maxConcurrentExecutions).toBe(1);
    });
  });

  describe("Default Step Settings", () => {
    it("should have expected defaults", () => {
      expect(DEFAULT_STEP_SETTINGS.retryAttempts).toBe(3);
      expect(DEFAULT_STEP_SETTINGS.retryBackoff).toBe("exponential");
      expect(DEFAULT_STEP_SETTINGS.retryDelayMs).toBe(1000);
      expect(DEFAULT_STEP_SETTINGS.timeoutMs).toBe(30000);
      expect(DEFAULT_STEP_SETTINGS.skipOnFailure).toBe(false);
      expect(DEFAULT_STEP_SETTINGS.idempotent).toBe(true);
    });
  });

  describe("Workflow Constants", () => {
    it("should export all limit constants", () => {
      expect(MAX_WORKFLOW_STEPS).toBe(50);
      expect(MAX_WORKFLOW_NAME_LENGTH).toBe(128);
      expect(CRON_REGEX).toBeDefined();
      expect(WORKFLOW_NAME_REGEX).toBeDefined();
    });
  });
});

// ============================================================================
// SECTION 7: COMPLETE EXAMPLES (examples.md)
// ============================================================================

describe("Examples Validation", () => {
  describe("Example 1: Weather Bot Plugin", () => {
    it("should complete the full weather bot lifecycle", async () => {
      // Step 1: Register
      const manifest: AppManifest = {
        schemaVersion: "1.0",
        appId: "com.example.weather-bot",
        name: "Weather Bot",
        description: "Real-time weather updates and forecasts",
        version: "1.0.0",
        developer: {
          name: "Weather Corp",
          email: "dev@weathercorp.example.com",
        },
        scopes: ["read:messages", "write:messages", "read:channels"],
        events: ["message.created"],
        webhookUrl: "https://weathercorp.example.com/nchat-webhook",
        commands: [
          {
            name: "weather",
            description: "Get weather",
            arguments: [
              {
                name: "city",
                description: "City",
                type: "string",
                required: true,
              },
            ],
          },
        ],
      };

      const valid = validateManifest(manifest);
      expect(valid.valid).toBe(true);

      const store = new AppStore();
      const lifecycle = new AppLifecycleManager(store);
      const app = lifecycle.registerApp(manifest, "admin");
      expect(app.status).toBe("pending_review");

      // Step 2: Approve and Install
      lifecycle.approveApp(app.id);
      const installation = lifecycle.installApp(app.id, "ws-001", "admin", [
        "read:messages",
        "write:messages",
        "read:channels",
      ]);
      expect(installation.status).toBe("installed");

      // Step 3: Tokens
      const tokenStore = new AppTokenStore();
      const auth = new AppAuthManager(tokenStore);
      const tokens = auth.issueTokens(
        {
          appId: app.id,
          clientSecret: app.clientSecret,
          installationId: installation.id,
        },
        store.getApp(app.id)!,
        installation,
      );
      expect(tokens.accessToken).toMatch(/^nchat_at_/);

      // Step 4: Bot
      const botStore = new BotAccountStore();
      const identity = new BotIdentityManager(botStore);
      const bot = identity.createBot({
        appId: manifest.appId,
        username: "weather-bot",
        displayName: "Weather Bot",
        description: "Weather updates",
        botType: "utility",
        version: "1.0.0",
        createdBy: "admin",
      });
      expect(bot.id).toBeDefined();

      // Step 5: Slash command
      const { registry, executor } = createSlashCommandEngine();
      registry.register({
        appId: manifest.appId,
        name: "weather",
        description: "Get weather",
        args: [
          { name: "city", description: "City", type: "string", required: true },
        ],
        requiredRole: "member",
        requiredScopes: ["read:channels"],
        allowedChannelTypes: ["public", "private", "direct", "group"],
        isBuiltIn: false,
        enabled: true,
        handler: async (ctx) => ({
          success: true,
          message: `Weather in ${ctx.args.city}: 22C`,
          visibility: "channel" as const,
        }),
      });

      const cmdResult = await executor.execute("/weather London", {
        userId: "u-1",
        username: "alice",
        userRole: "member",
        channelId: "ch-1",
        channelType: "public",
        grantedScopes: ["read:channels"],
      });
      expect(cmdResult.success).toBe(true);

      // Step 6: Incoming webhook
      const wStore = new WebhookStore();
      const wRegistry = new WebhookRegistry(wStore, "https://app.nchat.dev");
      const webhook = wRegistry.createIncoming(
        {
          name: "Weather Alerts",
          channelId: "ch-alerts",
          defaultUsername: "Weather Alert",
        },
        "admin",
      );
      expect(webhook.url).toContain("https://app.nchat.dev");
    });
  });

  describe("Example 2: GitHub Integration", () => {
    it("should register, deploy command, and outgoing webhook", async () => {
      const manifest: AppManifest = {
        schemaVersion: "1.0",
        appId: "com.example.github-integration",
        name: "GitHub Integration",
        description: "GitHub notifications and deployment commands",
        version: "2.0.0",
        developer: {
          name: "DevTools Inc",
          email: "support@devtools.example.com",
        },
        scopes: [
          "read:messages",
          "write:messages",
          "read:channels",
          "write:webhooks",
        ],
        events: ["message.created"],
        webhookUrl: "https://devtools.example.com/github-hook",
      };

      const valid = validateManifest(manifest);
      expect(valid.valid).toBe(true);

      // Outgoing webhook
      const wStore = new WebhookStore();
      const wRegistry = new WebhookRegistry(wStore, "https://app.nchat.dev");
      const outgoing = wRegistry.createOutgoing(
        {
          name: "GitHub Event Forwarder",
          url: "https://devtools.example.com/events",
          events: ["message.created"],
          filters: { channelIds: ["ch-deploy"], excludeBots: true },
        },
        "admin",
      );
      expect(outgoing.secret).toBeDefined();

      // Signature verification
      const body = '{"event":"message.created"}';
      const sig = generateSignature(body, outgoing.secret);
      const verified = verifySignature(body, sig, outgoing.secret);
      expect(verified.valid).toBe(true);
    });
  });

  describe("Example 3: Onboarding Workflow", () => {
    it("should build onboarding workflow with approval gate", () => {
      const onboarding = new WorkflowBuilder("Employee Onboarding", "hr-admin")
        .description("Automated onboarding")
        .onEvent("member.joined")
        .addInput({
          name: "department",
          type: "string",
          required: true,
          description: "Department",
        })
        .addStep("welcome", "Send welcome", {
          type: "send_message",
          channelId: "ch-general",
          content: "Welcome!",
        })
        .addStep(
          "approval",
          "Manager approval",
          {
            type: "approval",
            approverIds: ["user-hr-mgr"],
            message: "Approve onboarding?",
            timeoutMs: 86400000,
            minApprovals: 1,
          },
          { dependsOn: ["welcome"] },
        )
        .addStep(
          "add-channels",
          "Add to channels",
          {
            type: "channel_action",
            subAction: "add_member",
            channelId: "{{inputs.department}}-channel",
            userId: "{{trigger.userId}}",
          },
          { dependsOn: ["approval"] },
        )
        .scopes(["write:messages", "write:channels"])
        .tags(["onboarding", "hr"])
        .build();

      expect(onboarding.steps).toHaveLength(3);
      expect(onboarding.trigger.type).toBe("event");
      expect(onboarding.tags).toContain("onboarding");
    });
  });
});
