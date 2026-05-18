/**
 * Email Service - Main Export
 *
 * Central export point for all email-related functionality.
 */

// Types
export type {
  EmailProvider,
  EmailConfig,
  EmailType,
  EmailRecipient,
  EmailAttachment,
  Email,
  QueuedEmail,
  EmailQueueOptions,
  EmailTrackingEvent,
  EmailStats,
  EmailPreferences,
  EmailSendResult,
  EmailQueueResult,
  // Template data types
  WelcomeEmailData,
  EmailVerificationData,
  PasswordResetData,
  PasswordChangedData,
  NewLoginData,
  MentionNotificationData,
  DMNotificationData,
  DigestEmailData,
  EmailTemplateData,
} from "./types";

// Sender
export {
  EmailSender,
  renderEmailTemplate,
  getEmailConfig,
  getEmailSender,
} from "./sender";

// Template functions
export {
  setEmailBranding,
  sendWelcomeEmail,
  sendEmailVerification,
  sendPasswordReset,
  sendPasswordChanged,
  sendNewLoginAlert,
  sendMentionNotification,
  sendDMNotification,
  sendDigest,
  sendEmailImmediate,
  getEmailQueueStatus,
  verifyEmailConfig,
} from "./templates";
