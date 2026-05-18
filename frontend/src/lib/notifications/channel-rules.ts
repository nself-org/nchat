/**
 * Channel Rules - Enhanced per-channel notification rule management
 *
 * Provides granular notification control at the channel, thread, and category level:
 * - Per-channel notification levels (all, mentions, nothing, custom)
 * - Duration-based and permanent muting
 * - Thread-level notification preferences
 * - Category/group notification settings
 * - Notification rule resolution
 */

import type {
  ChannelNotificationLevel,
  NotificationPriority,
  NotificationType,
  NotificationDeliveryMethod,
} from "./notification-types";

// ============================================================================
// Types
// ============================================================================

/**
 * Thread notification preference
 */
export type ThreadNotificationLevel = "all" | "participating" | "nothing";

/**
 * Mute state for a channel
 */
export interface MuteState {
  /** Whether the channel is muted */
  isMuted: boolean;
  /** When the mute expires (null = permanent) */
  expiresAt: string | null;
  /** Reason for muting */
  reason?: string;
}

/**
 * Thread-level notification preferences
 */
export interface ThreadNotificationPreference {
  /** Thread ID */
  threadId: string;
  /** Channel ID the thread belongs to */
  channelId: string;
  /** Notification level for this thread */
  level: ThreadNotificationLevel;
  /** Whether the user is participating in this thread */
  isParticipating: boolean;
  /** Custom mute state for this thread */
  mute?: MuteState;
  /** Timestamp of last interaction */
  lastInteraction?: string;
}

/**
 * Per-channel notification rule with enhanced settings
 */
export interface ChannelNotificationRule {
  /** Channel ID this rule applies to */
  channelId: string;
  /** Channel name for display */
  channelName?: string;
  /** Channel type */
  channelType?: "public" | "private" | "dm" | "group_dm";
  /** Base notification level */
  level: ChannelNotificationLevel;
  /** Mute state */
  mute: MuteState;
  /** Whether this rule overrides global settings */
  overrideGlobal: boolean;
  /** Delivery method overrides */
  deliveryOverrides: Partial<Record<NotificationDeliveryMethod, boolean>>;
  /** Custom sound for this channel */
  customSound?: string;
  /** Thread notification preferences within this channel */
  threadPreferences: Record<string, ThreadNotificationPreference>;
  /** Default thread notification level for new threads */
  defaultThreadLevel: ThreadNotificationLevel;
  /** Category/group this channel belongs to */
  categoryId?: string;
  /** Notification types that are explicitly allowed even in restricted mode */
  allowedTypes: NotificationType[];
  /** Notification types that are explicitly blocked */
  blockedTypes: NotificationType[];
  /** Minimum priority to notify (notifications below this are suppressed) */
  minimumPriority?: NotificationPriority;
  /** When this rule was created */
  createdAt: string;
  /** When this rule was last updated */
  updatedAt: string;
}

/**
 * Category/group notification settings
 */
export interface ChannelCategoryRule {
  /** Category ID */
  categoryId: string;
  /** Category name */
  name: string;
  /** Notification level for all channels in this category */
  level: ChannelNotificationLevel;
  /** Mute state for the entire category */
  mute: MuteState;
  /** Whether channels in this category can override the category settings */
  allowChannelOverride: boolean;
  /** Delivery method settings for the category */
  deliveryOverrides: Partial<Record<NotificationDeliveryMethod, boolean>>;
  /** Channels in this category */
  channelIds: string[];
  /** When this rule was created */
  createdAt: string;
  /** When this rule was last updated */
  updatedAt: string;
}

/**
 * Result of checking a channel rule
 */
export interface ChannelRuleResult {
  /** Whether the notification should be delivered */
  shouldNotify: boolean;
  /** Effective notification level after resolution */
  effectiveLevel: ChannelNotificationLevel;
  /** Reason why the notification was allowed/blocked */
  reason: string;
  /** Active delivery methods */
  deliveryMethods: NotificationDeliveryMethod[];
  /** Custom sound to use (if any) */
  customSound?: string;
}

/**
 * Store for all channel and category rules
 */
export interface ChannelRuleStore {
  /** Per-channel rules */
  channelRules: Record<string, ChannelNotificationRule>;
  /** Category rules */
  categoryRules: Record<string, ChannelCategoryRule>;
  /** Global default level for channels without rules */
  globalDefaultLevel: ChannelNotificationLevel;
  /** Global default thread level */
  globalDefaultThreadLevel: ThreadNotificationLevel;
}

// ============================================================================
// Constants
// ============================================================================

