/**
 * Email Template Helpers
 *
 * Functions to send specific email types using the templates.
 */

import * as React from "react";
import WelcomeEmail from "@/emails/templates/welcome";
import EmailVerification from "@/emails/templates/email-verification";
import PasswordResetEmail from "@/emails/templates/password-reset";
import PasswordChangedEmail from "@/emails/templates/password-changed";
import NewLoginEmail from "@/emails/templates/new-login";
import MentionNotificationEmail from "@/emails/templates/mention-notification";
import DMNotificationEmail from "@/emails/templates/dm-notification";
import DigestEmail from "@/emails/templates/digest";

import { renderEmailTemplate, getEmailSender } from "./sender";
import type {
  Email,
  EmailRecipient,
  WelcomeEmailData,
  EmailVerificationData,
  PasswordResetData,
  PasswordChangedData,
  NewLoginData,
  MentionNotificationData,
  DMNotificationData,
  DigestEmailData,
  EmailSendResult,
  EmailQueueOptions,
} from "./types";

// ============================================================================
// App Config Helper
// ============================================================================

interface AppEmailBranding {
  appName: string;
  logoUrl?: string;
  supportEmail?: string;
}

let appBranding: AppEmailBranding = {
  appName: "nChat",
  logoUrl: undefined,
  supportEmail: "support@example.com",
};

export function setEmailBranding(branding: Partial<AppEmailBranding>): void {
  appBranding = { ...appBranding, ...branding };
}

// ============================================================================
// Welcome Email
// ============================================================================

export async function sendWelcomeEmail(
  to: EmailRecipient,
  data: WelcomeEmailData,
  options?: EmailQueueOptions,
): Promise<string> {
  const component = React.createElement(WelcomeEmail, {
    userName: data.userName,
    loginUrl: data.loginUrl,
    appName: appBranding.appName,
    logoUrl: appBranding.logoUrl,
    supportEmail: appBranding.supportEmail,
  });

  const { html, text } = await renderEmailTemplate(component);

  const email: Email = {
    to,
    subject: `Welcome to ${appBranding.appName}!`,
    html,
    text,
    tags: ["welcome", "onboarding"],
    metadata: { type: "welcome" },
  };

  const sender = getEmailSender();
  return sender.queue(email, "welcome", { priority: "high", ...options });
}

// ============================================================================
// Email Verification
// ============================================================================

export async function sendEmailVerification(
  to: EmailRecipient,
  data: EmailVerificationData,
  options?: EmailQueueOptions,
): Promise<string> {
  const component = React.createElement(EmailVerification, {
    userName: data.userName,
    verificationUrl: data.verificationUrl,
    verificationCode: data.verificationCode,
    expiresInHours: data.expiresInHours || 24,
    appName: appBranding.appName,
    logoUrl: appBranding.logoUrl,
  });

  const { html, text } = await renderEmailTemplate(component);

  const email: Email = {
    to,
    subject: `Verify your email address`,
    html,
    text,
    tags: ["verification", "security"],
    metadata: { type: "email-verification" },
  };

  const sender = getEmailSender();
  return sender.queue(email, "email-verification", {
    priority: "urgent",
    ...options,
  });
}

// ============================================================================
// Password Reset
// ============================================================================

export async function sendPasswordReset(
  to: EmailRecipient,
  data: PasswordResetData,
  options?: EmailQueueOptions,
): Promise<string> {
  const component = React.createElement(PasswordResetEmail, {
    userName: data.userName,
    resetUrl: data.resetUrl,
    expiresInMinutes: data.expiresInMinutes || 60,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    appName: appBranding.appName,
    logoUrl: appBranding.logoUrl,
  });

  const { html, text } = await renderEmailTemplate(component);

  const email: Email = {
    to,
    subject: `Reset your password`,
    html,
    text,
    tags: ["password-reset", "security"],
    metadata: { type: "password-reset" },
  };

  const sender = getEmailSender();
  return sender.queue(email, "password-reset", {
    priority: "urgent",
    ...options,
  });
}

// ============================================================================
// Password Changed
// ============================================================================

export async function sendPasswordChanged(
  to: EmailRecipient,
  data: PasswordChangedData,
  options?: EmailQueueOptions,
): Promise<string> {
  const component = React.createElement(PasswordChangedEmail, {
    userName: data.userName,
    supportUrl: data.supportUrl,
    ipAddress: data.ipAddress,
    timestamp: data.timestamp,
    appName: appBranding.appName,
    logoUrl: appBranding.logoUrl,
  });

  const { html, text } = await renderEmailTemplate(component);

  const email: Email = {
    to,
    subject: `Your password was changed`,
    html,
    text,
    tags: ["password-changed", "security"],
    metadata: { type: "password-changed" },
  };

  const sender = getEmailSender();
  return sender.queue(email, "password-changed", {
    priority: "high",
    ...options,
  });
}

