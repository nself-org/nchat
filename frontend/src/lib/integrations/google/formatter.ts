/**
 * Google Drive File Formatter
 *
 * Formats Google Drive files for display and embedding in chat.
 * Handles file previews, document embeds, and file sharing notifications.
 */

import type { GoogleDriveFile, GoogleDrivePermission } from "../types";

import type {
  GoogleDriveFileMetadata,
  GoogleDriveUserInfo,
  GoogleDriveMimeType,
  GOOGLE_DRIVE_MIME_TYPES,
} from "./types";

// ============================================================================
// Types
// ============================================================================

export interface FormattedDriveFile {
  id: string;
  name: string;
  type: DriveFileType;
  icon: string;
  color: string;
  url: string;
  embedUrl?: string;
  thumbnailUrl?: string;
  size?: string;
  modifiedTime: string;
  modifiedTimeRelative: string;
  owner?: {
    name: string;
    avatarUrl?: string;
  };
  shared: boolean;
  starred: boolean;
}

export type DriveFileType =
  | "folder"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "form"
  | "drawing"
  | "pdf"
  | "image"
  | "video"
  | "audio"
  | "archive"
  | "code"
  | "file";

export interface FormattedDriveNotification {
  title: string;
  body: string;
  url?: string;
  icon: DriveNotificationIcon;
  color: DriveNotificationColor;
  timestamp: string;
  metadata: DriveNotificationMetadata;
}

export type DriveNotificationIcon =
  | "file-added"
  | "file-modified"
  | "file-deleted"
  | "file-shared"
  | "file-unshared"
  | "comment-added"
  | "comment-resolved"
  | "folder"
  | "drive";

export type DriveNotificationColor =
  | "green" // created, shared
  | "blue" // modified, comment
  | "purple" // Google Docs colors
  | "red" // deleted, unshared
  | "yellow" // warning
  | "gray"; // neutral

export interface DriveNotificationMetadata {
  eventType: string;
  fileId: string;
  fileName: string;
  mimeType: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
}

// ============================================================================
// File Type Detection
// ============================================================================

/**
 * Get file type from MIME type
 */
export function getFileType(mimeType: string): DriveFileType {
  // Google Workspace types
  if (mimeType === "application/vnd.google-apps.folder") return "folder";
  if (mimeType === "application/vnd.google-apps.document") return "document";
  if (mimeType === "application/vnd.google-apps.spreadsheet")
    return "spreadsheet";
  if (mimeType === "application/vnd.google-apps.presentation")
    return "presentation";
  if (mimeType === "application/vnd.google-apps.form") return "form";
  if (mimeType === "application/vnd.google-apps.drawing") return "drawing";

  // Standard types
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";

  // Archives
  if (
    mimeType.includes("zip") ||
    mimeType.includes("rar") ||
    mimeType.includes("tar") ||
    mimeType.includes("gzip") ||
    mimeType.includes("7z")
  ) {
    return "archive";
  }

  // Code files
  if (
    mimeType.includes("javascript") ||
    mimeType.includes("typescript") ||
    mimeType.includes("json") ||
    mimeType.includes("xml") ||
    mimeType.includes("html") ||
    mimeType.includes("css") ||
    mimeType.includes("python") ||
    mimeType.includes("java") ||
    mimeType.includes("ruby") ||
    mimeType.includes("php") ||
    mimeType.includes("go") ||
    mimeType.includes("rust") ||
    mimeType.includes("c++") ||
    mimeType.includes("text/x-")
  ) {
    return "code";
  }

  return "file";
}

/**
 * Get icon name for file type
 */
export function getFileIcon(type: DriveFileType): string {
  const icons: Record<DriveFileType, string> = {
    folder: "folder",
    document: "file-text",
    spreadsheet: "table",
    presentation: "presentation",
    form: "list-check",
    drawing: "pencil",
    pdf: "file-pdf",
    image: "image",
    video: "video",
    audio: "music",
    archive: "archive",
    code: "code",
    file: "file",
  };
  return icons[type];
}

/**
 * Get color for file type (Google's colors)
 */
export function getFileColor(type: DriveFileType): string {
  const colors: Record<DriveFileType, string> = {
    folder: "#5f6368", // gray
    document: "#4285f4", // blue
    spreadsheet: "#0f9d58", // green
    presentation: "#f4b400", // yellow/amber
    form: "#7627bb", // purple
    drawing: "#db4437", // red
    pdf: "#db4437", // red
    image: "#db4437", // red
    video: "#db4437", // red
    audio: "#f4b400", // amber
    archive: "#5f6368", // gray
    code: "#5f6368", // gray
    file: "#5f6368", // gray
  };
  return colors[type];
}

