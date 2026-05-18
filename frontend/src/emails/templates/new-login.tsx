/**
 * New Login Alert Email Template
 *
 * Sent when a login occurs from a new device or location.
 */

import { Text, Section } from "@react-email/components";
import * as React from "react";
import EmailButton from "../components/EmailButton";
import EmailHeading from "../components/EmailHeading";
import EmailLayout from "../components/EmailLayout";

interface NewLoginEmailProps {
  userName?: string;
  appName?: string;
  logoUrl?: string;
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

export default function NewLoginEmail({
  userName,
  appName = "nChat",
  logoUrl,
  securityUrl = "http://localhost:3000/settings/security",
  deviceInfo,
  location,
  ipAddress,
  timestamp = new Date(),
}: NewLoginEmailProps) {
  const previewText = `New login to your ${appName} account`;

  return (
    <EmailLayout preview={previewText} appName={appName} logoUrl={logoUrl}>
      <EmailHeading>New Login Detected</EmailHeading>

      {userName && <Text style={paragraph}>Hi {userName},</Text>}

      <Text style={paragraph}>
        We detected a new login to your {appName} account. If this was you, you
        can safely ignore this email.
      </Text>

      <Section style={infoSection}>
        <EmailHeading level={3}>Login Details</EmailHeading>

        <Text style={infoText}>
          <strong>Time:</strong> {timestamp.toLocaleString()}
        </Text>

        {deviceInfo?.browser && (
          <Text style={infoText}>
            <strong>Browser:</strong> {deviceInfo.browser}
          </Text>
        )}

        {deviceInfo?.os && (
          <Text style={infoText}>
            <strong>Operating System:</strong> {deviceInfo.os}
          </Text>
        )}

        {deviceInfo?.device && (
          <Text style={infoText}>
            <strong>Device:</strong> {deviceInfo.device}
          </Text>
        )}

        {location?.city && location?.country && (
          <Text style={infoText}>
            <strong>Location:</strong> {location.city}, {location.country}
          </Text>
        )}

        {ipAddress && (
          <Text style={infoText}>
            <strong>IP Address:</strong> {ipAddress}
          </Text>
        )}
      </Section>

      <Text style={warningText}>
        ⚠️ If this wasn't you, your account may be compromised. Please secure
        your account immediately.
      </Text>

      <EmailButton href={securityUrl} variant="danger">
        Review Security Settings
      </EmailButton>

      <Text style={paragraph}>We recommend taking these steps:</Text>

      <ul style={list}>
        <li style={listItem}>Change your password immediately</li>
        <li style={listItem}>Enable two-factor authentication</li>
        <li style={listItem}>
          Review active sessions and sign out unknown devices
        </li>
        <li style={listItem}>Check your recent account activity</li>
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
