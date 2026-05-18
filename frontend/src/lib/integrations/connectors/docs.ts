/**
 * Docs Connector
 *
 * Supports Google Docs, Notion, and Confluence.
 * Features: document sharing with previews, collaborative editing notifications,
 * document search from chat, page creation, change notifications.
 */

import { BaseConnector } from "../catalog/base-connector";
import {
  type ConnectorConfig,
  type ConnectorCredentials,
  type HealthCheckResult,
  type CatalogEntry,
  type ConnectorCapability,
  type IntegrationCatalogCategory,
  type Document,
  type DocumentCreateParams,
  type DocumentSearchResult,
  type DocsProvider,
  ConnectorError,
} from "../catalog/types";

// ============================================================================
// Docs API Abstraction
// ============================================================================

interface DocsApiAdapter {
  listDocuments(parentId?: string, limit?: number): Promise<Document[]>;
  getDocument(docId: string): Promise<Document>;
  createDocument(params: DocumentCreateParams): Promise<Document>;
  updateDocument(
    docId: string,
    updates: { title?: string; content?: string },
  ): Promise<Document>;
  deleteDocument(docId: string): Promise<void>;
  searchDocuments(
    query: string,
    limit?: number,
  ): Promise<DocumentSearchResult[]>;
  getRecentChanges(
    since: string,
    limit?: number,
  ): Promise<
    Array<{
      document: Document;
      changedBy: string;
      changedAt: string;
      changeType: string;
    }>
  >;
  healthCheck(): Promise<{ ok: boolean; message: string }>;
}

// ============================================================================
// Google Docs Adapter
// ============================================================================

