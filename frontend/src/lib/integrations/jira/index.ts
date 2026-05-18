/**
 * Jira Integration
 *
 * Complete Jira integration for the chat platform.
 * Provides OAuth, API client, webhook handling, and notification formatting.
 */

// Export client
export {
  JiraApiClient,
  JiraApiError,
  JiraIntegrationProvider,
  createJiraProvider,
  JIRA_AUTH_URL,
  JIRA_TOKEN_URL,
  JIRA_RESOURCES_URL,
  JIRA_DEFAULT_SCOPES,
  // Issue key utilities
  extractJiraIssueKey,
  containsJiraIssueKey,
  extractAllJiraIssueKeys,
  type JiraClientConfig,
} from "./jira-client";

// Export OAuth
export {
  buildJiraAuthUrl,
  initiateJiraOAuth,
  exchangeCodeForToken,
  refreshAccessToken,
  getAccessibleResources,
  handleJiraOAuthCallback,
  JiraOAuthException,
  isJiraOAuthError,
  parseScopes,
  hasRequiredScopes,
  calculateTokenExpiry,
  isTokenExpired,
  // State management
  generateOAuthState,
  storeOAuthState,
  retrieveOAuthState,
  clearOAuthState,
  type JiraOAuthConfig,
  type JiraOAuthState,
  type JiraOAuthResult,
  type JiraAccessibleResource,
  type JiraOAuthError,
} from "./oauth";

// Export formatter
export {
  formatJiraNotification,
  formatJiraNotificationAsMessage,
  formatJiraIssueUnfurl,
  type FormattedJiraNotification,
  type JiraNotificationIcon,
  type JiraNotificationColor,
  type JiraNotificationMetadata,
} from "./formatter";

// Export types
export type {
  JiraUser,
  JiraProject,
  JiraIssueType,
  JiraPriority,
  JiraStatus,
  JiraIssue,
  JiraCreateIssueParams,
  JiraEventType,
  JiraIssueChange,
  JiraChangelog,
  JiraWebhookPayload,
  JiraComment,
  JiraDocContent,
  JiraDocNode,
  JiraSprint,
  JiraBoard,
  JiraComponent,
  JiraVersion,
  JiraWorklog,
  JiraAttachment,
  JiraFieldMeta,
  JiraTransition,
  JiraLinkType,
  JiraIssueLink,
  JiraProjectNotificationSettings,
  JiraUnfurlResult,
  JiraIntegrationConfig,
} from "./types";
