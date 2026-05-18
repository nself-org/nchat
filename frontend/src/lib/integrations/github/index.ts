/**
 * GitHub Integration
 *
 * Complete GitHub integration for the chat platform.
 * Provides OAuth, API client, webhook handling, and notification formatting.
 */

// Export client
export {
  GitHubApiClient,
  GitHubApiError,
  GitHubIntegrationProvider,
  createGitHubProvider,
  GITHUB_API_BASE,
  GITHUB_AUTH_URL,
  GITHUB_TOKEN_URL,
  GITHUB_DEFAULT_SCOPES,
  // Webhook utilities
  verifyWebhookSignature,
  parseWebhookEventType,
  parseWebhookDeliveryId,
  formatWebhookNotification,
  // URL utilities
  parseGitHubUrl,
  unfurlGitHubUrl,
  type GitHubClientConfig,
} from "./github-client";

// Export OAuth
export {
  buildGitHubAuthUrl,
  initiateGitHubOAuth,
  exchangeCodeForToken,
  handleGitHubOAuthCallback,
  GitHubOAuthException,
  isGitHubOAuthError,
  parseScopes,
  hasRequiredScopes,
  getMissingScopes,
  // State management
  generateOAuthState,
  storeOAuthState,
  retrieveOAuthState,
  clearOAuthState,
  type GitHubOAuthConfig,
  type GitHubOAuthState,
  type GitHubOAuthResult,
  type GitHubOAuthError,
} from "./oauth";

// Export formatter
export {
  formatGitHubNotification,
  formatNotificationAsMessage,
  type FormattedNotification,
  type NotificationIcon,
  type NotificationColor,
  type NotificationMetadata,
} from "./formatter";

// Export types
export type {
  GitHubUser,
  GitHubRepository,
  GitHubIssue,
  GitHubPullRequest,
  GitHubCommit,
  GitHubWebhookPayload,
  GitHubEventType,
  GitHubIssueState,
  GitHubPullRequestState,
  GitHubVisibility,
  GitHubReviewState,
  GitHubLabel,
  GitHubMilestone,
  GitHubReview,
  GitHubBranch,
  GitHubRelease,
  GitHubReleaseAsset,
  GitHubWorkflowRun,
  GitHubCheckRun,
  GitHubRepoNotificationSettings,
  GitHubUnfurlResult,
  GitHubIntegrationConfig,
} from "./types";
