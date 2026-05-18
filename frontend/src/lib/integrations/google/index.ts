/**
 * Google Drive Integration
 *
 * Complete Google Drive integration for the chat platform.
 * Provides OAuth, API client, file picker, and document embedding.
 */

// Export client
export {
  GoogleDriveApiClient,
  GoogleDriveApiError,
  GoogleDriveIntegrationProvider,
  createGoogleDriveProvider,
  GOOGLE_AUTH_URL,
  GOOGLE_TOKEN_URL,
  GOOGLE_DRIVE_API_BASE,
  GOOGLE_USER_INFO_URL,
  GOOGLE_DRIVE_DEFAULT_SCOPES,
  GOOGLE_MIME_TYPES,
  // File utilities
  getPreviewEmbedUrl,
  getFileIcon as getFileIconFromMimeType,
  formatFileSize as formatDriveFileSize,
  isGoogleWorkspaceFile,
  parseGoogleDriveUrl,
  type GoogleDriveClientConfig,
} from "./google-drive-client";

// Export OAuth
export {
  buildGoogleAuthUrl,
  initiateGoogleOAuth,
  exchangeCodeForToken,
  refreshAccessToken,
  getUserInfo,
  revokeToken,
  handleGoogleOAuthCallback,
  GoogleOAuthException,
  isGoogleOAuthError,
  getGoogleErrorDescription,
  parseScopes,
  hasRequiredScopes,
  calculateTokenExpiry,
  isTokenExpired,
  buildSignInButtonUrl,
  // State management
  generateOAuthState,
  storeOAuthState,
  retrieveOAuthState,
  clearOAuthState,
  type GoogleOAuthConfig,
  type GoogleOAuthState,
  type GoogleOAuthResult,
  type GoogleUserInfo,
  type GoogleOAuthError,
} from "./oauth";

// Export formatter
export {
  formatDriveFile,
  formatDriveFileForChat,
  formatDriveFolderForChat,
  formatDriveNotification,
  getFileType,
  getFileIcon,
  getFileColor,
  getEmbedUrl,
  formatFileSize,
  formatRelativeTime,
  parseDriveUrl,
  isDriveUrl,
  type FormattedDriveFile,
  type DriveFileType,
  type FormattedDriveNotification,
  type DriveNotificationIcon,
  type DriveNotificationColor,
  type DriveNotificationMetadata,
} from "./formatter";

// Export types
export type {
  GoogleDriveFile,
  GoogleDriveFolder,
  GoogleDrivePermission,
  GoogleDrivePickerConfig,
  GoogleDriveMimeType,
  GoogleDriveCapabilities,
  GoogleDriveFileMetadata,
  GoogleDriveUserInfo,
  GoogleDrivePermissionDetail,
  GoogleDriveImageMetadata,
  GoogleDriveVideoMetadata,
  GoogleDriveRevision,
  GoogleDriveChange,
  GoogleDriveComment,
  GoogleDriveReply,
  GooglePickerViewOptions,
  GooglePickerResult,
  GoogleDriveIntegrationConfig,
  GoogleDriveNotificationSettings,
  GoogleDriveUnfurlResult,
} from "./types";

export { GOOGLE_DRIVE_MIME_TYPES } from "./types";
