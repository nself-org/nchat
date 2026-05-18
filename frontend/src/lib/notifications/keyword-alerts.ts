/**
 * Keyword Alerts Service - Enhanced keyword notification management
 *
 * Extends the basic keyword matching with:
 * - Real-time alert triggering
 * - Priority-based keyword handling
 * - Category/group management
 * - Alert history tracking
 * - Bulk keyword operations
 */

import type {
  KeywordNotification,
  KeywordMatch,
  NotificationPreferences,
  NotificationPriority,
} from "./notification-types";
import {
  matchKeywords,
  hasKeywordMatch,
  createKeyword,
  validateKeyword,
} from "./keyword-matcher";

// ============================================================================
// Types
// ============================================================================

export interface KeywordAlert {
  id: string;
  keyword: KeywordNotification;
  matches: KeywordMatch[];
  channelId: string;
  messageId: string;
  senderId: string;
  senderName: string;
  messageContent: string;
  timestamp: Date;
  isRead: boolean;
  priority: NotificationPriority;
}

export interface KeywordCategory {
  id: string;
  name: string;
  color: string;
  icon?: string;
  keywordIds: string[];
  createdAt: string;
}

export interface KeywordAlertOptions {
  /** Maximum alerts to store in history */
  maxHistorySize?: number;
  /** Whether to play sound for this alert */
  playSound?: boolean;
  /** Whether to show desktop notification */
  showDesktop?: boolean;
  /** Whether to show mobile notification */
  showMobile?: boolean;
  /** Custom priority override */
  priority?: NotificationPriority;
}

export interface KeywordMatchResult {
  hasMatch: boolean;
  matches: KeywordMatch[];
  keywords: KeywordNotification[];
  highestPriority: NotificationPriority | null;
  shouldAlert: boolean;
  shouldPlaySound: boolean;
  soundId?: string;
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_ALERT_OPTIONS: KeywordAlertOptions = {
  maxHistorySize: 100,
  playSound: true,
  showDesktop: true,
  showMobile: true,
  priority: "normal",
};

export const KEYWORD_PRIORITY_MAP: Record<string, NotificationPriority> = {
  urgent: "urgent",
  important: "high",
  notice: "normal",
  info: "low",
};

// ============================================================================
// Alert History Storage
// ============================================================================

const STORAGE_KEY = "nchat-keyword-alerts";
let alertHistory: KeywordAlert[] = [];

/**
 * Load alert history from storage
 */
export function loadAlertHistory(): KeywordAlert[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      alertHistory = JSON.parse(stored).map((alert: KeywordAlert) => ({
        ...alert,
        timestamp: new Date(alert.timestamp),
      }));
    }
  } catch {
    alertHistory = [];
  }

  return alertHistory;
}

/**
 * Save alert history to storage
 */
export function saveAlertHistory(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alertHistory));
  } catch {
    // Storage full or unavailable
  }
}

/**
 * Clear alert history
 */
