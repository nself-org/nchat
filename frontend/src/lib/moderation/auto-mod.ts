/**
 * Auto Moderation - Automatic moderation rule engine
 *
 * Provides automated moderation with rule-based actions, escalation, and triggers
 */

import {
  ContentFilter,
  FilterResult,
  createContentFilter,
} from "./content-filter";

// ============================================================================
// Types
// ============================================================================

export type AutoModAction =
  | "warn"
  | "mute"
  | "kick"
  | "ban"
  | "delete"
  | "flag"
  | "log";
export type AutoModTrigger =
  | "content"
  | "spam"
  | "mention"
  | "attachment"
  | "join"
  | "custom";
export type RulePriority = "low" | "medium" | "high" | "critical";

export interface AutoModCondition {
  type:
    | "content_match"
    | "user_role"
    | "channel_type"
    | "message_count"
    | "account_age"
    | "custom";
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "greater_than"
    | "less_than"
    | "matches";
  value: string | number | boolean | string[];
  negate?: boolean;
}

export interface AutoModRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: AutoModTrigger;
  conditions: AutoModCondition[];
  conditionLogic: "and" | "or";
  actions: AutoModActionConfig[];
  priority: RulePriority;
  cooldownMs?: number;
  maxTriggersPerHour?: number;
  exemptRoles?: string[];
  exemptUsers?: string[];
  exemptChannels?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AutoModActionConfig {
  action: AutoModAction;
  reason?: string;
  durationMs?: number;
  notifyUser?: boolean;
  notifyModerators?: boolean;
  logChannel?: string;
  customData?: Record<string, unknown>;
}

export interface AutoModContext {
  userId: string;
  userName?: string;
  userRole?: string;
  channelId?: string;
  channelType?: string;
  messageId?: string;
  content?: string;
  attachments?: string[];
  mentions?: string[];
  accountAgeMs?: number;
  messageCount?: number;
  customData?: Record<string, unknown>;
}

export interface AutoModResult {
  triggered: boolean;
  matchedRules: AutoModRuleMatch[];
  actions: AutoModActionResult[];
  shouldBlock: boolean;
  modifiedContent?: string;
}

export interface AutoModRuleMatch {
  ruleId: string;
  ruleName: string;
  trigger: AutoModTrigger;
  matchedConditions: string[];
  priority: RulePriority;
  timestamp: string;
}

export interface AutoModActionResult {
  action: AutoModAction;
  success: boolean;
  reason?: string;
  durationMs?: number;
  error?: string;
}

export interface EscalationConfig {
  enabled: boolean;
  thresholds: EscalationThreshold[];
  resetAfterMs: number;
}

export interface EscalationThreshold {
  warningCount: number;
  action: AutoModAction;
  durationMs?: number;
  reason?: string;
}

export interface UserViolationRecord {
  userId: string;
  violations: ViolationEntry[];
  totalWarnings: number;
  currentLevel: number;
  lastViolationAt: string | null;
}

