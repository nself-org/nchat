/**
 * Google Drive Integration Client
 *
 * Handles Google Drive API interactions including OAuth,
 * file picker, sharing, and preview embeds.
 */

import type {
  IntegrationProvider,
  IntegrationCredentials,
  Integration,
  OAuthConfig,
  OAuthCallbackParams,
  GoogleDriveFile,
  GoogleDrivePermission,
  GoogleDrivePickerConfig,
} from "../types";
import {
  buildAuthUrl,
  tokenResponseToCredentials,
  calculateTokenExpiry,
} from "../integration-manager";

// ============================================================================
// Constants
// ============================================================================

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
export const GOOGLE_USER_INFO_URL =
  "https://www.googleapis.com/oauth2/v2/userinfo";

export const GOOGLE_DRIVE_DEFAULT_SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

// File MIME types
export const GOOGLE_MIME_TYPES = {
  folder: "application/vnd.google-apps.folder",
  document: "application/vnd.google-apps.document",
  spreadsheet: "application/vnd.google-apps.spreadsheet",
  presentation: "application/vnd.google-apps.presentation",
  form: "application/vnd.google-apps.form",
  drawing: "application/vnd.google-apps.drawing",
} as const;

// ============================================================================
// Google API Response Types
// ============================================================================

interface GoogleDriveFilesListResponse {
  kind: string;
  nextPageToken?: string;
  files: GoogleDriveFile[];
}

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

// ============================================================================
// Google Drive Client Configuration
// ============================================================================

export interface GoogleDriveClientConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
  apiKey?: string; // For picker
}

// ============================================================================
// Google Drive API Client
// ============================================================================

/**
 * Google Drive API client for making authenticated requests
 */
