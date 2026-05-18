/**
 * Jira Notification Formatter
 *
 * Formats Jira webhook payloads into user-friendly notifications
 * for display in the chat interface.
 */

import type { JiraUser, JiraIssue, JiraStatus, JiraPriority } from "../types";

import type {
  JiraWebhookPayload,
  JiraComment,
  JiraIssueChange,
  JiraSprint,
} from "./types";

// ============================================================================
// Types
// ============================================================================

export interface FormattedJiraNotification {
  title: string;
  body: string;
  url?: string;
  icon: JiraNotificationIcon;
  color: JiraNotificationColor;
  timestamp: string;
  metadata: JiraNotificationMetadata;
}

export type JiraNotificationIcon =
  | "issue-created"
  | "issue-updated"
  | "issue-deleted"
  | "issue-assigned"
  | "issue-resolved"
  | "issue-closed"
  | "issue-reopened"
  | "comment"
  | "attachment"
  | "sprint"
  | "board"
  | "project"
  | "worklog"
  | "jira";

export type JiraNotificationColor =
  | "green" // created, resolved
  | "blue" // updated, comment
  | "purple" // in progress
  | "red" // deleted, blocked
  | "yellow" // warning, to do
  | "gray"; // neutral

export interface JiraNotificationMetadata {
  eventType: string;
  issueKey?: string;
  issueId?: string;
  projectKey?: string;
  userAccountId: string;
  userDisplayName: string;
  userAvatarUrl?: string;
  status?: string;
  priority?: string;
  labels?: string[];
}

// ============================================================================
// Main Formatter
// ============================================================================

/**
 * Format a Jira webhook payload into a notification
 */
export function formatJiraNotification(
  payload: JiraWebhookPayload,
): FormattedJiraNotification {
  const eventType = payload.webhookEvent;

  // Route to specific formatter based on event type
  if (eventType.startsWith("jira:issue_")) {
    return formatIssueEvent(payload);
  }

  if (eventType.startsWith("comment_")) {
    return formatCommentEvent(payload);
  }

  if (eventType.startsWith("sprint_")) {
    return formatSprintEvent(payload);
  }

  if (eventType.startsWith("attachment_")) {
    return formatAttachmentEvent(payload);
  }

  return formatUnknownEvent(payload);
}

// ============================================================================
// Event-Specific Formatters
// ============================================================================

/**
 * Format issue events
 */
function formatIssueEvent(
  payload: JiraWebhookPayload,
): FormattedJiraNotification {
  const { webhookEvent, issue_event_type_name, user, issue, changelog } =
    payload;

  if (!issue) {
    return formatUnknownEvent(payload);
  }

  const issueKey = issue.key;
  const issueUrl = issue.self
    ? `${getBaseUrl(issue.self)}/browse/${issueKey}`
    : undefined;
  const userInfo = formatUserInfo(user);

  // Determine specific action
  let title: string;
  let body: string;
  let icon: JiraNotificationIcon = "jira";
  let color: JiraNotificationColor = "blue";

  switch (webhookEvent) {
    case "jira:issue_created":
      title = `Issue Created: ${issueKey}`;
      body = `${userInfo.displayName} created "${issue.fields.summary}"`;
      icon = "issue-created";
      color = "green";
      break;

    case "jira:issue_updated":
      const changes = formatChangelog(changelog?.items || []);
      title = `Issue Updated: ${issueKey}`;
      body = `${userInfo.displayName} updated "${issue.fields.summary}"${changes ? `\n${changes}` : ""}`;
      icon = getUpdateIcon(issue_event_type_name, changelog?.items);
      color = getUpdateColor(issue_event_type_name, changelog?.items);
      break;

    case "jira:issue_deleted":
      title = `Issue Deleted: ${issueKey}`;
      body = `${userInfo.displayName} deleted "${issue.fields.summary}"`;
      icon = "issue-deleted";
      color = "red";
      break;

    default:
      title = `Issue ${webhookEvent.replace("jira:issue_", "")}: ${issueKey}`;
      body = `${userInfo.displayName} performed action on "${issue.fields.summary}"`;
  }

  return {
    title,
    body,
    url: issueUrl,
    icon,
    color,
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: webhookEvent,
      issueKey: issue.key,
      issueId: issue.id,
      projectKey: issue.fields.project.key,
      userAccountId: user.accountId,
      userDisplayName: user.displayName,
      userAvatarUrl: user.avatarUrls?.["48x48"],
      status: issue.fields.status?.name,
      priority: issue.fields.priority?.name,
      labels: issue.fields.labels,
    },
  };
}

