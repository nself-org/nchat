/**
 * Mention Notification Email Template
 *
 * Sent when a user is mentioned in a message.
 */

import { Text, Section } from "@react-email/components";
import * as React from "react";
import EmailButton from "../components/EmailButton";
import EmailHeading from "../components/EmailHeading";
import EmailLayout from "../components/EmailLayout";

interface MentionNotificationEmailProps {
  userName: string;
  appName?: string;
  logoUrl?: string;
  mentionedBy: {
    name: string;
    avatarUrl?: string;
  };
  channel: {
    name: string;
    type: "public" | "private";
  };
  messagePreview: string;
  messageUrl: string;
  timestamp: Date;
}

export default function MentionNotificationEmail({
  userName,
  appName = "nChat",
  logoUrl,
  mentionedBy,
  channel,
  messagePreview,
  messageUrl,
  timestamp,
}: MentionNotificationEmailProps) {
  const previewText = `${mentionedBy.name} mentioned you in #${channel.name}`;

  return (
    <EmailLayout preview={previewText} appName={appName} logoUrl={logoUrl}>
      <EmailHeading>You were mentioned!</EmailHeading>

      <Text style={paragraph}>Hi {userName},</Text>

      <Text style={paragraph}>
        <strong>{mentionedBy.name}</strong> mentioned you in{" "}
        <span style={channelTag}>#{channel.name}</span>:
      </Text>

      <Section style={messageSection}>
        <Text style={messageAuthor}>{mentionedBy.name}</Text>
        <Text style={messageTime}>{formatTimestamp(timestamp)}</Text>
        <Text style={messageContent}>{messagePreview}</Text>
      </Section>

      <EmailButton href={messageUrl}>View Message</EmailButton>

      <Text style={footerNote}>
        This mention was sent {formatTimestamp(timestamp)} in the{" "}
        {channel.type === "private" ? "private" : "public"} channel{" "}
        <strong>#{channel.name}</strong>.
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

const channelTag = {
  backgroundColor: "#f1f5f9",
  padding: "2px 6px",
  borderRadius: "4px",
  fontFamily: "monospace",
  fontSize: "14px",
  color: "#0f172a",
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

const footerNote = {
  fontSize: "14px",
  color: "#94a3b8",
  textAlign: "center" as const,
  margin: "24px 0 0",
  lineHeight: "1.5",
};
