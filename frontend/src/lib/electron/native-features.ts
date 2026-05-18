/**
 * Native Features
 *
 * Provides access to native desktop features with web fallbacks.
 * Features include clipboard, dialogs, shell operations, and more.
 */

import { logger } from "@/lib/logger";
import {
  isElectron,
  getElectronAPI,
  type ShellAPI,
  type ClipboardAPI,
  type DialogAPI,
  type OpenDialogOptions,
  type SaveDialogOptions,
  type MessageDialogOptions,
} from "./electron-bridge";

// ===== Shell Operations =====

/**
 * Open a URL in the default browser
 */
export async function openExternal(url: string): Promise<boolean> {
  const api = getElectronAPI();
  if (api) {
    return api.shell.openExternal(url);
  }
  // Web fallback
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

/**
 * Open a file or folder in the system file manager
 */
export async function openPath(path: string): Promise<string> {
  const api = getElectronAPI();
  if (api) {
    return api.shell.openPath(path);
  }
  // No web fallback
  logger.warn("openPath is not available in web environment");
  return "";
}

/**
 * Show a file in the system file manager
 */
export async function showItemInFolder(path: string): Promise<boolean> {
  const api = getElectronAPI();
  if (api) {
    return api.shell.showItemInFolder(path);
  }
  // No web fallback
  logger.warn("showItemInFolder is not available in web environment");
  return false;
}

/**
 * Play the system beep sound
 */
export async function beep(): Promise<boolean> {
  const api = getElectronAPI();
  if (api) {
    return api.shell.beep();
  }
  // Web fallback - use Web Audio API
  try {
    const audioContext = new (
      window.AudioContext ||
      (window as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    )();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.type = "sine";
    oscillator.frequency.value = 800;
    gainNode.gain.value = 0.1;
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
    return true;
  } catch {
    return false;
  }
}

// ===== Clipboard Operations =====

/**
 * Read text from clipboard
 */
export async function readClipboardText(): Promise<string> {
  const api = getElectronAPI();
  if (api) {
    return api.clipboard.readText();
  }
  // Web fallback
  try {
    return await navigator.clipboard.readText();
  } catch (error) {
    logger.error("Failed to read clipboard:", error);
    return "";
  }
}

/**
 * Write text to clipboard
 */
export async function writeClipboardText(text: string): Promise<boolean> {
  const api = getElectronAPI();
  if (api) {
    return api.clipboard.writeText(text);
  }
  // Web fallback
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    logger.error("Failed to write to clipboard:", error);
    return false;
  }
}

/**
 * Read image from clipboard as data URL
 */
export async function readClipboardImage(): Promise<string> {
  const api = getElectronAPI();
  if (api) {
    return api.clipboard.readImage();
  }
  // Web fallback
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const imageTypes = item.types.filter((type) => type.startsWith("image/"));
      if (imageTypes.length > 0) {
        const blob = await item.getType(imageTypes[0]);
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    }
    return "";
  } catch (error) {
    logger.error("Failed to read image from clipboard:", error);
    return "";
  }
}

/**
 * Write image to clipboard from data URL
 */
export async function writeClipboardImage(dataUrl: string): Promise<boolean> {
  const api = getElectronAPI();
  if (api) {
    return api.clipboard.writeImage(dataUrl);
  }
  // Web fallback
  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    return true;
  } catch (error) {
    logger.error("Failed to write image to clipboard:", error);
    return false;
  }
}

/**
 * Read HTML from clipboard
 */
export async function readClipboardHtml(): Promise<string> {
  const api = getElectronAPI();
  if (api) {
    return api.clipboard.readHtml();
  }
  // Limited web fallback
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      if (item.types.includes("text/html")) {
        const blob = await item.getType("text/html");
        return await blob.text();
      }
    }
    return "";
  } catch (error) {
    logger.error("Failed to read HTML from clipboard:", error);
    return "";
  }
}

/**
 * Write HTML to clipboard
 */
export async function writeClipboardHtml(html: string): Promise<boolean> {
  const api = getElectronAPI();
  if (api) {
    return api.clipboard.writeHtml(html);
  }
  // Web fallback
  try {
    const blob = new Blob([html], { type: "text/html" });
    await navigator.clipboard.write([new ClipboardItem({ "text/html": blob })]);
    return true;
  } catch (error) {
    logger.error("Failed to write HTML to clipboard:", error);
    return false;
  }
}

