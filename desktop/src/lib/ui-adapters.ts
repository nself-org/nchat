/**
 * Tauri adapter bridge — provides concrete implementations of
 * @nself-chat/ui adapter interfaces using Tauri IPC.
 *
 * Import this module in the Tauri desktop shell and pass the
 * resulting adapters as props to any @nself-chat/ui component
 * that accepts an adapter interface.
 */

import {
  notificationShow,
  clipboardReadText,
  clipboardWriteText,
  shellOpenExternal,
  checkForUpdate,
  setBadgeCount,
  getAppInfo,
  windowMinimize,
  windowMaximize,
  windowClose,
  windowIsMaximized,
} from "./ipc";

// ---------------------------------------------------------------------------
// Notification adapter
// ---------------------------------------------------------------------------

export interface NotificationAdapter {
  show(title: string, body: string): Promise<void>;
  setBadge(count: number): Promise<void>;
}

export const tauriNotificationAdapter: NotificationAdapter = {
  show: (title, body) => notificationShow(title, body),
  setBadge: (count) => setBadgeCount(count),
};

// ---------------------------------------------------------------------------
// Clipboard adapter
// ---------------------------------------------------------------------------

export interface ClipboardAdapter {
  readText(): Promise<string | null>;
  writeText(text: string): Promise<void>;
}

export const tauriClipboardAdapter: ClipboardAdapter = {
  readText: () => clipboardReadText(),
  writeText: (text) => clipboardWriteText(text),
};

// ---------------------------------------------------------------------------
// Shell / external link adapter
// ---------------------------------------------------------------------------

export interface ShellAdapter {
  openExternal(url: string): Promise<void>;
}

export const tauriShellAdapter: ShellAdapter = {
  openExternal: (url) => shellOpenExternal(url),
};

// ---------------------------------------------------------------------------
// Updater adapter
// ---------------------------------------------------------------------------

export interface UpdaterAdapter {
  check(): Promise<{ available: boolean; version: string | null; notes: string | null }>;
}

export const tauriUpdaterAdapter: UpdaterAdapter = {
  check: () => checkForUpdate(),
};

// ---------------------------------------------------------------------------
// App info adapter
// ---------------------------------------------------------------------------

export interface AppInfoAdapter {
  get(): Promise<{ name: string; version: string }>;
}

export const tauriAppInfoAdapter: AppInfoAdapter = {
  get: () => getAppInfo(),
};

// ---------------------------------------------------------------------------
// Window controls adapter
// ---------------------------------------------------------------------------

export interface WindowAdapter {
  minimize(): Promise<void>;
  maximize(): Promise<void>;
  close(): Promise<void>;
  isMaximized(): Promise<boolean>;
}

export const tauriWindowAdapter: WindowAdapter = {
  minimize: () => windowMinimize(),
  maximize: () => windowMaximize(),
  close: () => windowClose(),
  isMaximized: () => windowIsMaximized(),
};

// ---------------------------------------------------------------------------
// Convenience bundle — all Tauri adapters in one object
// ---------------------------------------------------------------------------

export const tauriAdapters = {
  notification: tauriNotificationAdapter,
  clipboard: tauriClipboardAdapter,
  shell: tauriShellAdapter,
  updater: tauriUpdaterAdapter,
  appInfo: tauriAppInfoAdapter,
  window: tauriWindowAdapter,
} as const;

export type TauriAdapters = typeof tauriAdapters;
