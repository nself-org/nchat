/**
 * Platform Detection Module
 *
 * Provides utilities for detecting the current platform (web, iOS, Android, Electron, Tauri)
 * and querying platform capabilities for conditional feature enabling.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Supported platform types
 */
export enum Platform {
  WEB = "web",
  IOS = "ios",
  ANDROID = "android",
  ELECTRON = "electron",
  TAURI = "tauri",
}

/**
 * Platform capability flags
 */
export interface PlatformCapabilities {
  /** Native push notification support */
  pushNotifications: boolean;
  /** Biometric authentication (Face ID, Touch ID, Fingerprint) */
  biometricAuth: boolean;
  /** Native file system access */
  fileSystem: boolean;
  /** Camera/photo capture */
  camera: boolean;
  /** Native share sheet */
  nativeShare: boolean;
  /** Deep link handling */
  deepLinks: boolean;
  /** Background sync support */
  backgroundSync: boolean;
  /** Offline mode with local storage */
  offlineMode: boolean;
  /** Haptic feedback */
  haptics: boolean;
  /** System tray support */
  systemTray: boolean;
  /** Native window controls */
  nativeWindow: boolean;
  /** Clipboard access */
  clipboard: boolean;
  /** Geolocation */
  geolocation: boolean;
  /** Audio recording */
  audioRecording: boolean;
  /** Network state detection */
  networkState: boolean;
}

/**
 * Platform version information
 */
export interface PlatformVersion {
  /** Platform name */
  platform: Platform;
  /** OS version string (e.g., "14.5", "11.0") */
  osVersion: string | null;
  /** App version if available */
  appVersion: string | null;
  /** Browser version for web */
  browserVersion: string | null;
  /** Device model */
  deviceModel: string | null;
}

/**
 * Platform-specific window properties (used with type assertions, not extension)
 */
interface PlatformWindowExtras {
  __TAURI__?: {
    core: {
      invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
    };
    event: {
      listen: <T>(
        event: string,
        handler: (event: { payload: T }) => void,
      ) => Promise<() => void>;
      emit: (event: string, payload?: unknown) => Promise<void>;
    };
    notification?: {
      sendNotification: (options: unknown) => Promise<void>;
      requestPermission: () => Promise<string>;
      isPermissionGranted: () => Promise<boolean>;
    };
    fs?: {
      readDir: (path: string, options?: unknown) => Promise<unknown>;
      readFile: (path: string, options?: unknown) => Promise<unknown>;
      writeFile: (
        path: string,
        contents: unknown,
        options?: unknown,
      ) => Promise<void>;
      removeFile: (path: string) => Promise<void>;
      exists: (path: string) => Promise<boolean>;
    };
    clipboard?: {
      writeText: (text: string) => Promise<void>;
      readText: () => Promise<string>;
    };
    tauri?: {
      path: {
        appDir: () => Promise<string>;
      };
    };
  };
  electron?: {
    version?: string;
    platform?: string;
  };
  Capacitor?: {
    isNativePlatform: () => boolean;
    getPlatform: () => string;
  };
}

type PlatformWindow = Window & PlatformWindowExtras;

// ============================================================================
// Detection Functions
// ============================================================================

/**
 * Get the global window object with platform extensions
 */
function getWindow(): PlatformWindow | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  return window as PlatformWindow;
}

/**
 * Check if code is running in a server environment
 */
export function isServer(): boolean {
  return typeof window === "undefined";
}

/**
 * Check if code is running in a browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Detect if running in Tauri environment
 */
export function isTauri(): boolean {
  const win = getWindow();
  return !!(win && win.__TAURI__);
}

/**
 * Detect if running in Electron environment
 */
export function isElectron(): boolean {
  const win = getWindow();
  if (!win) return false;

  // Check for electron in window
  if (win.electron) return true;

  // Check for electron in user agent
  const userAgent = win.navigator?.userAgent?.toLowerCase() || "";
  return userAgent.includes("electron");
}

/**
 * Detect if running in Capacitor environment (iOS/Android)
 */
export function isCapacitor(): boolean {
  const win = getWindow();
  if (!win) return false;

  return !!(
    win.Capacitor &&
    win.Capacitor.isNativePlatform &&
    win.Capacitor.isNativePlatform()
  );
}

/**
 * Detect if running on iOS (native or web)
 */
