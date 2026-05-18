"use client";

import { useEffect, useCallback, useState } from "react";
import { socketManager, SOCKET_EVENTS, type SocketEvent } from "@/lib/realtime";
import { useAuth } from "@/contexts/auth-context";

export function useSocket() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = (user as { token?: string } | null)?.token;
    socketManager.connect(token);

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socketManager.on(SOCKET_EVENTS.CONNECT, handleConnect);
    socketManager.on(SOCKET_EVENTS.DISCONNECT, handleDisconnect);

    return () => {
      socketManager.off(SOCKET_EVENTS.CONNECT, handleConnect);
      socketManager.off(SOCKET_EVENTS.DISCONNECT, handleDisconnect);
    };
  }, [user]);

  const emit = useCallback(<T>(event: SocketEvent, data: T) => {
    socketManager.emit(event, data);
  }, []);

  const subscribe = useCallback(
    <T>(event: SocketEvent, callback: (data: T) => void) => {
      return socketManager.on(event, callback);
    },
    [],
  );

  return {
    isConnected,
    emit,
    subscribe,
    socketId: socketManager.socketId,
  };
}