export class GoogleDriveApiClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Make an authenticated GET request to Google Drive API
   */
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${GOOGLE_DRIVE_API_BASE}${endpoint}`);
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
      throw new GoogleDriveApiError(
        error.error?.message || `Google Drive API error: ${response.status}`,
        response.status,
        endpoint,
      );
    }

    return response.json();
  }

  /**
   * Make an authenticated POST request to Google Drive API
   */
  async post<T>(endpoint: string, body?: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${GOOGLE_DRIVE_API_BASE}${endpoint}`, {
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
      throw new GoogleDriveApiError(
        error.error?.message || `Google Drive API error: ${response.status}`,
        response.status,
        endpoint,
      );
    }

    return response.json();
  }

  /**
   * Make an authenticated PATCH request
   */
  async patch<T>(endpoint: string, body?: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${GOOGLE_DRIVE_API_BASE}${endpoint}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new GoogleDriveApiError(
        error.error?.message || `Google Drive API error: ${response.status}`,
        response.status,
        endpoint,
      );
    }

    return response.json();
  }

  // ==========================================================================
  // File Methods
  // ==========================================================================

  /**
   * Get file by ID
   */
  async getFile(fileId: string, fields?: string): Promise<GoogleDriveFile> {
    const params: Record<string, string> = {};
    if (fields) {
      params.fields = fields;
    } else {
      params.fields =
        "id,name,mimeType,description,iconLink,thumbnailLink,webViewLink,webContentLink,size,createdTime,modifiedTime,owners,shared,starred";
    }
    return this.get<GoogleDriveFile>(`/files/${fileId}`, params);
  }

  /**
   * List files
   */
  async listFiles(options?: {
    pageSize?: number;
    pageToken?: string;
    q?: string;
    orderBy?: string;
    fields?: string;
  }): Promise<{
    files: GoogleDriveFile[];
    nextPageToken?: string;
  }> {
    const params: Record<string, string> = {
      fields:
        options?.fields ||
        "nextPageToken,files(id,name,mimeType,iconLink,thumbnailLink,webViewLink,webContentLink,size,createdTime,modifiedTime,shared,starred)",
    };
    if (options?.pageSize) params.pageSize = String(options.pageSize);
    if (options?.pageToken) params.pageToken = options.pageToken;
    if (options?.q) params.q = options.q;
    if (options?.orderBy) params.orderBy = options.orderBy;

    const response = await this.get<GoogleDriveFilesListResponse>(
      "/files",
      params,
    );
    return {
      files: response.files,
      nextPageToken: response.nextPageToken,
    };
  }

  /**
   * Search files
   */
  async searchFiles(
    query: string,
    options?: {
      pageSize?: number;
      pageToken?: string;
      mimeType?: string;
    },
  ): Promise<{
    files: GoogleDriveFile[];
    nextPageToken?: string;
  }> {
    let q = `name contains '${query}' and trashed = false`;
    if (options?.mimeType) {
      q += ` and mimeType = '${options.mimeType}'`;
    }

    return this.listFiles({
      q,
      pageSize: options?.pageSize,
      pageToken: options?.pageToken,
    });
  }

  /**
   * List files in folder
   */
  async listFilesInFolder(
    folderId: string,
    options?: {
      pageSize?: number;
      pageToken?: string;
    },
  ): Promise<{
    files: GoogleDriveFile[];
    nextPageToken?: string;
  }> {
    return this.listFiles({
      q: `'${folderId}' in parents and trashed = false`,
      pageSize: options?.pageSize,
      pageToken: options?.pageToken,
    });
  }

  /**
   * Get recent files
   */
  async getRecentFiles(pageSize: number = 10): Promise<GoogleDriveFile[]> {
    const result = await this.listFiles({
      pageSize,
      orderBy: "modifiedTime desc",
      q: "trashed = false",
    });
    return result.files;
  }

  /**
   * Get starred files
   */
  async getStarredFiles(pageSize: number = 10): Promise<GoogleDriveFile[]> {
    const result = await this.listFiles({
      pageSize,
      q: "starred = true and trashed = false",
    });
    return result.files;
  }

  // ==========================================================================
  // Sharing Methods
  // ==========================================================================

  /**
   * Get file permissions
   */
  async getPermissions(fileId: string): Promise<GoogleDrivePermission[]> {
    const response = await this.get<{ permissions: GoogleDrivePermission[] }>(
      `/files/${fileId}/permissions`,
      { fields: "permissions(id,type,role,emailAddress,displayName)" },
    );
    return response.permissions;
  }

  /**
   * Create sharing link (make file accessible via link)
   */
  async createSharingLink(
    fileId: string,
    role: "reader" | "commenter" | "writer" = "reader",
  ): Promise<string> {
    // Create "anyone with link" permission
    await this.post(`/files/${fileId}/permissions`, {
      type: "anyone",
      role,
    });

    // Get the file to return the web view link
    const file = await this.getFile(fileId, "webViewLink");
    return file.webViewLink || "";
  }

  /**
   * Share file with specific user
   */
  async shareWithUser(
    fileId: string,
    email: string,
    role: "reader" | "commenter" | "writer" = "reader",
    sendNotification: boolean = true,
  ): Promise<GoogleDrivePermission> {
    const params: Record<string, string> = {};
    if (sendNotification) {
      params.sendNotificationEmail = "true";
    }

    return this.post(`/files/${fileId}/permissions`, {
      type: "user",
      role,
      emailAddress: email,
    });
  }

  /**
   * Remove permission
   */
  async removePermission(fileId: string, permissionId: string): Promise<void> {
    const response = await fetch(
      `${GOOGLE_DRIVE_API_BASE}/files/${fileId}/permissions/${permissionId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new GoogleDriveApiError(
        "Failed to remove permission",
        response.status,
        `/files/${fileId}/permissions/${permissionId}`,
      );
    }
  }

  // ==========================================================================
  // User Methods
  // ==========================================================================

  /**
   * Get current user info
   */
  async getUserInfo(): Promise<GoogleUserInfo> {
    const response = await fetch(GOOGLE_USER_INFO_URL, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new GoogleDriveApiError(
        "Failed to get user info",
        response.status,
        "/userinfo",
      );
    }

    return response.json();
  }

  // ==========================================================================
  // About/Quota
  // ==========================================================================

  /**
   * Get storage quota info
   */
  async getStorageQuota(): Promise<{
    limit: string;
    usage: string;
    usageInDrive: string;
    usageInDriveTrash: string;
  }> {
    const response = await this.get<{
      storageQuota: {
        limit: string;
        usage: string;
        usageInDrive: string;
        usageInDriveTrash: string;
      };
    }>("/about", { fields: "storageQuota" });
    return response.storageQuota;
  }
}

// ============================================================================
// Google Drive API Error
// ============================================================================

export class GoogleDriveApiError extends Error {
  public readonly statusCode: number;
  public readonly endpoint: string;

  constructor(message: string, statusCode: number, endpoint: string) {
    super(
      `Google Drive API error: ${message} (status: ${statusCode}, endpoint: ${endpoint})`,
    );
    this.name = "GoogleDriveApiError";
    this.statusCode = statusCode;
    this.endpoint = endpoint;
  }
}

// ============================================================================
// File Preview Utilities
// ============================================================================

/**
 * Generate preview embed URL for a Google Drive file
 */
export function getPreviewEmbedUrl(file: GoogleDriveFile): string | null {
  const { id, mimeType } = file;

  // Google Docs types can be embedded directly
  if (mimeType.startsWith("application/vnd.google-apps.")) {
    return `https://drive.google.com/file/d/${id}/preview`;
  }

  // Regular files (images, videos, PDFs)
  if (
    mimeType.startsWith("image/") ||
    mimeType.startsWith("video/") ||
    mimeType === "application/pdf"
  ) {
    return `https://drive.google.com/file/d/${id}/preview`;
  }

  return null;
}