/**
 * Clear the clipboard
 */
export async function clearClipboard(): Promise<boolean> {
  const api = getElectronAPI();
  if (api) {
    return api.clipboard.clear();
  }
  // Web fallback - write empty string
  try {
    await navigator.clipboard.writeText("");
    return true;
  } catch (error) {
    logger.error("Failed to clear clipboard:", error);
    return false;
  }
}

// ===== Dialog Operations =====

/**
 * Show a file open dialog
 */
export async function showOpenDialog(
  options: OpenDialogOptions,
): Promise<{ canceled: boolean; filePaths: string[] }> {
  const api = getElectronAPI();
  if (api) {
    return api.dialog.showOpen(options);
  }
  // Web fallback using file input
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = options.properties?.includes("multiSelections") ?? false;

    if (options.filters && options.filters.length > 0) {
      input.accept = options.filters
        .flatMap((f) => f.extensions.map((ext) => `.${ext}`))
        .join(",");
    }

    input.onchange = () => {
      if (input.files && input.files.length > 0) {
        const filePaths = Array.from(input.files).map((f) => f.name);
        resolve({ canceled: false, filePaths });
      } else {
        resolve({ canceled: true, filePaths: [] });
      }
    };

    input.oncancel = () => {
      resolve({ canceled: true, filePaths: [] });
    };

    input.click();
  });
}

/**
 * Show a file save dialog
 */
export async function showSaveDialog(
  options: SaveDialogOptions,
): Promise<{ canceled: boolean; filePath?: string }> {
  const api = getElectronAPI();
  if (api) {
    return api.dialog.showSave(options);
  }
  // Web fallback - not fully supported
  logger.warn("showSaveDialog has limited support in web environment");
  return { canceled: true };
}

/**
 * Show a message dialog
 */
export async function showMessageDialog(
  options: MessageDialogOptions,
): Promise<{ response: number; checkboxChecked?: boolean }> {
  const api = getElectronAPI();
  if (api) {
    return api.dialog.showMessage(options);
  }
  // Web fallback using browser dialogs
  const buttons = options.buttons || ["OK"];

  if (options.type === "question" && buttons.length === 2) {
    // Use confirm for yes/no questions
    const result = window.confirm(
      `${options.message}\n\n${options.detail || ""}`,
    );
    return { response: result ? 0 : 1 };
  } else if (options.type === "error") {
    // Use alert for errors
    window.alert(`Error: ${options.message}\n\n${options.detail || ""}`);
    return { response: 0 };
  } else {
    // Use alert for other types
    window.alert(`${options.message}\n\n${options.detail || ""}`);
    return { response: 0 };
  }
}

/**
 * Show an error dialog
 */
export async function showErrorDialog(
  title: string,
  content: string,
): Promise<boolean> {
  const api = getElectronAPI();
  if (api) {
    return api.dialog.showError(title, content);
  }
  // Web fallback
  window.alert(`${title}\n\n${content}`);
  return true;
}

// ===== Platform Detection =====

/**
 * Check if running on macOS
 */
export function isMac(): boolean {
  const api = getElectronAPI();
  if (api) {
    return api.platform.isMac;
  }
  return navigator.platform.toLowerCase().includes("mac");
}

/**
 * Check if running on Windows
 */
export function isWindows(): boolean {
  const api = getElectronAPI();
  if (api) {
    return api.platform.isWindows;
  }
  return navigator.platform.toLowerCase().includes("win");
}

/**
 * Check if running on Linux
 */
export function isLinux(): boolean {
  const api = getElectronAPI();
  if (api) {
    return api.platform.isLinux;
  }
  return navigator.platform.toLowerCase().includes("linux");
}

/**
 * Get detailed platform information
 */
export async function getPlatformInfo(): Promise<{
  platform: string;
  arch: string;
  version: string;
  electronVersion?: string;
  chromeVersion?: string;
  nodeVersion?: string;
}> {
  const api = getElectronAPI();
  if (api) {
    return api.platform.getInfo();
  }
  // Web fallback
  return {
    platform: navigator.platform,
    arch: "unknown",
    version: navigator.userAgent,
  };
}
