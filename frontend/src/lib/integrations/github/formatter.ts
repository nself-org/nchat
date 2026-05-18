/**
 * GitHub Notification Formatter
 *
 * Formats GitHub webhook payloads into user-friendly notifications
 * for display in the chat interface.
 */

import type {
  GitHubUser,
  GitHubRepository,
  GitHubIssue,
  GitHubPullRequest,
  GitHubWebhookPayload,
} from "../types";

// ============================================================================
// Types
// ============================================================================

export interface FormattedNotification {
  title: string;
  body: string;
  url?: string;
  icon: NotificationIcon;
  color: NotificationColor;
  timestamp: string;
  metadata: NotificationMetadata;
}

export type NotificationIcon =
  | "issue-opened"
  | "issue-closed"
  | "issue-reopened"
  | "pr-open"
  | "pr-merged"
  | "pr-closed"
  | "push"
  | "comment"
  | "review"
  | "release"
  | "branch"
  | "tag"
  | "fork"
  | "star"
  | "commit"
  | "check"
  | "deployment"
  | "github";

export type NotificationColor =
  | "green" // opened, created, success
  | "purple" // merged
  | "red" // closed, failed
  | "blue" // info, comment
  | "yellow" // pending, warning
  | "gray"; // neutral

export interface NotificationMetadata {
  eventType: string;
  action?: string;
  repositoryName: string;
  repositoryUrl: string;
  senderLogin: string;
  senderAvatarUrl?: string;
  issueNumber?: number;
  prNumber?: number;
  commitSha?: string;
  branch?: string;
  labels?: string[];
}

// ============================================================================
// Main Formatter
// ============================================================================

/**
 * Format a GitHub webhook payload into a notification
 */
export function formatGitHubNotification(
  eventType: string,
  payload: GitHubWebhookPayload,
): FormattedNotification {
  const formatter = FORMATTERS[eventType];
  if (formatter) {
    return formatter(payload);
  }

  return formatUnknownEvent(eventType, payload);
}

// ============================================================================
// Event-Specific Formatters
// ============================================================================

const FORMATTERS: Record<
  string,
  (payload: GitHubWebhookPayload) => FormattedNotification
> = {
  issues: formatIssuesEvent,
  pull_request: formatPullRequestEvent,
  push: formatPushEvent,
  issue_comment: formatIssueCommentEvent,
  pull_request_review: formatPullRequestReviewEvent,
  pull_request_review_comment: formatPRReviewCommentEvent,
  create: formatCreateEvent,
  delete: formatDeleteEvent,
  release: formatReleaseEvent,
  fork: formatForkEvent,
  watch: formatWatchEvent,
  commit_comment: formatCommitCommentEvent,
  check_run: formatCheckRunEvent,
  check_suite: formatCheckSuiteEvent,
  deployment: formatDeploymentEvent,
  deployment_status: formatDeploymentStatusEvent,
};

/**
 * Format issues event
 */
function formatIssuesEvent(
  payload: GitHubWebhookPayload,
): FormattedNotification {
  const { action, issue, sender, repository } = payload;
  const issueData = issue as GitHubIssue;

  const actionText = getActionText(action || "updated");
  const icon = getIssueIcon(action || "");
  const color = getIssueColor(action || "");

  return {
    title: `Issue ${actionText}: #${issueData.number}`,
    body: `${sender.login} ${actionText} issue "${issueData.title}" in ${repository.full_name}`,
    url: issueData.html_url,
    icon,
    color,
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: "issues",
      action,
      repositoryName: repository.full_name,
      repositoryUrl: repository.html_url,
      senderLogin: sender.login,
      senderAvatarUrl: sender.avatar_url,
      issueNumber: issueData.number,
      labels: issueData.labels?.map((l) => l.name),
    },
  };
}

/**
 * Format pull request event
 */
