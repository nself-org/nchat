/**
 * useRealtimeTyping Hook
 *
 * Hook for managing typing indicators with the nself-plugins realtime server.
 * Provides typing state management with debouncing, throttling, and auto-expiry.
 *
 * Features:
 * - Channel-scoped typing
 * - Thread-scoped typing
 * - DM typing support
 * - Privacy awareness
 * - Auto-stop on timeout or blur
 * - Debounced input handling
 *
 * @module hooks/use-realtime-typing
 * @version 1.0.0
 */

"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  getTypingService,
  TypingUser,
  TypingRoomType,
  TypingPrivacySettings,
} from "@/services/realtime/typing.service";
import { realtimeClient } from "@/services/realtime/realtime-client";

// ============================================================================
// Types
// ============================================================================

/**
 * Typing hook options
 */
export interface UseRealtimeTypingOptions {
  /** Room name (channel ID, DM ID, etc.) */
  roomName: string;
  /** Room type: 'channel', 'thread', or 'dm' */
  roomType?: TypingRoomType;
  /** Thread ID if typing in a thread */
  threadId?: string;
  /** Recipient ID for DMs (for privacy filtering) */
  recipientId?: string;
  /** Whether typing is enabled */
  enabled?: boolean;
  /** Typing timeout in milliseconds (default: 5 seconds) */
  typingTimeout?: number;
  /** Debounce interval for input changes (default: 300ms) */
  debounceInterval?: number;
  /** Privacy settings for typing visibility */
  privacySettings?: TypingPrivacySettings;
}

/**
 * Typing hook return value
 */
