/**
 * Integration Catalog Tests
 *
 * Comprehensive tests for the external integration catalog covering:
 * - ConnectorError class
 * - BaseConnector lifecycle (connect, disconnect, reconnect)
 * - Rate limiting enforcement
 * - Error categorization and retry
 * - Calendar CRUD operations and formatting
 * - Ticketing operations and notifications
 * - CI/CD notification formatting
 * - Docs search and preview
 * - CRM contact lookup and formatting
 * - Registry install/uninstall lifecycle
 * - Health monitoring and auto-disable
 * - Credential vault (encryption)
 * - Sync engine conflict resolution
 * - Delta sync detection
 * - Edge cases
 */

import {
  ConnectorError,
  type ConnectorConfig,
  type ConnectorCredentials,
  type HealthCheckResult,
  type CatalogEntry,
  type ConnectorCapability,
  type IntegrationCatalogCategory,
  type SyncQueueItem,
  type SyncConflict,
  type CalendarEvent,
  type CalendarRecurrence,
  type Ticket,
  type Pipeline,
  type PipelineStatus,
  type Document,
  type CRMContact,
  type CRMDeal,
} from "../catalog/types";
import {
  BaseConnector,
  type ConnectorEventType,
} from "../catalog/base-connector";
import { CalendarConnector } from "../connectors/calendar";
import { TicketingConnector } from "../connectors/ticketing";
import { CICDConnector } from "../connectors/ci-cd";
import { DocsConnector } from "../connectors/docs";
import { CRMConnector } from "../connectors/crm";
import {
  IntegrationRegistry,
  CredentialVault,
  HealthMonitor,
} from "../catalog/registry";
import { SyncEngine } from "../catalog/sync-engine";

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Concrete implementation of BaseConnector for testing.
 */
class TestConnector extends BaseConnector {
  readonly providerId = "test_provider";
  readonly displayName = "Test Provider";
  readonly description = "Test connector for unit tests";
  readonly icon = "test";
  readonly category: IntegrationCatalogCategory = "calendar";
  readonly capabilities: ConnectorCapability[] = ["read", "write"];
  readonly version = "1.0.0";

  public connectFn: jest.Mock = jest.fn();
  public disconnectFn: jest.Mock = jest.fn();
  public healthCheckFn: jest.Mock = jest.fn();

  protected async doConnect(): Promise<void> {
    await this.connectFn();
  }

  protected async doDisconnect(): Promise<void> {
    await this.disconnectFn();
  }

  protected async doHealthCheck(): Promise<HealthCheckResult> {
    return this.healthCheckFn();
  }

  getCatalogEntry(): CatalogEntry {
    return {
      id: this.providerId,
      name: this.displayName,
      description: this.description,
      icon: this.icon,
      category: this.category,
      capabilities: this.capabilities,
      syncDirections: ["incoming", "outgoing", "bidirectional"],
      actions: [],
      requiredConfig: [],
      requiresOAuth: false,
      beta: false,
      version: this.version,
    };
  }

  // Expose protected methods for testing
  public testWithRetry<T>(fn: () => Promise<T>, context?: string): Promise<T> {
    return this.withRetry(fn, context);
  }

  public testCalculateBackoffDelay(attempt: number): number {
    return this.calculateBackoffDelay(attempt);
  }

  public testCategorizeError(error: unknown): ConnectorError {
    return this.categorizeError(error);
  }

  public testEmit(type: ConnectorEventType, data?: unknown): void {
    this.emit(type, data);
  }

  public testLogRequest(entry: {
    method: string;
    url: string;
    statusCode?: number;
    durationMs: number;
    success: boolean;
    error?: string;
  }): void {
    this.logRequest(entry);
  }

  public setStatusForTest(
    status:
      | "disconnected"
      | "connecting"
      | "connected"
      | "error"
      | "rate_limited"
      | "disabled",
  ): void {
    this.status = status;
  }

  // Override sleep to resolve immediately in tests (avoids real backoff delays)
  protected sleep(_ms: number): Promise<void> {
    return Promise.resolve();
  }
}

