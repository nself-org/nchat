/**
 * ThreadPanel Component
 *
 * Resizable side panel for displaying threads alongside main chat.
 * Provides responsive behavior and seamless integration with ChatWithThreads.
 */

"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { ThreadView } from "./ThreadView";
import { useThreadStore } from "@/stores/thread-store";
import { useMediaQuery } from "@/hooks/use-media-query";

// ============================================================================
// TYPES
// ============================================================================

export interface ThreadPanelProps {
  /** Thread ID to display */
  threadId: string;
  /** Callback when panel is closed */
  onClose?: () => void;
  /** Whether to show in standalone mode (takes full width) */
  standalone?: boolean;
  /** Whether to use compact header */
  compactHeader?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ThreadPanel({
  threadId,
  onClose,
  standalone = false,
  compactHeader = false,
  className,
}: ThreadPanelProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { markThreadAsRead } = useThreadStore();

  // Mark thread as read when opened
  useEffect(() => {
    if (threadId) {
      // Delay to ensure messages are loaded
      const timer = setTimeout(() => {
        markThreadAsRead(threadId);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [threadId, markThreadAsRead]);

  return (
    <div
      className={cn(
        "flex h-full flex-col border-l bg-background",
        standalone && "border-l-0",
        isMobile && "border-l-0",
        className,
      )}
    >
      <ThreadView
        threadId={threadId}
        onClose={onClose}
        standalone={standalone}
        compactHeader={compactHeader}
      />
    </div>
  );
}

// ============================================================================
// THREAD PANEL CONTAINER
// ============================================================================

/**
 * Container component that manages thread panel visibility and state
 */
export function ThreadPanelContainer({ className }: { className?: string }) {
  const { activeThreadId, threadPanelOpen, closeThread } = useThreadStore();

  if (!threadPanelOpen || !activeThreadId) {
    return null;
  }

  return (
    <div className={cn("h-full", className)}>
      <ThreadPanel threadId={activeThreadId} onClose={closeThread} />
    </div>
  );
}
