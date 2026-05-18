/**
 * Deep Links - Handles deep link navigation
 *
 * This module provides utilities for handling deep links (nchat://)
 * in Tauri desktop apps.
 */

import { listen, isTauri } from "./tauri-bridge";

export interface DeepLinkHandlers {
  onDeepLink?: (url: string) => void;
  onNavigateChannel?: (channelId: string) => void;
  onNavigateMessage?: (messageId: string) => void;
  onNavigateUser?: (userId: string) => void;
  onNavigateThread?: (threadId: string) => void;
  onAuthCallback?: (url: string) => void;
}

/**
 * Set up deep link listeners
 */
export async function setupDeepLinkListeners(
  handlers: DeepLinkHandlers,
): Promise<() => void> {
  if (!isTauri()) {
    return () => {};
  }

  const unsubscribers: Array<() => void> = [];

  if (handlers.onDeepLink) {
    const unsub = await listen<string>("deep-link", handlers.onDeepLink);
    unsubscribers.push(unsub);
  }

  if (handlers.onNavigateChannel) {
    const unsub = await listen<string>(
      "navigate-channel",
      handlers.onNavigateChannel,
    );
    unsubscribers.push(unsub);
  }

  if (handlers.onNavigateMessage) {
    const unsub = await listen<string>(
      "navigate-message",
      handlers.onNavigateMessage,
    );
    unsubscribers.push(unsub);
  }

  if (handlers.onNavigateUser) {
    const unsub = await listen<string>(
      "navigate-user",
      handlers.onNavigateUser,
    );
    unsubscribers.push(unsub);
  }

  if (handlers.onNavigateThread) {
    const unsub = await listen<string>(
      "navigate-thread",
      handlers.onNavigateThread,
    );
    unsubscribers.push(unsub);
  }

  if (handlers.onAuthCallback) {
    const unsub = await listen<string>(
      "auth-callback",
      handlers.onAuthCallback,
    );
    unsubscribers.push(unsub);
  }

  // Return cleanup function
  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
}

/**
 * Parse a deep link URL
 */
export function parseDeepLink(url: string): {
  type:
    | "channel"
    | "message"
    | "user"
    | "thread"
    | "settings"
    | "auth"
    | "unknown";
  id?: string;
  params?: Record<string, string>;
} {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== "nchat:") {
      return { type: "unknown" };
    }

    const path = parsed.pathname.replace(/^\/+/, "");
    const parts = path.split("/");

    // Parse query parameters
    const params: Record<string, string> = {};
    parsed.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    switch (parts[0]) {
      case "channel":
        return { type: "channel", id: parts[1], params };
      case "message":
        return { type: "message", id: parts[1], params };
      case "user":
        return { type: "user", id: parts[1], params };
      case "thread":
        return { type: "thread", id: parts[1], params };
      case "settings":
        return { type: "settings", params };
      case "auth":
        return { type: "auth", params };
      default:
        return { type: "unknown", params };
    }
  } catch {
    return { type: "unknown" };
  }
}

/**
 * Create a deep link URL
 */
export function createDeepLink(
  type: "channel" | "message" | "user" | "thread" | "settings",
  id?: string,
  params?: Record<string, string>,
): string {
  let url = `nchat://${type}`;

  if (id) {
    url += `/${id}`;
  }

  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  return url;
}

/**
 * Deep link URL helpers
 */
export const DeepLinks = {
  channel: (channelId: string) => createDeepLink("channel", channelId),
  message: (messageId: string) => createDeepLink("message", messageId),
  user: (userId: string) => createDeepLink("user", userId),
  thread: (threadId: string) => createDeepLink("thread", threadId),
  settings: () => createDeepLink("settings"),
};

export default {
  setupDeepLinkListeners,
  parseDeepLink,
  createDeepLink,
  DeepLinks,
};