export const PRIORITY_ORDER: NotificationPriority[] = [
  "urgent",
  "high",
  "normal",
  "low",
];

export const DEFAULT_MUTE_DURATIONS = {
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "2h": 2 * 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "8h": 8 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "1w": 7 * 24 * 60 * 60 * 1000,
} as const;

export type MuteDurationKey = keyof typeof DEFAULT_MUTE_DURATIONS;

// ============================================================================
// Channel Rule Store Factory
// ============================================================================

/**
 * Create a new empty channel rule store
 */
export function createChannelRuleStore(
  defaults?: Partial<ChannelRuleStore>,
): ChannelRuleStore {
  return {
    channelRules: defaults?.channelRules ?? {},
    categoryRules: defaults?.categoryRules ?? {},
    globalDefaultLevel: defaults?.globalDefaultLevel ?? "all",
    globalDefaultThreadLevel:
      defaults?.globalDefaultThreadLevel ?? "participating",
  };
}

// ============================================================================
// Channel Rule CRUD
// ============================================================================

/**
 * Create a new channel notification rule
 */
export function createChannelRule(
  channelId: string,
  options?: Partial<
    Omit<ChannelNotificationRule, "channelId" | "createdAt" | "updatedAt">
  >,
): ChannelNotificationRule {
  const now = new Date().toISOString();
  return {
    channelId,
    channelName: options?.channelName,
    channelType: options?.channelType,
    level: options?.level ?? "all",
    mute: options?.mute ?? { isMuted: false, expiresAt: null },
    overrideGlobal: options?.overrideGlobal ?? true,
    deliveryOverrides: options?.deliveryOverrides ?? {},
    customSound: options?.customSound,
    threadPreferences: options?.threadPreferences ?? {},
    defaultThreadLevel: options?.defaultThreadLevel ?? "participating",
    categoryId: options?.categoryId,
    allowedTypes: options?.allowedTypes ?? [],
    blockedTypes: options?.blockedTypes ?? [],
    minimumPriority: options?.minimumPriority,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Update an existing channel rule in the store
 */
export function updateChannelRule(
  store: ChannelRuleStore,
  channelId: string,
  updates: Partial<Omit<ChannelNotificationRule, "channelId" | "createdAt">>,
): ChannelRuleStore {
  const existing = store.channelRules[channelId];
  if (!existing) {
    // Create new rule with updates
    const newRule = createChannelRule(channelId, updates);
    return {
      ...store,
      channelRules: {
        ...store.channelRules,
        [channelId]: newRule,
      },
    };
  }

  return {
    ...store,
    channelRules: {
      ...store.channelRules,
      [channelId]: {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      },
    },
  };
}

/**
 * Delete a channel rule from the store
 */
export function deleteChannelRule(
  store: ChannelRuleStore,
  channelId: string,
): ChannelRuleStore {
  const { [channelId]: _removed, ...rest } = store.channelRules;
  return {
    ...store,
    channelRules: rest,
  };
}

/**
 * Get a channel rule from the store
 */
export function getChannelRule(
  store: ChannelRuleStore,
  channelId: string,
): ChannelNotificationRule | null {
  return store.channelRules[channelId] ?? null;
}

/**
 * Get all channel rules
 */
export function getAllChannelRules(
  store: ChannelRuleStore,
): ChannelNotificationRule[] {
  return Object.values(store.channelRules);
}

/**
 * Get channel rules filtered by level
 */
export function getChannelRulesByLevel(
  store: ChannelRuleStore,
  level: ChannelNotificationLevel,
): ChannelNotificationRule[] {
  return Object.values(store.channelRules).filter(
    (rule) => rule.level === level,
  );
}

// ============================================================================
// Mute Operations
// ============================================================================

/**
 * Mute a channel with optional duration
 */
export function muteChannelRule(
  store: ChannelRuleStore,
  channelId: string,
  options?: {
    duration?: MuteDurationKey | number;
    reason?: string;
  },
): ChannelRuleStore {
  let expiresAt: string | null = null;

  if (options?.duration) {
    const durationMs =
      typeof options.duration === "number"
        ? options.duration
        : DEFAULT_MUTE_DURATIONS[options.duration];
    expiresAt = new Date(Date.now() + durationMs).toISOString();
  }

  const muteState: MuteState = {
    isMuted: true,
    expiresAt,
    reason: options?.reason,
  };

  return updateChannelRule(store, channelId, { mute: muteState });
}

/**
 * Unmute a channel
 */
export function unmuteChannelRule(
  store: ChannelRuleStore,
  channelId: string,
): ChannelRuleStore {
  return updateChannelRule(store, channelId, {
    mute: { isMuted: false, expiresAt: null },
  });
}

/**
 * Check if a channel is currently muted (respects expiration)
 */
export function isChannelRuleMuted(
  store: ChannelRuleStore,
  channelId: string,
  now?: Date,
): boolean {
  const rule = store.channelRules[channelId];
  if (!rule) return false;

  return isMuteActive(rule.mute, now);
}

/**
 * Check if a mute state is currently active
 */
export function isMuteActive(mute: MuteState, now?: Date): boolean {
  if (!mute.isMuted) return false;

  // Permanent mute (no expiry)
  if (!mute.expiresAt) return true;

  // Check if the mute has expired
  const currentTime = now ?? new Date();
  return new Date(mute.expiresAt) > currentTime;
}

/**
 * Clean up expired mutes in the store
 */
export function cleanupExpiredMutes(
  store: ChannelRuleStore,
  now?: Date,
): ChannelRuleStore {
  const currentTime = now ?? new Date();
  let hasChanges = false;
  const updatedRules: Record<string, ChannelNotificationRule> = {};

  for (const [channelId, rule] of Object.entries(store.channelRules)) {
    if (rule.mute.isMuted && rule.mute.expiresAt) {
      if (new Date(rule.mute.expiresAt) <= currentTime) {
        updatedRules[channelId] = {
          ...rule,
          mute: { isMuted: false, expiresAt: null },
          updatedAt: currentTime.toISOString(),
        };
        hasChanges = true;
        continue;
      }
    }
    updatedRules[channelId] = rule;
  }

  if (!hasChanges) return store;

  return {
    ...store,
    channelRules: updatedRules,
  };
}

// ============================================================================
// Thread Preferences
// ============================================================================

/**
 * Set thread notification preference
 */
export function setThreadPreference(
  store: ChannelRuleStore,
  channelId: string,
  threadId: string,
  preference: Partial<
    Omit<ThreadNotificationPreference, "threadId" | "channelId">
  >,
): ChannelRuleStore {
  const rule = store.channelRules[channelId];
  const baseRule = rule ?? createChannelRule(channelId);

  const existingPref = baseRule.threadPreferences[threadId];

  const threadPref: ThreadNotificationPreference = {
    threadId,
    channelId,
    level:
      preference.level ?? existingPref?.level ?? baseRule.defaultThreadLevel,
    isParticipating:
      preference.isParticipating ?? existingPref?.isParticipating ?? false,
    mute: preference.mute ?? existingPref?.mute,
    lastInteraction:
      preference.lastInteraction ?? existingPref?.lastInteraction,
  };

  return {
    ...store,
    channelRules: {
      ...store.channelRules,
      [channelId]: {
        ...baseRule,
        threadPreferences: {
          ...baseRule.threadPreferences,
          [threadId]: threadPref,
        },
        updatedAt: new Date().toISOString(),
      },
    },
  };
}

/**
 * Remove thread notification preference
 */
export function removeThreadPreference(
  store: ChannelRuleStore,
  channelId: string,
  threadId: string,
): ChannelRuleStore {
  const rule = store.channelRules[channelId];
  if (!rule) return store;

  const { [threadId]: _removed, ...rest } = rule.threadPreferences;

  return {
    ...store,
    channelRules: {
      ...store.channelRules,
      [channelId]: {
        ...rule,
        threadPreferences: rest,
        updatedAt: new Date().toISOString(),
      },
    },
  };
}

/**
 * Get effective thread notification level
 */
export function getEffectiveThreadLevel(
  store: ChannelRuleStore,
  channelId: string,
  threadId: string,
  isParticipating: boolean,
): ThreadNotificationLevel {
  const rule = store.channelRules[channelId];
  const threadPref = rule?.threadPreferences[threadId];

  if (threadPref) {
    // If thread has explicit mute, treat as 'nothing'
    if (threadPref.mute && isMuteActive(threadPref.mute)) {
      return "nothing";
    }
    return threadPref.level;
  }

  // Fall back to channel's default thread level
  const defaultLevel =
    rule?.defaultThreadLevel ?? store.globalDefaultThreadLevel;

  // For 'participating' level, check if user is actually participating
  if (defaultLevel === "participating" && !isParticipating) {
    return "nothing";
  }

  return defaultLevel;
}

// ============================================================================
// Category Rules
// ============================================================================

/**
 * Create a category rule
 */
export function createCategoryRule(
  categoryId: string,
  name: string,
  options?: Partial<
    Omit<ChannelCategoryRule, "categoryId" | "name" | "createdAt" | "updatedAt">
  >,
): ChannelCategoryRule {
  const now = new Date().toISOString();
  return {
    categoryId,
    name,
    level: options?.level ?? "all",
    mute: options?.mute ?? { isMuted: false, expiresAt: null },
    allowChannelOverride: options?.allowChannelOverride ?? true,
    deliveryOverrides: options?.deliveryOverrides ?? {},
    channelIds: options?.channelIds ?? [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Add a category rule to the store
 */
export function addCategoryRule(
  store: ChannelRuleStore,
  category: ChannelCategoryRule,
): ChannelRuleStore {
  return {
    ...store,
    categoryRules: {
      ...store.categoryRules,
      [category.categoryId]: category,
    },
  };
}

/**
 * Update a category rule
 */
export function updateCategoryRule(
  store: ChannelRuleStore,
  categoryId: string,
  updates: Partial<Omit<ChannelCategoryRule, "categoryId" | "createdAt">>,
): ChannelRuleStore {
  const existing = store.categoryRules[categoryId];
  if (!existing) return store;

  return {
    ...store,
    categoryRules: {
      ...store.categoryRules,
      [categoryId]: {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      },
    },
  };
}

/**
 * Delete a category rule
 */
export function deleteCategoryRule(
  store: ChannelRuleStore,
  categoryId: string,
): ChannelRuleStore {
  const { [categoryId]: _removed, ...rest } = store.categoryRules;
  return {
    ...store,
    categoryRules: rest,
  };
}

/**
 * Add a channel to a category
 */
export function addChannelToCategory(
  store: ChannelRuleStore,
  categoryId: string,
  channelId: string,
): ChannelRuleStore {
  const category = store.categoryRules[categoryId];
  if (!category) return store;

  if (category.channelIds.includes(channelId)) return store;

  const updatedStore = updateCategoryRule(store, categoryId, {
    channelIds: [...category.channelIds, channelId],
  });

  // Also update the channel rule to reference the category
  return updateChannelRule(updatedStore, channelId, { categoryId });
}

/**
 * Remove a channel from a category
 */
export function removeChannelFromCategory(
  store: ChannelRuleStore,
  categoryId: string,
  channelId: string,
): ChannelRuleStore {
  const category = store.categoryRules[categoryId];
  if (!category) return store;

  const updatedStore = updateCategoryRule(store, categoryId, {
    channelIds: category.channelIds.filter((id) => id !== channelId),
  });

  // Remove category reference from channel rule
  const channelRule = updatedStore.channelRules[channelId];
  if (channelRule?.categoryId === categoryId) {
    return updateChannelRule(updatedStore, channelId, {
      categoryId: undefined,
    });
  }

  return updatedStore;
}

// ============================================================================
// Rule Resolution
// ============================================================================

/**
 * Check if a notification should be sent for a channel based on rules
 */
export function evaluateChannelRule(
  store: ChannelRuleStore,
  channelId: string,
  notification: {
    type: NotificationType;
    priority: NotificationPriority;
    threadId?: string;
    isParticipating?: boolean;
  },
  now?: Date,
): ChannelRuleResult {
  const currentTime = now ?? new Date();
  const rule = store.channelRules[channelId];

  // 1. Check category-level mute first
  if (rule?.categoryId) {
    const categoryRule = store.categoryRules[rule.categoryId];
    if (categoryRule && isMuteActive(categoryRule.mute, currentTime)) {
      // Category is muted - check if channel can override
      if (!categoryRule.allowChannelOverride || !rule.overrideGlobal) {
        return {
          shouldNotify: false,
          effectiveLevel: "nothing",
          reason: "Category is muted",
          deliveryMethods: [],
        };
      }
    }
  }

  // 2. Check channel-level mute
  if (rule && isMuteActive(rule.mute, currentTime)) {
    return {
      shouldNotify: false,
      effectiveLevel: "nothing",
      reason: "Channel is muted",
      deliveryMethods: [],
    };
  }

  // 3. Determine effective level
  let effectiveLevel: ChannelNotificationLevel =
    rule?.level ?? store.globalDefaultLevel;

  // Apply category level if no channel override
  if (rule?.categoryId && !rule.overrideGlobal) {
    const categoryRule = store.categoryRules[rule.categoryId];
    if (categoryRule) {
      effectiveLevel = categoryRule.level;
    }
  }

  // 4. Check thread-level preferences
  if (notification.threadId) {
    const threadLevel = getEffectiveThreadLevel(
      store,
      channelId,
      notification.threadId,
      notification.isParticipating ?? false,
    );
    if (threadLevel === "nothing") {
      return {
        shouldNotify: false,
        effectiveLevel: "nothing",
        reason: "Thread notifications disabled",
        deliveryMethods: [],
      };
    }
  }

  // 5. Apply notification level logic
  if (effectiveLevel === "nothing") {
    return {
      shouldNotify: false,
      effectiveLevel: "nothing",
      reason: "Channel notifications disabled",
      deliveryMethods: [],
    };
  }

  if (effectiveLevel === "mentions" && notification.type !== "mention") {
    return {
      shouldNotify: false,
      effectiveLevel: "mentions",
      reason: "Channel is set to mentions only",
      deliveryMethods: [],
    };
  }

  // 6. Check blocked/allowed types
  if (rule) {
    if (rule.blockedTypes.includes(notification.type)) {
      return {
        shouldNotify: false,
        effectiveLevel,
        reason: `Notification type '${notification.type}' is blocked for this channel`,
        deliveryMethods: [],
      };
    }

    // Check minimum priority
    if (rule.minimumPriority) {
      const notifPriorityIndex = PRIORITY_ORDER.indexOf(notification.priority);
      const minPriorityIndex = PRIORITY_ORDER.indexOf(rule.minimumPriority);
      if (notifPriorityIndex > minPriorityIndex) {
        return {
          shouldNotify: false,
          effectiveLevel,
          reason: `Notification priority '${notification.priority}' is below minimum '${rule.minimumPriority}'`,
          deliveryMethods: [],
        };
      }
    }
  }

  // 7. Resolve delivery methods
  const deliveryMethods = resolveDeliveryMethods(store, channelId);

  return {
    shouldNotify: true,
    effectiveLevel,
    reason: "Notification allowed",
    deliveryMethods,
    customSound: rule?.customSound,
  };
}

/**
 * Resolve which delivery methods are active for a channel
 */
export function resolveDeliveryMethods(
  store: ChannelRuleStore,
  channelId: string,
): NotificationDeliveryMethod[] {
  const rule = store.channelRules[channelId];
  const allMethods: NotificationDeliveryMethod[] = [
    "desktop",
    "mobile",
    "email",
    "in_app",
  ];

  if (!rule) return allMethods;

  // Start with category overrides if applicable
  let overrides: Partial<Record<NotificationDeliveryMethod, boolean>> = {};

  if (rule.categoryId) {
    const categoryRule = store.categoryRules[rule.categoryId];
    if (categoryRule) {
      overrides = { ...categoryRule.deliveryOverrides };
    }
  }

  // Channel overrides take priority over category
  overrides = { ...overrides, ...rule.deliveryOverrides };

  return allMethods.filter((method) => overrides[method] !== false);
}

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Get all muted channels
 */
export function getMutedChannels(
  store: ChannelRuleStore,
  now?: Date,
): ChannelNotificationRule[] {
  const currentTime = now ?? new Date();
  return Object.values(store.channelRules).filter((rule) =>
    isMuteActive(rule.mute, currentTime),
  );
}

/**
 * Get all channels in a category
 */
export function getChannelsInCategory(
  store: ChannelRuleStore,
  categoryId: string,
): ChannelNotificationRule[] {
  const category = store.categoryRules[categoryId];
  if (!category) return [];

  return category.channelIds
    .map((id) => store.channelRules[id])
    .filter((rule): rule is ChannelNotificationRule => rule != null);
}

/**
 * Get statistics about channel rules
 */
export function getChannelRuleStats(
  store: ChannelRuleStore,
  now?: Date,
): {
  totalRules: number;
  mutedChannels: number;
  mentionsOnlyChannels: number;
  silentChannels: number;
  customChannels: number;
  categoriesCount: number;
  threadPreferencesCount: number;
} {
  const currentTime = now ?? new Date();
  const rules = Object.values(store.channelRules);

  let threadCount = 0;
  for (const rule of rules) {
    threadCount += Object.keys(rule.threadPreferences).length;
  }

  return {
    totalRules: rules.length,
    mutedChannels: rules.filter((r) => isMuteActive(r.mute, currentTime))
      .length,
    mentionsOnlyChannels: rules.filter((r) => r.level === "mentions").length,
    silentChannels: rules.filter((r) => r.level === "nothing").length,
    customChannels: rules.filter((r) => r.level === "custom").length,
    categoriesCount: Object.keys(store.categoryRules).length,
    threadPreferencesCount: threadCount,
  };
}
