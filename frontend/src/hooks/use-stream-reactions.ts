/**
 * Stream Reactions Hook
 *
 * React hook for sending and displaying emoji reactions during live streams
 * with animated bubble effects.
 *
 * @module hooks/use-stream-reactions
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useSocket } from "./use-socket";
import type { StreamReaction } from "@/lib/streaming";

// ============================================================================
// Types
// ============================================================================

export interface UseStreamReactionsOptions {
  streamId: string;
  onNewReaction?: (reaction: StreamReaction) => void;
}

export interface UseStreamReactionsReturn {
  reactions: StreamReaction[];
  recentReactions: StreamReaction[]; // Last 20 for animation
  isSending: boolean;
  error: string | null;
  sendReaction: (
    emoji: string,
    position?: { x: number; y: number },
  ) => Promise<void>;
  clearReactions: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useStreamReactions(
  options: UseStreamReactionsOptions,
): UseStreamReactionsReturn {
  const { streamId, onNewReaction } = options;
  const { user } = useAuth();
  const { isConnected, emit, subscribe } = useSocket();

  const [reactions, setReactions] = useState<StreamReaction[]>([]);
  const [recentReactions, setRecentReactions] = useState<StreamReaction[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==========================================================================
  // Send Reaction
  // ==========================================================================

  const sendReaction = useCallback(
    async (
      emoji: string,
      position?: { x: number; y: number },
    ): Promise<void> => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      setIsSending(true);
      setError(null);

      try {
        const response = await fetch(`/api/streams/${streamId}/reactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emoji,
            positionX: position?.x,
            positionY: position?.y,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to send reaction");
        }

        const reaction: StreamReaction = await response.json();

        // Emit via socket for real-time delivery
        emit("stream:reaction", reaction);
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
  // Clear Reactions
  // ==========================================================================

  const clearReactions = useCallback(() => {
    setReactions([]);
    setRecentReactions([]);
  }, []);

  // ==========================================================================
  // Socket Events
  // ==========================================================================

  useEffect(() => {
    if (!isConnected) return;

    const unsubReaction = subscribe<StreamReaction>(
      "stream:reaction",
      (reaction) => {
        if (reaction.streamId === streamId) {
          // Add to all reactions
          setReactions((prev) => [...prev, reaction]);

          // Add to recent reactions for animation
          setRecentReactions((prev) => {
            const updated = [...prev, reaction];
            // Keep only last 20 for performance
            if (updated.length > 20) {
              return updated.slice(-20);
            }
            return updated;
          });

          onNewReaction?.(reaction);

          // Remove from recent after animation (3 seconds)
          setTimeout(() => {
            setRecentReactions((prev) =>
              prev.filter((r) => r.id !== reaction.id),
            );
          }, 3000);
        }
      },
    );

    return () => {
      unsubReaction();
    };
  }, [isConnected, streamId, subscribe, onNewReaction]);

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    reactions,
    recentReactions,
    isSending,
    error,
    sendReaction,
    clearReactions,
  };
}
