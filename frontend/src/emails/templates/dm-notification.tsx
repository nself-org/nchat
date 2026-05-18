/**
 * Direct Message Notification Email Template
 *
 * Sent when a user receives a direct message.
 */

import { Text, Section } from "@react-email/components";
import * as React from "react";
import EmailButton from "../components/EmailButton";
import EmailHeading from "../components/EmailHeading";
import EmailLayout from "../components/EmailLayout";

interface DMNotificationEmailProps {
  userName: string;
  appName?: string;
  logoUrl?: string;
  sender: {
    name: string;
    avatarUrl?: string;
  };
  messagePreview: string;
  messageUrl: string;
  timestamp: Date;
  isFirstMessage?: boolean;
}

export default function DMNotificationEmail({
  userName,
  appName = "nChat",
  logoUrl,
  sender,
  messagePreview,
  messageUrl,
  timestamp,
  isFirstMessage = false,
}: DMNotificationEmailProps) {
  const previewText = `New message from ${sender.name}`;

  return (
    <EmailLayout preview={previewText} appName={appName} logoUrl={logoUrl}>
      <EmailHeading>New Direct Message</EmailHeading>

      <Text style={paragraph}>Hi {userName},</Text>

      <Text style={paragraph}>
        <strong>{sender.name}</strong> sent you a {isFirstMessage ? "new " : ""}
        direct message:
      </Text>

      <Section style={messageSection}>
        <Text style={messageAuthor}>{sender.name}</Text>
        <Text style={messageTime}>{formatTimestamp(timestamp)}</Text>
        <Text style={messageContent}>{messagePreview}</Text>
      </Section>

      <EmailButton href={messageUrl}>Reply to Message</EmailButton>

      {isFirstMessage && (
        <Text style={tipBox}>
          💡 <strong>Tip:</strong> You can mute direct message notifications in
          your settings if you prefer fewer emails.
        </Text>
      )}

      <Text style={footerNote}>
        This message was sent {formatTimestamp(timestamp)}.
      </Text>
    </EmailLayout>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) {
    return "just now";
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  } else {
    return date.toLocaleDateString();
  }
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

const messageSection = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderLeft: "4px solid #38bdf8",
  borderRadius: "8px",
  padding: "16px",
  margin: "16px 0",
};

const messageAuthor = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#0f172a",
  margin: "0 0 4px",
};

const messageTime = {
  fontSize: "12px",
  color: "#94a3b8",
  margin: "0 0 12px",
};

const messageContent = {
  fontSize: "15px",
  lineHeight: "1.5",
  color: "#334155",
  margin: "0",
  whiteSpace: "pre-wrap" as const,
};

const tipBox = {
  fontSize: "14px",
  lineHeight: "1.5",
  color: "#0ea5e9",
  backgroundColor: "#f0f9ff",
  padding: "12px",
  borderRadius: "6px",
  margin: "16px 0",
  borderLeft: "4px solid #38bdf8",
};

const footerNote = {
  fontSize: "14px",
  color: "#94a3b8",
  textAlign: "center" as const,
  margin: "24px 0 0",
  lineHeight: "1.5",
};
