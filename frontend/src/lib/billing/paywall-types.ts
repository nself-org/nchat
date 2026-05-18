/**
 * Paywall Types
 *
 * Type definitions for paywall enforcement across API routes and UI components.
 * Integrates with the entitlement system to provide consistent access control.
 *
 * @module @/lib/billing/paywall-types
 * @version 1.0.0
 */

import type { PlanTier, PlanFeatures } from "@/types/subscription.types";
import type {
  EntitlementCategory,
  EntitlementScope,
  EntitlementSource,
} from "@/lib/entitlements/entitlement-types";
import type { PlanLimits } from "./plan-config";

// ============================================================================
// Core Paywall Types
// ============================================================================

/**
 * Type of paywall restriction.
 */
export type PaywallType =
  | "feature" // Binary feature access
  | "limit" // Numeric limit exceeded
  | "tier" // Plan tier requirement
  | "role" // Role-based restriction
  | "channel" // Channel-specific restriction
  | "time" // Time-based restriction
  | "custom"; // Custom gate restriction

/**
 * Action being performed that requires entitlement check.
 */
export type PaywallAction =
  | "view" // View/read content
  | "create" // Create new resource
  | "update" // Update existing resource
  | "delete" // Delete resource
  | "execute" // Execute action (e.g., start call)
  | "access" // Access feature/area
  | "export" // Export data
  | "configure"; // Configure settings

/**
 * Result of a paywall check.
 */
export interface PaywallCheckResult {
  /** Whether access is allowed */
  allowed: boolean;
  /** Type of restriction if denied */
  type?: PaywallType;
  /** Reason for denial */
  reason?: string;
  /** Denial code for programmatic handling */
  code?: PaywallDenialCode;
  /** Current plan tier */
  currentPlan: PlanTier;
  /** Required plan tier for access */
  requiredPlan?: PlanTier;
  /** Upgrade path information */
  upgrade?: PaywallUpgradeInfo;
  /** Resource usage information (for limits) */
  usage?: PaywallUsageInfo;
  /** Time remaining for time-based restrictions */
  timeRemaining?: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Denial codes for programmatic handling.
 */
export enum PaywallDenialCode {
  // Feature restrictions
  FEATURE_NOT_AVAILABLE = "FEATURE_NOT_AVAILABLE",
  FEATURE_DISABLED = "FEATURE_DISABLED",

  // Limit restrictions
  LIMIT_EXCEEDED = "LIMIT_EXCEEDED",
  LIMIT_APPROACHING = "LIMIT_APPROACHING",
  QUOTA_EXHAUSTED = "QUOTA_EXHAUSTED",

  // Tier restrictions
  TIER_REQUIRED = "TIER_REQUIRED",
  TIER_INSUFFICIENT = "TIER_INSUFFICIENT",

  // Role restrictions
  ROLE_REQUIRED = "ROLE_REQUIRED",
  ROLE_INSUFFICIENT = "ROLE_INSUFFICIENT",

  // Channel restrictions
  CHANNEL_RESTRICTED = "CHANNEL_RESTRICTED",
  CHANNEL_PREMIUM = "CHANNEL_PREMIUM",

  // Time restrictions
  TRIAL_EXPIRED = "TRIAL_EXPIRED",
  SUBSCRIPTION_EXPIRED = "SUBSCRIPTION_EXPIRED",
  OUTSIDE_ALLOWED_HOURS = "OUTSIDE_ALLOWED_HOURS",

