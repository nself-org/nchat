/**
 * Integration Types
 *
 * Type definitions for the external integrations system.
 * Defines interfaces for integration providers, OAuth flows, and webhook handling.
 */

// ============================================================================
// Core Integration Types
// ============================================================================

export type IntegrationCategory =
  | "productivity"
  | "devtools"
  | "storage"
  | "communication";

export type IntegrationStatus =
  | "connected"
  | "disconnected"
  | "error"
  | "pending";

export type IntegrationId =
  | "slack"
  | "github"
  | "jira"
  | "google-drive"
  | "custom";

/**
 * Core integration definition
 */
export interface Integration {
  id: IntegrationId | string;
  name: string;
  icon: string;
  description: string;
  category: IntegrationCategory;
  status: IntegrationStatus;
  scopes: string[];
  config: Record<string, unknown>;
  connectedAt?: string;
  lastSyncAt?: string;
  error?: string;
}

/**
 * Integration credentials stored securely
 */
export interface IntegrationCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  tokenType?: string;
  scope?: string;
}

/**
 * OAuth configuration for an integration
 */
export interface OAuthConfig {
  clientId: string;
  clientSecret?: string;
  authorizationUrl: string;
  tokenUrl: string;
  redirectUri: string;
  scopes: string[];
  state?: string;
}

/**
 * OAuth callback parameters
 */
export interface OAuthCallbackParams {
  code: string;
  state: string;
  error?: string;
  errorDescription?: string;
}

/**
 * OAuth token response
 */
export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

// ============================================================================
// Integration Provider Interface
// ============================================================================

/**
 * Integration provider interface that all providers must implement
 */
export interface IntegrationProvider {
  /** Unique identifier for this integration */
  id: IntegrationId | string;

  /** Human-readable name */
  name: string;

  /** Icon identifier */
  icon: string;

  /** Description of the integration */
  description: string;

  /** Category for grouping */
  category: IntegrationCategory;

  /** Required OAuth scopes */
  scopes: string[];

  /** Get the OAuth authorization URL */
  getAuthUrl(config: Partial<OAuthConfig>): string;

  /** Start the authorization flow */
  authorize(): Promise<void>;

  /** Disconnect the integration */
  disconnect(): Promise<void>;

  /** Handle OAuth callback */
  handleCallback(params: OAuthCallbackParams): Promise<IntegrationCredentials>;

  /** Refresh the access token */
  refreshToken(
    credentials: IntegrationCredentials,
  ): Promise<IntegrationCredentials>;

  /** Get current integration status */
  getStatus(): Promise<Integration>;

  /** Validate the current credentials */
  validateCredentials(credentials: IntegrationCredentials): Promise<boolean>;
}

// ============================================================================
// Slack Types
// ============================================================================

export interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_private: boolean;
  is_archived: boolean;
  is_general: boolean;
  is_member: boolean;
  num_members?: number;
  topic?: {
    value: string;
    creator: string;
    last_set: number;
  };
  purpose?: {
    value: string;
    creator: string;
    last_set: number;
  };
}

export interface SlackUser {
  id: string;
  name: string;
  real_name: string;
  profile: {
    display_name: string;
    email?: string;
    image_72?: string;
    image_192?: string;
  };
  is_bot: boolean;
  is_admin: boolean;
}

export interface SlackMessage {
  type: string;
  user: string;
  text: string;
  ts: string;
  thread_ts?: string;
  reply_count?: number;
  reactions?: Array<{
    name: string;
    count: number;
    users: string[];
  }>;
  files?: SlackFile[];
}

export interface SlackFile {
  id: string;
  name: string;
  title: string;
  mimetype: string;
  filetype: string;
  size: number;
  url_private?: string;
  url_private_download?: string;
  thumb_64?: string;
  thumb_360?: string;
}

export interface SlackImportOptions {
  channelIds?: string[];
  includePrivate?: boolean;
  includeFiles?: boolean;
  startDate?: string;
  endDate?: string;
  userMapping?: Record<string, string>;
}

