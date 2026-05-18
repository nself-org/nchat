"use client";

/**
 * useConnectionStatus - Hook for monitoring connection status
 *
 * Provides comprehensive connection status information including
 * network state, socket state, and reconnection status.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  useConnectionStore,
  useConnectionSummary,
  useNetworkInfo,
  useSocketConnectionState,
} from "@/stores/connection-store";
import {
  getConnectionManager,
  type CombinedConnectionState,
} from "@/lib/offline/connection-manager";
import {
  getNetworkDetector,
  formatOfflineDuration,
  getConnectionStateText,
  getNetworkQualityText,
} from "@/lib/offline/network-detector";
import type {
  ConnectionState,
  NetworkQuality,
} from "@/lib/offline/offline-types";

// =============================================================================
// Types
// =============================================================================

export interface ConnectionStatusInfo {
  // State
  state: ConnectionState;
  isOnline: boolean;
  isOffline: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  hasError: boolean;

  // Network
  networkQuality: NetworkQuality;
  networkQualityText: string;
  isSlowConnection: boolean;
  isSaveDataEnabled: boolean;

  // Socket
  socketConnected: boolean;
  socketId: string | null;
  reconnectAttempts: number;

  // Timing
  lastConnectedAt: Date | null;
  lastDisconnectedAt: Date | null;
  offlineDuration: number | null;
  offlineDurationText: string | null;

  // UI
  stateText: string;
  showBanner: boolean;
  canSendMessages: boolean;
}

export interface UseConnectionStatusReturn extends ConnectionStatusInfo {
  // Actions
  connect: (token?: string) => void;
  disconnect: () => void;
  reconnect: (token?: string) => void;
  cancelReconnect: () => void;
  resumeReconnect: () => void;
  dismissBanner: () => void;
  checkConnectivity: () => Promise<boolean>;
}

// =============================================================================
// Hook
// =============================================================================

export function useConnectionStatus(): UseConnectionStatusReturn {
  const store = useConnectionStore();
  const summary = useConnectionSummary();
  const networkInfo = useNetworkInfo();
  const socketState = useSocketConnectionState();

  // Derived state
  const connectionStatusInfo = useMemo((): ConnectionStatusInfo => {
    const state = store.overallState;
    const isOnline = state === "online";
    const isOffline = state === "offline" || networkInfo.state === "offline";
    const isConnecting = state === "connecting";
    const isReconnecting =
      state === "reconnecting" || socketState.reconnectAttempts > 0;
    const hasError = state === "error";

    const offlineDuration =
      networkInfo.lastOffline && !isOnline
        ? Date.now() - new Date(networkInfo.lastOffline).getTime()
        : networkInfo.offlineDuration;

    const networkDetector = getNetworkDetector();

    return {
      state,
      isOnline,
      isOffline,
      isConnecting,
      isReconnecting,
      hasError,
      networkQuality: networkInfo.quality,
      networkQualityText: getNetworkQualityText(networkInfo.quality),
      isSlowConnection: networkDetector.isSlowConnection(),
      isSaveDataEnabled: networkInfo.saveData,
      socketConnected: socketState.connected,
      socketId: socketState.socketId,
      reconnectAttempts: socketState.reconnectAttempts,
      lastConnectedAt: socketState.lastConnectedAt,
      lastDisconnectedAt: socketState.lastDisconnectedAt,
      offlineDuration,
      offlineDurationText: offlineDuration
        ? formatOfflineDuration(offlineDuration)
        : null,
      stateText: getConnectionStateText(state),
      showBanner: store.showConnectionBanner,
      canSendMessages: store.canSendMessages,
    };
  }, [store, networkInfo, socketState]);

  // Actions
  const connect = useCallback((token?: string) => {
    const manager = getConnectionManager();
    manager.connect(token);
  }, []);

  const disconnect = useCallback(() => {
    const manager = getConnectionManager();
    manager.disconnect();
  }, []);

  const reconnect = useCallback((token?: string) => {
    const manager = getConnectionManager();
    manager.reconnect(token);
  }, []);

  const cancelReconnect = useCallback(() => {
    const manager = getConnectionManager();
    manager.cancelReconnect();
  }, []);

  const resumeReconnect = useCallback(() => {
    const manager = getConnectionManager();
    manager.resumeReconnect();
  }, []);

  const dismissBanner = useCallback(() => {
    store.dismissBannerTemporarily();
  }, [store]);

  const checkConnectivity = useCallback(async () => {
    const detector = getNetworkDetector();
    return detector.checkConnectivity();
  }, []);

  return {
    ...connectionStatusInfo,
    connect,
    disconnect,
    reconnect,
    cancelReconnect,
    resumeReconnect,
    dismissBanner,
    checkConnectivity,
  };
}

// =============================================================================
// Sync Hook (for syncing store with managers)
// =============================================================================

/**
 * Hook to sync connection manager state with Zustand store
 * Should be used once at the app level
 */
export function useConnectionSync(): void {
  const store = useConnectionStore();

  useEffect(() => {
    // Subscribe to connection manager
    const connectionManager = getConnectionManager();
    const unsubscribeConnection = connectionManager.subscribe(
      (state: CombinedConnectionState) => {
        store.setNetworkInfo(state.network);
        store.setSocketState(state.socket);
      },
    );

    // Subscribe to network detector
    const networkDetector = getNetworkDetector();
    const unsubscribeNetwork = networkDetector.subscribe((info) => {
      store.setNetworkInfo(info);
    });

    return () => {
      unsubscribeConnection();
      unsubscribeNetwork();
    };
  }, [store]);
}

// =============================================================================
// Simple Online Status Hook
// =============================================================================

/**
 * Simple hook for checking if online
 */
export function useIsOnline(): boolean {
  return useConnectionStore((state) => state.overallState === "online");
}

/**
 * Simple hook for checking if offline
 */
export function useIsOffline(): boolean {
  return useConnectionStore(
    (state) =>
      state.overallState === "offline" || state.network.state === "offline",
  );
}

/**
 * Simple hook for checking if reconnecting
 */
export function useIsReconnecting(): boolean {
  return useConnectionStore(
    (state) =>
      state.overallState === "reconnecting" ||
      state.socket.reconnectAttempts > 0,
  );
}

/**
 * Hook for network quality
 */
export function useNetworkQuality(): {
  quality: NetworkQuality;
  text: string;
  isSlow: boolean;
} {
  return useConnectionStore((state) => ({
    quality: state.network.quality,
    text: getNetworkQualityText(state.network.quality),
    isSlow:
      state.network.quality === "poor" ||
      state.network.effectiveType === "2g" ||
      state.network.effectiveType === "slow-2g",
  }));
}

export default useConnectionStatus;