// ============================================================================
// New Login Alert
// ============================================================================

export async function sendNewLoginAlert(
  to: EmailRecipient,
  data: NewLoginData,
  options?: EmailQueueOptions,
): Promise<string> {
  const component = React.createElement(NewLoginEmail, {
    userName: data.userName,
    securityUrl: data.securityUrl,
    deviceInfo: data.deviceInfo,
    location: data.location,
    ipAddress: data.ipAddress,
    timestamp: data.timestamp,
    appName: appBranding.appName,
    logoUrl: appBranding.logoUrl,
  });

  const { html, text } = await renderEmailTemplate(component);

  const email: Email = {
    to,
    subject: `New login detected`,
    html,
    text,
    tags: ["new-login", "security"],
    metadata: { type: "new-login" },
  };

  const sender = getEmailSender();
  return sender.queue(email, "new-login", { priority: "high", ...options });
}

// ============================================================================
// Mention Notification
// ============================================================================

export async function sendMentionNotification(
  to: EmailRecipient,
  data: MentionNotificationData,
  options?: EmailQueueOptions,
): Promise<string> {
  const component = React.createElement(MentionNotificationEmail, {
    userName: data.userName,
    mentionedBy: data.mentionedBy,
    channel: data.channel,
    messagePreview: data.messagePreview,
    messageUrl: data.messageUrl,
    timestamp: data.timestamp,
    appName: appBranding.appName,
    logoUrl: appBranding.logoUrl,
  });

  const { html, text } = await renderEmailTemplate(component);

  const email: Email = {
    to,
    subject: `${data.mentionedBy.name} mentioned you in #${data.channel.name}`,
    html,
    text,
    tags: ["mention", "notification"],
    metadata: {
      type: "mention-notification",
      channelId: data.channel.name,
      senderId: data.mentionedBy.name,
    },
  };

  const sender = getEmailSender();
  return sender.queue(email, "mention-notification", {
    priority: "normal",
    ...options,
  });
}

// ============================================================================
// Direct Message Notification
// ============================================================================

export async function sendDMNotification(
  to: EmailRecipient,
  data: DMNotificationData,
  options?: EmailQueueOptions,
): Promise<string> {
  const component = React.createElement(DMNotificationEmail, {
    userName: data.userName,
    sender: data.sender,
    messagePreview: data.messagePreview,
    messageUrl: data.messageUrl,
    timestamp: data.timestamp,
    isFirstMessage: data.isFirstMessage,
    appName: appBranding.appName,
    logoUrl: appBranding.logoUrl,
  });

  const { html, text } = await renderEmailTemplate(component);

  const email: Email = {
    to,
    subject: `New message from ${data.sender.name}`,
    html,
    text,
    tags: ["dm", "notification"],
    metadata: {
      type: "dm-notification",
      senderId: data.sender.name,
    },
  };

  const sender = getEmailSender();
  return sender.queue(email, "dm-notification", {
    priority: "normal",
    ...options,
  });
}

// ============================================================================
// Digest Email
// ============================================================================

export async function sendDigest(
  to: EmailRecipient,
  data: DigestEmailData,
  options?: EmailQueueOptions,
): Promise<string> {
  const component = React.createElement(DigestEmail, {
    userName: data.userName,
    frequency: data.frequency,
    dateRange: data.dateRange,
    items: data.items,
    stats: data.stats,
    appUrl: data.appUrl,
    preferencesUrl: data.preferencesUrl,
    appName: appBranding.appName,
    logoUrl: appBranding.logoUrl,
  });

  const { html, text } = await renderEmailTemplate(component);

  const email: Email = {
    to,
    subject: `Your ${data.frequency} ${appBranding.appName} digest`,
    html,
    text,
    tags: ["digest", data.frequency],
    metadata: {
      type: "digest",
      frequency: data.frequency,
    },
  };

  const sender = getEmailSender();
  return sender.queue(email, "digest", { priority: "low", ...options });
}

// ============================================================================
// Send Immediate Email (bypass queue)
// ============================================================================

export async function sendEmailImmediate(
  email: Email,
): Promise<EmailSendResult> {
  const sender = getEmailSender();
  return sender.send(email);
}

// ============================================================================
// Queue Status
// ============================================================================

export function getEmailQueueStatus() {
  const sender = getEmailSender();
  return sender.getQueueStatus();
}

// ============================================================================
// Verify Email Configuration
// ============================================================================

export async function verifyEmailConfig(): Promise<boolean> {
  const sender = getEmailSender();
  return sender.verify();
}
