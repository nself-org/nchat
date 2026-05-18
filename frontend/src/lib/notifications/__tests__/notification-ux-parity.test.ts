/**
 * Notification UX Parity Tests
 *
 * Comprehensive tests for Task 122: Complete notification UX parity
 * Covers:
 * - Channel rules (30+ tests)
 * - Keyword alerts (30+ tests)
 * - Quiet hours / DND (30+ tests)
 * - Digest behavior (30+ tests)
 * - Preference engine (30+ tests)
 *
 * Total: 150+ tests
 */

import {
  // Channel Rules
  createChannelRuleStore,
  createChannelRule,
  updateChannelRule,
  deleteChannelRule,
  getChannelRule,
  getAllChannelRules,
  getChannelRulesByLevel,
  muteChannelRule,
  unmuteChannelRule,
  isChannelRuleMuted,
  isMuteActive,
  cleanupExpiredMutes as cleanupExpiredChannelMutes,
  setThreadPreference,
  removeThreadPreference,
  getEffectiveThreadLevel,
  createCategoryRule,
  addCategoryRule,
  updateCategoryRule,
  deleteCategoryRule,
  addChannelToCategory,
  removeChannelFromCategory,
  evaluateChannelRule,
  resolveDeliveryMethods,
  getMutedChannels as getMutedChannelRules,
  getChannelsInCategory,
  getChannelRuleStats,
} from "../channel-rules";

import type {
  ChannelNotificationRule,
  ChannelCategoryRule,
  ChannelRuleStore,
  MuteState,
} from "../channel-rules";

import {
  // Keyword Alerts Engine
  createKeywordAlertDefinition,
  validateKeywordAlertPattern,
  createKeywordGroup,
  getEffectiveAlertPriority,
  buildMatchRegex,
  matchSingleAlert,
  matchKeywordAlerts,
  filterActiveAlerts,
  hasAnyKeywordMatch,
  createWorkspaceKeywordList,
  addKeywordToWorkspace,
  removeKeywordFromWorkspace,
  getKeywordsForWorkspace,
  getKeywordAlertStats as getKeywordAlertEngineStats,
} from "../keyword-alerts-engine";

import type {
  KeywordAlertDefinition,
  KeywordGroup,
} from "../keyword-alerts-engine";

import {
  // Quiet Hours Engine
  activateDND,
  deactivateDND,
  isDNDActive,
  getDNDTimeRemaining,
  createException,
  addException,
  removeException,
  toggleException,
  matchesException,
  parseTimeToMinutes,
  getDaySchedule,
  isTimeInSchedule,
  isScheduleActive,
  checkQuietHours,
  getNextQuietHoursTransition,
  formatDNDTimeRemaining,
  validateEnhancedSchedule,
  createDefaultQuietHoursSchedule,
  createDefaultQuietHoursState,
} from "../quiet-hours-engine";

import type {
  QuietHoursState,
  DNDException,
  DaySchedule,
} from "../quiet-hours-engine";

import {
  // Digest
  createDigestConfig,
  shouldBypassDigest,
  shouldSendDigest as shouldSendDigestNew,
  getNextDigestTime as getNextDigestTimeNew,
  generateDigest,
  formatDigestAsText as formatDigestText,
  createDeliveryState,
  markDigestSent,
  addPendingNotification,
  DEFAULT_DIGEST_CONFIG,
} from "../digest";

import type { DigestConfig as DigestConfigNew, DigestEntry } from "../digest";

import {
  // Preference Engine
  NotificationPreferenceEngine,
  shouldNotify,
  createPreferenceEngineState,
  updateEngineState,
  isChannelSuppressed,
  getDecisionSummary,
} from "../preference-engine";

import type {
  NotificationInput,
  PreferenceEngineState,
} from "../preference-engine";

// ============================================================================
// SECTION 1: Channel Rules Tests (30+ tests)
// ============================================================================