/**
 * Format comment events
 */
function formatCommentEvent(
  payload: JiraWebhookPayload,
): FormattedJiraNotification {
  const { webhookEvent, user, issue, comment } = payload;

  if (!issue || !comment) {
    return formatUnknownEvent(payload);
  }

  const issueKey = issue.key;
  const issueUrl = issue.self
    ? `${getBaseUrl(issue.self)}/browse/${issueKey}`
    : undefined;
  const userInfo = formatUserInfo(user);
  const commentBody = extractTextFromDoc(comment.body);

  let title: string;
  let action: string;

  switch (webhookEvent) {
    case "comment_created":
      title = `Comment on ${issueKey}`;
      action = "commented on";
      break;
    case "comment_updated":
      title = `Comment Updated on ${issueKey}`;
      action = "updated comment on";
      break;
    case "comment_deleted":
      title = `Comment Deleted on ${issueKey}`;
      action = "deleted comment on";
      break;
    default:
      title = `Comment Activity on ${issueKey}`;
      action = "performed action on";
  }

  const body = `${userInfo.displayName} ${action} "${issue.fields.summary}"${commentBody ? `\n\n"${truncate(commentBody, 150)}"` : ""}`;

  return {
    title,
    body,
    url: issueUrl,
    icon: "comment",
    color: "blue",
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: webhookEvent,
      issueKey: issue.key,
      issueId: issue.id,
      projectKey: issue.fields.project.key,
      userAccountId: user.accountId,
      userDisplayName: user.displayName,
      userAvatarUrl: user.avatarUrls?.["48x48"],
    },
  };
}

/**
 * Format sprint events
 */
function formatSprintEvent(
  payload: JiraWebhookPayload,
): FormattedJiraNotification {
  const { webhookEvent, user, sprint } = payload;
  const userInfo = formatUserInfo(user);

  let title: string;
  let body: string;
  let color: JiraNotificationColor = "blue";

  const sprintName = sprint?.name || "Unknown Sprint";

  switch (webhookEvent) {
    case "sprint_created":
      title = "Sprint Created";
      body = `${userInfo.displayName} created sprint "${sprintName}"`;
      color = "green";
      break;
    case "sprint_started":
      title = "Sprint Started";
      body = `${userInfo.displayName} started sprint "${sprintName}"`;
      color = "green";
      break;
    case "sprint_closed":
      title = "Sprint Closed";
      body = `${userInfo.displayName} closed sprint "${sprintName}"`;
      color = "purple";
      break;
    case "sprint_updated":
      title = "Sprint Updated";
      body = `${userInfo.displayName} updated sprint "${sprintName}"`;
      break;
    case "sprint_deleted":
      title = "Sprint Deleted";
      body = `${userInfo.displayName} deleted sprint "${sprintName}"`;
      color = "red";
      break;
    default:
      title = "Sprint Activity";
      body = `${userInfo.displayName} performed action on sprint "${sprintName}"`;
  }

  return {
    title,
    body,
    icon: "sprint",
    color,
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: webhookEvent,
      userAccountId: user.accountId,
      userDisplayName: user.displayName,
      userAvatarUrl: user.avatarUrls?.["48x48"],
    },
  };
}

/**
 * Format attachment events
 */
