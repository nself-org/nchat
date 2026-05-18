/**
 * Slack Feature Map - Status Integrity Tests
 *
 * Verifies that the Slack feature map has no placeholder, partial,
 * or coming_soon entries. Every feature must be either 'enabled' or
 * 'disabled' with a clear documented reason.
 *
 * Task 117: Resolve Slack feature placeholders/partials in code map.
 *
 * @module templates/slack/__tests__/slack-features.test
 */

import {
  ALL_SLACK_FEATURES,
  CHANNEL_FEATURES,
  DM_FEATURES,
  MESSAGING_FEATURES,
  THREAD_FEATURES,
  SEARCH_FEATURES,
  FILE_FEATURES,
  APP_FEATURES,
  CALL_FEATURES,
  WORKFLOW_FEATURES,
  ADMIN_FEATURES,
  NOTIFICATION_FEATURES,
  ACCESSIBILITY_FEATURES,
  slackFeatureFlags,
  slackFeatureConfig,
  slackKeyboardShortcuts,
  getSlackFeatureById,
  getSlackFeaturesByCategory,
  getSlackEnabledFeatures,
  getSlackDisabledFeatures,
  getSlackPlaceholderFeatures,
  isSlackFeatureEnabled,
  getSlackFeatureDependencies,
  getFeaturesByStatus,
  featureStats,
  getPremiumFeatures,
  getBetaFeatures,
  // Legacy aliases
  channelFeatures,
  dmFeatures,
  messagingFeatures,
  threadFeatures,
  searchFeatures,
  fileFeatures,
  appFeatures,
  callFeatures,
  workflowFeatures,
  adminFeatures,
  notificationFeatures,
  accessibilityFeatures,
  allSlackFeatures,
  getFeaturesByCategory,
  getFeatureById,
  getEnabledFeatures,
  isFeatureEnabled,
  type FeatureStatus,
  type SlackFeature,
  type SlackFeatureCategory,
} from "../features";

// ============================================================================
// STATUS INTEGRITY TESTS
// ============================================================================

