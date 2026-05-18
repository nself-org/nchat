/**
 * useChannelEvents Hook
 *
 * Manages channel real-time events including join/leave rooms,
 * channel updates, new message notifications, and member events.
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { emit, on, off, isConnected } from "../client";
import {
  SocketEvents,
  type MessageNewEvent,
  type MessageUpdateEvent,
  type MessageDeleteEvent,
  type ReactionAddEvent,
  type ReactionRemoveEvent,
  type ChannelUpdateEvent,
  type ChannelMemberEvent,
  type ChannelCreatedEvent,
  type ChannelDeletedEvent,
} from "../events";

export interface UseChannelEventsOptions {
  /**
   * Channel ID to subscribe to
   */
  channelId: string;

  /**
   * Current user ID
   */
  userId?: string;

  /**
   * Whether to auto-join channel room
   * @default true
   */
  autoJoin?: boolean;

  /**
   * Callback when new message is received
   */
  onNewMessage?: (message: MessageNewEvent) => void;

  /**
   * Callback when message is updated
   */
  onMessageUpdate?: (message: MessageUpdateEvent) => void;

  /**
   * Callback when message is deleted
   */
  onMessageDelete?: (event: MessageDeleteEvent) => void;

  /**
   * Callback when reaction is added
   */
  onReactionAdd?: (event: ReactionAddEvent) => void;

  /**
   * Callback when reaction is removed
   */
  onReactionRemove?: (event: ReactionRemoveEvent) => void;

  /**
   * Callback when channel is updated
   */
  onChannelUpdate?: (event: ChannelUpdateEvent) => void;

  /**
   * Callback when member joins
   */
  onMemberJoin?: (event: ChannelMemberEvent) => void;

  /**
   * Callback when member leaves
   */
  onMemberLeave?: (event: ChannelMemberEvent) => void;
}

export interface UseChannelEventsReturn {
  /**
   * Whether joined to channel room
   */
  isJoined: boolean;

  /**
   * Join the channel room
   */
  join: () => void;

  /**
   * Leave the channel room
   */
  leave: () => void;

  /**
   * Recent messages received (for local buffering)
   */
  recentMessages: MessageNewEvent[];

  /**
   * Clear recent messages buffer
   */
  clearRecentMessages: () => void;
}

/**
 * Hook for managing channel real-time events
 */
