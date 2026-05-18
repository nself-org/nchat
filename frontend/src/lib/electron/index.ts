/**
 * Electron Bridge - Main Export
 *
 * Re-exports all Electron bridge modules for convenient importing.
 * Provides a unified API for desktop and web environments.
 */

// Core bridge
export {
  isElectron,
  getElectronAPI,
  requireElectronAPI,
  withElectron,
  withElectronAsync,
  withElectronOrDefault,
  withElectronOrDefaultAsync,
  type ElectronAPI,
  type WindowAPI,
  type StoreAPI,
  type NotificationsAPI,
  type TrayAPI,
  type AutostartAPI,
  type UpdatesAPI,
  type ThemeAPI,
  type ShellAPI,
  type ClipboardAPI,
  type DialogAPI,
  type AppAPI,
  type PlatformAPI,
  type NotificationOptions,
  type NotificationResult,
  type NotificationSettings,
  type UpdateInfo,
  type OpenDialogOptions,
  type OpenDialogResult,
  type SaveDialogOptions,
  type SaveDialogResult,
  type MessageDialogOptions,
  type MessageDialogResult,
  type PlatformInfo,
} from "./electron-bridge";

// IPC Communication
export {
  onIpcEvent,
  onceIpcEvent,
  removeAllIpcListeners,
  cleanupAllIpcListeners,
  onNavigate,
  onDeepLink,
  onNavigateToMessage,
  onJoinInvite,
  onAuthCallback,
  onThemeChanged,
  onUpdateChecking,
  onUpdateAvailable,
  onUpdateNotAvailable,
  onUpdateDownloadProgress,
  onUpdateDownloaded,
  onUpdateError,
  onNotificationAction,
  onNewMessage,
  onNewChannel,
  onFind,
  onFindInChannel,
  onToggleSidebar,
  onShowChannels,
  onShowDMs,
  onQuickSwitcher,
  onJumpToConversation,
  onSetStatus,
  type IpcChannel,
  type NavigationPayload,
  type DeepLinkPayload,
  type MessageNavigationPayload,
  type JoinInvitePayload,
  type AuthCallbackPayload,
  type NotificationActionPayload,
  type UpdateProgressPayload,
  type UpdateInfoPayload,
  type UpdateErrorPayload,
} from "./ipc";

// Native Features
export {
  // Shell
  openExternal,
  openPath,
  showItemInFolder,
  beep,
  // Clipboard
  readClipboardText,
  writeClipboardText,
  readClipboardImage,
  writeClipboardImage,
  readClipboardHtml,
  writeClipboardHtml,
  clearClipboard,
  // Dialogs
  showOpenDialog,
  showSaveDialog,
  showMessageDialog,
  showErrorDialog,
  // Platform
  isMac,
  isWindows,
  isLinux,
  getPlatformInfo,
} from "./native-features";

// Window Management
export {
  showWindow,
  hideWindow,
  minimizeWindow,
  maximizeWindow,
  toggleFullscreen,
  isWindowMaximized,
  isWindowFullscreen,
  isWindowFocused,
  setZoomLevel,
  getZoomLevel,
  zoomIn,
  zoomOut,
  resetZoom,
  reloadWindow,
  clearCache,
  getWindowState,
  onWindowStateChange,
  getModifierKey,
  getModifierLabel,
  type WindowState,
} from "./window";

// Notifications
export {
  showNotification,
  showMessageNotification,
  showMentionNotification,
  getNotificationSettings,
  setNotificationSettings,
  isDndActive,
  requestNotificationPermission,
  areNotificationsSupported,
  getNotificationPermission,
  setUnreadCount,
  flashFrame,
  updateTrayMenu,
} from "./notifications";

// Settings Store
export {
  getSetting,
  setSetting,
  getAllSettings,
  resetSettings,
  getSettings,
  setSettings,
  getNotificationSettings as getStoredNotificationSettings,
  setNotificationSettings as setStoredNotificationSettings,
  getZoomLevel as getStoredZoomLevel,
  setZoomLevel as setStoredZoomLevel,
  getAutoUpdate,
  setAutoUpdate,
  getUpdateChannel,
  setUpdateChannel,
  getLastUserId,
  setLastUserId,
  getLastWorkspaceId,
  setLastWorkspaceId,
  type AppSettings,
} from "./store";
