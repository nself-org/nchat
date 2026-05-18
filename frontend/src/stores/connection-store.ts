/**
 * Connection Store - Zustand store for connection state management
 *
 * Manages network and socket connection state, providing reactive
 * access to connection status throughout the application.
 */

import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  ConnectionState,
  NetworkQuality,
  ConnectionType,
  EffectiveConnectionType,
  ConnectionInfo,
  SocketConnectionState,
  RetryState,
} from "@/lib/offline/offline-types";

// =============================================================================
// Types
// =============================================================================

export interface ConnectionStoreState {
  // Network state
  network: ConnectionInfo;

  // Socket state
  socket: SocketConnectionState;

  // Overall state
  overallState: ConnectionState;
  canSendMessages: boolean;
  shouldShowOffline: boolean;

  // Retry state
  retry: RetryState;

  // UI state
  showConnectionBanner: boolean;
  bannerDismissedUntil: Date | null;

  // Statistics
  totalDisconnections: number;
  lastDisconnectionDuration: number | null;
}

export interface ConnectionStoreActions {
  // Network actions
  setNetworkInfo: (info: Partial<ConnectionInfo>) => void;
  setNetworkState: (state: ConnectionState) => void;
  setNetworkQuality: (quality: NetworkQuality) => void;

  // Socket actions
  setSocketState: (state: Partial<SocketConnectionState>) => void;
  setSocketConnected: (connected: boolean, socketId?: string | null) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;

  // Combined state actions
  updateOverallState: () => void;

  // Retry actions
  setRetryState: (state: Partial<RetryState>) => void;
  resetRetryState: () => void;

  // UI actions
  showBanner: () => void;
  hideBanner: () => void;
  dismissBannerTemporarily: (durationMs?: number) => void;

  // Statistics
  recordDisconnection: (durationMs?: number) => void;

  // Reset
  reset: () => void;
}

export type ConnectionStore = ConnectionStoreState & ConnectionStoreActions;

// =============================================================================
// Initial State
// =============================================================================

const initialNetworkInfo: ConnectionInfo = {
  state: "online",
  quality: "unknown",
  type: "unknown",
  effectiveType: "unknown",
  downlink: null,
  rtt: null,
  saveData: false,
  lastOnline: null,
  lastOffline: null,
  offlineDuration: null,
};

const initialSocketState: SocketConnectionState = {
  connected: false,
  socketId: null,
  reconnectAttempts: 0,
  lastConnectedAt: null,
  lastDisconnectedAt: null,
  disconnectReason: null,
};

const initialRetryState: RetryState = {
  attempt: 0,
  nextRetryAt: null,
  lastError: null,
  shouldRetry: true,
};

const initialState: ConnectionStoreState = {
  network: initialNetworkInfo,
  socket: initialSocketState,
  overallState: "offline",
  canSendMessages: false,
  shouldShowOffline: false,
  retry: initialRetryState,
  showConnectionBanner: false,
  bannerDismissedUntil: null,
  totalDisconnections: 0,
  lastDisconnectionDuration: null,
};

// =============================================================================
// Store
// =============================================================================

