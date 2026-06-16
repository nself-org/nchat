"use client";

/**
 * useSubscriptionStatus — Monitors Hasura GraphQL WebSocket subscription health.
 *
 * Purpose: Detect connected / reconnecting / disconnected states from the
 *          Apollo WebSocket link's onError and onReconnected callbacks plus
 *          navigator.onLine. The combined "offline" state maps to either
 *          network-offline OR Hasura subscription disconnected.
 * Inputs:  Apollo client WebSocket link events + navigator.onLine events.
 * Outputs: SubscriptionStatus object with connection state and derived flags.
 * Constraints: Must detect Hasura disconnection within 2s of WS drop.
 *              Must NOT use polling — only reactive event callbacks.
 * SPORT: REGISTRY-WEB-SURFACES.md — nchat web: useSubscriptionStatus: complete
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useApolloClient } from "@apollo/client";
import type { ApolloClient, NormalizedCacheObject } from "@apollo/client";

// =============================================================================
// Types
// =============================================================================

export type HasuraLinkState =
  | "connected"
  | "reconnecting"
  | "disconnected";

export interface SubscriptionStatus {
  /** Hasura WS link state */
  hasuraState: HasuraLinkState;
  /** navigator.onLine result */
  networkOnline: boolean;
  /**
   * Combined offline: true when networkOnline=false OR hasuraState=disconnected.
   * These two cases show distinct UI but both block message sending.
   */
  isOffline: boolean;
  /** True while Hasura is actively reconnecting (hasuraState=reconnecting) */
  isReconnecting: boolean;
  /** True when fully operational */
  isConnected: boolean;
  /** ISO timestamp of last successful connection */
  lastConnectedAt: string | null;
  /** ISO timestamp when disconnection was detected */
  disconnectedAt: string | null;
}

// =============================================================================
// Internal helpers
// =============================================================================

/**
 * Attempt to reach the Apollo WebSocket link and attach event listeners.
 * Apollo's WebSocketLink stores the underlying subscriptions-transport-ws
 * or graphql-ws client on .subscriptionClient / .client.
 * We attach to both possible shapes.
 */
function attachWsListeners(
  apolloClient: ApolloClient<NormalizedCacheObject>,
  onConnected: () => void,
  onReconnecting: () => void,
  onDisconnected: () => void,
): (() => void) | null {
  // Traverse the link chain to find a WebSocket-bearing link.
  // Apollo Link chains expose .link (split/concat) or are terminal.
  // We walk up to 10 links deep to find one with a subscriptionClient.
  let link: unknown = (apolloClient as unknown as { link: unknown }).link;
  for (let depth = 0; depth < 10 && link; depth++) {
    const l = link as Record<string, unknown>;

    // graphql-ws shape: GraphQLWsLink exposes .client
    const wsClient = (l["client"] ?? l["subscriptionClient"]) as Record<string, unknown> | undefined;
    if (wsClient && typeof wsClient["on"] === "function") {
      // graphql-ws client
      const unsubs: Array<() => void> = [];
      unsubs.push((wsClient["on"] as Function)("connected", onConnected));
      unsubs.push((wsClient["on"] as Function)("connecting", onReconnecting));
      unsubs.push((wsClient["on"] as Function)("closed", onDisconnected));
      unsubs.push((wsClient["on"] as Function)("error", onDisconnected));
      return () => unsubs.forEach((u) => u && u());
    }

    // subscriptions-transport-ws shape: exposes on/onConnected/onDisconnected
    if (wsClient && typeof wsClient["onConnected"] === "function") {
      (wsClient["onConnected"] as Function)(onConnected);
      (wsClient["onReconnected"] as Function)(onConnected);
      (wsClient["onReconnecting"] as Function)(onReconnecting);
      (wsClient["onDisconnected"] as Function)(onDisconnected);
      (wsClient["onError"] as Function)(onDisconnected);
      return () => {
        // subscriptions-transport-ws does not expose a clean removeListener;
        // we replace with no-ops on cleanup.
        (wsClient["onConnected"] as Function)(() => {});
        (wsClient["onReconnected"] as Function)(() => {});
        (wsClient["onReconnecting"] as Function)(() => {});
        (wsClient["onDisconnected"] as Function)(() => {});
        (wsClient["onError"] as Function)(() => {});
      };
    }

    // Walk the chain
    link = l["left"] ?? l["right"] ?? l["link"] ?? l["next"] ?? null;
  }

  return null;
}

// =============================================================================
// Hook
// =============================================================================

export function useSubscriptionStatus(): SubscriptionStatus {
  const apolloClient = useApolloClient() as ApolloClient<NormalizedCacheObject>;

  const [hasuraState, setHasuraState] = useState<HasuraLinkState>("connected");
  const [networkOnline, setNetworkOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [lastConnectedAt, setLastConnectedAt] = useState<string | null>(null);
  const [disconnectedAt, setDisconnectedAt] = useState<string | null>(null);

  // Debounce reconnecting → disconnected transition to avoid flicker
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleConnected = useCallback(() => {
    if (disconnectTimerRef.current) {
      clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }
    setHasuraState("connected");
    setLastConnectedAt(new Date().toISOString());
    setDisconnectedAt(null);
  }, []);

  const handleReconnecting = useCallback(() => {
    if (disconnectTimerRef.current) {
      clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }
    setHasuraState("reconnecting");
    setDisconnectedAt(new Date().toISOString());
  }, []);

  const handleDisconnected = useCallback(() => {
    setHasuraState("reconnecting");
    setDisconnectedAt((prev) => prev ?? new Date().toISOString());
    // After 2s with no reconnection, transition to fully disconnected
    disconnectTimerRef.current = setTimeout(() => {
      setHasuraState("disconnected");
    }, 2000);
  }, []);

  // Attach Hasura WS listeners
  useEffect(() => {
    const cleanup = attachWsListeners(
      apolloClient,
      handleConnected,
      handleReconnecting,
      handleDisconnected,
    );

    return () => {
      if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
      cleanup?.();
    };
  }, [apolloClient, handleConnected, handleReconnecting, handleDisconnected]);

  // Attach navigator.onLine listeners
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => setNetworkOnline(true);
    const handleOffline = () => setNetworkOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // isOffline: true when network is down OR Hasura is not fully connected (reconnecting or disconnected).
  // Both "reconnecting" and "disconnected" block sending and show the offline UI.
  const isOffline = !networkOnline || hasuraState === "disconnected" || hasuraState === "reconnecting";
  const isReconnecting = hasuraState === "reconnecting";
  const isConnected = networkOnline && hasuraState === "connected";

  return {
    hasuraState,
    networkOnline,
    isOffline,
    isReconnecting,
    isConnected,
    lastConnectedAt,
    disconnectedAt,
  };
}
