/**
 * Email Sender Service
 *
 * Handles sending emails via multiple providers (SMTP, SendGrid, Resend)
 * with queue management, retry logic, and tracking.
 */

import nodemailer from "nodemailer";
import { render } from "@react-email/components";
import type {
  Email,
  EmailConfig,
  EmailProvider,
  EmailSendResult,
  QueuedEmail,
  EmailQueueOptions,
  EmailType,
  EmailTemplateData,
} from "./types";
import { logger } from "@/lib/logger";

// ============================================================================
// Email Sender Class
// ============================================================================

export class EmailSender {
  private config: EmailConfig;
  private transporter: nodemailer.Transporter | null = null;
  private emailQueue: QueuedEmail[] = [];
  private processingQueue = false;
  private retryIntervals = [1000, 5000, 15000, 60000, 300000]; // 1s, 5s, 15s, 1m, 5m

  constructor(config: EmailConfig) {
    this.config = config;
    this.initializeTransporter();
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  private initializeTransporter(): void {
    if (this.config.provider === "smtp" && this.config.smtp) {
      this.transporter = nodemailer.createTransport({
        host: this.config.smtp.host,
        port: this.config.smtp.port,
        secure: this.config.smtp.secure,
        auth: {
          user: this.config.smtp.auth.user,
          pass: this.config.smtp.auth.pass,
        },
      });
    }
  }

  // ==========================================================================
  // Send Email
  // ==========================================================================

  async send(email: Email): Promise<EmailSendResult> {
    const startTime = Date.now();

    try {
      let result: EmailSendResult;

      switch (this.config.provider) {
        case "smtp":
          result = await this.sendViaSMTP(email);
          break;
        case "sendgrid":
          result = await this.sendViaSendGrid(email);
          break;
        case "resend":
          result = await this.sendViaResend(email);
          break;
        default:
          throw new Error(
            `Unsupported email provider: ${this.config.provider}`,
          );
      }

      // REMOVED: console.log(`Email sent via ${this.config.provider} in ${Date.now() - startTime}ms`)
      return result;
    } catch (error) {
      logger.error("Failed to send email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        provider: this.config.provider,
        timestamp: new Date(),
      };
    }
  }

  // ==========================================================================
  // Provider-specific Senders
  // ==========================================================================

  private async sendViaSMTP(email: Email): Promise<EmailSendResult> {
    if (!this.transporter) {
      throw new Error("SMTP transporter not initialized");
    }

    const recipients = Array.isArray(email.to) ? email.to : [email.to];

    const info = await this.transporter.sendMail({
      from: email.from
        ? `"${email.from.name}" <${email.from.email}>`
        : `"${this.config.from.name}" <${this.config.from.email}>`,
      to: recipients
        .map((r) => (r.name ? `"${r.name}" <${r.email}>` : r.email))
        .join(", "),
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo: email.replyTo
        ? `"${email.replyTo.name || ""}" <${email.replyTo.email}>`
        : undefined,
      cc: email.cc
        ? Array.isArray(email.cc)
          ? email.cc.map((r) => `"${r.name || ""}" <${r.email}>`).join(", ")
          : `"${email.cc.name || ""}" <${email.cc.email}>`
        : undefined,
      bcc: email.bcc
        ? Array.isArray(email.bcc)
          ? email.bcc.map((r) => `"${r.name || ""}" <${r.email}>`).join(", ")
          : `"${email.bcc.name || ""}" <${email.bcc.email}>`
        : undefined,
      attachments: email.attachments,
      headers: email.headers,
    });

    return {
      success: true,
      messageId: info.messageId,
      provider: "smtp",
      timestamp: new Date(),
    };
  }

  private async sendViaSendGrid(email: Email): Promise<EmailSendResult> {
    if (!this.config.sendgrid?.apiKey) {
      throw new Error("SendGrid API key not configured");
    }

    // Dynamic import to avoid bundling if not used
    const sgMail = await import("@sendgrid/mail");
    sgMail.default.setApiKey(this.config.sendgrid.apiKey);

    const recipients = Array.isArray(email.to) ? email.to : [email.to];

    const msg = {
      to: recipients.map((r) => ({ email: r.email, name: r.name })),
      from: email.from || this.config.from,
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo: email.replyTo,
      cc: email.cc
        ? Array.isArray(email.cc)
          ? email.cc
          : [email.cc]
        : undefined,
      bcc: email.bcc
        ? Array.isArray(email.bcc)
          ? email.bcc
          : [email.bcc]
        : undefined,
      attachments: email.attachments?.map((a) => ({
        filename: a.filename,
        content:
          typeof a.content === "string"
            ? a.content
            : a.content.toString("base64"),
        type: a.contentType,
      })),
      customArgs: email.metadata as Record<string, string>,
      categories: email.tags,
    };

    const [response] = await sgMail.default.send(msg);

    return {
      success: true,
      messageId: response.headers["x-message-id"] as string,
      provider: "sendgrid",
      timestamp: new Date(),
    };
  }

  private async sendViaResend(email: Email): Promise<EmailSendResult> {
    if (!this.config.resend?.apiKey) {
      throw new Error("Resend API key not configured");
    }

    // Dynamic import
    const { Resend } = await import("resend");
    const resend = new Resend(this.config.resend.apiKey);

    const recipients = Array.isArray(email.to) ? email.to : [email.to];

    const response = await resend.emails.send({
      from: email.from
        ? `${email.from.name} <${email.from.email}>`
        : `${this.config.from.name} <${this.config.from.email}>`,
      to: recipients.map((r) => (r.name ? `${r.name} <${r.email}>` : r.email)),
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo: email.replyTo
        ? `${email.replyTo.name || ""} <${email.replyTo.email}>`
        : undefined,
      cc: email.cc
        ? Array.isArray(email.cc)
          ? email.cc.map((r) => `${r.name || ""} <${r.email}>`)
          : [`${email.cc.name || ""} <${email.cc.email}>`]
        : undefined,
      bcc: email.bcc
        ? Array.isArray(email.bcc)
          ? email.bcc.map((r) => `${r.name || ""} <${r.email}>`)
          : [`${email.bcc.name || ""} <${email.bcc.email}>`]
        : undefined,
      tags: email.tags?.map((tag) => ({ name: tag, value: tag })),
    });

    return {
      success: true,
      messageId: response.data?.id,
      provider: "resend",
      timestamp: new Date(),
    };
  }

  // ==========================================================================
  // Queue Management
  // ==========================================================================

  async queue(
    email: Email,
    type: EmailType,
    options: EmailQueueOptions = {},
  ): Promise<string> {
    const queuedEmail: QueuedEmail = {
      ...email,
      id: this.generateEmailId(),
      type,
      priority: options.priority || "normal",
      status: "pending",
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      scheduledFor: options.scheduledFor,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Insert based on priority
    const insertIndex = this.emailQueue.findIndex(
      (e) =>
        this.getPriorityValue(e.priority) <
        this.getPriorityValue(queuedEmail.priority),
    );

    if (insertIndex === -1) {
      this.emailQueue.push(queuedEmail);
    } else {
      this.emailQueue.splice(insertIndex, 0, queuedEmail);
    }

    // Start processing if not already running
    if (!this.processingQueue) {
      this.processQueue();
    }

    return queuedEmail.id;
  }

  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.emailQueue.length === 0) {
      return;
    }

    this.processingQueue = true;

    while (this.emailQueue.length > 0) {
      const email = this.emailQueue[0];

      // Skip if scheduled for future
      if (email.scheduledFor && email.scheduledFor > new Date()) {
        this.emailQueue.shift();
        this.emailQueue.push(email); // Move to end
        continue;
      }

      // Update status
      email.status = "sending";
      email.updatedAt = new Date();

      const result = await this.send(email);

      if (result.success) {
        email.status = "sent";
        email.sentAt = new Date();
        this.emailQueue.shift();
      } else {
        email.attempts++;

        if (email.attempts >= email.maxAttempts) {
          email.status = "failed";
          email.error = result.error;
          this.emailQueue.shift();
          logger.error(
            `Email ${email.id} failed after ${email.attempts} attempts:`,
            result.error,
          );
        } else {
          // Retry with exponential backoff
          const delay =
            this.retryIntervals[
              Math.min(email.attempts - 1, this.retryIntervals.length - 1)
            ];
          // REMOVED: console.log(
          //   `Retrying email ${email.id} in ${delay}ms (attempt ${email.attempts + 1}/${email.maxAttempts})`
          // )

          email.status = "pending";
          this.emailQueue.shift();

          // Re-queue after delay
          setTimeout(() => {
            this.emailQueue.push(email);
          }, delay);
        }
      }

      email.updatedAt = new Date();

      // Small delay between emails to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.processingQueue = false;
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private getPriorityValue(priority: QueuedEmail["priority"]): number {
    const priorities = { urgent: 4, high: 3, normal: 2, low: 1 };
    return priorities[priority];
  }

  private generateEmailId(): string {
    return `email_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  getQueueLength(): number {
    return this.emailQueue.length;
  }

  getQueueStatus(): {
    total: number;
    pending: number;
    sending: number;
    failed: number;
  } {
    return {
      total: this.emailQueue.length,
      pending: this.emailQueue.filter((e) => e.status === "pending").length,
      sending: this.emailQueue.filter((e) => e.status === "sending").length,
      failed: this.emailQueue.filter((e) => e.status === "failed").length,
    };
  }

  async verify(): Promise<boolean> {
    if (this.config.provider === "smtp" && this.transporter) {
      try {
        await this.transporter.verify();
        return true;
      } catch (error) {
        logger.error("SMTP verification failed:", error);
        return false;
      }
    }
    return true;
  }
}

// ============================================================================
// Email Template Renderer
// ============================================================================

export async function renderEmailTemplate(
  component: React.ReactElement,
): Promise<{ html: string; text: string }> {
  const html = await render(component);
  const text = await render(component, { plainText: true });
  return { html, text };
}

// ============================================================================
// Get Email Config from Environment
// ============================================================================

export function getEmailConfig(): EmailConfig {
  const provider = (process.env.EMAIL_PROVIDER || "smtp") as EmailProvider;

  const config: EmailConfig = {
    provider,
    from: {
      name: process.env.EMAIL_FROM_NAME || "nChat",
      email: process.env.EMAIL_FROM_ADDRESS || "noreply@example.com",
    },
  };

  if (provider === "smtp") {
    config.smtp = {
      host: process.env.SMTP_HOST || "localhost",
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASSWORD || "",
      },
    };
  } else if (provider === "sendgrid") {
    config.sendgrid = {
      apiKey: process.env.SENDGRID_API_KEY || "",
    };
  } else if (provider === "resend") {
    config.resend = {
      apiKey: process.env.RESEND_API_KEY || "",
    };
  }

  return config;
}

// ============================================================================
// Singleton Instance
// ============================================================================

let emailSenderInstance: EmailSender | null = null;

export function getEmailSender(): EmailSender {
  if (!emailSenderInstance) {
    const config = getEmailConfig();
    emailSenderInstance = new EmailSender(config);
  }
  return emailSenderInstance;
}