// ============================================================================
// File Formatting
// ============================================================================

/**
 * Format a Google Drive file for display
 */
export function formatDriveFile(file: GoogleDriveFile): FormattedDriveFile {
  const type = getFileType(file.mimeType);

  return {
    id: file.id,
    name: file.name,
    type,
    icon: getFileIcon(type),
    color: getFileColor(type),
    url: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
    embedUrl: getEmbedUrl(file),
    thumbnailUrl: file.thumbnailLink,
    size: file.size ? formatFileSize(parseInt(file.size, 10)) : undefined,
    modifiedTime: file.modifiedTime,
    modifiedTimeRelative: formatRelativeTime(new Date(file.modifiedTime)),
    owner: file.owners?.[0]
      ? {
          name: file.owners[0].displayName,
          avatarUrl: file.owners[0].photoLink,
        }
      : undefined,
    shared: file.shared,
    starred: file.starred,
  };
}

/**
 * Get embed URL for a file
 */
export function getEmbedUrl(file: GoogleDriveFile): string | undefined {
  const { id, mimeType } = file;

  // Google Workspace types
  if (mimeType === "application/vnd.google-apps.document") {
    return `https://docs.google.com/document/d/${id}/preview`;
  }
  if (mimeType === "application/vnd.google-apps.spreadsheet") {
    return `https://docs.google.com/spreadsheets/d/${id}/preview`;
  }
  if (mimeType === "application/vnd.google-apps.presentation") {
    return `https://docs.google.com/presentation/d/${id}/preview`;
  }
  if (mimeType === "application/vnd.google-apps.form") {
    return `https://docs.google.com/forms/d/${id}/viewform`;
  }

  // Generic embeddable files
  if (
    mimeType.startsWith("image/") ||
    mimeType.startsWith("video/") ||
    mimeType === "application/pdf"
  ) {
    return `https://drive.google.com/file/d/${id}/preview`;
  }

  return undefined;
}

// ============================================================================
// Chat Message Formatting
// ============================================================================

/**
 * Format a file for display in chat
 */
export function formatDriveFileForChat(file: GoogleDriveFile): {
  text: string;
  html: string;
  embed?: {
    type: string;
    url: string;
    title: string;
    description?: string;
    color: string;
    thumbnailUrl?: string;
    embedUrl?: string;
    footer?: string;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
  };
} {
  const formatted = formatDriveFile(file);

  // Plain text
  const text = `[Google Drive] ${file.name}\n${formatted.url}`;

  // HTML
  const html = `
    <div class="drive-file-embed">
      <div class="drive-file-icon" style="color: ${formatted.color}">
        <i class="${formatted.icon}"></i>
      </div>
      <div class="drive-file-info">
        <a href="${escapeHtml(formatted.url)}" target="_blank" class="drive-file-name">
          ${escapeHtml(file.name)}
        </a>
        <div class="drive-file-meta">
          ${formatted.size ? `<span>${formatted.size}</span>` : ""}
          <span>Modified ${formatted.modifiedTimeRelative}</span>
        </div>
      </div>
    </div>
  `.trim();

  // Rich embed
  const embed: {
    type: string;
    url: string;
    title: string;
    description?: string;
    color: string;
    thumbnailUrl?: string;
    embedUrl?: string;
    footer?: string;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
  } = {
    type: "google-drive",
    url: formatted.url,
    title: file.name,
    description: file.description,
    color: formatted.color,
    thumbnailUrl: formatted.thumbnailUrl,
    embedUrl: formatted.embedUrl,
    footer: "Google Drive",
  };

  // Add fields
  const fields: Array<{ name: string; value: string; inline?: boolean }> = [];
  if (formatted.size) {
    fields.push({ name: "Size", value: formatted.size, inline: true });
  }
  if (formatted.owner) {
    fields.push({ name: "Owner", value: formatted.owner.name, inline: true });
  }
  if (fields.length) {
    embed.fields = fields;
  }

  return { text, html, embed };
}

/**
 * Format a folder for display in chat
 */
