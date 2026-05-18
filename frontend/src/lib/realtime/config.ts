/**
 * Socket.io Configuration
 *
 * Supports both the legacy socket server (port 3001) and the
 * nself-plugins realtime server (port 3101).
 */

/**
 * Get the realtime server URL
 * Priority: REALTIME_URL > REALTIME_WS_URL > SOCKET_URL > default
 */
function getRealtimeUrl(): string {
  if (typeof window === "undefined") {
    return (
      process.env.NEXT_PUBLIC_REALTIME_URL ||
      process.env.NEXT_PUBLIC_REALTIME_WS_URL ||
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      "http://localhost:3101"
    );
  }
  return (
    process.env.NEXT_PUBLIC_REALTIME_URL ||
    process.env.NEXT_PUBLIC_REALTIME_WS_URL ||
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    "http://localhost:3101"
  );
}

/**
 * Legacy socket configuration (for backwards compatibility)
 */
export const SOCKET_CONFIG = {
  url: process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001",
  options: {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000,
  },
};

/**
 * nself-plugins realtime server configuration
 */
export const REALTIME_CONFIG = {
  /** Realtime server URL */
  url: getRealtimeUrl(),
  /** Default transports */
  transports: ["websocket", "polling"] as ("websocket" | "polling")[],
  /** Connection options */
  options: {
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    timeout: 20000,
  },
  /** Feature flags */
  features: {
    presence: process.env.NEXT_PUBLIC_FEATURE_USER_PRESENCE !== "false",
    typing: process.env.NEXT_PUBLIC_FEATURE_TYPING_INDICATORS !== "false",
  },
  /** Presence settings */
  presence: {
    heartbeatInterval: 30000, // 30 seconds
    idleTimeout: 5 * 60 * 1000, // 5 minutes
    enableIdleDetection: true,
  },
  /** Typing settings */
  typing: {
    timeout: 5000, // 5 seconds
    debounceInterval: 300, // 300ms
    throttleInterval: 2000, // 2 seconds
  },
};
