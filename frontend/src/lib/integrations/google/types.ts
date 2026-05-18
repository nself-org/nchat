/**
 * Google Drive Integration Types
 *
 * Platform-specific types for Google Drive integration.
 * Re-exports common types from parent and adds Google-specific types.
 */

// Re-export types from parent
export type {
  GoogleDriveFile,
  GoogleDriveFolder,
  GoogleDrivePermission,
  GoogleDrivePickerConfig,
} from "../types";

// ============================================================================
// Google-Specific Types
// ============================================================================

/**
 * Google Drive MIME types
 */
export const GOOGLE_DRIVE_MIME_TYPES = {
  // Google Workspace types
  folder: "application/vnd.google-apps.folder",
  document: "application/vnd.google-apps.document",
  spreadsheet: "application/vnd.google-apps.spreadsheet",
  presentation: "application/vnd.google-apps.presentation",
  form: "application/vnd.google-apps.form",
  drawing: "application/vnd.google-apps.drawing",
  site: "application/vnd.google-apps.site",
  script: "application/vnd.google-apps.script",
  shortcut: "application/vnd.google-apps.shortcut",
  // Export formats
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Common types
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  mp3: "audio/mpeg",
  zip: "application/zip",
  json: "application/json",
  csv: "text/csv",
  txt: "text/plain",
  html: "text/html",
} as const;

export type GoogleDriveMimeType =
  (typeof GOOGLE_DRIVE_MIME_TYPES)[keyof typeof GOOGLE_DRIVE_MIME_TYPES];

/**
 * Google Drive file capability
 */
export interface GoogleDriveCapabilities {
  canAddChildren?: boolean;
  canAddMyDriveParent?: boolean;
  canChangeCopyRequiresWriterPermission?: boolean;
  canChangeViewersCanCopyContent?: boolean;
  canComment?: boolean;
  canCopy?: boolean;
  canDelete?: boolean;
  canDeleteChildren?: boolean;
  canDownload?: boolean;
  canEdit?: boolean;
  canListChildren?: boolean;
  canModifyContent?: boolean;
  canMoveChildrenOutOfDrive?: boolean;
  canMoveChildrenWithinDrive?: boolean;
  canMoveItemIntoTeamDrive?: boolean;
  canMoveItemOutOfDrive?: boolean;
  canMoveItemOutOfTeamDrive?: boolean;
  canMoveItemWithinDrive?: boolean;
  canMoveItemWithinTeamDrive?: boolean;
  canReadDrive?: boolean;
  canReadRevisions?: boolean;
  canReadTeamDrive?: boolean;
  canRemoveChildren?: boolean;
  canRemoveMyDriveParent?: boolean;
  canRename?: boolean;
  canShare?: boolean;
  canTrash?: boolean;
  canTrashChildren?: boolean;
  canUntrash?: boolean;
}

/**
 * Google Drive file extended metadata
 */
export interface GoogleDriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  description?: string;
  starred: boolean;
  trashed: boolean;
  explicitlyTrashed?: boolean;
  parents?: string[];
  properties?: Record<string, string>;
  appProperties?: Record<string, string>;
  spaces?: string[];
  version?: string;
  webContentLink?: string;
  webViewLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  viewedByMe?: boolean;
  viewedByMeTime?: string;
  createdTime: string;
  modifiedTime: string;
  modifiedByMeTime?: string;
  sharedWithMeTime?: string;
  sharingUser?: GoogleDriveUserInfo;
  owners?: GoogleDriveUserInfo[];
  lastModifyingUser?: GoogleDriveUserInfo;
  shared: boolean;
  ownedByMe?: boolean;
  capabilities?: GoogleDriveCapabilities;
  viewersCanCopyContent?: boolean;
  copyRequiresWriterPermission?: boolean;
  writersCanShare?: boolean;
  permissions?: GoogleDrivePermissionDetail[];
  folderColorRgb?: string;
  originalFilename?: string;
  fullFileExtension?: string;
  fileExtension?: string;
  md5Checksum?: string;
  size?: string;
  quotaBytesUsed?: string;
  headRevisionId?: string;
  contentHints?: {
    thumbnail?: {
      image: string;
      mimeType: string;
    };
    indexableText?: string;
  };
  imageMediaMetadata?: GoogleDriveImageMetadata;
  videoMediaMetadata?: GoogleDriveVideoMetadata;
}

/**
 * Google Drive user info
 */
export interface GoogleDriveUserInfo {
  kind: "drive#user";
  displayName: string;
  photoLink?: string;
  me?: boolean;
  permissionId?: string;
  emailAddress?: string;
}

/**
 * Google Drive permission detail
 */
export interface GoogleDrivePermissionDetail {
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
  domain?: string;
  displayName?: string;
  photoLink?: string;
  expirationTime?: string;
  deleted?: boolean;
  allowFileDiscovery?: boolean;
  permissionDetails?: Array<{
    permissionType: string;
    role: string;
    inheritedFrom?: string;
    inherited?: boolean;
  }>;
}