class GoogleDocsAdapter implements DocsApiAdapter {
  private driveUrl = "https://www.googleapis.com/drive/v3";
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Google Docs API ${response.status}: ${errorText}`);
    }
    if (response.status === 204) return {} as T;
    return response.json();
  }

  async listDocuments(parentId?: string, limit = 50): Promise<Document[]> {
    let query =
      "mimeType != 'application/vnd.google-apps.folder' and trashed = false";
    if (parentId) query += ` and '${parentId}' in parents`;

    const params = new URLSearchParams({
      q: query,
      pageSize: String(limit),
      fields:
        "files(id,name,mimeType,description,iconLink,thumbnailLink,webViewLink,size,createdTime,modifiedTime,lastModifyingUser,owners,shared,permissions)",
      orderBy: "modifiedTime desc",
    });

    const data = await this.request<{
      files: Array<{
        id: string;
        name: string;
        mimeType: string;
        description?: string;
        thumbnailLink?: string;
        webViewLink?: string;
        size?: string;
        createdTime: string;
        modifiedTime: string;
        lastModifyingUser?: { displayName: string; emailAddress: string };
        owners?: Array<{ displayName: string; emailAddress: string }>;
        shared: boolean;
        permissions?: Array<{
          type: string;
          role: string;
          emailAddress?: string;
        }>;
      }>;
    }>(`${this.driveUrl}/files?${params}`);

    return (data.files || []).map((file) => this.mapGoogleDoc(file));
  }

  async getDocument(docId: string): Promise<Document> {
    const data = await this.request<Record<string, unknown>>(
      `${this.driveUrl}/files/${docId}?fields=id,name,mimeType,description,thumbnailLink,webViewLink,size,createdTime,modifiedTime,lastModifyingUser,owners,shared,permissions`,
    );
    return this.mapGoogleDoc(data as never);
  }

  async createDocument(params: DocumentCreateParams): Promise<Document> {
    const mimeType = "application/vnd.google-apps.document";
    const body: Record<string, unknown> = {
      name: params.title,
      mimeType,
    };
    if (params.parentId) {
      body.parents = [params.parentId];
    }

    const data = await this.request<Record<string, unknown>>(
      `${this.driveUrl}/files`,
      { method: "POST", body: JSON.stringify(body) },
    );

    if (params.content) {
      // Update document content via Docs API
      await this.request(
        `https://docs.googleapis.com/v1/documents/${(data as { id: string }).id}:batchUpdate`,
        {
          method: "POST",
          body: JSON.stringify({
            requests: [
              {
                insertText: {
                  location: { index: 1 },
                  text: params.content,
                },
              },
            ],
          }),
        },
      );
    }

    return this.getDocument((data as { id: string }).id);
  }

  async updateDocument(
    docId: string,
    updates: { title?: string; content?: string },
  ): Promise<Document> {
    if (updates.title) {
      await this.request(`${this.driveUrl}/files/${docId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: updates.title }),
      });
    }

    if (updates.content) {
      await this.request(
        `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
        {
          method: "POST",
          body: JSON.stringify({
            requests: [
              {
                insertText: {
                  location: { index: 1 },
                  text: updates.content,
                },
              },
            ],
          }),
        },
      );
    }

    return this.getDocument(docId);
  }

  async deleteDocument(docId: string): Promise<void> {
    await this.request(`${this.driveUrl}/files/${docId}`, { method: "DELETE" });
  }

  async searchDocuments(
    query: string,
    limit = 20,
  ): Promise<DocumentSearchResult[]> {
    const params = new URLSearchParams({
      q: `fullText contains '${query.replace(/'/g, "\\'")}' and trashed = false`,
      pageSize: String(limit),
      fields:
        "files(id,name,mimeType,description,thumbnailLink,webViewLink,size,createdTime,modifiedTime,lastModifyingUser)",
    });

    const data = await this.request<{
      files: Array<Record<string, unknown>>;
    }>(`${this.driveUrl}/files?${params}`);

    return (data.files || []).map((file, index) => ({
      document: this.mapGoogleDoc(file as never),
      snippet: (file.description as string) || (file.name as string) || "",
      matchScore: 1 - index * 0.05,
    }));
  }

  async getRecentChanges(
    since: string,
    limit = 20,
  ): Promise<
    Array<{
      document: Document;
      changedBy: string;
      changedAt: string;
      changeType: string;
    }>
  > {
    const params = new URLSearchParams({
      q: `modifiedTime > '${since}' and trashed = false`,
      pageSize: String(limit),
      fields:
        "files(id,name,mimeType,thumbnailLink,webViewLink,size,createdTime,modifiedTime,lastModifyingUser)",
      orderBy: "modifiedTime desc",
    });

    const data = await this.request<{
      files: Array<Record<string, unknown>>;
    }>(`${this.driveUrl}/files?${params}`);

    return (data.files || []).map((file) => ({
      document: this.mapGoogleDoc(file as never),
      changedBy:
        (file.lastModifyingUser as { displayName?: string })?.displayName ||
        "Unknown",
      changedAt: (file.modifiedTime as string) || new Date().toISOString(),
      changeType: "modified",
    }));
  }

  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    try {
      await this.request(`${this.driveUrl}/about?fields=user`);
      return { ok: true, message: "Google Docs API is accessible" };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Health check failed",
      };
    }
  }

  private mapGoogleDoc(file: {
    id: string;
    name: string;
    mimeType: string;
    description?: string;
    thumbnailLink?: string;
    webViewLink?: string;
    size?: string;
    createdTime: string;
    modifiedTime: string;
    lastModifyingUser?: { displayName: string; emailAddress: string };
    owners?: Array<{ displayName: string; emailAddress: string }>;
    shared?: boolean;
    permissions?: Array<{ type: string; role: string; emailAddress?: string }>;
  }): Document {
    return {
      id: file.id,
      title: file.name,
      url: file.webViewLink || `https://docs.google.com/document/d/${file.id}`,
      thumbnailUrl: file.thumbnailLink,
      lastModifiedBy: {
        name:
          file.lastModifyingUser?.displayName ||
          file.owners?.[0]?.displayName ||
          "",
        email:
          file.lastModifyingUser?.emailAddress ||
          file.owners?.[0]?.emailAddress ||
          "",
      },
      createdAt: file.createdTime,
      updatedAt: file.modifiedTime,
      mimeType: file.mimeType,
      size: file.size ? parseInt(file.size, 10) : undefined,
      provider: "google_docs",
      externalId: file.id,
      permissions: (file.permissions || []).map((p) => ({
        type: p.type as "user" | "group" | "anyone",
        role: p.role as "owner" | "editor" | "commenter" | "viewer",
        email: p.emailAddress,
      })),
    };
  }
}

// ============================================================================
// Notion Adapter
// ============================================================================

