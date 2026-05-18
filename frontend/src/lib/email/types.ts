/**
 * Email Service Types
 *
 * Type definitions for email sending, queuing, and tracking.
 */

// ============================================================================
// Email Provider Types
// ============================================================================

export type EmailProvider = "smtp" | "sendgrid" | "resend" | "mailgun" | "ses";

export interface EmailConfig {
  provider: EmailProvider;
  from: {
    name: string;
    email: string;
  };
  replyTo?: {
    name: string;
    email: string;
  };
  // SMTP Config
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  // SendGrid Config
  sendgrid?: {
    apiKey: string;
  };
  // Resend Config
  resend?: {
    apiKey: string;
  };
  // Mailgun Config
  mailgun?: {
    apiKey: string;
    domain: string;
  };
  // AWS SES Config
  ses?: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
}

// ============================================================================
// Email Types
// ============================================================================

export type EmailType =
  | "welcome"
  | "email-verification"
  | "password-reset"
  | "password-changed"
  | "new-login"
  | "mention-notification"
  | "dm-notification"
  | "digest"
  | "security-alert"
  | "account-deleted"
  | "team-invite"
  | "custom";

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface Email {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  html: string;
  text?: string;
  from?: EmailRecipient;
  replyTo?: EmailRecipient;
  cc?: EmailRecipient | EmailRecipient[];
  bcc?: EmailRecipient | EmailRecipient[];
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Email Queue Types
// ============================================================================

export interface QueuedEmail extends Email {
  id: string;
  type: EmailType;
  userId?: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: "pending" | "sending" | "sent" | "failed";
  attempts: number;
  maxAttempts: number;
  scheduledFor?: Date;
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
  error?: string;
}

export interface EmailQueueOptions {
  priority?: "low" | "normal" | "high" | "urgent";
  maxAttempts?: number;
  delay?: number; // milliseconds
  scheduledFor?: Date;
}

// ============================================================================
// Email Tracking Types
// ============================================================================

export interface EmailTrackingEvent {
  emailId: string;
  event:
    | "sent"
    | "delivered"
    | "opened"
    | "clicked"
    | "bounced"
    | "complained"
    | "failed";
  timestamp: Date;
  metadata?: {
    link?: string;
    userAgent?: string;
    ipAddress?: string;
    errorMessage?: string;
  };
}

export interface EmailStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  failed: number;
  openRate: number;
  clickRate: number;
}

// ============================================================================
// Email Preferences Types
// ============================================================================

export interface EmailPreferences {
  enabled: boolean;
  types: {
    [K in EmailType]?: boolean;
  };
  frequency: {
    digest: "none" | "hourly" | "daily" | "weekly";
    digestDay?: number; // 0-6 (Sunday-Saturday)
    digestTime?: string; // HH:MM
  };
  unsubscribeToken?: string;
  unsubscribedAt?: Date;
}

// ============================================================================
// Email Template Data Types
// ============================================================================

export interface WelcomeEmailData {
  userName: string;
  loginUrl: string;
}

export interface EmailVerificationData {
  userName?: string;
  verificationUrl: string;
  verificationCode?: string;
  expiresInHours?: number;
}

export interface PasswordResetData {
  userName?: string;
  resetUrl: string;
  expiresInMinutes?: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface PasswordChangedData {
  userName?: string;
  supportUrl?: string;
  ipAddress?: string;
  timestamp?: Date;
}

export interface NewLoginData {
  userName?: string;
  securityUrl?: string;
  deviceInfo?: {
    browser?: string;
    os?: string;
    device?: string;
  };
  location?: {
    city?: string;
    country?: string;
  };
  ipAddress?: string;
  timestamp?: Date;
}

export interface MentionNotificationData {
  userName: string;
  mentionedBy: {
    name: string;
    avatarUrl?: string;
  };
  channel: {
    name: string;
    type: "public" | "private";
  };
  messagePreview: string;
  messageUrl: string;
  timestamp: Date;
}

export interface DMNotificationData {
  userName: string;
  sender: {
    name: string;
    avatarUrl?: string;
  };
  messagePreview: string;
  messageUrl: string;
  timestamp: Date;
  isFirstMessage?: boolean;
}

export interface DigestEmailData {
  userName: string;
  frequency: "daily" | "weekly";
  dateRange: {
    start: Date;
    end: Date;
  };
  items: Array<{
    id: string;
    type: "mention" | "direct_message" | "thread_reply" | "reaction";
    channelName: string;
    senderName: string;
    messagePreview: string;
    url: string;
    timestamp: Date;
  }>;
  stats: {
    totalMessages: number;
    totalMentions: number;
    totalDirectMessages: number;
    totalReactions: number;
    activeChannels: string[];
  };
  appUrl?: string;
  preferencesUrl?: string;
}

export type EmailTemplateData =
  | WelcomeEmailData
  | EmailVerificationData
  | PasswordResetData
  | PasswordChangedData
  | NewLoginData
  | MentionNotificationData
  | DMNotificationData
  | DigestEmailData;

// ============================================================================
// Email Result Types
// ============================================================================

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: EmailProvider;
  timestamp: Date;
}

export interface EmailQueueResult {
  success: boolean;
  emailId?: string;
  error?: string;
}
