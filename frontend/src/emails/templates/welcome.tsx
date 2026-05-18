/**
 * Welcome Email Template
 *
 * Sent when a new user signs up for the platform.
 */

import { Text } from "@react-email/components";
import * as React from "react";
import EmailButton from "../components/EmailButton";
import EmailHeading from "../components/EmailHeading";
import EmailLayout from "../components/EmailLayout";

interface WelcomeEmailProps {
  userName: string;
  appName?: string;
  loginUrl?: string;
  logoUrl?: string;
  supportEmail?: string;
}

export default function WelcomeEmail({
  userName = "there",
  appName = "nChat",
  loginUrl = "http://localhost:3000/login",
  logoUrl,
  supportEmail = "support@example.com",
}: WelcomeEmailProps) {
  const previewText = `Welcome to ${appName}!`;

  return (
    <EmailLayout
      preview={previewText}
      appName={appName}
      logoUrl={logoUrl}
      footerText={`Questions? Email us at ${supportEmail}`}
    >
      <EmailHeading>Welcome to {appName}!</EmailHeading>

      <Text style={paragraph}>Hi {userName},</Text>

      <Text style={paragraph}>
        Thanks for joining {appName}! We're excited to have you on board.
        {appName} is your team communication platform designed to keep everyone
        connected and productive.
      </Text>

      <Text style={paragraph}>Here's what you can do to get started:</Text>

      <ul style={list}>
        <li style={listItem}>Complete your profile</li>
        <li style={listItem}>Join or create channels</li>
        <li style={listItem}>Invite your team members</li>
        <li style={listItem}>Start messaging!</li>
      </ul>

      <EmailButton href={loginUrl}>Get Started</EmailButton>

      <Text style={paragraph}>
        If you have any questions or need help getting started, feel free to
        reach out to our support team at{" "}
        <a href={`mailto:${supportEmail}`} style={link}>
          {supportEmail}
        </a>
        .
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

const link = {
  color: "#38bdf8",
  textDecoration: "underline",
};
