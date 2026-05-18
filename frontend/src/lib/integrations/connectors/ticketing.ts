/**
 * Ticketing Connector
 *
 * Supports Jira, Linear, and GitHub Issues.
 * Features: create tickets from messages, status update notifications,
 * assignment notifications, priority/label management, bidirectional sync.
 */

import { BaseConnector } from "../catalog/base-connector";
import {
  type ConnectorConfig,
  type ConnectorCredentials,
  type HealthCheckResult,
  type CatalogEntry,
  type ConnectorCapability,
  type IntegrationCatalogCategory,
  type Ticket,
  type TicketComment,
  type TicketCreateParams,
  type TicketUpdateParams,
  type TicketingProvider,
  ConnectorError,
} from "../catalog/types";

// ============================================================================
// Ticketing API Abstraction
// ============================================================================

interface TicketingApiAdapter {
  listTickets(
    projectKey: string,
    options?: { status?: string; assignee?: string; limit?: number },
  ): Promise<Ticket[]>;
  getTicket(ticketId: string): Promise<Ticket>;
  createTicket(params: TicketCreateParams): Promise<Ticket>;
  updateTicket(ticketId: string, params: TicketUpdateParams): Promise<Ticket>;
  addComment(
    ticketId: string,
    body: string,
    author?: string,
  ): Promise<TicketComment>;
  getComments(ticketId: string): Promise<TicketComment[]>;
  getStatuses(projectKey: string): Promise<string[]>;
  searchTickets(query: string, limit?: number): Promise<Ticket[]>;
  healthCheck(): Promise<{ ok: boolean; message: string }>;
}

// ============================================================================
// Jira Adapter
// ============================================================================

class JiraAdapter implements TicketingApiAdapter {
  private baseUrl: string;
  private accessToken: string;
  private cloudId: string;

