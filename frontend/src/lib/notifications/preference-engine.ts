/**
 * Notification Preference Engine - Central decision engine
 *
 * Composes all notification subsystems into a unified decision engine:
 * - Channel rules
 * - Keyword alerts
 * - Quiet hours / DND
 * - Digest behavior
 * - Global preferences
 *
 * Resolution order: DND > Quiet Hours > Channel Rules > Keyword Alerts > Global Defaults
 */

import type {
  NotificationType,
  NotificationPriority,
  NotificationDeliveryMethod,
} from "./notification-types";

import type { ChannelRuleStore } from "./channel-rules";
import {
  evaluateChannelRule,
  isChannelRuleMuted,
  createChannelRuleStore,
} from "./channel-rules";

import type {
  KeywordAlertDefinition,
  KeywordGroup,
  KeywordAlertResult,
} from "./keyword-alerts-engine";
import { matchKeywordAlerts } from "./keyword-alerts-engine";

import type {
  QuietHoursState,
  QuietHoursCheckResult,
} from "./quiet-hours-engine";
import {
  checkQuietHours,
  isDNDActive,
  createDefaultQuietHoursState,
} from "./quiet-hours-engine";

import type { DigestConfig, DigestEntry, DigestDeliveryState } from "./digest";
import {
  shouldBypassDigest,
  addPendingNotification,
  DEFAULT_DIGEST_CONFIG,
  createDeliveryState,
} from "./digest";

// ============================================================================
// Types
// ============================================================================

/**
 * Incoming notification to evaluate
 */
