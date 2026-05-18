"use client";

import * as React from "react";
import { useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { ChatContainer } from "@/components/chat/chat-container";
import { ThreadPanel } from "@/components/thread/thread-panel";
import {
  ThreadSidebar,
  ThreadSidebarTrigger,
} from "@/components/thread/thread-sidebar";
import { useThreadStore } from "@/stores/thread-store";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { Message, TypingUser } from "@/types/message";
import type { Channel } from "@/stores/channel-store";

// ============================================================================
// Types
// ============================================================================

interface ChatWithThreadsProps {
  channel: Channel;
  messages: Message[];
  loading?: boolean;
  hasMore?: boolean;
  typingUsers?: TypingUser[];
  onSendMessage: (content: string, replyToId?: string) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReactToMessage?: (messageId: string, emoji: string) => void;
  onLoadMore?: () => void;
  className?: string;
}

// ============================================================================
// Resize Handle Component
// ============================================================================

function ResizeHandle() {
  return (
    <PanelResizeHandle
      className={cn(
        "relative flex w-1 items-center justify-center bg-transparent",
        "hover:bg-primary/20 active:bg-primary/30",
        "transition-colors duration-150",
        "before:absolute before:inset-y-0 before:-left-1 before:-right-1",
      )}
    >
      <div className="h-8 w-0.5 rounded-full bg-border opacity-0 transition-opacity hover:opacity-100" />
    </PanelResizeHandle>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ChatWithThreads({
  channel,
  messages,
  loading = false,
  hasMore = false,
  typingUsers = [],
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onReactToMessage,
  onLoadMore,
  className,
}: ChatWithThreadsProps) {
  const searchParams = useSearchParams();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(max-width: 1024px)");

  // Thread state
  const [activeThreadId, setActiveThreadId] = useState<string | null>(
    searchParams.get("thread"),
  );
  const [showThreadSidebar, setShowThreadSidebar] = useState(false);

  // Get unread count from store
  const totalUnreadCount = useThreadStore((state) => state.totalUnreadCount);

  // Handle opening a thread
  const handleOpenThread = useCallback((messageId: string) => {
    // In a real app, you'd fetch or create the thread for this message
    // For now, we'll use the messageId as the threadId
    setActiveThreadId(messageId);
    setShowThreadSidebar(false);

    // Update URL without navigation
    const url = new URL(window.location.href);
    url.searchParams.set("thread", messageId);
    window.history.replaceState({}, "", url.toString());
  }, []);

  // Handle closing the thread panel
  const handleCloseThread = useCallback(() => {
    setActiveThreadId(null);

    // Remove thread param from URL
    const url = new URL(window.location.href);
    url.searchParams.delete("thread");
    window.history.replaceState({}, "", url.toString());
  }, []);

  // Handle selecting a thread from the sidebar
  const handleSelectThread = useCallback((threadId: string) => {
    setActiveThreadId(threadId);
    setShowThreadSidebar(false);

    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.set("thread", threadId);
    window.history.replaceState({}, "", url.toString());
  }, []);

  // Mobile layout - show thread as overlay
  if (isMobile) {
    return (
      <div className={cn("relative flex h-full flex-col", className)}>
        <ChatContainer
          channel={channel}
          messages={messages}
          loading={loading}
          hasMore={hasMore}
          typingUsers={typingUsers}
          onSendMessage={onSendMessage}
          onEditMessage={onEditMessage}
          onDeleteMessage={onDeleteMessage}
          onReactToMessage={onReactToMessage}
          onLoadMore={onLoadMore}
          onOpenThread={handleOpenThread}
          className="flex-1"
        />

        {/* Thread Panel Overlay (Mobile) */}
        {activeThreadId && (
          <div className="absolute inset-0 z-50 bg-background">
            <ThreadPanel
              threadId={activeThreadId}
              onClose={handleCloseThread}
              standalone
              compactHeader
            />
          </div>
        )}

        {/* Thread Sidebar Overlay (Mobile) */}
        {showThreadSidebar && (
          <div className="absolute inset-0 z-50 bg-background">
            <ThreadSidebar
              onSelectThread={handleSelectThread}
              selectedThreadId={activeThreadId}
              onClose={() => setShowThreadSidebar(false)}
              showHeader
            />
          </div>
        )}
      </div>
    );
  }

  // Tablet layout - thread panel takes full right side
  if (isTablet) {
    return (
      <div className={cn("flex h-full", className)}>
        <PanelGroup direction="horizontal" autoSaveId="nchat-threads-tablet">
          <Panel defaultSize={activeThreadId ? 60 : 100} minSize={50}>
            <ChatContainer
              channel={channel}
              messages={messages}
              loading={loading}
              hasMore={hasMore}
              typingUsers={typingUsers}
              onSendMessage={onSendMessage}
              onEditMessage={onEditMessage}
              onDeleteMessage={onDeleteMessage}
              onReactToMessage={onReactToMessage}
              onLoadMore={onLoadMore}
              onOpenThread={handleOpenThread}
            />
          </Panel>

          {activeThreadId && (
            <>
              <ResizeHandle />
              <Panel defaultSize={40} minSize={30} maxSize={50}>
                <ThreadPanel
                  threadId={activeThreadId}
                  onClose={handleCloseThread}
                  compactHeader
                />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
    );
  }

  // Desktop layout - full resizable panels
  return (
    <div className={cn("flex h-full", className)}>
      <PanelGroup direction="horizontal" autoSaveId="nchat-threads-desktop">
        {/* Main Chat Panel */}
        <Panel defaultSize={activeThreadId ? 65 : 100} minSize={40}>
          <ChatContainer
            channel={channel}
            messages={messages}
            loading={loading}
            hasMore={hasMore}
            typingUsers={typingUsers}
            onSendMessage={onSendMessage}
            onEditMessage={onEditMessage}
            onDeleteMessage={onDeleteMessage}
            onReactToMessage={onReactToMessage}
            onLoadMore={onLoadMore}
            onOpenThread={handleOpenThread}
          />
        </Panel>

        {/* Thread Panel */}
        {activeThreadId && (
          <>
            <ResizeHandle />
            <Panel defaultSize={35} minSize={25} maxSize={50}>
              <ThreadPanel
                threadId={activeThreadId}
                onClose={handleCloseThread}
              />
            </Panel>
          </>
        )}
      </PanelGroup>

      {/* Thread Sidebar (slide-out) */}
      {showThreadSidebar && (
        <div className="absolute bottom-0 right-0 top-0 z-40 w-80 shadow-xl">
          <ThreadSidebar
            onSelectThread={handleSelectThread}
            selectedThreadId={activeThreadId}
            onClose={() => setShowThreadSidebar(false)}
            showHeader
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Thread Toggle Button (for header)
// ============================================================================

export interface ChatThreadsToggleProps {
  onClick?: () => void;
  className?: string;
}

export function ChatThreadsToggle({
  onClick,
  className,
}: ChatThreadsToggleProps) {
  const totalUnreadCount = useThreadStore((state) => state.totalUnreadCount);

  return (
    <ThreadSidebarTrigger
      onClick={onClick}
      unreadCount={totalUnreadCount}
      className={className}
    />
  );
}

export default ChatWithThreads;
