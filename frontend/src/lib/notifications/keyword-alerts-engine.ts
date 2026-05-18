/**
 * Keyword Alerts Engine - Enhanced keyword notification system
 *
 * Extends the base keyword matching with:
 * - Pattern matching modes: exact, contains, regex
 * - Alert priority levels (normal, high, urgent)
 * - Keyword groups/categories
 * - Case sensitivity options
 * - Per-workspace keyword lists
 * - Comprehensive matchKeywords() function
 */

import type { NotificationPriority } from "./notification-types";

// ============================================================================
// Types
// ============================================================================

/**
 * Matching mode for a keyword alert
 */
export type KeywordMatchMode = "exact" | "contains" | "regex" | "whole_word";

/**
 * Enhanced keyword alert definition
 */
export interface KeywordAlertDefinition {
  /** Unique identifier */
  id: string;
  /** The pattern to match */
  pattern: string;
  /** Matching mode */
  matchMode: KeywordMatchMode;
  /** Whether matching is case-sensitive */
  caseSensitive: boolean;
  /** Alert priority */
  priority: KeywordAlertPriority;
  /** Whether this alert is enabled */
  enabled: boolean;
  /** Optional group/category ID */
  groupId?: string;
  /** Workspace IDs where this alert is active (empty = all workspaces) */
  workspaceIds: string[];
  /** Channel IDs where this alert is active (empty = all channels) */
  channelIds: string[];
  /** Custom highlight color */
  highlightColor?: string;
  /** Custom sound ID */
  soundId?: string;
  /** Description of what this keyword alert is for */
  description?: string;
  /** When this alert was created */
  createdAt: string;
  /** When this alert was last updated */
  updatedAt: string;
}

/**
 * Alert priority levels
 */
export type KeywordAlertPriority = "normal" | "high" | "urgent";

/**
 * Keyword group/category definition
 */
export interface KeywordGroup {
  /** Unique identifier */
  id: string;
  /** Group name */
  name: string;
  /** Group description */
  description?: string;
  /** Group color for UI */
  color: string;
  /** Group icon */
  icon?: string;
  /** Whether the entire group is enabled */
  enabled: boolean;
  /** Priority for all keywords in this group (can be overridden per keyword) */
  defaultPriority: KeywordAlertPriority;
  /** When this group was created */
  createdAt: string;
}

/**
 * Result of matching a single keyword
 */
export interface KeywordAlertMatch {
  /** The keyword definition that matched */
  alertId: string;
  /** The pattern that matched */
  pattern: string;
  /** The actual text that was matched */
  matchedText: string;
  /** Position in the source text */
  position: number;
  /** Length of the matched text */
  length: number;
  /** Priority of the matched keyword */
  priority: KeywordAlertPriority;
  /** Group ID if applicable */
  groupId?: string;
}

/**
 * Complete result from checking a message against keywords
 */
export interface KeywordAlertResult {
  /** Whether any keywords matched */
  hasMatches: boolean;
  /** All matches found */
  matches: KeywordAlertMatch[];
  /** The highest priority among all matches */
  highestPriority: KeywordAlertPriority | null;
  /** The notification priority mapped from keyword priority */
  notificationPriority: NotificationPriority;
  /** Unique alert IDs that matched */
  matchedAlertIds: string[];
  /** Whether at least one urgent alert matched */
  hasUrgent: boolean;
  /** Whether the notification should bypass digest */
  bypassDigest: boolean;
}

/**
 * Per-workspace keyword list
 */
