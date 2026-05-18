"use client";

import { useEffect, useState, useCallback } from "react";
import { useSocket } from "./use-socket";
import { SOCKET_EVENTS, type PresencePayload } from "@/lib/realtime";

export function usePresence(userIds: string[]) {
  const { subscribe, emit, isConnected } = useSocket();
  const [presence, setPresence] = useState<Map<string, PresencePayload>>(
    new Map(),
  );

  useEffect(() => {
    if (!isConnected || userIds.length === 0) return;

    emit(SOCKET_EVENTS.PRESENCE_SUBSCRIBE, { userIds });

    const unsubscribe = subscribe<PresencePayload>(
      SOCKET_EVENTS.PRESENCE_UPDATE,
      (data) => {
        setPresence((prev) => new Map(prev).set(data.userId, data));
      },
    );

    return unsubscribe;
  }, [isConnected, userIds, subscribe, emit]);

  const getPresence = useCallback(
    (userId: string) => {
      return presence.get(userId) ?? { userId, status: "offline" as const };
    },
    [presence],
  );

  return { presence, getPresence };
}