  // General
  ACCESS_DENIED = "ACCESS_DENIED",
  UPGRADE_REQUIRED = "UPGRADE_REQUIRED",
  PAYMENT_REQUIRED = "PAYMENT_REQUIRED",
}

/**
 * Upgrade information for paywall prompts.
 */
export interface PaywallUpgradeInfo {
  /** Target plan for upgrade */
  targetPlan: PlanTier;
  /** Target plan name */
  planName: string;
  /** Monthly price in cents */
  monthlyPrice: number;
  /** Yearly price in cents */
  yearlyPrice: number | null;
  /** Features gained by upgrading */
  featuresGained: string[];
  /** Limits increased by upgrading */
  limitsIncreased: PaywallLimitIncrease[];
  /** Upgrade URL */
  upgradeUrl: string;
  /** Promotional message */
  promoMessage?: string;
  /** Trial available for target plan */
  trialAvailable?: boolean;
  /** Trial duration in days */
  trialDays?: number;
}

/**
 * Limit increase information.
 */
export interface PaywallLimitIncrease {
  /** Limit name */
  name: string;
  /** Limit key */
  key: keyof PlanLimits;
  /** Current limit value */
  currentValue: number | null;
  /** New limit value */
  newValue: number | null;
  /** Display unit */
  unit: string;
}

/**
 * Usage information for limit-based paywalls.
 */
export interface PaywallUsageInfo {
  /** Current usage */
  current: number;
  /** Limit value (null = unlimited) */
  limit: number | null;
  /** Remaining quota */
  remaining: number | null;
  /** Usage percentage (0-100) */
  percentage: number | null;
  /** Warning level */
  warningLevel: "none" | "low" | "medium" | "high" | "critical";
  /** Unit for display */
  unit: string;
  /** Reset date for periodic limits */
  resetDate?: Date;
}

// ============================================================================
// Paywall Configuration Types
// ============================================================================

/**
 * Base paywall configuration.
 */
export interface PaywallConfigBase {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description?: string;
  /** Paywall type */
  type: PaywallType;
  /** Action being restricted */
  action: PaywallAction;
  /** Whether this paywall is active */
  enabled: boolean;
  /** Priority for multiple paywalls (higher = checked first) */
  priority: number;
  /** Custom error message */
  errorMessage?: string;
  /** Custom upgrade message */
  upgradeMessage?: string;
  /** Skip for specific roles */
  bypassRoles?: string[];
  /** Skip for specific user IDs */
  bypassUserIds?: string[];
  /** Metadata for UI rendering */
  uiConfig?: PaywallUIConfig;
}

/**
 * Feature-based paywall configuration.
 */
export interface FeaturePaywallConfig extends PaywallConfigBase {
  type: "feature";
  /** Feature key from PlanFeatures */
  feature: keyof PlanFeatures;
  /** Entitlement key override */
  entitlementKey?: string;
}

/**
 * Limit-based paywall configuration.
 */
export interface LimitPaywallConfig extends PaywallConfigBase {
  type: "limit";
  /** Limit key from PlanLimits */
  limit: keyof PlanLimits;
  /** Entitlement key override */
  entitlementKey?: string;
  /** Show warning before limit is reached */
  warningThreshold?: number;
  /** Block when threshold reached (vs warn) */
  hardLimit?: boolean;
  /** Custom limit check function name */
  customCheck?: string;
}

/**
 * Tier-based paywall configuration.
 */
export interface TierPaywallConfig extends PaywallConfigBase {
  type: "tier";
  /** Minimum required tier */
  minimumTier: PlanTier;
  /** Allow custom tier */
  allowCustom?: boolean;
}

/**
 * Role-based paywall configuration.
 */
export interface RolePaywallConfig extends PaywallConfigBase {
  type: "role";
  /** Required roles (any match) */
  allowedRoles?: string[];
  /** Denied roles (any match blocks) */
  deniedRoles?: string[];
}

/**
 * Channel-based paywall configuration.
 */
export interface ChannelPaywallConfig extends PaywallConfigBase {
  type: "channel";
  /** Channel types that require premium */
  premiumChannelTypes?: string[];
  /** Specific channel IDs that are premium */
  premiumChannelIds?: string[];
  /** Feature required for channel access */
  requiredFeature?: keyof PlanFeatures;
}

/**
 * Time-based paywall configuration.
 */
export interface TimePaywallConfig extends PaywallConfigBase {
  type: "time";
  /** Require active subscription */
  requireActiveSubscription?: boolean;
  /** Require active trial */
  requireTrial?: boolean;
  /** Allowed hours (24h format) */
  allowedHours?: { start: number; end: number };
  /** Allowed days of week (0-6, Sunday = 0) */
  allowedDays?: number[];
  /** Timezone for time checks */
  timezone?: string;
}

/**
 * Custom gate paywall configuration.
 */
export interface CustomPaywallConfig extends PaywallConfigBase {
  type: "custom";
  /** Gate function name */
  gateFn: string;
  /** Gate parameters */
  gateParams?: Record<string, unknown>;
}

/**
 * Union of all paywall configurations.
 */
export type PaywallConfig =
  | FeaturePaywallConfig
  | LimitPaywallConfig
  | TierPaywallConfig
  | RolePaywallConfig
  | ChannelPaywallConfig
  | TimePaywallConfig
  | CustomPaywallConfig;

// ============================================================================
// UI Configuration Types
// ============================================================================

/**
 * UI configuration for paywall display.
 */
export interface PaywallUIConfig {
  /** Show inline badge/indicator */
  showBadge?: boolean;
  /** Badge text */
  badgeText?: string;
  /** Badge variant */
  badgeVariant?: "default" | "premium" | "enterprise" | "locked";
  /** Show upgrade modal on access */
  showUpgradeModal?: boolean;
  /** Show inline upgrade prompt */
  showInlinePrompt?: boolean;
  /** Show tooltip on hover */
  showTooltip?: boolean;
  /** Tooltip text */
  tooltipText?: string;
  /** Custom icon */
  icon?: string;
  /** Blur/dim content behind paywall */
  blurContent?: boolean;
  /** Show preview with paywall overlay */
  showPreview?: boolean;
  /** Preview percentage (0-100) */
  previewPercentage?: number;
  /** CTA button text */
  ctaText?: string;
  /** CTA button variant */
  ctaVariant?: "default" | "primary" | "secondary" | "destructive";
}

/**
 * Paywall display mode.
 */
export type PaywallDisplayMode =
  | "hidden" // Completely hide the feature
  | "disabled" // Show but disabled with tooltip
  | "locked" // Show with lock icon/overlay
  | "blurred" // Show blurred preview
  | "modal" // Show upgrade modal on access
  | "inline" // Show inline upgrade prompt
  | "toast"; // Show toast notification

/**
 * Paywall prompt configuration.
 */
export interface PaywallPromptConfig {
  /** Display mode */
  mode: PaywallDisplayMode;
  /** Modal/prompt title */
  title: string;
  /** Modal/prompt description */
  description: string;
  /** Primary CTA */
  primaryCta: {
    text: string;
    action: "upgrade" | "trial" | "contact" | "custom";
    url?: string;
  };
  /** Secondary CTA */
  secondaryCta?: {
    text: string;
    action: "dismiss" | "learn_more" | "custom";
    url?: string;
  };
  /** Show feature comparison */
  showComparison?: boolean;
  /** Show pricing */
  showPricing?: boolean;
  /** Image/illustration URL */
  imageUrl?: string;
  /** Video URL */
  videoUrl?: string;
}

// ============================================================================
// Route Mapping Types
// ============================================================================

/**
 * Route pattern for paywall matching.
 */
export interface PaywallRoutePattern {
  /** Route pattern (supports wildcards) */
  pattern: string;
  /** HTTP methods to match */
  methods?: ("GET" | "POST" | "PUT" | "PATCH" | "DELETE")[];
  /** Paywall configuration */
  config: PaywallConfig;
}

/**
 * Route paywall map for API protection.
 */
export type PaywallRouteMap = Record<string, PaywallConfig | PaywallConfig[]>;

/**
 * Dynamic paywall check function type.
 */
export type PaywallCheckFn = (
  context: PaywallContext,
) => Promise<PaywallCheckResult>;

// ============================================================================
// Context Types
// ============================================================================

/**
 * Paywall check context.
 */
export interface PaywallContext {
  /** User ID */
  userId: string;
  /** User's role */
  userRole?: string;
  /** Organization ID */
  organizationId?: string;
  /** Workspace ID */
  workspaceId?: string;
  /** Channel ID */
  channelId?: string;
  /** Current plan tier */
  planTier: PlanTier;
  /** Subscription status */
  subscriptionStatus?: string;
  /** Is in trial */
  isInTrial?: boolean;
  /** Trial end date */
  trialEndsAt?: Date;
  /** Action being performed */
  action?: PaywallAction;
  /** Resource type */
  resourceType?: string;
  /** Resource ID */
  resourceId?: string;
  /** Request metadata */
  requestMetadata?: {
    path: string;
    method: string;
    headers?: Record<string, string>;
    query?: Record<string, string>;
    body?: unknown;
  };
  /** Additional context */
  metadata?: Record<string, unknown>;
}

/**
 * Paywall enforcement options.
 */
export interface PaywallEnforcementOptions {
  /** Skip cache */
  bypassCache?: boolean;
  /** Include full upgrade info */
  includeUpgradeInfo?: boolean;
  /** Include usage details */
  includeUsageInfo?: boolean;
  /** Custom error handler */
  onDenied?: (result: PaywallCheckResult) => void;
  /** Logging options */
  logging?: {
    enabled?: boolean;
    level?: "debug" | "info" | "warn" | "error";
  };
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Paywall event types.
 */
export type PaywallEventType =
  | "paywall.checked"
  | "paywall.allowed"
  | "paywall.denied"
  | "paywall.bypassed"
  | "paywall.upgrade_shown"
  | "paywall.upgrade_clicked"
  | "paywall.upgrade_completed"
  | "paywall.limit_warning";

/**
 * Paywall event.
 */
export interface PaywallEvent {
  /** Event type */
  type: PaywallEventType;
  /** Timestamp */
  timestamp: Date;
  /** User ID */
  userId: string;
  /** Paywall ID */
  paywallId?: string;
  /** Paywall type */
  paywallType?: PaywallType;
  /** Check result */
  result?: PaywallCheckResult;
  /** Additional data */
  data?: Record<string, unknown>;
}

/**
 * Paywall analytics data.
 */
export interface PaywallAnalytics {
  /** Total checks */
  totalChecks: number;
  /** Allowed count */
  allowedCount: number;
  /** Denied count */
  deniedCount: number;
  /** Bypassed count */
  bypassedCount: number;
  /** Upgrade shown count */
  upgradeShownCount: number;
  /** Upgrade click rate */
  upgradeClickRate: number;
  /** Conversion rate */
  conversionRate: number;
  /** By paywall type */
  byType: Record<PaywallType, { allowed: number; denied: number }>;
  /** By plan */
  byPlan: Record<PlanTier, { allowed: number; denied: number }>;
  /** Top denied features */
  topDeniedFeatures: Array<{ feature: string; count: number }>;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Paywall error codes.
 */
export enum PaywallErrorCode {
  INVALID_CONFIG = "PAYWALL_INVALID_CONFIG",
  MISSING_CONTEXT = "PAYWALL_MISSING_CONTEXT",
  EVALUATION_FAILED = "PAYWALL_EVALUATION_FAILED",
  GATE_NOT_FOUND = "PAYWALL_GATE_NOT_FOUND",
  GATE_ERROR = "PAYWALL_GATE_ERROR",
  UNKNOWN_ERROR = "PAYWALL_UNKNOWN_ERROR",
}

/**
 * Paywall error class.
 */
export class PaywallError extends Error {
  constructor(
    public readonly code: PaywallErrorCode,
    message: string,
    public readonly paywallId?: string,
    public readonly metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "PaywallError";
  }
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Paywall API error response.
 */
export interface PaywallErrorResponse {
  error: "paywall_error" | "upgrade_required" | "limit_exceeded";
  code: PaywallDenialCode;
  message: string;
  currentPlan: PlanTier;
  requiredPlan?: PlanTier;
  upgrade?: {
    planName: string;
    monthlyPrice: number;
    yearlyPrice: number | null;
    upgradeUrl: string;
    trialAvailable: boolean;
    trialDays?: number;
  };
  usage?: {
    current: number;
    limit: number | null;
    remaining: number | null;
    percentage: number | null;
    unit: string;
  };
}

/**
 * Paywall check API response.
 */
export interface PaywallCheckResponse {
  allowed: boolean;
  result?: PaywallCheckResult;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default bypass roles (admin can bypass all paywalls).
 */
export const DEFAULT_BYPASS_ROLES: string[] = ["admin", "owner", "superadmin"];

/**
 * Usage warning thresholds.
 */
export const USAGE_WARNING_THRESHOLDS = {
  low: 50,
  medium: 75,
  high: 90,
  critical: 95,
} as const;

/**
 * Default UI configurations per paywall type.
 */
export const DEFAULT_UI_CONFIGS: Record<PaywallType, PaywallUIConfig> = {
  feature: {
    showBadge: true,
    badgeVariant: "premium",
    showUpgradeModal: true,
    showTooltip: true,
    ctaText: "Upgrade",
    ctaVariant: "primary",
  },
  limit: {
    showBadge: true,
    badgeVariant: "default",
    showInlinePrompt: true,
    showTooltip: true,
    ctaText: "Increase Limit",
    ctaVariant: "secondary",
  },
  tier: {
    showBadge: true,
    badgeVariant: "enterprise",
    showUpgradeModal: true,
    blurContent: true,
    ctaText: "Upgrade Plan",
    ctaVariant: "primary",
  },
  role: {
    showBadge: false,
    showTooltip: true,
    tooltipText: "Contact an admin for access",
  },
  channel: {
    showBadge: true,
    badgeVariant: "locked",
    showPreview: true,
    previewPercentage: 20,
    ctaText: "Unlock Channel",
    ctaVariant: "primary",
  },
  time: {
    showBadge: false,
    showTooltip: true,
  },
  custom: {
    showBadge: false,
    showUpgradeModal: false,
  },
};

/**
 * Plan tier display names.
 */
export const PLAN_TIER_NAMES: Record<PlanTier, string> = {
  free: "Free",
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
  custom: "Custom",
};

/**
 * Feature display names for upgrade prompts.
 */
export const FEATURE_DISPLAY_NAMES: Partial<
  Record<keyof PlanFeatures, string>
> = {
  voiceMessages: "Voice Messages",
  videoCalls: "Video Calls",
  screenSharing: "Screen Sharing",
  customEmoji: "Custom Emoji",
  webhooks: "Webhooks",
  integrations: "Integrations",
  apiAccess: "API Access",
  sso: "SSO / SAML",
  auditLogs: "Audit Logs",
  adminDashboard: "Admin Dashboard",
  prioritySupport: "Priority Support",
  customBranding: "Custom Branding",
  dataExport: "Data Export",
};

/**
 * Limit display names for upgrade prompts.
 */
export const LIMIT_DISPLAY_NAMES: Record<keyof PlanLimits, string> = {
  maxMembers: "Team Members",
  maxChannels: "Channels",
  maxStorageBytes: "Storage",
  maxFileSizeBytes: "File Size",
  maxApiCallsPerMonth: "API Calls",
  maxCallParticipants: "Call Participants",
  maxStreamDurationMinutes: "Stream Duration",
};

/**
 * Limit units for display.
 */
export const LIMIT_UNITS: Record<keyof PlanLimits, string> = {
  maxMembers: "members",
  maxChannels: "channels",
  maxStorageBytes: "GB",
  maxFileSizeBytes: "MB",
  maxApiCallsPerMonth: "calls/month",
  maxCallParticipants: "participants",
  maxStreamDurationMinutes: "minutes",
};