export interface WorkspaceKeywordList {
  /** Workspace ID */
  workspaceId: string;
  /** Workspace name for display */
  workspaceName: string;
  /** Keywords specific to this workspace */
  keywords: KeywordAlertDefinition[];
  /** Groups specific to this workspace */
  groups: KeywordGroup[];
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Map keyword alert priority to notification priority
 */
export const ALERT_TO_NOTIFICATION_PRIORITY: Record<
  KeywordAlertPriority,
  NotificationPriority
> = {
  normal: "normal",
  high: "high",
  urgent: "urgent",
};

/**
 * Priority ordering (lower index = higher priority)
 */
export const ALERT_PRIORITY_ORDER: KeywordAlertPriority[] = [
  "urgent",
  "high",
  "normal",
];

// ============================================================================
// Keyword Alert Definition Management
// ============================================================================

/**
 * Create a keyword alert definition
 */
export function createKeywordAlertDefinition(
  pattern: string,
  options?: Partial<
    Omit<KeywordAlertDefinition, "id" | "pattern" | "createdAt" | "updatedAt">
  >,
): KeywordAlertDefinition {
  const now = new Date().toISOString();
  return {
    id: `kwa_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    pattern: pattern.trim(),
    matchMode: options?.matchMode ?? "contains",
    caseSensitive: options?.caseSensitive ?? false,
    priority: options?.priority ?? "normal",
    enabled: options?.enabled ?? true,
    groupId: options?.groupId,
    workspaceIds: options?.workspaceIds ?? [],
    channelIds: options?.channelIds ?? [],
    highlightColor: options?.highlightColor,
    soundId: options?.soundId,
    description: options?.description,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Validate a keyword alert pattern
 */
export function validateKeywordAlertPattern(
  pattern: string,
  matchMode: KeywordMatchMode,
): { valid: boolean; error?: string } {
  if (!pattern.trim()) {
    return { valid: false, error: "Pattern cannot be empty" };
  }

  if (pattern.length < 2) {
    return { valid: false, error: "Pattern must be at least 2 characters" };
  }

  if (pattern.length > 500) {
    return { valid: false, error: "Pattern cannot exceed 500 characters" };
  }

  if (matchMode === "regex") {
    try {
      new RegExp(pattern);
    } catch (e) {
      return {
        valid: false,
        error: `Invalid regex pattern: ${e instanceof Error ? e.message : "unknown error"}`,
      };
    }
  }

  return { valid: true };
}

// ============================================================================
// Keyword Group Management
// ============================================================================

/**
 * Create a keyword group
 */
export function createKeywordGroup(
  name: string,
  options?: Partial<Omit<KeywordGroup, "id" | "name" | "createdAt">>,
): KeywordGroup {
  return {
    id: `kwg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    name,
    description: options?.description,
    color: options?.color ?? "#6366f1",
    icon: options?.icon,
    enabled: options?.enabled ?? true,
    defaultPriority: options?.defaultPriority ?? "normal",
    createdAt: new Date().toISOString(),
  };
}

/**
 * Get the effective priority for a keyword considering its group
 */
export function getEffectiveAlertPriority(
  alert: KeywordAlertDefinition,
  groups: KeywordGroup[],
): KeywordAlertPriority {
  // The alert's own priority takes precedence
  if (alert.priority !== "normal" || !alert.groupId) {
    return alert.priority;
  }

  // Fall back to group default priority
  const group = groups.find((g) => g.id === alert.groupId);
  return group?.defaultPriority ?? alert.priority;
}

// ============================================================================
// Core Matching Engine
// ============================================================================

/**
 * Build a regex for a keyword alert based on its match mode
 */
export function buildMatchRegex(alert: KeywordAlertDefinition): RegExp | null {
  const flags = alert.caseSensitive ? "g" : "gi";

  try {
    switch (alert.matchMode) {
      case "exact":
        return new RegExp(`^${escapeRegexChars(alert.pattern)}$`, flags);

      case "contains":
        return new RegExp(escapeRegexChars(alert.pattern), flags);

      case "whole_word":
        return new RegExp(`\\b${escapeRegexChars(alert.pattern)}\\b`, flags);

      case "regex":
        return new RegExp(alert.pattern, flags);

      default:
        return new RegExp(escapeRegexChars(alert.pattern), flags);
    }
  } catch {
    return null;
  }
}

/**
 * Escape special regex characters in a string
 */
function escapeRegexChars(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Match a single keyword alert against text content
 */
export function matchSingleAlert(
  text: string,
  alert: KeywordAlertDefinition,
  groups: KeywordGroup[],
  options?: { maxMatches?: number },
): KeywordAlertMatch[] {
  if (!alert.enabled) return [];

  // Check if group is enabled
  if (alert.groupId) {
    const group = groups.find((g) => g.id === alert.groupId);
    if (group && !group.enabled) return [];
  }

  const regex = buildMatchRegex(alert);
  if (!regex) return [];

  const matches: KeywordAlertMatch[] = [];
  const maxMatches = options?.maxMatches ?? 50;
  let match: RegExpExecArray | null;
  const priority = getEffectiveAlertPriority(alert, groups);

  while ((match = regex.exec(text)) !== null && matches.length < maxMatches) {
    matches.push({
      alertId: alert.id,
      pattern: alert.pattern,
      matchedText: match[0],
      position: match.index,
      length: match[0].length,
      priority,
      groupId: alert.groupId,
    });

    // Prevent infinite loop for zero-length matches
    if (match.index === regex.lastIndex) {
      regex.lastIndex++;
    }
  }

  return matches;
}

/**
 * Match message content against all keyword alerts
 *
 * This is the primary function for checking if a message triggers any keyword alerts.
 * It filters alerts by workspace and channel, then runs matching against all active alerts.
 */
export function matchKeywordAlerts(
  text: string,
  alerts: KeywordAlertDefinition[],
  groups: KeywordGroup[],
  context?: {
    workspaceId?: string;
    channelId?: string;
    maxMatches?: number;
  },
): KeywordAlertResult {
  if (!text || alerts.length === 0) {
    return createEmptyResult();
  }

  // Filter alerts by workspace and channel
  const activeAlerts = filterActiveAlerts(
    alerts,
    context?.workspaceId,
    context?.channelId,
  );

  if (activeAlerts.length === 0) {
    return createEmptyResult();
  }

  // Run matching
  const allMatches: KeywordAlertMatch[] = [];
  const matchedAlertIds = new Set<string>();
  const maxMatches = context?.maxMatches ?? 100;

  for (const alert of activeAlerts) {
    if (allMatches.length >= maxMatches) break;

    const remaining = maxMatches - allMatches.length;
    const matches = matchSingleAlert(text, alert, groups, {
      maxMatches: remaining,
    });

    if (matches.length > 0) {
      allMatches.push(...matches);
      matchedAlertIds.add(alert.id);
    }
  }

  // Sort by position
  allMatches.sort((a, b) => a.position - b.position);

  // Determine highest priority
  const highestPriority = resolveHighestPriority(allMatches);
  const hasUrgent = allMatches.some((m) => m.priority === "urgent");

  return {
    hasMatches: allMatches.length > 0,
    matches: allMatches,
    highestPriority,
    notificationPriority: highestPriority
      ? ALERT_TO_NOTIFICATION_PRIORITY[highestPriority]
      : "normal",
    matchedAlertIds: Array.from(matchedAlertIds),
    hasUrgent,
    bypassDigest: hasUrgent,
  };
}

/**
 * Filter alerts to only those active for the given workspace and channel
 */
export function filterActiveAlerts(
  alerts: KeywordAlertDefinition[],
  workspaceId?: string,
  channelId?: string,
): KeywordAlertDefinition[] {
  return alerts.filter((alert) => {
    if (!alert.enabled) return false;

    // Check workspace restriction
    if (alert.workspaceIds.length > 0 && workspaceId) {
      if (!alert.workspaceIds.includes(workspaceId)) return false;
    }

    // Check channel restriction
    if (alert.channelIds.length > 0 && channelId) {
      if (!alert.channelIds.includes(channelId)) return false;
    }

    return true;
  });
}

/**
 * Quick check if any keyword matches without computing full results
 */
export function hasAnyKeywordMatch(
  text: string,
  alerts: KeywordAlertDefinition[],
  groups: KeywordGroup[],
  context?: {
    workspaceId?: string;
    channelId?: string;
  },
): boolean {
  if (!text || alerts.length === 0) return false;

  const activeAlerts = filterActiveAlerts(
    alerts,
    context?.workspaceId,
    context?.channelId,
  );

  for (const alert of activeAlerts) {
    if (!alert.enabled) continue;
    if (alert.groupId) {
      const group = groups.find((g) => g.id === alert.groupId);
      if (group && !group.enabled) continue;
    }

    const regex = buildMatchRegex(alert);
    if (regex && regex.test(text)) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// Workspace Keyword Lists
// ============================================================================

/**
 * Create a workspace keyword list
 */
export function createWorkspaceKeywordList(
  workspaceId: string,
  workspaceName: string,
): WorkspaceKeywordList {
  return {
    workspaceId,
    workspaceName,
    keywords: [],
    groups: [],
  };
}

/**
 * Add a keyword to a workspace list
 */
export function addKeywordToWorkspace(
  list: WorkspaceKeywordList,
  keyword: KeywordAlertDefinition,
): WorkspaceKeywordList {
  // Ensure the workspace is in the keyword's workspace list
  const updatedKeyword: KeywordAlertDefinition = {
    ...keyword,
    workspaceIds: keyword.workspaceIds.includes(list.workspaceId)
      ? keyword.workspaceIds
      : [...keyword.workspaceIds, list.workspaceId],
  };

  return {
    ...list,
    keywords: [...list.keywords, updatedKeyword],
  };
}

/**
 * Remove a keyword from a workspace list
 */
export function removeKeywordFromWorkspace(
  list: WorkspaceKeywordList,
  keywordId: string,
): WorkspaceKeywordList {
  return {
    ...list,
    keywords: list.keywords.filter((k) => k.id !== keywordId),
  };
}

/**
 * Get keywords for a workspace, merging global and workspace-specific
 */
export function getKeywordsForWorkspace(
  globalAlerts: KeywordAlertDefinition[],
  workspaceList?: WorkspaceKeywordList,
): KeywordAlertDefinition[] {
  // Get global keywords (no workspace restriction)
  const global = globalAlerts.filter((a) => a.workspaceIds.length === 0);

  // Get workspace-specific keywords
  const workspace = workspaceList?.keywords ?? [];

  // Merge, avoiding duplicates by ID
  const seen = new Set<string>();
  const result: KeywordAlertDefinition[] = [];

  for (const kw of [...workspace, ...global]) {
    if (!seen.has(kw.id)) {
      seen.add(kw.id);
      result.push(kw);
    }
  }

  return result;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Create an empty keyword alert result
 */
function createEmptyResult(): KeywordAlertResult {
  return {
    hasMatches: false,
    matches: [],
    highestPriority: null,
    notificationPriority: "normal",
    matchedAlertIds: [],
    hasUrgent: false,
    bypassDigest: false,
  };
}

/**
 * Resolve the highest priority from a list of matches
 */
function resolveHighestPriority(
  matches: KeywordAlertMatch[],
): KeywordAlertPriority | null {
  if (matches.length === 0) return null;

  for (const priority of ALERT_PRIORITY_ORDER) {
    if (matches.some((m) => m.priority === priority)) {
      return priority;
    }
  }

  return "normal";
}

/**
 * Get keyword alert statistics
 */
export function getKeywordAlertStats(
  alerts: KeywordAlertDefinition[],
  groups: KeywordGroup[],
): {
  totalAlerts: number;
  enabledAlerts: number;
  disabledAlerts: number;
  byMatchMode: Record<KeywordMatchMode, number>;
  byPriority: Record<KeywordAlertPriority, number>;
  totalGroups: number;
  enabledGroups: number;
  alertsWithWorkspaceRestriction: number;
  alertsWithChannelRestriction: number;
} {
  const byMatchMode: Record<KeywordMatchMode, number> = {
    exact: 0,
    contains: 0,
    regex: 0,
    whole_word: 0,
  };
  const byPriority: Record<KeywordAlertPriority, number> = {
    normal: 0,
    high: 0,
    urgent: 0,
  };

  for (const alert of alerts) {
    byMatchMode[alert.matchMode]++;
    byPriority[alert.priority]++;
  }

  return {
    totalAlerts: alerts.length,
    enabledAlerts: alerts.filter((a) => a.enabled).length,
    disabledAlerts: alerts.filter((a) => !a.enabled).length,
    byMatchMode,
    byPriority,
    totalGroups: groups.length,
    enabledGroups: groups.filter((g) => g.enabled).length,
    alertsWithWorkspaceRestriction: alerts.filter(
      (a) => a.workspaceIds.length > 0,
    ).length,
    alertsWithChannelRestriction: alerts.filter((a) => a.channelIds.length > 0)
      .length,
  };
}
