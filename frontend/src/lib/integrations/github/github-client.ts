/**
 * GitHub Integration Client
 *
 * Handles GitHub API interactions including OAuth, webhook handling,
 * issue/PR notifications, and link unfurling.
 */

import type {
  IntegrationProvider,
  IntegrationCredentials,
  Integration,
  OAuthConfig,
  OAuthCallbackParams,
  GitHubUser,
  GitHubRepository,
  GitHubIssue,
  GitHubPullRequest,
  GitHubCommit,
  GitHubWebhookPayload,
} from "../types";
import {
  buildAuthUrl,
  tokenResponseToCredentials,
} from "../integration-manager";

// ============================================================================
// Constants
// ============================================================================

export const GITHUB_API_BASE = "https://api.github.com";
export const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";
export const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";

export const GITHUB_DEFAULT_SCOPES = [
  "repo",
  "read:org",
  "read:user",
  "user:email",
];

// ============================================================================
// GitHub API Response Types
// ============================================================================

interface GitHubApiErrorResponse {
  message: string;
  documentation_url?: string;
  errors?: Array<{
    resource: string;
    field: string;
    code: string;
    message?: string;
  }>;
}

// ============================================================================
// GitHub Client Configuration
// ============================================================================

export interface GitHubClientConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
  webhookSecret?: string;
}

// ============================================================================
// GitHub API Client
// ============================================================================

/**
 * GitHub API client for making authenticated requests
 */