function formatPullRequestEvent(
  payload: GitHubWebhookPayload,
): FormattedNotification {
  const { action, pull_request, sender, repository } = payload;
  const pr = pull_request as GitHubPullRequest;

  const actionText = getPRActionText(action || "updated", pr.merged);
  const icon = getPRIcon(action || "", pr.merged);
  const color = getPRColor(action || "", pr.merged);

  let body = `${sender.login} ${actionText} PR #${pr.number} in ${repository.full_name}`;

  if (action === "opened" || action === "ready_for_review") {
    body += `\n"${pr.title}"`;
    if (pr.additions !== undefined && pr.deletions !== undefined) {
      body += `\n+${pr.additions} -${pr.deletions}`;
    }
  }

  return {
    title: `PR ${actionText}: #${pr.number}`,
    body,
    url: pr.html_url,
    icon,
    color,
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: "pull_request",
      action,
      repositoryName: repository.full_name,
      repositoryUrl: repository.html_url,
      senderLogin: sender.login,
      senderAvatarUrl: sender.avatar_url,
      prNumber: pr.number,
      branch: pr.head?.ref,
      labels: pr.labels?.map((l) => l.name),
    },
  };
}

/**
 * Format push event
 */
function formatPushEvent(payload: GitHubWebhookPayload): FormattedNotification {
  const { sender, repository, ref, commits } = payload;
  const branch = ref?.replace("refs/heads/", "") || "unknown";
  const commitCount = commits?.length || 0;

  let body = `${sender.login} pushed ${commitCount} commit${commitCount !== 1 ? "s" : ""} to ${branch}`;

  // Add commit messages preview
  if (commits && commits.length > 0) {
    const preview = commits
      .slice(0, 3)
      .map((c) => `\u2022 ${truncate(c.message.split("\n")[0], 50)}`)
      .join("\n");
    body += `\n${preview}`;
    if (commits.length > 3) {
      body += `\n... and ${commits.length - 3} more`;
    }
  }

  return {
    title: `Push to ${branch}`,
    body,
    url: commits?.[0]?.html_url || repository.html_url,
    icon: "push",
    color: "blue",
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: "push",
      repositoryName: repository.full_name,
      repositoryUrl: repository.html_url,
      senderLogin: sender.login,
      senderAvatarUrl: sender.avatar_url,
      branch,
      commitSha: commits?.[0]?.sha,
    },
  };
}

/**
 * Format issue comment event
 */
function formatIssueCommentEvent(
  payload: GitHubWebhookPayload,
): FormattedNotification {
  const { action, issue, comment, sender, repository } = payload;
  const issueData = issue as GitHubIssue;

  const commentBody = truncate(comment?.body || "", 100);

  return {
    title: `Comment on #${issueData.number}`,
    body: `${sender.login} ${action === "created" ? "commented on" : action} "${issueData.title}"\n\n"${commentBody}"`,
    url: comment?.html_url || issueData.html_url,
    icon: "comment",
    color: "blue",
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: "issue_comment",
      action,
      repositoryName: repository.full_name,
      repositoryUrl: repository.html_url,
      senderLogin: sender.login,
      senderAvatarUrl: sender.avatar_url,
      issueNumber: issueData.number,
    },
  };
}

/**
 * Format pull request review event
 */
function formatPullRequestReviewEvent(
  payload: GitHubWebhookPayload,
): FormattedNotification {
  const { action, pull_request, sender, repository } = payload;
  const review = (
    payload as GitHubWebhookPayload & { review?: { state?: string } }
  ).review;
  const pr = pull_request as GitHubPullRequest;
  const state = review?.state || "submitted";

  let title = `Review on PR #${pr.number}`;
  let color: NotificationColor = "blue";

  if (state === "approved") {
    title = `PR #${pr.number} approved`;
    color = "green";
  } else if (state === "changes_requested") {
    title = `Changes requested on PR #${pr.number}`;
    color = "red";
  } else if (state === "commented") {
    title = `Review comment on PR #${pr.number}`;
  }

  return {
    title,
    body: `${sender.login} reviewed "${pr.title}"`,
    url: pr.html_url,
    icon: "review",
    color,
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: "pull_request_review",
      action: state,
      repositoryName: repository.full_name,
      repositoryUrl: repository.html_url,
      senderLogin: sender.login,
      senderAvatarUrl: sender.avatar_url,
      prNumber: pr.number,
    },
  };
}

/**
 * Format PR review comment event
 */