export const useConnectionStore = create<ConnectionStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,

        // Network actions
        setNetworkInfo: (info) =>
          set(
            (state) => {
              state.network = { ...state.network, ...info };
              // Update overall state
              updateOverallStateInPlace(state);
            },
            false,
            "connection/setNetworkInfo",
          ),

        setNetworkState: (networkState) =>
          set(
            (state) => {
              state.network.state = networkState;

              if (networkState === "online") {
                state.network.lastOnline = new Date();
                if (state.network.lastOffline) {
                  state.network.offlineDuration =
                    Date.now() - state.network.lastOffline.getTime();
                }
              } else if (networkState === "offline") {
                state.network.lastOffline = new Date();
                state.showConnectionBanner = true;
              }

              updateOverallStateInPlace(state);
            },
            false,
            "connection/setNetworkState",
          ),

        setNetworkQuality: (quality) =>
          set(
            (state) => {
              state.network.quality = quality;
            },
            false,
            "connection/setNetworkQuality",
          ),

        // Socket actions
        setSocketState: (socketState) =>
          set(
            (state) => {
              state.socket = { ...state.socket, ...socketState };
              updateOverallStateInPlace(state);
            },
            false,
            "connection/setSocketState",
          ),

        setSocketConnected: (connected, socketId = null) =>
          set(
            (state) => {
              const wasConnected = state.socket.connected;

              state.socket.connected = connected;
              state.socket.socketId = connected ? socketId : null;

              if (connected) {
                state.socket.lastConnectedAt = new Date();
                state.socket.reconnectAttempts = 0;
                state.showConnectionBanner = false;
              } else if (wasConnected) {
                state.socket.lastDisconnectedAt = new Date();
                state.showConnectionBanner = true;
              }

              updateOverallStateInPlace(state);
            },
            false,
            "connection/setSocketConnected",
          ),

        incrementReconnectAttempts: () =>
          set(
            (state) => {
              state.socket.reconnectAttempts += 1;
            },
            false,
            "connection/incrementReconnectAttempts",
          ),

        resetReconnectAttempts: () =>
          set(
            (state) => {
              state.socket.reconnectAttempts = 0;
            },
            false,
            "connection/resetReconnectAttempts",
          ),

        // Combined state actions
        updateOverallState: () =>
          set(
            (state) => {
              updateOverallStateInPlace(state);
            },
            false,
            "connection/updateOverallState",
          ),

        // Retry actions
        setRetryState: (retryState) =>
          set(
            (state) => {
              state.retry = { ...state.retry, ...retryState };
            },
            false,
            "connection/setRetryState",
          ),

        resetRetryState: () =>
          set(
            (state) => {
              state.retry = initialRetryState;
            },
            false,
            "connection/resetRetryState",
          ),

        // UI actions
        showBanner: () =>
          set(
            (state) => {
              const now = new Date();
              if (
                !state.bannerDismissedUntil ||
                now > state.bannerDismissedUntil
              ) {
                state.showConnectionBanner = true;
              }
            },
            false,
            "connection/showBanner",
          ),

        hideBanner: () =>
          set(
            (state) => {
              state.showConnectionBanner = false;
            },
            false,
            "connection/hideBanner",
          ),

        dismissBannerTemporarily: (durationMs = 60000) =>
          set(
            (state) => {
              state.showConnectionBanner = false;
              state.bannerDismissedUntil = new Date(Date.now() + durationMs);
            },
            false,
            "connection/dismissBannerTemporarily",
          ),

        // Statistics
        recordDisconnection: (durationMs) =>
          set(
            (state) => {
              state.totalDisconnections += 1;
              if (durationMs !== undefined) {
                state.lastDisconnectionDuration = durationMs;
              }
            },
            false,
            "connection/recordDisconnection",
          ),

        // Reset
        reset: () => set(() => initialState, false, "connection/reset"),
      })),
    ),
    { name: "connection-store" },
  ),
);

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Update overall state based on network and socket state
 */
function updateOverallStateInPlace(state: ConnectionStoreState): void {
  const { network, socket, retry } = state;

  // Determine overall state
  if (network.state === "offline") {
    state.overallState = "offline";
  } else if (!retry.shouldRetry && retry.lastError) {
    // Connection has failed and won't retry
    state.overallState = "error";
  } else if (socket.connected) {
    state.overallState = "online";
  } else if (socket.reconnectAttempts > 0) {
    state.overallState = "reconnecting";
  } else if (network.state === "connecting") {
    state.overallState = "connecting";
  } else {
    state.overallState = "offline";
  }

  // Update derived states
  state.canSendMessages = socket.connected && network.state === "online";
  state.shouldShowOffline =
    state.overallState === "offline" || state.overallState === "error";
}

// =============================================================================
// Selectors
// =============================================================================

export const selectNetworkInfo = (state: ConnectionStore) => state.network;
export const selectSocketState = (state: ConnectionStore) => state.socket;
export const selectOverallState = (state: ConnectionStore) =>
  state.overallState;
export const selectCanSendMessages = (state: ConnectionStore) =>
  state.canSendMessages;
export const selectShouldShowOffline = (state: ConnectionStore) =>
  state.shouldShowOffline;
export const selectRetryState = (state: ConnectionStore) => state.retry;
export const selectShowConnectionBanner = (state: ConnectionStore) =>
  state.showConnectionBanner;
export const selectNetworkQuality = (state: ConnectionStore) =>
  state.network.quality;
export const selectIsOnline = (state: ConnectionStore) =>
  state.overallState === "online";
export const selectIsOffline = (state: ConnectionStore) =>
  state.overallState === "offline" || state.network.state === "offline";
export const selectIsReconnecting = (state: ConnectionStore) =>
  state.overallState === "reconnecting" || state.socket.reconnectAttempts > 0;
export const selectReconnectAttempts = (state: ConnectionStore) =>
  state.socket.reconnectAttempts;
export const selectLastConnectedAt = (state: ConnectionStore) =>
  state.socket.lastConnectedAt;
export const selectConnectionStats = (state: ConnectionStore) => ({
  totalDisconnections: state.totalDisconnections,
  lastDisconnectionDuration: state.lastDisconnectionDuration,
  reconnectAttempts: state.socket.reconnectAttempts,
});

// =============================================================================
// Hooks
// =============================================================================

/**
 * Get connection status summary
 */
export function useConnectionSummary() {
  return useConnectionStore((state) => ({
    isOnline: state.overallState === "online",
    isOffline:
      state.overallState === "offline" || state.network.state === "offline",
    isReconnecting: state.overallState === "reconnecting",
    canSendMessages: state.canSendMessages,
    quality: state.network.quality,
    reconnectAttempts: state.socket.reconnectAttempts,
  }));
}

/**
 * Get network info
 */
export function useNetworkInfo() {
  return useConnectionStore((state) => state.network);
}

/**
 * Get socket state
 */
export function useSocketConnectionState() {
  return useConnectionStore((state) => state.socket);
}

export default useConnectionStore;