class NotionAdapter implements DocsApiAdapter {
  private baseUrl = "https://api.notion.com/v1";
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
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Notion API ${response.status}: ${errorText}`);
    }
    return response.json();
  }

  async listDocuments(_parentId?: string, limit = 50): Promise<Document[]> {
    const body: Record<string, unknown> = {
      filter: { property: "object", value: "page" },
      page_size: limit,
    };

    const data = await this.request<{
      results: Array<{
        id: string;
        url: string;
        created_time: string;
        last_edited_time: string;
        last_edited_by: { id: string };
        properties: Record<string, { title?: Array<{ plain_text: string }> }>;
        icon?: { emoji?: string };
      }>;
    }>("/search", { method: "POST", body: JSON.stringify(body) });

    return (data.results || []).map((page) => this.mapNotionPage(page));
  }

  async getDocument(docId: string): Promise<Document> {
    const data = await this.request<Record<string, unknown>>(`/pages/${docId}`);
    return this.mapNotionPage(data as never);
  }

  async createDocument(params: DocumentCreateParams): Promise<Document> {
    const body: Record<string, unknown> = {
      parent: params.parentId
        ? { page_id: params.parentId }
        : { type: "page_id", page_id: params.parentId || "" },
      properties: {
        title: {
          title: [{ text: { content: params.title } }],
        },
      },
    };

    if (params.content) {
      (body as Record<string, unknown>).children = [
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ type: "text", text: { content: params.content } }],
          },
        },
      ];
    }

    const data = await this.request<Record<string, unknown>>("/pages", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return this.mapNotionPage(data as never);
  }

  async updateDocument(
    docId: string,
    updates: { title?: string },
  ): Promise<Document> {
    if (updates.title) {
      await this.request(`/pages/${docId}`, {
        method: "PATCH",
        body: JSON.stringify({
          properties: {
            title: {
              title: [{ text: { content: updates.title } }],
            },
          },
        }),
      });
    }

    return this.getDocument(docId);
  }

  async deleteDocument(docId: string): Promise<void> {
    await this.request(`/pages/${docId}`, {
      method: "PATCH",
      body: JSON.stringify({ archived: true }),
    });
  }

  async searchDocuments(
    query: string,
    limit = 20,
  ): Promise<DocumentSearchResult[]> {
    const data = await this.request<{
      results: Array<Record<string, unknown>>;
    }>("/search", {
      method: "POST",
      body: JSON.stringify({ query, page_size: limit }),
    });

    return (data.results || []).map((page, index) => ({
      document: this.mapNotionPage(page as never),
      snippet: "",
      matchScore: 1 - index * 0.05,
    }));
  }

  async getRecentChanges(
    since: string,
    limit = 20,
  ): Promise<
    Array<{
      document: Document;
      changedBy: string;
      changedAt: string;
      changeType: string;
    }>
  > {
    const data = await this.request<{
      results: Array<Record<string, unknown>>;
    }>("/search", {
      method: "POST",
      body: JSON.stringify({
        filter: { property: "object", value: "page" },
        sort: { direction: "descending", timestamp: "last_edited_time" },
        page_size: limit,
      }),
    });

    return (data.results || [])
      .filter((p) => (p.last_edited_time as string) > since)
      .map((page) => ({
        document: this.mapNotionPage(page as never),
        changedBy: "Unknown",
        changedAt:
          (page.last_edited_time as string) || new Date().toISOString(),
        changeType: "modified",
      }));
  }

  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    try {
      await this.request("/users/me");
      return { ok: true, message: "Notion API is accessible" };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Health check failed",
      };
    }
  }

  private mapNotionPage(page: {
    id: string;
    url: string;
    created_time: string;
    last_edited_time: string;
    properties?: Record<string, { title?: Array<{ plain_text: string }> }>;
  }): Document {
    const titleProp = page.properties
      ? Object.values(page.properties).find((p) => p.title)
      : undefined;
    const title = titleProp?.title?.[0]?.plain_text || "Untitled";

    return {
      id: page.id,
      title,
      url: page.url || `https://notion.so/${page.id.replace(/-/g, "")}`,
      lastModifiedBy: { name: "", email: "" },
      createdAt: page.created_time,
      updatedAt: page.last_edited_time,
      mimeType: "application/vnd.notion.page",
      provider: "notion",
      externalId: page.id,
      permissions: [],
    };
  }
}

// ============================================================================
// Confluence Adapter
// ============================================================================

class ConfluenceAdapter implements DocsApiAdapter {
  private baseUrl: string;
  private accessToken: string;
  private cloudId: string;

