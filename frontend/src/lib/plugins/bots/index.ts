/**
 * Bot Account Lifecycle - Public API
 *
 * Re-exports all bot lifecycle types and managers.
 */

// Types
export type {
  BotAccount,
  BotAccountStatus,
  BotType,
  BotProfileUpdate,
  BotScopeGrant,
  BotCapability,
  BotCapabilityPreset,
  BotInstallation,
  BotInstallationStatus,
  BotRateLimitConfig,
  BotRateLimitResult,
  EndpointRateLimit,
  BotModerationAction,
  BotModerationRecord,
  BotAbuseFlags,
  BotAuditEventType,
  BotAuditEntry,
} from "./types";

export {
  CAPABILITY_PRESET_SCOPES,
  DEFAULT_BOT_RATE_LIMITS,
  BOT_ACCOUNT_TRANSITIONS,
  BOT_INSTALLATION_TRANSITIONS,
  BOT_USERNAME_REGEX,
  MAX_BOT_DESCRIPTION_LENGTH,
  MAX_ACTIVE_CHANNELS,
  MAX_SCOPE_GRANTS,
  isValidBotUsername,
} from "./types";

// Identity
export {
  BotIdentityManager,
  BotAccountStore,
  BotIdentityError,
} from "./bot-identity";

// Scopes
export {
  BotScopeManager,
  BotScopeValidator,
  BotScopeError,
} from "./bot-scopes";

// Rate Limiting
export { BotRateLimiter } from "./bot-rate-limiter";

// Moderation
export {
  BotModerationManager,
  BotModerationStore,
  BotModerationError,
} from "./bot-moderation";

// Lifecycle (main entry point)
export {
  BotLifecycleManager,
  BotInstallationStore,
  BotLifecycleError,
} from "./bot-lifecycle";
