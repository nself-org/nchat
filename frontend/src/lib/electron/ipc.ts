/**
 * IPC Communication Utilities
 *
 * Provides utilities for communicating with the Electron main process.
 * Includes event listeners and message sending.
 */

import { isElectron, getElectronAPI } from "./electron-bridge";

export type IpcChannel =
  | "navigate"
  | "deeplink"
  | "navigate:message"
  | "join:invite"
  | "auth:callback"
  | "theme:changed"
  | "update:checking"
  | "update:available"
  | "update:not-available"
  | "update:download-progress"
  | "update:downloaded"
  | "update:error"
  | "notification:action"
  | "app:new-message"
  | "app:new-channel"
  | "app:find"
  | "app:find-in-channel"
  | "app:toggle-sidebar"
  | "app:show-channels"
  | "app:show-dms"
  | "app:quick-switcher"
  | "app:jump-to-conversation"
  | "app:set-status";

type IpcListener<T = unknown> = (...args: T[]) => void;

const listeners = new Map<string, Set<IpcListener>>();

/**
 * Add an IPC event listener
 */
export function onIpcEvent<T = unknown>(
  channel: IpcChannel,
  callback: IpcListener<T>,
): () => void {
  if (!isElectron()) {
    // In non-Electron environment, return a no-op cleanup function
    return () => {};
  }

  const api = getElectronAPI();
  if (!api) return () => {};

  // Track listener for cleanup
  if (!listeners.has(channel)) {
    listeners.set(channel, new Set());
  }
  listeners.get(channel)!.add(callback as IpcListener);

  // Subscribe to the channel
  const unsubscribe = api.on(channel, callback as (...args: unknown[]) => void);

  // Return cleanup function
  return () => {
    unsubscribe();
    listeners.get(channel)?.delete(callback as IpcListener);
  };
}

/**
 * Add a one-time IPC event listener
 */
export function onceIpcEvent<T = unknown>(
  channel: IpcChannel,
  callback: IpcListener<T>,
): void {
  if (!isElectron()) return;

  const api = getElectronAPI();
  if (!api) return;

  api.once(channel, callback as (...args: unknown[]) => void);
}

/**
 * Remove all listeners for a channel
 */
export function removeAllIpcListeners(channel: IpcChannel): void {
  if (!isElectron()) return;

  const api = getElectronAPI();
  if (!api) return;

  api.removeAllListeners(channel);
  listeners.delete(channel);
}

/**
 * Remove all registered IPC listeners
 */
export function cleanupAllIpcListeners(): void {
  if (!isElectron()) return;

  const api = getElectronAPI();
  if (!api) return;

  for (const channel of listeners.keys()) {
    api.removeAllListeners(channel);
  }
  listeners.clear();
}

// Navigation event helpers
export interface NavigationPayload {
  path: string;
  params?: Record<string, string>;
  query?: Record<string, string>;
}

export interface DeepLinkPayload {
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
}

export interface MessageNavigationPayload {
  messageId: string;
  query?: Record<string, string>;
}

export interface JoinInvitePayload {
  code: string;
}

export interface AuthCallbackPayload {
  token?: string;
  code?: string;
  error?: string;
}

export interface NotificationActionPayload {
  notificationId: string;
  actionIndex: number;
  data?: Record<string, unknown>;
}

export interface UpdateProgressPayload {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

export interface UpdateInfoPayload {
  available: boolean;
  version?: string;
  releaseDate?: string;
  releaseNotes?: string | null;
  downloadProgress?: number;
  downloaded: boolean;
}

export interface UpdateErrorPayload {
  message: string;
}

/**
 * Subscribe to navigation events from menu/keyboard shortcuts
 */
export function onNavigate(callback: (path: string) => void): () => void {
  return onIpcEvent<string>("navigate", callback);
}

/**
 * Subscribe to deep link events
 */
export function onDeepLink(
  callback: (payload: DeepLinkPayload) => void,
): () => void {
  return onIpcEvent<DeepLinkPayload>("deeplink", callback);
}

/**
 * Subscribe to message navigation events
 */
export function onNavigateToMessage(
  callback: (payload: MessageNavigationPayload) => void,
): () => void {
  return onIpcEvent<MessageNavigationPayload>("navigate:message", callback);
}

/**
 * Subscribe to join invite events
 */
export function onJoinInvite(
  callback: (payload: JoinInvitePayload) => void,
): () => void {
  return onIpcEvent<JoinInvitePayload>("join:invite", callback);
}

/**
 * Subscribe to auth callback events
 */
export function onAuthCallback(
  callback: (payload: AuthCallbackPayload) => void,
): () => void {
  return onIpcEvent<AuthCallbackPayload>("auth:callback", callback);
}

/**
 * Subscribe to theme change events
 */
export function onThemeChanged(
  callback: (theme: "light" | "dark") => void,
): () => void {
  return onIpcEvent<"light" | "dark">("theme:changed", callback);
}

/**
 * Subscribe to update events
 */
export function onUpdateChecking(callback: () => void): () => void {
  return onIpcEvent("update:checking", callback);
}

export function onUpdateAvailable(
  callback: (info: UpdateInfoPayload) => void,
): () => void {
  return onIpcEvent<UpdateInfoPayload>("update:available", callback);
}

export function onUpdateNotAvailable(
  callback: (info: UpdateInfoPayload) => void,
): () => void {
  return onIpcEvent<UpdateInfoPayload>("update:not-available", callback);
}

export function onUpdateDownloadProgress(
  callback: (progress: UpdateProgressPayload) => void,
): () => void {
  return onIpcEvent<UpdateProgressPayload>(
    "update:download-progress",
    callback,
  );
}

export function onUpdateDownloaded(
  callback: (info: UpdateInfoPayload) => void,
): () => void {
  return onIpcEvent<UpdateInfoPayload>("update:downloaded", callback);
}

export function onUpdateError(
  callback: (error: UpdateErrorPayload) => void,
): () => void {
  return onIpcEvent<UpdateErrorPayload>("update:error", callback);
}

/**
 * Subscribe to notification action events
 */
export function onNotificationAction(
  callback: (payload: NotificationActionPayload) => void,
): () => void {
  return onIpcEvent<NotificationActionPayload>("notification:action", callback);
}

// App event helpers
export function onNewMessage(callback: () => void): () => void {
  return onIpcEvent("app:new-message", callback);
}

export function onNewChannel(callback: () => void): () => void {
  return onIpcEvent("app:new-channel", callback);
}

export function onFind(callback: () => void): () => void {
  return onIpcEvent("app:find", callback);
}

export function onFindInChannel(callback: () => void): () => void {
  return onIpcEvent("app:find-in-channel", callback);
}

export function onToggleSidebar(callback: () => void): () => void {
  return onIpcEvent("app:toggle-sidebar", callback);
}

export function onShowChannels(callback: () => void): () => void {
  return onIpcEvent("app:show-channels", callback);
}

export function onShowDMs(callback: () => void): () => void {
  return onIpcEvent("app:show-dms", callback);
}

export function onQuickSwitcher(callback: () => void): () => void {
  return onIpcEvent("app:quick-switcher", callback);
}

export function onJumpToConversation(callback: () => void): () => void {
  return onIpcEvent("app:jump-to-conversation", callback);
}

export function onSetStatus(callback: (status: string) => void): () => void {
  return onIpcEvent<string>("app:set-status", callback);
}