export function isIOS(): boolean {
  const win = getWindow();
  if (!win) return false;

  // Check Capacitor first
  if (
    win.Capacitor?.isNativePlatform?.() &&
    win.Capacitor?.getPlatform?.() === "ios"
  ) {
    return true;
  }

  const userAgent = win.navigator?.userAgent || "";
  const platform = win.navigator?.platform || "";

  // Check for iOS devices
  return (
    /iPhone|iPad|iPod/.test(userAgent) ||
    (platform === "MacIntel" && win.navigator?.maxTouchPoints > 1)
  ); // iPad with desktop UA
}

/**
 * Detect if running on Android (native or web)
 */
export function isAndroid(): boolean {
  const win = getWindow();
  if (!win) return false;

  // Check Capacitor first
  if (
    win.Capacitor?.isNativePlatform?.() &&
    win.Capacitor?.getPlatform?.() === "android"
  ) {
    return true;
  }

  const userAgent = win.navigator?.userAgent || "";
  return /Android/.test(userAgent);
}

/**
 * Detect if running on mobile (iOS or Android)
 */
export function isMobile(): boolean {
  return isIOS() || isAndroid();
}

/**
 * Detect if running on desktop (Electron, Tauri, or desktop browser)
 */
export function isDesktop(): boolean {
  return isElectron() || isTauri() || (!isMobile() && isBrowser());
}

/**
 * Detect if running on a native platform (not web browser)
 */
export function isNative(): boolean {
  return isElectron() || isTauri() || isCapacitor();
}

/**
 * Detect if running in a web browser (not native)
 */
export function isWeb(): boolean {
  return isBrowser() && !isNative();
}

/**
 * Detect the current platform
 */
export function detectPlatform(): Platform {
  if (isServer()) {
    return Platform.WEB;
  }

  if (isTauri()) {
    return Platform.TAURI;
  }

  if (isElectron()) {
    return Platform.ELECTRON;
  }

  // Check for native mobile via Capacitor
  const win = getWindow();
  if (win?.Capacitor?.isNativePlatform?.()) {
    const platform = win.Capacitor.getPlatform();
    if (platform === "ios") return Platform.IOS;
    if (platform === "android") return Platform.ANDROID;
  }

  // Fallback to user agent detection for mobile web
  if (isIOS()) {
    return Platform.IOS;
  }

  if (isAndroid()) {
    return Platform.ANDROID;
  }

  return Platform.WEB;
}

// ============================================================================
// Capability Detection
// ============================================================================

/**
 * Check if Web Notifications API is available
 */
export function hasNotificationAPI(): boolean {
  const win = getWindow();
  return !!(win && "Notification" in win);
}

/**
 * Check if Web Share API is available
 */
export function hasShareAPI(): boolean {
  const win = getWindow();
  return !!(win && win.navigator && "share" in win.navigator);
}

/**
 * Check if Clipboard API is available
 */
export function hasClipboardAPI(): boolean {
  const win = getWindow();
  return !!(win && win.navigator && "clipboard" in win.navigator);
}

/**
 * Check if Geolocation API is available
 */
export function hasGeolocationAPI(): boolean {
  const win = getWindow();
  return !!(win && win.navigator && "geolocation" in win.navigator);
}

/**
 * Check if MediaDevices API (camera/mic) is available
 */
export function hasMediaDevicesAPI(): boolean {
  const win = getWindow();
  return !!(win && win.navigator && "mediaDevices" in win.navigator);
}

/**
 * Check if ServiceWorker is available
 */
export function hasServiceWorkerAPI(): boolean {
  const win = getWindow();
  return !!(win && "serviceWorker" in win.navigator);
}

/**
 * Check if IndexedDB is available
 */
export function hasIndexedDB(): boolean {
  const win = getWindow();
  return !!(win && "indexedDB" in win);
}

/**
 * Check if localStorage is available
 */