/**
 * Google Drive image metadata
 */
export interface GoogleDriveImageMetadata {
  width?: number;
  height?: number;
  rotation?: number;
  location?: {
    latitude: number;
    longitude: number;
    altitude: number;
  };
  time?: string;
  cameraMake?: string;
  cameraModel?: string;
  exposureTime?: number;
  aperture?: number;
  flashUsed?: boolean;
  focalLength?: number;
  isoSpeed?: number;
  meteringMode?: string;
  sensor?: string;
  exposureMode?: string;
  colorSpace?: string;
  whiteBalance?: string;
  exposureBias?: number;
  maxApertureValue?: number;
  subjectDistance?: number;
  lens?: string;
}

/**
 * Google Drive video metadata
 */
export interface GoogleDriveVideoMetadata {
  width?: number;
  height?: number;
  durationMillis?: string;
}

/**
 * Google Drive revision
 */
export interface GoogleDriveRevision {
  id: string;
  mimeType: string;
  kind: "drive#revision";
  modifiedTime: string;
  keepForever?: boolean;
  published?: boolean;
  publishAuto?: boolean;
  publishedOutsideDomain?: boolean;
  lastModifyingUser?: GoogleDriveUserInfo;
  originalFilename?: string;
  md5Checksum?: string;
  size?: string;
  exportLinks?: Record<string, string>;
}

/**
 * Google Drive changes
 */
export interface GoogleDriveChange {
  kind: "drive#change";
  removed: boolean;
  file?: GoogleDriveFileMetadata;
  fileId?: string;
  time: string;
  driveId?: string;
  changeType: "file" | "drive";
  type: "file" | "drive";
}

/**
 * Google Drive comment
 */
export interface GoogleDriveComment {
  id: string;
  kind: "drive#comment";
  createdTime: string;
  modifiedTime: string;
  resolved?: boolean;
  author: GoogleDriveUserInfo;
  htmlContent?: string;
  content: string;
  deleted?: boolean;
  quotedFileContent?: {
    mimeType: string;
    value: string;
  };
  anchor?: string;
  replies?: GoogleDriveReply[];
}

/**
 * Google Drive comment reply
 */
export interface GoogleDriveReply {
  id: string;
  kind: "drive#reply";
  createdTime: string;
  modifiedTime: string;
  author: GoogleDriveUserInfo;
  htmlContent?: string;
  content: string;
  deleted?: boolean;
  action?: "resolve" | "reopen";
}

/**
 * Google Picker view options
 */
export interface GooglePickerViewOptions {
  viewId:
    | "DOCS"
    | "DOCS_IMAGES"
    | "DOCS_IMAGES_AND_VIDEOS"
    | "DOCS_VIDEOS"
    | "DOCUMENTS"
    | "DRAWINGS"
    | "FOLDERS"
    | "FORMS"
    | "PDFS"
    | "PRESENTATIONS"
    | "SPREADSHEETS"
    | "RECENTLY_PICKED";
  mimeTypes?: string[];
  query?: string;
  includeTeamDrives?: boolean;
  selectFolders?: boolean;
  setParent?: string;
}

/**
 * Google Picker result
 */
export interface GooglePickerResult {
  action: "picked" | "cancel";
  docs?: Array<{
    id: string;
    name: string;
    mimeType: string;
    url: string;
    iconUrl?: string;
    lastEditedUtc?: number;
    sizeBytes?: number;
    type?: string;
    isShared?: boolean;
  }>;
  viewToken?: string[];
}

/**
 * Google Drive integration config stored in database
 */
export interface GoogleDriveIntegrationConfig {
  email: string;
  name: string;
  picture?: string;
  userId?: string;
  linkedFolders?: Array<{
    id: string;
    name: string;
    channelId?: string;
  }>;
  watchChannels?: Array<{
    channelId: string;
    folderId: string;
    resourceId: string;
    expiration: string;
  }>;
}

/**
 * Google Drive notification settings
 */
export interface GoogleDriveNotificationSettings {
  channelId: string;
  folderId: string;
  folderName: string;
  events: Array<"create" | "update" | "delete" | "share">;
  enabled: boolean;
}

/**
 * Google Drive link unfurl result
 */
export interface GoogleDriveUnfurlResult {
  type:
    | "document"
    | "spreadsheet"
    | "presentation"
    | "form"
    | "folder"
    | "file";
  title: string;
  description?: string;
  owner?: string;
  ownerAvatar?: string;
  thumbnailUrl?: string;
  embedUrl?: string;
  url: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  shared: boolean;
}

/**
 * Import/export from google-drive-client
 */
export type { GoogleDriveClientConfig } from "./google-drive-client";
