/**
 * Team/Workspace Management Types
 * TypeScript types for comprehensive team and workspace settings
 */

// ============================================================================
// Base Types
// ============================================================================

export type PlanTier =
  | "free"
  | "starter"
  | "professional"
  | "enterprise"
  | "custom";

export type BillingInterval = "monthly" | "yearly";

export type InvitationType = "email" | "link" | "bulk";

export type TeamRole = "owner" | "admin" | "member";

// ============================================================================
// Team Settings Types
// ============================================================================

export interface Team {
  id: string;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  logoUrl?: string;
  coverUrl?: string;
  website?: string;
  industry?: string;
  size?: string;
  timezone?: string;
  language?: string;

  // Defaults
  defaultChannelId?: string;
  defaultRole: TeamRole;

  // Owner
  ownerId: string;
  owner: {
    id: string;
    username: string;
    displayName: string;
    email: string;
    avatarUrl?: string;
  };

  // Timestamps
  createdAt: string;
  updatedAt?: string;

  // Statistics
  memberCount: number;
  channelCount: number;
  messageCount: number;
  storageUsed: number;

  // Status
  isActive: boolean;
  isSuspended: boolean;
  suspensionReason?: string;

  // Metadata
  metadata?: Record<string, unknown>;
}

export interface TeamSettings {
  // General
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  logoUrl?: string;
  website?: string;
  timezone: string;
  language: string;

  // Defaults
  defaultChannelId?: string;
  defaultRole: TeamRole;

  // Features
  features: {
    publicChannels: boolean;
    privateChannels: boolean;
    directMessages: boolean;
    threads: boolean;
    reactions: boolean;
    fileSharing: boolean;
    voiceCalls: boolean;
    videoCalls: boolean;
    screenSharing: boolean;
    customEmojis: boolean;
    guestAccess: boolean;
    externalInvites: boolean;
  };

  // Limits
  limits: {
    maxMembers: number;
    maxChannels: number;
    storageQuota: number; // in GB
    maxFileSize: number; // in MB
    maxCallParticipants: number;
    apiRateLimit: number; // requests per minute
    maxCustomEmojis: number;
    messageRetentionDays: number; // 0 = unlimited
  };

  // Permissions
  permissions: {
    whoCanInvite: "owner" | "admin" | "all";
    whoCanCreateChannels: "owner" | "admin" | "all";
    whoCanDeleteMessages: "owner" | "admin" | "author";
    whoCanMention: "all" | "channels-only";
    allowGuestInvites: boolean;
    requireEmailVerification: boolean;
  };

  // Security
  security: {
    twoFactorRequired: boolean;
    sessionTimeout: number; // minutes
    allowedDomains?: string[];
    blockedDomains?: string[];
    ipWhitelist?: string[];
    enforceStrongPasswords: boolean;
    allowPasswordReset: boolean;
  };

  // Notifications
  notifications: {
    emailNotifications: boolean;
    mentionNotifications: boolean;
    channelNotifications: boolean;
    dmNotifications: boolean;
    digestFrequency: "daily" | "weekly" | "never";
    quietHoursEnabled: boolean;
    quietHoursStart?: string; // HH:mm format
    quietHoursEnd?: string;
  };
}

// ============================================================================
// Team Invitation Types
// ============================================================================

export interface TeamInvitation {
  id: string;
  teamId: string;
  email: string;
  role: TeamRole;
  status: "pending" | "accepted" | "expired" | "revoked";
  token: string;
  inviteUrl: string;
  message?: string;

  invitedBy: {
    id: string;
    username: string;
    displayName: string;
  };

  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
  revokedAt?: string;

  acceptedBy?: {
    id: string;
    username: string;
    displayName: string;
  };
}

export interface InviteEmailInput {
  email: string;
  role: TeamRole;
  message?: string;
  expiresInDays?: number;
  sendEmail?: boolean;
}

export interface InviteBulkInput {
  emails: string[];
  role: TeamRole;
  message?: string;
  expiresInDays?: number;
  sendEmails?: boolean;
}

export interface InviteBulkResult {
  successful: string[];
  failed: { email: string; reason: string }[];
  totalSent: number;
  totalFailed: number;
}

export interface InviteLink {
  id: string;
  teamId: string;
  code: string;
  url: string;
  role: TeamRole;
  maxUses: number | null;
  currentUses: number;
  expiresAt: string;
  isActive: boolean;

  createdBy: {
    id: string;
    username: string;
    displayName: string;
  };

  createdAt: string;
  lastUsedAt?: string;
}

export interface InviteLinkInput {
  role: TeamRole;
  maxUses?: number;
  expiresInDays?: number;
}

// ============================================================================
// Team Member Types
// ============================================================================

export interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  role: TeamRole;

  user: {
    id: string;
    username: string;
    displayName: string;
    email: string;
    avatarUrl?: string;
    isActive: boolean;
    isVerified: boolean;
  };

  joinedAt: string;
  lastSeenAt?: string;

  // Activity
  messagesCount: number;
  channelsCount: number;

  // Settings
  notifications: boolean;
  emailNotifications: boolean;

  // Status
  isActive: boolean;
  isSuspended: boolean;
  suspensionReason?: string;
}

export interface ChangeMemberRoleInput {
  userId: string;
  newRole: TeamRole;
  reason?: string;
}

export interface RemoveMemberInput {
  userId: string;
  reason?: string;
  notifyUser?: boolean;
}

export interface TransferOwnershipInput {
  newOwnerId: string;
  confirmationCode: string;
  notifyTeam?: boolean;
}

// ============================================================================
// Billing Types
// ============================================================================

export interface BillingInfo {
  // Plan
  planTier: PlanTier;
  planName: string;
  planPrice: number;
  billingInterval: BillingInterval;

  // Status
  status: "active" | "trialing" | "past_due" | "canceled" | "unpaid";
  trialEndsAt?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;

  // Payment
  paymentMethod?: {
    type: "card" | "paypal" | "bank_transfer";
    last4?: string;
    brand?: string;
    expiryMonth?: number;
    expiryYear?: number;
  };

  // Next invoice
  nextInvoiceAmount?: number;
  nextInvoiceDate?: string;

  // Stripe/payment provider IDs
  customerId?: string;
  subscriptionId?: string;
}

export interface PlanFeatures {
  name: string;
  description: string;
  price: number;
  interval: BillingInterval;

  features: {
    maxMembers: number;
    maxChannels: number;
    storageQuota: number;
    maxFileSize: number;
    apiRateLimit: number;
    messageHistory: number; // days, 0 = unlimited

    // Feature flags
    advancedRoles: boolean;
    customBranding: boolean;
    ssoIntegration: boolean;
    prioritySupport: boolean;
    auditLogs: boolean;
    dataExport: boolean;
    analytics: boolean;
    customIntegrations: boolean;
    dedicatedSupport: boolean;
  };
}

export interface UsageStatistics {
  period: "current" | "last_30_days" | "all_time";

  // Usage counts
  activeMembers: number;
  totalMembers: number;
  totalChannels: number;
  totalMessages: number;

  // Storage
  storageUsed: number; // in GB
  storageQuota: number;
  storagePercentage: number;

  // API
  apiCallsThisMonth: number;
  apiRateLimit: number;
  apiPercentage: number;

  // Breakdown
  storageByType: {
    files: number;
    images: number;
    videos: number;
    other: number;
  };

  messagesByChannel: {
    channelId: string;
    channelName: string;
    count: number;
  }[];

  activeUsersByDay: {
    date: string;
    count: number;
  }[];
}

export interface ChangePlanInput {
  newPlan: PlanTier;
  interval: BillingInterval;
  prorationBehavior?: "create_prorations" | "none";
}

export interface UpdatePaymentMethodInput {
  paymentMethodId: string;
  setAsDefault?: boolean;
}

// ============================================================================
// Team Deletion Types
// ============================================================================

export interface TeamDeletionRequest {
  teamId: string;
  reason: string;
  confirmationCode: string;
  exportData: boolean;
  deleteImmediately: boolean;
  scheduledForDeletion?: string;
}

export interface TeamExportRequest {
  teamId: string;
  includeMessages: boolean;
  includeFiles: boolean;
  includeUsers: boolean;
  includeSettings: boolean;
  format: "json" | "csv" | "zip";
}

export interface TeamExportResult {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  downloadUrl?: string;
  expiresAt?: string;
  fileSize?: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

// ============================================================================
// Form Types
// ============================================================================

export interface TeamSettingsForm {
  name: string;
  slug: string;
  description: string;
  website: string;
  timezone: string;
  language: string;
  defaultRole: TeamRole;
}

export interface TeamFeaturesForm {
  publicChannels: boolean;
  privateChannels: boolean;
  directMessages: boolean;
  threads: boolean;
  reactions: boolean;
  fileSharing: boolean;
  voiceCalls: boolean;
  videoCalls: boolean;
  screenSharing: boolean;
  customEmojis: boolean;
  guestAccess: boolean;
  externalInvites: boolean;
}

export interface TeamLimitsForm {
  maxMembers: number;
  maxChannels: number;
  storageQuota: number;
  maxFileSize: number;
  maxCallParticipants: number;
  apiRateLimit: number;
  maxCustomEmojis: number;
  messageRetentionDays: number;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface TeamActionResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface TeamValidationError {
  field: string;
  message: string;
}

export interface SlugAvailabilityResult {
  available: boolean;
  slug: string;
  suggestions?: string[];
}