function formatAttachmentEvent(
  payload: JiraWebhookPayload,
): FormattedJiraNotification {
  const { webhookEvent, user, issue } = payload;
  const userInfo = formatUserInfo(user);

  if (!issue) {
    return formatUnknownEvent(payload);
  }

  const issueKey = issue.key;
  const issueUrl = issue.self
    ? `${getBaseUrl(issue.self)}/browse/${issueKey}`
    : undefined;

  let title: string;
  let color: JiraNotificationColor = "blue";

  switch (webhookEvent) {
    case "attachment_created":
      title = `Attachment Added to ${issueKey}`;
      color = "green";
      break;
    case "attachment_deleted":
      title = `Attachment Removed from ${issueKey}`;
      color = "red";
      break;
    default:
      title = `Attachment Activity on ${issueKey}`;
  }

  const body = `${userInfo.displayName} ${webhookEvent === "attachment_created" ? "added" : "removed"} attachment on "${issue.fields.summary}"`;

  return {
    title,
    body,
    url: issueUrl,
    icon: "attachment",
    color,
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: webhookEvent,
      issueKey: issue.key,
      issueId: issue.id,
      projectKey: issue.fields.project.key,
      userAccountId: user.accountId,
      userDisplayName: user.displayName,
      userAvatarUrl: user.avatarUrls?.["48x48"],
    },
  };
}

/**
 * Format unknown event type
 */