export interface SlackSyncResult {
  success: boolean;
  channelsSynced: number;
  messagesSynced: number;
  usersSynced: number;
  errors: string[];
}

// ============================================================================
// GitHub Types
// ============================================================================

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  private: boolean;
  owner: GitHubUser;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  html_url: string;
  user: GitHubUser;
  labels: Array<{
    id: number;
    name: string;
    color: string;
  }>;
  assignees: GitHubUser[];
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface GitHubPullRequest extends GitHubIssue {
  merged: boolean;
  merged_at: string | null;
  merge_commit_sha: string | null;
  head: {
    ref: string;
    sha: string;
    repo: GitHubRepository | null;
  };
  base: {
    ref: string;
    sha: string;
    repo: GitHubRepository;
  };
  additions: number;
  deletions: number;
  changed_files: number;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  html_url: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  committer: {
    name: string;
    email: string;
    date: string;
  };
}

export interface GitHubWebhookPayload {
  action?: string;
  sender: GitHubUser;
  repository: GitHubRepository;
  issue?: GitHubIssue;
  pull_request?: GitHubPullRequest;
  comment?: {
    id: number;
    body: string;
    user: GitHubUser;
    html_url: string;
    created_at: string;
  };
  commits?: GitHubCommit[];
  ref?: string;
  before?: string;
  after?: string;
}

// ============================================================================
// Jira Types
// ============================================================================

export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  avatarUrls: {
    "48x48": string;
    "24x24": string;
    "16x16": string;
  };
  active: boolean;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  description?: string;
  avatarUrls: {
    "48x48": string;
  };
  projectTypeKey: string;
}

export interface JiraIssueType {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  subtask: boolean;
}

export interface JiraPriority {
  id: string;
  name: string;
  iconUrl: string;
}

export interface JiraStatus {
  id: string;
  name: string;
  statusCategory: {
    id: number;
    key: string;
    colorName: string;
    name: string;
  };
}

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    description?: string;
    issuetype: JiraIssueType;
    project: JiraProject;
    status: JiraStatus;
    priority?: JiraPriority;
    assignee?: JiraUser;
    reporter: JiraUser;
    created: string;
    updated: string;
    labels?: string[];
    components?: Array<{ id: string; name: string }>;
  };
}

export interface JiraCreateIssueParams {
  projectKey: string;
  issueType: string;
  summary: string;
  description?: string;
  priority?: string;
  assignee?: string;
  labels?: string[];
}

// ============================================================================
// Google Drive Types
// ============================================================================

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  description?: string;
  iconLink?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  size?: string;
  createdTime: string;
  modifiedTime: string;
  owners?: Array<{
    displayName: string;
    emailAddress: string;
    photoLink?: string;
  }>;
  shared: boolean;
  starred: boolean;
}

export interface GoogleDriveFolder extends GoogleDriveFile {
  mimeType: "application/vnd.google-apps.folder";
}

export interface GoogleDrivePermission {
  id: string;
  type: "user" | "group" | "domain" | "anyone";
  role:
    | "owner"
    | "organizer"
    | "fileOrganizer"
    | "writer"
    | "commenter"
    | "reader";
  emailAddress?: string;
  displayName?: string;
}

export interface GoogleDrivePickerConfig {
  viewId?:
    | "DOCS"
    | "DOCS_IMAGES"
    | "DOCS_IMAGES_AND_VIDEOS"
    | "DOCUMENTS"
    | "DRAWINGS"
    | "FOLDERS"
    | "FORMS"
    | "PDFS"
    | "PRESENTATIONS"
    | "SPREADSHEETS";
  multiSelect?: boolean;
  selectFolders?: boolean;
  mimeTypes?: string[];
  callback?: (files: GoogleDriveFile[]) => void;
}

// ============================================================================
// Webhook Types
// ============================================================================

export type WebhookEventType =
  | "message.created"
  | "message.updated"
  | "message.deleted"
  | "channel.created"
  | "channel.updated"
  | "channel.deleted"
  | "member.joined"
  | "member.left"
  | "reaction.added"
  | "reaction.removed"
  | "integration.connected"
  | "integration.disconnected";