export function hasLocalStorage(): boolean {
  const win = getWindow();
  if (!win) return false;

  try {
    const testKey = "__storage_test__";
    win.localStorage.setItem(testKey, testKey);
    win.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if File System Access API is available (modern browsers)
 */
export function hasFileSystemAccessAPI(): boolean {
  const win = getWindow();
  return !!(win && "showOpenFilePicker" in win);
}

/**
 * Check if Vibration API (haptics) is available
 */
export function hasVibrationAPI(): boolean {
  const win = getWindow();
  return !!(win && win.navigator && "vibrate" in win.navigator);
}

/**
 * Check if Network Information API is available
 */
export function hasNetworkInformationAPI(): boolean {
  const win = getWindow();
  return !!(win && win.navigator && "connection" in win.navigator);
}

/**
 * Get capabilities for the current platform
 */
export function getPlatformCapabilities(): PlatformCapabilities {
  const platform = detectPlatform();

  // Default capabilities based on platform
  const capabilities: PlatformCapabilities = {
    pushNotifications: false,
    biometricAuth: false,
    fileSystem: false,
    camera: false,
    nativeShare: false,
    deepLinks: false,
    backgroundSync: false,
    offlineMode: false,
    haptics: false,
    systemTray: false,
    nativeWindow: false,
    clipboard: false,
    geolocation: false,
    audioRecording: false,
    networkState: false,
  };

  // Check web APIs
  capabilities.pushNotifications =
    hasNotificationAPI() ||
    platform === Platform.IOS ||
    platform === Platform.ANDROID;
  capabilities.camera = hasMediaDevicesAPI();
  capabilities.nativeShare = hasShareAPI();
  capabilities.clipboard = hasClipboardAPI();
  capabilities.geolocation = hasGeolocationAPI();
  capabilities.audioRecording = hasMediaDevicesAPI();
  capabilities.networkState = hasNetworkInformationAPI() || isBrowser();
  capabilities.offlineMode = hasIndexedDB() && hasLocalStorage();
  capabilities.backgroundSync = hasServiceWorkerAPI();
  capabilities.haptics = hasVibrationAPI();

  // Platform-specific capabilities
  switch (platform) {
    case Platform.ELECTRON:
      capabilities.fileSystem = true;
      capabilities.deepLinks = true;
      capabilities.systemTray = true;
      capabilities.nativeWindow = true;
      capabilities.pushNotifications = true;
      break;

    case Platform.TAURI:
      capabilities.fileSystem = true;
      capabilities.deepLinks = true;
      capabilities.systemTray = true;
      capabilities.nativeWindow = true;
      capabilities.pushNotifications = true;
      break;

    case Platform.IOS:
      capabilities.biometricAuth = true;
      capabilities.deepLinks = true;
      capabilities.haptics = true;
      capabilities.pushNotifications = true;
      capabilities.fileSystem = isCapacitor();
      break;

    case Platform.ANDROID:
      capabilities.biometricAuth = true;
      capabilities.deepLinks = true;
      capabilities.haptics = true;
      capabilities.pushNotifications = true;
      capabilities.fileSystem = isCapacitor();
      break;

    case Platform.WEB:
      capabilities.fileSystem = hasFileSystemAccessAPI();
      break;
  }

  return capabilities;
}

/**
 * Check if a specific capability is available
 */
export function hasCapability(capability: keyof PlatformCapabilities): boolean {
  const capabilities = getPlatformCapabilities();
  return capabilities[capability];
}

// ============================================================================
// Version Detection
// ============================================================================

/**
 * Parse iOS version from user agent
 */
function parseIOSVersion(userAgent: string): string | null {
  const match = userAgent.match(/OS (\d+)[_.](\d+)(?:[_.](\d+))?/);
  if (match) {
    return `${match[1]}.${match[2]}${match[3] ? "." + match[3] : ""}`;
  }
  return null;
}

/**
 * Parse Android version from user agent
 */
function parseAndroidVersion(userAgent: string): string | null {
  const match = userAgent.match(/Android (\d+(?:\.\d+)?(?:\.\d+)?)/);
  return match ? match[1] : null;
}

/**
 * Parse browser name and version
 */
function parseBrowserInfo(
  userAgent: string,
): { name: string; version: string } | null {
  // Check most specific browsers first (Edge and Opera include Chrome in UA)
  const browsers = [
    { name: "Edge", regex: /Edg\/(\d+(?:\.\d+)*)/ },
    { name: "Opera", regex: /OPR\/(\d+(?:\.\d+)*)/ },
    { name: "Chrome", regex: /Chrome\/(\d+(?:\.\d+)*)/ },
    { name: "Firefox", regex: /Firefox\/(\d+(?:\.\d+)*)/ },
    { name: "Safari", regex: /Version\/(\d+(?:\.\d+)*).*Safari/ },
  ];

  for (const browser of browsers) {
    const match = userAgent.match(browser.regex);
    if (match) {
      return { name: browser.name, version: match[1] };
    }
  }

  return null;
}

/**
 * Parse device model from user agent
 */
function parseDeviceModel(userAgent: string): string | null {
  // iOS device detection (check iPod before iPhone as iPod UA contains "iPhone OS")
  if (/iPod/.test(userAgent)) return "iPod";
  if (/iPad/.test(userAgent)) return "iPad";
  if (/iPhone/.test(userAgent)) return "iPhone";

  // Android device model (simplified)
  const androidMatch = userAgent.match(/;\s*([^;)]+(?:\s+Build|\)))/);
  if (androidMatch && /Android/.test(userAgent)) {
    const model = androidMatch[1].replace(/\s*Build.*/, "").trim();
    return model || "Android Device";
  }

  // Desktop detection
  if (/Windows/.test(userAgent)) return "Windows PC";
  if (/Mac/.test(userAgent)) return "Mac";
  if (/Linux/.test(userAgent)) return "Linux PC";

  return null;
}

