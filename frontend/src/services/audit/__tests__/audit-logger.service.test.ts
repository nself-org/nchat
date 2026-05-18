/**
 * Audit Logger Service Tests
 *
 * Comprehensive test suite for the audit logging service.
 */

import {
  AuditLoggerService,
  createAuditLoggerService,
  getAuditLoggerService,
  type AuditLoggerServiceConfig,
} from "../audit-logger.service";

// Mock uuid
jest.mock("uuid", () => ({
  v4: jest.fn(() => "mock-uuid-" + Math.random().toString(36).substr(2, 9)),
}));

describe("AuditLoggerService", () => {
  let service: AuditLoggerService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = createAuditLoggerService({
      enableIntegrity: false, // Disable integrity for faster tests
      batchSize: 100,
      flushIntervalMs: 60000, // Long interval to prevent auto-flush
    });
  });

  afterEach(() => {
    service.destroy();
  });

  // ===========================================================================
  // Constructor and Configuration Tests
  // ===========================================================================
  describe("Constructor and Configuration", () => {
    it("creates service with default configuration", () => {
      const defaultService = createAuditLoggerService();
      const config = defaultService.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.enableIntegrity).toBe(true);
      expect(config.batchSize).toBe(50);
      expect(config.sensitiveFieldMasking).toBe(true);
      expect(config.ipLoggingEnabled).toBe(true);

      defaultService.destroy();
    });

    it("creates service with custom configuration", () => {
      const customConfig: Partial<AuditLoggerServiceConfig> = {
        enabled: false,
        batchSize: 100,
        sensitiveFieldMasking: false,
      };

      const customService = createAuditLoggerService(customConfig);
      const config = customService.getConfig();

      expect(config.enabled).toBe(false);
      expect(config.batchSize).toBe(100);
      expect(config.sensitiveFieldMasking).toBe(false);

      customService.destroy();
    });

    it("updates configuration via configure method", () => {
      service.configure({ batchSize: 200 });
      expect(service.getConfig().batchSize).toBe(200);
    });

    it("enables and disables logging", () => {
      service.setEnabled(false);
      expect(service.getConfig().enabled).toBe(false);

      service.setEnabled(true);
      expect(service.getConfig().enabled).toBe(true);
    });
  });

  // ===========================================================================
  // Core Logging Tests
  // ===========================================================================
  describe("Core Logging", () => {
    it("logs a basic audit event", async () => {
      const entry = await service.log({
        category: "user",
        action: "login",
        actor: "user-123",
        description: "User logged in",
      });

      expect(entry).not.toBeNull();
      expect(entry?.id).toBeDefined();
      expect(entry?.category).toBe("user");
      expect(entry?.action).toBe("login");
      expect(entry?.actor.id).toBe("user-123");
      expect(entry?.description).toBe("User logged in");
      expect(entry?.timestamp).toBeInstanceOf(Date);
    });

    it("logs event with full actor object", async () => {
      const entry = await service.log({
        category: "user",
        action: "login",
        actor: {
          id: "user-123",
          type: "user",
          email: "test@example.com",
          username: "testuser",
          displayName: "Test User",
        },
        description: "User logged in",
      });

      expect(entry?.actor.id).toBe("user-123");
      expect(entry?.actor.email).toBe("test@example.com");
      expect(entry?.actor.displayName).toBe("Test User");
    });

    it("logs event with resource", async () => {
      const entry = await service.log({
        category: "message",
        action: "create",
        actor: "user-123",
        description: "Message created",
        resource: {
          type: "message",
          id: "msg-456",
          name: "Test Message",
        },
      });

      expect(entry?.resource).toBeDefined();
      expect(entry?.resource?.type).toBe("message");
      expect(entry?.resource?.id).toBe("msg-456");
    });

    it("logs event with target", async () => {
      const entry = await service.log({
        category: "admin",
        action: "user_ban",
        actor: "admin-123",
        description: "User banned",
        target: {
          type: "user",
          id: "user-456",
        },
      });

      expect(entry?.target).toBeDefined();
      expect(entry?.target?.type).toBe("user");
      expect(entry?.target?.id).toBe("user-456");
    });

    it("logs event with metadata", async () => {
      const entry = await service.log({
        category: "user",
        action: "login",
        actor: "user-123",
        description: "User logged in",
        metadata: {
          browser: "Chrome",
          os: "Windows",
          location: "New York",
        },
      });

      expect(entry?.metadata).toBeDefined();
      expect(entry?.metadata?.browser).toBe("Chrome");
      expect(entry?.metadata?.os).toBe("Windows");
    });

    it("logs event with IP address when enabled", async () => {
      const entry = await service.log({
        category: "user",
        action: "login",
        actor: "user-123",
        description: "User logged in",
        ipAddress: "192.168.1.1",
      });

      expect(entry?.ipAddress).toBe("192.168.1.1");
    });

    it("does not log IP when disabled", async () => {
      service.configure({ ipLoggingEnabled: false });

      const entry = await service.log({
        category: "user",
        action: "login",
        actor: "user-123",
        description: "User logged in",
        ipAddress: "192.168.1.1",
      });

      expect(entry?.ipAddress).toBeUndefined();
    });

    it("logs event with request and correlation IDs", async () => {
      const entry = await service.log({
        category: "user",
        action: "login",
        actor: "user-123",
        description: "User logged in",
        requestId: "req-789",
        correlationId: "corr-012",
      });

      expect(entry?.requestId).toBe("req-789");
      expect(entry?.correlationId).toBe("corr-012");
    });

    it("logs successful event by default", async () => {
      const entry = await service.log({
        category: "user",
        action: "login",
        actor: "user-123",
        description: "User logged in",
      });

      expect(entry?.success).toBe(true);
    });

    it("logs failed event with error message", async () => {
      const entry = await service.log({
        category: "user",
        action: "login",
        actor: "user-123",
        description: "Login failed",
        success: false,
        errorMessage: "Invalid credentials",
      });

      expect(entry?.success).toBe(false);
      expect(entry?.errorMessage).toBe("Invalid credentials");
    });

    it("returns null when logging is disabled", async () => {
      service.setEnabled(false);

      const entry = await service.log({
        category: "user",
        action: "login",
        actor: "user-123",
        description: "User logged in",
      });

      expect(entry).toBeNull();
    });
  });

  // ===========================================================================
  // Sensitive Field Masking Tests
  // ===========================================================================
  describe("Sensitive Field Masking", () => {
    it("masks password in metadata", async () => {
      const entry = await service.log({
        category: "user",
        action: "password_change",
        actor: "user-123",
        description: "Password changed",
        metadata: {
          password: "secretPassword123",
          oldPassword: "oldSecret",
        },
      });

      expect(entry?.metadata?.password).toBe("[REDACTED]");
    });

    it("masks API key in metadata", async () => {
      const entry = await service.log({
        category: "security",
        action: "api_key_create",
        actor: "user-123",
        description: "API key created",
        metadata: {
          apiKey: "sk_live_abc123",
          api_key: "another_key",
        },
      });

      expect(entry?.metadata?.apiKey).toBe("[REDACTED]");
      expect(entry?.metadata?.api_key).toBe("[REDACTED]");
    });

    it("masks token fields", async () => {
      const entry = await service.log({
        category: "user",
        action: "login",
        actor: "user-123",
        description: "User logged in",
        metadata: {
          token: "jwt.token.here",
          accessToken: "access-123",
          access_token: "access-456",
          refreshToken: "refresh-789",
        },
      });

      expect(entry?.metadata?.token).toBe("[REDACTED]");
      expect(entry?.metadata?.accessToken).toBe("[REDACTED]");
      expect(entry?.metadata?.access_token).toBe("[REDACTED]");
      expect(entry?.metadata?.refreshToken).toBe("[REDACTED]");
    });

    it("does not mask when masking is disabled", async () => {
      service.configure({ sensitiveFieldMasking: false });

      const entry = await service.log({
        category: "user",
        action: "login",
        actor: "user-123",
        description: "User logged in",
        metadata: {
          password: "secretPassword123",
        },
      });

      expect(entry?.metadata?.password).toBe("secretPassword123");
    });

    it("preserves non-sensitive fields", async () => {
      const entry = await service.log({
        category: "user",
        action: "login",
        actor: "user-123",
        description: "User logged in",
        metadata: {
          password: "secret",
          browser: "Chrome",
          location: "New York",
        },
      });

      expect(entry?.metadata?.password).toBe("[REDACTED]");
      expect(entry?.metadata?.browser).toBe("Chrome");
      expect(entry?.metadata?.location).toBe("New York");
    });
  });

  // ===========================================================================
  // Convenience Method Tests
  // ===========================================================================
  describe("Convenience Methods", () => {
    describe("logAuth", () => {
      it("logs login event", async () => {
        const entry = await service.logAuth("login", {
          actor: "user-123",
          ipAddress: "192.168.1.1",
        });

        expect(entry?.category).toBe("user");
        expect(entry?.action).toBe("login");
        expect(entry?.severity).toBe("info");
      });

      it("logs failed login with appropriate severity", async () => {
        const entry = await service.logAuth("failed_login", {
          actor: "user-123",
          success: false,
          errorMessage: "Invalid password",
        });

        expect(entry?.action).toBe("failed_login");
        expect(entry?.severity).toBe("warning");
        expect(entry?.success).toBe(false);
      });

      it("logs password change event", async () => {
        const entry = await service.logAuth("password_change", {
          actor: "user-123",
        });

        expect(entry?.action).toBe("password_change");
        expect(entry?.severity).toBe("warning");
      });

      it("logs MFA events", async () => {
        const enableEntry = await service.logAuth("mfa_enable", {
          actor: "user-123",
        });

        const disableEntry = await service.logAuth("mfa_disable", {
          actor: "user-123",
        });

        expect(enableEntry?.severity).toBe("info");
        expect(disableEntry?.severity).toBe("warning");
      });
    });

    describe("logAuthz", () => {
      it("logs role assignment", async () => {
        const entry = await service.logAuthz("role_assigned", "user-123", {
          actor: "admin-456",
          targetUserId: "user-123",
          role: "moderator",
        });

        expect(entry?.category).toBe("admin");
        expect(entry?.action).toBe("role_assigned");
        expect(entry?.metadata?.role).toBe("moderator");
        expect(entry?.target?.id).toBe("user-123");
      });

      it("logs permission changes", async () => {
        const entry = await service.logAuthz("permission_change", "user-123", {
          actor: "admin-456",
          permissions: ["read", "write", "delete"],
        });

        expect(entry?.action).toBe("permission_change");
        expect(entry?.metadata?.permissions).toContain("read");
        expect(entry?.metadata?.permissions).toContain("write");
      });
    });

    describe("logDataAccess", () => {
      it("logs file download", async () => {
        const entry = await service.logDataAccess(
          "download",
          "file",
          "file-123",
          {
            actor: "user-123",
            resourceName: "document.pdf",
          },
        );

        expect(entry?.category).toBe("file");
        expect(entry?.action).toBe("download");
        expect(entry?.resource?.id).toBe("file-123");
        expect(entry?.severity).toBe("info");
      });

      it("logs delete with warning severity", async () => {
        const entry = await service.logDataAccess(
          "delete",
          "message",
          "msg-123",
          {
            actor: "user-123",
          },
        );

        expect(entry?.action).toBe("delete");
        expect(entry?.severity).toBe("warning");
      });

      it("logs bulk delete with warning severity", async () => {
        const entry = await service.logDataAccess(
          "bulk_delete",
          "message",
          "batch-123",
          {
            actor: "admin-123",
            metadata: { count: 50 },
          },
        );

        expect(entry?.action).toBe("bulk_delete");
        expect(entry?.severity).toBe("warning");
        expect(entry?.metadata?.count).toBe(50);
      });
    });

    describe("logConfigChange", () => {
      it("logs settings change", async () => {
        const entry = await service.logConfigChange("settings_change", {
          actor: "admin-123",
          settingName: "notifications.enabled",
          previousValue: true,
          newValue: false,
        });

        expect(entry?.category).toBe("admin");
        expect(entry?.action).toBe("settings_change");
        expect(entry?.metadata?.settingName).toBe("notifications.enabled");
        expect(entry?.metadata?.previousValue).toBe(true);
        expect(entry?.metadata?.newValue).toBe(false);
      });

      it("logs feature toggle", async () => {
        const entry = await service.logConfigChange("feature_toggle", {
          actor: "admin-123",
          settingName: "darkMode",
          newValue: true,
        });

        expect(entry?.action).toBe("feature_toggle");
        expect(entry?.severity).toBe("warning");
      });
    });

    describe("logModeration", () => {
      it("logs user ban", async () => {
        const entry = await service.logModeration("user_banned", "user-123", {
          actor: "mod-456",
          reason: "Spam",
          duration: 86400,
          channelId: "channel-789",
        });

        expect(entry?.category).toBe("moderation");
        expect(entry?.action).toBe("user_banned");
        expect(entry?.target?.id).toBe("user-123");
        expect(entry?.metadata?.reason).toBe("Spam");
        expect(entry?.metadata?.duration).toBe(86400);
        expect(entry?.severity).toBe("warning");
      });

      it("logs user warning with lower severity", async () => {
        const entry = await service.logModeration("user_warned", "user-123", {
          actor: "mod-456",
          reason: "Minor violation",
        });

        expect(entry?.action).toBe("user_warned");
        expect(entry?.severity).toBe("info");
      });

      it("logs content deletion", async () => {
        const entry = await service.logModeration(
          "content_deleted",
          "user-123",
          {
            actor: "mod-456",
            metadata: { messageId: "msg-789" },
          },
        );

        expect(entry?.action).toBe("content_deleted");
        expect(entry?.severity).toBe("warning");
      });
    });

    describe("logSecurity", () => {
      it("logs suspicious activity", async () => {
        const entry = await service.logSecurity("suspicious_activity", {
          actor: "user-123",
          threatLevel: "high",
          ipAddress: "192.168.1.1",
        });

        expect(entry?.category).toBe("security");
        expect(entry?.action).toBe("suspicious_activity");
        expect(entry?.metadata?.threatLevel).toBe("high");
        expect(entry?.severity).toBe("warning");
      });

      it("logs API key creation", async () => {
        const entry = await service.logSecurity("api_key_create", {
          actor: "user-123",
          metadata: { keyName: "Production Key" },
        });

        expect(entry?.action).toBe("api_key_create");
        expect(entry?.severity).toBe("info");
      });

      it("logs IP blocking", async () => {
        const entry = await service.logSecurity("ip_blocked", {
          actor: { id: "system", type: "system" },
          metadata: { blockedIp: "10.0.0.1" },
        });

        expect(entry?.action).toBe("ip_blocked");
        expect(entry?.actor.type).toBe("system");
      });
    });
  });

  // ===========================================================================
  // Queue and Batch Processing Tests
  // ===========================================================================
  describe("Queue and Batch Processing", () => {
    it("adds entries to queue", async () => {
      await service.log({
        category: "user",
        action: "login",
        actor: "user-1",
        description: "Login 1",
      });

      await service.log({
        category: "user",
        action: "login",
        actor: "user-2",
        description: "Login 2",
      });

      expect(service.getQueueSize()).toBe(2);
    });

    it("flushes queue and returns entries", async () => {
      await service.log({
        category: "user",
        action: "login",
        actor: "user-1",
        description: "Login 1",
      });

      await service.log({
        category: "user",
        action: "login",
        actor: "user-2",
        description: "Login 2",
      });

      const flushed = await service.flush();

      expect(flushed.length).toBe(2);
      expect(service.getQueueSize()).toBe(0);
    });

    it("clears queue", async () => {
      await service.log({
        category: "user",
        action: "login",
        actor: "user-1",
        description: "Login 1",
      });

      service.clearQueue();

      expect(service.getQueueSize()).toBe(0);
    });

    it("returns pending entries", async () => {
      await service.log({
        category: "user",
        action: "login",
        actor: "user-1",
        description: "Login 1",
      });

      const pending = service.getPendingEntries();

      expect(pending.length).toBe(1);
      expect(pending[0].actor.id).toBe("user-1");
    });

    it("auto-flushes when batch size reached", async () => {
      const onBatchFlush = jest.fn();
      const batchService = createAuditLoggerService({
        enableIntegrity: false,
        batchSize: 2,
        onBatchFlush,
      });

      await batchService.log({
        category: "user",
        action: "login",
        actor: "user-1",
        description: "Login 1",
      });
      await batchService.log({
        category: "user",
        action: "login",
        actor: "user-2",
        description: "Login 2",
      });

      // Wait for async flush
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(onBatchFlush).toHaveBeenCalled();

      batchService.destroy();
    });

    it("calls onLog callback for each entry", async () => {
      const onLog = jest.fn();
      const callbackService = createAuditLoggerService({
        enableIntegrity: false,
        onLog,
      });

      await callbackService.log({
        category: "user",
        action: "login",
        actor: "user-1",
        description: "Login 1",
      });

      expect(onLog).toHaveBeenCalledTimes(1);
      expect(onLog).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "user",
          action: "login",
        }),
      );

      callbackService.destroy();
    });
  });

  // ===========================================================================
  // Statistics Tests
  // ===========================================================================
  describe("Statistics", () => {
    it("tracks total logged events", async () => {
      await service.log({
        category: "user",
        action: "login",
        actor: "user-1",
        description: "Test",
      });
      await service.log({
        category: "user",
        action: "logout",
        actor: "user-1",
        description: "Test",
      });

      const stats = service.getStats();
      expect(stats.totalLogged).toBe(2);
    });

    it("tracks events by severity", async () => {
      await service.log({
        category: "user",
        action: "login",
        actor: "user-1",
        description: "Test",
        severity: "info",
      });
      await service.log({
        category: "security",
        action: "suspicious_activity",
        actor: "user-1",
        description: "Test",
        severity: "warning",
      });
      await service.log({
        category: "security",
        action: "suspicious_activity",
        actor: "user-1",
        description: "Test",
        severity: "critical",
      });

      const stats = service.getStats();
      expect(stats.bySeverity.info).toBe(1);
      expect(stats.bySeverity.warning).toBe(1);
      expect(stats.bySeverity.critical).toBe(1);
    });

    it("tracks events by category", async () => {
      await service.log({
        category: "user",
        action: "login",
        actor: "user-1",
        description: "Test",
      });
      await service.log({
        category: "user",
        action: "logout",
        actor: "user-1",
        description: "Test",
      });
      await service.log({
        category: "security",
        action: "api_key_create",
        actor: "user-1",
        description: "Test",
      });

      const stats = service.getStats();
      expect(stats.byCategory.user).toBe(2);
      expect(stats.byCategory.security).toBe(1);
    });

    it("tracks queue size", async () => {
      await service.log({
        category: "user",
        action: "login",
        actor: "user-1",
        description: "Test",
      });
      await service.log({
        category: "user",
        action: "logout",
        actor: "user-1",
        description: "Test",
      });

      const stats = service.getStats();
      expect(stats.queueSize).toBe(2);
    });
  });

  // ===========================================================================
  // Singleton Factory Tests
  // ===========================================================================
  describe("Singleton Factory", () => {
    it("returns same instance for getAuditLoggerService", () => {
      const instance1 = getAuditLoggerService();
      const instance2 = getAuditLoggerService();

      expect(instance1).toBe(instance2);

      instance1.destroy();
    });

    it("creates new instances with createAuditLoggerService", () => {
      const instance1 = createAuditLoggerService();
      const instance2 = createAuditLoggerService();

      expect(instance1).not.toBe(instance2);

      instance1.destroy();
      instance2.destroy();
    });
  });
});