  constructor(accessToken: string, siteUrl: string, cloudId: string) {
    this.accessToken = accessToken;
    this.baseUrl = siteUrl;
    this.cloudId = cloudId;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `https://api.atlassian.com/ex/confluence/${this.cloudId}/wiki/api/v2${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Confluence API ${response.status}: ${errorText}`);
    }
    if (response.status === 204) return {} as T;
    return response.json();
  }

  async listDocuments(_parentId?: string, limit = 50): Promise<Document[]> {
    const params = new URLSearchParams({
      limit: String(limit),
      sort: "-modified-date",
    });
    const data = await this.request<{
      results: Array<{
        id: string;
        title: string;
        status: string;
        _links: { webui: string };
        version: { createdAt: string; authorId: string };
      }>;
    }>(`/pages?${params}`);

    return (data.results || []).map((page) => ({
      id: page.id,
      title: page.title,
      url: `${this.baseUrl}/wiki${page._links.webui}`,
      lastModifiedBy: { name: "", email: "" },
      createdAt: page.version.createdAt,
      updatedAt: page.version.createdAt,
      mimeType: "application/vnd.confluence.page",
      provider: "confluence" as DocsProvider,
      externalId: page.id,
      permissions: [],
    }));
  }

  async getDocument(docId: string): Promise<Document> {
    const data = await this.request<{
      id: string;
      title: string;
      _links: { webui: string };
      version: { createdAt: string };
      body?: { storage?: { value: string } };
    }>(`/pages/${docId}?body-format=storage`);

    return {
      id: data.id,
      title: data.title,
      content: data.body?.storage?.value,
      url: `${this.baseUrl}/wiki${data._links.webui}`,
      lastModifiedBy: { name: "", email: "" },
      createdAt: data.version.createdAt,
      updatedAt: data.version.createdAt,
      mimeType: "application/vnd.confluence.page",
      provider: "confluence",
      externalId: data.id,
      permissions: [],
    };
  }

  async createDocument(params: DocumentCreateParams): Promise<Document> {
    const body: Record<string, unknown> = {
      title: params.title,
      spaceId: params.parentId || "",
      status: "current",
      body: {
        representation: "storage",
        value: params.content || "",
      },
    };

    const data = await this.request<{ id: string }>("/pages", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return this.getDocument(data.id);
  }

  async updateDocument(
    docId: string,
    updates: { title?: string; content?: string },
  ): Promise<Document> {
    const current = await this.getDocument(docId);
    const body: Record<string, unknown> = {
      id: docId,
      status: "current",
      title: updates.title || current.title,
      body: updates.content
        ? { representation: "storage", value: updates.content }
        : undefined,
      version: { number: 2, message: "Updated from chat" },
    };

    await this.request(`/pages/${docId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });

    return this.getDocument(docId);
  }

  async deleteDocument(docId: string): Promise<void> {
    await this.request(`/pages/${docId}`, { method: "DELETE" });
  }

  async searchDocuments(
    query: string,
    limit = 20,
  ): Promise<DocumentSearchResult[]> {
    const params = new URLSearchParams({
      cql: `text ~ "${query}"`,
      limit: String(limit),
    });

    const data = await this.request<{
      results: Array<{
        content: { id: string; title: string; _links: { webui: string } };
        excerpt: string;
      }>;
    }>(`/search?${params}`);

    return (data.results || []).map((result, index) => ({
      document: {
        id: result.content.id,
        title: result.content.title,
        url: `${this.baseUrl}/wiki${result.content._links.webui}`,
        lastModifiedBy: { name: "", email: "" },
        createdAt: "",
        updatedAt: "",
        mimeType: "application/vnd.confluence.page",
        provider: "confluence" as DocsProvider,
        externalId: result.content.id,
        permissions: [],
      },
      snippet: result.excerpt || "",
      matchScore: 1 - index * 0.05,
    }));
  }

  async getRecentChanges(
    since: string,
    limit = 20,
  ): Promise<
    Array<{
      document: Document;
      changedBy: string;
      changedAt: string;
      changeType: string;
    }>
  > {
    const docs = await this.listDocuments(undefined, limit);
    return docs
      .filter((d) => d.updatedAt > since)
      .map((doc) => ({
        document: doc,
        changedBy: "Unknown",
        changedAt: doc.updatedAt,
        changeType: "modified",
      }));
  }

  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    try {
      await this.request("/spaces?limit=1");
      return { ok: true, message: "Confluence API is accessible" };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Health check failed",
      };
    }
  }
}

// ============================================================================
// Docs Connector
// ============================================================================

export class DocsConnector extends BaseConnector {
  readonly providerId: string;
  readonly displayName: string;
  readonly description =
    "Share documents, search content, and get change notifications in chat";
  readonly icon = "file-text";
  readonly category: IntegrationCatalogCategory = "docs";
  readonly capabilities: ConnectorCapability[] = [
    "read",
    "write",
    "subscribe",
    "search",
  ];
  readonly version = "1.0.0";

  private adapter: DocsApiAdapter | null = null;
  private provider: DocsProvider;

  constructor(provider: DocsProvider) {
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
    const nameMap: Record<DocsProvider, string> = {
      google_docs: "Google Docs",
      notion: "Notion",
      confluence: "Confluence",
    };
    this.displayName = nameMap[provider];
  }

  protected async doConnect(
    config: ConnectorConfig,
    credentials: ConnectorCredentials,
  ): Promise<void> {
    switch (this.provider) {
      case "google_docs":
        this.adapter = new GoogleDocsAdapter(credentials.accessToken);
        break;
      case "notion":
        this.adapter = new NotionAdapter(credentials.accessToken);
        break;
      case "confluence":
        this.adapter = new ConfluenceAdapter(
          credentials.accessToken,
          (config.providerConfig.siteUrl as string) || "",
          credentials.metadata.cloudId || "",
        );
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
      syncDirections: ["incoming", "outgoing"],
      actions: [
        {
          id: "create_document",
          label: "Create Document",
          description: "Create a new document from chat",
          requiredCapabilities: ["write"],
          parameters: [
            {
              name: "title",
              type: "string",
              required: true,
              description: "Document title",
            },
            {
              name: "content",
              type: "string",
              required: false,
              description: "Initial content",
            },
          ],
        },
        {
          id: "search_documents",
          label: "Search Documents",
          description: "Search for documents by keyword",
          requiredCapabilities: ["search"],
          parameters: [
            {
              name: "query",
              type: "string",
              required: true,
              description: "Search query",
            },
          ],
        },
      ],
      requiredConfig: [],
      requiresOAuth: true,
      beta: false,
      version: this.version,
    };
  }

  // ==========================================================================
  // Document Operations
  // ==========================================================================

  async listDocuments(parentId?: string, limit?: number): Promise<Document[]> {
    this.ensureConnected();
    return this.withRetry(
      () => this.adapter!.listDocuments(parentId, limit),
      "listDocuments",
    );
  }

  async getDocument(docId: string): Promise<Document> {
    this.ensureConnected();
    return this.withRetry(
      () => this.adapter!.getDocument(docId),
      "getDocument",
    );
  }

  async createDocument(params: DocumentCreateParams): Promise<Document> {
    this.ensureConnected();
    return this.withRetry(
      () => this.adapter!.createDocument(params),
      "createDocument",
    );
  }

  async updateDocument(
    docId: string,
    updates: { title?: string; content?: string },
  ): Promise<Document> {
    this.ensureConnected();
    return this.withRetry(
      () => this.adapter!.updateDocument(docId, updates),
      "updateDocument",
    );
  }

  async deleteDocument(docId: string): Promise<void> {
    this.ensureConnected();
    return this.withRetry(
      () => this.adapter!.deleteDocument(docId),
      "deleteDocument",
    );
  }

  async searchDocuments(
    query: string,
    limit?: number,
  ): Promise<DocumentSearchResult[]> {
    this.ensureConnected();
    return this.withRetry(
      () => this.adapter!.searchDocuments(query, limit),
      "searchDocuments",
    );
  }

  async getRecentChanges(
    since: string,
    limit?: number,
  ): Promise<
    Array<{
      document: Document;
      changedBy: string;
      changedAt: string;
      changeType: string;
    }>
  > {
    this.ensureConnected();
    return this.withRetry(
      () => this.adapter!.getRecentChanges(since, limit),
      "getRecentChanges",
    );
  }

  /**
   * Format a document preview for sharing in chat.
   */
  formatDocumentPreview(doc: Document): string {
    return [
      `**${doc.title}**`,
      doc.content
        ? doc.content.slice(0, 200) + (doc.content.length > 200 ? "..." : "")
        : null,
      `Last modified by ${doc.lastModifiedBy.name} on ${new Date(doc.updatedAt).toLocaleDateString()}`,
      doc.url,
    ]
      .filter(Boolean)
      .join("\n");
  }

  /**
   * Format a change notification for a channel.
   */
  formatChangeNotification(
    doc: Document,
    changedBy: string,
    changeType: string,
  ): string {
    const typeMap: Record<string, string> = {
      created: "created",
      modified: "updated",
      deleted: "deleted",
      commented: "commented on",
    };

    return [
      `**Document ${typeMap[changeType] || changeType}**: ${doc.title}`,
      `By: ${changedBy}`,
      doc.url,
    ].join("\n");
  }

  private ensureConnected(): void {
    if (!this.adapter || this.status !== "connected") {
      throw new ConnectorError(
        "Docs connector is not connected",
        "config",
        this.providerId,
        { retryable: false },
      );
    }
  }
}
