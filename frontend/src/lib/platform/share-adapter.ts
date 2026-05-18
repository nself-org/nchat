/**
 * Share Adapter Module
 *
 * Provides a unified sharing interface across platforms.
 * Supports web (Navigator.share), mobile (Capacitor Share),
 * and desktop platforms.
 */

import {
  Platform,
  detectPlatform,
  hasShareAPI,
  isBrowser,
} from "./platform-detector";

// ============================================================================
// Types
// ============================================================================

/**
 * Share content options
 */
export interface ShareOptions {
  /** Title of shared content */
  title?: string;
  /** Text/description of shared content */
  text?: string;
  /** URL to share */
  url?: string;
  /** Dialog title (mobile only) */
  dialogTitle?: string;
  /** Files to share */
  files?: File[];
}

/**
 * Share result
 */
export interface ShareResult {
  /** Whether sharing was successful */
  success: boolean;
  /** The activity type chosen (iOS) */
  activityType?: string;
  /** Error if failed */
  error?: Error;
  /** Whether the share was cancelled */
  cancelled?: boolean;
}

/**
 * Share adapter interface
 */
export interface ShareAdapter {
  /** Check if sharing is available */
  isAvailable(): boolean;
  /** Check if can share specific content */
  canShare(options?: ShareOptions): boolean;
  /** Share content */
  share(options: ShareOptions): Promise<ShareResult>;
  /** Copy text to clipboard as fallback */
  copyToClipboard(text: string): Promise<boolean>;
}

/**
 * Share window properties (used with type intersection, not extension)
 */
interface ShareWindowExtras {
  Capacitor?: {
    Plugins?: {
      Share?: {
        share: (opts: {
          title?: string;
          text?: string;
          url?: string;
          dialogTitle?: string;
          files?: string[];
        }) => Promise<{ activityType?: string }>;
        canShare: () => Promise<{ value: boolean }>;
      };
    };
  };
  electron?: {
    clipboard?: {
      writeText: (text: string) => void;
    };
  };
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
    clipboard?: {
      writeText: (text: string) => Promise<void>;
      readText: () => Promise<string>;
    };
  };
}

type ShareWindow = Window & ShareWindowExtras;

// ============================================================================
// Web Share Adapter
// ============================================================================

/**
 * Web Navigator.share API adapter
 */
export class WebShareAdapter implements ShareAdapter {
  isAvailable(): boolean {
    return hasShareAPI();
  }

  canShare(options?: ShareOptions): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    if (!options) {
      return true;
    }

    // Check if navigator.canShare exists and use it
    if ("canShare" in navigator && typeof navigator.canShare === "function") {
      try {
        const shareData: ShareData = {};
        if (options.title) shareData.title = options.title;
        if (options.text) shareData.text = options.text;
        if (options.url) shareData.url = options.url;
        if (options.files) shareData.files = options.files;

        return navigator.canShare(shareData);
      } catch {
        return false;
      }
    }

    // Fallback: assume can share if API is available
    return true;
  }

  async share(options: ShareOptions): Promise<ShareResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: new Error("Web Share API not available"),
      };
    }

    try {
      const shareData: ShareData = {};
      if (options.title) shareData.title = options.title;
      if (options.text) shareData.text = options.text;
      if (options.url) shareData.url = options.url;
      if (options.files && options.files.length > 0)
        shareData.files = options.files;

      await navigator.share(shareData);
      return { success: true };
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return { success: false, cancelled: true };
      }
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  async copyToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }

      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      const result = document.execCommand("copy");
      document.body.removeChild(textarea);
      return result;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// Capacitor Share Adapter
// ============================================================================

/**
 * Capacitor Share adapter for mobile
 */
export class CapacitorShareAdapter implements ShareAdapter {
  private getShare():
    | NonNullable<NonNullable<ShareWindow["Capacitor"]>["Plugins"]>["Share"]
    | null {
    const win = typeof window !== "undefined" ? (window as ShareWindow) : null;
    return win?.Capacitor?.Plugins?.Share ?? null;
  }

  isAvailable(): boolean {
    return !!this.getShare();
  }

  canShare(_options?: ShareOptions): boolean {
    return this.isAvailable();
  }