export function clearAlertHistory(): void {
  alertHistory = [];
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

// ============================================================================
// Core Alert Functions
// ============================================================================

/**
 * Check message for keyword matches and create alert
 */
export function checkForKeywordAlert(
  preferences: NotificationPreferences,
  messageContent: string,
  channelId: string,
  messageId: string,
  senderId: string,
  senderName: string,
  options: KeywordAlertOptions = {},
): KeywordMatchResult {
  const opts = { ...DEFAULT_ALERT_OPTIONS, ...options };

  // Get keywords active for this channel
  const activeKeywords = getActiveKeywordsForChannel(preferences, channelId);

  if (activeKeywords.length === 0) {
    return {
      hasMatch: false,
      matches: [],
      keywords: [],
      highestPriority: null,
      shouldAlert: false,
      shouldPlaySound: false,
    };
  }

  // Check for matches
  const matches = matchKeywords(messageContent, activeKeywords);

  if (matches.length === 0) {
    return {
      hasMatch: false,
      matches: [],
      keywords: [],
      highestPriority: null,
      shouldAlert: false,
      shouldPlaySound: false,
    };
  }

  // Find matching keywords
  const matchedKeywords = activeKeywords.filter((k) =>
    matches.some((m) => m.keyword.toLowerCase() === k.keyword.toLowerCase()),
  );

  // Determine highest priority
  const highestPriority = getHighestPriority(matchedKeywords);

  // Get sound ID (use first keyword with custom sound, or default)
  const soundId = matchedKeywords.find((k) => k.soundId)?.soundId;

  // Create alert
  const alert: KeywordAlert = {
    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    keyword: matchedKeywords[0],
    matches,
    channelId,
    messageId,
    senderId,
    senderName,
    messageContent,
    timestamp: new Date(),
    isRead: false,
    priority: opts.priority || highestPriority || "normal",
  };

  // Add to history
  addAlertToHistory(alert, opts.maxHistorySize);

  return {
    hasMatch: true,
    matches,
    keywords: matchedKeywords,
    highestPriority,
    shouldAlert: true,
    shouldPlaySound: opts.playSound ?? true,
    soundId,
  };
}

/**
 * Add alert to history
 */
function addAlertToHistory(
  alert: KeywordAlert,
  maxSize: number = DEFAULT_ALERT_OPTIONS.maxHistorySize!,
): void {
  alertHistory.unshift(alert);

  // Trim to max size
  if (alertHistory.length > maxSize) {
    alertHistory = alertHistory.slice(0, maxSize);
  }

  saveAlertHistory();
}

/**
 * Get alert history
 */
export function getAlertHistory(): KeywordAlert[] {
  return [...alertHistory];
}

/**
 * Get unread alerts
 */
export function getUnreadAlerts(): KeywordAlert[] {
  return alertHistory.filter((a) => !a.isRead);
}

/**
 * Mark alert as read
 */
export function markAlertAsRead(alertId: string): void {
  const alert = alertHistory.find((a) => a.id === alertId);
  if (alert) {
    alert.isRead = true;
    saveAlertHistory();
  }
}

/**
 * Mark all alerts as read
 */
export function markAllAlertsAsRead(): void {
  alertHistory.forEach((a) => {
    a.isRead = true;
  });
  saveAlertHistory();
}

/**
 * Delete alert
 */
export function deleteAlert(alertId: string): void {
  alertHistory = alertHistory.filter((a) => a.id !== alertId);
  saveAlertHistory();
}

// ============================================================================
// Keyword Management Functions
// ============================================================================

/**
 * Get keywords active for a specific channel
 */
export function getActiveKeywordsForChannel(
  preferences: NotificationPreferences,
  channelId: string,
): KeywordNotification[] {
  return preferences.keywords.filter((k) => {
    if (!k.enabled) return false;

    // If no channel restriction, keyword is active everywhere
    if (k.channelIds.length === 0) return true;

    // Check if channel is in the keyword's channel list
    return k.channelIds.includes(channelId);
  });
}

/**
 * Create keyword with priority
 */
export function createKeywordWithPriority(
  keyword: string,
  priority: NotificationPriority,
  options?: Partial<Omit<KeywordNotification, "id" | "keyword" | "createdAt">>,
): KeywordNotification {
  const priorityPrefix = KEYWORD_PRIORITY_MAP[priority] || "";
  return createKeyword(keyword, {
    ...options,
    // Store priority in highlight color convention
    highlightColor: getPriorityColor(priority),
  });
}

/**
 * Get priority color
 */
function getPriorityColor(priority: NotificationPriority): string {
  switch (priority) {
    case "urgent":
      return "#ef4444"; // red
    case "high":
      return "#f97316"; // orange
    case "normal":
      return "#6366f1"; // indigo
    case "low":
      return "#64748b"; // gray
    default:
      return "#6366f1";
  }
}

/**
 * Get priority from keyword
 */
export function getKeywordPriority(
  keyword: KeywordNotification,
): NotificationPriority {
  const color = keyword.highlightColor?.toLowerCase();

  if (color === "#ef4444" || color === "red") return "urgent";
  if (color === "#f97316" || color === "orange") return "high";
  if (color === "#6366f1" || color === "indigo") return "normal";
  if (color === "#64748b" || color === "gray") return "low";

  return "normal";
}

/**
 * Get highest priority from keywords
 */
function getHighestPriority(
  keywords: KeywordNotification[],
): NotificationPriority | null {
  if (keywords.length === 0) return null;

  const priorityOrder: NotificationPriority[] = [
    "urgent",
    "high",
    "normal",
    "low",
  ];

  for (const priority of priorityOrder) {
    if (keywords.some((k) => getKeywordPriority(k) === priority)) {
      return priority;
    }
  }

  return "normal";
}

// ============================================================================
// Keyword Category Management
// ============================================================================

const CATEGORIES_STORAGE_KEY = "nchat-keyword-categories";
let categories: KeywordCategory[] = [];

/**
 * Load categories from storage
 */
export function loadCategories(): KeywordCategory[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (stored) {
      categories = JSON.parse(stored);
    }
  } catch {
    categories = [];
  }

  return categories;
}