/**
 * Get platform version information
 */
export function getPlatformVersion(): PlatformVersion {
  const platform = detectPlatform();
  const win = getWindow();
  const userAgent = win?.navigator?.userAgent || "";

  const version: PlatformVersion = {
    platform,
    osVersion: null,
    appVersion: null,
    browserVersion: null,
    deviceModel: null,
  };

  // Parse device model
  version.deviceModel = parseDeviceModel(userAgent);

  // Platform-specific version detection
  switch (platform) {
    case Platform.ELECTRON:
      version.osVersion = win?.electron?.platform || null;
      version.appVersion = win?.electron?.version || null;
      break;

    case Platform.TAURI:
      version.appVersion =
        (win?.__TAURI__ as { version?: string })?.version || null;
      break;

    case Platform.IOS:
      version.osVersion = parseIOSVersion(userAgent);
      break;

    case Platform.ANDROID:
      version.osVersion = parseAndroidVersion(userAgent);
      break;

    case Platform.WEB:
      const browserInfo = parseBrowserInfo(userAgent);
      if (browserInfo) {
        version.browserVersion = `${browserInfo.name} ${browserInfo.version}`;
      }
      break;
  }

  return version;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get a human-readable platform name
 */
export function getPlatformName(platform?: Platform): string {
  const p = platform ?? detectPlatform();

  switch (p) {
    case Platform.WEB:
      return "Web Browser";
    case Platform.IOS:
      return "iOS";
    case Platform.ANDROID:
      return "Android";
    case Platform.ELECTRON:
      return "Desktop (Electron)";
    case Platform.TAURI:
      return "Desktop (Tauri)";
    default:
      return "Unknown";
  }
}

/**
 * Get platform category (web, mobile, desktop)
 */
export function getPlatformCategory(
  platform?: Platform,
): "web" | "mobile" | "desktop" {
  const p = platform ?? detectPlatform();

  switch (p) {
    case Platform.IOS:
    case Platform.ANDROID:
      return "mobile";
    case Platform.ELECTRON:
    case Platform.TAURI:
      return "desktop";
    case Platform.WEB:
    default:
      // Check if web on mobile device
      if (isMobile()) {
        return "mobile";
      }
      return isDesktop() ? "desktop" : "web";
  }
}

/**
 * Create a platform-specific class name
 */
export function getPlatformClassName(prefix: string = "platform"): string {
  const platform = detectPlatform();
  const category = getPlatformCategory(platform);

  return `${prefix}-${platform} ${prefix}-${category}`;
}

// ============================================================================
// Exports
// ============================================================================

export const PlatformDetector = {
  // Platform detection
  detectPlatform,
  isServer,
  isBrowser,
  isWeb,
  isNative,
  isMobile,
  isDesktop,
  isIOS,
  isAndroid,
  isElectron,
  isTauri,
  isCapacitor,

  // Capabilities
  getPlatformCapabilities,
  hasCapability,
  hasNotificationAPI,
  hasShareAPI,
  hasClipboardAPI,
  hasGeolocationAPI,
  hasMediaDevicesAPI,
  hasServiceWorkerAPI,
  hasIndexedDB,
  hasLocalStorage,
  hasFileSystemAccessAPI,
  hasVibrationAPI,
  hasNetworkInformationAPI,

  // Version info
  getPlatformVersion,

  // Utilities
  getPlatformName,
  getPlatformCategory,
  getPlatformClassName,
};

export default PlatformDetector;