export interface UseRealtimeTypingReturn {
  /** Users currently typing in this context */
  typingUsers: TypingUser[];
  /** Whether current user is typing */
  isTyping: boolean;
  /** Formatted typing text (e.g., "Alice and Bob are typing...") */
  typingText: string | null;
  /** Number of users typing (excluding current user) */
  typingCount: number;
  /** Start typing indicator */
  startTyping: () => void;
  /** Stop typing indicator */
  stopTyping: () => void;
  /** Handle input change (with debouncing) */
  handleInputChange: (value: string) => void;
  /** Handle message send (stops typing) */
  handleMessageSend: () => void;
  /** Update privacy settings */
  updatePrivacySettings: (settings: Partial<TypingPrivacySettings>) => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing typing indicators
 *
 * @example
 * ```tsx
 * function MessageInput({ channelId }: { channelId: string }) {
 *   const [message, setMessage] = useState('');
 *   const {
 *     typingUsers,
 *     typingText,
 *     handleInputChange,
 *     handleMessageSend,
 *   } = useRealtimeTyping({ roomName: channelId });
 *
 *   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 *     setMessage(e.target.value);
 *     handleInputChange(e.target.value);
 *   };
 *
 *   const handleSubmit = () => {
 *     sendMessage(message);
 *     setMessage('');
 *     handleMessageSend();
 *   };
 *
 *   return (
 *     <div>
 *       {typingText && <span className="text-sm text-gray-500">{typingText}</span>}
 *       <input value={message} onChange={handleChange} />
 *       <button onClick={handleSubmit}>Send</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useRealtimeTyping(
  options: UseRealtimeTypingOptions,
): UseRealtimeTypingReturn {
  const {
    roomName,
    roomType = "channel",
    threadId,
    recipientId,
    enabled = true,
    typingTimeout = 5000,
    debounceInterval = 300,
    privacySettings,
  } = options;

  const { user } = useAuth();

  // State
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  // Refs
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousValueRef = useRef<string>("");

  // Compute effective room type based on threadId
  const effectiveRoomType: TypingRoomType = useMemo(() => {
    if (threadId) return "thread";
    return roomType;
  }, [threadId, roomType]);

  // Get service instance
  const typingService = useMemo(() => {
    const service = getTypingService({
      typingTimeout,
      debounceInterval,
      privacySettings,
    });
    // Set user ID for filtering
    if (user?.id) {
      service.setCurrentUserId(user.id);
    }
    return service;
  }, [typingTimeout, debounceInterval, privacySettings, user?.id]);

  // ============================================================================
  // Typing Management
  // ============================================================================

  /**
   * Start typing indicator
   */
  const startTyping = useCallback(() => {
    if (!enabled || !realtimeClient.isConnected) return;

    switch (effectiveRoomType) {
      case "dm":
        typingService.startTypingInDM(roomName, recipientId);
        break;
      case "thread":
        typingService.startTypingInThread(roomName, threadId!);
        break;
      case "channel":
      default:
        typingService.startTyping(roomName, threadId);
    }

    setIsTyping(true);
  }, [
    enabled,
    roomName,
    threadId,
    recipientId,
    effectiveRoomType,
    typingService,
  ]);

  /**
   * Stop typing indicator
   */
  const stopTyping = useCallback(() => {
    if (!enabled) return;

    switch (effectiveRoomType) {
      case "dm":
        typingService.stopTypingInDM(roomName);
        break;
      case "thread":
      case "channel":
      default:
        typingService.stopTyping(roomName, threadId);
    }

    setIsTyping(false);
  }, [enabled, roomName, threadId, effectiveRoomType, typingService]);

  /**
   * Handle input change with debouncing
   */
  const handleInputChange = useCallback(
    (value: string) => {
      if (!enabled) return;

      // Clear existing debounce
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      const previousValue = previousValueRef.current;
      previousValueRef.current = value;

      // If empty, stop typing
      if (!value.trim()) {
        stopTyping();
        return;
      }

      // If content changed, debounce start typing
      if (value !== previousValue) {
        debounceTimerRef.current = setTimeout(() => {
          startTyping();
        }, debounceInterval);
      }
    },
    [enabled, debounceInterval, startTyping, stopTyping],
  );

  /**
   * Handle message send (stops typing)
   */
  const handleMessageSend = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    previousValueRef.current = "";
    stopTyping();
  }, [stopTyping]);

  /**
   * Update privacy settings
   */
  const updatePrivacySettings = useCallback(
    (settings: Partial<TypingPrivacySettings>) => {
      typingService.updatePrivacySettings(settings);
    },
    [typingService],
  );

  // ============================================================================
  // Typing Text Formatting
  // ============================================================================

  /**
   * Get formatted typing text
   */
  const typingText = useMemo(() => {
    // Filter out current user
    const otherUsers = typingUsers.filter((u) => u.userId !== user?.id);

    if (otherUsers.length === 0) return null;

    const names = otherUsers.map((u) => u.userName || "Someone");

    if (names.length === 1) {
      return `${names[0]} is typing...`;
    }

    if (names.length === 2) {
      return `${names[0]} and ${names[1]} are typing...`;
    }

    if (names.length === 3) {
      return `${names[0]}, ${names[1]}, and ${names[2]} are typing...`;
    }

    return `${names[0]}, ${names[1]}, and ${names.length - 2} others are typing...`;
  }, [typingUsers, user?.id]);

  // ============================================================================
  // Effects
  // ============================================================================

  /**
   * Subscribe to typing changes for this specific room
   */
  useEffect(() => {
    if (!enabled) return;

    // Use room-specific listener for better performance
    const unsub = typingService.onRoomTypingChange(
      roomName,
      effectiveRoomType,
      (changedRoom, users, changedThread) => {
        // Double-check this is for our room/thread
        if (changedRoom !== roomName) return;
        if (threadId !== changedThread) return;

        setTypingUsers(users);
      },
      threadId,
    );

    return unsub;
  }, [enabled, roomName, threadId, effectiveRoomType, typingService]);

  /**
   * Sync initial typing users
   */
  useEffect(() => {
    if (!enabled || !realtimeClient.isConnected) return;

    const users = typingService.getTypingUsersInRoom(
      roomName,
      effectiveRoomType,
      threadId,
    );
    setTypingUsers(users);
  }, [enabled, roomName, threadId, effectiveRoomType, typingService]);

  /**
   * Stop typing when room changes
   */
  useEffect(() => {
    previousValueRef.current = "";

    return () => {
      // Stop typing when unmounting or changing rooms
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (isTyping) {
        switch (effectiveRoomType) {
          case "dm":
            typingService.stopTypingInDM(roomName);
            break;
          default:
            typingService.stopTyping(roomName, threadId);
        }
      }
    };
  }, [roomName, threadId, effectiveRoomType, isTyping, typingService]);

  /**
   * Stop typing on blur/visibility change
   */
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const handleBlur = () => {
      if (isTyping) {
        stopTyping();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && isTyping) {
        stopTyping();
      }
    };

    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, isTyping, stopTyping]);

  /**
   * Set current user ID on auth change
   */
  useEffect(() => {
    if (user?.id) {
      typingService.setCurrentUserId(user.id);
    }
  }, [user?.id, typingService]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  /**
   * Count of typing users (excluding current user)
   */
  const typingCount = useMemo(() => {
    return typingUsers.filter((u) => u.userId !== user?.id).length;
  }, [typingUsers, user?.id]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    typingUsers,
    isTyping,
    typingText,
    typingCount,
    startTyping,
    stopTyping,
    handleInputChange,
    handleMessageSend,
    updatePrivacySettings,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Props for TypingIndicator component
 */
export interface TypingIndicatorProps {
  roomName: string;
  roomType?: TypingRoomType;
  threadId?: string;
  className?: string;
}

/**
 * Standalone typing indicator hook for display only
 */
export function useTypingIndicatorDisplay(
  roomName: string,
  roomType: TypingRoomType = "channel",
  threadId?: string,
) {
  const { typingUsers, typingText, typingCount } = useRealtimeTyping({
    roomName,
    roomType,
    threadId,
    enabled: true,
  });

  return {
    typingUsers,
    typingText,
    typingCount,
    hasTyping: typingCount > 0,
  };
}

/**
 * Hook for typing in a DM
 */
export function useDMTyping(dmId: string, recipientId?: string) {
  return useRealtimeTyping({
    roomName: dmId,
    roomType: "dm",
    recipientId,
    enabled: true,
  });
}

/**
 * Hook for typing in a thread
 */
export function useThreadTyping(channelId: string, threadId: string) {
  return useRealtimeTyping({
    roomName: channelId,
    roomType: "thread",
    threadId,
    enabled: true,
  });
}

export default useRealtimeTyping;
