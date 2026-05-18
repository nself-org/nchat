/**
 * Stream Chat Hook
 *
 * React hook for managing live chat during streams including sending
 * messages, pinning, and moderation.
 *
 * @module hooks/use-stream-chat
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useSocket } from "./use-socket";
import type { StreamChatMessage } from "@/lib/streaming";

// ============================================================================
// Types
// ============================================================================

export interface UseStreamChatOptions {
  streamId: string;
  maxMessages?: number;
  onNewMessage?: (message: StreamChatMessage) => void;
}

export interface UseStreamChatReturn {
  messages: StreamChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  pinMessage: (messageId: string) => Promise<void>;
  unpinMessage: (messageId: string) => Promise<void>;
  clear: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useStreamChat(
  options: UseStreamChatOptions,
): UseStreamChatReturn {
  const { streamId, maxMessages = 100, onNewMessage } = options;
  const { user } = useAuth();
  const { isConnected, emit, subscribe } = useSocket();

  const [messages, setMessages] = useState<StreamChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==========================================================================
  // Load Messages
  // ==========================================================================

  const loadMessages = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/streams/${streamId}/chat`);
      if (!response.ok) {
        throw new Error("Failed to load chat messages");
      }

      const data: StreamChatMessage[] = await response.json();
      setMessages(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [streamId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // ==========================================================================
  // Send Message
  // ==========================================================================

  const sendMessage = useCallback(
    async (content: string): Promise<void> => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      if (!content.trim()) {
        throw new Error("Message cannot be empty");
      }

      if (content.length > 500) {
        throw new Error("Message too long (max 500 characters)");
      }

      setIsSending(true);
      setError(null);

      try {
        const response = await fetch(`/api/streams/${streamId}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        const message: StreamChatMessage = await response.json();

        // Emit via socket for real-time delivery
        emit("stream:chat-message", message);
      } catch (err) {
        setError((err as Error).message);
        throw err;
      } finally {
        setIsSending(false);
      }
    },
    [streamId, user, emit],
  );

  // ==========================================================================
  // Moderation
  // ==========================================================================

  const deleteMessage = useCallback(
    async (messageId: string): Promise<void> => {
      try {
        const response = await fetch(
          `/api/streams/${streamId}/chat/${messageId}`,
          {
            method: "DELETE",
          },
        );

        if (!response.ok) {
          throw new Error("Failed to delete message");
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, isDeleted: true } : msg,
          ),
        );
      } catch (err) {
        setError((err as Error).message);
        throw err;
      }
    },
    [streamId],
  );

  const pinMessage = useCallback(
    async (messageId: string): Promise<void> => {
      try {
        const response = await fetch(
          `/api/streams/${streamId}/chat/${messageId}/pin`,
          {
            method: "POST",
          },
        );

        if (!response.ok) {
          throw new Error("Failed to pin message");
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, isPinned: true } : msg,
          ),
        );

        emit("stream:chat-pinned", { messageId });
      } catch (err) {
        setError((err as Error).message);
        throw err;
      }
    },
    [streamId, emit],
  );

  const unpinMessage = useCallback(
    async (messageId: string): Promise<void> => {
      try {
        const response = await fetch(
          `/api/streams/${streamId}/chat/${messageId}/pin`,
          {
            method: "DELETE",
          },
        );

        if (!response.ok) {
          throw new Error("Failed to unpin message");
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, isPinned: false } : msg,
          ),
        );
      } catch (err) {
        setError((err as Error).message);
        throw err;
      }
    },
    [streamId],
  );

  const clear = useCallback(() => {
    setMessages([]);
  }, []);

  // ==========================================================================
  // Socket Events
  // ==========================================================================

  useEffect(() => {
    if (!isConnected) return;

    const unsubMessage = subscribe<StreamChatMessage>(
      "stream:chat-message",
      (message) => {
        if (message.streamId === streamId) {
          setMessages((prev) => {
            const updated = [...prev, message];
            // Keep only last maxMessages
            if (updated.length > maxMessages) {
              return updated.slice(-maxMessages);
            }
            return updated;
          });

          onNewMessage?.(message);
        }
      },
    );

    const unsubDeleted = subscribe<{ messageId: string }>(
      "stream:chat-deleted",
      (data) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === data.messageId ? { ...msg, isDeleted: true } : msg,
          ),
        );
      },
    );

    const unsubPinned = subscribe<{ messageId: string }>(
      "stream:chat-pinned",
      (data) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === data.messageId ? { ...msg, isPinned: true } : msg,
          ),
        );
      },
    );

    return () => {
      unsubMessage();
      unsubDeleted();
      unsubPinned();
    };
  }, [isConnected, streamId, maxMessages, subscribe, onNewMessage]);

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    messages,
    isLoading,
    isSending,
    error,
    sendMessage,
    deleteMessage,
    pinMessage,
    unpinMessage,
    clear,
  };
}
