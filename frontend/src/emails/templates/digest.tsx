/**
 * Digest Email Template
 *
 * Daily/weekly summary of activity and notifications.
 */

import { Text, Section, Hr } from "@react-email/components";
import * as React from "react";
import EmailButton from "../components/EmailButton";
import EmailHeading from "../components/EmailHeading";
import EmailLayout from "../components/EmailLayout";

interface DigestItem {
  id: string;
  type: "mention" | "direct_message" | "thread_reply" | "reaction";
  channelName: string;
  senderName: string;
  messagePreview: string;
  url: string;
  timestamp: Date;
}

interface DigestStats {
  totalMessages: number;
  totalMentions: number;
  totalDirectMessages: number;
  totalReactions: number;
  activeChannels: string[];
}

interface DigestEmailProps {
  userName: string;
  appName?: string;
  logoUrl?: string;
  frequency: "daily" | "weekly";
  dateRange: {
    start: Date;
    end: Date;
  };
  items: DigestItem[];
  stats: DigestStats;
  appUrl?: string;
  preferencesUrl?: string;
}

export default function DigestEmail({
  userName,
  appName = "nChat",
  logoUrl,
  frequency = "daily",
  dateRange,
  items = [],
  stats,
  appUrl = "http://localhost:3000",
  preferencesUrl = "http://localhost:3000/settings/notifications",
}: DigestEmailProps) {
  const previewText = `Your ${frequency} ${appName} digest`;
  const periodLabel = frequency === "daily" ? "today" : "this week";

  return (
    <EmailLayout preview={previewText} appName={appName} logoUrl={logoUrl}>
      <EmailHeading>
        {frequency === "daily" ? "Daily" : "Weekly"} Digest
      </EmailHeading>

      <Text style={paragraph}>Hi {userName},</Text>

      <Text style={paragraph}>
        Here's what happened {periodLabel} in {appName}:
      </Text>

      {/* Stats Summary */}
      <Section style={statsSection}>
        <table style={statsTable}>
          <tbody>
            <tr>
              <td style={statCell}>
                <Text style={statNumber}>{stats.totalMessages}</Text>
                <Text style={statLabel}>New Messages</Text>
              </td>
              <td style={statCell}>
                <Text style={statNumber}>{stats.totalMentions}</Text>
                <Text style={statLabel}>Mentions</Text>
              </td>
              <td style={statCell}>
                <Text style={statNumber}>{stats.totalDirectMessages}</Text>
                <Text style={statLabel}>Direct Messages</Text>
              </td>
              <td style={statCell}>
                <Text style={statNumber}>{stats.totalReactions}</Text>
                <Text style={statLabel}>Reactions</Text>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      {items.length > 0 ? (
        <>
          <Hr style={hr} />

          <EmailHeading level={2}>Recent Activity</EmailHeading>

          {items.slice(0, 10).map((item, index) => (
            <Section key={item.id} style={activityItem}>
              <Text style={activityHeader}>
                <strong style={activityType}>
                  {item.type === "mention" && "@ Mention"}
                  {item.type === "direct_message" && "💬 Direct Message"}
                  {item.type === "thread_reply" && "💭 Thread Reply"}
                  {item.type === "reaction" && "❤️ Reaction"}
                </strong>
                {" in "}
                <span style={channelName}>#{item.channelName}</span>
              </Text>

              <Text style={senderInfo}>
                {item.senderName} • {formatTimestamp(item.timestamp)}
              </Text>

              <Text style={messagePreview}>{item.messagePreview}</Text>

              <a href={item.url} style={viewLink}>
                View message →
              </a>

              {index < Math.min(items.length, 10) - 1 && (
                <Hr style={itemSeparator} />
              )}
            </Section>
          ))}

          {items.length > 10 && (
            <Text style={moreText}>
              And {items.length - 10} more notification
              {items.length - 10 !== 1 ? "s" : ""}...
            </Text>
          )}
        </>
      ) : (
        <Section style={emptyState}>
          <Text style={emptyText}>
            No new notifications {periodLabel}. Check back later!
          </Text>
        </Section>
      )}

      <Hr style={hr} />

      <EmailButton href={appUrl}>Open {appName}</EmailButton>

      <Text style={footerNote}>
        You're receiving this {frequency} digest because you enabled email
        notifications in your settings.{" "}
        <a href={preferencesUrl} style={link}>
          Update preferences
        </a>
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
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
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

const statsSection = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 0",
};

const statsTable = {
  width: "100%",
  textAlign: "center" as const,
};

const statCell = {
  padding: "0 12px",
};

const statNumber = {
  fontSize: "32px",
  fontWeight: "bold",
  color: "#38bdf8",
  margin: "0 0 4px",
  lineHeight: "1",
};

const statLabel = {
  fontSize: "14px",
  color: "#64748b",
  margin: "0",
  lineHeight: "1",
};

const hr = {
  borderColor: "#e2e8f0",
  margin: "24px 0",
};

const activityItem = {
  margin: "0 0 16px",
};

const activityHeader = {
  fontSize: "16px",
  color: "#0f172a",
  margin: "0 0 4px",
  lineHeight: "1.4",
};

const activityType = {
  color: "#38bdf8",
};

const channelName = {
  color: "#64748b",
  fontWeight: "normal" as const,
};

const senderInfo = {
  fontSize: "14px",
  color: "#94a3b8",
  margin: "0 0 8px",
  lineHeight: "1.4",
};

const messagePreview = {
  fontSize: "15px",
  color: "#334155",
  lineHeight: "1.5",
  margin: "0 0 8px",
};

const viewLink = {
  fontSize: "14px",
  color: "#38bdf8",
  textDecoration: "none",
  fontWeight: "500" as const,
};

const itemSeparator = {
  borderColor: "#f1f5f9",
  margin: "16px 0",
};

const moreText = {
  fontSize: "14px",
  color: "#94a3b8",
  textAlign: "center" as const,
  margin: "16px 0",
  fontStyle: "italic" as const,
};

const emptyState = {
  textAlign: "center" as const,
  padding: "32px 0",
};

const emptyText = {
  fontSize: "16px",
  color: "#94a3b8",
  margin: "0",
};

const footerNote = {
  fontSize: "14px",
  color: "#94a3b8",
  textAlign: "center" as const,
  margin: "24px 0 0",
  lineHeight: "1.5",
};

const link = {
  color: "#38bdf8",
  textDecoration: "underline",
};