export function formatDriveFolderForChat(
  folder: GoogleDriveFile,
  fileCount?: number,
): {
  text: string;
  html: string;
  embed?: {
    type: string;
    url: string;
    title: string;
    description?: string;
    color: string;
    footer?: string;
  };
} {
  const url =
    folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`;

  // Plain text
  const text = `[Google Drive Folder] ${folder.name}\n${url}`;

  // HTML
  const html = `
    <div class="drive-folder-embed">
      <div class="drive-folder-icon">
        <i class="folder"></i>
      </div>
      <div class="drive-folder-info">
        <a href="${escapeHtml(url)}" target="_blank" class="drive-folder-name">
          ${escapeHtml(folder.name)}
        </a>
        ${fileCount !== undefined ? `<span class="drive-folder-count">${fileCount} items</span>` : ""}
      </div>
    </div>
  `.trim();

  // Rich embed
  const embed = {
    type: "google-drive-folder",
    url,
    title: folder.name,
    description: fileCount !== undefined ? `${fileCount} items` : undefined,
    color: getFileColor("folder"),
    footer: "Google Drive",
  };

  return { text, html, embed };
}

// ============================================================================
// Notification Formatting
// ============================================================================

/**
 * Format a Drive push notification
 */
export function formatDriveNotification(
  type: "create" | "update" | "delete" | "share" | "unshare" | "comment",
  file: GoogleDriveFile,
  user?: GoogleDriveUserInfo,
): FormattedDriveNotification {
  let title: string;
  let body: string;
  let icon: DriveNotificationIcon;
  let color: DriveNotificationColor;

  const fileType = getFileType(file.mimeType);
  const typeName = fileType === "folder" ? "Folder" : "File";

  switch (type) {
    case "create":
      title = `${typeName} Created`;
      body = `"${file.name}" was added to Google Drive`;
      icon = "file-added";
      color = "green";
      break;
    case "update":
      title = `${typeName} Modified`;
      body = `"${file.name}" was updated`;
      icon = "file-modified";
      color = "blue";
      break;
    case "delete":
      title = `${typeName} Deleted`;
      body = `"${file.name}" was moved to trash`;
      icon = "file-deleted";
      color = "red";
      break;
    case "share":
      title = `${typeName} Shared`;
      body = `"${file.name}" was shared${user ? ` with ${user.displayName}` : ""}`;
      icon = "file-shared";
      color = "green";
      break;
    case "unshare":
      title = `${typeName} Unshared`;
      body = `"${file.name}" is no longer shared${user ? ` with ${user.displayName}` : ""}`;
      icon = "file-unshared";
      color = "red";
      break;
    case "comment":
      title = "New Comment";
      body = `${user?.displayName || "Someone"} commented on "${file.name}"`;
      icon = "comment-added";
      color = "blue";
      break;
    default:
      title = "Drive Activity";
      body = `Activity on "${file.name}"`;
      icon = "drive";
      color = "gray";
  }

  if (user) {
    body = `${user.displayName}: ${body.replace(`${user.displayName} `, "")}`;
  }

  return {
    title,
    body,
    url: file.webViewLink,
    icon,
    color,
    timestamp: new Date().toISOString(),
    metadata: {
      eventType: type,
      fileId: file.id,
      fileName: file.name,
      mimeType: file.mimeType,
      userId: user?.permissionId,
      userEmail: user?.emailAddress,
      userName: user?.displayName,
    },
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);

  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Format relative time
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

  return date.toLocaleDateString();
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ============================================================================
// URL Parsing
// ============================================================================

/**
 * Parse Google Drive URL to extract file ID
 */
export function parseDriveUrl(url: string): {
  type:
    | "file"
    | "folder"
    | "document"
    | "spreadsheet"
    | "presentation"
    | "form"
    | "unknown";
  id: string | null;
} {
  // File: /file/d/{id}/view
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return { type: "file", id: fileMatch[1] };

  // Folder: /folders/{id} or /drive/folders/{id}
  const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return { type: "folder", id: folderMatch[1] };

  // Document: /document/d/{id}
  const docMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch) return { type: "document", id: docMatch[1] };

  // Spreadsheet: /spreadsheets/d/{id}
  const sheetMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetMatch) return { type: "spreadsheet", id: sheetMatch[1] };

  // Presentation: /presentation/d/{id}
  const slideMatch = url.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (slideMatch) return { type: "presentation", id: slideMatch[1] };

  // Form: /forms/d/{id}
  const formMatch = url.match(/\/forms\/d\/([a-zA-Z0-9_-]+)/);
  if (formMatch) return { type: "form", id: formMatch[1] };

  // Open: /open?id={id}
  const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (openMatch) return { type: "file", id: openMatch[1] };

  return { type: "unknown", id: null };
}

/**
 * Check if URL is a Google Drive URL
 */
export function isDriveUrl(url: string): boolean {
  return (
    url.includes("drive.google.com") ||
    url.includes("docs.google.com") ||
    url.includes("sheets.google.com") ||
    url.includes("slides.google.com") ||
    url.includes("forms.google.com")
  );
}
