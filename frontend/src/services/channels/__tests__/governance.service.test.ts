/**
 * Channel Governance Service Tests
 *
 * Comprehensive test suite for channel governance functionality including:
 * - Naming policy validation
 * - Default channel management
 * - Channel templates
 * - Archival policies
 * - Channel creation governance
 * - Lifecycle hooks
 * - Audit logging
 *
 * Phase 6: Task 63 - Channel governance and templates
 */

import {
  GovernanceService,
  createGovernanceService,
  resetGovernanceService,
  DEFAULT_NAMING_POLICY,
  DEFAULT_CHANNELS,
  DEFAULT_ARCHIVAL_POLICY,
  DEFAULT_CREATION_RULES,
  BUILT_IN_TEMPLATES,
  type NamingPolicy,
  type DefaultChannelConfig,
  type ArchivalPolicy,
  type LifecycleHook,
  type GovernanceChannelTemplate,
} from "../governance.service";

describe("GovernanceService", () => {
  let service: GovernanceService;

  beforeEach(() => {
    resetGovernanceService();
    service = createGovernanceService();
  });

  afterEach(() => {
    resetGovernanceService();
  });

  // ===========================================================================
  // NAMING POLICY VALIDATION TESTS
  // ===========================================================================

  describe("Naming Policy Validation", () => {
    describe("validateChannelName", () => {
      it("should validate a valid channel name", () => {
        const result = service.validateChannelName("my-channel");
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.sanitizedName).toBe("my-channel");
      });

      it("should reject names that are too short", () => {
        const result = service.validateChannelName("a");
        expect(result.valid).toBe(false);
        expect(result.errors).toContain("Name must be at least 2 characters");
      });

      it("should reject names that are too long", () => {
        const longName = "a".repeat(100);
        const result = service.validateChannelName(longName);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain("Name must be at most 80 characters");
      });

      it("should convert names to lowercase when policy requires", () => {
        const result = service.validateChannelName("MyChannel");
        expect(result.valid).toBe(true);
        expect(result.sanitizedName).toBe("mychannel");
      });

      it("should reject names with invalid characters", () => {
        const result = service.validateChannelName("my@channel!");
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          "Name can only contain lowercase letters, numbers, and hyphens",
        );
      });

      it("should reject names starting with numbers", () => {
        const result = service.validateChannelName("123channel");
        expect(result.valid).toBe(false);
        expect(result.errors).toContain("Name cannot start with a number");
      });

      it("should reject reserved names", () => {
        const result = service.validateChannelName("admin");
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          '"admin" is a reserved name and cannot be used',
        );
      });

      it("should reject names with profanity", () => {
        const result = service.validateChannelName("fuck-channel");
        expect(result.valid).toBe(false);
        expect(result.errors).toContain("Name contains inappropriate language");
      });

      it("should warn about consecutive hyphens", () => {
        const result = service.validateChannelName("my--channel");
        expect(result.warnings).toContain(
          "Name should not contain consecutive hyphens",
        );
      });

      it("should warn about leading/trailing hyphens", () => {
        const result = service.validateChannelName("-mychannel-");
        expect(result.warnings).toContain(
          "Name should not start or end with a hyphen",
        );
      });

      it("should validate names with numbers in middle", () => {
        const result = service.validateChannelName("channel-123");
        expect(result.valid).toBe(true);
        expect(result.sanitizedName).toBe("channel-123");
      });

      it("should handle empty names", () => {
        const result = service.validateChannelName("");
        expect(result.valid).toBe(false);
      });

      it("should handle whitespace-only names", () => {
        const result = service.validateChannelName("   ");
        expect(result.valid).toBe(false);
      });
    });

    describe("sanitizeChannelName", () => {
      it("should sanitize a name with special characters", () => {
        const sanitized = service.sanitizeChannelName("My Channel!");
        expect(sanitized).toBe("my-channel");
      });

      it("should convert spaces to hyphens", () => {
        const sanitized = service.sanitizeChannelName("my awesome channel");
        expect(sanitized).toBe("my-awesome-channel");
      });

      it("should remove multiple consecutive hyphens", () => {
        const sanitized = service.sanitizeChannelName("my---channel");
        expect(sanitized).toBe("my-channel");
      });

      it("should remove leading and trailing hyphens", () => {
        const sanitized = service.sanitizeChannelName("-my-channel-");
        expect(sanitized).toBe("my-channel");
      });

      it("should truncate to max length", () => {
        const longName = "a".repeat(100);
        const sanitized = service.sanitizeChannelName(longName);
        expect(sanitized.length).toBeLessThanOrEqual(80);
      });
    });

    describe("isReservedName", () => {
      it("should return true for reserved names", () => {
        expect(service.isReservedName("admin")).toBe(true);
        expect(service.isReservedName("system")).toBe(true);
        expect(service.isReservedName("bot")).toBe(true);
      });

      it("should return false for non-reserved names", () => {
        expect(service.isReservedName("my-channel")).toBe(false);
        expect(service.isReservedName("engineering")).toBe(false);
      });

      it("should be case-insensitive", () => {
        expect(service.isReservedName("ADMIN")).toBe(true);
        expect(service.isReservedName("Admin")).toBe(true);
      });
    });

    describe("generateSlug", () => {
      it("should generate a valid slug from a name", () => {
        const slug = service.generateSlug("My Channel");
        expect(slug).toBe("my-channel");
      });

      it("should generate a unique slug when duplicates exist", () => {
        const existingSlugs = ["my-channel", "my-channel-1"];
        const slug = service.generateSlug("My Channel", existingSlugs);
        expect(slug).toBe("my-channel-2");
      });

      it("should return original slug if no conflicts", () => {
        const existingSlugs = ["other-channel"];
        const slug = service.generateSlug("My Channel", existingSlugs);
        expect(slug).toBe("my-channel");
      });
    });
  });

  // ===========================================================================
  // DEFAULT CHANNELS TESTS
  // ===========================================================================

  describe("Default Channels", () => {
    describe("getDefaultChannels", () => {
      it("should return default channels", () => {
        const channels = service.getDefaultChannels();
        expect(channels.length).toBe(3);
        expect(channels.map((c) => c.name)).toEqual([
          "general",
          "announcements",
          "random",
        ]);
      });
    });

    describe("addDefaultChannel", () => {
      it("should add a new default channel", () => {
        const newChannel: DefaultChannelConfig = {
          id: "support",
          name: "support",
          slug: "support",
          description: "Support channel",
          type: "public",
          isReadonly: false,
          autoJoin: true,
          position: 3,
        };
        service.addDefaultChannel(newChannel);
        const channels = service.getDefaultChannels();
        expect(channels.length).toBe(4);
        expect(channels.find((c) => c.id === "support")).toBeDefined();
      });

      it("should throw error for duplicate channel ID", () => {
        const duplicateChannel: DefaultChannelConfig = {
          id: "general",
          name: "general-2",
          slug: "general-2",
          description: "Duplicate",
          type: "public",
          isReadonly: false,
          autoJoin: true,
          position: 3,
        };
        expect(() => service.addDefaultChannel(duplicateChannel)).toThrow(
          'Default channel with ID "general" already exists',
        );
      });
    });

    describe("removeDefaultChannel", () => {
      it("should remove a default channel", () => {
        const initialCount = service.getDefaultChannels().length;
        const result = service.removeDefaultChannel("random");
        expect(result).toBe(true);
        const channels = service.getDefaultChannels();
        expect(channels.length).toBe(initialCount - 1);
        expect(channels.find((c) => c.id === "random")).toBeUndefined();
      });

      it("should return false for non-existent channel", () => {
        const result = service.removeDefaultChannel("nonexistent");
        expect(result).toBe(false);
      });
    });

    describe("updateDefaultChannel", () => {
      it("should update a default channel", () => {
        const result = service.updateDefaultChannel("general", {
          description: "Updated description",
        });
        expect(result).toBe(true);
        const channels = service.getDefaultChannels();
        const general = channels.find((c) => c.id === "general");
        expect(general?.description).toBe("Updated description");
      });

      it("should return false for non-existent channel", () => {
        const result = service.updateDefaultChannel("nonexistent", {
          description: "Test",
        });
        expect(result).toBe(false);
      });
    });

    describe("createWorkspaceDefaults", () => {
      it("should create workspace default channels", async () => {
        const created: string[] = [];
        const mockCreateChannel = jest
          .fn()
          .mockImplementation(async (config) => {
            created.push(config.id);
            return { id: config.id };
          });

        const result = await service.createWorkspaceDefaults(
          "workspace-1",
          "user-1",
          mockCreateChannel,
        );
        expect(result.created.length).toBe(3);
        expect(result.failed.length).toBe(0);
        expect(mockCreateChannel).toHaveBeenCalledTimes(3);
      });

      it("should handle failures gracefully", async () => {
        const mockCreateChannel = jest
          .fn()
          .mockRejectedValue(new Error("Creation failed"));

        const result = await service.createWorkspaceDefaults(
          "workspace-1",
          "user-1",
          mockCreateChannel,
        );
        expect(result.created.length).toBe(0);
        expect(result.failed.length).toBe(3);
        expect(result.failed[0].error).toBe("Creation failed");
      });
    });
  });

  // ===========================================================================
  // CHANNEL TEMPLATES TESTS
  // ===========================================================================

  describe("Channel Templates", () => {
    describe("getTemplates", () => {
      it("should return built-in templates", () => {
        const templates = service.getTemplates();
        expect(templates.length).toBeGreaterThanOrEqual(5);
        expect(templates.filter((t) => t.isBuiltIn).length).toBe(5);
      });
    });

    describe("getTemplateById", () => {
      it("should find a template by ID", () => {
        const template = service.getTemplateById("team");
        expect(template).toBeDefined();
        expect(template?.name).toBe("Team Channel");
      });

      it("should return undefined for non-existent template", () => {
        const template = service.getTemplateById("nonexistent");
        expect(template).toBeUndefined();
      });
    });

    describe("getTemplatesByType", () => {
      it("should filter templates by type", () => {
        const publicTemplates = service.getTemplatesByType("public");
        expect(publicTemplates.length).toBeGreaterThan(0);
        expect(publicTemplates.every((t) => t.type === "public")).toBe(true);

        const privateTemplates = service.getTemplatesByType("private");
        expect(privateTemplates.length).toBeGreaterThan(0);
        expect(privateTemplates.every((t) => t.type === "private")).toBe(true);
      });
    });

    describe("createTemplate", () => {
      it("should create a custom template", () => {
        const newTemplate = service.createTemplate({
          name: "Custom Template",
          description: "A custom template",
          type: "public",
          isDefault: false,
          isReadonly: false,
          settings: {
            slowmodeSeconds: 0,
            permissions: {
              isPublic: true,
              allowGuests: false,
              membersCanInvite: true,
              membersCanPost: true,
            },
          },
        });

        expect(newTemplate.id).toMatch(/^custom-/);
        expect(newTemplate.isBuiltIn).toBe(false);
        expect(newTemplate.createdAt).toBeDefined();

        const templates = service.getTemplates();
        expect(templates.find((t) => t.id === newTemplate.id)).toBeDefined();
      });
    });

    describe("updateTemplate", () => {
      it("should update a custom template", () => {
        const newTemplate = service.createTemplate({
          name: "Custom Template",
          description: "Original description",
          type: "public",
          isDefault: false,
          isReadonly: false,
          settings: {
            slowmodeSeconds: 0,
            permissions: {
              isPublic: true,
              allowGuests: false,
              membersCanInvite: true,
              membersCanPost: true,
            },
          },
        });

        const result = service.updateTemplate(newTemplate.id, {
          description: "Updated description",
        });
        expect(result).toBe(true);

        const updated = service.getTemplateById(newTemplate.id);
        expect(updated?.description).toBe("Updated description");
      });

      it("should return false for non-existent template", () => {
        const result = service.updateTemplate("nonexistent", {
          description: "Test",
        });
        expect(result).toBe(false);
      });
    });

    describe("deleteTemplate", () => {
      it("should delete a custom template", () => {
        const newTemplate = service.createTemplate({
          name: "To Delete",
          description: "Will be deleted",
          type: "public",
          isDefault: false,
          isReadonly: false,
          settings: {
            slowmodeSeconds: 0,
            permissions: {
              isPublic: true,
              allowGuests: false,
              membersCanInvite: true,
              membersCanPost: true,
            },
          },
        });

        const result = service.deleteTemplate(newTemplate.id);
        expect(result).toBe(true);
        expect(service.getTemplateById(newTemplate.id)).toBeUndefined();
      });

      it("should return false for non-existent template", () => {
        const result = service.deleteTemplate("nonexistent");
        expect(result).toBe(false);
      });
    });

    describe("applyTemplate", () => {
      it("should apply a template with overrides", () => {
        const applied = service.applyTemplate("team", {
          name: "My Team",
          description: "Custom description",
        });

        expect(applied).not.toBeNull();
        expect(applied?.name).toBe("My Team");
        expect(applied?.description).toBe("Custom description");
        expect(applied?.type).toBe("public");
      });

      it("should return null for non-existent template", () => {
        const applied = service.applyTemplate("nonexistent");
        expect(applied).toBeNull();
      });
    });
  });

  // ===========================================================================
  // ARCHIVAL POLICY TESTS
  // ===========================================================================

  describe("Archival Policy", () => {
    describe("getArchivalPolicy", () => {
      it("should return the archival policy", () => {
        const policy = service.getArchivalPolicy();
        expect(policy.enabled).toBe(true);
        expect(policy.inactivityDays).toBe(90);
      });
    });

    describe("updateArchivalPolicy", () => {
      it("should update archival policy", () => {
        service.updateArchivalPolicy({ inactivityDays: 30 });
        const policy = service.getArchivalPolicy();
        expect(policy.inactivityDays).toBe(30);
      });
    });

    describe("shouldAutoArchive", () => {
      it("should return true for inactive channels", () => {
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 100);

        const result = service.shouldAutoArchive({
          id: "channel-1",
          type: "public",
          isDefault: false,
          memberCount: 2,
          lastMessageAt: oldDate.toISOString(),
        });

        expect(result.shouldArchive).toBe(true);
        expect(result.daysInactive).toBeGreaterThanOrEqual(90);
      });

      it("should return false for active channels", () => {
        const result = service.shouldAutoArchive({
          id: "channel-1",
          type: "public",
          isDefault: false,
          memberCount: 2,
          lastMessageAt: new Date().toISOString(),
        });

        expect(result.shouldArchive).toBe(false);
      });

      it("should exclude default channels", () => {
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 100);

        const result = service.shouldAutoArchive({
          id: "channel-1",
          type: "public",
          isDefault: true,
          memberCount: 2,
          lastMessageAt: oldDate.toISOString(),
        });

        expect(result.shouldArchive).toBe(false);
        expect(result.reason).toBe("Default channels are excluded");
      });

      it("should exclude DM channels", () => {
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 100);

        const result = service.shouldAutoArchive({
          id: "channel-1",
          type: "direct",
          isDefault: false,
          memberCount: 2,
          lastMessageAt: oldDate.toISOString(),
        });

        expect(result.shouldArchive).toBe(false);
        expect(result.reason).toBe('Channel type "direct" is excluded');
      });

      it("should exclude channels with many members", () => {
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 100);

        const result = service.shouldAutoArchive({
          id: "channel-1",
          type: "public",
          isDefault: false,
          memberCount: 10,
          lastMessageAt: oldDate.toISOString(),
        });

        expect(result.shouldArchive).toBe(false);
      });

      it("should handle channels with no messages", () => {
        const result = service.shouldAutoArchive({
          id: "channel-1",
          type: "public",
          isDefault: false,
          memberCount: 2,
          lastMessageAt: null,
        });

        expect(result.shouldArchive).toBe(true);
        expect(result.reason).toBe("No messages ever sent");
      });
    });

    describe("shouldWarnBeforeArchive", () => {
      it("should warn when approaching archive threshold", () => {
        // Set date to 85 days ago (within 7-day warning window of 90-day threshold)
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 85);

        const result = service.shouldWarnBeforeArchive({
          id: "channel-1",
          type: "public",
          isDefault: false,
          memberCount: 2,
          lastMessageAt: oldDate.toISOString(),
        });

        expect(result.shouldWarn).toBe(true);
        expect(result.daysUntilArchive).toBeLessThanOrEqual(7);
      });

      it("should not warn for recently active channels", () => {
        const result = service.shouldWarnBeforeArchive({
          id: "channel-1",
          type: "public",
          isDefault: false,
          memberCount: 2,
          lastMessageAt: new Date().toISOString(),
        });

        expect(result.shouldWarn).toBe(false);
      });
    });

    describe("getChannelsToArchive", () => {
      it("should return channels that should be archived", () => {
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 100);

        const channels = [
          {
            id: "1",
            name: "active",
            type: "public" as const,
            isDefault: false,
            memberCount: 2,
            lastMessageAt: new Date().toISOString(),
          },
          {
            id: "2",
            name: "inactive",
            type: "public" as const,
            isDefault: false,
            memberCount: 2,
            lastMessageAt: oldDate.toISOString(),
          },
          {
            id: "3",
            name: "default",
            type: "public" as const,
            isDefault: true,
            memberCount: 2,
            lastMessageAt: oldDate.toISOString(),
          },
        ];

        const toArchive = service.getChannelsToArchive(channels);
        expect(toArchive.length).toBe(1);
        expect(toArchive[0].name).toBe("inactive");
      });
    });
  });

  // ===========================================================================
  // CHANNEL CREATION GOVERNANCE TESTS
  // ===========================================================================

  describe("Channel Creation Governance", () => {
    describe("canCreateChannel", () => {
      it("should allow admins to create public channels", () => {
        const result = service.canCreateChannel("admin", "public", "user-1");
        expect(result.allowed).toBe(true);
      });

      it("should allow members to create private channels", () => {
        const result = service.canCreateChannel("member", "private", "user-1");
        expect(result.allowed).toBe(true);
      });

      it("should deny members creating public channels", () => {
        const result = service.canCreateChannel("member", "public", "user-1");
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("Minimum role");
      });

      it("should deny guests creating any channels", () => {
        const result = service.canCreateChannel("guest", "public", "user-1");
        expect(result.allowed).toBe(false);
      });
    });

    describe("requestChannelApproval", () => {
      it("should create an approval request", () => {
        const request = service.requestChannelApproval(
          "new-channel",
          "public",
          "A new channel",
          "user-1",
        );

        expect(request.id).toMatch(/^approval-/);
        expect(request.channelName).toBe("new-channel");
        expect(request.status).toBe("pending");
        expect(request.requestedBy).toBe("user-1");
      });
    });

    describe("approveChannelRequest", () => {
      it("should approve a pending request", () => {
        const request = service.requestChannelApproval(
          "new-channel",
          "public",
          "A new channel",
          "user-1",
        );

        const approved = service.approveChannelRequest(
          request.id,
          "admin-1",
          "admin",
        );
        expect(approved?.status).toBe("approved");
        expect(approved?.reviewedBy).toBe("admin-1");
      });

      it("should throw error for non-approver roles", () => {
        const request = service.requestChannelApproval(
          "new-channel",
          "public",
          "A new channel",
          "user-1",
        );

        expect(() =>
          service.approveChannelRequest(request.id, "member-1", "member"),
        ).toThrow("Insufficient permissions");
      });

      it("should return null for non-existent request", () => {
        const result = service.approveChannelRequest(
          "nonexistent",
          "admin-1",
          "admin",
        );
        expect(result).toBeNull();
      });
    });

    describe("rejectChannelRequest", () => {
      it("should reject a pending request", () => {
        const request = service.requestChannelApproval(
          "new-channel",
          "public",
          "A new channel",
          "user-1",
        );

        const rejected = service.rejectChannelRequest(
          request.id,
          "admin-1",
          "admin",
          "Not needed",
        );
        expect(rejected?.status).toBe("rejected");
        expect(rejected?.rejectionReason).toBe("Not needed");
      });
    });

    describe("getPendingApprovals", () => {
      it("should return only pending approvals", () => {
        service.requestChannelApproval(
          "channel-1",
          "public",
          "Desc 1",
          "user-1",
        );
        service.requestChannelApproval(
          "channel-2",
          "public",
          "Desc 2",
          "user-1",
        );
        const request3 = service.requestChannelApproval(
          "channel-3",
          "public",
          "Desc 3",
          "user-1",
        );
        service.approveChannelRequest(request3.id, "admin-1", "admin");

        const pending = service.getPendingApprovals();
        expect(pending.length).toBe(2);
      });
    });

    describe("recordChannelCreation/Deletion", () => {
      it("should track channel creation counts", () => {
        const userId = "user-1";

        // Record creations
        for (let i = 0; i < 50; i++) {
          service.recordChannelCreation(userId);
        }

        // Should now be at limit
        const result = service.canCreateChannel("admin", "public", userId);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("Maximum channel limit");
      });

      it("should track channel deletion", () => {
        const userId = "user-1";

        // Create to limit
        for (let i = 0; i < 50; i++) {
          service.recordChannelCreation(userId);
        }

        // Delete one
        service.recordChannelDeletion(userId);

        // Should now be allowed
        const result = service.canCreateChannel("admin", "public", userId);
        expect(result.allowed).toBe(true);
      });
    });
  });

  // ===========================================================================
  // LIFECYCLE HOOKS TESTS
  // ===========================================================================

  describe("Lifecycle Hooks", () => {
    describe("registerHook", () => {
      it("should register a lifecycle hook", () => {
        const hook: LifecycleHook = {
          id: "hook-1",
          type: "channel:created",
          enabled: true,
          webhookUrl: "https://example.com/webhook",
        };

        service.registerHook(hook);
        const hooks = service.getHooksByType("channel:created");
        expect(hooks.length).toBe(1);
        expect(hooks[0].id).toBe("hook-1");
      });

      it("should throw error for duplicate hook ID", () => {
        const hook: LifecycleHook = {
          id: "hook-1",
          type: "channel:created",
          enabled: true,
        };

        service.registerHook(hook);
        expect(() => service.registerHook(hook)).toThrow(
          'Hook with ID "hook-1" already exists',
        );
      });
    });

    describe("unregisterHook", () => {
      it("should unregister a hook", () => {
        const hook: LifecycleHook = {
          id: "hook-1",
          type: "channel:created",
          enabled: true,
        };

        service.registerHook(hook);
        const result = service.unregisterHook("hook-1");
        expect(result).toBe(true);
        expect(service.getHooksByType("channel:created").length).toBe(0);
      });

      it("should return false for non-existent hook", () => {
        const result = service.unregisterHook("nonexistent");
        expect(result).toBe(false);
      });
    });

    describe("getHooksByType", () => {
      it("should filter hooks by type", () => {
        service.registerHook({
          id: "hook-1",
          type: "channel:created",
          enabled: true,
        });
        service.registerHook({
          id: "hook-2",
          type: "channel:archived",
          enabled: true,
        });
        service.registerHook({
          id: "hook-3",
          type: "channel:created",
          enabled: false,
        });

        const hooks = service.getHooksByType("channel:created");
        expect(hooks.length).toBe(1); // Only enabled hooks
        expect(hooks[0].id).toBe("hook-1");
      });
    });

    describe("triggerHook", () => {
      it("should trigger hooks and return results", async () => {
        // Register hook without webhook URL (no actual HTTP call)
        service.registerHook({
          id: "hook-1",
          type: "channel:created",
          enabled: true,
        });

        const results = await service.triggerHook("channel:created", {
          channelId: "channel-1",
          channelName: "test-channel",
        });

        expect(results.length).toBe(1);
        expect(results[0].hookId).toBe("hook-1");
        expect(results[0].success).toBe(true);
      });

      it("should filter by channel type", async () => {
        service.registerHook({
          id: "hook-1",
          type: "channel:created",
          enabled: true,
          channelTypes: ["public"],
        });

        const results = await service.triggerHook("channel:created", {
          channelId: "channel-1",
          channelType: "private",
        });

        expect(results.length).toBe(0); // Hook should be filtered out
      });
    });
  });

  // ===========================================================================
  // AUDIT LOGGING TESTS
  // ===========================================================================

  describe("Audit Logging", () => {
    describe("logAction", () => {
      it("should create an audit log entry", () => {
        const entry = service.logAction(
          "channel_created",
          "user-1",
          "admin",
          { channelType: "public" },
          "channel-1",
          "test-channel",
        );

        expect(entry.id).toMatch(/^audit-/);
        expect(entry.action).toBe("channel_created");
        expect(entry.userId).toBe("user-1");
        expect(entry.channelId).toBe("channel-1");
      });
    });

    describe("getAuditLog", () => {
      it("should return audit log entries", () => {
        service.logAction("action1", "user-1", "admin", {});
        service.logAction("action2", "user-2", "member", {});
        service.logAction("action1", "user-1", "admin", {});

        const log = service.getAuditLog();
        expect(log.length).toBe(3);
      });

      it("should filter by action", () => {
        service.logAction("action1", "user-1", "admin", {});
        service.logAction("action2", "user-2", "member", {});

        const log = service.getAuditLog({ action: "action1" });
        expect(log.length).toBe(1);
        expect(log[0].action).toBe("action1");
      });

      it("should filter by userId", () => {
        service.logAction("action1", "user-1", "admin", {});
        service.logAction("action2", "user-2", "member", {});

        const log = service.getAuditLog({ userId: "user-1" });
        expect(log.length).toBe(1);
        expect(log[0].userId).toBe("user-1");
      });

      it("should filter by channelId", () => {
        service.logAction("action1", "user-1", "admin", {}, "channel-1");
        service.logAction("action2", "user-1", "admin", {}, "channel-2");

        const log = service.getAuditLog({ channelId: "channel-1" });
        expect(log.length).toBe(1);
        expect(log[0].channelId).toBe("channel-1");
      });

      it("should support pagination", () => {
        for (let i = 0; i < 10; i++) {
          service.logAction(`action-${i}`, "user-1", "admin", {});
        }

        const page1 = service.getAuditLog({ limit: 5, offset: 0 });
        const page2 = service.getAuditLog({ limit: 5, offset: 5 });

        expect(page1.length).toBe(5);
        expect(page2.length).toBe(5);
      });
    });
  });

  // ===========================================================================
  // CONFIGURATION TESTS
  // ===========================================================================

  describe("Configuration", () => {
    describe("getConfig", () => {
      it("should return the full configuration", () => {
        const config = service.getConfig();
        expect(config.namingPolicy).toBeDefined();
        expect(config.defaultChannels).toBeDefined();
        expect(config.archivalPolicy).toBeDefined();
        expect(config.creationRules).toBeDefined();
        expect(config.lifecycleHooks).toBeDefined();
        expect(config.customTemplates).toBeDefined();
      });
    });

    describe("updateConfig", () => {
      it("should update configuration", () => {
        service.updateConfig({
          namingPolicy: { ...DEFAULT_NAMING_POLICY, minLength: 5 },
        });

        const config = service.getConfig();
        expect(config.namingPolicy.minLength).toBe(5);
      });
    });

    describe("resetToDefaults", () => {
      it("should reset configuration to defaults", () => {
        service.updateConfig({
          namingPolicy: { ...DEFAULT_NAMING_POLICY, minLength: 10 },
        });
        service.registerHook({
          id: "hook-1",
          type: "channel:created",
          enabled: true,
        });

        service.resetToDefaults();

        const config = service.getConfig();
        expect(config.namingPolicy.minLength).toBe(2);
        expect(config.lifecycleHooks.length).toBe(0);
      });
    });
  });

  // ===========================================================================
  // INTEGRATION TESTS
  // ===========================================================================

  describe("Integration", () => {
    it("should handle complete channel creation workflow", async () => {
      // 1. Validate channel name (use lowercase hyphenated name for default policy)
      const nameValidation = service.validateChannelName("engineering-team");
      expect(nameValidation.valid).toBe(true);

      // 2. Check if user can create channel
      const canCreate = service.canCreateChannel("admin", "public", "user-1");
      expect(canCreate.allowed).toBe(true);

      // 3. Apply template
      const templateConfig = service.applyTemplate("team", {
        name: "engineering-team",
        description: "Engineering team discussions",
      });
      expect(templateConfig).not.toBeNull();

      // 4. Record creation
      service.recordChannelCreation("user-1");

      // 5. Log action
      const entry = service.logAction(
        "channel_created",
        "user-1",
        "admin",
        { templateId: "team" },
        "channel-1",
        "engineering-team",
      );
      expect(entry.action).toBe("channel_created");

      // 6. Trigger hook
      service.registerHook({
        id: "creation-hook",
        type: "channel:created",
        enabled: true,
      });

      const hookResults = await service.triggerHook("channel:created", {
        channelId: "channel-1",
        channelName: "engineering-team",
        channelType: "public",
      });
      expect(hookResults.length).toBe(1);
    });

    it("should handle channel archival workflow", () => {
      // 1. Check if channel should be archived
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);

      const channel = {
        id: "channel-1",
        name: "old-channel",
        type: "public" as const,
        isDefault: false,
        memberCount: 2,
        lastMessageAt: oldDate.toISOString(),
      };

      const shouldArchive = service.shouldAutoArchive(channel);
      expect(shouldArchive.shouldArchive).toBe(true);

      // 2. Log archival action
      service.logAction(
        "channel_archived",
        "system",
        "admin",
        {
          reason: shouldArchive.reason,
          daysInactive: shouldArchive.daysInactive,
        },
        channel.id,
        channel.name,
      );

      // 3. Verify audit log
      const log = service.getAuditLog({ action: "channel_archived" });
      expect(log.length).toBe(1);
    });
  });
});

// ===========================================================================
// EXPORT TESTS
// ===========================================================================

describe("Governance Service Exports", () => {
  it("should export default configurations", () => {
    expect(DEFAULT_NAMING_POLICY).toBeDefined();
    expect(DEFAULT_NAMING_POLICY.minLength).toBe(2);
    expect(DEFAULT_NAMING_POLICY.maxLength).toBe(80);

    expect(DEFAULT_CHANNELS).toBeDefined();
    expect(DEFAULT_CHANNELS.length).toBe(3);

    expect(DEFAULT_ARCHIVAL_POLICY).toBeDefined();
    expect(DEFAULT_ARCHIVAL_POLICY.inactivityDays).toBe(90);

    expect(DEFAULT_CREATION_RULES).toBeDefined();
    expect(DEFAULT_CREATION_RULES.maxChannelsPerUser).toBe(50);

    expect(BUILT_IN_TEMPLATES).toBeDefined();
    expect(BUILT_IN_TEMPLATES.length).toBe(5);
  });

  it("should export factory functions", () => {
    expect(typeof createGovernanceService).toBe("function");
    expect(typeof resetGovernanceService).toBe("function");
  });
});