/**
 * Get file icon based on MIME type
 */
export function getFileIcon(mimeType: string): string {
  if (mimeType === GOOGLE_MIME_TYPES.folder) return "folder";
  if (mimeType === GOOGLE_MIME_TYPES.document) return "file-text";
  if (mimeType === GOOGLE_MIME_TYPES.spreadsheet) return "sheet";
  if (mimeType === GOOGLE_MIME_TYPES.presentation) return "presentation";
  if (mimeType === GOOGLE_MIME_TYPES.form) return "form";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "file-pdf";
  if (mimeType.includes("zip") || mimeType.includes("compressed"))
    return "archive";
  return "file";
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: string | undefined): string {
  if (!bytes) return "Unknown size";

  const size = parseInt(bytes, 10);
  if (isNaN(size)) return "Unknown size";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;
  let displaySize = size;

  while (displaySize >= 1024 && unitIndex < units.length - 1) {
    displaySize /= 1024;
    unitIndex++;
  }

  return `${displaySize.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Check if file is a Google Workspace type
 */
export function isGoogleWorkspaceFile(mimeType: string): boolean {
  return mimeType.startsWith("application/vnd.google-apps.");
}

/**
 * Parse Google Drive URL to extract file ID
 */
export function parseGoogleDriveUrl(url: string): string | null {
  // Pattern 1: /file/d/{id}/view
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];

  // Pattern 2: /open?id={id}
  const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (openMatch) return openMatch[1];

  // Pattern 3: /folders/{id}
  const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];

  // Pattern 4: docs/spreadsheets/presentation URLs
  const docMatch = url.match(
    /\/(document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/,
  );
  if (docMatch) return docMatch[2];

  return null;
}

// ============================================================================
// Google Drive Integration Provider
// ============================================================================

/**
 * Google Drive integration provider implementation
 */
export class GoogleDriveIntegrationProvider implements IntegrationProvider {
  readonly id = "google-drive" as const;
  readonly name = "Google Drive";
  readonly icon = "google-drive";
  readonly description = "Share files, embed documents, and collaborate";
  readonly category = "storage" as const;
  readonly scopes: string[];

  private config: GoogleDriveClientConfig;
  private client: GoogleDriveApiClient | null = null;

  constructor(config: GoogleDriveClientConfig) {
    this.config = config;
    this.scopes = config.scopes || GOOGLE_DRIVE_DEFAULT_SCOPES;
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(config?: Partial<OAuthConfig>): string {
    return buildAuthUrl(GOOGLE_AUTH_URL, {
      client_id: this.config.clientId,
      redirect_uri: config?.redirectUri || this.config.redirectUri,
      scope: (config?.scopes || this.scopes).join(" "),
      state: config?.state || "",
      response_type: "code",
      access_type: "offline",
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
   * Disconnect from Google Drive
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

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code: params.code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error_description || data.error);
    }

    if (!data.access_token) {
      throw new Error("No access token in response");
    }

    this.client = new GoogleDriveApiClient(data.access_token);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in
        ? calculateTokenExpiry(data.expires_in)
        : undefined,
      tokenType: data.token_type || "Bearer",
      scope: data.scope,
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

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        refresh_token: credentials.refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: "refresh_token",
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error_description || data.error);
    }

    return {
      accessToken: data.access_token,
      refreshToken: credentials.refreshToken, // Keep existing refresh token
      expiresAt: data.expires_in
        ? calculateTokenExpiry(data.expires_in)
        : undefined,
      tokenType: data.token_type || "Bearer",
      scope: data.scope,
    };
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
        const user = await this.client.getUserInfo();
        status.status = "connected";
        status.config = {
          email: user.email,
          name: user.name,
          picture: user.picture,
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
    const testClient = new GoogleDriveApiClient(credentials.accessToken);
    try {
      await testClient.getUserInfo();
      return true;
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // Google Drive-Specific Methods
  // ==========================================================================

  /**
   * Get API client
   */
  getClient(credentials?: IntegrationCredentials): GoogleDriveApiClient {
    if (credentials) {
      this.client = new GoogleDriveApiClient(credentials.accessToken);
    }
    if (!this.client) {
      throw new Error(
        "Google Drive client not initialized. Please connect first.",
      );
    }
    return this.client;
  }

  /**
   * Get file info
   */
  async getFile(
    credentials: IntegrationCredentials,
    fileId: string,
  ): Promise<GoogleDriveFile> {
    const client = this.getClient(credentials);
    return client.getFile(fileId);
  }

  /**
   * Search files
   */
  async searchFiles(
    credentials: IntegrationCredentials,
    query: string,
    options?: { pageSize?: number; mimeType?: string },
  ): Promise<GoogleDriveFile[]> {
    const client = this.getClient(credentials);
    const result = await client.searchFiles(query, options);
    return result.files;
  }

  /**
   * Get recent files
   */
  async getRecentFiles(
    credentials: IntegrationCredentials,
    count: number = 10,
  ): Promise<GoogleDriveFile[]> {
    const client = this.getClient(credentials);
    return client.getRecentFiles(count);
  }

  /**
   * Create sharing link
   */
  async createSharingLink(
    credentials: IntegrationCredentials,
    fileId: string,
    role: "reader" | "commenter" | "writer" = "reader",
  ): Promise<string> {
    const client = this.getClient(credentials);
    return client.createSharingLink(fileId, role);
  }

  /**
   * Share file with user
   */
  async shareWithUser(
    credentials: IntegrationCredentials,
    fileId: string,
    email: string,
    role: "reader" | "commenter" | "writer" = "reader",
  ): Promise<void> {
    const client = this.getClient(credentials);
    await client.shareWithUser(fileId, email, role);
  }

  /**
   * Get preview data for a Google Drive URL
   */
  async getPreviewData(
    credentials: IntegrationCredentials,
    url: string,
  ): Promise<{
    file: GoogleDriveFile;
    embedUrl: string | null;
    icon: string;
  } | null> {
    const fileId = parseGoogleDriveUrl(url);
    if (!fileId) return null;

    try {
      const client = this.getClient(credentials);
      const file = await client.getFile(fileId);
      return {
        file,
        embedUrl: getPreviewEmbedUrl(file),
        icon: getFileIcon(file.mimeType),
      };
    } catch {
      return null;
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Google Drive integration provider
 */
export function createGoogleDriveProvider(
  config: GoogleDriveClientConfig,
): GoogleDriveIntegrationProvider {
  return new GoogleDriveIntegrationProvider(config);
}