export interface ViolationEntry {
  id: string;
  ruleId: string;
  ruleName: string;
  action: AutoModAction;
  reason?: string;
  timestamp: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface AutoModConfig {
  enabled: boolean;
  rules: AutoModRule[];
  escalation: EscalationConfig;
  globalExemptRoles: string[];
  globalExemptUsers: string[];
  defaultCooldownMs: number;
  maxActionsPerMessage: number;
}

// ============================================================================
// Default Configurations
// ============================================================================

export const DEFAULT_ESCALATION_CONFIG: EscalationConfig = {
  enabled: true,
  thresholds: [
    { warningCount: 1, action: "warn", reason: "First warning" },
    {
      warningCount: 3,
      action: "mute",
      durationMs: 300000,
      reason: "Multiple warnings - 5 minute mute",
    },
    {
      warningCount: 5,
      action: "mute",
      durationMs: 3600000,
      reason: "Repeated violations - 1 hour mute",
    },
    {
      warningCount: 10,
      action: "ban",
      durationMs: 86400000,
      reason: "Severe violations - 24 hour ban",
    },
  ],
  resetAfterMs: 604800000, // 1 week
};

export const DEFAULT_AUTOMOD_CONFIG: AutoModConfig = {
  enabled: true,
  rules: [],
  escalation: DEFAULT_ESCALATION_CONFIG,
  globalExemptRoles: ["owner", "admin"],
  globalExemptUsers: [],
  defaultCooldownMs: 5000,
  maxActionsPerMessage: 3,
};

// ============================================================================
// Priority Weights
// ============================================================================

const PRIORITY_WEIGHTS: Record<RulePriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generates a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Checks if a value matches a condition
 */
export function evaluateCondition(
  condition: AutoModCondition,
  context: AutoModContext,
): boolean {
  let contextValue: unknown;

  switch (condition.type) {
    case "content_match":
      contextValue = context.content || "";
      break;
    case "user_role":
      contextValue = context.userRole || "";
      break;
    case "channel_type":
      contextValue = context.channelType || "";
      break;
    case "message_count":
      contextValue = context.messageCount || 0;
      break;
    case "account_age":
      contextValue = context.accountAgeMs || 0;
      break;
    case "custom":
      contextValue = context.customData?.[String(condition.value)] ?? "";
      break;
    default:
      return false;
  }

  let result: boolean;

  switch (condition.operator) {
    case "equals":
      result = contextValue === condition.value;
      break;
    case "not_equals":
      result = contextValue !== condition.value;
      break;
    case "contains":
      if (
        typeof contextValue === "string" &&
        typeof condition.value === "string"
      ) {
        result = contextValue
          .toLowerCase()
          .includes(condition.value.toLowerCase());
      } else if (Array.isArray(contextValue)) {
        result = contextValue.includes(condition.value);
      } else {
        result = false;
      }
      break;
    case "greater_than":
      result = Number(contextValue) > Number(condition.value);
      break;
    case "less_than":
      result = Number(contextValue) < Number(condition.value);
      break;
    case "matches":
      if (
        typeof contextValue === "string" &&
        typeof condition.value === "string"
      ) {
        try {
          const regex = new RegExp(condition.value, "i");
          result = regex.test(contextValue);
        } catch {
          result = false;
        }
      } else {
        result = false;
      }
      break;
    default:
      result = false;
  }

  return condition.negate ? !result : result;
}

/**
 * Checks if user is exempt from a rule
 */
export function isExempt(
  rule: AutoModRule,
  context: AutoModContext,
  config: AutoModConfig,
): boolean {
  // Check global exemptions
  if (context.userRole && config.globalExemptRoles.includes(context.userRole)) {
    return true;
  }
  if (config.globalExemptUsers.includes(context.userId)) {
    return true;
  }

  // Check rule-specific exemptions
  if (
    rule.exemptRoles &&
    context.userRole &&
    rule.exemptRoles.includes(context.userRole)
  ) {
    return true;
  }
  if (rule.exemptUsers && rule.exemptUsers.includes(context.userId)) {
    return true;
  }
  if (
    rule.exemptChannels &&
    context.channelId &&
    rule.exemptChannels.includes(context.channelId)
  ) {
    return true;
  }

  return false;
}

/**
 * Sorts rules by priority
 */
export function sortRulesByPriority(rules: AutoModRule[]): AutoModRule[] {
  return [...rules].sort(
    (a, b) => PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority],
  );
}

// ============================================================================
// Auto Moderator Class
// ============================================================================

export class AutoModerator {
  private config: AutoModConfig;
  private contentFilter: ContentFilter;
  private userViolations: Map<string, UserViolationRecord>;
  private ruleCooldowns: Map<string, Map<string, number>>; // ruleId -> userId -> timestamp
  private ruleTriggersPerHour: Map<string, Map<string, number[]>>; // ruleId -> userId -> timestamps

