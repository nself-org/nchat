"use client";

import { useEffect, useRef } from "react";
import { useSocket } from "./use-socket";
import type { ServerToClientEvents } from "@/lib/realtime/typed-events";

type EventName = keyof ServerToClientEvents;
type EventCallback<E extends EventName> = ServerToClientEvents[E];

/**
 * Hook for subscribing to specific typed Socket.io events
 *
 * @param event - The event name to subscribe to
 * @param callback - The callback function to handle the event
 * @param enabled - Whether the subscription is enabled (default: true)
 *
 * @example
 * ```tsx
 * useSocketEvent('message:new', (payload) => {
 *   // payload is fully typed as MessagePayload
 *   /* console.log 'New message:', payload.content)
 * })
 * ```
 */
export function useSocketEvent<E extends EventName>(
  event: E,
  callback: EventCallback<E>,
  enabled = true,
) {
  const { subscribe, isConnected } = useSocket();
  const callbackRef = useRef(callback);

  // Keep callback ref up to date to avoid stale closures
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!isConnected || !enabled) return;

    const handler = (...args: Parameters<EventCallback<E>>) => {
      (callbackRef.current as (...args: Parameters<EventCallback<E>>) => void)(
        ...args,
      );
    };

    // Type assertion needed due to the generic constraints
    return subscribe(
      event as Parameters<typeof subscribe>[0],
      handler as Parameters<typeof subscribe>[1],
    );
  }, [event, enabled, isConnected, subscribe]);
}
