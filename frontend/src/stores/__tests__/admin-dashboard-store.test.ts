/**
 * Admin Dashboard Store Unit Tests
 *
 * Tests for the admin dashboard Zustand store including stats,
 * settings, audit log, and UI state management.
 */

import { act } from "@testing-library/react";
import {
  useAdminDashboardStore,
  selectStats,
  selectPreviousStats,
  selectStatsDateRange,
  selectIsLoadingStats,
  selectStatsError,
  selectSettings,
  selectIsLoadingSettings,
  selectIsSavingSettings,
  selectHasUnsavedChanges,
  selectAuditEntries,
  selectAuditFilters,
  selectAuditSort,
  selectAuditPagination,
  selectIsLoadingAudit,
  selectSelectedAuditEntry,
  selectActiveTab,
  selectSidebarCollapsed,
  selectStatsGrowth,
  selectAuditSummary,
} from "../admin-dashboard-store";
import type { DashboardStats } from "@/lib/admin/stats-aggregator";
import type { AuditLogEntry } from "@/lib/admin/audit-log";
import type { GlobalSettings } from "@/lib/admin/settings-manager";

// ============================================================================
// Test Helpers
// ============================================================================

const createTestStats = (
  overrides?: Partial<DashboardStats>,
): DashboardStats => ({
  users: {
    total: 100,
    active: 80,
    new: 10,
    growth: 10,
  },
  messages: {
    total: 1000,
    today: 50,
    avgPerDay: 100,
    peakHour: 14,
  },
  channels: {
    total: 20,
    public: 15,
    private: 5,
    mostActive: ["general", "random"],
  },
  storage: {
    used: 1000000000,
    limit: 5000000000,
    percentage: 20,
  },
  ...overrides,
});

const createTestAuditEntry = (
  overrides?: Partial<AuditLogEntry>,
): AuditLogEntry => ({
  id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  timestamp: new Date().toISOString(),
  actorId: "actor-1",
  actorEmail: "admin@example.com",
  action: "user.create",
  targetType: "user",
  targetId: "user-1",
  details: {},
  ...overrides,
});

const createTestSettings = (): GlobalSettings => ({
  general: {
    siteName: "Test Site",
    siteDescription: "Test Description",
    siteUrl: "https://example.com",
    supportEmail: "support@example.com",
    defaultLanguage: "en",
    defaultTimezone: "UTC",
    maintenanceMode: false,
    maintenanceMessage: "",
  },
  security: {
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecial: false,
    sessionTimeout: 60,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    twoFactorEnabled: false,
    twoFactorRequired: false,
    allowedDomains: [],
    blockedDomains: [],
    ipWhitelist: [],
    ipBlacklist: [],
  },
  features: {
    publicRegistration: true,
    emailVerificationRequired: true,
    inviteOnly: false,
    publicChannels: true,
    privateChannels: true,
    directMessages: true,
    threads: true,
    reactions: true,
    fileUploads: true,
    voiceMessages: false,
    videoConference: false,
    customEmoji: true,
    userProfiles: true,
    userStatus: true,
  },
  limits: {
    maxFileSize: 10485760,
    maxMessageLength: 4000,
    maxChannelsPerUser: 100,
    maxMembersPerChannel: 1000,
    maxDailyMessages: 10000,
    storageQuota: 5368709120,
    rateLimit: 100,
  },
  notifications: {
    emailNotifications: true,
    pushNotifications: true,
    slackNotifications: false,
    webhookNotifications: false,
    digestEnabled: false,
    digestFrequency: "never",
    quietHoursEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
  },
  integrations: {
    slackEnabled: false,
    slackWebhookUrl: "",
    githubEnabled: false,
    githubToken: "",
    jiraEnabled: false,
    jiraUrl: "",
    googleDriveEnabled: false,
    dropboxEnabled: false,
    zapierEnabled: false,
  },
});

// ============================================================================
// Setup/Teardown
// ============================================================================

