/**
 * Multi-Tenant System Types
 *
 * Core types for multi-tenant SaaS architecture.
 * Supports schema-level isolation with row-level security.
 */

export type TenantStatus =
  | "active"
  | "suspended"
  | "trial"
  | "cancelled"
  | "pending";
export type BillingPlan = "free" | "pro" | "enterprise" | "custom";
export type BillingInterval = "monthly" | "yearly";

/**
 * Tenant Entity
 */
export interface Tenant {
  id: string;
  name: string;
  slug: string; // Subdomain identifier (e.g., 'acme' -> acme.nchat.app)
  customDomain?: string; // Optional custom domain (e.g., chat.acme.com)
  status: TenantStatus;

  // Owner Information
  ownerId: string;
  ownerEmail: string;
  ownerName: string;

  // Branding
  branding: TenantBranding;

  // Billing
  billing: TenantBilling;

  // Resource Limits
  limits: TenantLimits;

  // Feature Flags (overrides)
  features: TenantFeatures;

  // Database Isolation
  schemaName: string; // PostgreSQL schema name for this tenant

  // Metadata
  metadata: Record<string, any>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  trialEndsAt?: Date;
  suspendedAt?: Date;
  cancelledAt?: Date;
}

/**
 * Tenant Branding Configuration
 */
export interface TenantBranding {
  appName: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  customCSS?: string;
}

/**
 * Tenant Billing Information
 */
export interface TenantBilling {
  plan: BillingPlan;
  interval: BillingInterval;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;

  // Usage-based billing
  usageTracking: {
    users: number;
    storageBytes: number;
    apiCallsThisMonth: number;
  };

  // Payment history
  lastPaymentDate?: Date;
  lastPaymentAmount?: number;
  lastPaymentStatus?: "succeeded" | "failed" | "pending";
}

/**
 * Tenant Resource Limits
 */
export interface TenantLimits {
  maxUsers: number; // -1 = unlimited
  maxChannels: number;
  maxStorageGB: number; // -1 = unlimited
  maxApiCallsPerMonth: number; // -1 = unlimited
  maxFileUploadSizeMB: number;
  maxCallParticipants: number;
  maxStreamDurationMinutes: number;

  // Rate limiting
  rateLimitPerMinute: number;
  rateLimitPerHour: number;
}

/**
 * Tenant-specific Feature Flags
 */
export interface TenantFeatures {
  // Core Features
  publicChannels: boolean;
  privateChannels: boolean;
  directMessages: boolean;
  threads: boolean;
  reactions: boolean;

  // Advanced Features
  fileUploads: boolean;
  voiceMessages: boolean;
  videoCalls: boolean;
  screenSharing: boolean;
  liveStreaming: boolean;
  endToEndEncryption: boolean;

  // Integrations
  slackIntegration: boolean;
  githubIntegration: boolean;
  webhooks: boolean;

  // Enterprise Features
  ssoEnabled: boolean;
  auditLogs: boolean;
  advancedAnalytics: boolean;
  customBranding: boolean;
  whiteLabel: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
}

/**
 * Tenant Usage Statistics
 */
export interface TenantUsage {
  tenantId: string;
  period: string; // YYYY-MM format

  users: {
    active: number;
    total: number;
  };

  messages: {
    sent: number;
    total: number;
  };

  storage: {
    bytesUsed: number;
    filesCount: number;
  };

  calls: {
    totalMinutes: number;
    totalCalls: number;
  };

  apiCalls: {
    total: number;
    byEndpoint: Record<string, number>;
  };

  createdAt: Date;
}

/**
 * Tenant Subscription Plans
 */
export interface SubscriptionPlan {
  id: BillingPlan;
  name: string;
  description: string;

  pricing: {
    monthly: number; // USD cents
    yearly: number; // USD cents (usually discounted)
  };

  limits: TenantLimits;
  features: TenantFeatures;

  // Stripe integration
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
}

/**
 * Tenant Settings (stored per tenant)
 */
export interface TenantSettings {
  tenantId: string;

  // General
  timezone: string;
  language: string;
  dateFormat: string;

  // Security
  requireEmailVerification: boolean;
  requireTwoFactor: boolean;
  sessionTimeoutMinutes: number;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };

  // Notifications
  emailNotifications: boolean;
  slackNotifications: boolean;
  webhookNotifications: boolean;

  // Data Retention
  messageRetentionDays: number; // 0 = forever
  fileRetentionDays: number;
  auditLogRetentionDays: number;

  updatedAt: Date;
}

/**
 * Tenant Invitation
 */
export interface TenantInvitation {
  id: string;
  tenantId: string;
  email: string;
  role: "owner" | "admin" | "member";
  invitedBy: string;
  token: string;
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
}

/**
 * Tenant Audit Log Entry
 */