export class GitHubApiClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Make an authenticated GET request to GitHub API
   */
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${GITHUB_API_BASE}${endpoint}`);
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
        Accept: "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      const error: GitHubApiErrorResponse = await response.json();
      throw new GitHubApiError(
        error.message || `GitHub API error: ${response.status}`,
        response.status,
        endpoint,
      );
    }

    return response.json();
  }

  /**
   * Make an authenticated POST request to GitHub API
   */
  async post<T>(endpoint: string, body?: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error: GitHubApiErrorResponse = await response.json();
      throw new GitHubApiError(
        error.message || `GitHub API error: ${response.status}`,
        response.status,
        endpoint,
      );
    }

    return response.json();
  }

  /**
   * Make an authenticated PATCH request to GitHub API
   */
  async patch<T>(endpoint: string, body?: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error: GitHubApiErrorResponse = await response.json();
      throw new GitHubApiError(
        error.message || `GitHub API error: ${response.status}`,
        response.status,
        endpoint,
      );
    }

    return response.json();
  }

  // ==========================================================================
  // User Methods
  // ==========================================================================

  /**
   * Get authenticated user
   */
  async getAuthenticatedUser(): Promise<GitHubUser> {
    return this.get<GitHubUser>("/user");
  }

  /**
   * Get user by username
   */
  async getUser(username: string): Promise<GitHubUser> {
    return this.get<GitHubUser>(`/users/${username}`);
  }

  // ==========================================================================
  // Repository Methods
  // ==========================================================================

  /**
   * Get repository
   */
  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    return this.get<GitHubRepository>(`/repos/${owner}/${repo}`);
  }

  /**
   * List repositories for authenticated user
   */
  async listRepositories(options?: {
    type?: "all" | "owner" | "public" | "private" | "member";
    sort?: "created" | "updated" | "pushed" | "full_name";
    direction?: "asc" | "desc";
    perPage?: number;
    page?: number;
  }): Promise<GitHubRepository[]> {
    const params: Record<string, string> = {};
    if (options?.type) params.type = options.type;
    if (options?.sort) params.sort = options.sort;
    if (options?.direction) params.direction = options.direction;
    if (options?.perPage) params.per_page = String(options.perPage);
    if (options?.page) params.page = String(options.page);

    return this.get<GitHubRepository[]>("/user/repos", params);
  }

  // ==========================================================================
  // Issue Methods
  // ==========================================================================

  /**
   * Get issue
   */
  async getIssue(
    owner: string,
    repo: string,
    issueNumber: number,
  ): Promise<GitHubIssue> {
    return this.get<GitHubIssue>(
      `/repos/${owner}/${repo}/issues/${issueNumber}`,
    );
  }

  /**
   * List issues for a repository
   */
  async listIssues(
    owner: string,
    repo: string,
    options?: {
      state?: "open" | "closed" | "all";
      labels?: string;
      sort?: "created" | "updated" | "comments";
      direction?: "asc" | "desc";
      perPage?: number;
      page?: number;
    },
  ): Promise<GitHubIssue[]> {
    const params: Record<string, string> = {};
    if (options?.state) params.state = options.state;
    if (options?.labels) params.labels = options.labels;
    if (options?.sort) params.sort = options.sort;
    if (options?.direction) params.direction = options.direction;
    if (options?.perPage) params.per_page = String(options.perPage);
    if (options?.page) params.page = String(options.page);

    return this.get<GitHubIssue[]>(`/repos/${owner}/${repo}/issues`, params);
  }

  /**
   * Create an issue
   */
  async createIssue(
    owner: string,
    repo: string,
    data: {
      title: string;
      body?: string;
      labels?: string[];
      assignees?: string[];
      milestone?: number;
    },
  ): Promise<GitHubIssue> {
    return this.post<GitHubIssue>(`/repos/${owner}/${repo}/issues`, data);
  }

  /**
   * Update an issue
   */
  async updateIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    data: {
      title?: string;
      body?: string;
      state?: "open" | "closed";
      labels?: string[];
      assignees?: string[];
    },
  ): Promise<GitHubIssue> {
    return this.patch<GitHubIssue>(
      `/repos/${owner}/${repo}/issues/${issueNumber}`,
      data,
    );
  }

  /**
   * Add comment to issue
   */
  async addIssueComment(
    owner: string,
    repo: string,
    issueNumber: number,
    body: string,
  ): Promise<{ id: number; body: string; html_url: string }> {
    return this.post(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
      body,
    });
  }

  // ==========================================================================
  // Pull Request Methods
  // ==========================================================================

  /**
   * Get pull request
   */
  async getPullRequest(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<GitHubPullRequest> {
    return this.get<GitHubPullRequest>(
      `/repos/${owner}/${repo}/pulls/${prNumber}`,
    );
  }

  /**
   * List pull requests
   */
  async listPullRequests(
    owner: string,
    repo: string,
    options?: {
      state?: "open" | "closed" | "all";
      head?: string;
      base?: string;
      sort?: "created" | "updated" | "popularity" | "long-running";
      direction?: "asc" | "desc";
      perPage?: number;
      page?: number;
    },
  ): Promise<GitHubPullRequest[]> {
    const params: Record<string, string> = {};
    if (options?.state) params.state = options.state;
    if (options?.head) params.head = options.head;
    if (options?.base) params.base = options.base;
    if (options?.sort) params.sort = options.sort;
    if (options?.direction) params.direction = options.direction;
    if (options?.perPage) params.per_page = String(options.perPage);
    if (options?.page) params.page = String(options.page);

    return this.get<GitHubPullRequest[]>(
      `/repos/${owner}/${repo}/pulls`,
      params,
    );
  }

  // ==========================================================================
  // Commit Methods
  // ==========================================================================

  /**
   * Get commit
   */
  async getCommit(
    owner: string,
    repo: string,
    sha: string,
  ): Promise<{
    sha: string;
    commit: {
      message: string;
      author: { name: string; email: string; date: string };
      committer: { name: string; email: string; date: string };
    };
    html_url: string;
    author: GitHubUser | null;
    committer: GitHubUser | null;
  }> {
    return this.get(`/repos/${owner}/${repo}/commits/${sha}`);
  }

  /**
   * List commits
   */
  async listCommits(
    owner: string,
    repo: string,
    options?: {
      sha?: string;
      path?: string;
      author?: string;
      since?: string;
      until?: string;
      perPage?: number;
      page?: number;
    },
  ): Promise<
    Array<{
      sha: string;
      commit: { message: string };
      html_url: string;
    }>
  > {
    const params: Record<string, string> = {};
    if (options?.sha) params.sha = options.sha;
    if (options?.path) params.path = options.path;
    if (options?.author) params.author = options.author;
    if (options?.since) params.since = options.since;
    if (options?.until) params.until = options.until;
    if (options?.perPage) params.per_page = String(options.perPage);
    if (options?.page) params.page = String(options.page);

    return this.get(`/repos/${owner}/${repo}/commits`, params);
  }
}

// ============================================================================
// GitHub API Error
// ============================================================================

export class GitHubApiError extends Error {
  public readonly statusCode: number;
  public readonly endpoint: string;

  constructor(message: string, statusCode: number, endpoint: string) {
    super(
      `GitHub API error: ${message} (status: ${statusCode}, endpoint: ${endpoint})`,
    );
    this.name = "GitHubApiError";
    this.statusCode = statusCode;
    this.endpoint = endpoint;
  }
}

// ============================================================================
// Webhook Utilities
// ============================================================================

/**
 * Verify GitHub webhook signature
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  if (!signature || !signature.startsWith("sha256=")) {
    return false;
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );
  const expectedSignature =
    "sha256=" +
    Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  return signature === expectedSignature;
}

/**
 * Parse GitHub webhook event type from headers
 */
export function parseWebhookEventType(
  headers: Record<string, string>,
): string | null {
  return headers["x-github-event"] || headers["X-GitHub-Event"] || null;
}

/**
 * Parse GitHub webhook delivery ID from headers
 */
export function parseWebhookDeliveryId(
  headers: Record<string, string>,
): string | null {
  return headers["x-github-delivery"] || headers["X-GitHub-Delivery"] || null;
}

/**
 * Format webhook payload for display
 */
export function formatWebhookNotification(
  eventType: string,
  payload: GitHubWebhookPayload,
): {
  title: string;
  body: string;
  url?: string;
} {
  const repo = payload.repository?.full_name || "Unknown repository";

  switch (eventType) {
    case "issues":
      return {
        title: `Issue ${payload.action}: ${payload.issue?.title}`,
        body: `${payload.sender?.login} ${payload.action} issue #${payload.issue?.number} in ${repo}`,
        url: payload.issue?.html_url,
      };

    case "pull_request":
      return {
        title: `PR ${payload.action}: ${payload.pull_request?.title}`,
        body: `${payload.sender?.login} ${payload.action} PR #${payload.pull_request?.number} in ${repo}`,
        url: payload.pull_request?.html_url,
      };

    case "push":
      const commitCount = payload.commits?.length || 0;
      const branch = payload.ref?.replace("refs/heads/", "") || "unknown";
      return {
        title: `Push to ${branch}`,
        body: `${payload.sender?.login} pushed ${commitCount} commit(s) to ${repo}`,
        url: payload.commits?.[0]?.html_url,
      };

    case "issue_comment":
      return {
        title: `Comment on issue #${payload.issue?.number}`,
        body: `${payload.sender?.login} commented on ${payload.issue?.title}`,
        url: payload.comment?.html_url,
      };

    case "pull_request_review":
      return {
        title: `Review on PR #${payload.pull_request?.number}`,
        body: `${payload.sender?.login} reviewed ${payload.pull_request?.title}`,
        url: payload.pull_request?.html_url,
      };

    default:
      return {
        title: `GitHub ${eventType}`,
        body: `${payload.sender?.login} triggered ${eventType} in ${repo}`,
      };
  }
}

