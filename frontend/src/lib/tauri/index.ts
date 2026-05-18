/**
 * Tauri Integration - Main entry point
 *
 * This module re-exports all Tauri integration utilities for easy access.
 */

// Core bridge
export {
  isTauri,
  invoke,
  invokeOrFallback,
  listen,
  emit,
  getPlatform,
  getAppVersion,
  greet,
  getEnvironment,
  type TauriEnvironment,
} from "./tauri-bridge";

// Native menu
export {
  setupMenuListeners,
  setMenuItemEnabled,
  MenuItemIds,
  type MenuEventHandlers,
  type NavigationTarget,
} from "./native-menu";

// System tray
export {
  setupTrayListeners,
  updateTrayIcon,
  updateTrayTooltip,
  setUnreadCount,
  setTrayStatus,
  type TrayIconType,
  type UserStatus,
  type TrayEventHandlers,
} from "./tray";

// Notifications
export {
  isNotificationAvailable,
  requestPermission as requestNotificationPermission,
  isPermissionGranted as isNotificationPermissionGranted,
  showNotification,
  showMessageNotification,
  showMentionNotification,
  showDirectMessageNotification,
  showSystemNotification,
  type NotificationOptions,
  type NotificationPermission,
} from "./notifications";

// Window management
export {
  showWindow,
  hideWindow,
  minimizeWindow,
  maximizeWindow,
  closeWindow,
  focusWindow,
  isWindowFocused,
  setBadgeCount,
  clearBadge,
  enterFullscreen,
  exitFullscreen,
  isFullscreen,
  toggleFullscreen,
} from "./window";

// Deep links
export {
  setupDeepLinkListeners,
  parseDeepLink,
  createDeepLink,
  DeepLinks,
  type DeepLinkHandlers,
} from "./deeplinks";

// Auto-start
export {
  isAutoStartAvailable,
  enableAutoStart,
  disableAutoStart,
  isAutoStartEnabled,
  toggleAutoStart,
} from "./autostart";

// Updater
export {
  isUpdaterAvailable,
  setupUpdateListeners,
  checkForUpdates,
  installUpdate,
  checkAndInstall,
  type UpdateInfo,
  type UpdateEventHandlers,
} from "./updater";

// Default export with all modules
import tauriBridge from "./tauri-bridge";
import nativeMenu from "./native-menu";
import tray from "./tray";
import notifications from "./notifications";
import window from "./window";
import deeplinks from "./deeplinks";
import autostart from "./autostart";
import updater from "./updater";

export default {
  ...tauriBridge,
  menu: nativeMenu,
  tray,
  notifications,
  window,
  deeplinks,
  autostart,
  updater,
};