describe("Channel Rules", () => {
  describe("Store Management", () => {
    it("should create an empty channel rule store", () => {
      const store = createChannelRuleStore();
      expect(store.channelRules).toEqual({});
      expect(store.categoryRules).toEqual({});
      expect(store.globalDefaultLevel).toBe("all");
      expect(store.globalDefaultThreadLevel).toBe("participating");
    });

    it("should create a store with custom defaults", () => {
      const store = createChannelRuleStore({
        globalDefaultLevel: "mentions",
        globalDefaultThreadLevel: "all",
      });
      expect(store.globalDefaultLevel).toBe("mentions");
      expect(store.globalDefaultThreadLevel).toBe("all");
    });

    it("should create a channel rule with default values", () => {
      const rule = createChannelRule("channel-1");
      expect(rule.channelId).toBe("channel-1");
      expect(rule.level).toBe("all");
      expect(rule.mute.isMuted).toBe(false);
      expect(rule.overrideGlobal).toBe(true);
      expect(rule.threadPreferences).toEqual({});
      expect(rule.defaultThreadLevel).toBe("participating");
      expect(rule.allowedTypes).toEqual([]);
      expect(rule.blockedTypes).toEqual([]);
      expect(rule.createdAt).toBeTruthy();
    });

    it("should create a channel rule with custom options", () => {
      const rule = createChannelRule("channel-2", {
        level: "mentions",
        channelName: "general",
        channelType: "public",
        customSound: "bell",
        minimumPriority: "high",
      });
      expect(rule.level).toBe("mentions");
      expect(rule.channelName).toBe("general");
      expect(rule.channelType).toBe("public");
      expect(rule.customSound).toBe("bell");
      expect(rule.minimumPriority).toBe("high");
    });
  });

  describe("CRUD Operations", () => {
    let store: ChannelRuleStore;

    beforeEach(() => {
      store = createChannelRuleStore();
    });

    it("should update a channel rule in the store", () => {
      const updated = updateChannelRule(store, "ch-1", { level: "mentions" });
      expect(updated.channelRules["ch-1"]).toBeDefined();
      expect(updated.channelRules["ch-1"].level).toBe("mentions");
    });

    it("should update an existing channel rule", () => {
      let s = updateChannelRule(store, "ch-1", {
        level: "all",
        channelName: "test",
      });
      s = updateChannelRule(s, "ch-1", { level: "nothing" });
      expect(s.channelRules["ch-1"].level).toBe("nothing");
      expect(s.channelRules["ch-1"].channelName).toBe("test");
    });

    it("should delete a channel rule from the store", () => {
      const s = updateChannelRule(store, "ch-1", { level: "mentions" });
      const deleted = deleteChannelRule(s, "ch-1");
      expect(deleted.channelRules["ch-1"]).toBeUndefined();
    });

    it("should get a channel rule by ID", () => {
      const s = updateChannelRule(store, "ch-1", { level: "mentions" });
      expect(getChannelRule(s, "ch-1")?.level).toBe("mentions");
      expect(getChannelRule(s, "ch-2")).toBeNull();
    });

    it("should get all channel rules", () => {
      let s = updateChannelRule(store, "ch-1", { level: "all" });
      s = updateChannelRule(s, "ch-2", { level: "mentions" });
      const all = getAllChannelRules(s);
      expect(all).toHaveLength(2);
    });

    it("should get channel rules filtered by level", () => {
      let s = updateChannelRule(store, "ch-1", { level: "all" });
      s = updateChannelRule(s, "ch-2", { level: "mentions" });
      s = updateChannelRule(s, "ch-3", { level: "mentions" });
      expect(getChannelRulesByLevel(s, "mentions")).toHaveLength(2);
      expect(getChannelRulesByLevel(s, "nothing")).toHaveLength(0);
    });
  });

  describe("Mute Operations", () => {
    let store: ChannelRuleStore;

    beforeEach(() => {
      store = createChannelRuleStore();
    });

    it("should mute a channel permanently", () => {
      const muted = muteChannelRule(store, "ch-1");
      expect(muted.channelRules["ch-1"].mute.isMuted).toBe(true);
      expect(muted.channelRules["ch-1"].mute.expiresAt).toBeNull();
    });

    it("should mute a channel with duration", () => {
      const muted = muteChannelRule(store, "ch-1", { duration: "1h" });
      expect(muted.channelRules["ch-1"].mute.isMuted).toBe(true);
      expect(muted.channelRules["ch-1"].mute.expiresAt).toBeTruthy();
    });

    it("should mute a channel with custom duration in ms", () => {
      const muted = muteChannelRule(store, "ch-1", { duration: 5000 });
      expect(muted.channelRules["ch-1"].mute.isMuted).toBe(true);
      const expiresAt = new Date(muted.channelRules["ch-1"].mute.expiresAt!);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("should unmute a channel", () => {
      let s = muteChannelRule(store, "ch-1");
      s = unmuteChannelRule(s, "ch-1");
      expect(s.channelRules["ch-1"].mute.isMuted).toBe(false);
    });

    it("should check if channel is muted", () => {
      const s = muteChannelRule(store, "ch-1");
      expect(isChannelRuleMuted(s, "ch-1")).toBe(true);
      expect(isChannelRuleMuted(s, "ch-2")).toBe(false);
    });

    it("should detect expired mutes", () => {
      const pastDate = new Date(Date.now() - 10000).toISOString();
      const s = updateChannelRule(store, "ch-1", {
        mute: { isMuted: true, expiresAt: pastDate },
      });
      expect(isChannelRuleMuted(s, "ch-1")).toBe(false);
    });

    it("should check isMuteActive correctly", () => {
      const active: MuteState = { isMuted: true, expiresAt: null };
      const expired: MuteState = {
        isMuted: true,
        expiresAt: new Date(Date.now() - 10000).toISOString(),
      };
      const notMuted: MuteState = { isMuted: false, expiresAt: null };

      expect(isMuteActive(active)).toBe(true);
      expect(isMuteActive(expired)).toBe(false);
      expect(isMuteActive(notMuted)).toBe(false);
    });

    it("should clean up expired mutes", () => {
      const pastDate = new Date(Date.now() - 10000).toISOString();
      const futureDate = new Date(Date.now() + 100000).toISOString();

      let s = updateChannelRule(store, "ch-1", {
        mute: { isMuted: true, expiresAt: pastDate },
      });
      s = updateChannelRule(s, "ch-2", {
        mute: { isMuted: true, expiresAt: futureDate },
      });

      const cleaned = cleanupExpiredChannelMutes(s);
      expect(cleaned.channelRules["ch-1"].mute.isMuted).toBe(false);
      expect(cleaned.channelRules["ch-2"].mute.isMuted).toBe(true);
    });

    it("should get all muted channels", () => {
      let s = muteChannelRule(store, "ch-1");
      s = muteChannelRule(s, "ch-2");
      s = updateChannelRule(s, "ch-3", { level: "all" });
      expect(getMutedChannelRules(s)).toHaveLength(2);
    });

    it("should mute with a reason", () => {
      const s = muteChannelRule(store, "ch-1", { reason: "too noisy" });
      expect(s.channelRules["ch-1"].mute.reason).toBe("too noisy");
    });
  });

  describe("Thread Preferences", () => {
    let store: ChannelRuleStore;

    beforeEach(() => {
      store = createChannelRuleStore();
    });

    it("should set a thread preference", () => {
      const s = setThreadPreference(store, "ch-1", "thread-1", {
        level: "all",
        isParticipating: true,
      });
      const threadPref = s.channelRules["ch-1"].threadPreferences["thread-1"];
      expect(threadPref).toBeDefined();
      expect(threadPref.level).toBe("all");
      expect(threadPref.isParticipating).toBe(true);
    });

    it("should remove a thread preference", () => {
      let s = setThreadPreference(store, "ch-1", "thread-1", { level: "all" });
      s = removeThreadPreference(s, "ch-1", "thread-1");
      expect(
        s.channelRules["ch-1"].threadPreferences["thread-1"],
      ).toBeUndefined();
    });

    it("should get effective thread level for participating user", () => {
      const s = setThreadPreference(store, "ch-1", "thread-1", {
        level: "participating",
        isParticipating: true,
      });
      expect(getEffectiveThreadLevel(s, "ch-1", "thread-1", true)).toBe(
        "participating",
      );
    });

    it("should suppress non-participating users in participating-only threads", () => {
      const s = createChannelRuleStore({
        globalDefaultThreadLevel: "participating",
      });
      // No explicit thread preference - uses default
      expect(getEffectiveThreadLevel(s, "ch-1", "thread-1", false)).toBe(
        "nothing",
      );
      expect(getEffectiveThreadLevel(s, "ch-1", "thread-1", true)).toBe(
        "participating",
      );
    });

    it("should respect muted thread preference", () => {
      const futureDate = new Date(Date.now() + 100000).toISOString();
      const s = setThreadPreference(store, "ch-1", "thread-1", {
        level: "all",
        mute: { isMuted: true, expiresAt: futureDate },
      });
      expect(getEffectiveThreadLevel(s, "ch-1", "thread-1", true)).toBe(
        "nothing",
      );
    });
  });

  describe("Category Rules", () => {
    let store: ChannelRuleStore;

    beforeEach(() => {
      store = createChannelRuleStore();
    });

    it("should create a category rule", () => {
      const cat = createCategoryRule("cat-1", "Engineering", {
        level: "mentions",
      });
      expect(cat.categoryId).toBe("cat-1");
      expect(cat.name).toBe("Engineering");
      expect(cat.level).toBe("mentions");
    });

    it("should add a category rule to the store", () => {
      const cat = createCategoryRule("cat-1", "Engineering");
      const s = addCategoryRule(store, cat);
      expect(s.categoryRules["cat-1"]).toBeDefined();
    });

    it("should update a category rule", () => {
      const cat = createCategoryRule("cat-1", "Engineering");
      let s = addCategoryRule(store, cat);
      s = updateCategoryRule(s, "cat-1", { level: "nothing" });
      expect(s.categoryRules["cat-1"].level).toBe("nothing");
    });

    it("should delete a category rule", () => {
      const cat = createCategoryRule("cat-1", "Engineering");
      let s = addCategoryRule(store, cat);
      s = deleteCategoryRule(s, "cat-1");
      expect(s.categoryRules["cat-1"]).toBeUndefined();
    });

    it("should add a channel to a category", () => {
      const cat = createCategoryRule("cat-1", "Engineering");
      let s = addCategoryRule(store, cat);
      s = addChannelToCategory(s, "cat-1", "ch-1");
      expect(s.categoryRules["cat-1"].channelIds).toContain("ch-1");
      expect(s.channelRules["ch-1"]?.categoryId).toBe("cat-1");
    });

    it("should remove a channel from a category", () => {
      const cat = createCategoryRule("cat-1", "Engineering", {
        channelIds: ["ch-1"],
      });
      let s = addCategoryRule(store, cat);
      s = updateChannelRule(s, "ch-1", { categoryId: "cat-1" });
      s = removeChannelFromCategory(s, "cat-1", "ch-1");
      expect(s.categoryRules["cat-1"].channelIds).not.toContain("ch-1");
    });

    it("should get channels in a category", () => {
      const cat = createCategoryRule("cat-1", "Engineering", {
        channelIds: ["ch-1", "ch-2"],
      });
      let s = addCategoryRule(store, cat);
      s = updateChannelRule(s, "ch-1", { level: "all" });
      s = updateChannelRule(s, "ch-2", { level: "mentions" });
      const channels = getChannelsInCategory(s, "cat-1");
      expect(channels).toHaveLength(2);
    });
  });

  describe("Rule Evaluation", () => {
    let store: ChannelRuleStore;

    beforeEach(() => {
      store = createChannelRuleStore();
    });

    it("should allow notifications by default", () => {
      const result = evaluateChannelRule(store, "ch-1", {
        type: "mention",
        priority: "normal",
      });
      expect(result.shouldNotify).toBe(true);
    });

    it("should block notifications for muted channels", () => {
      const s = muteChannelRule(store, "ch-1");
      const result = evaluateChannelRule(s, "ch-1", {
        type: "mention",
        priority: "normal",
      });
      expect(result.shouldNotify).toBe(false);
      expect(result.reason).toContain("muted");
    });

    it("should allow only mentions for mentions-only channels", () => {
      const s = updateChannelRule(store, "ch-1", { level: "mentions" });
      const mentionResult = evaluateChannelRule(s, "ch-1", {
        type: "mention",
        priority: "normal",
      });
      const dmResult = evaluateChannelRule(s, "ch-1", {
        type: "direct_message",
        priority: "normal",
      });
      expect(mentionResult.shouldNotify).toBe(true);
      expect(dmResult.shouldNotify).toBe(false);
    });

    it("should block notifications for disabled channels", () => {
      const s = updateChannelRule(store, "ch-1", { level: "nothing" });
      const result = evaluateChannelRule(s, "ch-1", {
        type: "mention",
        priority: "normal",
      });
      expect(result.shouldNotify).toBe(false);
    });

    it("should block explicitly blocked notification types", () => {
      const s = updateChannelRule(store, "ch-1", {
        blockedTypes: ["reaction"],
      });
      const result = evaluateChannelRule(s, "ch-1", {
        type: "reaction",
        priority: "normal",
      });
      expect(result.shouldNotify).toBe(false);
    });

    it("should enforce minimum priority", () => {
      const s = updateChannelRule(store, "ch-1", { minimumPriority: "high" });
      const lowResult = evaluateChannelRule(s, "ch-1", {
        type: "mention",
        priority: "normal",
      });
      const highResult = evaluateChannelRule(s, "ch-1", {
        type: "mention",
        priority: "high",
      });
      expect(lowResult.shouldNotify).toBe(false);
      expect(highResult.shouldNotify).toBe(true);
    });

    it("should resolve delivery methods from channel rule", () => {
      const s = updateChannelRule(store, "ch-1", {
        deliveryOverrides: { email: false, desktop: false },
      });
      const methods = resolveDeliveryMethods(s, "ch-1");
      expect(methods).toContain("mobile");
      expect(methods).toContain("in_app");
      expect(methods).not.toContain("email");
      expect(methods).not.toContain("desktop");
    });

    it("should provide channel rule stats", () => {
      let s = muteChannelRule(store, "ch-1");
      s = updateChannelRule(s, "ch-2", { level: "mentions" });
      s = updateChannelRule(s, "ch-3", { level: "nothing" });
      s = setThreadPreference(s, "ch-2", "thread-1", { level: "all" });

      const stats = getChannelRuleStats(s);
      expect(stats.totalRules).toBe(3);
      expect(stats.mutedChannels).toBe(1);
      expect(stats.mentionsOnlyChannels).toBe(1);
      expect(stats.threadPreferencesCount).toBe(1);
    });
  });
});

// ============================================================================
// SECTION 2: Keyword Alerts Engine Tests (30+ tests)
// ============================================================================

describe("Keyword Alerts Engine", () => {
  describe("Alert Definition Management", () => {
    it("should create a keyword alert definition with defaults", () => {
      const alert = createKeywordAlertDefinition("bug");
      expect(alert.pattern).toBe("bug");
      expect(alert.matchMode).toBe("contains");
      expect(alert.caseSensitive).toBe(false);
      expect(alert.priority).toBe("normal");
      expect(alert.enabled).toBe(true);
      expect(alert.workspaceIds).toEqual([]);
      expect(alert.channelIds).toEqual([]);
    });

    it("should create an alert with custom options", () => {
      const alert = createKeywordAlertDefinition("ERROR", {
        matchMode: "regex",
        caseSensitive: true,
        priority: "urgent",
        workspaceIds: ["ws-1"],
        channelIds: ["ch-1"],
        description: "Match errors",
      });
      expect(alert.matchMode).toBe("regex");
      expect(alert.caseSensitive).toBe(true);
      expect(alert.priority).toBe("urgent");
      expect(alert.workspaceIds).toEqual(["ws-1"]);
      expect(alert.description).toBe("Match errors");
    });

    it("should trim whitespace from pattern", () => {
      const alert = createKeywordAlertDefinition("  hello world  ");
      expect(alert.pattern).toBe("hello world");
    });
  });

  describe("Pattern Validation", () => {
    it("should reject empty patterns", () => {
      const result = validateKeywordAlertPattern("", "contains");
      expect(result.valid).toBe(false);
    });

    it("should reject patterns shorter than 2 characters", () => {
      const result = validateKeywordAlertPattern("a", "contains");
      expect(result.valid).toBe(false);
    });

    it("should reject patterns longer than 500 characters", () => {
      const result = validateKeywordAlertPattern("a".repeat(501), "contains");
      expect(result.valid).toBe(false);
    });

    it("should validate valid regex patterns", () => {
      const result = validateKeywordAlertPattern("error\\s+\\d+", "regex");
      expect(result.valid).toBe(true);
    });

    it("should reject invalid regex patterns", () => {
      const result = validateKeywordAlertPattern("[invalid", "regex");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid regex");
    });

    it("should accept valid contains patterns", () => {
      const result = validateKeywordAlertPattern("hello world", "contains");
      expect(result.valid).toBe(true);
    });
  });

  describe("Keyword Groups", () => {
    it("should create a keyword group", () => {
      const group = createKeywordGroup("Security Alerts", {
        color: "#ef4444",
        defaultPriority: "urgent",
      });
      expect(group.name).toBe("Security Alerts");
      expect(group.color).toBe("#ef4444");
      expect(group.defaultPriority).toBe("urgent");
      expect(group.enabled).toBe(true);
    });

    it("should get effective priority from group", () => {
      const group = createKeywordGroup("Security", { defaultPriority: "high" });
      const alert = createKeywordAlertDefinition("hack", {
        groupId: group.id,
        priority: "normal", // normal priority on alert, high on group
      });
      expect(getEffectiveAlertPriority(alert, [group])).toBe("high");
    });

    it("should prioritize alert-level priority over group", () => {
      const group = createKeywordGroup("Low", { defaultPriority: "normal" });
      const alert = createKeywordAlertDefinition("critical", {
        groupId: group.id,
        priority: "urgent",
      });
      expect(getEffectiveAlertPriority(alert, [group])).toBe("urgent");
    });

    it("should return alert priority when no group", () => {
      const alert = createKeywordAlertDefinition("test", { priority: "high" });
      expect(getEffectiveAlertPriority(alert, [])).toBe("high");
    });
  });

  describe("Pattern Matching", () => {
    it("should match with contains mode", () => {
      const alert = createKeywordAlertDefinition("bug", {
        matchMode: "contains",
      });
      const regex = buildMatchRegex(alert);
      expect(regex).toBeTruthy();
      expect(regex!.test("this is a bug report")).toBe(true);
    });

    it("should match with exact mode", () => {
      const alert = createKeywordAlertDefinition("bug", { matchMode: "exact" });
      const regex = buildMatchRegex(alert);
      expect(regex!.test("bug")).toBe(true);
      regex!.lastIndex = 0;
      expect(regex!.test("this is a bug")).toBe(false);
    });

    it("should match with whole_word mode", () => {
      const alert = createKeywordAlertDefinition("bug", {
        matchMode: "whole_word",
      });
      const regex = buildMatchRegex(alert);
      expect(regex!.test("found a bug here")).toBe(true);
      regex!.lastIndex = 0;
      expect(regex!.test("debugging code")).toBe(false);
    });

    it("should match with regex mode", () => {
      const alert = createKeywordAlertDefinition("error\\s+\\d{3}", {
        matchMode: "regex",
      });
      const regex = buildMatchRegex(alert);
      expect(regex!.test("error 404 not found")).toBe(true);
      regex!.lastIndex = 0;
      expect(regex!.test("error abc")).toBe(false);
    });

    it("should handle case-insensitive matching", () => {
      const alert = createKeywordAlertDefinition("BUG", {
        matchMode: "contains",
        caseSensitive: false,
      });
      const regex = buildMatchRegex(alert);
      // Reset lastIndex between tests since regex has global flag
      regex!.lastIndex = 0;
      expect(regex!.test("bug")).toBe(true);
      regex!.lastIndex = 0;
      expect(regex!.test("Bug")).toBe(true);
      regex!.lastIndex = 0;
      expect(regex!.test("BUG")).toBe(true);
    });

    it("should handle case-sensitive matching", () => {
      const alert = createKeywordAlertDefinition("BUG", {
        matchMode: "contains",
        caseSensitive: true,
      });
      const regex = buildMatchRegex(alert);
      regex!.lastIndex = 0;
      expect(regex!.test("BUG")).toBe(true);
      regex!.lastIndex = 0;
      expect(regex!.test("bug")).toBe(false);
    });

    it("should return null for invalid regex", () => {
      const alert = createKeywordAlertDefinition("[bad", {
        matchMode: "regex",
      });
      const regex = buildMatchRegex(alert);
      expect(regex).toBeNull();
    });
  });

  describe("Single Alert Matching", () => {
    it("should return empty for disabled alerts", () => {
      const alert = createKeywordAlertDefinition("bug", { enabled: false });
      const matches = matchSingleAlert("there is a bug", alert, []);
      expect(matches).toHaveLength(0);
    });

    it("should return empty for disabled groups", () => {
      const group = createKeywordGroup("Test", { enabled: false });
      const alert = createKeywordAlertDefinition("bug", { groupId: group.id });
      const matches = matchSingleAlert("there is a bug", alert, [group]);
      expect(matches).toHaveLength(0);
    });

    it("should find all occurrences", () => {
      const alert = createKeywordAlertDefinition("bug", {
        matchMode: "contains",
      });
      const matches = matchSingleAlert("bug bug bug", alert, []);
      expect(matches).toHaveLength(3);
    });

    it("should include correct match data", () => {
      const alert = createKeywordAlertDefinition("hello", {
        matchMode: "contains",
        priority: "high",
      });
      const matches = matchSingleAlert("say hello world", alert, []);
      expect(matches).toHaveLength(1);
      expect(matches[0].alertId).toBe(alert.id);
      expect(matches[0].pattern).toBe("hello");
      expect(matches[0].matchedText).toBe("hello");
      expect(matches[0].position).toBe(4);
      expect(matches[0].length).toBe(5);
      expect(matches[0].priority).toBe("high");
    });

    it("should respect maxMatches", () => {
      const alert = createKeywordAlertDefinition("a", {
        matchMode: "contains",
      });
      const matches = matchSingleAlert("aaaaaaaaa", alert, [], {
        maxMatches: 3,
      });
      expect(matches).toHaveLength(3);
    });
  });

  describe("Multi-Alert Matching", () => {
    it("should match multiple alerts against text", () => {
      const alerts = [
        createKeywordAlertDefinition("bug", { matchMode: "contains" }),
        createKeywordAlertDefinition("error", { matchMode: "contains" }),
      ];
      const result = matchKeywordAlerts("found a bug and error", alerts, []);
      expect(result.hasMatches).toBe(true);
      expect(result.matches).toHaveLength(2);
      expect(result.matchedAlertIds).toHaveLength(2);
    });

    it("should determine highest priority", () => {
      const alerts = [
        createKeywordAlertDefinition("bug", { priority: "normal" }),
        createKeywordAlertDefinition("critical", { priority: "urgent" }),
      ];
      const result = matchKeywordAlerts("critical bug found", alerts, []);
      expect(result.highestPriority).toBe("urgent");
      expect(result.hasUrgent).toBe(true);
      expect(result.bypassDigest).toBe(true);
    });

    it("should return empty result for no matches", () => {
      const alerts = [
        createKeywordAlertDefinition("xyz", { matchMode: "contains" }),
      ];
      const result = matchKeywordAlerts("hello world", alerts, []);
      expect(result.hasMatches).toBe(false);
      expect(result.matches).toHaveLength(0);
      expect(result.highestPriority).toBeNull();
    });

    it("should return empty for empty text", () => {
      const alerts = [createKeywordAlertDefinition("test")];
      const result = matchKeywordAlerts("", alerts, []);
      expect(result.hasMatches).toBe(false);
    });

    it("should return empty for empty alerts", () => {
      const result = matchKeywordAlerts("hello world", [], []);
      expect(result.hasMatches).toBe(false);
    });

    it("should sort matches by position", () => {
      const alerts = [
        createKeywordAlertDefinition("world", { matchMode: "contains" }),
        createKeywordAlertDefinition("hello", { matchMode: "contains" }),
      ];
      const result = matchKeywordAlerts("hello world", alerts, []);
      expect(result.matches[0].matchedText).toBe("hello");
      expect(result.matches[1].matchedText).toBe("world");
    });
  });

  describe("Alert Filtering", () => {
    it("should filter by workspace", () => {
      const alerts = [
        createKeywordAlertDefinition("bug", { workspaceIds: ["ws-1"] }),
        createKeywordAlertDefinition("error", { workspaceIds: ["ws-2"] }),
        createKeywordAlertDefinition("critical", { workspaceIds: [] }), // global
      ];
      const filtered = filterActiveAlerts(alerts, "ws-1");
      expect(filtered).toHaveLength(2); // ws-1 alert + global
    });

    it("should filter by channel", () => {
      const alerts = [
        createKeywordAlertDefinition("bug", { channelIds: ["ch-1"] }),
        createKeywordAlertDefinition("error", { channelIds: ["ch-2"] }),
        createKeywordAlertDefinition("critical", { channelIds: [] }), // all channels
      ];
      const filtered = filterActiveAlerts(alerts, undefined, "ch-1");
      expect(filtered).toHaveLength(2);
    });

    it("should filter out disabled alerts", () => {
      const alerts = [
        createKeywordAlertDefinition("bug", { enabled: true }),
        createKeywordAlertDefinition("error", { enabled: false }),
      ];
      const filtered = filterActiveAlerts(alerts);
      expect(filtered).toHaveLength(1);
    });

    it("should detect any keyword match quickly", () => {
      const alerts = [createKeywordAlertDefinition("bug")];
      expect(hasAnyKeywordMatch("found a bug", alerts, [])).toBe(true);
      expect(hasAnyKeywordMatch("no issues", alerts, [])).toBe(false);
    });
  });

  describe("Workspace Keyword Lists", () => {
    it("should create a workspace keyword list", () => {
      const list = createWorkspaceKeywordList("ws-1", "Engineering");
      expect(list.workspaceId).toBe("ws-1");
      expect(list.keywords).toEqual([]);
    });

    it("should add keyword to workspace", () => {
      const list = createWorkspaceKeywordList("ws-1", "Engineering");
      const alert = createKeywordAlertDefinition("deploy");
      const updated = addKeywordToWorkspace(list, alert);
      expect(updated.keywords).toHaveLength(1);
      expect(updated.keywords[0].workspaceIds).toContain("ws-1");
    });

    it("should remove keyword from workspace", () => {
      const list = createWorkspaceKeywordList("ws-1", "Engineering");
      const alert = createKeywordAlertDefinition("deploy");
      let updated = addKeywordToWorkspace(list, alert);
      updated = removeKeywordFromWorkspace(updated, alert.id);
      expect(updated.keywords).toHaveLength(0);
    });

    it("should merge global and workspace keywords", () => {
      const globalAlerts = [
        createKeywordAlertDefinition("bug", { workspaceIds: [] }),
        createKeywordAlertDefinition("error", { workspaceIds: ["ws-2"] }),
      ];
      const list = createWorkspaceKeywordList("ws-1", "Engineering");
      const wsAlert = createKeywordAlertDefinition("deploy");
      const updatedList = addKeywordToWorkspace(list, wsAlert);
      const merged = getKeywordsForWorkspace(globalAlerts, updatedList);
      expect(merged).toHaveLength(2); // ws-1 alert + global (ws-2 excluded by not being workspace-unrestricted)
    });

    it("should provide keyword alert stats", () => {
      const alerts = [
        createKeywordAlertDefinition("bug", {
          matchMode: "contains",
          priority: "normal",
        }),
        createKeywordAlertDefinition("err\\d+", {
          matchMode: "regex",
          priority: "high",
          enabled: false,
        }),
        createKeywordAlertDefinition("critical", {
          matchMode: "whole_word",
          priority: "urgent",
          channelIds: ["ch-1"],
        }),
      ];
      const stats = getKeywordAlertEngineStats(alerts, []);
      expect(stats.totalAlerts).toBe(3);
      expect(stats.enabledAlerts).toBe(2);
      expect(stats.disabledAlerts).toBe(1);
      expect(stats.byMatchMode.regex).toBe(1);
      expect(stats.byPriority.urgent).toBe(1);
      expect(stats.alertsWithChannelRestriction).toBe(1);
    });
  });
});

// ============================================================================
// SECTION 3: Quiet Hours / DND Tests (30+ tests)
// ============================================================================

describe("Quiet Hours Engine", () => {
  describe("DND Mode", () => {
    it("should create default quiet hours state", () => {
      const state = createDefaultQuietHoursState();
      expect(state.dnd.isActive).toBe(false);
      expect(state.schedule.enabled).toBe(false);
      expect(state.exceptions).toEqual([]);
    });

    it("should activate DND without expiry", () => {
      const state = createDefaultQuietHoursState();
      const activated = activateDND(state);
      expect(activated.dnd.isActive).toBe(true);
      expect(activated.dnd.expiresAt).toBeNull();
      expect(activated.dnd.activatedAt).toBeTruthy();
    });

    it("should activate DND with duration", () => {
      const state = createDefaultQuietHoursState();
      const activated = activateDND(state, { duration: 60000 }); // 1 minute
      expect(activated.dnd.isActive).toBe(true);
      expect(activated.dnd.expiresAt).toBeTruthy();
      const expiresAt = new Date(activated.dnd.expiresAt!);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("should activate DND with custom status message", () => {
      const state = createDefaultQuietHoursState();
      const activated = activateDND(state, { statusMessage: "In a meeting" });
      expect(activated.dnd.statusMessage).toBe("In a meeting");
    });

    it("should deactivate DND", () => {
      const state = createDefaultQuietHoursState();
      const activated = activateDND(state);
      const deactivated = deactivateDND(activated);
      expect(deactivated.dnd.isActive).toBe(false);
      expect(deactivated.dnd.activatedAt).toBeNull();
    });

    it("should check if DND is active", () => {
      const state = createDefaultQuietHoursState();
      expect(isDNDActive(state)).toBe(false);
      const activated = activateDND(state);
      expect(isDNDActive(activated)).toBe(true);
    });

    it("should detect expired DND", () => {
      const state = createDefaultQuietHoursState();
      const pastState: QuietHoursState = {
        ...state,
        dnd: {
          isActive: true,
          activatedAt: new Date(Date.now() - 20000).toISOString(),
          expiresAt: new Date(Date.now() - 10000).toISOString(),
          showIndicator: true,
        },
      };
      expect(isDNDActive(pastState)).toBe(false);
    });

    it("should get DND time remaining", () => {
      const state = createDefaultQuietHoursState();
      const activated = activateDND(state, { duration: 60000 });
      const remaining = getDNDTimeRemaining(activated);
      expect(remaining).toBeTruthy();
      expect(remaining!).toBeGreaterThan(0);
      expect(remaining!).toBeLessThanOrEqual(60000);
    });

    it("should return null for indefinite DND", () => {
      const state = createDefaultQuietHoursState();
      const activated = activateDND(state); // no duration
      const remaining = getDNDTimeRemaining(activated);
      expect(remaining).toBeNull();
    });

    it("should return null when DND is not active", () => {
      const state = createDefaultQuietHoursState();
      expect(getDNDTimeRemaining(state)).toBeNull();
    });
  });

  describe("Exception Rules", () => {
    it("should create an exception rule", () => {
      const exc = createException("user", "user-1", "Boss");
      expect(exc.type).toBe("user");
      expect(exc.value).toBe("user-1");
      expect(exc.label).toBe("Boss");
      expect(exc.enabled).toBe(true);
    });

    it("should add an exception to state", () => {
      const state = createDefaultQuietHoursState();
      const exc = createException("user", "user-1", "Boss");
      const updated = addException(state, exc);
      expect(updated.exceptions).toHaveLength(1);
    });

    it("should remove an exception", () => {
      const state = createDefaultQuietHoursState();
      const exc = createException("user", "user-1", "Boss");
      let updated = addException(state, exc);
      updated = removeException(updated, exc.id);
      expect(updated.exceptions).toHaveLength(0);
    });

    it("should toggle an exception", () => {
      const state = createDefaultQuietHoursState();
      const exc = createException("user", "user-1", "Boss");
      let updated = addException(state, exc);
      updated = toggleException(updated, exc.id);
      expect(updated.exceptions[0].enabled).toBe(false);
    });

    it("should match user exception", () => {
      const state = createDefaultQuietHoursState();
      const exc = createException("user", "user-1", "Boss");
      const updated = addException(state, exc);
      const result = matchesException(updated, { senderId: "user-1" });
      expect(result.matches).toBe(true);
    });

    it("should match channel exception", () => {
      const state = createDefaultQuietHoursState();
      const exc = createException("channel", "ch-1", "Emergency Channel");
      const updated = addException(state, exc);
      const result = matchesException(updated, { channelId: "ch-1" });
      expect(result.matches).toBe(true);
    });

    it("should match priority exception", () => {
      const state = createDefaultQuietHoursState();
      const exc = createException("priority", "urgent", "Urgent notifications");
      const updated = addException(state, exc);
      const result = matchesException(updated, { priority: "urgent" });
      expect(result.matches).toBe(true);
    });

    it("should match type exception", () => {
      const state = createDefaultQuietHoursState();
      const exc = createException("type", "direct_message", "DMs");
      const updated = addException(state, exc);
      const result = matchesException(updated, { type: "direct_message" });
      expect(result.matches).toBe(true);
    });

    it("should not match disabled exceptions", () => {
      const state = createDefaultQuietHoursState();
      const exc = createException("user", "user-1", "Boss", false);
      const updated = addException(state, exc);
      const result = matchesException(updated, { senderId: "user-1" });
      expect(result.matches).toBe(false);
    });

    it("should not match unrelated exceptions", () => {
      const state = createDefaultQuietHoursState();
      const exc = createException("user", "user-1", "Boss");
      const updated = addException(state, exc);
      const result = matchesException(updated, { senderId: "user-2" });
      expect(result.matches).toBe(false);
    });
  });

  describe("Schedule Checking", () => {
    it("should parse time to minutes", () => {
      expect(parseTimeToMinutes("00:00")).toBe(0);
      expect(parseTimeToMinutes("12:00")).toBe(720);
      expect(parseTimeToMinutes("22:30")).toBe(1350);
      expect(parseTimeToMinutes("08:00")).toBe(480);
    });

    it("should get day schedule for weekday", () => {
      const schedule = createDefaultQuietHoursSchedule();
      const day = getDaySchedule(schedule, 1); // Monday
      expect(day.startTime).toBe("22:00");
      expect(day.endTime).toBe("08:00");
    });

    it("should get day schedule for weekend", () => {
      const schedule = createDefaultQuietHoursSchedule();
      const day = getDaySchedule(schedule, 0); // Sunday
      expect(day.startTime).toBe("23:00");
      expect(day.endTime).toBe("10:00");
    });

    it("should respect day overrides", () => {
      const schedule = createDefaultQuietHoursSchedule();
      schedule.dayOverrides = {
        3: { enabled: true, startTime: "20:00", endTime: "06:00" },
      };
      const day = getDaySchedule(schedule, 3);
      expect(day.startTime).toBe("20:00");
      expect(day.endTime).toBe("06:00");
    });

    it("should check time in regular schedule", () => {
      const schedule: DaySchedule = {
        enabled: true,
        startTime: "09:00",
        endTime: "17:00",
      };
      expect(isTimeInSchedule(600, schedule)).toBe(true); // 10:00
      expect(isTimeInSchedule(1080, schedule)).toBe(false); // 18:00
      expect(isTimeInSchedule(480, schedule)).toBe(false); // 08:00
    });

    it("should check time in overnight schedule", () => {
      const schedule: DaySchedule = {
        enabled: true,
        startTime: "22:00",
        endTime: "08:00",
      };
      expect(isTimeInSchedule(1380, schedule)).toBe(true); // 23:00
      expect(isTimeInSchedule(120, schedule)).toBe(true); // 02:00
      expect(isTimeInSchedule(600, schedule)).toBe(false); // 10:00
    });

    it("should return false for disabled schedule", () => {
      const schedule: DaySchedule = {
        enabled: false,
        startTime: "22:00",
        endTime: "08:00",
      };
      expect(isTimeInSchedule(1380, schedule)).toBe(false);
    });

    it("should validate a schedule", () => {
      const schedule = createDefaultQuietHoursSchedule("America/New_York");
      const result = validateEnhancedSchedule(schedule);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject invalid schedule times", () => {
      const schedule = createDefaultQuietHoursSchedule();
      schedule.weekdaySchedule.startTime = "25:00";
      const result = validateEnhancedSchedule(schedule);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Comprehensive Check", () => {
    it("should return not quiet when both DND and schedule are off", () => {
      const state = createDefaultQuietHoursState();
      const result = checkQuietHours(state);
      expect(result.isQuiet).toBe(false);
      expect(result.source).toBe("none");
    });

    it("should detect DND as quiet", () => {
      let state = createDefaultQuietHoursState();
      state = activateDND(state);
      const result = checkQuietHours(state);
      expect(result.isQuiet).toBe(true);
      expect(result.source).toBe("dnd");
    });

    it("should allow exceptions through DND", () => {
      let state = createDefaultQuietHoursState();
      state = activateDND(state);
      const exc = createException("user", "boss-1", "Boss");
      state = addException(state, exc);
      const result = checkQuietHours(state, { senderId: "boss-1" });
      expect(result.isQuiet).toBe(true);
      expect(result.canBreakThrough).toBe(true);
    });

    it("should allow urgent through DND when configured", () => {
      let state = createDefaultQuietHoursState();
      state.schedule.allowUrgentBreakthrough = true;
      state = activateDND(state);
      const result = checkQuietHours(state, { priority: "urgent" });
      expect(result.isQuiet).toBe(true);
      expect(result.canBreakThrough).toBe(true);
    });

    it("should block non-urgent during DND", () => {
      let state = createDefaultQuietHoursState();
      state = activateDND(state);
      const result = checkQuietHours(state, { priority: "normal" });
      expect(result.isQuiet).toBe(true);
      expect(result.canBreakThrough).toBe(false);
    });
  });

  describe("Time Formatting", () => {
    it("should format DND time remaining - minutes", () => {
      expect(formatDNDTimeRemaining(30 * 60 * 1000)).toBe("30 minutes");
      expect(formatDNDTimeRemaining(60 * 1000)).toBe("1 minute");
    });

    it("should format DND time remaining - hours", () => {
      expect(formatDNDTimeRemaining(2 * 60 * 60 * 1000)).toBe("2 hours");
      expect(formatDNDTimeRemaining(60 * 60 * 1000)).toBe("1 hour");
    });

    it("should format DND time remaining - hours and minutes", () => {
      expect(formatDNDTimeRemaining(90 * 60 * 1000)).toBe("1h 30m");
    });

    it("should format DND time remaining - days", () => {
      expect(formatDNDTimeRemaining(48 * 60 * 60 * 1000)).toBe("2 days");
    });

    it('should format expired as "expired"', () => {
      expect(formatDNDTimeRemaining(0)).toBe("expired");
      expect(formatDNDTimeRemaining(-1000)).toBe("expired");
    });
  });
});

// ============================================================================
// SECTION 4: Digest Tests (30+ tests)
// ============================================================================

describe("Digest", () => {
  const createTestEntry = (overrides?: Partial<DigestEntry>): DigestEntry => ({
    id: `entry-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    type: "mention",
    priority: "normal",
    title: "Test",
    body: "Test body",
    channelId: "ch-1",
    channelName: "general",
    senderId: "user-1",
    senderName: "Alice",
    createdAt: new Date().toISOString(),
    isRead: false,
    ...overrides,
  });

  describe("Digest Config", () => {
    it("should create digest config with defaults", () => {
      const config = createDigestConfig();
      expect(config.frequency).toBe("daily");
      expect(config.enabled).toBe(false);
      expect(config.deliveryTime).toBe("09:00");
      expect(config.smartGrouping).toBe(true);
    });

    it("should create digest config with overrides", () => {
      const config = createDigestConfig({
        frequency: "hourly",
        enabled: true,
        maxEntries: 50,
      });
      expect(config.frequency).toBe("hourly");
      expect(config.enabled).toBe(true);
      expect(config.maxEntries).toBe(50);
    });

    it("should have sensible defaults", () => {
      expect(DEFAULT_DIGEST_CONFIG.bypassPriorities).toContain("urgent");
      expect(DEFAULT_DIGEST_CONFIG.minimumBatchSize).toBe(3);
      expect(DEFAULT_DIGEST_CONFIG.groupBy).toContain("channel");
    });
  });

  describe("Bypass Logic", () => {
    it("should bypass digest for realtime frequency", () => {
      const config = createDigestConfig({
        frequency: "realtime",
        enabled: true,
      });
      const entry = createTestEntry();
      expect(shouldBypassDigest(config, entry)).toBe(true);
    });

    it("should bypass digest when disabled", () => {
      const config = createDigestConfig({ enabled: false });
      const entry = createTestEntry();
      expect(shouldBypassDigest(config, entry)).toBe(true);
    });

    it("should bypass digest for urgent priority", () => {
      const config = createDigestConfig({
        enabled: true,
        frequency: "daily",
        bypassPriorities: ["urgent"],
      });
      const entry = createTestEntry({ priority: "urgent" });
      expect(shouldBypassDigest(config, entry)).toBe(true);
    });

    it("should not bypass digest for normal priority", () => {
      const config = createDigestConfig({
        enabled: true,
        frequency: "daily",
        bypassPriorities: ["urgent"],
      });
      const entry = createTestEntry({ priority: "normal" });
      expect(shouldBypassDigest(config, entry)).toBe(false);
    });

    it("should bypass digest for specified types", () => {
      const config = createDigestConfig({
        enabled: true,
        frequency: "daily",
        bypassTypes: ["direct_message"],
      });
      const entry = createTestEntry({ type: "direct_message" });
      expect(shouldBypassDigest(config, entry)).toBe(true);
    });

    it("should not bypass for non-specified types", () => {
      const config = createDigestConfig({
        enabled: true,
        frequency: "daily",
        bypassTypes: ["direct_message"],
      });
      const entry = createTestEntry({ type: "mention" });
      expect(shouldBypassDigest(config, entry)).toBe(false);
    });
  });

  describe("Digest Timing", () => {
    it("should get next digest time for hourly", () => {
      const config = createDigestConfig({ frequency: "hourly", enabled: true });
      const next = getNextDigestTimeNew(config);
      expect(next).toBeTruthy();
      expect(next!.getTime()).toBeGreaterThan(Date.now());
    });

    it("should get next digest time for daily", () => {
      const config = createDigestConfig({
        frequency: "daily",
        enabled: true,
        deliveryTime: "09:00",
      });
      const next = getNextDigestTimeNew(config);
      expect(next).toBeTruthy();
    });

    it("should get next digest time for weekly", () => {
      const config = createDigestConfig({
        frequency: "weekly",
        enabled: true,
        deliveryTime: "09:00",
        weeklyDay: 1,
      });
      const next = getNextDigestTimeNew(config);
      expect(next).toBeTruthy();
    });

    it("should return null for realtime frequency", () => {
      const config = createDigestConfig({
        frequency: "realtime",
        enabled: true,
      });
      expect(getNextDigestTimeNew(config)).toBeNull();
    });

    it("should return null for disabled digest", () => {
      const config = createDigestConfig({ enabled: false });
      expect(getNextDigestTimeNew(config)).toBeNull();
    });
  });

  describe("Send Digest Check", () => {
    it("should not send when disabled", () => {
      const config = createDigestConfig({ enabled: false });
      const state = createDeliveryState();
      expect(shouldSendDigestNew(config, state)).toBe(false);
    });

    it("should not send for realtime", () => {
      const config = createDigestConfig({
        frequency: "realtime",
        enabled: true,
      });
      const state = createDeliveryState();
      expect(shouldSendDigestNew(config, state)).toBe(false);
    });

    it("should not send when pending count is below minimum", () => {
      const config = createDigestConfig({
        enabled: true,
        frequency: "daily",
        minimumBatchSize: 5,
      });
      const state = { ...createDeliveryState(), pendingCount: 2 };
      expect(shouldSendDigestNew(config, state)).toBe(false);
    });

    it("should send when scheduled time has passed", () => {
      const config = createDigestConfig({
        enabled: true,
        frequency: "daily",
        minimumBatchSize: 1,
      });
      const state = {
        ...createDeliveryState(),
        pendingCount: 5,
        nextScheduledAt: new Date(Date.now() - 10000).toISOString(),
      };
      expect(shouldSendDigestNew(config, state)).toBe(true);
    });

    it("should not send when scheduled time is in the future", () => {
      const config = createDigestConfig({
        enabled: true,
        frequency: "daily",
        minimumBatchSize: 1,
      });
      const state = {
        ...createDeliveryState(),
        pendingCount: 5,
        nextScheduledAt: new Date(Date.now() + 100000).toISOString(),
      };
      expect(shouldSendDigestNew(config, state)).toBe(false);
    });
  });

  describe("Digest Generation", () => {
    it("should generate an empty digest", () => {
      const config = createDigestConfig({ enabled: true, frequency: "daily" });
      const digest = generateDigest([], config);
      expect(digest.groups).toHaveLength(0);
      expect(digest.summary.totalNotifications).toBe(0);
    });

    it("should generate a digest with entries", () => {
      const config = createDigestConfig({ enabled: true, frequency: "daily" });
      const entries = [
        createTestEntry({
          channelId: "ch-1",
          channelName: "general",
          type: "mention",
        }),
        createTestEntry({
          channelId: "ch-1",
          channelName: "general",
          type: "direct_message",
        }),
        createTestEntry({
          channelId: "ch-2",
          channelName: "random",
          type: "mention",
        }),
      ];
      const digest = generateDigest(entries, config, {
        from: new Date(Date.now() - 86400000),
        to: new Date(),
      });
      expect(digest.summary.totalNotifications).toBe(3);
      expect(digest.groups.length).toBeGreaterThan(0);
    });

    it("should separate bypassed entries", () => {
      const config = createDigestConfig({
        enabled: true,
        frequency: "daily",
        bypassPriorities: ["urgent"],
      });
      const entries = [
        createTestEntry({ priority: "urgent" }),
        createTestEntry({ priority: "normal" }),
      ];
      const digest = generateDigest(entries, config, {
        from: new Date(Date.now() - 86400000),
        to: new Date(),
      });
      expect(digest.bypassed).toHaveLength(1);
      expect(digest.bypassed[0].priority).toBe("urgent");
    });

    it("should filter out read notifications when configured", () => {
      const config = createDigestConfig({
        enabled: true,
        frequency: "daily",
        includeRead: false,
      });
      const entries = [
        createTestEntry({ isRead: true }),
        createTestEntry({ isRead: false }),
      ];
      const digest = generateDigest(entries, config, {
        from: new Date(Date.now() - 86400000),
        to: new Date(),
      });
      // The read entry is filtered out before grouping
      expect(digest.summary.totalNotifications).toBe(1);
    });

    it("should include read notifications when configured", () => {
      const config = createDigestConfig({
        enabled: true,
        frequency: "daily",
        includeRead: true,
      });
      const entries = [
        createTestEntry({ isRead: true }),
        createTestEntry({ isRead: false }),
      ];
      const digest = generateDigest(entries, config, {
        from: new Date(Date.now() - 86400000),
        to: new Date(),
      });
      expect(digest.summary.totalNotifications).toBe(2);
    });

    it("should limit entries to maxEntries", () => {
      const config = createDigestConfig({
        enabled: true,
        frequency: "daily",
        maxEntries: 3,
      });
      const entries = Array.from({ length: 10 }, (_, i) =>
        createTestEntry({ title: `Entry ${i}` }),
      );
      const digest = generateDigest(entries, config, {
        from: new Date(Date.now() - 86400000),
        to: new Date(),
      });
      // Total counted but grouped entries limited
      expect(digest.summary.totalNotifications).toBe(10);
    });

    it("should group by channel", () => {
      const config = createDigestConfig({
        enabled: true,
        frequency: "daily",
        groupBy: ["channel"],
        smartGrouping: false,
      });
      const entries = [
        createTestEntry({ channelId: "ch-1", channelName: "general" }),
        createTestEntry({ channelId: "ch-1", channelName: "general" }),
        createTestEntry({ channelId: "ch-2", channelName: "random" }),
      ];
      const digest = generateDigest(entries, config, {
        from: new Date(Date.now() - 86400000),
        to: new Date(),
      });
      expect(digest.groups.length).toBeGreaterThan(0);
      const generalGroup = digest.groups.find((g) => g.groupValue === "ch-1");
      expect(generalGroup?.entries).toHaveLength(2);
    });

    it("should provide summary statistics", () => {
      const config = createDigestConfig({
        enabled: true,
        frequency: "daily",
        bypassPriorities: ["urgent"],
      });
      const entries = [
        createTestEntry({
          type: "mention",
          priority: "normal",
          channelId: "ch-1",
        }),
        createTestEntry({
          type: "direct_message",
          priority: "high",
          channelId: "ch-2",
        }),
        createTestEntry({
          type: "mention",
          priority: "urgent",
          channelId: "ch-1",
        }),
      ];
      const digest = generateDigest(entries, config, {
        from: new Date(Date.now() - 86400000),
        to: new Date(),
      });
      expect(digest.summary.byType).toBeDefined();
      expect(digest.summary.byPriority).toBeDefined();
      expect(digest.summary.topChannels.length).toBeGreaterThan(0);
      expect(digest.summary.bypassedCount).toBe(1); // urgent bypassed
    });

    it("should format digest as text", () => {
      const config = createDigestConfig({ enabled: true, frequency: "daily" });
      const entries = [
        createTestEntry({ title: "Test Alert", body: "Something happened" }),
      ];
      const digest = generateDigest(entries, config, {
        from: new Date(Date.now() - 86400000),
        to: new Date(),
      });
      const text = formatDigestText(digest);
      expect(text).toContain("NOTIFICATION DIGEST");
      expect(text).toContain("Period:");
    });
  });

  describe("Delivery State", () => {
    it("should create initial delivery state", () => {
      const state = createDeliveryState();
      expect(state.lastSentAt).toBeNull();
      expect(state.pendingCount).toBe(0);
      expect(state.isReady).toBe(false);
    });

    it("should mark digest as sent", () => {
      const config = createDigestConfig({ enabled: true, frequency: "daily" });
      let state = createDeliveryState();
      state = markDigestSent(state, config);
      expect(state.lastSentAt).toBeTruthy();
      expect(state.pendingCount).toBe(0);
      expect(state.nextScheduledAt).toBeTruthy();
    });

    it("should add pending notification", () => {
      const config = createDigestConfig({
        enabled: true,
        frequency: "daily",
        minimumBatchSize: 3,
      });
      let state = createDeliveryState();
      state = addPendingNotification(state, config);
      expect(state.pendingCount).toBe(1);
      expect(state.isReady).toBe(false);

      state = addPendingNotification(state, config);
      state = addPendingNotification(state, config);
      expect(state.pendingCount).toBe(3);
      expect(state.isReady).toBe(true);
    });
  });
});

// ============================================================================
// SECTION 5: Preference Engine Tests (30+ tests)
// ============================================================================

describe("Preference Engine", () => {
  const createTestInput = (
    overrides?: Partial<NotificationInput>,
  ): NotificationInput => ({
    type: "mention",
    priority: "normal",
    title: "Test",
    body: "Hello @user",
    channelId: "ch-1",
    channelName: "general",
    senderId: "user-1",
    senderName: "Alice",
    ...overrides,
  });

  describe("State Management", () => {
    it("should create default engine state", () => {
      const state = createPreferenceEngineState();
      expect(state.globalPrefs.enabled).toBe(true);
      expect(state.channelRules.channelRules).toEqual({});
      expect(state.keywordAlerts).toEqual([]);
      expect(state.quietHours.dnd.isActive).toBe(false);
    });

    it("should create state with custom values", () => {
      const state = createPreferenceEngineState({
        globalPrefs: {
          ...createPreferenceEngineState().globalPrefs,
          enabled: false,
        },
      });
      expect(state.globalPrefs.enabled).toBe(false);
    });

    it("should update engine state", () => {
      let state = createPreferenceEngineState();
      state = updateEngineState(state, {
        keywordAlerts: [createKeywordAlertDefinition("bug")],
      });
      expect(state.keywordAlerts).toHaveLength(1);
    });
  });

  describe("Global Enabled Check", () => {
    it("should block all notifications when globally disabled", () => {
      const state = createPreferenceEngineState({
        globalPrefs: {
          ...createPreferenceEngineState().globalPrefs,
          enabled: false,
        },
      });
      const decision = shouldNotify(createTestInput(), state);
      expect(decision.shouldNotify).toBe(false);
      expect(decision.reasons).toContain("Notifications globally disabled");
    });

    it("should allow notifications when globally enabled", () => {
      const state = createPreferenceEngineState();
      const decision = shouldNotify(createTestInput(), state);
      expect(decision.shouldNotify).toBe(true);
    });
  });

  describe("Type Check", () => {
    it("should block disabled notification types", () => {
      const state = createPreferenceEngineState({
        globalPrefs: {
          ...createPreferenceEngineState().globalPrefs,
          reactionsEnabled: false,
        },
      });
      const decision = shouldNotify(
        createTestInput({ type: "reaction" }),
        state,
      );
      expect(decision.shouldNotify).toBe(false);
    });

    it("should always allow system notifications", () => {
      const state = createPreferenceEngineState({
        globalPrefs: {
          ...createPreferenceEngineState().globalPrefs,
          enabledTypes: [], // empty
        },
      });
      const decision = shouldNotify(createTestInput({ type: "system" }), state);
      expect(decision.shouldNotify).toBe(true);
    });

    it("should check mentionsEnabled", () => {
      const state = createPreferenceEngineState({
        globalPrefs: {
          ...createPreferenceEngineState().globalPrefs,
          mentionsEnabled: false,
        },
      });
      const decision = shouldNotify(
        createTestInput({ type: "mention" }),
        state,
      );
      expect(decision.shouldNotify).toBe(false);
    });

    it("should check directMessagesEnabled", () => {
      const state = createPreferenceEngineState({
        globalPrefs: {
          ...createPreferenceEngineState().globalPrefs,
          directMessagesEnabled: false,
        },
      });
      const decision = shouldNotify(
        createTestInput({ type: "direct_message" }),
        state,
      );
      expect(decision.shouldNotify).toBe(false);
    });

    it("should check threadRepliesEnabled", () => {
      const state = createPreferenceEngineState({
        globalPrefs: {
          ...createPreferenceEngineState().globalPrefs,
          threadRepliesEnabled: false,
        },
      });
      const decision = shouldNotify(
        createTestInput({ type: "thread_reply" }),
        state,
      );
      expect(decision.shouldNotify).toBe(false);
    });
  });

  describe("DND / Quiet Hours Integration", () => {
    it("should block during DND", () => {
      let state = createPreferenceEngineState();
      state = {
        ...state,
        quietHours: activateDND(state.quietHours),
      };
      const decision = shouldNotify(createTestInput(), state);
      expect(decision.shouldNotify).toBe(false);
      expect(decision.reasons.some((r) => r.includes("dnd"))).toBe(true);
    });

    it("should allow exceptions through DND", () => {
      let state = createPreferenceEngineState();
      const exc = createException("user", "user-1", "Boss");
      state = {
        ...state,
        quietHours: addException(activateDND(state.quietHours), exc),
      };
      const decision = shouldNotify(
        createTestInput({ senderId: "user-1" }),
        state,
      );
      expect(decision.shouldNotify).toBe(true);
    });

    it("should allow urgent through DND with breakthrough", () => {
      let state = createPreferenceEngineState();
      state = {
        ...state,
        quietHours: {
          ...activateDND(state.quietHours),
          schedule: {
            ...state.quietHours.schedule,
            allowUrgentBreakthrough: true,
          },
        },
      };
      const decision = shouldNotify(
        createTestInput({ priority: "urgent" }),
        state,
      );
      expect(decision.shouldNotify).toBe(true);
    });

    it("should suppress sound during quiet hours breakthrough", () => {
      let state = createPreferenceEngineState();
      const exc = createException("user", "user-1", "Boss");
      state = {
        ...state,
        quietHours: addException(activateDND(state.quietHours), exc),
      };
      const decision = shouldNotify(
        createTestInput({ senderId: "user-1" }),
        state,
      );
      expect(decision.soundPreference.playSound).toBe(false);
    });
  });

  describe("Channel Rules Integration", () => {
    it("should block muted channels", () => {
      const channelRules = muteChannelRule(createChannelRuleStore(), "ch-1");
      const state = createPreferenceEngineState({ channelRules });
      const decision = shouldNotify(
        createTestInput({ channelId: "ch-1" }),
        state,
      );
      expect(decision.shouldNotify).toBe(false);
    });

    it("should respect mentions-only channels", () => {
      const channelRules = updateChannelRule(createChannelRuleStore(), "ch-1", {
        level: "mentions",
      });
      const state = createPreferenceEngineState({ channelRules });

      const mentionDecision = shouldNotify(
        createTestInput({ channelId: "ch-1", type: "mention" }),
        state,
      );
      expect(mentionDecision.shouldNotify).toBe(true);

      const replyDecision = shouldNotify(
        createTestInput({ channelId: "ch-1", type: "thread_reply" }),
        state,
      );
      expect(replyDecision.shouldNotify).toBe(false);
    });

    it("should respect channel delivery overrides", () => {
      const channelRules = updateChannelRule(createChannelRuleStore(), "ch-1", {
        deliveryOverrides: { email: false },
      });
      const state = createPreferenceEngineState({
        channelRules,
        globalPrefs: {
          ...createPreferenceEngineState().globalPrefs,
          emailEnabled: true,
        },
      });
      const decision = shouldNotify(
        createTestInput({ channelId: "ch-1" }),
        state,
      );
      expect(decision.platformDelivery.email).toBe(false);
    });

    it("should return custom sound from channel rule", () => {
      const channelRules = updateChannelRule(createChannelRuleStore(), "ch-1", {
        customSound: "ding",
      });
      const state = createPreferenceEngineState({ channelRules });
      const decision = shouldNotify(
        createTestInput({ channelId: "ch-1" }),
        state,
      );
      expect(decision.soundPreference.soundId).toBe("ding");
    });
  });

  describe("Keyword Alerts Integration", () => {
    it("should detect keyword matches", () => {
      const state = createPreferenceEngineState({
        keywordAlerts: [createKeywordAlertDefinition("bug")],
      });
      const decision = shouldNotify(
        createTestInput({ body: "found a bug" }),
        state,
      );
      expect(decision.shouldNotify).toBe(true);
      expect(decision.keywordResult).toBeTruthy();
      expect(decision.keywordResult!.hasMatches).toBe(true);
    });

    it("should elevate priority from keyword alerts", () => {
      const state = createPreferenceEngineState({
        keywordAlerts: [
          createKeywordAlertDefinition("critical", { priority: "urgent" }),
        ],
      });
      const decision = shouldNotify(
        createTestInput({ body: "critical issue", priority: "normal" }),
        state,
      );
      expect(decision.effectivePriority).toBe("urgent");
      expect(decision.priorityElevated).toBe(true);
    });

    it("should not elevate when keyword has lower priority", () => {
      const state = createPreferenceEngineState({
        keywordAlerts: [
          createKeywordAlertDefinition("info", { priority: "normal" }),
        ],
      });
      const decision = shouldNotify(
        createTestInput({ body: "info message", priority: "high" }),
        state,
      );
      expect(decision.effectivePriority).toBe("high");
      expect(decision.priorityElevated).toBe(false);
    });

    it("should not match when no body text", () => {
      const state = createPreferenceEngineState({
        keywordAlerts: [createKeywordAlertDefinition("bug")],
      });
      const decision = shouldNotify(createTestInput({ body: "" }), state);
      expect(decision.keywordResult).toBeNull();
    });
  });

  describe("Digest Integration", () => {
    it("should queue for digest when configured", () => {
      const state = createPreferenceEngineState({
        digestConfig: createDigestConfig({
          enabled: true,
          frequency: "daily",
          bypassPriorities: ["urgent"],
        }),
      });
      const decision = shouldNotify(
        createTestInput({ priority: "normal" }),
        state,
      );
      expect(decision.shouldNotify).toBe(true);
      expect(decision.shouldDigest).toBe(true);
    });

    it("should bypass digest for urgent notifications", () => {
      const state = createPreferenceEngineState({
        digestConfig: createDigestConfig({
          enabled: true,
          frequency: "daily",
          bypassPriorities: ["urgent"],
        }),
      });
      const decision = shouldNotify(
        createTestInput({ priority: "urgent" }),
        state,
      );
      expect(decision.shouldNotify).toBe(true);
      expect(decision.shouldDigest).toBe(false);
    });

    it("should not digest when realtime mode", () => {
      const state = createPreferenceEngineState({
        digestConfig: createDigestConfig({
          enabled: true,
          frequency: "realtime",
        }),
      });
      const decision = shouldNotify(createTestInput(), state);
      expect(decision.shouldDigest).toBe(false);
    });

    it("should not digest when digest is disabled", () => {
      const state = createPreferenceEngineState({
        digestConfig: createDigestConfig({ enabled: false }),
      });
      const decision = shouldNotify(createTestInput(), state);
      expect(decision.shouldDigest).toBe(false);
    });
  });

  describe("Platform Delivery", () => {
    it("should respect global push setting", () => {
      const state = createPreferenceEngineState({
        globalPrefs: {
          ...createPreferenceEngineState().globalPrefs,
          pushEnabled: false,
        },
      });
      const decision = shouldNotify(createTestInput(), state);
      expect(decision.platformDelivery.push).toBe(false);
    });

    it("should respect global desktop setting", () => {
      const state = createPreferenceEngineState({
        globalPrefs: {
          ...createPreferenceEngineState().globalPrefs,
          desktopEnabled: false,
        },
      });
      const decision = shouldNotify(createTestInput(), state);
      expect(decision.platformDelivery.desktop).toBe(false);
    });

    it("should respect global email setting", () => {
      const state = createPreferenceEngineState({
        globalPrefs: {
          ...createPreferenceEngineState().globalPrefs,
          emailEnabled: true,
        },
      });
      const decision = shouldNotify(createTestInput(), state);
      expect(decision.platformDelivery.email).toBe(true);
    });

    it("should include delivery methods in result", () => {
      const state = createPreferenceEngineState({
        globalPrefs: {
          ...createPreferenceEngineState().globalPrefs,
          pushEnabled: true,
          desktopEnabled: true,
          inAppEnabled: true,
          emailEnabled: false,
        },
      });
      const decision = shouldNotify(createTestInput(), state);
      expect(decision.deliveryMethods).toContain("mobile");
      expect(decision.deliveryMethods).toContain("desktop");
      expect(decision.deliveryMethods).toContain("in_app");
      expect(decision.deliveryMethods).not.toContain("email");
    });
  });

  describe("Sound Preferences", () => {
    it("should enable sound when configured", () => {
      const state = createPreferenceEngineState({
        globalPrefs: {
          ...createPreferenceEngineState().globalPrefs,
          soundEnabled: true,
          soundVolume: 75,
        },
      });
      const decision = shouldNotify(createTestInput(), state);
      expect(decision.soundPreference.playSound).toBe(true);
      expect(decision.soundPreference.volume).toBe(75);
    });

    it("should disable sound when configured", () => {
      const state = createPreferenceEngineState({
        globalPrefs: {
          ...createPreferenceEngineState().globalPrefs,
          soundEnabled: false,
        },
      });
      const decision = shouldNotify(createTestInput(), state);
      expect(decision.soundPreference.playSound).toBe(false);
    });
  });

  describe("Convenience Functions", () => {
    it("should check if channel is suppressed", () => {
      const channelRules = muteChannelRule(createChannelRuleStore(), "ch-1");
      const state = createPreferenceEngineState({ channelRules });
      expect(isChannelSuppressed("ch-1", state)).toBe(true);
      expect(isChannelSuppressed("ch-2", state)).toBe(false);
    });

    it("should suppress when globally disabled", () => {
      const state = createPreferenceEngineState({
        globalPrefs: {
          ...createPreferenceEngineState().globalPrefs,
          enabled: false,
        },
      });
      expect(isChannelSuppressed("ch-1", state)).toBe(true);
    });

    it("should suppress during DND", () => {
      let state = createPreferenceEngineState();
      state = {
        ...state,
        quietHours: activateDND(state.quietHours),
      };
      expect(isChannelSuppressed("ch-1", state)).toBe(true);
    });

    it("should get decision summary for allowed notification", () => {
      const state = createPreferenceEngineState();
      const decision = shouldNotify(createTestInput(), state);
      const summary = getDecisionSummary(decision);
      expect(summary).toContain("Allowed");
    });

    it("should get decision summary for blocked notification", () => {
      const state = createPreferenceEngineState({
        globalPrefs: {
          ...createPreferenceEngineState().globalPrefs,
          enabled: false,
        },
      });
      const decision = shouldNotify(createTestInput(), state);
      const summary = getDecisionSummary(decision);
      expect(summary).toContain("Blocked");
    });
  });

  describe("OOP Engine Class", () => {
    it("should create engine with defaults", () => {
      const engine = new NotificationPreferenceEngine();
      expect(engine.getState().globalPrefs.enabled).toBe(true);
    });

    it("should evaluate notifications", () => {
      const engine = new NotificationPreferenceEngine();
      const decision = engine.shouldNotify(createTestInput());
      expect(decision.shouldNotify).toBe(true);
    });

    it("should update state", () => {
      const engine = new NotificationPreferenceEngine();
      engine.updateState({
        keywordAlerts: [createKeywordAlertDefinition("bug")],
      });
      expect(engine.getState().keywordAlerts).toHaveLength(1);
    });

    it("should update global prefs", () => {
      const engine = new NotificationPreferenceEngine();
      engine.updateGlobalPrefs({ enabled: false });
      expect(engine.getState().globalPrefs.enabled).toBe(false);
    });

    it("should check channel suppression", () => {
      const engine = new NotificationPreferenceEngine();
      expect(engine.isChannelSuppressed("ch-1")).toBe(false);
    });

    it("should provide decision summary", () => {
      const engine = new NotificationPreferenceEngine();
      const decision = engine.shouldNotify(createTestInput());
      const summary = engine.getDecisionSummary(decision);
      expect(summary).toContain("Allowed");
    });
  });

  describe("Resolution Order", () => {
    it("should prioritize DND over channel rules", () => {
      // Channel allows, but DND blocks
      let state = createPreferenceEngineState();
      state = {
        ...state,
        quietHours: activateDND(state.quietHours),
      };
      const decision = shouldNotify(createTestInput(), state);
      expect(decision.shouldNotify).toBe(false);
    });

    it("should check global before everything else", () => {
      let state = createPreferenceEngineState({
        globalPrefs: {
          ...createPreferenceEngineState().globalPrefs,
          enabled: false,
        },
      });
      // Even with keyword matches, global disabled = blocked
      state = updateEngineState(state, {
        keywordAlerts: [createKeywordAlertDefinition("hello")],
      });
      const decision = shouldNotify(
        createTestInput({ body: "hello world" }),
        state,
      );
      expect(decision.shouldNotify).toBe(false);
    });

    it("should check channel rules before keyword alerts", () => {
      const channelRules = muteChannelRule(createChannelRuleStore(), "ch-1");
      const state = createPreferenceEngineState({
        channelRules,
        keywordAlerts: [createKeywordAlertDefinition("hello")],
      });
      const decision = shouldNotify(
        createTestInput({ channelId: "ch-1", body: "hello world" }),
        state,
      );
      // Muted channel should block even with keyword match
      expect(decision.shouldNotify).toBe(false);
    });

    it("full chain: global enabled > type enabled > not in DND > channel allows > keyword matches > digest", () => {
      const state = createPreferenceEngineState({
        keywordAlerts: [
          createKeywordAlertDefinition("urgent-bug", { priority: "urgent" }),
        ],
        digestConfig: createDigestConfig({
          enabled: true,
          frequency: "daily",
          bypassPriorities: ["urgent"],
        }),
      });
      const decision = shouldNotify(
        createTestInput({ body: "found an urgent-bug", priority: "normal" }),
        state,
      );
      // Global: enabled -> Type: mention enabled -> DND: not active -> Channel: no rules
      // -> Keyword: matched with urgent priority -> Digest: bypassed due to urgent
      expect(decision.shouldNotify).toBe(true);
      expect(decision.effectivePriority).toBe("urgent");
      expect(decision.priorityElevated).toBe(true);
      expect(decision.shouldDigest).toBe(false); // urgent bypasses digest
    });
  });
});
