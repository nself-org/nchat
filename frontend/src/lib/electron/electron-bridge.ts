/**
 * Electron Bridge
 *
 * Core bridge that detects and provides access to Electron APIs.
 * Provides safe fallbacks for non-Electron environments.
 */

// Re-export types from preload API
export interface ElectronAPI {
  window: WindowAPI;
  store: StoreAPI;
  notifications: NotificationsAPI;
  tray: TrayAPI;
  autostart: AutostartAPI;
  updates: UpdatesAPI;
  theme: ThemeAPI;
  shell: ShellAPI;
  clipboard: ClipboardAPI;
  dialog: DialogAPI;
  app: AppAPI;
  platform: PlatformAPI;
  on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
  once: (channel: string, callback: (...args: unknown[]) => void) => void;
  removeAllListeners: (channel: string) => void;
}

export interface WindowAPI {
  show: () => Promise<boolean>;
  hide: () => Promise<boolean>;
  minimize: () => Promise<boolean>;
  maximize: () => Promise<boolean>;
  toggleFullscreen: () => Promise<boolean>;
  isMaximized: () => Promise<boolean>;
  isFullscreen: () => Promise<boolean>;
  isFocused: () => Promise<boolean>;
  setZoom: (level: number) => Promise<number>;
  getZoom: () => Promise<number>;
  zoomIn: () => Promise<number>;
  zoomOut: () => Promise<number>;
  resetZoom: () => Promise<number>;
  reload: () => Promise<boolean>;
  clearCache: () => Promise<boolean>;
}

export interface StoreAPI {
  get: <T>(key: string) => Promise<T>;
  set: <T>(key: string, value: T) => Promise<boolean>;
  getAll: () => Promise<Record<string, unknown>>;
  reset: () => Promise<boolean>;
}

export interface NotificationsAPI {
  show: (options: NotificationOptions) => Promise<NotificationResult>;
  getSettings: () => Promise<NotificationSettings>;
  setSettings: (settings: Partial<NotificationSettings>) => Promise<boolean>;
  isDndActive: () => Promise<boolean>;
}

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  silent?: boolean;
  data?: Record<string, unknown>;
}

export interface NotificationResult {
  shown: boolean;
  reason?: "disabled" | "dnd" | "no-support" | "error";
}

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  showPreview: boolean;
  doNotDisturb: boolean;
  doNotDisturbStart?: string;
  doNotDisturbEnd?: string;
}

export interface TrayAPI {
  setUnreadCount: (count: number) => Promise<boolean>;
  flashFrame: (flash: boolean) => Promise<boolean>;
  updateMenu: () => Promise<boolean>;
}

export interface AutostartAPI {
  enable: () => Promise<boolean>;
  disable: () => Promise<boolean>;
  isEnabled: () => Promise<boolean>;
}

export interface UpdatesAPI {
  check: () => Promise<unknown>;
  download: () => Promise<void>;
  install: () => Promise<boolean>;
  getInfo: () => Promise<UpdateInfo>;
}

export interface UpdateInfo {
  available: boolean;
  version?: string;
  releaseDate?: string;
  releaseNotes?: string | null;
  downloadProgress?: number;
  downloaded: boolean;
  error?: string;
}

export interface ThemeAPI {
  getSystem: () => Promise<"light" | "dark">;
  setNative: (theme: "light" | "dark" | "system") => void;
  onChanged: (callback: (theme: "light" | "dark") => void) => () => void;
}

export interface ShellAPI {
  openExternal: (url: string) => Promise<boolean>;
  openPath: (path: string) => Promise<string>;
  showItemInFolder: (path: string) => Promise<boolean>;
  beep: () => Promise<boolean>;
}

export interface ClipboardAPI {
  readText: () => Promise<string>;
  writeText: (text: string) => Promise<boolean>;
  readImage: () => Promise<string>;
  writeImage: (dataUrl: string) => Promise<boolean>;
  readHtml: () => Promise<string>;
  writeHtml: (html: string) => Promise<boolean>;
  clear: () => Promise<boolean>;
}

export interface DialogAPI {
  showOpen: (options: OpenDialogOptions) => Promise<OpenDialogResult>;
  showSave: (options: SaveDialogOptions) => Promise<SaveDialogResult>;
  showMessage: (options: MessageDialogOptions) => Promise<MessageDialogResult>;
  showError: (title: string, content: string) => Promise<boolean>;
}

export interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
  properties?: Array<string>;
}

export interface OpenDialogResult {
  canceled: boolean;
  filePaths: string[];
}

export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
  properties?: Array<string>;
}

export interface SaveDialogResult {
  canceled: boolean;
  filePath?: string;
}

export interface MessageDialogOptions {
  type?: "none" | "info" | "error" | "question" | "warning";
  buttons?: string[];
  defaultId?: number;
  cancelId?: number;
  title?: string;
  message: string;
  detail?: string;
  checkboxLabel?: string;
  checkboxChecked?: boolean;
}

export interface MessageDialogResult {
  response: number;
  checkboxChecked?: boolean;
}

export interface AppAPI {
  getVersion: () => Promise<string>;
  getName: () => Promise<string>;
  getPath: (name: string) => Promise<string>;
  isPackaged: () => Promise<boolean>;
  getLocale: () => Promise<string>;
  quit: () => Promise<boolean>;
}

export interface PlatformAPI {
  getInfo: () => Promise<PlatformInfo>;
  isMac: boolean;
  isWindows: boolean;
  isLinux: boolean;
}

export interface PlatformInfo {
  platform: string;
  arch: string;
  version: string;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
}

/**
 * Check if running in Electron environment
 */
export function isElectron(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as { isElectron?: boolean }).isElectron;
}

/**
 * Get the Electron API (returns undefined if not in Electron)
 */
export function getElectronAPI(): ElectronAPI | undefined {
  if (!isElectron()) return undefined;
  return (window as { electron?: ElectronAPI }).electron;
}

/**
 * Get the Electron API or throw if not available
 */
export function requireElectronAPI(): ElectronAPI {
  const api = getElectronAPI();
  if (!api) {
    throw new Error("Electron API not available");
  }
  return api;
}

/**
 * Safe wrapper that returns undefined if not in Electron
 */
export function withElectron<T>(fn: (api: ElectronAPI) => T): T | undefined {
  const api = getElectronAPI();
  if (!api) return undefined;
  return fn(api);
}

/**
 * Safe async wrapper that returns undefined if not in Electron
 */
export async function withElectronAsync<T>(
  fn: (api: ElectronAPI) => Promise<T>,
): Promise<T | undefined> {
  const api = getElectronAPI();
  if (!api) return undefined;
  return fn(api);
}

/**
 * Safe wrapper with fallback value for non-Electron environments
 */
export function withElectronOrDefault<T>(
  fn: (api: ElectronAPI) => T,
  defaultValue: T,
): T {
  const api = getElectronAPI();
  if (!api) return defaultValue;
  return fn(api);
}

/**
 * Safe async wrapper with fallback value for non-Electron environments
 */
export async function withElectronOrDefaultAsync<T>(
  fn: (api: ElectronAPI) => Promise<T>,
  defaultValue: T,
): Promise<T> {
  const api = getElectronAPI();
  if (!api) return defaultValue;
  return fn(api);
}