  constructor(accessToken: string, siteUrl: string, cloudId: string) {
    this.accessToken = accessToken;
    this.baseUrl = siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
    this.cloudId = cloudId;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `https://api.atlassian.com/ex/jira/${this.cloudId}/rest/api/3${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Jira API ${response.status}: ${errorText}`);
    }
    if (response.status === 204) return {} as T;
    return response.json();
  }

  async listTickets(
    projectKey: string,
    options?: { status?: string; assignee?: string; limit?: number },
  ): Promise<Ticket[]> {
    let jql = `project = ${projectKey}`;
    if (options?.status) jql += ` AND status = "${options.status}"`;
    if (options?.assignee) jql += ` AND assignee = "${options.assignee}"`;

    const params = new URLSearchParams({
      jql,
      maxResults: String(options?.limit || 50),
      fields:
        "summary,description,status,priority,assignee,reporter,labels,issuetype,project,created,updated",
    });

    const data = await this.request<{
      issues: Array<{
        id: string;
        key: string;
        self: string;
        fields: {
          summary: string;
          description?: unknown;
          status: { name: string };
          priority?: { name: string };
          assignee?: {
            displayName: string;
            emailAddress: string;
            avatarUrls?: { "48x48"?: string };
          };
          reporter: {
            displayName: string;
            emailAddress: string;
            avatarUrls?: { "48x48"?: string };
          };
          labels: string[];
          issuetype: { name: string };
          project: { key: string; name: string };
          created: string;
          updated: string;
        };
      }>;
    }>(`/search?${params}`);

    return (data.issues || []).map((issue) => this.mapJiraTicket(issue));
  }

  async getTicket(ticketId: string): Promise<Ticket> {
    const data = await this.request<Record<string, unknown>>(
      `/issue/${ticketId}`,
    );
    return this.mapJiraTicket(data as never);
  }

  async createTicket(params: TicketCreateParams): Promise<Ticket> {
    const body = {
      fields: {
        project: { key: params.projectKey },
        summary: params.title,
        description: params.description
          ? {
              type: "doc",
              version: 1,
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: params.description }],
                },
              ],
            }
          : undefined,
        issuetype: { name: params.type || "Task" },
        priority: params.priority
          ? { name: this.mapPriorityToJira(params.priority) }
          : undefined,
        labels: params.labels,
      },
    };

    const data = await this.request<{ id: string; key: string }>("/issue", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return this.getTicket(data.key);
  }

  async updateTicket(
    ticketId: string,
    params: TicketUpdateParams,
  ): Promise<Ticket> {
    const fields: Record<string, unknown> = {};
    if (params.title) fields.summary = params.title;
    if (params.description) {
      fields.description = {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: params.description }],
          },
        ],
      };
    }
    if (params.priority)
      fields.priority = { name: this.mapPriorityToJira(params.priority) };
    if (params.labels) fields.labels = params.labels;

    if (Object.keys(fields).length > 0) {
      await this.request(`/issue/${ticketId}`, {
        method: "PUT",
        body: JSON.stringify({ fields }),
      });
    }

    if (params.status) {
      const transitions = await this.request<{
        transitions: Array<{ id: string; name: string }>;
      }>(`/issue/${ticketId}/transitions`);

      const transition = transitions.transitions.find(
        (t) => t.name.toLowerCase() === params.status!.toLowerCase(),
      );
      if (transition) {
        await this.request(`/issue/${ticketId}/transitions`, {
          method: "POST",
          body: JSON.stringify({ transition: { id: transition.id } }),
        });
      }
    }

    return this.getTicket(ticketId);
  }

  async addComment(ticketId: string, body: string): Promise<TicketComment> {
    const data = await this.request<{
      id: string;
      body: { content: Array<{ content: Array<{ text: string }> }> };
      author: {
        displayName: string;
        emailAddress: string;
        avatarUrls?: { "48x48"?: string };
      };
      created: string;
      updated: string;
    }>(`/issue/${ticketId}/comment`, {
      method: "POST",
      body: JSON.stringify({
        body: {
          type: "doc",
          version: 1,
          content: [
            { type: "paragraph", content: [{ type: "text", text: body }] },
          ],
        },
      }),
    });

    return {
      id: data.id,
      body,
      author: {
        name: data.author.displayName,
        email: data.author.emailAddress,
        avatarUrl: data.author.avatarUrls?.["48x48"],
      },
      createdAt: data.created,
      updatedAt: data.updated,
    };
  }

  async getComments(ticketId: string): Promise<TicketComment[]> {
    const data = await this.request<{
      comments: Array<{
        id: string;
        body: { content: Array<{ content: Array<{ text: string }> }> };
        author: {
          displayName: string;
          emailAddress: string;
          avatarUrls?: { "48x48"?: string };
        };
        created: string;
        updated: string;
      }>;
    }>(`/issue/${ticketId}/comment`);

    return (data.comments || []).map((c) => ({
      id: c.id,
      body: this.extractTextFromDoc(c.body),
      author: {
        name: c.author.displayName,
        email: c.author.emailAddress,
        avatarUrl: c.author.avatarUrls?.["48x48"],
      },
      createdAt: c.created,
      updatedAt: c.updated,
    }));
  }

  async getStatuses(projectKey: string): Promise<string[]> {
    const data = await this.request<
      Array<{ statuses: Array<{ name: string }> }>
    >(`/project/${projectKey}/statuses`);
    const statuses = new Set<string>();
    data.forEach((type) => type.statuses.forEach((s) => statuses.add(s.name)));
    return Array.from(statuses);
  }

  async searchTickets(query: string, limit = 20): Promise<Ticket[]> {
    const params = new URLSearchParams({
      jql: `text ~ "${query}"`,
      maxResults: String(limit),
      fields:
        "summary,description,status,priority,assignee,reporter,labels,issuetype,project,created,updated",
    });

    const data = await this.request<{
      issues: Array<Record<string, unknown>>;
    }>(`/search?${params}`);

    return (data.issues || []).map((issue) =>
      this.mapJiraTicket(issue as never),
    );
  }

  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    try {
      await this.request("/myself");
      return { ok: true, message: "Jira API is accessible" };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Health check failed",
      };
    }
  }

  private mapJiraTicket(issue: {
    id: string;
    key: string;
    fields: {
      summary: string;
      description?: unknown;
      status: { name: string };
      priority?: { name: string };
      assignee?: {
        displayName: string;
        emailAddress: string;
        avatarUrls?: { "48x48"?: string };
      };
      reporter: {
        displayName: string;
        emailAddress: string;
        avatarUrls?: { "48x48"?: string };
      };
      labels: string[];
      issuetype: { name: string };
      project: { key: string; name: string };
      created: string;
      updated: string;
    };
  }): Ticket {
    return {
      id: issue.id,
      key: issue.key,
      title: issue.fields.summary,
      description: this.extractTextFromDoc(issue.fields.description),
      status: issue.fields.status.name,
      priority: this.mapJiraPriority(issue.fields.priority?.name),
      assignee: issue.fields.assignee
        ? {
            name: issue.fields.assignee.displayName,
            email: issue.fields.assignee.emailAddress,
            avatarUrl: issue.fields.assignee.avatarUrls?.["48x48"],
          }
        : undefined,
      reporter: {
        name: issue.fields.reporter.displayName,
        email: issue.fields.reporter.emailAddress,
        avatarUrl: issue.fields.reporter.avatarUrls?.["48x48"],
      },
      labels: issue.fields.labels || [],
      type: issue.fields.issuetype.name,
      projectKey: issue.fields.project.key,
      projectName: issue.fields.project.name,
      url: `${this.baseUrl}/browse/${issue.key}`,
      createdAt: issue.fields.created,
      updatedAt: issue.fields.updated,
      provider: "jira",
      externalId: issue.id,
      comments: [],
    };
  }

  private mapJiraPriority(name?: string): Ticket["priority"] {
    if (!name) return "none";
    const map: Record<string, Ticket["priority"]> = {
      Highest: "critical",
      High: "high",
      Medium: "medium",
      Low: "low",
      Lowest: "low",
    };
    return map[name] || "medium";
  }

  private mapPriorityToJira(priority: string): string {
    const map: Record<string, string> = {
      critical: "Highest",
      high: "High",
      medium: "Medium",
      low: "Low",
      none: "Low",
    };
    return map[priority] || "Medium";
  }

  private extractTextFromDoc(doc: unknown): string {
    if (!doc || typeof doc === "string") return (doc as string) || "";
    if (typeof doc === "object" && doc !== null) {
      const d = doc as {
        content?: Array<{ content?: Array<{ text?: string }> }>;
      };
      if (d.content) {
        return d.content
          .map(
            (block) =>
              block.content?.map((inline) => inline.text || "").join("") || "",
          )
          .join("\n");
      }
    }
    return "";
  }
}