export interface WebhookConfig {
  id: string;
  url: string;
  secret: string;
  events: WebhookEventType[];
  active: boolean;
  createdAt: string;
  lastTriggeredAt?: string;
}

export interface IncomingWebhookPayload {
  source: string;
  event: string;
  timestamp: string;
  signature?: string;
  payload: Record<string, unknown>;
}

export interface WebhookVerificationResult {
  valid: boolean;
  error?: string;
}

// ============================================================================
// Integration Store Types
// ============================================================================

export interface IntegrationStoreState {
  integrations: Map<string, Integration>;
  credentials: Map<string, IntegrationCredentials>;
  syncStatus: Map<string, SyncStatus>;
  isLoading: boolean;
  error: string | null;
}

export interface SyncStatus {
  integrationId: string;
  status: "idle" | "syncing" | "success" | "error";
  progress?: number;
  lastSyncAt?: string;
  nextSyncAt?: string;
  error?: string;
}

export interface ChannelMapping {
  sourceChannelId: string;
  sourceChannelName: string;
  targetChannelId: string;
  targetChannelName: string;
  syncDirection: "incoming" | "outgoing" | "bidirectional";
  enabled: boolean;
}

export interface IntegrationSettings {
  integrationId: string;
  channelMappings: ChannelMapping[];
  notificationSettings: {
    enabled: boolean;
    events: WebhookEventType[];
    targetChannelId?: string;
  };
  syncOptions: {
    autoSync: boolean;
    syncInterval: number; // minutes
    syncHistory: boolean;
    historyDays?: number;
  };
}

// ============================================================================
// Discord Types
// ============================================================================

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  bot?: boolean;
  system?: boolean;
  email?: string;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner_id: string;
  permissions?: string;
  features: string[];
  approximate_member_count?: number;
  approximate_presence_count?: number;
}

export interface DiscordChannel {
  id: string;
  type: number;
  guild_id?: string;
  name: string;
  position?: number;
  topic?: string | null;
  nsfw?: boolean;
  last_message_id?: string | null;
  parent_id?: string | null;
}

export interface DiscordMessage {
  id: string;
  channel_id: string;
  author: DiscordUser;
  content: string;
  timestamp: string;
  edited_timestamp: string | null;
  tts: boolean;
  mention_everyone: boolean;
  mentions: DiscordUser[];
  attachments: Array<{
    id: string;
    filename: string;
    size: number;
    url: string;
    proxy_url: string;
  }>;
  embeds: Array<Record<string, unknown>>;
  reactions?: Array<{
    count: number;
    emoji: { id: string | null; name: string };
  }>;
}

export interface DiscordImportOptions {
  guildIds?: string[];
  channelIds?: string[];
  startDate?: string;
  endDate?: string;
  includeAttachments?: boolean;
}

export interface DiscordSyncResult {
  success: boolean;
  guildsSynced: number;
  channelsSynced: number;
  messagesSynced: number;
  errors: string[];
}

// ============================================================================
// Telegram Types
// ============================================================================

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  description?: string;
  invite_link?: string;
  photo?: {
    small_file_id: string;
    small_file_unique_id: string;
    big_file_id: string;
    big_file_unique_id: string;
  };
  permissions?: Record<string, boolean>;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  sender_chat?: TelegramChat;
  date: number;
  chat: TelegramChat;
  text?: string;
  caption?: string;
  photo?: Array<{
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    file_size?: number;
  }>;
  document?: {
    file_id: string;
    file_unique_id: string;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
  };
  video?: {
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    duration: number;
    file_size?: number;
  };
  voice?: {
    file_id: string;
    file_unique_id: string;
    duration: number;
    mime_type?: string;
    file_size?: number;
  };
  reply_to_message?: TelegramMessage;
}

export interface TelegramImportOptions {
  chatIds?: (number | string)[];
  startDate?: string;
  endDate?: string;
}

export interface TelegramSyncResult {
  success: boolean;
  chatsSynced: number;
  messagesSynced: number;
  errors: string[];
}