// ============================================================================
// Link Unfurling
// ============================================================================

const GITHUB_URL_PATTERNS = {
  issue: /github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/,
  pr: /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/,
  commit: /github\.com\/([^/]+)\/([^/]+)\/commit\/([a-f0-9]+)/,
  repo: /github\.com\/([^/]+)\/([^/]+)$/,
  user: /github\.com\/([^/]+)$/,
};

/**
 * Parse GitHub URL to determine type and extract parameters
 */
export function parseGitHubUrl(url: string): {
  type: "issue" | "pr" | "commit" | "repo" | "user" | "unknown";
  owner?: string;
  repo?: string;
  number?: number;
  sha?: string;
  username?: string;
} {
  for (const [type, pattern] of Object.entries(GITHUB_URL_PATTERNS)) {
    const match = url.match(pattern);
    if (match) {
      switch (type) {
        case "issue":
          return {
            type: "issue",
            owner: match[1],
            repo: match[2],
            number: parseInt(match[3]),
          };
        case "pr":
          return {
            type: "pr",
            owner: match[1],
            repo: match[2],
            number: parseInt(match[3]),
          };
        case "commit":
          return {
            type: "commit",
            owner: match[1],
            repo: match[2],
            sha: match[3],
          };
        case "repo":
          return { type: "repo", owner: match[1], repo: match[2] };
        case "user":
          return { type: "user", username: match[1] };
      }
    }
  }
  return { type: "unknown" };
}