export function useChannelEvents(
  options: UseChannelEventsOptions,
): UseChannelEventsReturn {
  const {
    channelId,
    userId,
    autoJoin = true,
    onNewMessage,
    onMessageUpdate,
    onMessageDelete,
    onReactionAdd,
    onReactionRemove,
    onChannelUpdate,
    onMemberJoin,
    onMemberLeave,
  } = options;

  const [isJoined, setIsJoined] = useState(false);
  const [recentMessages, setRecentMessages] = useState<MessageNewEvent[]>([]);

  // Refs for callbacks to avoid effect dependencies
  const callbacksRef = useRef({
    onNewMessage,
    onMessageUpdate,
    onMessageDelete,
    onReactionAdd,
    onReactionRemove,
    onChannelUpdate,
    onMemberJoin,
    onMemberLeave,
  });

  // Update callback refs
  useEffect(() => {
    callbacksRef.current = {
      onNewMessage,
      onMessageUpdate,
      onMessageDelete,
      onReactionAdd,
      onReactionRemove,
      onChannelUpdate,
      onMemberJoin,
      onMemberLeave,
    };
  }, [
    onNewMessage,
    onMessageUpdate,
    onMessageDelete,
    onReactionAdd,
    onReactionRemove,
    onChannelUpdate,
    onMemberJoin,
    onMemberLeave,
  ]);

  // Join channel room
  const join = useCallback(() => {
    if (isConnected() && channelId) {
      emit(SocketEvents.CHANNEL_JOIN, { channelId });
      setIsJoined(true);
    }
  }, [channelId]);

  // Leave channel room
  const leave = useCallback(() => {
    if (isConnected() && channelId) {
      emit(SocketEvents.CHANNEL_LEAVE, { channelId });
      setIsJoined(false);
    }
  }, [channelId]);

  // Clear recent messages
  const clearRecentMessages = useCallback(() => {
    setRecentMessages([]);
  }, []);

  // Auto-join on mount or channel change
  useEffect(() => {
    if (autoJoin && channelId) {
      join();
    }

    return () => {
      if (channelId && isJoined) {
        leave();
      }
    };
  }, [channelId, autoJoin, join, leave, isJoined]);

  // Subscribe to message events
  useEffect(() => {
    if (!channelId) return;

    const handleNewMessage = (event: MessageNewEvent) => {
      if (event.channelId !== channelId) return;

      // Buffer recent messages
      setRecentMessages((prev) => {
        const next = [...prev, event];
        // Keep only last 50 messages in buffer
        return next.slice(-50);
      });

      callbacksRef.current.onNewMessage?.(event);
    };

    const handleMessageUpdate = (event: MessageUpdateEvent) => {
      if (event.channelId !== channelId) return;
      callbacksRef.current.onMessageUpdate?.(event);
    };

    const handleMessageDelete = (event: MessageDeleteEvent) => {
      if (event.channelId !== channelId) return;

      // Remove from buffer
      setRecentMessages((prev) => prev.filter((msg) => msg.id !== event.id));

      callbacksRef.current.onMessageDelete?.(event);
    };

    on(SocketEvents.MESSAGE_NEW, handleNewMessage);
    on(SocketEvents.MESSAGE_UPDATE, handleMessageUpdate);
    on(SocketEvents.MESSAGE_DELETE, handleMessageDelete);

    return () => {
      off(SocketEvents.MESSAGE_NEW, handleNewMessage);
      off(SocketEvents.MESSAGE_UPDATE, handleMessageUpdate);
      off(SocketEvents.MESSAGE_DELETE, handleMessageDelete);
    };
  }, [channelId]);

  // Subscribe to reaction events
  useEffect(() => {
    if (!channelId) return;

    const handleReactionAdd = (event: ReactionAddEvent) => {
      if (event.channelId !== channelId) return;
      callbacksRef.current.onReactionAdd?.(event);
    };

    const handleReactionRemove = (event: ReactionRemoveEvent) => {
      if (event.channelId !== channelId) return;
      callbacksRef.current.onReactionRemove?.(event);
    };

    on(SocketEvents.REACTION_ADD, handleReactionAdd);
    on(SocketEvents.REACTION_REMOVE, handleReactionRemove);

    return () => {
      off(SocketEvents.REACTION_ADD, handleReactionAdd);
      off(SocketEvents.REACTION_REMOVE, handleReactionRemove);
    };
  }, [channelId]);

  // Subscribe to channel events
  useEffect(() => {
    if (!channelId) return;

    const handleChannelUpdate = (event: ChannelUpdateEvent) => {
      if (event.id !== channelId) return;
      callbacksRef.current.onChannelUpdate?.(event);
    };

    const handleMemberJoin = (event: ChannelMemberEvent) => {
      if (event.channelId !== channelId) return;
      callbacksRef.current.onMemberJoin?.(event);
    };

    const handleMemberLeave = (event: ChannelMemberEvent) => {
      if (event.channelId !== channelId) return;
      callbacksRef.current.onMemberLeave?.(event);
    };

    on(SocketEvents.CHANNEL_UPDATE, handleChannelUpdate);
    on(SocketEvents.CHANNEL_MEMBER_JOIN, handleMemberJoin);
    on(SocketEvents.CHANNEL_MEMBER_LEAVE, handleMemberLeave);

    return () => {
      off(SocketEvents.CHANNEL_UPDATE, handleChannelUpdate);
      off(SocketEvents.CHANNEL_MEMBER_JOIN, handleMemberJoin);
      off(SocketEvents.CHANNEL_MEMBER_LEAVE, handleMemberLeave);
    };
  }, [channelId]);

  // Reset state on channel change
  useEffect(() => {
    setRecentMessages([]);
  }, [channelId]);

  return {
    isJoined,
    join,
    leave,
    recentMessages,
    clearRecentMessages,
  };
}

/**
 * Hook for subscribing to global channel events (create/delete)
 */
export interface UseGlobalChannelEventsOptions {
  /**
   * Callback when a new channel is created
   */
  onChannelCreated?: (event: ChannelCreatedEvent) => void;