  constructor(config: Partial<AutoModConfig> = {}) {
    this.config = { ...DEFAULT_AUTOMOD_CONFIG, ...config };
    this.contentFilter = createContentFilter();
    this.userViolations = new Map();
    this.ruleCooldowns = new Map();
    this.ruleTriggersPerHour = new Map();
  }

  /**
   * Updates the auto-mod configuration
   */
  updateConfig(config: Partial<AutoModConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Gets the current configuration
   */
  getConfig(): AutoModConfig {
    return { ...this.config };
  }

  /**
   * Sets the content filter
   */
  setContentFilter(filter: ContentFilter): void {
    this.contentFilter = filter;
  }

  /**
   * Gets the content filter
   */
  getContentFilter(): ContentFilter {
    return this.contentFilter;
  }

  /**
   * Adds a new rule
   */
  addRule(rule: AutoModRule): void {
    const existingIndex = this.config.rules.findIndex((r) => r.id === rule.id);
    if (existingIndex >= 0) {
      this.config.rules[existingIndex] = rule;
    } else {
      this.config.rules.push(rule);
    }
  }

  /**
   * Removes a rule
   */
  removeRule(ruleId: string): boolean {
    const index = this.config.rules.findIndex((r) => r.id === ruleId);
    if (index >= 0) {
      this.config.rules.splice(index, 1);
      this.ruleCooldowns.delete(ruleId);
      this.ruleTriggersPerHour.delete(ruleId);
      return true;
    }
    return false;
  }

  /**
   * Enables or disables a rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): boolean {
    const rule = this.config.rules.find((r) => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
      rule.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Gets a rule by ID
   */
  getRule(ruleId: string): AutoModRule | undefined {
    return this.config.rules.find((r) => r.id === ruleId);
  }

  /**
   * Gets all rules
   */
  getRules(): AutoModRule[] {
    return [...this.config.rules];
  }

  /**
   * Checks if a rule is on cooldown for a user
   */
  private isOnCooldown(ruleId: string, userId: string): boolean {
    const ruleCooldowns = this.ruleCooldowns.get(ruleId);
    if (!ruleCooldowns) return false;

    const lastTrigger = ruleCooldowns.get(userId);
    if (!lastTrigger) return false;

    const rule = this.config.rules.find((r) => r.id === ruleId);
    const cooldown = rule?.cooldownMs || this.config.defaultCooldownMs;

    return Date.now() - lastTrigger < cooldown;
  }

  /**
   * Records a rule trigger for cooldown tracking
   */
  private recordTrigger(ruleId: string, userId: string): void {
    if (!this.ruleCooldowns.has(ruleId)) {
      this.ruleCooldowns.set(ruleId, new Map());
    }
    this.ruleCooldowns.get(ruleId)!.set(userId, Date.now());

    // Track triggers per hour
    if (!this.ruleTriggersPerHour.has(ruleId)) {
      this.ruleTriggersPerHour.set(ruleId, new Map());
    }
    const userTriggers = this.ruleTriggersPerHour.get(ruleId)!;
    if (!userTriggers.has(userId)) {
      userTriggers.set(userId, []);
    }

    const now = Date.now();
    const hourAgo = now - 3600000;
    const triggers = userTriggers.get(userId)!.filter((t) => t > hourAgo);
    triggers.push(now);
    userTriggers.set(userId, triggers);
  }

  /**
   * Checks if rule has exceeded max triggers per hour
   */
  private hasExceededMaxTriggers(ruleId: string, userId: string): boolean {
    const rule = this.config.rules.find((r) => r.id === ruleId);
    if (!rule?.maxTriggersPerHour) return false;

    const userTriggers = this.ruleTriggersPerHour.get(ruleId)?.get(userId);
    if (!userTriggers) return false;

    return userTriggers.length >= rule.maxTriggersPerHour;
  }

  /**
   * Evaluates all conditions for a rule
   */
  private evaluateRuleConditions(
    rule: AutoModRule,
    context: AutoModContext,
  ): { matched: boolean; matchedConditions: string[] } {
    if (rule.conditions.length === 0) {
      return { matched: true, matchedConditions: [] };
    }

    const matchedConditions: string[] = [];

    if (rule.conditionLogic === "and") {
      let allMatch = true;
      for (const condition of rule.conditions) {
        if (evaluateCondition(condition, context)) {
          matchedConditions.push(
            `${condition.type} ${condition.operator} ${condition.value}`,
          );
        } else {
          allMatch = false;
        }
      }
      return { matched: allMatch, matchedConditions };
    } else {
      // 'or' logic
      for (const condition of rule.conditions) {
        if (evaluateCondition(condition, context)) {
          matchedConditions.push(
            `${condition.type} ${condition.operator} ${condition.value}`,
          );
        }
      }
      return { matched: matchedConditions.length > 0, matchedConditions };
    }
  }

  /**
   * Processes content trigger
   */
  private processContentTrigger(context: AutoModContext): FilterResult | null {
    if (!context.content) return null;
    return this.contentFilter.filter(context.content, context.userId);
  }

  /**
   * Executes actions for a matched rule
   */
  private executeActions(
    rule: AutoModRule,
    context: AutoModContext,
  ): AutoModActionResult[] {
    const results: AutoModActionResult[] = [];
    let actionsExecuted = 0;

    for (const actionConfig of rule.actions) {
      if (actionsExecuted >= this.config.maxActionsPerMessage) break;

      const result: AutoModActionResult = {
        action: actionConfig.action,
        success: true,
        reason: actionConfig.reason,
        durationMs: actionConfig.durationMs,
      };

      // In a real implementation, these would call actual moderation services
      // Here we just record the intent
      switch (actionConfig.action) {
        case "warn":
          this.recordViolation(
            context.userId,
            rule,
            "warn",
            actionConfig.reason,
          );
          break;
        case "mute":
          this.recordViolation(
            context.userId,
            rule,
            "mute",
            actionConfig.reason,
          );
          break;
        case "kick":
          this.recordViolation(
            context.userId,
            rule,
            "kick",
            actionConfig.reason,
          );
          break;
        case "ban":
          this.recordViolation(
            context.userId,
            rule,
            "ban",
            actionConfig.reason,
          );
          break;
        case "delete":
        case "flag":
        case "log":
          // These don't add violations
          break;
      }

      results.push(result);
      actionsExecuted++;
    }

    return results;
  }

  /**
   * Records a violation for a user
   */
  recordViolation(
    userId: string,
    rule: AutoModRule,
    action: AutoModAction,
    reason?: string,
  ): void {
    let record = this.userViolations.get(userId);
    if (!record) {
      record = {
        userId,
        violations: [],
        totalWarnings: 0,
        currentLevel: 0,
        lastViolationAt: null,
      };
      this.userViolations.set(userId, record);
    }

    // Clean up old violations if escalation reset period has passed
    if (record.lastViolationAt && this.config.escalation.enabled) {
      const lastViolation = new Date(record.lastViolationAt).getTime();
      if (Date.now() - lastViolation > this.config.escalation.resetAfterMs) {
        record.totalWarnings = 0;
        record.currentLevel = 0;
      }
    }

    const violation: ViolationEntry = {
      id: generateId(),
      ruleId: rule.id,
      ruleName: rule.name,
      action,
      reason,
      timestamp: new Date().toISOString(),
      resolved: false,
    };

    record.violations.push(violation);
    record.lastViolationAt = violation.timestamp;

    if (action === "warn") {
      record.totalWarnings++;
    }
  }

  /**
   * Gets the current escalation level for a user
   */
  getEscalationLevel(userId: string): EscalationThreshold | null {
    if (!this.config.escalation.enabled) return null;

    const record = this.userViolations.get(userId);
    if (!record) return null;

    // Check if reset period has passed
    if (record.lastViolationAt) {
      const lastViolation = new Date(record.lastViolationAt).getTime();
      if (Date.now() - lastViolation > this.config.escalation.resetAfterMs) {
        return null;
      }
    }

    // Find the appropriate escalation level
    const thresholds = [...this.config.escalation.thresholds].sort(
      (a, b) => b.warningCount - a.warningCount,
    );

    for (const threshold of thresholds) {
      if (record.totalWarnings >= threshold.warningCount) {
        return threshold;
      }
    }

    return null;
  }

  /**
   * Gets violation record for a user
   */
  getUserViolations(userId: string): UserViolationRecord | null {
    return this.userViolations.get(userId) || null;
  }

  /**
   * Clears violation record for a user
   */
  clearUserViolations(userId: string): boolean {
    return this.userViolations.delete(userId);
  }

  /**
   * Resolves a specific violation
   */
  resolveViolation(
    userId: string,
    violationId: string,
    resolvedBy: string,
  ): boolean {
    const record = this.userViolations.get(userId);
    if (!record) return false;

    const violation = record.violations.find((v) => v.id === violationId);
    if (!violation) return false;

    violation.resolved = true;
    violation.resolvedBy = resolvedBy;
    violation.resolvedAt = new Date().toISOString();

    return true;
  }

  /**
   * Main moderation function - processes content and context
   */
  moderate(context: AutoModContext): AutoModResult {
    if (!this.config.enabled) {
      return {
        triggered: false,
        matchedRules: [],
        actions: [],
        shouldBlock: false,
      };
    }

    const matchedRules: AutoModRuleMatch[] = [];
    const allActions: AutoModActionResult[] = [];
    let shouldBlock = false;
    let modifiedContent = context.content;

    // Process content through content filter first
    let filterResult: FilterResult | null = null;
    if (context.content) {
      filterResult = this.processContentTrigger(context);
      if (filterResult && !filterResult.passed) {
        shouldBlock = true;
      }
    }

    // Sort rules by priority
    const sortedRules = sortRulesByPriority(
      this.config.rules.filter((r) => r.enabled),
    );

    for (const rule of sortedRules) {
      // Check exemptions
      if (isExempt(rule, context, this.config)) {
        continue;
      }

      // Check cooldown
      if (this.isOnCooldown(rule.id, context.userId)) {
        continue;
      }

      // Check max triggers
      if (this.hasExceededMaxTriggers(rule.id, context.userId)) {
        continue;
      }

      // Check trigger type
      let triggerMatched = false;
      switch (rule.trigger) {
        case "content":
          triggerMatched = filterResult !== null && !filterResult.passed;
          break;
        case "spam":
          triggerMatched =
            filterResult !== null &&
            filterResult.matches.some((m) => m.type === "spam");
          break;
        case "mention":
          triggerMatched = (context.mentions?.length || 0) > 0;
          break;
        case "attachment":
          triggerMatched = (context.attachments?.length || 0) > 0;
          break;
        case "join":
          triggerMatched = true; // Join events should be handled separately
          break;
        case "custom":
          triggerMatched = true; // Custom triggers always evaluate conditions
          break;
      }

      if (!triggerMatched) continue;

      // Evaluate conditions
      const { matched, matchedConditions } = this.evaluateRuleConditions(
        rule,
        context,
      );
      if (!matched) continue;

      // Rule triggered
      this.recordTrigger(rule.id, context.userId);

      matchedRules.push({
        ruleId: rule.id,
        ruleName: rule.name,
        trigger: rule.trigger,
        matchedConditions,
        priority: rule.priority,
        timestamp: new Date().toISOString(),
      });

      // Execute actions
      const actionResults = this.executeActions(rule, context);
      allActions.push(...actionResults);

      // Check if any action should block the message
      if (actionResults.some((a) => ["delete", "block"].includes(a.action))) {
        shouldBlock = true;
      }

      // For critical priority rules, stop processing further
      if (rule.priority === "critical") {
        break;
      }
    }

    // Check escalation
    const escalationLevel = this.getEscalationLevel(context.userId);
    if (escalationLevel) {
      allActions.push({
        action: escalationLevel.action,
        success: true,
        reason: escalationLevel.reason,
        durationMs: escalationLevel.durationMs,
      });

      if (["ban", "kick"].includes(escalationLevel.action)) {
        shouldBlock = true;
      }
    }

    // Apply content censoring if needed
    if (filterResult && modifiedContent) {
      const censorResult = this.contentFilter.filterAndCensor(
        modifiedContent,
        "*",
        context.userId,
      );
      modifiedContent = censorResult.filteredContent;
    }

    return {
      triggered:
        matchedRules.length > 0 ||
        (filterResult !== null && !filterResult.passed),
      matchedRules,
      actions: allActions,
      shouldBlock,
      modifiedContent,
    };
  }

  /**
   * Quick check if content would trigger moderation
   */
  wouldTrigger(context: AutoModContext): boolean {
    return this.moderate(context).triggered;
  }

  /**
   * Resets all state
   */
  reset(): void {
    this.userViolations.clear();
    this.ruleCooldowns.clear();
    this.ruleTriggersPerHour.clear();
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates an auto moderator with default configuration
 */
export function createAutoModerator(
  config?: Partial<AutoModConfig>,
): AutoModerator {
  return new AutoModerator(config);
}

/**
 * Creates a rule builder helper
 */
export function createRule(
  name: string,
  trigger: AutoModTrigger,
  actions: AutoModActionConfig[],
  options?: Partial<Omit<AutoModRule, "id" | "name" | "trigger" | "actions">>,
): AutoModRule {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name,
    trigger,
    actions,
    enabled: true,
    conditions: [],
    conditionLogic: "and",
    priority: "medium",
    createdAt: now,
    updatedAt: now,
    ...options,
  };
}

/**
 * Creates a spam protection rule
 */
export function createSpamProtectionRule(
  name = "Spam Protection",
  options?: Partial<Omit<AutoModRule, "id" | "name" | "trigger" | "actions">>,
): AutoModRule {
  return createRule(
    name,
    "spam",
    [
      { action: "delete", reason: "Spam detected" },
      {
        action: "warn",
        reason: "Your message was flagged as spam",
        notifyUser: true,
      },
    ],
    {
      priority: "high",
      ...options,
    },
  );
}

/**
 * Creates a profanity filter rule
 */
export function createProfanityRule(
  name = "Profanity Filter",
  options?: Partial<Omit<AutoModRule, "id" | "name" | "trigger" | "actions">>,
): AutoModRule {
  return createRule(
    name,
    "content",
    [
      { action: "delete", reason: "Profanity detected" },
      { action: "warn", reason: "Profanity is not allowed", notifyUser: true },
    ],
    {
      priority: "medium",
      ...options,
    },
  );
}

/**
 * Creates a new account protection rule
 */
export function createNewAccountRule(
  accountAgeMs: number = 86400000, // 24 hours
  name = "New Account Protection",
  options?: Partial<Omit<AutoModRule, "id" | "name" | "trigger" | "actions">>,
): AutoModRule {
  return createRule(
    name,
    "content",
    [
      {
        action: "flag",
        reason: "Message from new account",
        notifyModerators: true,
      },
    ],
    {
      priority: "low",
      conditions: [
        {
          type: "account_age",
          operator: "less_than",
          value: accountAgeMs,
        },
      ],
      ...options,
    },
  );
}

// ============================================================================
// Export Default Instance
// ============================================================================

export const defaultAutoModerator = createAutoModerator();