function formatUnknownEvent(
  payload: JiraWebhookPayload,
): FormattedJiraNotification {
  const { webhookEvent, user } = payload;
  const userInfo = formatUserInfo(user);

  return {
    title: `Jira ${webhookEvent}`,
    body: `${userInfo.displayName} triggered ${webhookEvent}`,
    icon: "jira",
    color: "gray",
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: webhookEvent,
      userAccountId: user.accountId,
      userDisplayName: user.displayName,
      userAvatarUrl: user.avatarUrls?.["48x48"],
    },
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatUserInfo(user: JiraUser): {
  displayName: string;
  avatarUrl?: string;
} {
  return {
    displayName: user.displayName || user.accountId || "Unknown User",
    avatarUrl: user.avatarUrls?.["48x48"],
  };
}

function formatChangelog(items: JiraIssueChange[]): string {
  if (!items.length) return "";

  const changes = items.slice(0, 3).map((item) => {
    const field = item.field;
    const from = item.fromString || item.from || "none";
    const to = item.toString || item.to || "none";

    if (field === "status") {
      return `Status: ${from} -> ${to}`;
    }
    if (field === "assignee") {
      return `Assigned to: ${to}`;
    }
    if (field === "priority") {
      return `Priority: ${from} -> ${to}`;
    }
    if (field === "resolution") {
      return `Resolution: ${to}`;
    }

    return `${capitalize(field)}: ${truncate(to, 30)}`;
  });

  let result = changes.join("\n");
  if (items.length > 3) {
    result += `\n+${items.length - 3} more changes`;
  }

  return result;
}

function getUpdateIcon(
  eventName?: string,
  changes?: JiraIssueChange[],
): JiraNotificationIcon {
  if (eventName?.includes("assign")) return "issue-assigned";
  if (eventName?.includes("resolve")) return "issue-resolved";
  if (eventName?.includes("close")) return "issue-closed";
  if (eventName?.includes("reopen")) return "issue-reopened";

  // Check changelog for status changes
  const statusChange = changes?.find((c) => c.field === "status");
  if (statusChange) {
    const newStatus = (statusChange.toString || "").toLowerCase();
    if (newStatus.includes("done") || newStatus.includes("resolved"))
      return "issue-resolved";
    if (newStatus.includes("closed")) return "issue-closed";
  }

  return "issue-updated";
}

function getUpdateColor(
  eventName?: string,
  changes?: JiraIssueChange[],
): JiraNotificationColor {
  if (eventName?.includes("resolve") || eventName?.includes("close"))
    return "green";
  if (eventName?.includes("block")) return "red";

  // Check changelog for status changes
  const statusChange = changes?.find((c) => c.field === "status");
  if (statusChange) {
    const newStatus = (statusChange.toString || "").toLowerCase();
    if (newStatus.includes("done") || newStatus.includes("resolved"))
      return "green";
    if (newStatus.includes("progress")) return "purple";
    if (newStatus.includes("blocked")) return "red";
  }

  return "blue";
}

function getBaseUrl(selfUrl: string): string {
  try {
    const url = new URL(selfUrl);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "";
  }
}

function extractTextFromDoc(doc: JiraComment["body"]): string {
  if (!doc || !doc.content) return "";

  function extractText(
    nodes: Array<{ type: string; content?: unknown[]; text?: string }>,
  ): string {
    return nodes
      .map((node) => {
        if (node.type === "text") return node.text || "";
        if (node.content && Array.isArray(node.content)) {
          return extractText(
            node.content as Array<{
              type: string;
              content?: unknown[];
              text?: string;
            }>,
          );
        }
        return "";
      })
      .join("");
  }

  return extractText(
    doc.content as Array<{ type: string; content?: unknown[]; text?: string }>,
  );
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================================================
// Message Formatting for Chat Display
// ============================================================================

/**
 * Format notification as a chat message
 */
export function formatJiraNotificationAsMessage(
  notification: FormattedJiraNotification,
): {
  text: string;
  html: string;
  embed?: {
    type: string;
    url?: string;
    title: string;
    description: string;
    color: string;
    author?: {
      name: string;
      icon?: string;
    };
    footer?: string;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
  };
} {
  const { title, body, url, color, metadata } = notification;

  // Plain text version
  const text = `[Jira] ${title}\n${body}${url ? `\n${url}` : ""}`;

  // HTML version with link
  const html = `
    <div class="jira-notification">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(body).replace(/\n/g, "<br>")}</p>
      ${url ? `<a href="${escapeHtml(url)}" target="_blank">View in Jira</a>` : ""}
    </div>
  `.trim();

  // Rich embed version
  const embed: {
    type: string;
    url?: string;
    title: string;
    description: string;
    color: string;
    author?: { name: string; icon?: string };
    footer?: string;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
  } = {
    type: "jira",
    url,
    title,
    description: body,
    color: colorToHex(color),
    author: {
      name: metadata.userDisplayName,
      icon: metadata.userAvatarUrl,
    },
    footer: metadata.projectKey,
  };

  // Add status and priority as fields if available
  if (metadata.status || metadata.priority) {
    embed.fields = [];
    if (metadata.status) {
      embed.fields.push({
        name: "Status",
        value: metadata.status,
        inline: true,
      });
    }
    if (metadata.priority) {
      embed.fields.push({
        name: "Priority",
        value: metadata.priority,
        inline: true,
      });
    }
  }

  return { text, html, embed };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function colorToHex(color: JiraNotificationColor): string {
  const colorMap: Record<JiraNotificationColor, string> = {
    green: "#36B37E",
    blue: "#0052CC",
    purple: "#6554C0",
    red: "#DE350B",
    yellow: "#FFAB00",
    gray: "#6B778C",
  };
  return colorMap[color];
}

// ============================================================================
// Issue Link Formatting
// ============================================================================

/**
 * Format Jira issue for link unfurling
 */
export function formatJiraIssueUnfurl(issue: JiraIssue): {
  title: string;
  description: string;
  status: string;
  statusColor: string;
  priority?: string;
  priorityIcon?: string;
  assignee?: string;
  assigneeAvatar?: string;
  url: string;
} {
  const baseUrl = getBaseUrl(issue.self);

  return {
    title: `${issue.key}: ${issue.fields.summary}`,
    description: truncate(issue.fields.description || "", 200),
    status: issue.fields.status.name,
    statusColor: getStatusColor(issue.fields.status),
    priority: issue.fields.priority?.name,
    priorityIcon: issue.fields.priority?.iconUrl,
    assignee: issue.fields.assignee?.displayName,
    assigneeAvatar: issue.fields.assignee?.avatarUrls?.["24x24"],
    url: `${baseUrl}/browse/${issue.key}`,
  };
}

function getStatusColor(status: JiraStatus): string {
  const categoryKey = status.statusCategory?.key || "undefined";
  switch (categoryKey) {
    case "done":
      return "#36B37E"; // green
    case "indeterminate":
      return "#0052CC"; // blue (in progress)
    case "new":
    default:
      return "#6B778C"; // gray (to do)
  }
}
