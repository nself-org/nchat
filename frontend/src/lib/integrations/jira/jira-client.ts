/**
 * Jira Integration Client
 *
 * Handles Jira API interactions including OAuth, issue lookup,
 * issue creation from messages, and status updates.
 */

import type {
  IntegrationProvider,
  IntegrationCredentials,
  Integration,
  OAuthConfig,
  OAuthCallbackParams,
  JiraUser,
  JiraProject,
  JiraIssue,
  JiraIssueType,
  JiraStatus,
  JiraCreateIssueParams,
} from "../types";
import {
  buildAuthUrl,
  tokenResponseToCredentials,
  calculateTokenExpiry,
} from "../integration-manager";

// ============================================================================
// Constants
// ============================================================================

export const JIRA_AUTH_URL = "https://auth.atlassian.com/authorize";
export const JIRA_TOKEN_URL = "https://auth.atlassian.com/oauth/token";
export const JIRA_RESOURCES_URL =
  "https://api.atlassian.com/oauth/token/accessible-resources";

export const JIRA_DEFAULT_SCOPES = [
  "read:jira-work",
  "write:jira-work",
  "read:jira-user",
  "offline_access",
];

// ============================================================================
// Jira API Response Types
// ============================================================================

interface JiraSearchResponse {
  expand: string;
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
}

interface JiraAccessibleResource {
  id: string;
  url: string;
  name: string;
  scopes: string[];
  avatarUrl: string;
}

// ============================================================================
// Jira Client Configuration
// ============================================================================

export interface JiraClientConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
}

// ============================================================================
// Jira API Client
// ============================================================================

/**
 * Jira API client for making authenticated requests
 */
export class JiraApiClient {
  private accessToken: string;
  private cloudId: string;
  private baseUrl: string;