  async share(options: ShareOptions): Promise<ShareResult> {
    const Share = this.getShare();
    if (!Share) {
      return {
        success: false,
        error: new Error("Capacitor Share not available"),
      };
    }

    try {
      const result = await Share.share({
        title: options.title,
        text: options.text,
        url: options.url,
        dialogTitle: options.dialogTitle,
        // Files need to be converted to file:// URIs for Capacitor
        files: options.files?.map((f) => URL.createObjectURL(f)),
      });

      return {
        success: true,
        activityType: result.activityType,
      };
    } catch (error) {
      const errorMessage = (error as Error).message?.toLowerCase() || "";
      if (
        errorMessage.includes("cancelled") ||
        errorMessage.includes("canceled") ||
        errorMessage.includes("dismiss")
      ) {
        return { success: false, cancelled: true };
      }
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  async copyToClipboard(text: string): Promise<boolean> {
    // Use web clipboard API as fallback
    const webAdapter = new WebShareAdapter();
    return webAdapter.copyToClipboard(text);
  }
}

// ============================================================================
// Desktop Share Adapter
// ============================================================================

/**
 * Desktop share adapter (Electron/Tauri) - uses clipboard and system share
 */
export class DesktopShareAdapter implements ShareAdapter {
  isAvailable(): boolean {
    return isBrowser();
  }

  canShare(_options?: ShareOptions): boolean {
    return this.isAvailable();
  }

  async share(options: ShareOptions): Promise<ShareResult> {
    // Desktop doesn't have a native share sheet like mobile
    // Best option is to copy to clipboard
    const textToShare = [options.title, options.text, options.url]
      .filter(Boolean)
      .join("\n");

    const copied = await this.copyToClipboard(textToShare);

    if (copied) {
      return { success: true };
    }

    return {
      success: false,
      error: new Error("Failed to copy to clipboard"),
    };
  }

  async copyToClipboard(text: string): Promise<boolean> {
    const win = typeof window !== "undefined" ? (window as ShareWindow) : null;

    // Try Electron clipboard
    if (win?.electron?.clipboard) {
      try {
        win.electron.clipboard.writeText(text);
        return true;
      } catch {
        // Fall through to other methods
      }
    }

    // Try Tauri clipboard
    if (win?.__TAURI__?.clipboard) {
      try {
        await win.__TAURI__.clipboard.writeText(text);
        return true;
      } catch {
        // Fall through to web clipboard
      }
    }

    // Fallback to web clipboard
    const webAdapter = new WebShareAdapter();
    return webAdapter.copyToClipboard(text);
  }
}

// ============================================================================
// Noop Share Adapter
// ============================================================================

/**
 * No-op share adapter (for SSR)
 */
export class NoopShareAdapter implements ShareAdapter {
  isAvailable(): boolean {
    return false;
  }

  canShare(_options?: ShareOptions): boolean {
    return false;
  }

  async share(_options: ShareOptions): Promise<ShareResult> {
    return {
      success: false,
      error: new Error("Share not available"),
    };
  }

  async copyToClipboard(_text: string): Promise<boolean> {
    return false;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Detect the best share backend for the current platform
 */
export function detectShareBackend(): "web" | "capacitor" | "desktop" | "none" {
  const platform = detectPlatform();
  const win = typeof window !== "undefined" ? (window as ShareWindow) : null;

  if (!win) return "none";

  switch (platform) {
    case Platform.IOS:
    case Platform.ANDROID:
      return win.Capacitor?.Plugins?.Share
        ? "capacitor"
        : hasShareAPI()
          ? "web"
          : "desktop";
    case Platform.ELECTRON:
    case Platform.TAURI:
      return "desktop";
    case Platform.WEB:
    default:
      return hasShareAPI() ? "web" : "desktop";
  }
}

/**
 * Create a share adapter for the current platform
 */
export function createShareAdapter(): ShareAdapter {
  const backend = detectShareBackend();

  switch (backend) {
    case "capacitor":
      return new CapacitorShareAdapter();
    case "web":
      return new WebShareAdapter();
    case "desktop":
      return new DesktopShareAdapter();
    case "none":
    default:
      return new NoopShareAdapter();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let defaultAdapter: ShareAdapter | null = null;

/**
 * Get the default share adapter
 */
export function getShareAdapter(): ShareAdapter {
  if (!defaultAdapter) {
    defaultAdapter = createShareAdapter();
  }
  return defaultAdapter;
}

/**
 * Reset the default share adapter
 */
export function resetShareAdapter(): void {
  defaultAdapter = null;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Check if sharing is available
 */
export function isShareAvailable(): boolean {
  return getShareAdapter().isAvailable();
}

/**
 * Check if can share specific content
 */
export function canShare(options?: ShareOptions): boolean {
  return getShareAdapter().canShare(options);
}

/**
 * Share content
 */
export async function share(options: ShareOptions): Promise<ShareResult> {
  return getShareAdapter().share(options);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  return getShareAdapter().copyToClipboard(text);
}

// ============================================================================
// Exports
// ============================================================================

export const Share = {
  // Adapters
  WebShareAdapter,
  CapacitorShareAdapter,
  DesktopShareAdapter,
  NoopShareAdapter,

  // Factory
  createShareAdapter,
  detectShareBackend,
  getShareAdapter,
  resetShareAdapter,

  // Convenience
  isAvailable: isShareAvailable,
  canShare,
  share,
  copyToClipboard,
};

export default Share;