describe("Slack Feature Map - Status Integrity", () => {
  it("should contain no features with placeholder status", () => {
    const placeholders = ALL_SLACK_FEATURES.filter(
      (f) => (f.status as string) === "placeholder",
    );
    expect(placeholders).toHaveLength(0);
  });

  it("should contain no features with partial status", () => {
    const partials = ALL_SLACK_FEATURES.filter(
      (f) => (f.status as string) === "partial",
    );
    expect(partials).toHaveLength(0);
  });

  it("should contain no features with coming_soon status", () => {
    const comingSoon = ALL_SLACK_FEATURES.filter(
      (f) => (f.status as string) === "coming_soon",
    );
    expect(comingSoon).toHaveLength(0);
  });

  it("should contain no features with planned status", () => {
    const planned = ALL_SLACK_FEATURES.filter(
      (f) => (f.status as string) === "planned",
    );
    expect(planned).toHaveLength(0);
  });

  it("should only contain enabled or disabled statuses", () => {
    const validStatuses: FeatureStatus[] = ["enabled", "disabled"];
    for (const feature of ALL_SLACK_FEATURES) {
      expect(validStatuses).toContain(feature.status);
    }
  });

  it("should have every feature with a non-empty id", () => {
    for (const feature of ALL_SLACK_FEATURES) {
      expect(feature.id).toBeTruthy();
      expect(typeof feature.id).toBe("string");
      expect(feature.id.length).toBeGreaterThan(0);
    }
  });

  it("should have every feature with a non-empty name", () => {
    for (const feature of ALL_SLACK_FEATURES) {
      expect(feature.name).toBeTruthy();
      expect(typeof feature.name).toBe("string");
    }
  });

  it("should have every feature with a non-empty description", () => {
    for (const feature of ALL_SLACK_FEATURES) {
      expect(feature.description).toBeTruthy();
      expect(typeof feature.description).toBe("string");
      expect(feature.description.length).toBeGreaterThan(5);
    }
  });

  it("should have unique feature ids", () => {
    const ids = ALL_SLACK_FEATURES.map((f) => f.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("should have every feature assigned a valid category", () => {
    const validCategories: SlackFeatureCategory[] = [
      "channels",
      "dms",
      "messaging",
      "threads",
      "search",
      "files",
      "apps",
      "calls",
      "workflow",
      "admin",
      "notifications",
      "accessibility",
    ];
    for (const feature of ALL_SLACK_FEATURES) {
      expect(validCategories).toContain(feature.category);
    }
  });

  it("should have every feature with an icon string", () => {
    for (const feature of ALL_SLACK_FEATURES) {
      expect(typeof feature.icon).toBe("string");
      expect(feature.icon.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// DISABLED FEATURES - POLICY REQUIREMENTS
// ============================================================================

describe("Slack Feature Map - Disabled Features Policy", () => {
  it("should have a disabledReason for every disabled feature", () => {
    const disabled = ALL_SLACK_FEATURES.filter((f) => f.status === "disabled");
    for (const feature of disabled) {
      expect(feature.disabledReason).toBeTruthy();
      expect(typeof feature.disabledReason).toBe("string");
      expect(feature.disabledReason!.length).toBeGreaterThan(20);
    }
  });

  it("should have exactly 10 disabled features", () => {
    const disabled = getSlackDisabledFeatures();
    expect(disabled).toHaveLength(10);
  });

  it("should have the correct set of disabled feature ids", () => {
    const disabled = getSlackDisabledFeatures();
    const disabledIds = disabled.map((f) => f.id).sort();
    expect(disabledIds).toEqual([
      "app-directory",
      "app-home",
      "canvas",
      "external-files",
      "lists",
      "modals",
      "shared-channels",
      "workflow-builder",
      "workflow-forms",
      "workflow-triggers",
    ]);
  });

  it("should not have disabledReason on enabled features", () => {
    const enabled = getSlackEnabledFeatures();
    for (const feature of enabled) {
      expect(feature.disabledReason).toBeUndefined();
    }
  });

  it("should have shared-channels disabled with federation reason", () => {
    const feature = getSlackFeatureById("shared-channels");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("disabled");
    expect(feature!.disabledReason).toContain("multi-tenant");
  });

  it("should have external-files disabled with third-party integration reason", () => {
    const feature = getSlackFeatureById("external-files");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("disabled");
    expect(feature!.disabledReason).toContain("Google Drive");
  });

  it("should have app-directory disabled with marketplace reason", () => {
    const feature = getSlackFeatureById("app-directory");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("disabled");
    expect(feature!.disabledReason).toContain("marketplace");
  });

  it("should have workflow-builder disabled with post-v1.0 reason", () => {
    const feature = getSlackFeatureById("workflow-builder");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("disabled");
    expect(feature!.disabledReason).toContain("post-v1.0");
  });

  it("should have canvas disabled with CRDT reason", () => {
    const feature = getSlackFeatureById("canvas");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("disabled");
    expect(feature!.disabledReason).toContain("CRDT");
  });

  it("should have lists disabled with post-v1.0 reason", () => {
    const feature = getSlackFeatureById("lists");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("disabled");
    expect(feature!.disabledReason).toContain("post-v1.0");
  });
});

// ============================================================================
// PREVIOUSLY-PLACEHOLDER FEATURES - NOW RESOLVED
// ============================================================================

describe("Slack Feature Map - Resolved Placeholders (was placeholder, now enabled)", () => {
  it("should have webhooks enabled (was placeholder)", () => {
    const feature = getSlackFeatureById("webhooks");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
    expect(feature!.settings).toBeDefined();
  });

  it("should have bots enabled (was placeholder)", () => {
    const feature = getSlackFeatureById("bots");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
    expect(feature!.settings).toBeDefined();
    expect(feature!.settings!.botApi).toBe(true);
  });

  it("should have huddles enabled (was placeholder)", () => {
    const feature = getSlackFeatureById("huddles");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
    expect(feature!.settings).toBeDefined();
    expect(feature!.settings!.maxParticipants).toBe(50);
  });

  it("should have huddle-video enabled (was placeholder)", () => {
    const feature = getSlackFeatureById("huddle-video");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
    expect(feature!.dependencies).toContain("huddles");
  });

  it("should have huddle-screenshare enabled (was placeholder)", () => {
    const feature = getSlackFeatureById("huddle-screenshare");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
    expect(feature!.dependencies).toContain("huddles");
  });

  it("should have huddle-thread enabled (was placeholder)", () => {
    const feature = getSlackFeatureById("huddle-thread");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
    expect(feature!.dependencies).toContain("huddles");
  });

  it("should have huddle-reactions enabled (was placeholder)", () => {
    const feature = getSlackFeatureById("huddle-reactions");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
    expect(feature!.dependencies).toContain("huddles");
  });

  it("should have clips enabled (was placeholder)", () => {
    const feature = getSlackFeatureById("clips");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
    expect(feature!.settings).toBeDefined();
    expect(feature!.settings!.transcription).toBe(true);
  });

  it("should have audit-logs enabled (was placeholder)", () => {
    const feature = getSlackFeatureById("audit-logs");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
    expect(feature!.settings).toBeDefined();
    expect(feature!.settings!.retentionDays).toBe(90);
  });

  it("should have retention-policies enabled (was placeholder)", () => {
    const feature = getSlackFeatureById("retention-policies");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
    expect(feature!.settings).toBeDefined();
  });
});

describe("Slack Feature Map - Resolved Partials (was partial, now enabled)", () => {
  it("should have saved-searches enabled (was partial)", () => {
    const feature = getSlackFeatureById("saved-searches");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
    expect(feature!.settings).toBeDefined();
    expect(feature!.settings!.maxSaved).toBe(50);
  });

  it("should have message-buttons enabled (was partial)", () => {
    const feature = getSlackFeatureById("message-buttons");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
    expect(feature!.settings).toBeDefined();
  });

  it("should have custom-roles enabled (was partial)", () => {
    const feature = getSlackFeatureById("custom-roles");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
    expect(feature!.settings).toBeDefined();
    expect(feature!.settings!.maxCustomRoles).toBe(25);
  });

  it("should have analytics enabled (was partial)", () => {
    const feature = getSlackFeatureById("analytics");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
    expect(feature!.settings).toBeDefined();
  });

  it("should have data-export enabled (was partial)", () => {
    const feature = getSlackFeatureById("data-export");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
    expect(feature!.settings).toBeDefined();
    expect(feature!.settings!.complianceExport).toBe(true);
  });

  it("should have high-contrast enabled (was partial)", () => {
    const feature = getSlackFeatureById("high-contrast");
    expect(feature).toBeDefined();
    expect(feature!.status).toBe("enabled");
    expect(feature!.settings).toBeDefined();
    expect(feature!.settings!.wcagLevel).toBe("AAA");
  });
});

// ============================================================================
// FEATURE CATEGORY COMPLETENESS
// ============================================================================

describe("Slack Feature Map - Category Completeness", () => {
  it("should have 9 channel features", () => {
    expect(CHANNEL_FEATURES).toHaveLength(9);
  });

  it("should have 4 DM features", () => {
    expect(DM_FEATURES).toHaveLength(4);
  });

  it("should have 21 messaging features", () => {
    expect(MESSAGING_FEATURES).toHaveLength(21);
  });

  it("should have 6 thread features", () => {
    expect(THREAD_FEATURES).toHaveLength(6);
  });

  it("should have 6 search features", () => {
    expect(SEARCH_FEATURES).toHaveLength(6);
  });

  it("should have 9 file features", () => {
    expect(FILE_FEATURES).toHaveLength(9);
  });

  it("should have 7 app features", () => {
    expect(APP_FEATURES).toHaveLength(7);
  });

  it("should have 6 call features", () => {
    expect(CALL_FEATURES).toHaveLength(6);
  });

  it("should have 5 workflow features", () => {
    expect(WORKFLOW_FEATURES).toHaveLength(5);
  });

  it("should have 8 admin features", () => {
    expect(ADMIN_FEATURES).toHaveLength(8);
  });

  it("should have 7 notification features", () => {
    expect(NOTIFICATION_FEATURES).toHaveLength(7);
  });

  it("should have 5 accessibility features", () => {
    expect(ACCESSIBILITY_FEATURES).toHaveLength(5);
  });

  it("should have 93 total features", () => {
    expect(ALL_SLACK_FEATURES).toHaveLength(93);
  });

  it("should have the sum of all categories equal total features", () => {
    const total =
      CHANNEL_FEATURES.length +
      DM_FEATURES.length +
      MESSAGING_FEATURES.length +
      THREAD_FEATURES.length +
      SEARCH_FEATURES.length +
      FILE_FEATURES.length +
      APP_FEATURES.length +
      CALL_FEATURES.length +
      WORKFLOW_FEATURES.length +
      ADMIN_FEATURES.length +
      NOTIFICATION_FEATURES.length +
      ACCESSIBILITY_FEATURES.length;
    expect(total).toBe(ALL_SLACK_FEATURES.length);
  });
});

// ============================================================================
// FEATURE HELPERS
// ============================================================================

describe("Slack Feature Map - Helpers", () => {
  it("getSlackFeatureById should return a feature by id", () => {
    const feature = getSlackFeatureById("public-channels");
    expect(feature).toBeDefined();
    expect(feature!.name).toBe("Public Channels");
  });

  it("getSlackFeatureById should return undefined for unknown ids", () => {
    const feature = getSlackFeatureById("nonexistent");
    expect(feature).toBeUndefined();
  });

  it("getSlackFeatureById should return undefined for empty string", () => {
    const feature = getSlackFeatureById("");
    expect(feature).toBeUndefined();
  });

  it("getSlackFeaturesByCategory should filter by category", () => {
    const channelFeaturesResult = getSlackFeaturesByCategory("channels");
    expect(channelFeaturesResult.length).toBe(CHANNEL_FEATURES.length);
    for (const f of channelFeaturesResult) {
      expect(f.category).toBe("channels");
    }
  });

  it("getSlackFeaturesByCategory should return correct count for each category", () => {
    expect(getSlackFeaturesByCategory("channels").length).toBe(9);
    expect(getSlackFeaturesByCategory("dms").length).toBe(4);
    expect(getSlackFeaturesByCategory("messaging").length).toBe(21);
    expect(getSlackFeaturesByCategory("threads").length).toBe(6);
    expect(getSlackFeaturesByCategory("search").length).toBe(6);
    expect(getSlackFeaturesByCategory("files").length).toBe(9);
    expect(getSlackFeaturesByCategory("apps").length).toBe(7);
    expect(getSlackFeaturesByCategory("calls").length).toBe(6);
    expect(getSlackFeaturesByCategory("workflow").length).toBe(5);
    expect(getSlackFeaturesByCategory("admin").length).toBe(8);
    expect(getSlackFeaturesByCategory("notifications").length).toBe(7);
    expect(getSlackFeaturesByCategory("accessibility").length).toBe(5);
  });

  it("getSlackEnabledFeatures should return only enabled features", () => {
    const enabled = getSlackEnabledFeatures();
    for (const f of enabled) {
      expect(f.status).toBe("enabled");
    }
    expect(enabled.length).toBe(ALL_SLACK_FEATURES.length - 10);
  });

  it("getSlackDisabledFeatures should return only disabled features", () => {
    const disabled = getSlackDisabledFeatures();
    for (const f of disabled) {
      expect(f.status).toBe("disabled");
    }
    expect(disabled.length).toBe(10);
  });

  it("getSlackPlaceholderFeatures (deprecated) should return empty array", () => {
    const placeholders = getSlackPlaceholderFeatures();
    expect(placeholders).toHaveLength(0);
  });

  it("isSlackFeatureEnabled should return true for enabled features", () => {
    expect(isSlackFeatureEnabled("public-channels")).toBe(true);
    expect(isSlackFeatureEnabled("direct-messages")).toBe(true);
    expect(isSlackFeatureEnabled("threads")).toBe(true);
    expect(isSlackFeatureEnabled("global-search")).toBe(true);
    expect(isSlackFeatureEnabled("huddles")).toBe(true);
    expect(isSlackFeatureEnabled("webhooks")).toBe(true);
    expect(isSlackFeatureEnabled("bots")).toBe(true);
    expect(isSlackFeatureEnabled("audit-logs")).toBe(true);
  });

  it("isSlackFeatureEnabled should return false for disabled features", () => {
    expect(isSlackFeatureEnabled("shared-channels")).toBe(false);
    expect(isSlackFeatureEnabled("external-files")).toBe(false);
    expect(isSlackFeatureEnabled("app-directory")).toBe(false);
    expect(isSlackFeatureEnabled("workflow-builder")).toBe(false);
    expect(isSlackFeatureEnabled("canvas")).toBe(false);
  });

  it("isSlackFeatureEnabled should return false for nonexistent features", () => {
    expect(isSlackFeatureEnabled("nonexistent")).toBe(false);
    expect(isSlackFeatureEnabled("")).toBe(false);
  });

  it("getSlackFeatureDependencies should return dependency features", () => {
    const deps = getSlackFeatureDependencies("huddle-video");
    expect(deps).toHaveLength(1);
    expect(deps[0].id).toBe("huddles");
  });

  it("getSlackFeatureDependencies should return empty array for features without dependencies", () => {
    const deps = getSlackFeatureDependencies("public-channels");
    expect(deps).toHaveLength(0);
  });

  it("getSlackFeatureDependencies should return empty for nonexistent features", () => {
    const deps = getSlackFeatureDependencies("nonexistent");
    expect(deps).toHaveLength(0);
  });

  it("getSlackFeatureDependencies should resolve thread sub-feature dependencies", () => {
    const deps = getSlackFeatureDependencies("thread-panel");
    expect(deps).toHaveLength(1);
    expect(deps[0].id).toBe("threads");
  });

  it("getSlackFeatureDependencies should resolve mention dependencies", () => {
    const deps = getSlackFeatureDependencies("mention-here");
    expect(deps).toHaveLength(1);
    expect(deps[0].id).toBe("mentions");
  });
});

// ============================================================================
// DEPENDENCY VALIDATION
// ============================================================================

describe("Slack Feature Map - Dependency Validation", () => {
  it("should have all dependency feature ids referencing real features", () => {
    for (const feature of ALL_SLACK_FEATURES) {
      if (feature.dependencies) {
        for (const depId of feature.dependencies) {
          const dep = getSlackFeatureById(depId);
          expect(dep).toBeDefined();
        }
      }
    }
  });

  it("should have all dependency features enabled if the dependent feature is enabled", () => {
    for (const feature of ALL_SLACK_FEATURES) {
      if (feature.status === "enabled" && feature.dependencies) {
        for (const depId of feature.dependencies) {
          const dep = getSlackFeatureById(depId);
          expect(dep).toBeDefined();
          expect(dep!.status).toBe("enabled");
        }
      }
    }
  });

  it("should not have circular dependencies", () => {
    const visited = new Set<string>();
    const visiting = new Set<string>();

    function hasCycle(featureId: string): boolean {
      if (visiting.has(featureId)) return true;
      if (visited.has(featureId)) return false;

      visiting.add(featureId);
      const feature = getSlackFeatureById(featureId);
      if (feature?.dependencies) {
        for (const depId of feature.dependencies) {
          if (hasCycle(depId)) return true;
        }
      }
      visiting.delete(featureId);
      visited.add(featureId);
      return false;
    }

    for (const feature of ALL_SLACK_FEATURES) {
      visited.clear();
      visiting.clear();
      expect(hasCycle(feature.id)).toBe(false);
    }
  });

  it("should have dependencies as arrays (not single strings)", () => {
    for (const feature of ALL_SLACK_FEATURES) {
      if (feature.dependencies !== undefined) {
        expect(Array.isArray(feature.dependencies)).toBe(true);
      }
    }
  });
});

// ============================================================================
// LEGACY FEATURE FLAGS
// ============================================================================

describe("Slack Feature Map - Legacy Feature Flags", () => {
  it("should have all previously-false huddle flags now set to true", () => {
    expect(slackFeatureFlags.huddles).toBe(true);
    expect(slackFeatureFlags.huddleVideo).toBe(true);
    expect(slackFeatureFlags.huddleScreenshare).toBe(true);
    expect(slackFeatureFlags.huddleThread).toBe(true);
    expect(slackFeatureFlags.huddleReactions).toBe(true);
    expect(slackFeatureFlags.clips).toBe(true);
  });

  it("should have all previously-false app flags now reflecting correct state", () => {
    expect(slackFeatureFlags.webhooks).toBe(true);
    expect(slackFeatureFlags.bots).toBe(true);
    expect(slackFeatureFlags.messageButtons).toBe(true);
    expect(slackFeatureFlags.slashCommands).toBe(true);
    expect(slackFeatureFlags.appDirectory).toBe(false); // still disabled
    expect(slackFeatureFlags.modals).toBe(false); // still disabled
    expect(slackFeatureFlags.appHome).toBe(false); // still disabled
  });

  it("should have all previously-false admin flags now set to true", () => {
    expect(slackFeatureFlags.auditLogs).toBe(true);
    expect(slackFeatureFlags.retentionPolicies).toBe(true);
    expect(slackFeatureFlags.customRoles).toBe(true);
    expect(slackFeatureFlags.analytics).toBe(true);
    expect(slackFeatureFlags.dataExport).toBe(true);
  });

  it("should have workflow flags set to false (all disabled)", () => {
    expect(slackFeatureFlags.workflowBuilder).toBe(false);
    expect(slackFeatureFlags.workflowForms).toBe(false);
    expect(slackFeatureFlags.workflowTriggers).toBe(false);
    expect(slackFeatureFlags.canvas).toBe(false);
    expect(slackFeatureFlags.lists).toBe(false);
  });

  it("should have disabled channel/file flags set to false", () => {
    expect(slackFeatureFlags.sharedChannels).toBe(false);
    expect(slackFeatureFlags.externalFiles).toBe(false);
  });

  it("should retain all core messaging flags as true", () => {
    expect(slackFeatureFlags.richText).toBe(true);
    expect(slackFeatureFlags.markdown).toBe(true);
    expect(slackFeatureFlags.emoji).toBe(true);
    expect(slackFeatureFlags.customEmoji).toBe(true);
    expect(slackFeatureFlags.reactions).toBe(true);
    expect(slackFeatureFlags.mentions).toBe(true);
    expect(slackFeatureFlags.linkPreviews).toBe(true);
    expect(slackFeatureFlags.codeBlocks).toBe(true);
    expect(slackFeatureFlags.messageEdit).toBe(true);
    expect(slackFeatureFlags.messageDelete).toBe(true);
    expect(slackFeatureFlags.messagePin).toBe(true);
    expect(slackFeatureFlags.scheduledMessages).toBe(true);
    expect(slackFeatureFlags.typingIndicators).toBe(true);
  });

  it("should retain all thread flags as true", () => {
    expect(slackFeatureFlags.threads).toBe(true);
    expect(slackFeatureFlags.threadPanel).toBe(true);
    expect(slackFeatureFlags.threadBroadcast).toBe(true);
    expect(slackFeatureFlags.threadNotifications).toBe(true);
    expect(slackFeatureFlags.threadsView).toBe(true);
    expect(slackFeatureFlags.threadUnfollow).toBe(true);
  });

  it("should retain all search flags as true", () => {
    expect(slackFeatureFlags.globalSearch).toBe(true);
    expect(slackFeatureFlags.searchFilters).toBe(true);
    expect(slackFeatureFlags.searchModifiers).toBe(true);
    expect(slackFeatureFlags.quickSwitcher).toBe(true);
    expect(slackFeatureFlags.recentSearches).toBe(true);
    expect(slackFeatureFlags.savedSearches).toBe(true);
  });

  it("should retain all notification flags as true", () => {
    expect(slackFeatureFlags.pushNotifications).toBe(true);
    expect(slackFeatureFlags.notificationPreferences).toBe(true);
    expect(slackFeatureFlags.channelNotifications).toBe(true);
    expect(slackFeatureFlags.keywordNotifications).toBe(true);
    expect(slackFeatureFlags.doNotDisturb).toBe(true);
    expect(slackFeatureFlags.notificationSchedule).toBe(true);
    expect(slackFeatureFlags.emailNotifications).toBe(true);
  });

  it("should retain all accessibility flags as true", () => {
    expect(slackFeatureFlags.keyboardNavigation).toBe(true);
    expect(slackFeatureFlags.screenReader).toBe(true);
    expect(slackFeatureFlags.highContrast).toBe(true);
    expect(slackFeatureFlags.reducedMotion).toBe(true);
    expect(slackFeatureFlags.fontScaling).toBe(true);
  });

  it("should have exactly 10 false values in legacy feature flags", () => {
    const flagValues = Object.values(slackFeatureFlags);
    const falseFlags = flagValues.filter((v) => v === false);
    expect(falseFlags).toHaveLength(10);
  });

  it("should have exactly 80 true values in legacy feature flags", () => {
    // Note: 90 total flags (not 93 features; sub-mentions are covered by single 'mentions' flag)
    const flagValues = Object.values(slackFeatureFlags);
    const trueFlags = flagValues.filter((v) => v === true);
    expect(trueFlags).toHaveLength(80);
  });
});

// ============================================================================
// FEATURE CONFIG EXPORT
// ============================================================================

describe("Slack Feature Map - Config Export", () => {
  it("should export slackFeatureConfig with all category arrays", () => {
    expect(slackFeatureConfig.channels).toBe(CHANNEL_FEATURES);
    expect(slackFeatureConfig.dms).toBe(DM_FEATURES);
    expect(slackFeatureConfig.messaging).toBe(MESSAGING_FEATURES);
    expect(slackFeatureConfig.threads).toBe(THREAD_FEATURES);
    expect(slackFeatureConfig.search).toBe(SEARCH_FEATURES);
    expect(slackFeatureConfig.files).toBe(FILE_FEATURES);
    expect(slackFeatureConfig.apps).toBe(APP_FEATURES);
    expect(slackFeatureConfig.calls).toBe(CALL_FEATURES);
    expect(slackFeatureConfig.workflow).toBe(WORKFLOW_FEATURES);
    expect(slackFeatureConfig.admin).toBe(ADMIN_FEATURES);
    expect(slackFeatureConfig.notifications).toBe(NOTIFICATION_FEATURES);
    expect(slackFeatureConfig.accessibility).toBe(ACCESSIBILITY_FEATURES);
    expect(slackFeatureConfig.all).toBe(ALL_SLACK_FEATURES);
  });

  it("should export legacy flags on slackFeatureConfig", () => {
    expect(slackFeatureConfig.flags).toBe(slackFeatureFlags);
  });

  it("should export helpers on slackFeatureConfig", () => {
    expect(typeof slackFeatureConfig.helpers.getSlackFeatureById).toBe(
      "function",
    );
    expect(typeof slackFeatureConfig.helpers.getSlackFeaturesByCategory).toBe(
      "function",
    );
    expect(typeof slackFeatureConfig.helpers.getSlackEnabledFeatures).toBe(
      "function",
    );
    expect(typeof slackFeatureConfig.helpers.getSlackDisabledFeatures).toBe(
      "function",
    );
    expect(typeof slackFeatureConfig.helpers.getSlackPlaceholderFeatures).toBe(
      "function",
    );
    expect(typeof slackFeatureConfig.helpers.isSlackFeatureEnabled).toBe(
      "function",
    );
    expect(typeof slackFeatureConfig.helpers.getSlackFeatureDependencies).toBe(
      "function",
    );
  });
});

// ============================================================================
// LEGACY ALIASES
// ============================================================================

describe("Slack Feature Map - Legacy Aliases", () => {
  it("should have channelFeatures alias pointing to CHANNEL_FEATURES", () => {
    expect(channelFeatures).toBe(CHANNEL_FEATURES);
  });

  it("should have dmFeatures alias pointing to DM_FEATURES", () => {
    expect(dmFeatures).toBe(DM_FEATURES);
  });

  it("should have messagingFeatures alias pointing to MESSAGING_FEATURES", () => {
    expect(messagingFeatures).toBe(MESSAGING_FEATURES);
  });

  it("should have threadFeatures alias pointing to THREAD_FEATURES", () => {
    expect(threadFeatures).toBe(THREAD_FEATURES);
  });

  it("should have searchFeatures alias pointing to SEARCH_FEATURES", () => {
    expect(searchFeatures).toBe(SEARCH_FEATURES);
  });

  it("should have fileFeatures alias pointing to FILE_FEATURES", () => {
    expect(fileFeatures).toBe(FILE_FEATURES);
  });

  it("should have appFeatures alias pointing to APP_FEATURES", () => {
    expect(appFeatures).toBe(APP_FEATURES);
  });

  it("should have callFeatures alias pointing to CALL_FEATURES", () => {
    expect(callFeatures).toBe(CALL_FEATURES);
  });

  it("should have workflowFeatures alias pointing to WORKFLOW_FEATURES", () => {
    expect(workflowFeatures).toBe(WORKFLOW_FEATURES);
  });

  it("should have adminFeatures alias pointing to ADMIN_FEATURES", () => {
    expect(adminFeatures).toBe(ADMIN_FEATURES);
  });

  it("should have notificationFeatures alias pointing to NOTIFICATION_FEATURES", () => {
    expect(notificationFeatures).toBe(NOTIFICATION_FEATURES);
  });

  it("should have accessibilityFeatures alias pointing to ACCESSIBILITY_FEATURES", () => {
    expect(accessibilityFeatures).toBe(ACCESSIBILITY_FEATURES);
  });

  it("should have allSlackFeatures alias pointing to ALL_SLACK_FEATURES", () => {
    expect(allSlackFeatures).toBe(ALL_SLACK_FEATURES);
  });

  it("should have legacy helper aliases working correctly", () => {
    expect(getFeaturesByCategory("channels")).toEqual(
      getSlackFeaturesByCategory("channels"),
    );
    expect(getFeatureById("huddles")).toEqual(getSlackFeatureById("huddles"));
    expect(getEnabledFeatures()).toEqual(getSlackEnabledFeatures());
    expect(isFeatureEnabled("threads")).toBe(isSlackFeatureEnabled("threads"));
  });
});

// ============================================================================
// LEGACY STAT HELPERS
// ============================================================================

describe("Slack Feature Map - Legacy Stats & Helpers", () => {
  it("featureStats should have correct total count", () => {
    expect(featureStats.total).toBe(93);
  });

  it("featureStats should have correct enabled count", () => {
    expect(featureStats.enabled).toBe(83);
  });

  it("featureStats should have correct disabled count", () => {
    expect(featureStats.disabled).toBe(10);
  });

  it("featureStats enabled + disabled should equal total", () => {
    expect(featureStats.enabled + featureStats.disabled).toBe(
      featureStats.total,
    );
  });

  it("getFeaturesByStatus should return enabled features", () => {
    const enabled = getFeaturesByStatus("enabled");
    expect(enabled.length).toBe(83);
    for (const f of enabled) {
      expect(f.status).toBe("enabled");
    }
  });

  it("getFeaturesByStatus should return disabled features", () => {
    const disabled = getFeaturesByStatus("disabled");
    expect(disabled.length).toBe(10);
    for (const f of disabled) {
      expect(f.status).toBe("disabled");
    }
  });

  it("getPremiumFeatures (deprecated) should return empty array", () => {
    expect(getPremiumFeatures()).toHaveLength(0);
  });

  it("getBetaFeatures (deprecated) should return empty array", () => {
    expect(getBetaFeatures()).toHaveLength(0);
  });
});

// ============================================================================
// HUDDLE FEATURE PARITY
// ============================================================================

describe("Slack Feature Map - Huddle Feature Parity", () => {
  it("should have huddles with correct settings", () => {
    const huddle = getSlackFeatureById("huddles");
    expect(huddle).toBeDefined();
    expect(huddle!.status).toBe("enabled");
    expect(huddle!.settings!.maxParticipants).toBe(50);
    expect(huddle!.settings!.startFromChannel).toBe(true);
    expect(huddle!.settings!.startFromDM).toBe(true);
  });

  it("should have all huddle sub-features dependent on huddles", () => {
    const subFeatures = [
      "huddle-video",
      "huddle-screenshare",
      "huddle-thread",
      "huddle-reactions",
    ];
    for (const subId of subFeatures) {
      const feature = getSlackFeatureById(subId);
      expect(feature).toBeDefined();
      expect(feature!.dependencies).toContain("huddles");
    }
  });

  it("should have clips with transcription support", () => {
    const clips = getSlackFeatureById("clips");
    expect(clips).toBeDefined();
    expect(clips!.settings!.transcription).toBe(true);
    expect(clips!.settings!.formats).toEqual(["audio", "video"]);
  });
});

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

describe("Slack Feature Map - Keyboard Shortcuts", () => {
  it("should have keyboard shortcuts defined", () => {
    expect(slackKeyboardShortcuts).toBeDefined();
    expect(typeof slackKeyboardShortcuts).toBe("object");
  });

  it("should have quick switcher shortcut", () => {
    expect(slackKeyboardShortcuts.quickSwitcher.mac).toBe("Cmd+K");
    expect(slackKeyboardShortcuts.quickSwitcher.windows).toBe("Ctrl+K");
  });

  it("should have messaging shortcuts", () => {
    expect(slackKeyboardShortcuts.bold.mac).toBe("Cmd+B");
    expect(slackKeyboardShortcuts.italic.mac).toBe("Cmd+I");
    expect(slackKeyboardShortcuts.sendMessage.mac).toBe("Enter");
  });

  it("should have every shortcut with mac, windows, and description", () => {
    for (const [, shortcut] of Object.entries(slackKeyboardShortcuts)) {
      expect(shortcut.mac).toBeTruthy();
      expect(shortcut.windows).toBeTruthy();
      expect(shortcut.description).toBeTruthy();
    }
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("Slack Feature Map - Edge Cases", () => {
  it("should handle undefined dependency ids gracefully", () => {
    // getSlackFeatureDependencies should filter out undefined results
    const deps = getSlackFeatureDependencies("modals");
    // modals depends on app-directory which exists
    expect(deps).toHaveLength(1);
    expect(deps[0].id).toBe("app-directory");
  });

  it("should not return features when queried with case-different id", () => {
    const feature = getSlackFeatureById("Public-Channels");
    expect(feature).toBeUndefined();
  });

  it("should return consistent results from helpers and direct array access", () => {
    const directEnabled = ALL_SLACK_FEATURES.filter(
      (f) => f.status === "enabled",
    );
    const helperEnabled = getSlackEnabledFeatures();
    expect(directEnabled.length).toBe(helperEnabled.length);
  });

  it("should return consistent results from helpers and direct array access for disabled", () => {
    const directDisabled = ALL_SLACK_FEATURES.filter(
      (f) => f.status === "disabled",
    );
    const helperDisabled = getSlackDisabledFeatures();
    expect(directDisabled.length).toBe(helperDisabled.length);
  });

  it("all features should have status as a string", () => {
    for (const feature of ALL_SLACK_FEATURES) {
      expect(typeof feature.status).toBe("string");
    }
  });

  it("all disabled features should have category assigned", () => {
    const disabled = getSlackDisabledFeatures();
    for (const f of disabled) {
      expect(f.category).toBeTruthy();
    }
  });
});