function formatPRReviewCommentEvent(
  payload: GitHubWebhookPayload,
): FormattedNotification {
  const { action, pull_request, comment, sender, repository } = payload;
  const pr = pull_request as GitHubPullRequest;

  return {
    title: `Review comment on PR #${pr.number}`,
    body: `${sender.login} ${action === "created" ? "commented" : action} on "${pr.title}"\n\n"${truncate(comment?.body || "", 100)}"`,
    url: comment?.html_url || pr.html_url,
    icon: "comment",
    color: "blue",
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: "pull_request_review_comment",
      action,
      repositoryName: repository.full_name,
      repositoryUrl: repository.html_url,
      senderLogin: sender.login,
      senderAvatarUrl: sender.avatar_url,
      prNumber: pr.number,
    },
  };
}

/**
 * Format create event (branch/tag)
 */
function formatCreateEvent(
  payload: GitHubWebhookPayload,
): FormattedNotification {
  const { sender, repository, ref, ref_type } =
    payload as GitHubWebhookPayload & {
      ref_type?: string;
    };

  const refType = ref_type || "ref";
  const icon: NotificationIcon = refType === "tag" ? "tag" : "branch";

  return {
    title: `${capitalize(refType)} created`,
    body: `${sender.login} created ${refType} "${ref}" in ${repository.full_name}`,
    url: repository.html_url,
    icon,
    color: "green",
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: "create",
      repositoryName: repository.full_name,
      repositoryUrl: repository.html_url,
      senderLogin: sender.login,
      senderAvatarUrl: sender.avatar_url,
      branch: ref,
    },
  };
}

/**
 * Format delete event (branch/tag)
 */
function formatDeleteEvent(
  payload: GitHubWebhookPayload,
): FormattedNotification {
  const { sender, repository, ref, ref_type } =
    payload as GitHubWebhookPayload & {
      ref_type?: string;
    };

  const refType = ref_type || "ref";
  const icon: NotificationIcon = refType === "tag" ? "tag" : "branch";

  return {
    title: `${capitalize(refType)} deleted`,
    body: `${sender.login} deleted ${refType} "${ref}" in ${repository.full_name}`,
    url: repository.html_url,
    icon,
    color: "red",
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: "delete",
      repositoryName: repository.full_name,
      repositoryUrl: repository.html_url,
      senderLogin: sender.login,
      senderAvatarUrl: sender.avatar_url,
      branch: ref,
    },
  };
}

/**
 * Format release event
 */
function formatReleaseEvent(
  payload: GitHubWebhookPayload,
): FormattedNotification {
  const { action, sender, repository, release } =
    payload as GitHubWebhookPayload & {
      release?: {
        tag_name: string;
        name: string;
        html_url: string;
        prerelease: boolean;
        draft: boolean;
      };
    };

  const releaseName = release?.name || release?.tag_name || "Unknown";

  return {
    title: `Release ${action}: ${releaseName}`,
    body: `${sender.login} ${action} release ${releaseName} in ${repository.full_name}`,
    url: release?.html_url || repository.html_url,
    icon: "release",
    color: action === "published" ? "green" : "blue",
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: "release",
      action,
      repositoryName: repository.full_name,
      repositoryUrl: repository.html_url,
      senderLogin: sender.login,
      senderAvatarUrl: sender.avatar_url,
    },
  };
}

/**
 * Format fork event
 */
function formatForkEvent(payload: GitHubWebhookPayload): FormattedNotification {
  const { sender, repository, forkee } = payload as GitHubWebhookPayload & {
    forkee?: { full_name: string; html_url: string };
  };

  return {
    title: `Repository forked`,
    body: `${sender.login} forked ${repository.full_name} to ${forkee?.full_name || "unknown"}`,
    url: forkee?.html_url || repository.html_url,
    icon: "fork",
    color: "blue",
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: "fork",
      repositoryName: repository.full_name,
      repositoryUrl: repository.html_url,
      senderLogin: sender.login,
      senderAvatarUrl: sender.avatar_url,
    },
  };
}

/**
 * Format watch (star) event
 */
function formatWatchEvent(
  payload: GitHubWebhookPayload,
): FormattedNotification {
  const { action, sender, repository } = payload;

  return {
    title: `Repository starred`,
    body: `${sender.login} starred ${repository.full_name}`,
    url: repository.html_url,
    icon: "star",
    color: "yellow",
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: "watch",
      action,
      repositoryName: repository.full_name,
      repositoryUrl: repository.html_url,
      senderLogin: sender.login,
      senderAvatarUrl: sender.avatar_url,
    },
  };
}