export interface TenantAuditLog {
  id: string;
  tenantId: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

/**
 * Tenant Context (used in middleware and API)
 */
export interface TenantContext {
  tenant: Tenant;
  subdomain: string;
  isCustomDomain: boolean;
  schemaName: string;
}

/**
 * Tenant Creation Request
 */
export interface CreateTenantRequest {
  name: string;
  slug: string;
  ownerEmail: string;
  ownerName: string;
  ownerPassword: string;
  plan?: BillingPlan;
  trial?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Tenant Update Request
 */
export interface UpdateTenantRequest {
  name?: string;
  customDomain?: string;
  branding?: Partial<TenantBranding>;
  limits?: Partial<TenantLimits>;
  features?: Partial<TenantFeatures>;
  metadata?: Record<string, any>;
}

/**
 * Default Plans Configuration
 */
export const DEFAULT_PLANS: Record<BillingPlan, SubscriptionPlan> = {
  free: {
    id: "free",
    name: "Free",
    description: "For small teams getting started",
    pricing: {
      monthly: 0,
      yearly: 0,
    },
    limits: {
      maxUsers: 10,
      maxChannels: 5,
      maxStorageGB: 1,
      maxApiCallsPerMonth: 1000,
      maxFileUploadSizeMB: 10,
      maxCallParticipants: 4,
      maxStreamDurationMinutes: 60,
      rateLimitPerMinute: 60,
      rateLimitPerHour: 1000,
    },
    features: {
      publicChannels: true,
      privateChannels: true,
      directMessages: true,
      threads: true,
      reactions: true,
      fileUploads: true,
      voiceMessages: false,
      videoCalls: false,
      screenSharing: false,
      liveStreaming: false,
      endToEndEncryption: false,
      slackIntegration: false,
      githubIntegration: false,
      webhooks: false,
      ssoEnabled: false,
      auditLogs: false,
      advancedAnalytics: false,
      customBranding: false,
      whiteLabel: false,
      apiAccess: false,
      prioritySupport: false,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "For growing teams that need more",
    pricing: {
      monthly: 1500, // $15.00
      yearly: 15000, // $150.00 (2 months free)
    },
    limits: {
      maxUsers: 100,
      maxChannels: 50,
      maxStorageGB: 100,
      maxApiCallsPerMonth: 50000,
      maxFileUploadSizeMB: 100,
      maxCallParticipants: 25,
      maxStreamDurationMinutes: 240,
      rateLimitPerMinute: 120,
      rateLimitPerHour: 5000,
    },
    features: {
      publicChannels: true,
      privateChannels: true,
      directMessages: true,
      threads: true,
      reactions: true,
      fileUploads: true,
      voiceMessages: true,
      videoCalls: true,
      screenSharing: true,
      liveStreaming: true,
      endToEndEncryption: true,
      slackIntegration: true,
      githubIntegration: true,
      webhooks: true,
      ssoEnabled: false,
      auditLogs: true,
      advancedAnalytics: true,
      customBranding: true,
      whiteLabel: false,
      apiAccess: true,
      prioritySupport: false,
    },
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "For large organizations with advanced needs",
    pricing: {
      monthly: 9900, // $99.00
      yearly: 99000, // $990.00 (2 months free)
    },
    limits: {
      maxUsers: -1, // Unlimited
      maxChannels: -1,
      maxStorageGB: -1,
      maxApiCallsPerMonth: -1,
      maxFileUploadSizeMB: 500,
      maxCallParticipants: 100,
      maxStreamDurationMinutes: -1,
      rateLimitPerMinute: 300,
      rateLimitPerHour: 15000,
    },
    features: {
      publicChannels: true,
      privateChannels: true,
      directMessages: true,
      threads: true,
      reactions: true,
      fileUploads: true,
      voiceMessages: true,
      videoCalls: true,
      screenSharing: true,
      liveStreaming: true,
      endToEndEncryption: true,
      slackIntegration: true,
      githubIntegration: true,
      webhooks: true,
      ssoEnabled: true,
      auditLogs: true,
      advancedAnalytics: true,
      customBranding: true,
      whiteLabel: true,
      apiAccess: true,
      prioritySupport: true,
    },
  },
  custom: {
    id: "custom",
    name: "Custom",
    description: "Custom plan with tailored features and pricing",
    pricing: {
      monthly: 0, // Contact sales
      yearly: 0,
    },
    limits: {
      maxUsers: -1,
      maxChannels: -1,
      maxStorageGB: -1,
      maxApiCallsPerMonth: -1,
      maxFileUploadSizeMB: 1000,
      maxCallParticipants: 500,
      maxStreamDurationMinutes: -1,
      rateLimitPerMinute: 600,
      rateLimitPerHour: 30000,
    },
    features: {
      publicChannels: true,
      privateChannels: true,
      directMessages: true,
      threads: true,
      reactions: true,
      fileUploads: true,
      voiceMessages: true,
      videoCalls: true,
      screenSharing: true,
      liveStreaming: true,
      endToEndEncryption: true,
      slackIntegration: true,
      githubIntegration: true,
      webhooks: true,
      ssoEnabled: true,
      auditLogs: true,
      advancedAnalytics: true,
      customBranding: true,
      whiteLabel: true,
      apiAccess: true,
      prioritySupport: true,
    },
  },
};
