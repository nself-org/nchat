/**
 * Bot Account Lifecycle Types
 *
 * Comprehensive type definitions for bot identity, scopes, capabilities,
 * installation state, and moderation controls. Builds on top of the app
 * contract system (Task 101) to provide bot-specific lifecycle parity
 * with reference platforms (Slack, Discord, Telegram).
 */

import type { AppScope } from "../app-contract";

// ============================================================================
// BOT IDENTITY
// ============================================================================

/**
 * A bot account with a profile, avatar, and metadata.
 * Mirrors user accounts but is clearly flagged as a bot.
 */
export interface BotAccount {
  /** Unique bot identifier */
  id: string;
  /** Parent app ID (from app-contract) - every bot belongs to an app */
  appId: string;
  /** Bot username (unique, lowercase, alphanumeric + hyphens) */
  username: string;
  /** Display name */
  displayName: string;
  /** Short description (max 200 chars) */
  description: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** Bot homepage URL */
  homepageUrl?: string;
  /** Whether the bot is verified (admin-verified) */
  verified: boolean;
  /** Bot account status */
  status: BotAccountStatus;
  /** Bot type classification */
  botType: BotType;
  /** Version string */
  version: string;
  /** Creator user ID */
  createdBy: string;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Bot account status.
 */
export type BotAccountStatus =
  | "active"
  | "suspended"
  | "disabled"
  | "pending_review"
  | "deleted";

/**
 * Bot type classification.
 */
export type BotType =
  | "automation" // Workflow and task automation
  | "notification" // Push notifications and alerts
  | "moderation" // Content moderation
  | "integration" // Third-party service integrations
  | "ai_assistant" // AI/ML powered assistants
  | "utility" // General utility bots
  | "custom"; // Custom bots

/**
 * Bot profile update payload.
 */
export interface BotProfileUpdate {
  displayName?: string;
  description?: string;
  avatarUrl?: string;
  homepageUrl?: string;
  botType?: BotType;
}

// ============================================================================
// BOT SCOPES
// ============================================================================

/**
 * Bot-specific scope that combines AppScope with bot-level constraints.
 */
export interface BotScopeGrant {
  /** The granted app scope */
  scope: AppScope;
  /** Optional channel restrictions - if set, scope only applies to these channels */
  channelIds?: string[];
  /** Whether this scope was granted at install time (vs runtime) */
  grantedAtInstall: boolean;
  /** Who granted this scope */
  grantedBy: string;
  /** When this scope was granted */
  grantedAt: string;
}

/**
 * Bot capability declaration - what actions a bot intends to perform.
 */
export interface BotCapability {
  /** Capability name */
  name: string;
  /** Human-readable description */
  description: string;
  /** Scopes required for this capability */
  requiredScopes: AppScope[];
  /** Whether this capability is currently active */
  active: boolean;
}

/**
 * Pre-defined capability sets for common bot patterns.
 */
export type BotCapabilityPreset =
  | "read_only" // read:messages, read:channels, read:users
  | "responder" // read + write:messages
  | "moderator" // read + write + admin:moderation
  | "full_access"; // all scopes (requires admin approval)

/**
 * Mapping of capability presets to their required scopes.
 */
export const CAPABILITY_PRESET_SCOPES: Record<BotCapabilityPreset, AppScope[]> =
  {
    read_only: ["read:messages", "read:channels", "read:users"],
    responder: ["read:messages", "read:channels", "write:messages"],
    moderator: [
      "read:messages",
      "read:channels",
      "write:messages",
      "admin:moderation",
    ],
    full_access: ["read:*", "write:*", "admin:*"],
  };

// ============================================================================
// BOT INSTALLATION
// ============================================================================

/**
 * A bot installation within a workspace - represents a running bot instance.
 */
export interface BotInstallation {
  /** Installation ID */
  id: string;
  /** Bot account ID */
  botId: string;
  /** Workspace where installed */
  workspaceId: string;
  /** Scope grants for this installation */
  scopeGrants: BotScopeGrant[];
  /** Channels the bot is active in (empty = all allowed channels) */
  activeChannels: string[];
  /** Installation status */
  status: BotInstallationStatus;
  /** Configuration specific to this installation */
  config: Record<string, unknown>;
  /** Who installed the bot */
  installedBy: string;
  /** When installed */
  installedAt: string;
  /** When last updated */
  updatedAt: string;
}

/**
 * Bot installation status.
 */
export type BotInstallationStatus =
  | "active"
  | "disabled"
  | "suspended"
  | "uninstalled";

// ============================================================================
// BOT RATE LIMITING
// ============================================================================

/**
 * Per-bot rate limit configuration with endpoint-specific overrides.
 */
export interface BotRateLimitConfig {
  /** Global requests per minute for this bot */
  globalRequestsPerMinute: number;
  /** Burst allowance above the base rate */
  burstAllowance: number;
  /** Per-channel message rate (messages per minute per channel) */
  channelMessageRate: number;
  /** Per-endpoint rate overrides */
  endpointOverrides: Record<string, EndpointRateLimit>;
}

/**
 * Rate limit for a specific API endpoint.
 */
export interface EndpointRateLimit {
  requestsPerMinute: number;
  burstAllowance?: number;
}

/**
 * Default bot rate limits (conservative).
 */
export const DEFAULT_BOT_RATE_LIMITS: BotRateLimitConfig = {
  globalRequestsPerMinute: 60,
  burstAllowance: 10,
  channelMessageRate: 10,
  endpointOverrides: {
    "messages:send": { requestsPerMinute: 30, burstAllowance: 5 },
    "messages:edit": { requestsPerMinute: 20 },
    "messages:delete": { requestsPerMinute: 10 },
    "reactions:add": { requestsPerMinute: 20 },
    "files:upload": { requestsPerMinute: 5 },
    "channels:create": { requestsPerMinute: 2 },
    "users:lookup": { requestsPerMinute: 30 },
  },
};

/**
 * Result of a bot rate limit check.
 */
export interface BotRateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
  retryAfterMs: number;
  /** Which limit was hit (global, channel, or endpoint) */
  limitType: "global" | "channel" | "endpoint";
}

