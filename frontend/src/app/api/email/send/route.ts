/**
 * Email Send API Route
 *
 * Handles sending emails via API.
 * POST /api/email/send
 */

import { NextRequest, NextResponse } from "next/server";
import {
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
} from "@/lib/email/templates";
import type {
  EmailRecipient,
  EmailType,
  WelcomeEmailData,
  EmailVerificationData,
  PasswordResetData,
  PasswordChangedData,
  NewLoginData,
  MentionNotificationData,
  DMNotificationData,
  DigestEmailData,
  Email,
  EmailQueueOptions,
} from "@/lib/email/types";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

interface SendEmailRequest {
  type: EmailType;
  to: EmailRecipient;
  data: any;
  options?: EmailQueueOptions;
}

interface SendRawEmailRequest {
  email: Email;
  immediate?: boolean;
}

// ============================================================================
// POST /api/email/send
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle raw email sending
    if ("email" in body) {
      return handleRawEmail(body as SendRawEmailRequest);
    }

    // Handle templated email sending
    if ("type" in body && "to" in body && "data" in body) {
      return handleTemplatedEmail(body as SendEmailRequest);
    }

    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  } catch (error) {
    logger.error("Email send error:", error);
    return NextResponse.json(
      {
        error: "Failed to send email",
        details:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// Handle Raw Email
// ============================================================================

async function handleRawEmail(request: SendRawEmailRequest) {
  const { email, immediate = false } = request;

  if (immediate) {
    const result = await sendEmailImmediate(email);
    return NextResponse.json(result);
  }

  // Queue email with default type
  const { getEmailSender } = await import("@/lib/email/sender");
  const sender = getEmailSender();
  const emailId = await sender.queue(email, "custom");

  return NextResponse.json({
    success: true,
    emailId,
  });
}

// ============================================================================
// Handle Templated Email
// ============================================================================

async function handleTemplatedEmail(request: SendEmailRequest) {
  const { type, to, data, options } = request;

  let emailId: string;

  switch (type) {
    case "welcome":
      emailId = await sendWelcomeEmail(to, data as WelcomeEmailData, options);
      break;

    case "email-verification":
      emailId = await sendEmailVerification(
        to,
        data as EmailVerificationData,
        options,
      );
      break;

    case "password-reset":
      emailId = await sendPasswordReset(to, data as PasswordResetData, options);
      break;

    case "password-changed":
      emailId = await sendPasswordChanged(
        to,
        data as PasswordChangedData,
        options,
      );
      break;

    case "new-login":
      emailId = await sendNewLoginAlert(to, data as NewLoginData, options);
      break;

    case "mention-notification":
      emailId = await sendMentionNotification(
        to,
        data as MentionNotificationData,
        options,
      );
      break;

    case "dm-notification":
      emailId = await sendDMNotification(
        to,
        data as DMNotificationData,
        options,
      );
      break;

    case "digest":
      emailId = await sendDigest(to, data as DigestEmailData, options);
      break;

    default:
      return NextResponse.json(
        { error: `Unsupported email type: ${type}` },
        { status: 400 },
      );
  }

  return NextResponse.json({
    success: true,
    emailId,
    type,
  });
}

// ============================================================================
// GET /api/email/send - Get queue status
// ============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "status") {
    const status = getEmailQueueStatus();
    return NextResponse.json(status);
  }

  if (action === "verify") {
    const isValid = await verifyEmailConfig();
    return NextResponse.json({ valid: isValid });
  }

  return NextResponse.json(
    { error: "Invalid action. Use ?action=status or ?action=verify" },
    { status: 400 },
  );
}