/**
 * Save categories to storage
 */
function saveCategories(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
  } catch {
    // Storage full or unavailable
  }
}

/**
 * Create category
 */
export function createCategory(
  name: string,
  color: string,
  icon?: string,
): KeywordCategory {
  const category: KeywordCategory = {
    id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    color,
    icon,
    keywordIds: [],
    createdAt: new Date().toISOString(),
  };

  categories.push(category);
  saveCategories();

  return category;
}

/**
 * Update category
 */
export function updateCategory(
  categoryId: string,
  updates: Partial<Omit<KeywordCategory, "id" | "createdAt">>,
): KeywordCategory | null {
  const category = categories.find((c) => c.id === categoryId);

  if (!category) {
    return null;
  }

  Object.assign(category, updates);
  saveCategories();

  return category;
}

/**
 * Delete category
 */
export function deleteCategory(categoryId: string): boolean {
  const index = categories.findIndex((c) => c.id === categoryId);

  if (index === -1) {
    return false;
  }

  categories.splice(index, 1);
  saveCategories();

  return true;
}

/**
 * Add keyword to category
 */
export function addKeywordToCategory(
  categoryId: string,
  keywordId: string,
): boolean {
  const category = categories.find((c) => c.id === categoryId);

  if (!category) {
    return false;
  }

  if (!category.keywordIds.includes(keywordId)) {
    category.keywordIds.push(keywordId);
    saveCategories();
  }

  return true;
}

/**
 * Remove keyword from category
 */
export function removeKeywordFromCategory(
  categoryId: string,
  keywordId: string,
): boolean {
  const category = categories.find((c) => c.id === categoryId);

  if (!category) {
    return false;
  }

  const index = category.keywordIds.indexOf(keywordId);
  if (index !== -1) {
    category.keywordIds.splice(index, 1);
    saveCategories();
  }

  return true;
}

/**
 * Get keywords in category
 */
export function getKeywordsInCategory(
  preferences: NotificationPreferences,
  categoryId: string,
): KeywordNotification[] {
  const category = categories.find((c) => c.id === categoryId);

  if (!category) {
    return [];
  }

  return preferences.keywords.filter((k) => category.keywordIds.includes(k.id));
}

/**
 * Get category for keyword
 */
export function getCategoryForKeyword(
  keywordId: string,
): KeywordCategory | null {
  return categories.find((c) => c.keywordIds.includes(keywordId)) || null;
}

/**
 * Get all categories
 */
export function getAllCategories(): KeywordCategory[] {
  return [...categories];
}

// ============================================================================
// Bulk Operations
// ============================================================================

/**
 * Add keywords in bulk
 */