/**
 * Unfurl a GitHub URL
 */
export async function unfurlGitHubUrl(
  url: string,
  client: GitHubApiClient,
): Promise<{
  type: string;
  title: string;
  description?: string;
  state?: string;
  author?: string;
  avatarUrl?: string;
  url: string;
} | null> {
  const parsed = parseGitHubUrl(url);

  try {
    switch (parsed.type) {
      case "issue": {
        const issue = await client.getIssue(
          parsed.owner!,
          parsed.repo!,
          parsed.number!,
        );
        return {
          type: "issue",
          title: `#${issue.number} ${issue.title}`,
          description: issue.body?.slice(0, 200) || undefined,
          state: issue.state,
          author: issue.user.login,
          avatarUrl: issue.user.avatar_url,
          url: issue.html_url,
        };
      }

      case "pr": {
        const pr = await client.getPullRequest(
          parsed.owner!,
          parsed.repo!,
          parsed.number!,
        );
        return {
          type: "pull_request",
          title: `#${pr.number} ${pr.title}`,
          description: pr.body?.slice(0, 200) || undefined,
          state: pr.merged ? "merged" : pr.state,
          author: pr.user.login,
          avatarUrl: pr.user.avatar_url,
          url: pr.html_url,
        };
      }

      case "commit": {
        const commit = await client.getCommit(
          parsed.owner!,
          parsed.repo!,
          parsed.sha!,
        );
        return {
          type: "commit",
          title: commit.sha.slice(0, 7),
          description: commit.commit.message.split("\n")[0],
          author: commit.commit.author.name,
          avatarUrl: commit.author?.avatar_url,
          url: commit.html_url,
        };
      }

      case "repo": {
        const repo = await client.getRepository(parsed.owner!, parsed.repo!);
        return {
          type: "repository",
          title: repo.full_name,
          description: repo.description || undefined,
          author: repo.owner.login,
          avatarUrl: repo.owner.avatar_url,
          url: repo.html_url,
        };
      }

      case "user": {
        const user = await client.getUser(parsed.username!);
        return {
          type: "user",
          title: user.login,
          description: user.name || undefined,
          avatarUrl: user.avatar_url,
          url: user.html_url,
        };
      }

      default:
        return null;
    }
  } catch {
    return null;
  }
}

// ============================================================================
// GitHub Integration Provider
// ============================================================================

/**
 * GitHub integration provider implementation
 */
export class GitHubIntegrationProvider implements IntegrationProvider {
  readonly id = "github" as const;
  readonly name = "GitHub";
  readonly icon = "github";
  readonly description =
    "Connect repositories, receive notifications, and unfurl links";
  readonly category = "devtools" as const;
  readonly scopes: string[];

  private config: GitHubClientConfig;
  private client: GitHubApiClient | null = null;