// ============================================================================
// Linear Adapter
// ============================================================================

class LinearAdapter implements TicketingApiAdapter {
  private baseUrl = "https://api.linear.app/graphql";
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async graphql<T>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        Authorization: this.accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Linear API ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    if (result.errors) {
      throw new Error(`Linear GraphQL: ${result.errors[0].message}`);
    }
    return result.data;
  }

  async listTickets(
    projectKey: string,
    options?: { status?: string; assignee?: string; limit?: number },
  ): Promise<Ticket[]> {
    const filters: string[] = [`team: { key: { eq: "${projectKey}" } }`];
    if (options?.status)
      filters.push(`state: { name: { eq: "${options.status}" } }`);
    if (options?.assignee)
      filters.push(`assignee: { email: { eq: "${options.assignee}" } }`);

    const data = await this.graphql<{
      issues: {
        nodes: Array<{
          id: string;
          identifier: string;
          title: string;
          description?: string;
          state: { name: string };
          priority: number;
          assignee?: { name: string; email: string; avatarUrl?: string };
          creator: { name: string; email: string; avatarUrl?: string };
          labels: { nodes: Array<{ name: string }> };
          team: { key: string; name: string };
          url: string;
          createdAt: string;
          updatedAt: string;
        }>;
      };
    }>(`
      query {
        issues(filter: { ${filters.join(", ")} }, first: ${options?.limit || 50}) {
          nodes {
            id identifier title description
            state { name }
            priority
            assignee { name email avatarUrl }
            creator { name email avatarUrl }
            labels { nodes { name } }
            team { key name }
            url createdAt updatedAt
          }
        }
      }
    `);

    return (data.issues.nodes || []).map((issue) =>
      this.mapLinearTicket(issue),
    );
  }

  async getTicket(ticketId: string): Promise<Ticket> {
    const data = await this.graphql<{
      issue: {
        id: string;
        identifier: string;
        title: string;
        description?: string;
        state: { name: string };
        priority: number;
        assignee?: { name: string; email: string; avatarUrl?: string };
        creator: { name: string; email: string; avatarUrl?: string };
        labels: { nodes: Array<{ name: string }> };
        team: { key: string; name: string };
        url: string;
        createdAt: string;
        updatedAt: string;
        comments: {
          nodes: Array<{
            id: string;
            body: string;
            user: { name: string; email: string; avatarUrl?: string };
            createdAt: string;
            updatedAt: string;
          }>;
        };
      };
    }>(`
      query {
        issue(id: "${ticketId}") {
          id identifier title description
          state { name }
          priority
          assignee { name email avatarUrl }
          creator { name email avatarUrl }
          labels { nodes { name } }
          team { key name }
          url createdAt updatedAt
          comments { nodes { id body user { name email avatarUrl } createdAt updatedAt } }
        }
      }
    `);

    const ticket = this.mapLinearTicket(data.issue);
    ticket.comments = (data.issue.comments?.nodes || []).map((c) => ({
      id: c.id,
      body: c.body,
      author: {
        name: c.user.name,
        email: c.user.email,
        avatarUrl: c.user.avatarUrl,
      },
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
    return ticket;
  }

  async createTicket(params: TicketCreateParams): Promise<Ticket> {
    const data = await this.graphql<{
      issueCreate: { issue: { id: string } };
    }>(
      `
      mutation($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          issue { id }
        }
      }
    `,
      {
        input: {
          teamId: params.projectKey,
          title: params.title,
          description: params.description,
          priority: this.mapPriorityToLinear(params.priority || "medium"),
          labelIds: params.labels,
        },
      },
    );

    return this.getTicket(data.issueCreate.issue.id);
  }

  async updateTicket(
    ticketId: string,
    params: TicketUpdateParams,
  ): Promise<Ticket> {
    const input: Record<string, unknown> = {};
    if (params.title) input.title = params.title;
    if (params.description) input.description = params.description;
    if (params.priority)
      input.priority = this.mapPriorityToLinear(params.priority);

    await this.graphql(
      `
      mutation($input: IssueUpdateInput!) {
        issueUpdate(id: "${ticketId}", input: $input) {
          issue { id }
        }
      }
    `,
      { input },
    );

    return this.getTicket(ticketId);
  }

  async addComment(ticketId: string, body: string): Promise<TicketComment> {
    const data = await this.graphql<{
      commentCreate: {
        comment: {
          id: string;
          body: string;
          user: { name: string; email: string; avatarUrl?: string };
          createdAt: string;
        };
      };
    }>(`
      mutation {
        commentCreate(input: { issueId: "${ticketId}", body: "${body.replace(/"/g, '\\"')}" }) {
          comment { id body user { name email avatarUrl } createdAt }
        }
      }
    `);

    const c = data.commentCreate.comment;
    return {
      id: c.id,
      body: c.body,
      author: {
        name: c.user.name,
        email: c.user.email,
        avatarUrl: c.user.avatarUrl,
      },
      createdAt: c.createdAt,
    };
  }

  async getComments(ticketId: string): Promise<TicketComment[]> {
    const data = await this.graphql<{
      issue: {
        comments: {
          nodes: Array<{
            id: string;
            body: string;
            user: { name: string; email: string; avatarUrl?: string };
            createdAt: string;
            updatedAt: string;
          }>;
        };
      };
    }>(`
      query {
        issue(id: "${ticketId}") {
          comments { nodes { id body user { name email avatarUrl } createdAt updatedAt } }
        }
      }
    `);

    return (data.issue.comments?.nodes || []).map((c) => ({
      id: c.id,
      body: c.body,
      author: {
        name: c.user.name,
        email: c.user.email,
        avatarUrl: c.user.avatarUrl,
      },
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  async getStatuses(projectKey: string): Promise<string[]> {
    const data = await this.graphql<{
      workflowStates: { nodes: Array<{ name: string }> };
    }>(`
      query {
        workflowStates(filter: { team: { key: { eq: "${projectKey}" } } }) {
          nodes { name }
        }
      }
    `);
    return data.workflowStates.nodes.map((s) => s.name);
  }

  async searchTickets(query: string, limit = 20): Promise<Ticket[]> {
    const data = await this.graphql<{
      issueSearch: { nodes: Array<Record<string, unknown>> };
    }>(`
      query {
        issueSearch(query: "${query.replace(/"/g, '\\"')}", first: ${limit}) {
          nodes {
            id identifier title description
            state { name }
            priority
            assignee { name email avatarUrl }
            creator { name email avatarUrl }
            labels { nodes { name } }
            team { key name }
            url createdAt updatedAt
          }
        }
      }
    `);

    return (data.issueSearch.nodes || []).map((n) =>
      this.mapLinearTicket(n as never),
    );
  }

  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    try {
      await this.graphql("query { viewer { id } }");
      return { ok: true, message: "Linear API is accessible" };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Health check failed",
      };
    }
  }

  private mapLinearTicket(issue: {
    id: string;
    identifier: string;
    title: string;
    description?: string;
    state: { name: string };
    priority: number;
    assignee?: { name: string; email: string; avatarUrl?: string };
    creator: { name: string; email: string; avatarUrl?: string };
    labels: { nodes: Array<{ name: string }> };
    team: { key: string; name: string };
    url: string;
    createdAt: string;
    updatedAt: string;
  }): Ticket {
    return {
      id: issue.id,
      key: issue.identifier,
      title: issue.title,
      description: issue.description,
      status: issue.state.name,
      priority: this.mapLinearPriority(issue.priority),
      assignee: issue.assignee
        ? {
            name: issue.assignee.name,
            email: issue.assignee.email,
            avatarUrl: issue.assignee.avatarUrl,
          }
        : undefined,
      reporter: {
        name: issue.creator.name,
        email: issue.creator.email,
        avatarUrl: issue.creator.avatarUrl,
      },
      labels: issue.labels?.nodes?.map((l) => l.name) || [],
      type: "Issue",
      projectKey: issue.team.key,
      projectName: issue.team.name,
      url: issue.url,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      provider: "linear",
      externalId: issue.id,
      comments: [],
    };
  }

  private mapLinearPriority(priority: number): Ticket["priority"] {
    const map: Record<number, Ticket["priority"]> = {
      0: "none",
      1: "critical",
      2: "high",
      3: "medium",
      4: "low",
    };
    return map[priority] || "medium";
  }

  private mapPriorityToLinear(priority: string): number {
    const map: Record<string, number> = {
      critical: 1,
      high: 2,
      medium: 3,
      low: 4,
      none: 0,
    };
    return map[priority] ?? 3;
  }
}

// ============================================================================
// GitHub Issues Adapter
// ============================================================================

class GitHubIssuesAdapter implements TicketingApiAdapter {
  private baseUrl = "https://api.github.com";
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `token ${this.accessToken}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`GitHub API ${response.status}: ${errorText}`);
    }
    if (response.status === 204) return {} as T;
    return response.json();
  }

  async listTickets(
    projectKey: string,
    options?: { status?: string; assignee?: string; limit?: number },
  ): Promise<Ticket[]> {
    const params = new URLSearchParams({
      state: options?.status === "closed" ? "closed" : "open",
      per_page: String(options?.limit || 30),
    });
    if (options?.assignee) params.set("assignee", options.assignee);

    const data = await this.request<
      Array<{
        id: number;
        number: number;
        title: string;
        body?: string;
        state: string;
        labels: Array<{ name: string }>;
        assignee?: { login: string; avatar_url: string };
        user: { login: string; avatar_url: string };
        html_url: string;
        created_at: string;
        updated_at: string;
      }>
    >(`/repos/${projectKey}/issues?${params}`);

    return data.map((issue) => this.mapGitHubIssue(issue, projectKey));
  }

  async getTicket(ticketId: string): Promise<Ticket> {
    // ticketId is "owner/repo#number"
    const [repo, numberStr] = ticketId.split("#");
    const data = await this.request<Record<string, unknown>>(
      `/repos/${repo}/issues/${numberStr}`,
    );
    return this.mapGitHubIssue(data as never, repo);
  }

  async createTicket(params: TicketCreateParams): Promise<Ticket> {
    const data = await this.request<Record<string, unknown>>(
      `/repos/${params.projectKey}/issues`,
      {
        method: "POST",
        body: JSON.stringify({
          title: params.title,
          body: params.description,
          labels: params.labels,
        }),
      },
    );
    return this.mapGitHubIssue(data as never, params.projectKey);
  }

  async updateTicket(
    ticketId: string,
    params: TicketUpdateParams,
  ): Promise<Ticket> {
    const [repo, numberStr] = ticketId.split("#");
    const body: Record<string, unknown> = {};
    if (params.title) body.title = params.title;
    if (params.description) body.body = params.description;
    if (params.status)
      body.state = params.status === "closed" ? "closed" : "open";
    if (params.labels) body.labels = params.labels;

    const data = await this.request<Record<string, unknown>>(
      `/repos/${repo}/issues/${numberStr}`,
      { method: "PATCH", body: JSON.stringify(body) },
    );
    return this.mapGitHubIssue(data as never, repo);
  }

  async addComment(ticketId: string, body: string): Promise<TicketComment> {
    const [repo, numberStr] = ticketId.split("#");
    const data = await this.request<{
      id: number;
      body: string;
      user: { login: string; avatar_url: string };
      created_at: string;
      updated_at: string;
    }>(`/repos/${repo}/issues/${numberStr}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });

    return {
      id: String(data.id),
      body: data.body,
      author: {
        name: data.user.login,
        email: `${data.user.login}@github.com`,
        avatarUrl: data.user.avatar_url,
      },
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async getComments(ticketId: string): Promise<TicketComment[]> {
    const [repo, numberStr] = ticketId.split("#");
    const data = await this.request<
      Array<{
        id: number;
        body: string;
        user: { login: string; avatar_url: string };
        created_at: string;
        updated_at: string;
      }>
    >(`/repos/${repo}/issues/${numberStr}/comments`);

    return data.map((c) => ({
      id: String(c.id),
      body: c.body,
      author: {
        name: c.user.login,
        email: `${c.user.login}@github.com`,
        avatarUrl: c.user.avatar_url,
      },
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));
  }

  async getStatuses(): Promise<string[]> {
    return ["open", "closed"];
  }

  async searchTickets(query: string, limit = 20): Promise<Ticket[]> {
    const params = new URLSearchParams({
      q: `${query} is:issue`,
      per_page: String(limit),
    });

    const data = await this.request<{
      items: Array<Record<string, unknown>>;
    }>(`/search/issues?${params}`);

    return (data.items || []).map((issue) => {
      const htmlUrl = (issue.html_url as string) || "";
      const repo = htmlUrl
        .replace("https://github.com/", "")
        .split("/issues/")[0];
      return this.mapGitHubIssue(issue as never, repo);
    });
  }

  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    try {
      await this.request("/user");
      return { ok: true, message: "GitHub API is accessible" };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Health check failed",
      };
    }
  }

  private mapGitHubIssue(
    issue: {
      id: number;
      number: number;
      title: string;
      body?: string;
      state: string;
      labels: Array<{ name: string }>;
      assignee?: { login: string; avatar_url: string };
      user: { login: string; avatar_url: string };
      html_url: string;
      created_at: string;
      updated_at: string;
    },
    repo: string,
  ): Ticket {
    return {
      id: String(issue.id),
      key: `${repo}#${issue.number}`,
      title: issue.title,
      description: issue.body || undefined,
      status: issue.state,
      priority: "medium",
      assignee: issue.assignee
        ? {
            name: issue.assignee.login,
            email: `${issue.assignee.login}@github.com`,
            avatarUrl: issue.assignee.avatar_url,
          }
        : undefined,
      reporter: {
        name: issue.user.login,
        email: `${issue.user.login}@github.com`,
        avatarUrl: issue.user.avatar_url,
      },
      labels: issue.labels?.map((l) => l.name) || [],
      type: "Issue",
      projectKey: repo,
      projectName: repo,
      url: issue.html_url,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      provider: "github_issues",
      externalId: String(issue.id),
      comments: [],
    };
  }
}

// ============================================================================
// Ticketing Connector
// ============================================================================

export class TicketingConnector extends BaseConnector {
  readonly providerId: string;
  readonly displayName: string;
  readonly description =
    "Manage tickets, track issues, and sync comments with chat";
  readonly icon = "ticket";
  readonly category: IntegrationCatalogCategory = "ticketing";
  readonly capabilities: ConnectorCapability[] = [
    "read",
    "write",
    "subscribe",
    "search",
  ];
  readonly version = "1.0.0";

  private adapter: TicketingApiAdapter | null = null;
  private provider: TicketingProvider;

  constructor(provider: TicketingProvider) {
    super(
      { maxRequests: 300, windowMs: 60_000 },
      {
        maxAttempts: 3,
        initialDelayMs: 500,
        maxDelayMs: 15_000,
        backoffMultiplier: 2,
        jitterFactor: 0.1,
      },
    );
    this.provider = provider;
    this.providerId = provider;
    const nameMap: Record<TicketingProvider, string> = {
      jira: "Jira",
      linear: "Linear",
      github_issues: "GitHub Issues",
    };
    this.displayName = nameMap[provider];
  }

  protected async doConnect(
    config: ConnectorConfig,
    credentials: ConnectorCredentials,
  ): Promise<void> {
    switch (this.provider) {
      case "jira":
        this.adapter = new JiraAdapter(
          credentials.accessToken,
          (config.providerConfig.siteUrl as string) || "",
          credentials.metadata.cloudId || "",
        );
        break;
      case "linear":
        this.adapter = new LinearAdapter(credentials.accessToken);
        break;
      case "github_issues":
        this.adapter = new GitHubIssuesAdapter(credentials.accessToken);
        break;
    }

    const health = await this.adapter.healthCheck();
    if (!health.ok) {
      throw new ConnectorError(health.message, "auth", this.providerId);
    }
  }

  protected async doDisconnect(): Promise<void> {
    this.adapter = null;
  }

  protected async doHealthCheck(): Promise<HealthCheckResult> {
    if (!this.adapter) {
      return {
        healthy: false,
        responseTimeMs: 0,
        message: "Not connected",
        checkedAt: new Date().toISOString(),
        consecutiveFailures: 0,
      };
    }
    const start = Date.now();
    const result = await this.adapter.healthCheck();
    return {
      healthy: result.ok,
      responseTimeMs: Date.now() - start,
      message: result.message,
      checkedAt: new Date().toISOString(),
      consecutiveFailures: result.ok ? 0 : 1,
    };
  }

  getCatalogEntry(): CatalogEntry {
    return {
      id: this.providerId,
      name: this.displayName,
      description: this.description,
      icon: this.icon,
      category: this.category,
      capabilities: this.capabilities,
      syncDirections: ["incoming", "outgoing", "bidirectional"],
      actions: [
        {
          id: "create_ticket",
          label: "Create Ticket",
          description: "Create a new ticket from a chat message",
          requiredCapabilities: ["write"],
          parameters: [
            {
              name: "title",
              type: "string",
              required: true,
              description: "Ticket title",
            },
            {
              name: "projectKey",
              type: "string",
              required: true,
              description: "Project key",
            },
            {
              name: "description",
              type: "string",
              required: false,
              description: "Ticket description",
            },
            {
              name: "priority",
              type: "select",
              required: false,
              description: "Priority",
              options: [
                { label: "Critical", value: "critical" },
                { label: "High", value: "high" },
                { label: "Medium", value: "medium" },
                { label: "Low", value: "low" },
              ],
            },
          ],
        },
        {
          id: "update_status",
          label: "Update Status",
          description: "Update ticket status",
          requiredCapabilities: ["write"],
          parameters: [
            {
              name: "ticketId",
              type: "string",
              required: true,
              description: "Ticket ID or key",
            },
            {
              name: "status",
              type: "string",
              required: true,
              description: "New status",
            },
          ],
        },
      ],
      requiredConfig: ["projectKey"],
      requiresOAuth: true,
      beta: false,
      version: this.version,
    };
  }

  // ==========================================================================
  // Ticketing Operations
  // ==========================================================================

  async listTickets(
    projectKey: string,
    options?: { status?: string; assignee?: string; limit?: number },
  ): Promise<Ticket[]> {
    this.ensureConnected();
    return this.withRetry(
      () => this.adapter!.listTickets(projectKey, options),
      "listTickets",
    );
  }

  async getTicket(ticketId: string): Promise<Ticket> {
    this.ensureConnected();
    return this.withRetry(() => this.adapter!.getTicket(ticketId), "getTicket");
  }

  async createTicket(params: TicketCreateParams): Promise<Ticket> {
    this.ensureConnected();
    return this.withRetry(
      () => this.adapter!.createTicket(params),
      "createTicket",
    );
  }

  async updateTicket(
    ticketId: string,
    params: TicketUpdateParams,
  ): Promise<Ticket> {
    this.ensureConnected();
    return this.withRetry(
      () => this.adapter!.updateTicket(ticketId, params),
      "updateTicket",
    );
  }

  async addComment(
    ticketId: string,
    body: string,
    author?: string,
  ): Promise<TicketComment> {
    this.ensureConnected();
    return this.withRetry(
      () => this.adapter!.addComment(ticketId, body, author),
      "addComment",
    );
  }

  async getComments(ticketId: string): Promise<TicketComment[]> {
    this.ensureConnected();
    return this.withRetry(
      () => this.adapter!.getComments(ticketId),
      "getComments",
    );
  }

  async searchTickets(query: string, limit?: number): Promise<Ticket[]> {
    this.ensureConnected();
    return this.withRetry(
      () => this.adapter!.searchTickets(query, limit),
      "searchTickets",
    );
  }

  async getStatuses(projectKey: string): Promise<string[]> {
    this.ensureConnected();
    return this.withRetry(
      () => this.adapter!.getStatuses(projectKey),
      "getStatuses",
    );
  }

  /**
   * Format a ticket status change notification.
   */
  formatStatusNotification(
    ticket: Ticket,
    oldStatus: string,
    newStatus: string,
    actor: string,
  ): string {
    return [
      `**[${ticket.key}] ${ticket.title}**`,
      `Status changed: ${oldStatus} -> **${newStatus}**`,
      `By: ${actor}`,
      `Priority: ${ticket.priority} | Assignee: ${ticket.assignee?.name || "Unassigned"}`,
      ticket.url,
    ].join("\n");
  }

  /**
   * Format a ticket assignment notification.
   */
  formatAssignmentNotification(ticket: Ticket, assignee: string): string {
    return [
      `**[${ticket.key}] ${ticket.title}**`,
      `Assigned to: **${assignee}**`,
      `Status: ${ticket.status} | Priority: ${ticket.priority}`,
      ticket.url,
    ].join("\n");
  }

  /**
   * Create a ticket from a chat message.
   */
  async createTicketFromMessage(
    message: { content: string; author: string; channelName: string },
    projectKey: string,
    options?: {
      type?: string;
      priority?: Ticket["priority"];
      labels?: string[];
    },
  ): Promise<Ticket> {
    const description = [
      message.content,
      "",
      `---`,
      `Created from chat message by ${message.author} in #${message.channelName}`,
    ].join("\n");

    return this.createTicket({
      title:
        message.content.slice(0, 100) +
        (message.content.length > 100 ? "..." : ""),
      description,
      projectKey,
      type: options?.type,
      priority: options?.priority,
      labels: options?.labels,
    });
  }

  private ensureConnected(): void {
    if (!this.adapter || this.status !== "connected") {
      throw new ConnectorError(
        "Ticketing connector is not connected",
        "config",
        this.providerId,
        { retryable: false },
      );
    }
  }
}