describe("Admin Dashboard Store", () => {
  beforeEach(() => {
    act(() => {
      useAdminDashboardStore.getState().reset();
    });
  });

  // ==========================================================================
  // Stats Tests
  // ==========================================================================

  describe("Stats Management", () => {
    describe("setStats", () => {
      it("should set stats and update lastUpdated", () => {
        const stats = createTestStats();

        act(() => {
          useAdminDashboardStore.getState().setStats(stats);
        });

        const state = useAdminDashboardStore.getState();
        expect(state.stats).toEqual(stats);
        expect(state.statsLastUpdated).toBeDefined();
      });
    });

    describe("setPreviousStats", () => {
      it("should set previous stats", () => {
        const stats = createTestStats();

        act(() => {
          useAdminDashboardStore.getState().setPreviousStats(stats);
        });

        const state = useAdminDashboardStore.getState();
        expect(state.previousStats).toEqual(stats);
      });

      it("should allow setting to null", () => {
        act(() => {
          useAdminDashboardStore.getState().setPreviousStats(null);
        });

        const state = useAdminDashboardStore.getState();
        expect(state.previousStats).toBeNull();
      });
    });

    describe("setStatsDateRange", () => {
      it("should set date range", () => {
        const range = {
          start: new Date("2025-01-01"),
          end: new Date("2025-01-31"),
        };

        act(() => {
          useAdminDashboardStore.getState().setStatsDateRange(range);
        });

        const state = useAdminDashboardStore.getState();
        expect(state.statsDateRange).toEqual(range);
      });
    });

    describe("setLoadingStats", () => {
      it("should set loading state", () => {
        act(() => {
          useAdminDashboardStore.getState().setLoadingStats(true);
        });

        expect(useAdminDashboardStore.getState().isLoadingStats).toBe(true);
      });

      it("should clear error when loading starts", () => {
        act(() => {
          useAdminDashboardStore.getState().setStatsError("Previous error");
          useAdminDashboardStore.getState().setLoadingStats(true);
        });

        expect(useAdminDashboardStore.getState().statsError).toBeNull();
      });
    });

    describe("setStatsError", () => {
      it("should set error and clear loading", () => {
        act(() => {
          useAdminDashboardStore.getState().setLoadingStats(true);
          useAdminDashboardStore.getState().setStatsError("Test error");
        });

        const state = useAdminDashboardStore.getState();
        expect(state.statsError).toBe("Test error");
        expect(state.isLoadingStats).toBe(false);
      });
    });

    describe("refreshStats", () => {
      it("should keep previous stats and start loading", () => {
        const stats = createTestStats();

        act(() => {
          useAdminDashboardStore.getState().setStats(stats);
          useAdminDashboardStore.getState().refreshStats();
        });

        const state = useAdminDashboardStore.getState();
        expect(state.previousStats).toEqual(stats);
        expect(state.isLoadingStats).toBe(true);
        expect(state.statsError).toBeNull();
      });
    });
  });

  // ==========================================================================
  // Settings Tests
  // ==========================================================================

  describe("Settings Management", () => {
    describe("setSettings", () => {
      it("should set settings and clear unsaved changes", () => {
        const settings = createTestSettings();

        act(() => {
          useAdminDashboardStore.getState().markSettingsChanged();
          useAdminDashboardStore.getState().setSettings(settings);
        });

        const state = useAdminDashboardStore.getState();
        expect(state.settings).toEqual(settings);
        expect(state.hasUnsavedChanges).toBe(false);
      });
    });

    describe("updateSettings", () => {
      it("should update settings partially", () => {
        const settings = createTestSettings();

        act(() => {
          useAdminDashboardStore.getState().setSettings(settings);
          useAdminDashboardStore.getState().updateSettings({
            general: { ...settings.general, siteName: "Updated Name" },
          });
        });

        const state = useAdminDashboardStore.getState();
        expect(state.settings?.general.siteName).toBe("Updated Name");
        expect(state.hasUnsavedChanges).toBe(true);
      });

      it("should not update if settings is null", () => {
        act(() => {
          useAdminDashboardStore.getState().updateSettings({
            general: { siteName: "Test" } as any,
          });
        });

        expect(useAdminDashboardStore.getState().settings).toBeNull();
      });
    });

    describe("setLoadingSettings", () => {
      it("should set loading state and clear error", () => {
        act(() => {
          useAdminDashboardStore.getState().setSettingsError("Error");
          useAdminDashboardStore.getState().setLoadingSettings(true);
        });

        const state = useAdminDashboardStore.getState();
        expect(state.isLoadingSettings).toBe(true);
        expect(state.settingsError).toBeNull();
      });
    });

    describe("setSavingSettings", () => {
      it("should set saving state", () => {
        act(() => {
          useAdminDashboardStore.getState().setSavingSettings(true);
        });

        expect(useAdminDashboardStore.getState().isSavingSettings).toBe(true);
      });
    });

    describe("setSettingsError", () => {
      it("should set error and clear loading states", () => {
        act(() => {
          useAdminDashboardStore.getState().setLoadingSettings(true);
          useAdminDashboardStore.getState().setSavingSettings(true);
          useAdminDashboardStore.getState().setSettingsError("Error");
        });

        const state = useAdminDashboardStore.getState();
        expect(state.settingsError).toBe("Error");
        expect(state.isLoadingSettings).toBe(false);
        expect(state.isSavingSettings).toBe(false);
      });
    });

    describe("markSettingsChanged/markSettingsSaved", () => {
      it("should mark as changed", () => {
        act(() => {
          useAdminDashboardStore.getState().markSettingsChanged();
        });

        expect(useAdminDashboardStore.getState().hasUnsavedChanges).toBe(true);
      });

      it("should mark as saved and clear saving state", () => {
        act(() => {
          useAdminDashboardStore.getState().markSettingsChanged();
          useAdminDashboardStore.getState().setSavingSettings(true);
          useAdminDashboardStore.getState().markSettingsSaved();
        });

        const state = useAdminDashboardStore.getState();
        expect(state.hasUnsavedChanges).toBe(false);
        expect(state.isSavingSettings).toBe(false);
      });
    });

    describe("resetSettings", () => {
      it("should reset settings state", () => {
        const settings = createTestSettings();

        act(() => {
          useAdminDashboardStore.getState().setSettings(settings);
          useAdminDashboardStore.getState().markSettingsChanged();
          useAdminDashboardStore.getState().setSettingsError("Error");
          useAdminDashboardStore.getState().resetSettings();
        });

        const state = useAdminDashboardStore.getState();
        expect(state.settings).toBeNull();
        expect(state.hasUnsavedChanges).toBe(false);
        expect(state.settingsError).toBeNull();
      });
    });
  });

  // ==========================================================================
  // Audit Log Tests
  // ==========================================================================

  describe("Audit Log Management", () => {
    describe("setAuditEntries", () => {
      it("should set entries and total", () => {
        const entries = [createTestAuditEntry(), createTestAuditEntry()];

        act(() => {
          useAdminDashboardStore.getState().setAuditEntries(entries, 100);
        });

        const state = useAdminDashboardStore.getState();
        expect(state.auditEntries.length).toBe(2);
        expect(state.auditTotal).toBe(100);
      });
    });

    describe("addAuditEntry", () => {
      it("should add entry to the beginning", () => {
        const entry1 = createTestAuditEntry({ id: "audit-1" });
        const entry2 = createTestAuditEntry({ id: "audit-2" });

        act(() => {
          useAdminDashboardStore.getState().setAuditEntries([entry1], 1);
          useAdminDashboardStore.getState().addAuditEntry(entry2);
        });

        const state = useAdminDashboardStore.getState();
        expect(state.auditEntries[0].id).toBe("audit-2");
        expect(state.auditTotal).toBe(2);
      });

      it("should limit entries to 1000", () => {
        const entries = Array.from({ length: 1000 }, (_, i) =>
          createTestAuditEntry({ id: `audit-${i}` }),
        );

        act(() => {
          useAdminDashboardStore.getState().setAuditEntries(entries, 1000);
          useAdminDashboardStore
            .getState()
            .addAuditEntry(createTestAuditEntry({ id: "audit-new" }));
        });

        const state = useAdminDashboardStore.getState();
        expect(state.auditEntries.length).toBe(1000);
        expect(state.auditEntries[0].id).toBe("audit-new");
      });
    });

    describe("setAuditFilters", () => {
      it("should set filters and reset page", () => {
        act(() => {
          useAdminDashboardStore.getState().setAuditPage(5);
          useAdminDashboardStore
            .getState()
            .setAuditFilters({ action: "user.create" });
        });

        const state = useAdminDashboardStore.getState();
        expect(state.auditFilters.action).toBe("user.create");
        expect(state.auditPage).toBe(1);
      });

      it("should merge filters", () => {
        act(() => {
          useAdminDashboardStore
            .getState()
            .setAuditFilters({ action: "user.create" });
          useAdminDashboardStore
            .getState()
            .setAuditFilters({ targetType: "user" });
        });

        const state = useAdminDashboardStore.getState();
        expect(state.auditFilters.action).toBe("user.create");
        expect(state.auditFilters.targetType).toBe("user");
      });
    });

    describe("clearAuditFilters", () => {
      it("should clear all filters and reset page", () => {
        act(() => {
          useAdminDashboardStore
            .getState()
            .setAuditFilters({ action: "user.create" });
          useAdminDashboardStore.getState().setAuditPage(5);
          useAdminDashboardStore.getState().clearAuditFilters();
        });

        const state = useAdminDashboardStore.getState();
        expect(state.auditFilters).toEqual({});
        expect(state.auditPage).toBe(1);
      });
    });

    describe("setAuditSort", () => {
      it("should set sort and reset page", () => {
        act(() => {
          useAdminDashboardStore.getState().setAuditPage(5);
          useAdminDashboardStore
            .getState()
            .setAuditSort({ field: "action", direction: "asc" });
        });

        const state = useAdminDashboardStore.getState();
        expect(state.auditSort.field).toBe("action");
        expect(state.auditSort.direction).toBe("asc");
        expect(state.auditPage).toBe(1);
      });
    });

    describe("setAuditPage", () => {
      it("should set page", () => {
        act(() => {
          useAdminDashboardStore.getState().setAuditPage(3);
        });

        expect(useAdminDashboardStore.getState().auditPage).toBe(3);
      });
    });

    describe("setAuditPageSize", () => {
      it("should set page size and reset page", () => {
        act(() => {
          useAdminDashboardStore.getState().setAuditPage(5);
          useAdminDashboardStore.getState().setAuditPageSize(100);
        });

        const state = useAdminDashboardStore.getState();
        expect(state.auditPageSize).toBe(100);
        expect(state.auditPage).toBe(1);
      });
    });

    describe("selectAuditEntry", () => {
      it("should select entry", () => {
        const entry = createTestAuditEntry();

        act(() => {
          useAdminDashboardStore.getState().selectAuditEntry(entry);
        });

        expect(useAdminDashboardStore.getState().selectedAuditEntry).toEqual(
          entry,
        );
      });

      it("should deselect entry", () => {
        const entry = createTestAuditEntry();

        act(() => {
          useAdminDashboardStore.getState().selectAuditEntry(entry);
          useAdminDashboardStore.getState().selectAuditEntry(null);
        });

        expect(useAdminDashboardStore.getState().selectedAuditEntry).toBeNull();
      });
    });
  });

  // ==========================================================================
  // UI State Tests
  // ==========================================================================

  describe("UI State Management", () => {
    describe("setActiveTab", () => {
      it("should set active tab", () => {
        act(() => {
          useAdminDashboardStore.getState().setActiveTab("users");
        });

        expect(useAdminDashboardStore.getState().activeTab).toBe("users");
      });
    });

    describe("toggleSidebar", () => {
      it("should toggle sidebar state", () => {
        act(() => {
          useAdminDashboardStore.getState().toggleSidebar();
        });

        expect(useAdminDashboardStore.getState().sidebarCollapsed).toBe(true);

        act(() => {
          useAdminDashboardStore.getState().toggleSidebar();
        });

        expect(useAdminDashboardStore.getState().sidebarCollapsed).toBe(false);
      });
    });

    describe("setRefreshInterval", () => {
      it("should set refresh interval", () => {
        act(() => {
          useAdminDashboardStore.getState().setRefreshInterval(30000);
        });

        expect(useAdminDashboardStore.getState().refreshInterval).toBe(30000);
      });

      it("should allow setting to null", () => {
        act(() => {
          useAdminDashboardStore.getState().setRefreshInterval(30000);
          useAdminDashboardStore.getState().setRefreshInterval(null);
        });

        expect(useAdminDashboardStore.getState().refreshInterval).toBeNull();
      });
    });
  });

  // ==========================================================================
  // Reset Tests
  // ==========================================================================

  describe("reset", () => {
    it("should reset all state to initial values", () => {
      const stats = createTestStats();
      const settings = createTestSettings();

      act(() => {
        useAdminDashboardStore.getState().setStats(stats);
        useAdminDashboardStore.getState().setSettings(settings);
        useAdminDashboardStore.getState().setActiveTab("users");
        useAdminDashboardStore.getState().reset();
      });

      const state = useAdminDashboardStore.getState();
      expect(state.stats).toBeNull();
      expect(state.settings).toBeNull();
      expect(state.activeTab).toBe("overview");
    });
  });

  // ==========================================================================
  // Selector Tests
  // ==========================================================================

  describe("Selectors", () => {
    it("selectStats should return stats", () => {
      const stats = createTestStats();

      act(() => {
        useAdminDashboardStore.getState().setStats(stats);
      });

      expect(selectStats(useAdminDashboardStore.getState())).toEqual(stats);
    });

    it("selectAuditPagination should return pagination info", () => {
      act(() => {
        useAdminDashboardStore.getState().setAuditEntries([], 100);
        useAdminDashboardStore.getState().setAuditPageSize(10);
        useAdminDashboardStore.getState().setAuditPage(3);
      });

      const pagination = selectAuditPagination(
        useAdminDashboardStore.getState(),
      );
      expect(pagination.page).toBe(3);
      expect(pagination.pageSize).toBe(10);
      expect(pagination.total).toBe(100);
      expect(pagination.totalPages).toBe(10);
    });

    it("selectStatsGrowth should calculate growth", () => {
      const current = createTestStats({
        users: { total: 110, active: 80, new: 10, growth: 10 },
      });
      const previous = createTestStats({
        users: { total: 100, active: 80, new: 10, growth: 10 },
      });

      act(() => {
        useAdminDashboardStore.getState().setStats(current);
        useAdminDashboardStore.getState().setPreviousStats(previous);
      });

      const growth = selectStatsGrowth(useAdminDashboardStore.getState());
      expect(growth?.usersGrowth).toBe(10);
    });

    it("selectStatsGrowth should return null without previous stats", () => {
      act(() => {
        useAdminDashboardStore.getState().setStats(createTestStats());
      });

      expect(selectStatsGrowth(useAdminDashboardStore.getState())).toBeNull();
    });

    it("selectAuditSummary should summarize entries", () => {
      const today = new Date().toISOString();
      const yesterday = new Date(
        Date.now() - 24 * 60 * 60 * 1000,
      ).toISOString();

      const entries = [
        createTestAuditEntry({ timestamp: today, targetType: "user" }),
        createTestAuditEntry({ timestamp: today, targetType: "channel" }),
        createTestAuditEntry({ timestamp: yesterday, targetType: "settings" }),
      ];

      act(() => {
        useAdminDashboardStore.getState().setAuditEntries(entries, 3);
      });

      const summary = selectAuditSummary(useAdminDashboardStore.getState());
      expect(summary.total).toBe(3);
      expect(summary.todayCount).toBe(2);
      expect(summary.userActions).toBe(1);
      expect(summary.channelActions).toBe(1);
      expect(summary.settingsActions).toBe(1);
    });
  });
});
