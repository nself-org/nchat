/**
 * Email Verification Template
 *
 * Sent when a user needs to verify their email address.
 */

import { Text, Section } from "@react-email/components";
import * as React from "react";
import EmailButton from "../components/EmailButton";
import EmailHeading from "../components/EmailHeading";
import EmailLayout from "../components/EmailLayout";

interface EmailVerificationProps {
  userName?: string;
  verificationUrl: string;
  verificationCode?: string;
  appName?: string;
  logoUrl?: string;
  expiresInHours?: number;
}

export default function EmailVerification({
  userName,
  verificationUrl,
  verificationCode,
  appName = "nChat",
  logoUrl,
  expiresInHours = 24,
}: EmailVerificationProps) {
  const previewText = `Verify your email address for ${appName}`;

  return (
    <EmailLayout preview={previewText} appName={appName} logoUrl={logoUrl}>
      <EmailHeading>Verify Your Email</EmailHeading>

      {userName && <Text style={paragraph}>Hi {userName},</Text>}

      <Text style={paragraph}>
        Thanks for signing up for {appName}! To complete your registration,
        please verify your email address by clicking the button below:
      </Text>

      <EmailButton href={verificationUrl}>Verify Email Address</EmailButton>

      {verificationCode && (
        <Section style={codeSection}>
          <Text style={paragraph}>
            Or enter this verification code manually:
          </Text>
          <Text style={code}>{verificationCode}</Text>
        </Section>
      )}

      <Text style={paragraph}>
        This link will expire in {expiresInHours} hours. If you didn't create an
        account with {appName}, you can safely ignore this email.
      </Text>

      <Text style={warningText}>
        For security reasons, please do not share this email or verification
        link with anyone.
      </Text>

      <Text style={paragraph}>
        Best regards,
        <br />
        The {appName} Team
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

const codeSection = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "16px",
  margin: "16px 0",
  textAlign: "center" as const,
};

const code = {
  fontSize: "32px",
  fontWeight: "bold",
  letterSpacing: "4px",
  color: "#0f172a",
  fontFamily: "monospace",
  display: "inline-block",
};

const warningText = {
  fontSize: "14px",
  lineHeight: "1.5",
  color: "#f59e0b",
  backgroundColor: "#fef3c7",
  padding: "12px",
  borderRadius: "6px",
  margin: "16px 0",
};
