/**
 * GitHub Integration Types
 *
 * Platform-specific types for GitHub integration.
 * Re-exports common types from parent and adds GitHub-specific types.
 */

// Re-export types from parent
export type {
  GitHubUser,
  GitHubRepository,
  GitHubIssue,
  GitHubPullRequest,
  GitHubCommit,
  GitHubWebhookPayload,
} from "../types";

// ============================================================================
// GitHub-Specific Types
// ============================================================================

/**
 * GitHub webhook event types
 */
export type GitHubEventType =
  | "check_run"
  | "check_suite"
  | "commit_comment"
  | "create"
  | "delete"
  | "deployment"
  | "deployment_status"
  | "fork"
  | "gollum"
  | "issue_comment"
  | "issues"
  | "label"
  | "member"
  | "membership"
  | "milestone"
  | "organization"
  | "page_build"
  | "ping"
  | "project"
  | "project_card"
  | "project_column"
  | "public"
  | "pull_request"
  | "pull_request_review"
  | "pull_request_review_comment"
  | "push"
  | "release"
  | "repository"
  | "repository_dispatch"
  | "status"
  | "team"
  | "team_add"
  | "watch"
  | "workflow_dispatch"
  | "workflow_job"
  | "workflow_run";

/**
 * GitHub issue state
 */
export type GitHubIssueState = "open" | "closed" | "all";

/**
 * GitHub pull request state
 */
export type GitHubPullRequestState = "open" | "closed" | "all" | "merged";

/**
 * GitHub repository visibility
 */
export type GitHubVisibility = "public" | "private" | "internal";

/**
 * GitHub review state
 */
export type GitHubReviewState =
  | "PENDING"
  | "COMMENTED"
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "DISMISSED";

/**
 * GitHub label
 */
export interface GitHubLabel {
  id: number;
  node_id: string;
  url: string;
  name: string;
  description: string | null;
  color: string;
  default: boolean;
}

/**
 * GitHub milestone
 */
export interface GitHubMilestone {
  id: number;
  number: number;
  title: string;
  description: string | null;
  state: "open" | "closed";
  due_on: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  html_url: string;
}

/**
 * GitHub review
 */
export interface GitHubReview {
  id: number;
  user: {
    id: number;
    login: string;
    avatar_url: string;
  };
  body: string | null;
  state: GitHubReviewState;
  html_url: string;
  submitted_at: string;
  commit_id: string;
}

/**
 * GitHub branch
 */
export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
  protection_url?: string;
}

/**
 * GitHub release
 */
export interface GitHubRelease {
  id: number;
  tag_name: string;
  target_commitish: string;
  name: string | null;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string | null;
  html_url: string;
  tarball_url: string | null;
  zipball_url: string | null;
  assets: GitHubReleaseAsset[];
}

/**
 * GitHub release asset
 */
export interface GitHubReleaseAsset {
  id: number;
  name: string;
  label: string | null;
  content_type: string;
  size: number;
  download_count: number;
  created_at: string;
  updated_at: string;
  browser_download_url: string;
}

/**
 * GitHub workflow run
 */
export interface GitHubWorkflowRun {
  id: number;
  name: string;
  head_branch: string;
  head_sha: string;
  status: "queued" | "in_progress" | "completed";
  conclusion: "success" | "failure" | "cancelled" | "skipped" | null;
  workflow_id: number;
  html_url: string;
  created_at: string;
  updated_at: string;
  run_attempt: number;
  run_number: number;
}

/**
 * GitHub check run
 */
export interface GitHubCheckRun {
  id: number;
  head_sha: string;
  status: "queued" | "in_progress" | "completed";
  conclusion:
    | "success"
    | "failure"
    | "neutral"
    | "cancelled"
    | "timed_out"
    | "action_required"
    | "skipped"
    | null;
  name: string;
  html_url: string;
  started_at: string | null;
  completed_at: string | null;
}

/**
 * GitHub notification settings for a repository
 */
export interface GitHubRepoNotificationSettings {
  owner: string;
  repo: string;
  events: GitHubEventType[];
  channelId: string;
  enabled: boolean;
  filters?: {
    branches?: string[];
    labels?: string[];
    users?: string[];
  };
}

/**
 * GitHub link unfurl result
 */
export interface GitHubUnfurlResult {
  type: "issue" | "pr" | "commit" | "repo" | "user" | "unknown";
  title: string;
  description?: string;
  state?: string;
  author?: string;
  avatarUrl?: string;
  url: string;
  metadata?: Record<string, unknown>;
}

/**
 * GitHub integration config stored in database
 */
export interface GitHubIntegrationConfig {
  username?: string;
  userId?: number;
  avatarUrl?: string;
  installations?: {
    id: number;
    account: {
      login: string;
      type: "User" | "Organization";
    };
    repositories?: string[];
  }[];
  webhookId?: string;
  webhookSecret?: string;
}