// ============================================================================
// BOT MODERATION
// ============================================================================

/**
 * Moderation action that can be taken on a bot.
 */
export type BotModerationAction =
  | "warn" // Issue a warning
  | "restrict" // Restrict to specific channels
  | "rate_reduce" // Reduce rate limits
  | "suspend" // Temporarily suspend
  | "force_uninstall" // Force uninstall from workspace
  | "ban"; // Permanently ban the bot

/**
 * A moderation action record.
 */
export interface BotModerationRecord {
  /** Record ID */
  id: string;
  /** Bot ID */
  botId: string;
  /** Workspace ID (if workspace-specific) */
  workspaceId?: string;
  /** The moderation action */
  action: BotModerationAction;
  /** Reason for the action */
  reason: string;
  /** Who performed the action */
  performedBy: string;
  /** When the action was performed */
  performedAt: string;
  /** When the action expires (for temporary actions like suspend) */
  expiresAt?: string;
  /** Whether this action is currently active */
  active: boolean;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Bot abuse detection flags.
 */
export interface BotAbuseFlags {
  /** Whether the bot is sending messages too fast */
  rateLimitViolations: number;
  /** Whether the bot is attempting scope escalation */
  scopeEscalationAttempts: number;
  /** Whether the bot is spamming channels */
  spamScore: number;
  /** Whether the bot is sending to unauthorized channels */
  unauthorizedChannelAttempts: number;
  /** Last violation timestamp */
  lastViolationAt?: string;
  /** Whether the bot is currently flagged */
  isFlagged: boolean;
}

// ============================================================================
// BOT AUDIT LOG
// ============================================================================

/**
 * Audit log event types for bot actions.
 */
export type BotAuditEventType =
  | "bot.created"
  | "bot.updated"
  | "bot.deleted"
  | "bot.installed"
  | "bot.uninstalled"
  | "bot.enabled"
  | "bot.disabled"
  | "bot.suspended"
  | "bot.unsuspended"
  | "bot.scope_granted"
  | "bot.scope_revoked"
  | "bot.rate_limited"
  | "bot.moderation_action"
  | "bot.abuse_detected"
  | "bot.version_updated"
  | "bot.config_changed";

/**
 * An audit log entry for bot actions.
 */
export interface BotAuditEntry {
  /** Entry ID */
  id: string;
  /** Event type */
  eventType: BotAuditEventType;
  /** Bot ID */
  botId: string;
  /** Who triggered the event (user ID or 'system') */
  actorId: string;
  /** Workspace ID (if applicable) */
  workspaceId?: string;
  /** Event timestamp */
  timestamp: string;
  /** Human-readable description */
  description: string;
  /** Event-specific data */
  data?: Record<string, unknown>;
}

// ============================================================================
// BOT LIFECYCLE STATE MACHINE
// ============================================================================

/**
 * Valid state transitions for bot accounts.
 */
export const BOT_ACCOUNT_TRANSITIONS: Record<
  BotAccountStatus,
  BotAccountStatus[]
> = {
  pending_review: ["active", "suspended", "deleted"],
  active: ["suspended", "disabled", "deleted"],
  suspended: ["active", "deleted"],
  disabled: ["active", "deleted"],
  deleted: [], // Terminal state
};

/**
 * Valid state transitions for bot installations.
 */
export const BOT_INSTALLATION_TRANSITIONS: Record<
  BotInstallationStatus,
  BotInstallationStatus[]
> = {
  active: ["disabled", "suspended", "uninstalled"],
  disabled: ["active", "uninstalled"],
  suspended: ["active", "uninstalled"],
  uninstalled: ["active"], // Allow reinstall
};

// ============================================================================
// VALIDATION
// ============================================================================

/** Bot username regex: lowercase, alphanumeric + hyphens, 3-32 chars */
export const BOT_USERNAME_REGEX = /^[a-z][a-z0-9-]{2,31}$/;

/** Maximum description length */
export const MAX_BOT_DESCRIPTION_LENGTH = 200;

/** Maximum channels per installation */
export const MAX_ACTIVE_CHANNELS = 500;

/** Maximum scope grants per installation */
export const MAX_SCOPE_GRANTS = 50;

/**
 * Validate a bot username.
 */
export function isValidBotUsername(username: string): boolean {
  return BOT_USERNAME_REGEX.test(username);
}
