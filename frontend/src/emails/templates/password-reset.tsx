/**
 * Password Reset Email Template
 *
 * Sent when a user requests a password reset.
 */

import { Text, Section, Hr } from "@react-email/components";
import * as React from "react";
import EmailButton from "../components/EmailButton";
import EmailHeading from "../components/EmailHeading";
import EmailLayout from "../components/EmailLayout";

interface PasswordResetEmailProps {
  userName?: string;
  resetUrl: string;
  appName?: string;
  logoUrl?: string;
  expiresInMinutes?: number;
  ipAddress?: string;
  userAgent?: string;
}

export default function PasswordResetEmail({
  userName,
  resetUrl,
  appName = "nChat",
  logoUrl,
  expiresInMinutes = 60,
  ipAddress,
  userAgent,
}: PasswordResetEmailProps) {
  const previewText = `Reset your ${appName} password`;

  return (
    <EmailLayout preview={previewText} appName={appName} logoUrl={logoUrl}>
      <EmailHeading>Reset Your Password</EmailHeading>

      {userName && <Text style={paragraph}>Hi {userName},</Text>}

      <Text style={paragraph}>
        We received a request to reset your password for your {appName} account.
        Click the button below to create a new password:
      </Text>

      <EmailButton href={resetUrl}>Reset Password</EmailButton>

      <Text style={paragraph}>
        This password reset link will expire in{" "}
        <strong>{expiresInMinutes} minutes</strong> for security reasons.
      </Text>

      <Hr style={hr} />

      <Section style={securitySection}>
        <EmailHeading level={3}>Security Information</EmailHeading>

        {ipAddress && (
          <Text style={securityText}>
            <strong>IP Address:</strong> {ipAddress}
          </Text>
        )}

        {userAgent && (
          <Text style={securityText}>
            <strong>Browser:</strong> {userAgent}
          </Text>
        )}

        <Text style={securityText}>
          <strong>Time:</strong> {new Date().toLocaleString()}
        </Text>
      </Section>

      <Text style={warningText}>
        ⚠️ If you didn't request this password reset, please ignore this email
        or contact our support team immediately if you're concerned about your
        account security.
      </Text>

      <Text style={paragraph}>
        For security reasons, we never send password reset links via chat or
        social media. Always verify that the sender is from our official email
        domain.
      </Text>

      <Text style={paragraph}>
        Best regards,
        <br />
        The {appName} Security Team
      </Text>
    </EmailLayout>
  );
}

// ============================================================================
// Styles
// ============================================================================

const paragraph = {
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#334155",
  margin: "0 0 16px",
};

const hr = {
  borderColor: "#e2e8f0",
  margin: "24px 0",
};

const securitySection = {
  backgroundColor: "#f8fafc",
  borderLeft: "4px solid #38bdf8",
  padding: "16px",
  margin: "16px 0",
};

const securityText = {
  fontSize: "14px",
  lineHeight: "1.5",
  color: "#64748b",
  margin: "0 0 8px",
};

const warningText = {
  fontSize: "14px",
  lineHeight: "1.5",
  color: "#dc2626",
  backgroundColor: "#fee2e2",
  padding: "12px",
  borderRadius: "6px",
  margin: "16px 0",
  borderLeft: "4px solid #dc2626",
};