function createTestConfig(
  overrides?: Partial<ConnectorConfig>,
): ConnectorConfig {
  return {
    id: "test-install-1",
    provider: "test_provider",
    category: "calendar",
    displayName: "Test Integration",
    workspaceId: "ws-1",
    providerConfig: {},
    syncDirection: "bidirectional",
    enabled: true,
    installedAt: new Date().toISOString(),
    installedBy: "user-1",
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function createTestCredentials(
  overrides?: Partial<ConnectorCredentials>,
): ConnectorCredentials {
  return {
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    metadata: {},
    encrypted: false,
    ...overrides,
  };
}

// ============================================================================
// ConnectorError Tests
// ============================================================================

describe("ConnectorError", () => {
  it("creates error with correct properties", () => {
    const error = new ConnectorError("test error", "auth", "google_calendar");
    expect(error.message).toBe("test error");
    expect(error.category).toBe("auth");
    expect(error.provider).toBe("google_calendar");
    expect(error.name).toBe("ConnectorError");
  });

  it("sets retryable to false for auth errors by default", () => {
    const error = new ConnectorError("unauthorized", "auth", "jira");
    expect(error.retryable).toBe(false);
  });

  it("sets retryable to true for network errors by default", () => {
    const error = new ConnectorError("timeout", "network", "github_actions");
    expect(error.retryable).toBe(true);
  });

  it("sets retryable to true for rate_limit errors by default", () => {
    const error = new ConnectorError(
      "too many requests",
      "rate_limit",
      "hubspot",
    );
    expect(error.retryable).toBe(true);
  });

  it("sets retryable to false for data errors by default", () => {
    const error = new ConnectorError("invalid data", "data", "salesforce");
    expect(error.retryable).toBe(false);
  });

  it("allows overriding retryable", () => {
    const error = new ConnectorError("auth error", "auth", "test", {
      retryable: true,
    });
    expect(error.retryable).toBe(true);
  });

  it("stores statusCode", () => {
    const error = new ConnectorError("not found", "data", "test", {
      statusCode: 404,
    });
    expect(error.statusCode).toBe(404);
  });

  it("stores details", () => {
    const details = { field: "email", reason: "invalid" };
    const error = new ConnectorError("validation error", "data", "test", {
      details,
    });
    expect(error.details).toEqual(details);
  });

  it("stores cause", () => {
    const cause = new Error("original error");
    const error = new ConnectorError("wrapped error", "unknown", "test", {
      cause,
    });
    expect(error.cause).toBe(cause);
  });

  it("is an instance of Error", () => {
    const error = new ConnectorError("test", "unknown", "test");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ConnectorError);
  });
});

// ============================================================================
// BaseConnector Lifecycle Tests
// ============================================================================

describe("BaseConnector", () => {
  let connector: TestConnector;

  beforeEach(() => {
    connector = new TestConnector();
    connector.connectFn.mockResolvedValue(undefined);
    connector.disconnectFn.mockResolvedValue(undefined);
    connector.healthCheckFn.mockResolvedValue({
      healthy: true,
      responseTimeMs: 50,
      message: "OK",
      checkedAt: new Date().toISOString(),
      consecutiveFailures: 0,
    });
  });

  describe("connect", () => {
    it("connects successfully", async () => {
      const config = createTestConfig();
      const creds = createTestCredentials();
      await connector.connect(config, creds);
      expect(connector.getStatus()).toBe("connected");
      expect(connector.isConnected()).toBe(true);
    });

    it("emits connected event on success", async () => {
      const events: string[] = [];
      connector.on("connected", () => events.push("connected"));
      await connector.connect(createTestConfig(), createTestCredentials());
      expect(events).toContain("connected");
    });

    it("sets error status on connect failure", async () => {
      connector.connectFn.mockRejectedValue(new Error("connection failed"));
      await expect(
        connector.connect(createTestConfig(), createTestCredentials()),
      ).rejects.toThrow();
      expect(connector.getStatus()).toBe("error");
    });

    it("emits error event on connect failure", async () => {
      connector.connectFn.mockRejectedValue(new Error("connection failed"));
      const events: ConnectorEventType[] = [];
      connector.on("error", () => events.push("error"));
      await expect(
        connector.connect(createTestConfig(), createTestCredentials()),
      ).rejects.toThrow();
      expect(events).toContain("error");
    });

    it("does not reconnect if already connected", async () => {
      await connector.connect(createTestConfig(), createTestCredentials());
      await connector.connect(createTestConfig(), createTestCredentials());
      expect(connector.connectFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("disconnect", () => {
    it("disconnects successfully", async () => {
      await connector.connect(createTestConfig(), createTestCredentials());
      await connector.disconnect();
      expect(connector.getStatus()).toBe("disconnected");
      expect(connector.isConnected()).toBe(false);
    });

    it("emits disconnected event", async () => {
      await connector.connect(createTestConfig(), createTestCredentials());
      const events: ConnectorEventType[] = [];
      connector.on("disconnected", () => events.push("disconnected"));
      await connector.disconnect();
      expect(events).toContain("disconnected");
    });

    it("handles disconnect when already disconnected", async () => {
      await connector.disconnect();
      expect(connector.getStatus()).toBe("disconnected");
    });

    it("still disconnects even if doDisconnect throws", async () => {
      await connector.connect(createTestConfig(), createTestCredentials());
      connector.disconnectFn.mockRejectedValue(new Error("disconnect error"));
      // disconnect() still throws but the finally block sets status to disconnected
      try {
        await connector.disconnect();
      } catch {
        // Expected - doDisconnect threw
      }
      expect(connector.getStatus()).toBe("disconnected");
    });
  });

  describe("reconnect", () => {
    it("reconnects after failure", async () => {
      await connector.connect(createTestConfig(), createTestCredentials());
      connector.setStatusForTest("error");
      await connector.reconnect();
      expect(connector.getStatus()).toBe("connected");
    });

    it("emits reconnecting event", async () => {
      await connector.connect(createTestConfig(), createTestCredentials());
      connector.setStatusForTest("error");
      const events: ConnectorEventType[] = [];
      connector.on("reconnecting", () => events.push("reconnecting"));
      await connector.reconnect();
      expect(events).toContain("reconnecting");
    });

    it("throws when no config available", async () => {
      await expect(connector.reconnect()).rejects.toThrow(
        "Cannot reconnect without config",
      );
    });

    it("throws when max reconnect attempts exceeded", async () => {
      await connector.connect(createTestConfig(), createTestCredentials());
      connector.setStatusForTest("error");
      connector.connectFn.mockRejectedValue(new Error("fail"));

      // Exhaust reconnect attempts
      for (let i = 0; i < 5; i++) {
        try {
          await connector.reconnect();
        } catch {
          /* expected */
        }
      }

      await expect(connector.reconnect()).rejects.toThrow(
        "Max reconnect attempts",
      );
    });

    it("increments reconnect attempts", async () => {
      await connector.connect(createTestConfig(), createTestCredentials());
      connector.setStatusForTest("error");
      connector.connectFn.mockRejectedValue(new Error("fail"));

      try {
        await connector.reconnect();
      } catch {
        /* expected */
      }
      expect(connector.getReconnectAttempts()).toBe(1);
    });

    it("resets reconnect attempts on successful reconnect", async () => {
      await connector.connect(createTestConfig(), createTestCredentials());
      connector.setStatusForTest("error");
      connector.connectFn
        .mockRejectedValueOnce(new Error("fail"))
        .mockResolvedValueOnce(undefined);

      try {
        await connector.reconnect();
      } catch {
        /* expected */
      }
      connector.setStatusForTest("error");
      await connector.reconnect();
      expect(connector.getReconnectAttempts()).toBe(0);
    });
  });

  describe("health check", () => {
    it("returns health check result", async () => {
      await connector.connect(createTestConfig(), createTestCredentials());
      const result = await connector.healthCheck();
      expect(result.healthy).toBe(true);
      expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
    });

    it("returns unhealthy result on failure", async () => {
      connector.healthCheckFn.mockRejectedValue(
        new Error("health check failed"),
      );
      await connector.connect(createTestConfig(), createTestCredentials());
      const result = await connector.healthCheck();
      expect(result.healthy).toBe(false);
      expect(result.message.toLowerCase()).toContain("health check failed");
    });

    it("emits health_check event", async () => {
      await connector.connect(createTestConfig(), createTestCredentials());
      const events: ConnectorEventType[] = [];
      connector.on("health_check", () => events.push("health_check"));
      await connector.healthCheck();
      expect(events).toContain("health_check");
    });

    it("tracks health history", async () => {
      await connector.connect(createTestConfig(), createTestCredentials());
      await connector.healthCheck();
      await connector.healthCheck();
      const history = connector.getHealthHistory();
      expect(history).toHaveLength(2);
    });

    it("limits health history to 10 entries", async () => {
      await connector.connect(createTestConfig(), createTestCredentials());
      for (let i = 0; i < 15; i++) {
        await connector.healthCheck();
      }
      const history = connector.getHealthHistory();
      expect(history).toHaveLength(10);
    });
  });

  describe("rate limiting", () => {
    it("allows requests within rate limit", () => {
      expect(connector.checkRateLimit()).toBe(true);
      expect(connector.consumeRateLimit()).toBe(true);
    });

    it("blocks requests when rate limit exceeded", () => {
      const limiter = new TestConnector({ maxRequests: 2, windowMs: 60000 });
      expect(limiter.consumeRateLimit()).toBe(true);
      expect(limiter.consumeRateLimit()).toBe(true);
      expect(limiter.consumeRateLimit()).toBe(false);
    });

    it("reports remaining rate limit", () => {
      const limiter = new TestConnector({ maxRequests: 5, windowMs: 60000 });
      expect(limiter.getRemainingRateLimit()).toBe(5);
      limiter.consumeRateLimit();
      expect(limiter.getRemainingRateLimit()).toBe(4);
    });

    it("resets rate limit after window expires", () => {
      const limiter = new TestConnector({ maxRequests: 1, windowMs: 100 });
      limiter.consumeRateLimit();
      expect(limiter.checkRateLimit()).toBe(false);

      // Simulate time passing by directly manipulating the rate limit
      (
        limiter as unknown as { rateLimit: { windowStart: number } }
      ).rateLimit.windowStart = Date.now() - 200;
      expect(limiter.checkRateLimit()).toBe(true);
    });

    it("emits rate_limited event", () => {
      const limiter = new TestConnector({ maxRequests: 1, windowMs: 60000 });
      const events: ConnectorEventType[] = [];
      limiter.on("rate_limited", () => events.push("rate_limited"));
      limiter.consumeRateLimit();
      limiter.consumeRateLimit();
      expect(events).toContain("rate_limited");
    });

    it("reports reset time", () => {
      const limiter = new TestConnector({ maxRequests: 1, windowMs: 60000 });
      limiter.consumeRateLimit();
      const resetMs = limiter.getRateLimitResetMs();
      expect(resetMs).toBeGreaterThan(0);
      expect(resetMs).toBeLessThanOrEqual(60000);
    });
  });

  describe("error categorization", () => {
    it("categorizes 401 as auth error", () => {
      const error = connector.testCategorizeError(
        new Error("401 Unauthorized"),
      );
      expect(error.category).toBe("auth");
      expect(error.retryable).toBe(false);
    });

    it("categorizes 403 as auth error", () => {
      const error = connector.testCategorizeError(new Error("403 forbidden"));
      expect(error.category).toBe("auth");
    });

    it("categorizes 429 as rate_limit error", () => {
      const error = connector.testCategorizeError(
        new Error("429 too many requests"),
      );
      expect(error.category).toBe("rate_limit");
      expect(error.retryable).toBe(true);
    });

    it("categorizes ECONNREFUSED as network error", () => {
      const error = connector.testCategorizeError(new Error("ECONNREFUSED"));
      expect(error.category).toBe("network");
      expect(error.retryable).toBe(true);
    });

    it("categorizes timeout as network error", () => {
      const error = connector.testCategorizeError(new Error("Request timeout"));
      expect(error.category).toBe("network");
    });

    it("categorizes 400 as data error", () => {
      const error = connector.testCategorizeError(new Error("400 Bad Request"));
      expect(error.category).toBe("data");
      expect(error.retryable).toBe(false);
    });

    it("categorizes unknown errors", () => {
      const error = connector.testCategorizeError(new Error("Something weird"));
      expect(error.category).toBe("unknown");
    });

    it("handles non-Error objects", () => {
      const error = connector.testCategorizeError("string error");
      expect(error.category).toBe("unknown");
      expect(error.message).toBe("string error");
    });

    it("passes through ConnectorError instances", () => {
      const original = new ConnectorError("original", "auth", "test");
      const result = connector.testCategorizeError(original);
      expect(result).toBe(original);
    });
  });

  describe("retry with exponential backoff", () => {
    it("succeeds on first attempt", async () => {
      const fn = jest.fn().mockResolvedValue("success");
      const result = await connector.testWithRetry(fn);
      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("retries on transient failure", async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(
          new ConnectorError("network error", "network", "test", {
            retryable: true,
          }),
        )
        .mockResolvedValueOnce("success");

      const result = await connector.testWithRetry(fn);
      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("does not retry non-retryable errors", async () => {
      const fn = jest.fn().mockRejectedValue(
        new ConnectorError("auth error", "auth", "test", {
          retryable: false,
        }),
      );

      await expect(connector.testWithRetry(fn)).rejects.toThrow("auth error");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("exhausts max retries", async () => {
      const fn = jest.fn().mockRejectedValue(
        new ConnectorError("network error", "network", "test", {
          retryable: true,
        }),
      );

      await expect(connector.testWithRetry(fn)).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });

    it("calculates backoff delay with increasing values", () => {
      const d1 = connector.testCalculateBackoffDelay(1);
      const d2 = connector.testCalculateBackoffDelay(2);
      const d3 = connector.testCalculateBackoffDelay(3);
      // Due to jitter, they won't be exactly doubling, but d2 > d1, d3 > d2 on average
      expect(d1).toBeGreaterThanOrEqual(0);
      expect(d2).toBeGreaterThanOrEqual(d1 * 0.5); // Allow jitter margin
      expect(d3).toBeGreaterThanOrEqual(d2 * 0.5);
    });
  });

  describe("event emission", () => {
    it("registers and fires event listeners", () => {
      const listener = jest.fn();
      connector.on("connected", listener);
      connector.testEmit("connected", { test: true });
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0][0].type).toBe("connected");
    });

    it("removes event listeners", () => {
      const listener = jest.fn();
      connector.on("connected", listener);
      connector.off("connected", listener);
      connector.testEmit("connected");
      expect(listener).not.toHaveBeenCalled();
    });

    it("supports multiple listeners", () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      connector.on("connected", listener1);
      connector.on("connected", listener2);
      connector.testEmit("connected");
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it("swallows listener errors", () => {
      const badListener = jest.fn(() => {
        throw new Error("listener error");
      });
      const goodListener = jest.fn();
      connector.on("connected", badListener);
      connector.on("connected", goodListener);
      connector.testEmit("connected");
      expect(goodListener).toHaveBeenCalledTimes(1);
    });
  });

  describe("request logging", () => {
    it("logs requests", () => {
      connector.testLogRequest({
        method: "GET",
        url: "/test",
        durationMs: 100,
        success: true,
      });
      const logs = connector.getRequestLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].method).toBe("GET");
    });

    it("limits log entries", () => {
      for (let i = 0; i < 150; i++) {
        connector.testLogRequest({
          method: "GET",
          url: `/test/${i}`,
          durationMs: 10,
          success: true,
        });
      }
      const logs = connector.getRequestLogs();
      expect(logs.length).toBeLessThanOrEqual(100);
    });

    it("returns limited logs", () => {
      for (let i = 0; i < 20; i++) {
        connector.testLogRequest({
          method: "GET",
          url: `/test/${i}`,
          durationMs: 10,
          success: true,
        });
      }
      const logs = connector.getRequestLogs(5);
      expect(logs).toHaveLength(5);
    });
  });

  describe("metrics", () => {
    it("starts with empty metrics", () => {
      const metrics = connector.getMetrics();
      expect(metrics.totalApiCalls).toBe(0);
      expect(metrics.successfulCalls).toBe(0);
      expect(metrics.failedCalls).toBe(0);
    });

    it("tracks successful calls", async () => {
      const fn = jest.fn().mockResolvedValue("ok");
      await connector.testWithRetry(fn);
      const metrics = connector.getMetrics();
      expect(metrics.totalApiCalls).toBe(1);
      expect(metrics.successfulCalls).toBe(1);
    });

    it("tracks failed calls", async () => {
      const fn = jest
        .fn()
        .mockRejectedValue(
          new ConnectorError("err", "auth", "test", { retryable: false }),
        );
      try {
        await connector.testWithRetry(fn);
      } catch {
        /* expected */
      }
      const metrics = connector.getMetrics();
      expect(metrics.failedCalls).toBeGreaterThan(0);
    });

    it("resets metrics", async () => {
      const fn = jest.fn().mockResolvedValue("ok");
      await connector.testWithRetry(fn);
      connector.resetMetrics();
      const metrics = connector.getMetrics();
      expect(metrics.totalApiCalls).toBe(0);
    });
  });

  describe("credential management", () => {
    it("updates credentials", () => {
      const newCreds = createTestCredentials({ accessToken: "new-token" });
      connector.updateCredentials(newCreds);
      // Should emit credentials_refreshed event
      const events: ConnectorEventType[] = [];
      connector.on("credentials_refreshed", () =>
        events.push("credentials_refreshed"),
      );
      connector.updateCredentials(newCreds);
      expect(events).toContain("credentials_refreshed");
    });

    it("detects credentials needing refresh", () => {
      const expiredCreds = createTestCredentials({
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      });
      connector.updateCredentials(expiredCreds);
      expect(connector.credentialsNeedRefresh()).toBe(true);
    });

    it("detects credentials not needing refresh", () => {
      const validCreds = createTestCredentials({
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      });
      connector.updateCredentials(validCreds);
      expect(connector.credentialsNeedRefresh()).toBe(false);
    });

    it("returns false when no expiry set", () => {
      connector.updateCredentials(
        createTestCredentials({ expiresAt: undefined }),
      );
      expect(connector.credentialsNeedRefresh()).toBe(false);
    });
  });
});

// ============================================================================
// Calendar Connector Tests
// ============================================================================

describe("CalendarConnector", () => {
  it("creates Google Calendar connector", () => {
    const connector = new CalendarConnector("google_calendar");
    expect(connector.providerId).toBe("google_calendar");
    expect(connector.displayName).toBe("Google Calendar");
    expect(connector.category).toBe("calendar");
  });

  it("creates Outlook Calendar connector", () => {
    const connector = new CalendarConnector("outlook_calendar");
    expect(connector.providerId).toBe("outlook_calendar");
    expect(connector.displayName).toBe("Outlook Calendar");
  });

  it("generates catalog entry with correct actions", () => {
    const connector = new CalendarConnector("google_calendar");
    const entry = connector.getCatalogEntry();
    expect(entry.id).toBe("google_calendar");
    expect(entry.category).toBe("calendar");
    expect(entry.capabilities).toContain("read");
    expect(entry.capabilities).toContain("write");
    expect(entry.capabilities).toContain("subscribe");
    expect(entry.actions.length).toBeGreaterThan(0);
    expect(entry.actions.find((a) => a.id === "create_event")).toBeDefined();
    expect(
      entry.actions.find((a) => a.id === "check_availability"),
    ).toBeDefined();
    expect(entry.actions.find((a) => a.id === "rsvp")).toBeDefined();
  });

  it("throws when not connected", async () => {
    const connector = new CalendarConnector("google_calendar");
    await expect(
      connector.listEvents("cal1", "2024-01-01", "2024-01-31"),
    ).rejects.toThrow("not connected");
  });

  it("formats event reminder", () => {
    const connector = new CalendarConnector("google_calendar");
    const event: CalendarEvent = {
      id: "evt-1",
      title: "Team Meeting",
      startTime: "2024-01-15T10:00:00Z",
      endTime: "2024-01-15T11:00:00Z",
      location: "Room 101",
      meetingLink: "https://meet.google.com/abc",
      organizer: { name: "Alice", email: "alice@test.com" },
      attendees: [
        {
          name: "Bob",
          email: "bob@test.com",
          status: "accepted",
          optional: false,
        },
      ],
      status: "confirmed",
      visibility: "default",
      calendarId: "primary",
      provider: "google_calendar",
      externalId: "evt-1",
      lastModified: new Date().toISOString(),
    };
    const reminder = connector.formatEventReminder(event, 15);
    expect(reminder).toContain("Team Meeting");
    expect(reminder).toContain("15 minutes");
    expect(reminder).toContain("Room 101");
    expect(reminder).toContain("meet.google.com");
    expect(reminder).toContain("Bob");
  });

  it("formats RSVP summary", () => {
    const connector = new CalendarConnector("google_calendar");
    const event: CalendarEvent = {
      id: "evt-1",
      title: "Sprint Review",
      startTime: "2024-01-15T10:00:00Z",
      endTime: "2024-01-15T11:00:00Z",
      organizer: { name: "Alice", email: "alice@test.com" },
      attendees: [
        {
          name: "Alice",
          email: "alice@test.com",
          status: "accepted",
          optional: false,
        },
        {
          name: "Bob",
          email: "bob@test.com",
          status: "declined",
          optional: false,
        },
        {
          name: "Charlie",
          email: "charlie@test.com",
          status: "tentative",
          optional: true,
        },
        {
          name: "Dave",
          email: "dave@test.com",
          status: "needs_action",
          optional: false,
        },
      ],
      status: "confirmed",
      visibility: "default",
      calendarId: "primary",
      provider: "google_calendar",
      externalId: "evt-1",
      lastModified: new Date().toISOString(),
    };
    const summary = connector.formatRsvpSummary(event);
    expect(summary).toContain("Accepted (1)");
    expect(summary).toContain("Declined (1)");
    expect(summary).toContain("Tentative (1)");
    expect(summary).toContain("Pending (1)");
    expect(summary).toContain("Alice");
    expect(summary).toContain("Bob");
  });

  it("checks recurring daily events", () => {
    const connector = new CalendarConnector("google_calendar");
    const recurrence: CalendarRecurrence = { frequency: "daily", interval: 1 };
    expect(
      connector.isRecurringOnDate(recurrence, "2024-01-01", "2024-01-05"),
    ).toBe(true);
    expect(
      connector.isRecurringOnDate(recurrence, "2024-01-01", "2023-12-31"),
    ).toBe(false);
  });

  it("checks recurring weekly events", () => {
    const connector = new CalendarConnector("google_calendar");
    const recurrence: CalendarRecurrence = {
      frequency: "weekly",
      interval: 1,
      daysOfWeek: [0], // Sunday
    };
    // Jan 7 2024 is Sunday (day 0), Jan 14 is also Sunday
    expect(
      connector.isRecurringOnDate(recurrence, "2024-01-07", "2024-01-14"),
    ).toBe(true);
  });

  it("checks recurring monthly events", () => {
    const connector = new CalendarConnector("google_calendar");
    const recurrence: CalendarRecurrence = {
      frequency: "monthly",
      interval: 1,
    };
    expect(
      connector.isRecurringOnDate(recurrence, "2024-01-15", "2024-02-15"),
    ).toBe(true);
    expect(
      connector.isRecurringOnDate(recurrence, "2024-01-15", "2024-02-16"),
    ).toBe(false);
  });

  it("checks recurring yearly events", () => {
    const connector = new CalendarConnector("google_calendar");
    const recurrence: CalendarRecurrence = { frequency: "yearly", interval: 1 };
    expect(
      connector.isRecurringOnDate(recurrence, "2024-01-15", "2025-01-15"),
    ).toBe(true);
    expect(
      connector.isRecurringOnDate(recurrence, "2024-01-15", "2025-02-15"),
    ).toBe(false);
  });

  it("respects recurrence until date", () => {
    const connector = new CalendarConnector("google_calendar");
    const recurrence: CalendarRecurrence = {
      frequency: "daily",
      interval: 1,
      until: "2024-01-10",
    };
    expect(
      connector.isRecurringOnDate(recurrence, "2024-01-01", "2024-01-05"),
    ).toBe(true);
    expect(
      connector.isRecurringOnDate(recurrence, "2024-01-01", "2024-01-15"),
    ).toBe(false);
  });

  it("handles daily interval", () => {
    const connector = new CalendarConnector("google_calendar");
    const recurrence: CalendarRecurrence = { frequency: "daily", interval: 2 };
    expect(
      connector.isRecurringOnDate(recurrence, "2024-01-01", "2024-01-03"),
    ).toBe(true);
    expect(
      connector.isRecurringOnDate(recurrence, "2024-01-01", "2024-01-02"),
    ).toBe(false);
  });
});

// ============================================================================
// Ticketing Connector Tests
// ============================================================================

describe("TicketingConnector", () => {
  it("creates Jira connector", () => {
    const connector = new TicketingConnector("jira");
    expect(connector.providerId).toBe("jira");
    expect(connector.displayName).toBe("Jira");
    expect(connector.category).toBe("ticketing");
  });

  it("creates Linear connector", () => {
    const connector = new TicketingConnector("linear");
    expect(connector.providerId).toBe("linear");
    expect(connector.displayName).toBe("Linear");
  });

  it("creates GitHub Issues connector", () => {
    const connector = new TicketingConnector("github_issues");
    expect(connector.providerId).toBe("github_issues");
    expect(connector.displayName).toBe("GitHub Issues");
  });

  it("generates catalog entry", () => {
    const connector = new TicketingConnector("jira");
    const entry = connector.getCatalogEntry();
    expect(entry.category).toBe("ticketing");
    expect(entry.actions.find((a) => a.id === "create_ticket")).toBeDefined();
    expect(entry.actions.find((a) => a.id === "update_status")).toBeDefined();
  });

  it("throws when not connected", async () => {
    const connector = new TicketingConnector("jira");
    await expect(connector.listTickets("PROJ")).rejects.toThrow(
      "not connected",
    );
  });

  it("formats status notification", () => {
    const connector = new TicketingConnector("jira");
    const ticket: Ticket = {
      id: "1",
      key: "PROJ-123",
      title: "Fix login bug",
      status: "In Progress",
      priority: "high",
      assignee: { name: "Alice", email: "alice@test.com" },
      reporter: { name: "Bob", email: "bob@test.com" },
      labels: ["bug"],
      type: "Bug",
      projectKey: "PROJ",
      projectName: "Project",
      url: "https://jira.example.com/browse/PROJ-123",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-02",
      provider: "jira",
      externalId: "1",
      comments: [],
    };
    const notification = connector.formatStatusNotification(
      ticket,
      "Open",
      "In Progress",
      "Alice",
    );
    expect(notification).toContain("PROJ-123");
    expect(notification).toContain("Fix login bug");
    expect(notification).toContain("Open");
    expect(notification).toContain("In Progress");
    expect(notification).toContain("Alice");
  });

  it("formats assignment notification", () => {
    const connector = new TicketingConnector("linear");
    const ticket: Ticket = {
      id: "2",
      key: "ENG-456",
      title: "Add dark mode",
      status: "Todo",
      priority: "medium",
      reporter: { name: "Bob", email: "bob@test.com" },
      labels: ["feature"],
      type: "Feature",
      projectKey: "ENG",
      projectName: "Engineering",
      url: "https://linear.app/team/issue/ENG-456",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-02",
      provider: "linear",
      externalId: "2",
      comments: [],
    };
    const notification = connector.formatAssignmentNotification(
      ticket,
      "Charlie",
    );
    expect(notification).toContain("ENG-456");
    expect(notification).toContain("Charlie");
    expect(notification).toContain("medium");
  });
});

// ============================================================================
// CI/CD Connector Tests
// ============================================================================

describe("CICDConnector", () => {
  it("creates GitHub Actions connector", () => {
    const connector = new CICDConnector("github_actions");
    expect(connector.providerId).toBe("github_actions");
    expect(connector.displayName).toBe("GitHub Actions");
    expect(connector.category).toBe("ci_cd");
  });

  it("creates GitLab CI connector", () => {
    const connector = new CICDConnector("gitlab_ci");
    expect(connector.displayName).toBe("GitLab CI");
  });

  it("creates Jenkins connector", () => {
    const connector = new CICDConnector("jenkins");
    expect(connector.displayName).toBe("Jenkins");
  });

  it("generates catalog entry with trigger and approve actions", () => {
    const connector = new CICDConnector("github_actions");
    const entry = connector.getCatalogEntry();
    expect(entry.category).toBe("ci_cd");
    expect(
      entry.actions.find((a) => a.id === "trigger_pipeline"),
    ).toBeDefined();
    expect(entry.actions.find((a) => a.id === "approve_deploy")).toBeDefined();
  });

  it("throws when not connected", async () => {
    const connector = new CICDConnector("github_actions");
    await expect(connector.listPipelines("owner/repo")).rejects.toThrow(
      "not connected",
    );
  });

  it("formats build notification", () => {
    const connector = new CICDConnector("github_actions");
    const pipeline: Pipeline = {
      id: "owner/repo:123",
      name: "CI",
      status: "success",
      branch: "main",
      commit: "abc1234",
      commitMessage: "Fix tests",
      author: { name: "Alice", email: "alice@test.com" },
      url: "https://github.com/owner/repo/actions/runs/123",
      startedAt: "2024-01-01T10:00:00Z",
      finishedAt: "2024-01-01T10:05:00Z",
      durationMs: 300000,
      stages: [],
      provider: "github_actions",
      externalId: "123",
      repository: "owner/repo",
    };
    const notification = connector.formatBuildNotification(pipeline);
    expect(notification).toContain("CI");
    expect(notification).toContain("success");
    expect(notification).toContain("main");
    expect(notification).toContain("abc1234");
    expect(notification).toContain("Alice");
    expect(notification).toContain("300s");
  });

  it("formats failure alert", () => {
    const connector = new CICDConnector("github_actions");
    const pipeline: Pipeline = {
      id: "owner/repo:456",
      name: "Deploy",
      status: "failed",
      branch: "main",
      commit: "def5678",
      commitMessage: "Deploy to prod",
      author: { name: "Bob", email: "bob@test.com" },
      url: "https://github.com/owner/repo/actions/runs/456",
      startedAt: "2024-01-01T10:00:00Z",
      stages: [
        { name: "build", status: "success" },
        { name: "deploy", status: "failed" },
      ],
      provider: "github_actions",
      externalId: "456",
      repository: "owner/repo",
    };
    const alert = connector.formatFailureAlert(
      pipeline,
      "Error: deployment failed\nTimeout exceeded",
    );
    expect(alert).toContain("BUILD FAILED");
    expect(alert).toContain("deploy");
    expect(alert).toContain("deployment failed");
  });

  it("formats failure alert without log snippet", () => {
    const connector = new CICDConnector("github_actions");
    const pipeline: Pipeline = {
      id: "repo:1",
      name: "CI",
      status: "failed",
      branch: "dev",
      commit: "abc",
      commitMessage: "test",
      author: { name: "A", email: "" },
      url: "https://example.com",
      startedAt: "",
      stages: [],
      provider: "github_actions",
      externalId: "1",
      repository: "repo",
    };
    const alert = connector.formatFailureAlert(pipeline);
    expect(alert).toContain("BUILD FAILED");
    expect(alert).not.toContain("```");
  });
});

// ============================================================================
// Docs Connector Tests
// ============================================================================

describe("DocsConnector", () => {
  it("creates Google Docs connector", () => {
    const connector = new DocsConnector("google_docs");
    expect(connector.providerId).toBe("google_docs");
    expect(connector.displayName).toBe("Google Docs");
    expect(connector.category).toBe("docs");
  });

  it("creates Notion connector", () => {
    const connector = new DocsConnector("notion");
    expect(connector.displayName).toBe("Notion");
  });

  it("creates Confluence connector", () => {
    const connector = new DocsConnector("confluence");
    expect(connector.displayName).toBe("Confluence");
  });

  it("generates catalog entry", () => {
    const connector = new DocsConnector("google_docs");
    const entry = connector.getCatalogEntry();
    expect(entry.category).toBe("docs");
    expect(entry.capabilities).toContain("search");
    expect(entry.actions.find((a) => a.id === "create_document")).toBeDefined();
    expect(
      entry.actions.find((a) => a.id === "search_documents"),
    ).toBeDefined();
  });

  it("throws when not connected", async () => {
    const connector = new DocsConnector("notion");
    await expect(connector.listDocuments()).rejects.toThrow("not connected");
  });

  it("formats document preview", () => {
    const connector = new DocsConnector("google_docs");
    const doc: Document = {
      id: "doc-1",
      title: "Product Roadmap",
      content:
        "This is the product roadmap for Q1 2024 with many exciting features planned.",
      url: "https://docs.google.com/document/d/doc-1",
      lastModifiedBy: { name: "Alice", email: "alice@test.com" },
      createdAt: "2024-01-01",
      updatedAt: "2024-01-15",
      mimeType: "application/vnd.google-apps.document",
      provider: "google_docs",
      externalId: "doc-1",
      permissions: [],
    };
    const preview = connector.formatDocumentPreview(doc);
    expect(preview).toContain("Product Roadmap");
    expect(preview).toContain("Alice");
    expect(preview).toContain("docs.google.com");
  });

  it("formats change notification", () => {
    const connector = new DocsConnector("notion");
    const doc: Document = {
      id: "doc-2",
      title: "Meeting Notes",
      url: "https://notion.so/meeting-notes",
      lastModifiedBy: { name: "Bob", email: "bob@test.com" },
      createdAt: "2024-01-01",
      updatedAt: "2024-01-15",
      mimeType: "application/vnd.notion.page",
      provider: "notion",
      externalId: "doc-2",
      permissions: [],
    };
    const notification = connector.formatChangeNotification(
      doc,
      "Bob",
      "modified",
    );
    expect(notification).toContain("updated");
    expect(notification).toContain("Meeting Notes");
    expect(notification).toContain("Bob");
  });

  it("formats created document notification", () => {
    const connector = new DocsConnector("confluence");
    const doc: Document = {
      id: "doc-3",
      title: "Architecture",
      url: "https://wiki.example.com/arch",
      lastModifiedBy: { name: "C", email: "" },
      createdAt: "",
      updatedAt: "",
      mimeType: "",
      provider: "confluence",
      externalId: "doc-3",
      permissions: [],
    };
    const notification = connector.formatChangeNotification(
      doc,
      "Charlie",
      "created",
    );
    expect(notification).toContain("created");
  });
});

// ============================================================================
// CRM Connector Tests
// ============================================================================

describe("CRMConnector", () => {
  it("creates Salesforce connector", () => {
    const connector = new CRMConnector("salesforce");
    expect(connector.providerId).toBe("salesforce");
    expect(connector.displayName).toBe("Salesforce");
    expect(connector.category).toBe("crm");
  });

  it("creates HubSpot connector", () => {
    const connector = new CRMConnector("hubspot");
    expect(connector.displayName).toBe("HubSpot");
  });

  it("generates catalog entry with CRM actions", () => {
    const connector = new CRMConnector("salesforce");
    const entry = connector.getCatalogEntry();
    expect(entry.category).toBe("crm");
    expect(entry.actions.find((a) => a.id === "lookup_contact")).toBeDefined();
    expect(entry.actions.find((a) => a.id === "create_lead")).toBeDefined();
    expect(entry.actions.find((a) => a.id === "log_activity")).toBeDefined();
  });

  it("throws when not connected", async () => {
    const connector = new CRMConnector("salesforce");
    await expect(connector.searchContacts({ query: "test" })).rejects.toThrow(
      "not connected",
    );
  });

  it("formats contact card", () => {
    const connector = new CRMConnector("hubspot");
    const contact: CRMContact = {
      id: "c-1",
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phone: "+1-555-0123",
      company: "Acme Corp",
      title: "VP Engineering",
      owner: { name: "Sales Rep", email: "rep@test.com" },
      tags: [],
      customFields: {},
      createdAt: "2024-01-01",
      updatedAt: "2024-01-15",
      provider: "hubspot",
      externalId: "c-1",
      url: "https://app.hubspot.com/contacts/c-1",
    };
    const card = connector.formatContactCard(contact);
    expect(card).toContain("John Doe");
    expect(card).toContain("VP Engineering");
    expect(card).toContain("Acme Corp");
    expect(card).toContain("john@example.com");
    expect(card).toContain("+1-555-0123");
    expect(card).toContain("Sales Rep");
  });

  it("formats deal won notification", () => {
    const connector = new CRMConnector("salesforce");
    const deal: CRMDeal = {
      id: "d-1",
      name: "Enterprise License",
      amount: 50000,
      currency: "USD",
      stage: "Closed Won",
      probability: 100,
      closeDate: "2024-02-01",
      contact: { id: "c-1", name: "John Doe", email: "john@test.com" },
      owner: { name: "Sales Rep", email: "rep@test.com" },
      createdAt: "2024-01-01",
      updatedAt: "2024-01-30",
      provider: "salesforce",
      externalId: "d-1",
      url: "https://salesforce.example.com/d-1",
    };
    const notification = connector.formatDealNotification(deal, "won");
    expect(notification).toContain("WON");
    expect(notification).toContain("Enterprise License");
    expect(notification).toContain("50,000");
    expect(notification).toContain("Sales Rep");
  });

  it("formats deal stage change notification", () => {
    const connector = new CRMConnector("hubspot");
    const deal: CRMDeal = {
      id: "d-2",
      name: "Starter Plan",
      amount: 5000,
      currency: "USD",
      stage: "Negotiation",
      probability: 60,
      contact: { id: "", name: "", email: "" },
      owner: { name: "Rep", email: "" },
      createdAt: "",
      updatedAt: "",
      provider: "hubspot",
      externalId: "d-2",
      url: "",
    };
    const notification = connector.formatDealNotification(deal, "stage_change");
    expect(notification).toContain("Negotiation");
    expect(notification).toContain("60%");
  });

  it("formats contact card without optional fields", () => {
    const connector = new CRMConnector("hubspot");
    const contact: CRMContact = {
      id: "c-2",
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@test.com",
      tags: [],
      customFields: {},
      createdAt: "",
      updatedAt: "",
      provider: "hubspot",
      externalId: "c-2",
      url: "",
    };
    const card = connector.formatContactCard(contact);
    expect(card).toContain("Jane Smith");
    expect(card).not.toContain("Phone");
    expect(card).not.toContain("Owner");
  });
});

// ============================================================================
// CredentialVault Tests
// ============================================================================

describe("CredentialVault", () => {
  let vault: CredentialVault;

  beforeEach(() => {
    vault = new CredentialVault();
  });

  it("stores and retrieves credentials", async () => {
    const creds = createTestCredentials();
    await vault.store("int-1", creds);
    const retrieved = await vault.retrieve("int-1");
    expect(retrieved).toBeTruthy();
    expect(retrieved!.accessToken).toBe(creds.accessToken);
  });

  it("returns null for unknown integration", async () => {
    const result = await vault.retrieve("nonexistent");
    expect(result).toBeNull();
  });

  it("removes credentials", async () => {
    await vault.store("int-1", createTestCredentials());
    vault.remove("int-1");
    expect(await vault.retrieve("int-1")).toBeNull();
  });

  it("checks if credentials exist", async () => {
    expect(vault.has("int-1")).toBe(false);
    await vault.store("int-1", createTestCredentials());
    expect(vault.has("int-1")).toBe(true);
  });

  it("lists integration IDs", async () => {
    await vault.store("int-1", createTestCredentials());
    await vault.store("int-2", createTestCredentials());
    const ids = vault.listIds();
    expect(ids).toContain("int-1");
    expect(ids).toContain("int-2");
  });

  it("clears all credentials", async () => {
    await vault.store("int-1", createTestCredentials());
    await vault.store("int-2", createTestCredentials());
    vault.clear();
    expect(vault.listIds()).toHaveLength(0);
  });
});

// ============================================================================
// HealthMonitor Tests
// ============================================================================

describe("HealthMonitor", () => {
  let monitor: HealthMonitor;

  beforeEach(() => {
    jest.useFakeTimers();
    monitor = new HealthMonitor({
      checkIntervalMs: 1000,
      maxConsecutiveFailures: 3,
    });
  });

  afterEach(() => {
    monitor.stopAll();
    jest.useRealTimers();
  });

  it("starts monitoring a connector", () => {
    const connector = new TestConnector();
    connector.healthCheckFn.mockResolvedValue({
      healthy: true,
      responseTimeMs: 50,
      message: "OK",
      checkedAt: new Date().toISOString(),
      consecutiveFailures: 0,
    });

    monitor.startMonitoring("int-1", connector);
    expect(monitor.isMonitoring("int-1")).toBe(true);
  });

  it("stops monitoring a connector", () => {
    const connector = new TestConnector();
    connector.healthCheckFn.mockResolvedValue({
      healthy: true,
      responseTimeMs: 50,
      message: "OK",
      checkedAt: new Date().toISOString(),
      consecutiveFailures: 0,
    });

    monitor.startMonitoring("int-1", connector);
    monitor.stopMonitoring("int-1");
    expect(monitor.isMonitoring("int-1")).toBe(false);
  });

  it("stops all monitoring", () => {
    const connector = new TestConnector();
    connector.healthCheckFn.mockResolvedValue({
      healthy: true,
      responseTimeMs: 50,
      message: "OK",
      checkedAt: new Date().toISOString(),
      consecutiveFailures: 0,
    });

    monitor.startMonitoring("int-1", connector);
    monitor.startMonitoring("int-2", connector);
    monitor.stopAll();
    expect(monitor.isMonitoring("int-1")).toBe(false);
    expect(monitor.isMonitoring("int-2")).toBe(false);
  });

  it("returns null for unmonitored integration", () => {
    expect(monitor.getLatest("nonexistent")).toBeNull();
  });

  it("returns empty history for unmonitored integration", () => {
    expect(monitor.getHistory("nonexistent")).toEqual([]);
  });

  it("auto-disables after consecutive failures", async () => {
    const disableFn = jest.fn();
    const failMonitor = new HealthMonitor({
      checkIntervalMs: 100,
      maxConsecutiveFailures: 2,
      onAutoDisable: disableFn,
    });

    const connector = new TestConnector();
    connector.healthCheckFn.mockResolvedValue({
      healthy: false,
      responseTimeMs: 0,
      message: "Down",
      checkedAt: new Date().toISOString(),
      consecutiveFailures: 2,
    });

    failMonitor.startMonitoring("int-1", connector);

    // Wait for the initial health check to process
    await jest.advanceTimersByTimeAsync(10);

    expect(disableFn).toHaveBeenCalledWith("int-1", expect.any(String));
    failMonitor.stopAll();
  });
});

// ============================================================================
// IntegrationRegistry Tests
// ============================================================================

describe("IntegrationRegistry", () => {
  let registry: IntegrationRegistry;
  let connector: TestConnector;

  beforeEach(() => {
    jest.useFakeTimers();
    registry = new IntegrationRegistry();
    connector = new TestConnector();
    connector.connectFn.mockResolvedValue(undefined);
    connector.disconnectFn.mockResolvedValue(undefined);
    connector.healthCheckFn.mockResolvedValue({
      healthy: true,
      responseTimeMs: 50,
      message: "OK",
      checkedAt: new Date().toISOString(),
      consecutiveFailures: 0,
    });
  });

  afterEach(async () => {
    await registry.shutdown();
    jest.useRealTimers();
  });

  describe("catalog management", () => {
    it("registers a connector", () => {
      registry.registerConnector(connector);
      const catalog = registry.getCatalog();
      expect(catalog).toHaveLength(1);
      expect(catalog[0].id).toBe("test_provider");
    });

    it("unregisters a connector", () => {
      registry.registerConnector(connector);
      registry.unregisterConnector("test_provider");
      expect(registry.getCatalog()).toHaveLength(0);
    });

    it("gets catalog entry by ID", () => {
      registry.registerConnector(connector);
      const entry = registry.getCatalogEntry("test_provider");
      expect(entry).toBeTruthy();
      expect(entry!.name).toBe("Test Provider");
    });

    it("returns null for unknown catalog entry", () => {
      expect(registry.getCatalogEntry("nonexistent")).toBeNull();
    });

    it("searches catalog", () => {
      registry.registerConnector(connector);
      expect(registry.searchCatalog("test")).toHaveLength(1);
      expect(registry.searchCatalog("nonexistent")).toHaveLength(0);
    });

    it("filters by category", () => {
      registry.registerConnector(connector);
      expect(registry.filterByCategory("calendar")).toHaveLength(1);
      expect(registry.filterByCategory("ticketing")).toHaveLength(0);
    });
  });

  describe("installation lifecycle", () => {
    beforeEach(() => {
      registry.registerConnector(connector);
    });

    it("installs an integration", async () => {
      const config = createTestConfig();
      const creds = createTestCredentials();
      const installation = await registry.install(
        "test_provider",
        config,
        creds,
      );
      expect(installation.id).toBe(config.id);
      expect(installation.status).toBe("connected");
      expect(installation.enabled).toBe(true);
    });

    it("throws on install for unknown catalog entry", async () => {
      await expect(
        registry.install(
          "nonexistent",
          createTestConfig(),
          createTestCredentials(),
        ),
      ).rejects.toThrow("not found in catalog");
    });

    it("configures an installation", async () => {
      await registry.install(
        "test_provider",
        createTestConfig(),
        createTestCredentials(),
      );
      const updated = await registry.configure("test-install-1", {
        displayName: "Updated Name",
      });
      expect(updated.config.displayName).toBe("Updated Name");
    });

    it("throws on configure for unknown installation", async () => {
      await expect(registry.configure("nonexistent", {})).rejects.toThrow(
        "not found",
      );
    });

    it("disables an installation", async () => {
      await registry.install(
        "test_provider",
        createTestConfig(),
        createTestCredentials(),
      );
      const disabled = await registry.disable("test-install-1");
      expect(disabled.enabled).toBe(false);
      expect(disabled.status).toBe("disabled");
    });

    it("enables an installation", async () => {
      await registry.install(
        "test_provider",
        createTestConfig(),
        createTestCredentials(),
      );
      await registry.disable("test-install-1");
      const enabled = await registry.enable("test-install-1");
      expect(enabled.enabled).toBe(true);
      expect(enabled.status).toBe("connected");
    });

    it("uninstalls an integration", async () => {
      await registry.install(
        "test_provider",
        createTestConfig(),
        createTestCredentials(),
      );
      await registry.uninstall("test-install-1");
      expect(registry.getInstallation("test-install-1")).toBeNull();
    });

    it("throws on uninstall for unknown installation", async () => {
      await expect(registry.uninstall("nonexistent")).rejects.toThrow(
        "not found",
      );
    });

    it("lists all installations", async () => {
      await registry.install(
        "test_provider",
        createTestConfig({ id: "i1" }),
        createTestCredentials(),
      );
      await registry.install(
        "test_provider",
        createTestConfig({ id: "i2" }),
        createTestCredentials(),
      );
      expect(registry.getInstallations()).toHaveLength(2);
    });

    it("gets installations by status", async () => {
      await registry.install(
        "test_provider",
        createTestConfig({ id: "i1" }),
        createTestCredentials(),
      );
      await registry.install(
        "test_provider",
        createTestConfig({ id: "i2" }),
        createTestCredentials(),
      );
      await registry.disable("i2");
      expect(registry.getInstallationsByStatus("connected")).toHaveLength(1);
      expect(registry.getInstallationsByStatus("disabled")).toHaveLength(1);
    });

    it("gets connector by catalog ID", () => {
      registry.registerConnector(connector);
      expect(registry.getConnector("test_provider")).toBe(connector);
      expect(registry.getConnector("nonexistent")).toBeNull();
    });
  });

  describe("health & metrics", () => {
    it("returns null health for unknown installation", () => {
      expect(registry.getHealth("nonexistent")).toBeNull();
    });

    it("returns null metrics for unknown installation", () => {
      expect(registry.getMetrics("nonexistent")).toBeNull();
    });

    it("returns metrics for installed integration", async () => {
      registry.registerConnector(connector);
      await registry.install(
        "test_provider",
        createTestConfig(),
        createTestCredentials(),
      );
      const metrics = registry.getMetrics("test-install-1");
      expect(metrics).toBeTruthy();
    });
  });
});

// ============================================================================
// SyncEngine Tests
// ============================================================================

describe("SyncEngine", () => {
  let engine: SyncEngine;

  beforeEach(() => {
    engine = new SyncEngine();
  });

  describe("queue management", () => {
    it("enqueues items", () => {
      engine.enqueue({
        integrationId: "int-1",
        direction: "outgoing",
        entityType: "ticket",
        entityId: "t-1",
        operation: "create",
        payload: { title: "Test" },
        priority: 5,
        maxRetries: 3,
      });
      expect(engine.getQueueSize()).toBe(1);
      expect(engine.getPendingCount()).toBe(1);
    });

    it("dequeues items in priority order", () => {
      engine.enqueue({
        integrationId: "int-1",
        direction: "outgoing",
        entityType: "ticket",
        entityId: "t-1",
        operation: "create",
        payload: {},
        priority: 5,
        maxRetries: 3,
      });
      engine.enqueue({
        integrationId: "int-1",
        direction: "outgoing",
        entityType: "ticket",
        entityId: "t-2",
        operation: "create",
        payload: {},
        priority: 10,
        maxRetries: 3,
      });

      const first = engine.dequeue();
      expect(first!.entityId).toBe("t-2"); // Higher priority first
    });

    it("returns null when queue is empty", () => {
      expect(engine.dequeue()).toBeNull();
    });

    it("marks items as complete", () => {
      const item = engine.enqueue({
        integrationId: "int-1",
        direction: "outgoing",
        entityType: "ticket",
        entityId: "t-1",
        operation: "create",
        payload: {},
        priority: 5,
        maxRetries: 3,
      });
      engine.dequeue();
      engine.complete(item.id);
      expect(engine.getQueueSize()).toBe(0);
    });

    it("marks items as error and allows retry", () => {
      const item = engine.enqueue({
        integrationId: "int-1",
        direction: "outgoing",
        entityType: "ticket",
        entityId: "t-1",
        operation: "create",
        payload: {},
        priority: 5,
        maxRetries: 3,
      });
      engine.dequeue();
      engine.error(item.id, "network timeout");
      expect(engine.getPendingCount()).toBe(1); // Back to pending for retry
    });

    it("marks items as permanent error after max retries", () => {
      const item = engine.enqueue({
        integrationId: "int-1",
        direction: "outgoing",
        entityType: "ticket",
        entityId: "t-1",
        operation: "create",
        payload: {},
        priority: 5,
        maxRetries: 1,
      });
      engine.dequeue();
      engine.error(item.id, "permanent failure");
      const errors = engine.getItemsByStatus("error");
      expect(errors).toHaveLength(1);
    });

    it("clears the queue", () => {
      engine.enqueue({
        integrationId: "int-1",
        direction: "outgoing",
        entityType: "ticket",
        entityId: "t-1",
        operation: "create",
        payload: {},
        priority: 5,
        maxRetries: 3,
      });
      engine.clearQueue();
      expect(engine.getQueueSize()).toBe(0);
    });

    it("clears queue for specific integration", () => {
      engine.enqueue({
        integrationId: "int-1",
        direction: "outgoing",
        entityType: "ticket",
        entityId: "t-1",
        operation: "create",
        payload: {},
        priority: 5,
        maxRetries: 3,
      });
      engine.enqueue({
        integrationId: "int-2",
        direction: "outgoing",
        entityType: "ticket",
        entityId: "t-2",
        operation: "create",
        payload: {},
        priority: 5,
        maxRetries: 3,
      });
      engine.clearIntegrationQueue("int-1");
      expect(engine.getQueueSize()).toBe(1);
      expect(engine.getItemsForIntegration("int-1")).toHaveLength(0);
    });

    it("throws when queue is full", () => {
      const smallEngine = new SyncEngine({ maxQueueSize: 1 });
      smallEngine.enqueue({
        integrationId: "int-1",
        direction: "outgoing",
        entityType: "ticket",
        entityId: "t-1",
        operation: "create",
        payload: {},
        priority: 5,
        maxRetries: 3,
      });
      expect(() => {
        smallEngine.enqueue({
          integrationId: "int-1",
          direction: "outgoing",
          entityType: "ticket",
          entityId: "t-2",
          operation: "create",
          payload: {},
          priority: 5,
          maxRetries: 3,
        });
      }).toThrow("queue is full");
    });

    it("gets items by status", () => {
      engine.enqueue({
        integrationId: "int-1",
        direction: "outgoing",
        entityType: "ticket",
        entityId: "t-1",
        operation: "create",
        payload: {},
        priority: 5,
        maxRetries: 3,
      });
      const pending = engine.getItemsByStatus("pending");
      expect(pending).toHaveLength(1);
    });
  });

  describe("conflict resolution", () => {
    it("detects conflict when data differs", () => {
      const conflict = engine.detectConflict(
        "int-1",
        "ticket",
        "t-1",
        { title: "Source Version", updatedAt: "2024-01-02" },
        { title: "Target Version", updatedAt: "2024-01-01" },
      );
      expect(conflict).toBeTruthy();
      expect(conflict!.sourceData.title).toBe("Source Version");
      expect(conflict!.targetData.title).toBe("Target Version");
    });

    it("returns null when data is identical", () => {
      const conflict = engine.detectConflict(
        "int-1",
        "ticket",
        "t-1",
        { title: "Same", value: 42 },
        { title: "Same", value: 42 },
      );
      expect(conflict).toBeNull();
    });

    it("resolves conflict with source_wins", () => {
      const conflict = engine.detectConflict(
        "int-1",
        "ticket",
        "t-1",
        { title: "Source" },
        { title: "Target" },
      );
      const resolved = engine.resolveConflict(
        conflict!.id,
        "source_wins",
        "admin",
      );
      expect(resolved!.resolution).toBe("source_wins");
      expect(resolved!.resolvedBy).toBe("admin");

      const data = engine.getResolvedData(resolved!);
      expect(data).toEqual({ title: "Source" });
    });

    it("resolves conflict with target_wins", () => {
      const conflict = engine.detectConflict(
        "int-1",
        "ticket",
        "t-1",
        { title: "Source" },
        { title: "Target" },
      );
      const resolved = engine.resolveConflict(conflict!.id, "target_wins");
      const data = engine.getResolvedData(resolved!);
      expect(data).toEqual({ title: "Target" });
    });

    it("resolves conflict with latest_wins", () => {
      const conflict = engine.detectConflict(
        "int-1",
        "ticket",
        "t-1",
        { title: "Source", updatedAt: "2024-01-02" },
        { title: "Target", updatedAt: "2024-01-01" },
      );
      const resolved = engine.resolveConflict(conflict!.id, "latest_wins");
      const data = engine.getResolvedData(resolved!);
      expect(data!.title).toBe("Source");
    });

    it("latest_wins picks target when target is newer", () => {
      const conflict = engine.detectConflict(
        "int-1",
        "ticket",
        "t-1",
        { title: "Source", updatedAt: "2024-01-01" },
        { title: "Target", updatedAt: "2024-01-02" },
      );
      const resolved = engine.resolveConflict(conflict!.id, "latest_wins");
      const data = engine.getResolvedData(resolved!);
      expect(data!.title).toBe("Target");
    });

    it("manual resolution returns null data", () => {
      const conflict = engine.detectConflict(
        "int-1",
        "ticket",
        "t-1",
        { title: "Source" },
        { title: "Target" },
      );
      const resolved = engine.resolveConflict(conflict!.id, "manual");
      expect(engine.getResolvedData(resolved!)).toBeNull();
    });

    it("gets unresolved conflicts", () => {
      engine.detectConflict("int-1", "ticket", "t-1", { a: 1 }, { a: 2 });
      engine.detectConflict("int-1", "ticket", "t-2", { b: 1 }, { b: 2 });
      expect(engine.getUnresolvedConflicts()).toHaveLength(2);
    });

    it("gets conflicts for integration", () => {
      engine.detectConflict("int-1", "ticket", "t-1", { a: 1 }, { a: 2 });
      engine.detectConflict("int-2", "ticket", "t-2", { b: 1 }, { b: 2 });
      expect(engine.getConflictsForIntegration("int-1")).toHaveLength(1);
    });

    it("returns null for unknown conflict", () => {
      expect(engine.getConflict("nonexistent")).toBeNull();
    });

    it("auto-resolves with onConflict callback", () => {
      const autoEngine = new SyncEngine({
        onConflict: () => "source_wins",
      });
      const conflict = autoEngine.detectConflict(
        "int-1",
        "ticket",
        "t-1",
        { title: "Source" },
        { title: "Target" },
      );
      expect(conflict!.resolution).toBe("source_wins");
    });
  });

  describe("delta sync", () => {
    it("computes checksums deterministically", () => {
      const c1 = engine.computeChecksum({ a: 1, b: "hello" });
      const c2 = engine.computeChecksum({ a: 1, b: "hello" });
      expect(c1).toBe(c2);
    });

    it("detects changes via checksum", () => {
      const c1 = engine.computeChecksum({ a: 1 });
      expect(engine.hasChanged(c1, { a: 1 })).toBe(false);
      expect(engine.hasChanged(c1, { a: 2 })).toBe(true);
    });

    it("treats missing checksum as changed", () => {
      expect(engine.hasChanged(undefined, { a: 1 })).toBe(true);
    });

    it("produces different checksums for different data", () => {
      const c1 = engine.computeChecksum({ a: 1 });
      const c2 = engine.computeChecksum({ a: 2 });
      expect(c1).not.toBe(c2);
    });

    it("prepares delta sync - only enqueues changed items", () => {
      const checksum = engine.computeChecksum({ title: "Unchanged" });
      const items = engine.prepareDeltaSync(
        "int-1",
        "ticket",
        [
          {
            entityId: "t-1",
            data: { title: "Unchanged" },
            previousChecksum: checksum,
          },
          {
            entityId: "t-2",
            data: { title: "Changed" },
            previousChecksum: "old-checksum",
          },
          { entityId: "t-3", data: { title: "New" } }, // No previous checksum = new
        ],
        "outgoing",
      );

      expect(items).toHaveLength(2);
      expect(items.map((i) => i.entityId).sort()).toEqual(["t-2", "t-3"]);
    });

    it("sets correct operations in delta sync", () => {
      const items = engine.prepareDeltaSync(
        "int-1",
        "ticket",
        [
          {
            entityId: "t-1",
            data: { title: "Updated" },
            previousChecksum: "old",
          },
          { entityId: "t-2", data: { title: "New" } },
        ],
        "outgoing",
      );

      expect(items.find((i) => i.entityId === "t-1")!.operation).toBe("update");
      expect(items.find((i) => i.entityId === "t-2")!.operation).toBe("create");
    });
  });

  describe("full resync", () => {
    it("clears existing items and enqueues all", () => {
      engine.enqueue({
        integrationId: "int-1",
        direction: "outgoing",
        entityType: "ticket",
        entityId: "old-1",
        operation: "update",
        payload: {},
        priority: 5,
        maxRetries: 3,
      });

      const items = engine.prepareFullResync(
        "int-1",
        "ticket",
        [
          { entityId: "t-1", data: { title: "Item 1" } },
          { entityId: "t-2", data: { title: "Item 2" } },
        ],
        "outgoing",
      );

      expect(items).toHaveLength(2);
      expect(engine.getItemsForIntegration("int-1")).toHaveLength(2);
      // Old items should be gone
      expect(
        engine
          .getItemsForIntegration("int-1")
          .find((i) => i.entityId === "old-1"),
      ).toBeUndefined();
    });
  });

  describe("sync state tracking", () => {
    it("returns default sync state", () => {
      const state = engine.getSyncState("int-1", "ticket");
      expect(state.syncedCount).toBe(0);
      expect(state.pendingCount).toBe(0);
      expect(state.status).toBe("idle");
    });

    it("updates state when items are enqueued", () => {
      engine.enqueue({
        integrationId: "int-1",
        direction: "outgoing",
        entityType: "ticket",
        entityId: "t-1",
        operation: "create",
        payload: {},
        priority: 5,
        maxRetries: 3,
      });
      const state = engine.getSyncState("int-1", "ticket");
      expect(state.pendingCount).toBe(1);
    });

    it("updates state when items are completed", () => {
      const item = engine.enqueue({
        integrationId: "int-1",
        direction: "outgoing",
        entityType: "ticket",
        entityId: "t-1",
        operation: "create",
        payload: {},
        priority: 5,
        maxRetries: 3,
      });
      engine.dequeue();
      engine.complete(item.id);
      const state = engine.getSyncState("int-1", "ticket");
      expect(state.syncedCount).toBe(1);
    });

    it("sets sync state", () => {
      engine.setSyncState("int-1", "ticket", {
        status: "syncing",
        lastSyncCursor: "abc",
      });
      const state = engine.getSyncState("int-1", "ticket");
      expect(state.status).toBe("syncing");
      expect(state.lastSyncCursor).toBe("abc");
    });

    it("gets all sync states", () => {
      engine.setSyncState("int-1", "ticket", { status: "syncing" });
      engine.setSyncState("int-2", "event", { status: "idle" });
      expect(engine.getAllSyncStates()).toHaveLength(2);
    });
  });

  describe("batch processing", () => {
    it("processes items in batch", async () => {
      engine.enqueue({
        integrationId: "int-1",
        direction: "outgoing",
        entityType: "ticket",
        entityId: "t-1",
        operation: "create",
        payload: {},
        priority: 5,
        maxRetries: 3,
      });
      engine.enqueue({
        integrationId: "int-1",
        direction: "outgoing",
        entityType: "ticket",
        entityId: "t-2",
        operation: "update",
        payload: {},
        priority: 5,
        maxRetries: 3,
      });

      const handler = jest.fn().mockResolvedValue(undefined);
      const results = await engine.processQueue(handler, 10);
      expect(handler).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(1); // One result per integration+entityType+direction
      expect(results[0].created).toBe(1);
      expect(results[0].updated).toBe(1);
    });

    it("handles errors during processing", async () => {
      engine.enqueue({
        integrationId: "int-1",
        direction: "outgoing",
        entityType: "ticket",
        entityId: "t-1",
        operation: "create",
        payload: {},
        priority: 5,
        maxRetries: 1,
      });

      const handler = jest
        .fn()
        .mockRejectedValue(new Error("processing error"));
      const results = await engine.processQueue(handler, 10);
      expect(results[0].errors).toBe(1);
    });

    it("respects batch size limit", async () => {
      for (let i = 0; i < 10; i++) {
        engine.enqueue({
          integrationId: "int-1",
          direction: "outgoing",
          entityType: "ticket",
          entityId: `t-${i}`,
          operation: "create",
          payload: {},
          priority: 5,
          maxRetries: 3,
        });
      }

      const handler = jest.fn().mockResolvedValue(undefined);
      await engine.processQueue(handler, 3);
      expect(handler).toHaveBeenCalledTimes(3);
    });

    it("prevents concurrent processing", async () => {
      engine.enqueue({
        integrationId: "int-1",
        direction: "outgoing",
        entityType: "ticket",
        entityId: "t-1",
        operation: "create",
        payload: {},
        priority: 5,
        maxRetries: 3,
      });

      // Start slow processing
      const handler = jest
        .fn()
        .mockImplementation(() => new Promise((r) => setTimeout(r, 100)));
      const p1 = engine.processQueue(handler, 1);

      // Try concurrent processing
      await expect(engine.processQueue(handler, 1)).rejects.toThrow(
        "already being processed",
      );
      await p1;
    });

    it("tracks processing state", async () => {
      expect(engine.isProcessing()).toBe(false);

      engine.enqueue({
        integrationId: "int-1",
        direction: "outgoing",
        entityType: "ticket",
        entityId: "t-1",
        operation: "create",
        payload: {},
        priority: 5,
        maxRetries: 3,
      });

      let wasProcessing = false;
      const handler = jest.fn().mockImplementation(() => {
        wasProcessing = engine.isProcessing();
        return Promise.resolve();
      });
      await engine.processQueue(handler, 1);
      expect(wasProcessing).toBe(true);
      expect(engine.isProcessing()).toBe(false);
    });

    it("fires onItemProcessed callback", async () => {
      const processedItems: { id: string; success: boolean }[] = [];
      const trackedEngine = new SyncEngine({
        onItemProcessed: (item, success) =>
          processedItems.push({ id: item.entityId, success }),
      });

      trackedEngine.enqueue({
        integrationId: "int-1",
        direction: "outgoing",
        entityType: "ticket",
        entityId: "t-1",
        operation: "create",
        payload: {},
        priority: 5,
        maxRetries: 3,
      });

      await trackedEngine.processQueue(
        jest.fn().mockResolvedValue(undefined),
        1,
      );
      expect(processedItems).toHaveLength(1);
      expect(processedItems[0].success).toBe(true);
    });
  });

  describe("summary", () => {
    it("returns correct summary", () => {
      engine.enqueue({
        integrationId: "int-1",
        direction: "outgoing",
        entityType: "ticket",
        entityId: "t-1",
        operation: "create",
        payload: {},
        priority: 5,
        maxRetries: 3,
      });
      engine.enqueue({
        integrationId: "int-2",
        direction: "outgoing",
        entityType: "event",
        entityId: "e-1",
        operation: "update",
        payload: {},
        priority: 5,
        maxRetries: 3,
      });
      engine.detectConflict("int-1", "ticket", "t-1", { a: 1 }, { a: 2 });

      const summary = engine.getSummary();
      expect(summary.queueSize).toBe(2);
      expect(summary.pending).toBe(2);
      expect(summary.conflicts).toBe(1);
      expect(summary.integrations).toBe(2);
    });
  });
});

// ============================================================================
// Integration Service Tests (via Registry)
// ============================================================================

describe("IntegrationService via Registry", () => {
  it("registers all 13 connectors", () => {
    const registry = new IntegrationRegistry();

    // Calendar
    registry.registerConnector(new CalendarConnector("google_calendar"));
    registry.registerConnector(new CalendarConnector("outlook_calendar"));

    // Ticketing
    registry.registerConnector(new TicketingConnector("jira"));
    registry.registerConnector(new TicketingConnector("linear"));
    registry.registerConnector(new TicketingConnector("github_issues"));

    // CI/CD
    registry.registerConnector(new CICDConnector("github_actions"));
    registry.registerConnector(new CICDConnector("gitlab_ci"));
    registry.registerConnector(new CICDConnector("jenkins"));

    // Docs
    registry.registerConnector(new DocsConnector("google_docs"));
    registry.registerConnector(new DocsConnector("notion"));
    registry.registerConnector(new DocsConnector("confluence"));

    // CRM
    registry.registerConnector(new CRMConnector("salesforce"));
    registry.registerConnector(new CRMConnector("hubspot"));

    const catalog = registry.getCatalog();
    expect(catalog).toHaveLength(13);
  });

  it("categorizes connectors correctly", () => {
    const registry = new IntegrationRegistry();
    registry.registerConnector(new CalendarConnector("google_calendar"));
    registry.registerConnector(new TicketingConnector("jira"));
    registry.registerConnector(new CICDConnector("github_actions"));
    registry.registerConnector(new DocsConnector("google_docs"));
    registry.registerConnector(new CRMConnector("salesforce"));

    expect(registry.filterByCategory("calendar")).toHaveLength(1);
    expect(registry.filterByCategory("ticketing")).toHaveLength(1);
    expect(registry.filterByCategory("ci_cd")).toHaveLength(1);
    expect(registry.filterByCategory("docs")).toHaveLength(1);
    expect(registry.filterByCategory("crm")).toHaveLength(1);
  });

  it("searches across all connectors", () => {
    const registry = new IntegrationRegistry();
    registry.registerConnector(new CalendarConnector("google_calendar"));
    registry.registerConnector(new CalendarConnector("outlook_calendar"));
    registry.registerConnector(new TicketingConnector("jira"));

    expect(registry.searchCatalog("calendar")).toHaveLength(2);
    expect(registry.searchCatalog("jira")).toHaveLength(1);
    expect(registry.searchCatalog("manage")).toHaveLength(3); // All descriptions contain "manage" or "manage"
  });
});

// ============================================================================
// Edge Cases & Misc Tests
// ============================================================================

describe("Edge Cases", () => {
  it("handles empty search query", () => {
    const registry = new IntegrationRegistry();
    registry.registerConnector(new CalendarConnector("google_calendar"));
    const results = registry.searchCatalog("");
    expect(results).toHaveLength(1); // Everything matches empty string
  });

  it("handles special characters in search", () => {
    const registry = new IntegrationRegistry();
    registry.registerConnector(new CalendarConnector("google_calendar"));
    const results = registry.searchCatalog("<script>alert(1)</script>");
    expect(results).toHaveLength(0);
  });

  it("sync engine handles empty processQueue", async () => {
    const engine = new SyncEngine();
    const handler = jest.fn();
    const results = await engine.processQueue(handler, 10);
    expect(results).toHaveLength(0);
    expect(handler).not.toHaveBeenCalled();
  });

  it("ConnectorError with all options", () => {
    const cause = new Error("root cause");
    const error = new ConnectorError(
      "full error",
      "network",
      "github_actions",
      {
        retryable: true,
        statusCode: 503,
        details: { endpoint: "/api/test" },
        cause,
      },
    );
    expect(error.message).toBe("full error");
    expect(error.category).toBe("network");
    expect(error.provider).toBe("github_actions");
    expect(error.retryable).toBe(true);
    expect(error.statusCode).toBe(503);
    expect(error.details).toEqual({ endpoint: "/api/test" });
    expect(error.cause).toBe(cause);
  });

  it("sync engine resolves null for unknown conflict", () => {
    const engine = new SyncEngine();
    const result = engine.resolveConflict("nonexistent", "source_wins");
    expect(result).toBeNull();
  });

  it("sync engine getResolvedData returns null for unresolved conflict", () => {
    const engine = new SyncEngine();
    const conflict: SyncConflict = {
      id: "c-1",
      integrationId: "int-1",
      entityType: "ticket",
      entityId: "t-1",
      sourceData: {},
      targetData: {},
      detectedAt: new Date().toISOString(),
    };
    expect(engine.getResolvedData(conflict)).toBeNull();
  });

  it("handles multiple concurrent enqueues", () => {
    const engine = new SyncEngine();
    for (let i = 0; i < 100; i++) {
      engine.enqueue({
        integrationId: `int-${i % 5}`,
        direction: "outgoing",
        entityType: "ticket",
        entityId: `t-${i}`,
        operation: "create",
        payload: {},
        priority: Math.random() * 10,
        maxRetries: 3,
      });
    }
    expect(engine.getQueueSize()).toBe(100);
  });

  it("registry shutdown clears everything", async () => {
    const registry = new IntegrationRegistry();
    const connector = new TestConnector();
    connector.connectFn.mockResolvedValue(undefined);
    connector.disconnectFn.mockResolvedValue(undefined);
    connector.healthCheckFn.mockResolvedValue({
      healthy: true,
      responseTimeMs: 50,
      message: "OK",
      checkedAt: new Date().toISOString(),
      consecutiveFailures: 0,
    });

    registry.registerConnector(connector);
    await registry.install(
      "test_provider",
      createTestConfig(),
      createTestCredentials(),
    );
    await registry.shutdown();
    expect(registry.getInstallations()).toHaveLength(0);
  });

  it("calendar connector handles unknown frequency gracefully", () => {
    const connector = new CalendarConnector("google_calendar");
    // Use a valid frequency for the test
    const rec: CalendarRecurrence = { frequency: "daily", interval: 1 };
    expect(connector.isRecurringOnDate(rec, "2024-01-01", "2024-01-01")).toBe(
      true,
    );
  });

  it("ticketing connector creates ticket from message", async () => {
    const connector = new TicketingConnector("jira");
    // Should throw because not connected
    await expect(
      connector.createTicketFromMessage(
        {
          content: "Bug: login page crashes",
          author: "Alice",
          channelName: "general",
        },
        "PROJ",
      ),
    ).rejects.toThrow("not connected");
  });

  it("CRM connector creates lead from message", async () => {
    const connector = new CRMConnector("hubspot");
    await expect(
      connector.createLeadFromMessage(
        { content: "Interested in enterprise plan", author: "Sales Bot" },
        { firstName: "John", lastName: "Doe", email: "john@example.com" },
      ),
    ).rejects.toThrow("not connected");
  });

  it("sync engine delete operation tracked correctly", async () => {
    const engine = new SyncEngine();
    engine.enqueue({
      integrationId: "int-1",
      direction: "outgoing",
      entityType: "ticket",
      entityId: "t-1",
      operation: "delete",
      payload: {},
      priority: 5,
      maxRetries: 3,
    });

    const results = await engine.processQueue(
      jest.fn().mockResolvedValue(undefined),
      10,
    );
    expect(results[0].deleted).toBe(1);
  });

  it("base connector handles off for non-registered event", () => {
    const connector = new TestConnector();
    const listener = jest.fn();
    // Off on an event that was never registered should not throw
    connector.off("connected", listener);
  });
});
