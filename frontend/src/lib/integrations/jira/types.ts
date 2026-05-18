/**
 * Jira Integration Types
 *
 * Platform-specific types for Jira integration.
 * Re-exports common types from parent and adds Jira-specific types.
 */

// Import types from parent for local use
import type {
  JiraUser,
  JiraIssue,
  JiraIssueType,
  JiraPriority,
  JiraStatus,
} from "../types";

// Re-export types from parent
export type {
  JiraUser,
  JiraProject,
  JiraIssueType,
  JiraPriority,
  JiraStatus,
  JiraIssue,
  JiraCreateIssueParams,
} from "../types";

// ============================================================================
// Jira-Specific Types
// ============================================================================

/**
 * Jira webhook event types
 */
export type JiraEventType =
  | "jira:issue_created"
  | "jira:issue_updated"
  | "jira:issue_deleted"
  | "jira:worklog_updated"
  | "sprint_created"
  | "sprint_deleted"
  | "sprint_updated"
  | "sprint_started"
  | "sprint_closed"
  | "board_created"
  | "board_updated"
  | "board_deleted"
  | "project_created"
  | "project_updated"
  | "project_deleted"
  | "user_created"
  | "user_updated"
  | "user_deleted"
  | "comment_created"
  | "comment_updated"
  | "comment_deleted"
  | "attachment_created"
  | "attachment_deleted";

/**
 * Jira issue change
 */
export interface JiraIssueChange {
  field: string;
  fieldtype: string;
  fieldId?: string;
  from?: string;
  fromString?: string;
  to?: string;
  toString?: string;
}

/**
 * Jira changelog entry
 */
export interface JiraChangelog {
  id: string;
  author: JiraUser;
  created: string;
  items: JiraIssueChange[];
}

/**
 * Jira webhook payload
 */
export interface JiraWebhookPayload {
  timestamp: number;
  webhookEvent: JiraEventType;
  issue_event_type_name?: string;
  user: JiraUser;
  issue?: JiraIssue;
  comment?: JiraComment;
  changelog?: JiraChangelog;
  sprint?: JiraSprint;
}

/**
 * Jira comment
 */
export interface JiraComment {
  id: string;
  self: string;
  author: JiraUser;
  updateAuthor: JiraUser;
  body: JiraDocContent;
  created: string;
  updated: string;
  jsdPublic?: boolean;
}

/**
 * Jira Atlassian Document Format content
 */
export interface JiraDocContent {
  type: "doc";
  version: number;
  content: JiraDocNode[];
}

/**
 * Jira document node (simplified)
 */
export interface JiraDocNode {
  type: string;
  content?: JiraDocNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

/**
 * Jira sprint
 */
export interface JiraSprint {
  id: number;
  self: string;
  state: "future" | "active" | "closed";
  name: string;
  startDate?: string;
  endDate?: string;
  completeDate?: string;
  originBoardId?: number;
  goal?: string;
}

/**
 * Jira board
 */
export interface JiraBoard {
  id: number;
  self: string;
  name: string;
  type: "scrum" | "kanban" | "simple";
  location?: {
    projectId: number;
    displayName: string;
    projectKey: string;
    projectTypeKey: string;
    avatarURI: string;
  };
}

/**
 * Jira component
 */
export interface JiraComponent {
  id: string;
  name: string;
  description?: string;
  lead?: JiraUser;
  assigneeType?:
    | "PROJECT_LEAD"
    | "COMPONENT_LEAD"
    | "UNASSIGNED"
    | "PROJECT_DEFAULT";
  project?: string;
}

/**
 * Jira version
 */
export interface JiraVersion {
  id: string;
  name: string;
  description?: string;
  archived: boolean;
  released: boolean;
  releaseDate?: string;
  startDate?: string;
  projectId: number;
}

/**
 * Jira worklog entry
 */
export interface JiraWorklog {
  id: string;
  self: string;
  author: JiraUser;
  updateAuthor: JiraUser;
  comment?: JiraDocContent;
  created: string;
  updated: string;
  started: string;
  timeSpent: string;
  timeSpentSeconds: number;
  issueId: string;
}

/**
 * Jira attachment
 */
export interface JiraAttachment {
  id: string;
  self: string;
  filename: string;
  author: JiraUser;
  created: string;
  size: number;
  mimeType: string;
  content: string;
  thumbnail?: string;
}

/**
 * Jira field metadata
 */
export interface JiraFieldMeta {
  key: string;
  name: string;
  required: boolean;
  schema: {
    type: string;
    system?: string;
    items?: string;
    custom?: string;
    customId?: number;
  };
  operations: string[];
  allowedValues?: unknown[];
  hasDefaultValue?: boolean;
  defaultValue?: unknown;
}

/**
 * Jira transition
 */
export interface JiraTransition {
  id: string;
  name: string;
  to: JiraStatus;
  hasScreen: boolean;
  isGlobal: boolean;
  isInitial: boolean;
  isAvailable: boolean;
  isConditional: boolean;
  fields?: Record<string, JiraFieldMeta>;
}

/**
 * Jira link type
 */
export interface JiraLinkType {
  id: string;
  name: string;
  inward: string;
  outward: string;
  self: string;
}

/**
 * Jira issue link
 */
export interface JiraIssueLink {
  id: string;
  self: string;
  type: JiraLinkType;
  inwardIssue?: {
    id: string;
    key: string;
    fields: {
      summary: string;
      status: JiraStatus;
      priority?: JiraPriority;
      issuetype: JiraIssueType;
    };
  };
  outwardIssue?: {
    id: string;
    key: string;
    fields: {
      summary: string;
      status: JiraStatus;
      priority?: JiraPriority;
      issuetype: JiraIssueType;
    };
  };
}

/**
 * Jira notification settings for a project
 */
export interface JiraProjectNotificationSettings {
  cloudId: string;
  projectKey: string;
  events: JiraEventType[];
  channelId: string;
  enabled: boolean;
  filters?: {
    issueTypes?: string[];
    priorities?: string[];
    assignees?: string[];
    statuses?: string[];
  };
}

/**
 * Jira link unfurl result
 */
export interface JiraUnfurlResult {
  type: "issue" | "project" | "board" | "sprint" | "unknown";
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  avatarUrl?: string;
  url: string;
  metadata?: Record<string, unknown>;
}

/**
 * Jira integration config stored in database
 */
export interface JiraIntegrationConfig {
  cloudId: string;
  siteUrl: string;
  siteName: string;
  user?: {
    accountId: string;
    displayName: string;
    emailAddress?: string;
    avatarUrl?: string;
  };
  webhookId?: string;
  webhookSecret?: string;
  projects?: Array<{
    id: string;
    key: string;
    name: string;
  }>;
}

/**
 * Import/export from jira-client
 */
export type { JiraClientConfig } from "./jira-client";