/**
 * Format commit comment event
 */
function formatCommitCommentEvent(
  payload: GitHubWebhookPayload,
): FormattedNotification {
  const { action, sender, repository, comment } = payload;
  const commitSha =
    (comment as { commit_id?: string })?.commit_id?.slice(0, 7) || "unknown";

  return {
    title: `Comment on commit ${commitSha}`,
    body: `${sender.login} commented on commit ${commitSha}\n\n"${truncate(comment?.body || "", 100)}"`,
    url: comment?.html_url || repository.html_url,
    icon: "comment",
    color: "blue",
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: "commit_comment",
      action,
      repositoryName: repository.full_name,
      repositoryUrl: repository.html_url,
      senderLogin: sender.login,
      senderAvatarUrl: sender.avatar_url,
      commitSha,
    },
  };
}

/**
 * Format check run event
 */
function formatCheckRunEvent(
  payload: GitHubWebhookPayload,
): FormattedNotification {
  const { action, sender, repository, check_run } =
    payload as GitHubWebhookPayload & {
      check_run?: {
        name: string;
        conclusion: string | null;
        status: string;
        html_url: string;
      };
    };

  const name = check_run?.name || "Check";
  const conclusion = check_run?.conclusion;
  let color: NotificationColor = "blue";
  let title = `${name} ${action}`;

  if (conclusion === "success") {
    color = "green";
    title = `${name} passed`;
  } else if (conclusion === "failure" || conclusion === "cancelled") {
    color = "red";
    title = `${name} failed`;
  } else if (check_run?.status === "in_progress") {
    color = "yellow";
    title = `${name} running`;
  }

  return {
    title,
    body: `Check "${name}" ${action} in ${repository.full_name}`,
    url: check_run?.html_url || repository.html_url,
    icon: "check",
    color,
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: "check_run",
      action,
      repositoryName: repository.full_name,
      repositoryUrl: repository.html_url,
      senderLogin: sender.login,
      senderAvatarUrl: sender.avatar_url,
    },
  };
}

/**
 * Format check suite event
 */
function formatCheckSuiteEvent(
  payload: GitHubWebhookPayload,
): FormattedNotification {
  const { action, sender, repository, check_suite } =
    payload as GitHubWebhookPayload & {
      check_suite?: {
        conclusion: string | null;
        status: string;
        head_branch: string;
      };
    };

  const branch = check_suite?.head_branch || "unknown";
  const conclusion = check_suite?.conclusion;
  let color: NotificationColor = "blue";
  let title = `Check suite ${action}`;

  if (conclusion === "success") {
    color = "green";
    title = `All checks passed on ${branch}`;
  } else if (conclusion === "failure") {
    color = "red";
    title = `Checks failed on ${branch}`;
  }

  return {
    title,
    body: `Check suite ${action} on ${branch} in ${repository.full_name}`,
    url: repository.html_url,
    icon: "check",
    color,
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: "check_suite",
      action,
      repositoryName: repository.full_name,
      repositoryUrl: repository.html_url,
      senderLogin: sender.login,
      senderAvatarUrl: sender.avatar_url,
      branch,
    },
  };
}

/**
 * Format deployment event
 */
function formatDeploymentEvent(
  payload: GitHubWebhookPayload,
): FormattedNotification {
  const { action, sender, repository, deployment } =
    payload as GitHubWebhookPayload & {
      deployment?: {
        environment: string;
        ref: string;
        sha: string;
      };
    };

  const env = deployment?.environment || "unknown";

  return {
    title: `Deployment to ${env}`,
    body: `${sender.login} started deployment to ${env} in ${repository.full_name}`,
    url: repository.html_url,
    icon: "deployment",
    color: "blue",
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: "deployment",
      action,
      repositoryName: repository.full_name,
      repositoryUrl: repository.html_url,
      senderLogin: sender.login,
      senderAvatarUrl: sender.avatar_url,
    },
  };
}

/**
 * Format deployment status event
 */