export interface NotificationInput {
  /** Notification type */
  type: NotificationType;
  /** Priority level */
  priority: NotificationPriority;
  /** Title */
  title: string;
  /** Body/content (used for keyword matching) */
  body: string;
  /** Channel ID */
  channelId?: string;
  /** Channel name */
  channelName?: string;
  /** Thread ID (for thread-level preferences) */
  threadId?: string;
  /** Whether the user is participating in the thread */
  isParticipating?: boolean;
  /** Sender user ID */
  senderId?: string;
  /** Sender name */
  senderName?: string;
  /** Workspace ID */
  workspaceId?: string;
  /** Message ID */
  messageId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Final decision about a notification
 */
export interface NotificationDecision {
  /** Whether the notification should be delivered */
  shouldNotify: boolean;
  /** Whether the notification should be queued for digest instead of immediate delivery */
  shouldDigest: boolean;
  /** Active delivery methods */
  deliveryMethods: NotificationDeliveryMethod[];
  /** Effective priority (may be elevated by keyword alerts) */
  effectivePriority: NotificationPriority;
  /** Platform-specific delivery decisions */
  platformDelivery: PlatformDelivery;
  /** Sound/vibration preferences */
  soundPreference: SoundPreference;
  /** Chain of reasons explaining the decision */
  reasons: string[];
  /** Keyword alert results (if any matched) */
  keywordResult: KeywordAlertResult | null;
  /** Quiet hours check result */
  quietHoursResult: QuietHoursCheckResult;
  /** Whether a keyword alert elevated the priority */
  priorityElevated: boolean;
}

/**
 * Platform-specific delivery settings
 */
export interface PlatformDelivery {
  /** Whether to deliver via push notification */
  push: boolean;
  /** Whether to deliver in-app */
  inApp: boolean;
  /** Whether to deliver via email */
  email: boolean;
  /** Whether to deliver via SMS */
  sms: boolean;
  /** Whether to show desktop notification */
  desktop: boolean;
}

/**
 * Sound and vibration preferences for a notification
 */
export interface SoundPreference {
  /** Whether to play a sound */
  playSound: boolean;
  /** Sound ID to play */
  soundId?: string;
  /** Volume (0-100) */
  volume: number;
  /** Whether to vibrate */
  vibrate: boolean;
}

/**
 * Global notification preferences (simplified for the engine)
 */
export interface GlobalNotificationPrefs {
  /** Whether notifications are globally enabled */
  enabled: boolean;
  /** Push notification enabled */
  pushEnabled: boolean;
  /** Desktop notifications enabled */
  desktopEnabled: boolean;
  /** Email notifications enabled */
  emailEnabled: boolean;
  /** SMS notifications enabled */
  smsEnabled: boolean;
  /** In-app notifications enabled */
  inAppEnabled: boolean;
  /** Sound enabled */
  soundEnabled: boolean;
  /** Sound volume (0-100) */
  soundVolume: number;
  /** Vibration enabled */
  vibrateEnabled: boolean;
  /** Default sound ID */
  defaultSoundId: string;
  /** Notification types that are globally enabled */
  enabledTypes: NotificationType[];
  /** Whether mentions are enabled */
  mentionsEnabled: boolean;
  /** Whether DMs are enabled */
  directMessagesEnabled: boolean;
  /** Whether thread replies are enabled */
  threadRepliesEnabled: boolean;
  /** Whether reactions are enabled */
  reactionsEnabled: boolean;
}

/**
 * Complete preference engine state
 */
export interface PreferenceEngineState {
  /** Global preferences */
  globalPrefs: GlobalNotificationPrefs;
  /** Channel rules store */
  channelRules: ChannelRuleStore;
  /** Keyword alert definitions */
  keywordAlerts: KeywordAlertDefinition[];
  /** Keyword groups */
  keywordGroups: KeywordGroup[];
  /** Quiet hours state */
  quietHours: QuietHoursState;
  /** Digest configuration */
  digestConfig: DigestConfig;
  /** Digest delivery state */
  digestState: DigestDeliveryState;
}

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_GLOBAL_PREFS: GlobalNotificationPrefs = {
  enabled: true,
  pushEnabled: true,
  desktopEnabled: true,
  emailEnabled: false,
  smsEnabled: false,
  inAppEnabled: true,
  soundEnabled: true,
  soundVolume: 80,
  vibrateEnabled: true,
  defaultSoundId: "default",
  enabledTypes: [
    "mention",
    "direct_message",
    "thread_reply",
    "reaction",
    "channel_invite",
    "channel_update",
    "system",
    "announcement",
    "keyword",
  ],
  mentionsEnabled: true,
  directMessagesEnabled: true,
  threadRepliesEnabled: true,
  reactionsEnabled: false,
};

// ============================================================================
// Engine State Management
// ============================================================================

/**
 * Create default preference engine state
 */
export function createPreferenceEngineState(
  overrides?: Partial<PreferenceEngineState>,
): PreferenceEngineState {
  return {
    globalPrefs: overrides?.globalPrefs ?? { ...DEFAULT_GLOBAL_PREFS },
    channelRules: overrides?.channelRules ?? createChannelRuleStore(),
    keywordAlerts: overrides?.keywordAlerts ?? [],
    keywordGroups: overrides?.keywordGroups ?? [],
    quietHours: overrides?.quietHours ?? createDefaultQuietHoursState(),
    digestConfig: overrides?.digestConfig ?? { ...DEFAULT_DIGEST_CONFIG },
    digestState: overrides?.digestState ?? createDeliveryState(),
  };
}

/**
 * Update the engine state with partial changes
 */
export function updateEngineState(
  state: PreferenceEngineState,
  updates: Partial<PreferenceEngineState>,
): PreferenceEngineState {
  return {
    ...state,
    ...updates,
  };
}

// ============================================================================
// Core Decision Engine
// ============================================================================

/**
 * Main entry point: Decide whether and how to deliver a notification
 *
 * Resolution order:
 * 1. Global enabled check
 * 2. Notification type check
 * 3. DND / Quiet Hours check (with breakthrough logic)
 * 4. Channel rules check (includes thread-level)
 * 5. Keyword alerts check (may elevate priority)
 * 6. Digest check (may defer delivery)
 * 7. Platform-specific delivery resolution
 */
export function shouldNotify(
  input: NotificationInput,
  state: PreferenceEngineState,
  now?: Date,
): NotificationDecision {
  const reasons: string[] = [];
  const currentTime = now ?? new Date();

  // 1. Global enabled check
  if (!state.globalPrefs.enabled) {
    reasons.push("Notifications globally disabled");
    return createBlockedDecision(reasons, state);
  }

  // 2. Notification type check
  if (!isTypeEnabled(input.type, state.globalPrefs)) {
    reasons.push(`Notification type '${input.type}' is disabled`);
    return createBlockedDecision(reasons, state);
  }
  reasons.push(`Type '${input.type}' is enabled`);

  // 3. DND / Quiet Hours check
  const quietResult = checkQuietHours(
    state.quietHours,
    {
      type: input.type,
      priority: input.priority,
      senderId: input.senderId,
      channelId: input.channelId,
    },
    currentTime,
  );

  if (quietResult.isQuiet && !quietResult.canBreakThrough) {
    reasons.push(`Blocked by ${quietResult.source}: ${quietResult.reason}`);
    return createBlockedDecision(reasons, state, undefined, quietResult);
  }

  if (quietResult.isQuiet && quietResult.canBreakThrough) {
    reasons.push(
      `Quiet hours active but breaking through: ${quietResult.reason}`,
    );
  }

  // 4. Channel rules check
  let channelDeliveryMethods: NotificationDeliveryMethod[] | null = null;
  let customSound: string | undefined;

  if (input.channelId) {
    const channelResult = evaluateChannelRule(
      state.channelRules,
      input.channelId,
      {
        type: input.type,
        priority: input.priority,
        threadId: input.threadId,
        isParticipating: input.isParticipating,
      },
      currentTime,
    );

    if (!channelResult.shouldNotify) {
      reasons.push(`Blocked by channel rule: ${channelResult.reason}`);
      return createBlockedDecision(reasons, state, undefined, quietResult);
    }

    reasons.push(`Channel rule: ${channelResult.reason}`);
    channelDeliveryMethods = channelResult.deliveryMethods;
    customSound = channelResult.customSound;
  }

  // 5. Keyword alerts check
  let keywordResult: KeywordAlertResult | null = null;
  let effectivePriority = input.priority;
  let priorityElevated = false;

  if (input.body && state.keywordAlerts.length > 0) {
    keywordResult = matchKeywordAlerts(
      input.body,
      state.keywordAlerts,
      state.keywordGroups,
      {
        workspaceId: input.workspaceId,
        channelId: input.channelId,
      },
    );

    if (keywordResult.hasMatches) {
      reasons.push(
        `Keyword alert matched: ${keywordResult.matchedAlertIds.length} alert(s), priority=${keywordResult.highestPriority}`,
      );

      // Elevate priority if keyword alert has higher priority
      const keywordPriority = keywordResult.notificationPriority;
      if (isPriorityHigher(keywordPriority, effectivePriority)) {
        effectivePriority = keywordPriority;
        priorityElevated = true;
        reasons.push(
          `Priority elevated from '${input.priority}' to '${effectivePriority}' by keyword alert`,
        );
      }
    }
  }

  // 6. Digest check
  const shouldDigest = !shouldBypassDigest(state.digestConfig, {
    id: input.messageId ?? "",
    type: input.type,
    priority: effectivePriority,
    title: input.title,
    body: input.body,
    channelId: input.channelId,
    channelName: input.channelName,
    senderId: input.senderId,
    senderName: input.senderName,
    createdAt: currentTime.toISOString(),
    isRead: false,
  } as DigestEntry);

  if (shouldDigest) {
    reasons.push("Notification queued for digest");
  }

  // 7. Platform-specific delivery resolution
  const platformDelivery = resolvePlatformDelivery(
    state.globalPrefs,
    channelDeliveryMethods,
  );

  const deliveryMethods = platformDeliveryToMethods(platformDelivery);

  // 8. Sound preferences
  const soundPreference = resolveSoundPreference(
    state.globalPrefs,
    quietResult,
    customSound,
  );

  reasons.push("Notification allowed");

  return {
    shouldNotify: true,
    shouldDigest,
    deliveryMethods,
    effectivePriority,
    platformDelivery,
    soundPreference,
    reasons,
    keywordResult,
    quietHoursResult: quietResult,
    priorityElevated,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a notification type is globally enabled
 */
function isTypeEnabled(
  type: NotificationType,
  prefs: GlobalNotificationPrefs,
): boolean {
  // Always allow system notifications
  if (type === "system") return true;

  // Check specific toggles
  switch (type) {
    case "mention":
      return prefs.mentionsEnabled;
    case "direct_message":
      return prefs.directMessagesEnabled;
    case "thread_reply":
      return prefs.threadRepliesEnabled;
    case "reaction":
      return prefs.reactionsEnabled;
    default:
      return prefs.enabledTypes.includes(type);
  }
}

/**
 * Check if priority A is higher than priority B
 */
function isPriorityHigher(
  a: NotificationPriority,
  b: NotificationPriority,
): boolean {
  const order: NotificationPriority[] = ["urgent", "high", "normal", "low"];
  return order.indexOf(a) < order.indexOf(b);
}

/**
 * Create a blocked notification decision
 */
function createBlockedDecision(
  reasons: string[],
  state: PreferenceEngineState,
  keywordResult?: KeywordAlertResult | null,
  quietResult?: QuietHoursCheckResult,
): NotificationDecision {
  return {
    shouldNotify: false,
    shouldDigest: false,
    deliveryMethods: [],
    effectivePriority: "normal",
    platformDelivery: {
      push: false,
      inApp: false,
      email: false,
      sms: false,
      desktop: false,
    },
    soundPreference: {
      playSound: false,
      volume: 0,
      vibrate: false,
    },
    reasons,
    keywordResult: keywordResult ?? null,
    quietHoursResult: quietResult ?? {
      isQuiet: false,
      source: "none",
      canBreakThrough: false,
      reason: "",
      endsAt: null,
    },
    priorityElevated: false,
  };
}

/**
 * Resolve platform-specific delivery settings
 */
function resolvePlatformDelivery(
  prefs: GlobalNotificationPrefs,
  channelMethods: NotificationDeliveryMethod[] | null,
): PlatformDelivery {
  const delivery: PlatformDelivery = {
    push: prefs.pushEnabled,
    desktop: prefs.desktopEnabled,
    email: prefs.emailEnabled,
    sms: prefs.smsEnabled,
    inApp: prefs.inAppEnabled,
  };

  // Apply channel-level method restrictions
  if (channelMethods) {
    if (!channelMethods.includes("mobile")) delivery.push = false;
    if (!channelMethods.includes("desktop")) delivery.desktop = false;
    if (!channelMethods.includes("email")) delivery.email = false;
    if (!channelMethods.includes("in_app")) delivery.inApp = false;
  }

  return delivery;
}

/**
 * Convert PlatformDelivery to NotificationDeliveryMethod array
 */
function platformDeliveryToMethods(
  delivery: PlatformDelivery,
): NotificationDeliveryMethod[] {
  const methods: NotificationDeliveryMethod[] = [];
  if (delivery.push) methods.push("mobile");
  if (delivery.desktop) methods.push("desktop");
  if (delivery.email) methods.push("email");
  if (delivery.inApp) methods.push("in_app");
  return methods;
}

/**
 * Resolve sound preferences
 */
function resolveSoundPreference(
  prefs: GlobalNotificationPrefs,
  quietResult: QuietHoursCheckResult,
  customSound?: string,
): SoundPreference {
  // Suppress sound during quiet hours (even if breaking through)
  if (quietResult.isQuiet) {
    return {
      playSound: false,
      volume: 0,
      vibrate: false,
    };
  }

  return {
    playSound: prefs.soundEnabled,
    soundId: customSound ?? prefs.defaultSoundId,
    volume: prefs.soundVolume,
    vibrate: prefs.vibrateEnabled,
  };
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Quick check if notifications are suppressed for a channel
 */
export function isChannelSuppressed(
  channelId: string,
  state: PreferenceEngineState,
  now?: Date,
): boolean {
  if (!state.globalPrefs.enabled) return true;
  if (isDNDActive(state.quietHours, now)) return true;
  if (isChannelRuleMuted(state.channelRules, channelId, now)) return true;
  return false;
}

/**
 * Get a human-readable summary of why a notification was blocked/allowed
 */
export function getDecisionSummary(decision: NotificationDecision): string {
  if (decision.shouldNotify) {
    const methods = decision.deliveryMethods.join(", ");
    const digest = decision.shouldDigest ? " (queued for digest)" : "";
    return `Allowed via ${methods}${digest}. Priority: ${decision.effectivePriority}`;
  }

  return `Blocked: ${decision.reasons[decision.reasons.length - 1] ?? "Unknown reason"}`;
}

/**
 * Create a NotificationPreferenceEngine class for OOP usage
 */
export class NotificationPreferenceEngine {
  private state: PreferenceEngineState;

  constructor(initialState?: Partial<PreferenceEngineState>) {
    this.state = createPreferenceEngineState(initialState);
  }

  /**
   * Evaluate whether a notification should be delivered
   */
  shouldNotify(input: NotificationInput, now?: Date): NotificationDecision {
    return shouldNotify(input, this.state, now);
  }

  /**
   * Get the current engine state
   */
  getState(): PreferenceEngineState {
    return this.state;
  }

  /**
   * Update the engine state
   */
  updateState(updates: Partial<PreferenceEngineState>): void {
    this.state = updateEngineState(this.state, updates);
  }

  /**
   * Update global preferences
   */
  updateGlobalPrefs(updates: Partial<GlobalNotificationPrefs>): void {
    this.state = {
      ...this.state,
      globalPrefs: { ...this.state.globalPrefs, ...updates },
    };
  }

  /**
   * Check if a channel is suppressed
   */
  isChannelSuppressed(channelId: string, now?: Date): boolean {
    return isChannelSuppressed(channelId, this.state, now);
  }

  /**
   * Get a decision summary
   */
  getDecisionSummary(decision: NotificationDecision): string {
    return getDecisionSummary(decision);
  }
}