  constructor(config: GitHubClientConfig) {
    this.config = config;
    this.scopes = config.scopes || GITHUB_DEFAULT_SCOPES;
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(config?: Partial<OAuthConfig>): string {
    return buildAuthUrl(GITHUB_AUTH_URL, {
      client_id: this.config.clientId,
      redirect_uri: config?.redirectUri || this.config.redirectUri,
      scope: (config?.scopes || this.scopes).join(" "),
      state: config?.state || "",
      allow_signup: "true",
    });
  }

  /**
   * Start authorization
   */
  async authorize(): Promise<void> {
    // Handled by integration manager
  }

  /**
   * Disconnect from GitHub
   */
  async disconnect(): Promise<void> {
    this.client = null;
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

    const response = await fetch(GITHUB_TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code: params.code,
        redirect_uri: this.config.redirectUri,
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error_description || data.error);
    }

    if (!data.access_token) {
      throw new Error("No access token in response");
    }

    this.client = new GitHubApiClient(data.access_token);

    return {
      accessToken: data.access_token,
      tokenType: data.token_type || "Bearer",
      scope: data.scope,
    };
  }

  /**
   * Refresh token - GitHub tokens don't expire by default
   */
  async refreshToken(
    credentials: IntegrationCredentials,
  ): Promise<IntegrationCredentials> {
    // GitHub OAuth tokens don't typically expire
    // If refresh is needed, user must re-authenticate
    return credentials;
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
        const user = await this.client.getAuthenticatedUser();
        status.status = "connected";
        status.config = {
          username: user.login,
          name: user.name,
          avatarUrl: user.avatar_url,
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
    const testClient = new GitHubApiClient(credentials.accessToken);
    try {
      await testClient.getAuthenticatedUser();
      return true;
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // GitHub-Specific Methods
  // ==========================================================================

  /**
   * Get API client
   */
  getClient(credentials?: IntegrationCredentials): GitHubApiClient {
    if (credentials) {
      this.client = new GitHubApiClient(credentials.accessToken);
    }
    if (!this.client) {
      throw new Error("GitHub client not initialized. Please connect first.");
    }
    return this.client;
  }

  /**
   * Handle webhook payload
   */
  async handleWebhook(
    headers: Record<string, string>,
    payload: string,
  ): Promise<{
    eventType: string;
    deliveryId: string | null;
    notification: { title: string; body: string; url?: string };
  }> {
    // Verify signature if secret is configured
    if (this.config.webhookSecret) {
      const signature =
        headers["x-hub-signature-256"] || headers["X-Hub-Signature-256"] || "";
      const isValid = await verifyWebhookSignature(
        payload,
        signature,
        this.config.webhookSecret,
      );
      if (!isValid) {
        throw new Error("Invalid webhook signature");
      }
    }

    const eventType = parseWebhookEventType(headers);
    if (!eventType) {
      throw new Error("Missing event type header");
    }

    const deliveryId = parseWebhookDeliveryId(headers);
    const parsedPayload: GitHubWebhookPayload = JSON.parse(payload);
    const notification = formatWebhookNotification(eventType, parsedPayload);

    return { eventType, deliveryId, notification };
  }

  /**
   * Unfurl a GitHub URL
   */
  async unfurlUrl(credentials: IntegrationCredentials, url: string) {
    const client = this.getClient(credentials);
    return unfurlGitHubUrl(url, client);
  }

  /**
   * Create issue from message
   */
  async createIssueFromMessage(
    credentials: IntegrationCredentials,
    owner: string,
    repo: string,
    data: {
      title: string;
      body?: string;
      labels?: string[];
    },
  ): Promise<GitHubIssue> {
    const client = this.getClient(credentials);
    return client.createIssue(owner, repo, data);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a GitHub integration provider
 */
export function createGitHubProvider(
  config: GitHubClientConfig,
): GitHubIntegrationProvider {
  return new GitHubIntegrationProvider(config);
}
