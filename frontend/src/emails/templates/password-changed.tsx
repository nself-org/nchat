/**
 * Password Changed Email Template
 *
 * Sent when a user successfully changes their password.
 */

import { Text, Section } from "@react-email/components";
import * as React from "react";
import EmailButton from "../components/EmailButton";
import EmailHeading from "../components/EmailHeading";
import EmailLayout from "../components/EmailLayout";

interface PasswordChangedEmailProps {
  userName?: string;
  appName?: string;
  logoUrl?: string;
  supportUrl?: string;
  ipAddress?: string;
  timestamp?: Date;
}

export default function PasswordChangedEmail({
  userName,
  appName = "nChat",
  logoUrl,
  supportUrl = "http://localhost:3000/support",
  ipAddress,
  timestamp = new Date(),
}: PasswordChangedEmailProps) {
  const previewText = `Your ${appName} password was changed`;

  return (
    <EmailLayout preview={previewText} appName={appName} logoUrl={logoUrl}>
      <EmailHeading>Password Changed Successfully</EmailHeading>

      {userName && <Text style={paragraph}>Hi {userName},</Text>}

      <Text style={paragraph}>
        This email confirms that your {appName} password was successfully
        changed.
      </Text>

      <Section style={infoSection}>
        <Text style={infoText}>
          <strong>Time:</strong> {timestamp.toLocaleString()}
        </Text>
        {ipAddress && (
          <Text style={infoText}>
            <strong>IP Address:</strong> {ipAddress}
          </Text>
        )}
      </Section>

      <Text style={warningText}>
        ⚠️ If you didn't make this change, your account may be compromised.
        Please contact our support team immediately.
      </Text>

      <EmailButton href={supportUrl} variant="danger">
        Report Unauthorized Change
      </EmailButton>

      <Text style={paragraph}>For your security, we recommend:</Text>

      <ul style={list}>
        <li style={listItem}>Using a unique, strong password</li>
        <li style={listItem}>Enabling two-factor authentication</li>
        <li style={listItem}>Reviewing your recent login activity</li>
      </ul>

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

const infoSection = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "16px",
  margin: "16px 0",
};

const infoText = {
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

const list = {
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#334155",
  margin: "0 0 16px",
  paddingLeft: "20px",
};

const listItem = {
  marginBottom: "8px",
};