function formatDeploymentStatusEvent(
  payload: GitHubWebhookPayload,
): FormattedNotification {
  const { sender, repository, deployment_status, deployment } =
    payload as GitHubWebhookPayload & {
      deployment_status?: {
        state: string;
        description: string;
        target_url: string;
      };
      deployment?: {
        environment: string;
      };
    };

  const state = deployment_status?.state || "unknown";
  const env = deployment?.environment || "unknown";
  let color: NotificationColor = "blue";

  if (state === "success") color = "green";
  else if (state === "failure" || state === "error") color = "red";
  else if (state === "pending" || state === "in_progress") color = "yellow";

  return {
    title: `Deployment to ${env}: ${state}`,
    body: `Deployment to ${env} ${state} in ${repository.full_name}`,
    url: deployment_status?.target_url || repository.html_url,
    icon: "deployment",
    color,
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: "deployment_status",
      action: state,
      repositoryName: repository.full_name,
      repositoryUrl: repository.html_url,
      senderLogin: sender.login,
      senderAvatarUrl: sender.avatar_url,
    },
  };
}

/**
 * Format unknown event type
 */
function formatUnknownEvent(
  eventType: string,
  payload: GitHubWebhookPayload,
): FormattedNotification {
  const { action, sender, repository } = payload;

  return {
    title: `GitHub ${eventType}`,
    body: `${sender.login} triggered ${eventType}${action ? ` (${action})` : ""} in ${repository.full_name}`,
    url: repository.html_url,
    icon: "github",
    color: "gray",
    timestamp: new Date().toISOString(),
    metadata: {
      eventType,
      action,
      repositoryName: repository.full_name,
      repositoryUrl: repository.html_url,
      senderLogin: sender.login,
      senderAvatarUrl: sender.avatar_url,
    },
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function getActionText(action: string): string {
  const actionMap: Record<string, string> = {
    opened: "opened",
    closed: "closed",
    reopened: "reopened",
    edited: "edited",
    deleted: "deleted",
    transferred: "transferred",
    pinned: "pinned",
    unpinned: "unpinned",
    labeled: "labeled",
    unlabeled: "unlabeled",
    locked: "locked",
    unlocked: "unlocked",
    milestoned: "milestoned",
    demilestoned: "demilestoned",
    assigned: "assigned",
    unassigned: "unassigned",
  };
  return actionMap[action] || action;
}

function getPRActionText(action: string, merged: boolean): string {
  if (action === "closed" && merged) return "merged";
  return getActionText(action);
}

function getIssueIcon(action: string): NotificationIcon {
  if (action === "opened") return "issue-opened";
  if (action === "closed") return "issue-closed";
  if (action === "reopened") return "issue-reopened";
  return "issue-opened";
}

function getIssueColor(action: string): NotificationColor {
  if (action === "opened" || action === "reopened") return "green";
  if (action === "closed") return "purple";
  return "blue";
}

function getPRIcon(action: string, merged: boolean): NotificationIcon {
  if (action === "closed" && merged) return "pr-merged";
  if (action === "closed") return "pr-closed";
  return "pr-open";
}

function getPRColor(action: string, merged: boolean): NotificationColor {
  if (action === "closed" && merged) return "purple";
  if (action === "closed") return "red";
  if (action === "opened") return "green";
  return "blue";
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
export function formatNotificationAsMessage(
  notification: FormattedNotification,
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
  };
} {
  const { title, body, url, color, metadata } = notification;

  // Plain text version
  const text = `[GitHub] ${title}\n${body}${url ? `\n${url}` : ""}`;

  // HTML version with link
  const html = `
    <div class="github-notification">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(body).replace(/\n/g, "<br>")}</p>
      ${url ? `<a href="${escapeHtml(url)}" target="_blank">View on GitHub</a>` : ""}
    </div>
  `.trim();

  // Rich embed version
  const embed = {
    type: "github",
    url,
    title,
    description: body,
    color: colorToHex(color),
    author: {
      name: metadata.senderLogin,
      icon: metadata.senderAvatarUrl,
    },
    footer: metadata.repositoryName,
  };

  return { text, html, embed };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function colorToHex(color: NotificationColor): string {
  const colorMap: Record<NotificationColor, string> = {
    green: "#238636",
    purple: "#8250df",
    red: "#cf222e",
    blue: "#2188ff",
    yellow: "#d29922",
    gray: "#8b949e",
  };
  return colorMap[color];
}
