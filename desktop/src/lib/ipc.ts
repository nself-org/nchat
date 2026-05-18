/**
 * Thin typed wrappers around Tauri IPC invoke().
 * All frontend code should go through these instead of calling invoke() directly.
 */
import { invoke } from "@tauri-apps/api/core";

export interface AppInfo {
  name: string;
  version: string;
}

export interface UpdateInfo {
  available: boolean;
  version: string | null;
  notes: string | null;
}

export async function getAppInfo(): Promise<AppInfo> {
  const [name, version] = await Promise.all([
    invoke<string>("app_get_name"),
    invoke<string>("app_get_version"),
  ]);
  return { name, version };
}

export async function windowMinimize(): Promise<void> {
  return invoke("window_minimize");
}

export async function windowMaximize(): Promise<void> {
  return invoke("window_maximize");
}

export async function windowClose(): Promise<void> {
  return invoke("window_close");
}

export async function windowIsMaximized(): Promise<boolean> {
  return invoke<boolean>("window_is_maximized");
}

export async function notificationShow(
  title: string,
  body: string
): Promise<void> {
  return invoke("notification_show", { title, body });
}

export async function checkForUpdate(): Promise<UpdateInfo> {
  return invoke<UpdateInfo>("update_check");
}

export async function setBadgeCount(count: number): Promise<void> {
  return invoke("app_set_badge_count", { count });
}

export async function clipboardReadText(): Promise<string | null> {
  return invoke<string | null>("clipboard_read_text");
}

export async function clipboardWriteText(text: string): Promise<void> {
  return invoke("clipboard_write_text", { text });
}

export async function shellOpenExternal(url: string): Promise<void> {
  return invoke("shell_open_external", { url });
}