export function addKeywordsBulk(
  preferences: NotificationPreferences,
  keywords: string[],
  options?: Partial<Omit<KeywordNotification, "id" | "keyword" | "createdAt">>,
): NotificationPreferences {
  const validKeywords = keywords.filter((k) => validateKeyword(k).valid);

  const newKeywords = validKeywords.map((k) => createKeyword(k, options));

  return {
    ...preferences,
    keywords: [...preferences.keywords, ...newKeywords],
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Remove keywords in bulk
 */
export function removeKeywordsBulk(
  preferences: NotificationPreferences,
  keywordIds: string[],
): NotificationPreferences {
  return {
    ...preferences,
    keywords: preferences.keywords.filter((k) => !keywordIds.includes(k.id)),
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Enable keywords in bulk
 */
export function enableKeywordsBulk(
  preferences: NotificationPreferences,
  keywordIds: string[],
): NotificationPreferences {
  return {
    ...preferences,
    keywords: preferences.keywords.map((k) =>
      keywordIds.includes(k.id) ? { ...k, enabled: true } : k,
    ),
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Disable keywords in bulk
 */
export function disableKeywordsBulk(
  preferences: NotificationPreferences,
  keywordIds: string[],
): NotificationPreferences {
  return {
    ...preferences,
    keywords: preferences.keywords.map((k) =>
      keywordIds.includes(k.id) ? { ...k, enabled: false } : k,
    ),
    lastUpdated: new Date().toISOString(),
  };
}

// ============================================================================
// Import/Export
// ============================================================================

/**
 * Export keywords as JSON
 */
export function exportKeywords(preferences: NotificationPreferences): string {
  return JSON.stringify(
    {
      keywords: preferences.keywords,
      categories,
      exportedAt: new Date().toISOString(),
    },
    null,
    2,
  );
}

/**
 * Import keywords from JSON
 */
export function importKeywords(
  preferences: NotificationPreferences,
  json: string,
): {
  preferences: NotificationPreferences | null;
  importedKeywords: number;
  importedCategories: number;
  error?: string;
} {
  try {
    const data = JSON.parse(json);

    if (!data.keywords || !Array.isArray(data.keywords)) {
      return {
        preferences: null,
        importedKeywords: 0,
        importedCategories: 0,
        error: "Invalid format: missing keywords array",
      };
    }

    // Merge keywords (avoid duplicates)
    const existingKeywordStrings = new Set(
      preferences.keywords.map((k) => k.keyword.toLowerCase()),
    );

    const newKeywords = data.keywords.filter(
      (k: KeywordNotification) =>
        !existingKeywordStrings.has(k.keyword.toLowerCase()),
    );

    // Import categories if present
    let importedCategories = 0;
    if (data.categories && Array.isArray(data.categories)) {
      const existingCategoryNames = new Set(
        categories.map((c) => c.name.toLowerCase()),
      );

      const newCategories = data.categories.filter(
        (c: KeywordCategory) =>
          !existingCategoryNames.has(c.name.toLowerCase()),
      );

      categories.push(...newCategories);
      saveCategories();
      importedCategories = newCategories.length;
    }

    const updatedPreferences: NotificationPreferences = {
      ...preferences,
      keywords: [...preferences.keywords, ...newKeywords],
      lastUpdated: new Date().toISOString(),
    };

    return {
      preferences: updatedPreferences,
      importedKeywords: newKeywords.length,
      importedCategories,
    };
  } catch {
    return {
      preferences: null,
      importedKeywords: 0,
      importedCategories: 0,
      error: "Failed to parse JSON",
    };
  }
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Get keyword alert statistics
 */
export function getKeywordAlertStats(preferences: NotificationPreferences): {
  totalKeywords: number;
  enabledKeywords: number;
  totalAlerts: number;
  unreadAlerts: number;
  alertsByPriority: Record<NotificationPriority, number>;
  topTriggeredKeywords: Array<{ keyword: string; count: number }>;
} {
  const alertsByPriority: Record<NotificationPriority, number> = {
    urgent: 0,
    high: 0,
    normal: 0,
    low: 0,
  };

  alertHistory.forEach((alert) => {
    alertsByPriority[alert.priority]++;
  });

  // Count keyword triggers
  const keywordCounts = new Map<string, number>();
  alertHistory.forEach((alert) => {
    const count = keywordCounts.get(alert.keyword.keyword) || 0;
    keywordCounts.set(alert.keyword.keyword, count + 1);
  });

  const topTriggeredKeywords = Array.from(keywordCounts.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalKeywords: preferences.keywords.length,
    enabledKeywords: preferences.keywords.filter((k) => k.enabled).length,
    totalAlerts: alertHistory.length,
    unreadAlerts: alertHistory.filter((a) => !a.isRead).length,
    alertsByPriority,
    topTriggeredKeywords,
  };
}