  constructor(accessToken: string, cloudId: string) {
    this.accessToken = accessToken;
    this.cloudId = cloudId;
    this.baseUrl = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3`;
  }

  /**
   * Make an authenticated GET request to Jira API
   */
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value);
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new JiraApiError(
        error.message ||
          error.errorMessages?.[0] ||
          `Jira API error: ${response.status}`,
        response.status,
        endpoint,
      );
    }

    return response.json();
  }

  /**
   * Make an authenticated POST request to Jira API
   */
  async post<T>(endpoint: string, body?: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new JiraApiError(
        error.message ||
          error.errorMessages?.[0] ||
          `Jira API error: ${response.status}`,
        response.status,
        endpoint,
      );
    }

    return response.json();
  }

  /**
   * Make an authenticated PUT request to Jira API
   */
  async put<T>(endpoint: string, body?: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new JiraApiError(
        error.message ||
          error.errorMessages?.[0] ||
          `Jira API error: ${response.status}`,
        response.status,
        endpoint,
      );
    }

    // PUT often returns 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // ==========================================================================
  // User Methods
  // ==========================================================================

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<JiraUser> {
    return this.get<JiraUser>("/myself");
  }

  /**
   * Search users
   */
  async searchUsers(query: string): Promise<JiraUser[]> {
    return this.get<JiraUser[]>("/user/search", { query });
  }

  // ==========================================================================
  // Project Methods
  // ==========================================================================

  /**
   * Get all projects
   */
  async getProjects(): Promise<JiraProject[]> {
    const response = await this.get<{ values: JiraProject[] }>(
      "/project/search",
    );
    return response.values;
  }

  /**
   * Get project by key
   */
  async getProject(projectKey: string): Promise<JiraProject> {
    return this.get<JiraProject>(`/project/${projectKey}`);
  }

  /**
   * Get issue types for a project
   */
  async getProjectIssueTypes(projectKey: string): Promise<JiraIssueType[]> {
    const project = await this.get<{ issueTypes: JiraIssueType[] }>(
      `/project/${projectKey}`,
    );
    return project.issueTypes;
  }

  // ==========================================================================
  // Issue Methods
  // ==========================================================================

  /**
   * Get issue by key
   */
  async getIssue(issueKey: string): Promise<JiraIssue> {
    return this.get<JiraIssue>(`/issue/${issueKey}`);
  }

  /**
   * Search issues using JQL
   */
  async searchIssues(
    jql: string,
    options?: {
      startAt?: number;
      maxResults?: number;
      fields?: string[];
    },
  ): Promise<{
    issues: JiraIssue[];
    total: number;
    startAt: number;
    maxResults: number;
  }> {
    const params: Record<string, string> = { jql };
    if (options?.startAt !== undefined)
      params.startAt = String(options.startAt);
    if (options?.maxResults !== undefined)
      params.maxResults = String(options.maxResults);
    if (options?.fields) params.fields = options.fields.join(",");

    const response = await this.get<JiraSearchResponse>("/search", params);
    return {
      issues: response.issues,
      total: response.total,
      startAt: response.startAt,
      maxResults: response.maxResults,
    };
  }

  /**
   * Create an issue
   */
  async createIssue(params: JiraCreateIssueParams): Promise<JiraIssue> {
    const body: Record<string, unknown> = {
      fields: {
        project: { key: params.projectKey },
        issuetype: { name: params.issueType },
        summary: params.summary,
      },
    };

    if (params.description) {
      body.fields = {
        ...(body.fields as Record<string, unknown>),
        description: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: params.description }],
            },
          ],
        },
      };
    }

    if (params.priority) {
      body.fields = {
        ...(body.fields as Record<string, unknown>),
        priority: { name: params.priority },
      };
    }

    if (params.assignee) {
      body.fields = {
        ...(body.fields as Record<string, unknown>),
        assignee: { accountId: params.assignee },
      };
    }

    if (params.labels?.length) {
      body.fields = {
        ...(body.fields as Record<string, unknown>),
        labels: params.labels,
      };
    }

    return this.post<JiraIssue>("/issue", body);
  }

  /**
   * Update issue status (transition)
   */
  async transitionIssue(issueKey: string, transitionId: string): Promise<void> {
    await this.post(`/issue/${issueKey}/transitions`, {
      transition: { id: transitionId },
    });
  }

  /**
   * Get available transitions for an issue
   */
  async getTransitions(issueKey: string): Promise<
    Array<{
      id: string;
      name: string;
      to: JiraStatus;
    }>
  > {
    const response = await this.get<{
      transitions: Array<{ id: string; name: string; to: JiraStatus }>;
    }>(`/issue/${issueKey}/transitions`);
    return response.transitions;
  }

  /**
   * Add comment to issue
   */
  async addComment(
    issueKey: string,
    body: string,
  ): Promise<{
    id: string;
    body: unknown;
    created: string;
    author: JiraUser;
  }> {
    return this.post(`/issue/${issueKey}/comment`, {
      body: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: body }],
          },
        ],
      },
    });
  }

  /**
   * Update issue fields
   */
  async updateIssue(
    issueKey: string,
    fields: Partial<{
      summary: string;
      description: string;
      priority: string;
      assignee: string;
      labels: string[];
    }>,
  ): Promise<void> {
    const body: Record<string, unknown> = { fields: {} };

    if (fields.summary) {
      (body.fields as Record<string, unknown>).summary = fields.summary;
    }

    if (fields.description) {
      (body.fields as Record<string, unknown>).description = {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: fields.description }],
          },
        ],
      };
    }

    if (fields.priority) {
      (body.fields as Record<string, unknown>).priority = {
        name: fields.priority,
      };
    }

    if (fields.assignee) {
      (body.fields as Record<string, unknown>).assignee = {
        accountId: fields.assignee,
      };
    }

    if (fields.labels) {
      (body.fields as Record<string, unknown>).labels = fields.labels;
    }

    await this.put(`/issue/${issueKey}`, body);
  }
}

// ============================================================================
// Jira API Error
// ============================================================================

export class JiraApiError extends Error {
  public readonly statusCode: number;
  public readonly endpoint: string;

  constructor(message: string, statusCode: number, endpoint: string) {
    super(
      `Jira API error: ${message} (status: ${statusCode}, endpoint: ${endpoint})`,
    );
    this.name = "JiraApiError";
    this.statusCode = statusCode;
    this.endpoint = endpoint;
  }
}

// ============================================================================
// Jira URL Parsing
// ============================================================================

const JIRA_ISSUE_URL_PATTERN = /([a-zA-Z][a-zA-Z0-9]*-\d+)/;

/**
 * Extract issue key from text or URL
 */
export function extractJiraIssueKey(text: string): string | null {
  const match = text.match(JIRA_ISSUE_URL_PATTERN);
  return match ? match[1] : null;
}

/**
 * Check if string contains Jira issue key
 */
export function containsJiraIssueKey(text: string): boolean {
  return JIRA_ISSUE_URL_PATTERN.test(text);
}

/**
 * Get all issue keys from text
 */
export function extractAllJiraIssueKeys(text: string): string[] {
  const matches = text.match(new RegExp(JIRA_ISSUE_URL_PATTERN, "g"));
  return matches ? [...new Set(matches)] : [];
}

// ============================================================================
// Jira Integration Provider
// ============================================================================

/**
 * Jira integration provider implementation
 */
export class JiraIntegrationProvider implements IntegrationProvider {
  readonly id = "jira" as const;
  readonly name = "Jira";
  readonly icon = "jira";
  readonly description =
    "Create and track issues, link conversations to tickets";
  readonly category = "productivity" as const;
  readonly scopes: string[];

  private config: JiraClientConfig;
  private client: JiraApiClient | null = null;
  private cloudId: string | null = null;

  constructor(config: JiraClientConfig) {
    this.config = config;
    this.scopes = config.scopes || JIRA_DEFAULT_SCOPES;
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(config?: Partial<OAuthConfig>): string {
    return buildAuthUrl(JIRA_AUTH_URL, {
      audience: "api.atlassian.com",
      client_id: this.config.clientId,
      redirect_uri: config?.redirectUri || this.config.redirectUri,
      scope: (config?.scopes || this.scopes).join(" "),
      state: config?.state || "",
      response_type: "code",
      prompt: "consent",
    });
  }

  /**
   * Start authorization
   */
  async authorize(): Promise<void> {
    // Handled by integration manager
  }

  /**
   * Disconnect from Jira
   */
  async disconnect(): Promise<void> {
    this.client = null;
    this.cloudId = null;
  }

  /**
   * Handle OAuth callback
   */
  async handleCallback(
    params: OAuthCallbackParams,
  ): Promise<IntegrationCredentials> {
    if (!params.code) {
      throw new Error("Missing authorization code");
    }

    // Exchange code for tokens
    const tokenResponse = await fetch(JIRA_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code: params.code,
        redirect_uri: this.config.redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    if (!tokenData.access_token) {
      throw new Error("No access token in response");
    }

    // Get accessible resources (cloud ID)
    const resourcesResponse = await fetch(JIRA_RESOURCES_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/json",
      },
    });

    const resources: JiraAccessibleResource[] = await resourcesResponse.json();

    if (!resources.length) {
      throw new Error("No accessible Jira sites found");
    }

    // Use the first accessible resource
    this.cloudId = resources[0].id;
    this.client = new JiraApiClient(tokenData.access_token, this.cloudId);

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: tokenData.expires_in
        ? calculateTokenExpiry(tokenData.expires_in)
        : undefined,
      tokenType: tokenData.token_type || "Bearer",
      scope: tokenData.scope,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(
    credentials: IntegrationCredentials,
  ): Promise<IntegrationCredentials> {
    if (!credentials.refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch(JIRA_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: credentials.refreshToken,
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error_description || data.error);
    }

    return tokenResponseToCredentials({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      token_type: data.token_type,
      scope: data.scope,
    });
  }

  /**
   * Get current integration status
   */
  async getStatus(): Promise<Integration> {
    const status: Integration = {
      id: this.id,
      name: this.name,
      icon: this.icon,
      description: this.description,
      category: this.category,
      status: "disconnected",
      scopes: this.scopes,
      config: {},
    };

    if (this.client) {
      try {
        const user = await this.client.getCurrentUser();
        status.status = "connected";
        status.config = {
          user: user.displayName,
          email: user.emailAddress,
          cloudId: this.cloudId,
        };
      } catch {
        status.status = "error";
        status.error = "Failed to verify connection";
      }
    }

    return status;
  }

  /**
   * Validate credentials
   */
  async validateCredentials(
    credentials: IntegrationCredentials,
  ): Promise<boolean> {
    if (!this.cloudId) {
      return false;
    }
    const testClient = new JiraApiClient(credentials.accessToken, this.cloudId);
    try {
      await testClient.getCurrentUser();
      return true;
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // Jira-Specific Methods
  // ==========================================================================

  /**
   * Get API client
   */
  getClient(
    credentials?: IntegrationCredentials,
    cloudId?: string,
  ): JiraApiClient {
    if (credentials && cloudId) {
      this.cloudId = cloudId;
      this.client = new JiraApiClient(credentials.accessToken, cloudId);
    }
    if (!this.client || !this.cloudId) {
      throw new Error("Jira client not initialized. Please connect first.");
    }
    return this.client;
  }

  /**
   * Set cloud ID
   */
  setCloudId(cloudId: string): void {
    this.cloudId = cloudId;
  }

  /**
   * Get cloud ID
   */
  getCloudId(): string | null {
    return this.cloudId;
  }

  /**
   * Look up an issue by key
   */
  async lookupIssue(
    credentials: IntegrationCredentials,
    issueKey: string,
  ): Promise<JiraIssue> {
    const client = this.getClient(credentials, this.cloudId || undefined);
    return client.getIssue(issueKey);
  }

  /**
   * Create issue from message
   */
  async createIssueFromMessage(
    credentials: IntegrationCredentials,
    params: JiraCreateIssueParams,
  ): Promise<JiraIssue> {
    const client = this.getClient(credentials, this.cloudId || undefined);
    return client.createIssue(params);
  }

  /**
   * Update issue status
   */
  async updateIssueStatus(
    credentials: IntegrationCredentials,
    issueKey: string,
    statusName: string,
  ): Promise<void> {
    const client = this.getClient(credentials, this.cloudId || undefined);

    // Get available transitions
    const transitions = await client.getTransitions(issueKey);
    const transition = transitions.find(
      (t) =>
        t.name.toLowerCase() === statusName.toLowerCase() ||
        t.to.name.toLowerCase() === statusName.toLowerCase(),
    );

    if (!transition) {
      throw new Error(
        `Cannot transition to status "${statusName}". Available: ${transitions.map((t) => t.name).join(", ")}`,
      );
    }

    await client.transitionIssue(issueKey, transition.id);
  }

  /**
   * Get projects
   */
  async getProjects(
    credentials: IntegrationCredentials,
  ): Promise<JiraProject[]> {
    const client = this.getClient(credentials, this.cloudId || undefined);
    return client.getProjects();
  }

  /**
   * Extract and look up issues from text
   */
  async lookupIssuesInText(
    credentials: IntegrationCredentials,
    text: string,
  ): Promise<JiraIssue[]> {
    const issueKeys = extractAllJiraIssueKeys(text);
    if (!issueKeys.length) {
      return [];
    }

    const client = this.getClient(credentials, this.cloudId || undefined);
    const issues: JiraIssue[] = [];

    for (const key of issueKeys) {
      try {
        const issue = await client.getIssue(key);
        issues.push(issue);
      } catch {
        // Skip issues that don't exist or aren't accessible
      }
    }

    return issues;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Jira integration provider
 */
export function createJiraProvider(
  config: JiraClientConfig,
): JiraIntegrationProvider {
  return new JiraIntegrationProvider(config);
}