  /**
   * Callback when a channel is deleted
   */
  onChannelDeleted?: (event: ChannelDeletedEvent) => void;
}

export function useGlobalChannelEvents(
  options: UseGlobalChannelEventsOptions = {},
): void {
  const { onChannelCreated, onChannelDeleted } = options;

  const callbacksRef = useRef({ onChannelCreated, onChannelDeleted });

  useEffect(() => {
    callbacksRef.current = { onChannelCreated, onChannelDeleted };
  }, [onChannelCreated, onChannelDeleted]);

  useEffect(() => {
    const handleChannelCreated = (event: ChannelCreatedEvent) => {
      callbacksRef.current.onChannelCreated?.(event);
    };

    const handleChannelDeleted = (event: ChannelDeletedEvent) => {
      callbacksRef.current.onChannelDeleted?.(event);
    };

    on(SocketEvents.CHANNEL_CREATED, handleChannelCreated);
    on(SocketEvents.CHANNEL_DELETED, handleChannelDeleted);

    return () => {
      off(SocketEvents.CHANNEL_CREATED, handleChannelCreated);
      off(SocketEvents.CHANNEL_DELETED, handleChannelDeleted);
    };
  }, []);
}

/**
 * Hook for joining multiple channels at once
 */
export function useMultiChannelJoin(channelIds: string[]): {
  joinedChannels: Set<string>;
  joinChannel: (channelId: string) => void;
  leaveChannel: (channelId: string) => void;
  joinAll: () => void;
  leaveAll: () => void;
} {
  const [joinedChannels, setJoinedChannels] = useState<Set<string>>(new Set());
  const channelIdsRef = useRef(channelIds);

  useEffect(() => {
    channelIdsRef.current = channelIds;
  }, [channelIds]);

  const joinChannel = useCallback((channelId: string) => {
    if (isConnected()) {
      emit(SocketEvents.CHANNEL_JOIN, { channelId });
      setJoinedChannels((prev) => new Set([...prev, channelId]));
    }
  }, []);

  const leaveChannel = useCallback((channelId: string) => {
    if (isConnected()) {
      emit(SocketEvents.CHANNEL_LEAVE, { channelId });
      setJoinedChannels((prev) => {
        const next = new Set(prev);
        next.delete(channelId);
        return next;
      });
    }
  }, []);

  const joinAll = useCallback(() => {
    if (isConnected()) {
      channelIdsRef.current.forEach((id) => {
        emit(SocketEvents.CHANNEL_JOIN, { channelId: id });
      });
      setJoinedChannels(new Set(channelIdsRef.current));
    }
  }, []);

  const leaveAll = useCallback(() => {
    if (isConnected()) {
      joinedChannels.forEach((id) => {
        emit(SocketEvents.CHANNEL_LEAVE, { channelId: id });
      });
      setJoinedChannels(new Set());
    }
  }, [joinedChannels]);

  // Auto-join on mount
  useEffect(() => {
    if (channelIds.length > 0) {
      joinAll();
    }

    return () => {
      leaveAll();
    };
  }, []);

  // Handle channel list changes
  useEffect(() => {
    const currentIds = new Set(channelIds);
    const toJoin = channelIds.filter((id) => !joinedChannels.has(id));
    const toLeave = Array.from(joinedChannels).filter(
      (id) => !currentIds.has(id),
    );

    toJoin.forEach(joinChannel);
    toLeave.forEach(leaveChannel);
  }, [channelIds, joinedChannels, joinChannel, leaveChannel]);

  return {
    joinedChannels,
    joinChannel,
    leaveChannel,
    joinAll,
    leaveAll,
  };
}

/**
 * Hook for subscribing to messages across all channels
 */
export function useGlobalMessages(
  onMessage: (message: MessageNewEvent) => void,
): void {
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    const handleNewMessage = (event: MessageNewEvent) => {
      onMessageRef.current(event);
    };

    on(SocketEvents.MESSAGE_NEW, handleNewMessage);

    return () => {
      off(SocketEvents.MESSAGE_NEW, handleNewMessage);
    };
  }, []);
}

export default useChannelEvents;
