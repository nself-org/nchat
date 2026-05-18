"use client";

import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { GripVertical, Users } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useThread, type UseThreadOptions } from "@/hooks/use-thread";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ThreadHeader, ThreadHeaderCompact } from "./thread-header";
import { ThreadMessageList } from "./thread-message-list";
import { ThreadReplyInput, type Mention } from "./thread-reply-input";
import { ThreadParticipantList } from "./thread-participants";

// ============================================================================
// TYPES
// ============================================================================

export interface ThreadPanelProps {
  /** The thread ID to display */
  threadId: string;
  /** Handler for closing the panel */
  onClose: () => void;
  /** Whether to use compact header */
  compactHeader?: boolean;
  /** Default panel width percentage (0-100) */
  defaultWidth?: number;
  /** Minimum panel width percentage */
  minWidth?: number;
  /** Maximum panel width percentage */
  maxWidth?: number;
  /** Handler for mention search */
  onMentionSearch?: (query: string) => Promise<Mention[]>;
  /** Additional class name for the panel */
  className?: string;
  /** Position of the panel */
  position?: "right" | "left";
  /** Whether to show as a standalone panel (not in a resizable group) */
  standalone?: boolean;
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function ThreadPanelSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Header skeleton */}
      <div className="space-y-3 border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </div>

      {/* Messages skeleton */}
      <div className="flex-1 space-y-4 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>

      {/* Input skeleton */}
      <div className="border-t p-3">
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </div>
  );
}

// ============================================================================
// RESIZE HANDLE
// ============================================================================

function ResizeHandle({ className }: { className?: string }) {
  return (
    <PanelResizeHandle
      className={cn(
        "bg-border/50 hover:bg-primary/20 group relative w-1.5 transition-all duration-150 hover:w-2",
        "flex items-center justify-center",
        className,
      )}
    >
      <div className="absolute inset-y-0 -left-1 -right-1 z-10" />
      <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </PanelResizeHandle>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ThreadPanel({
  threadId,
  onClose,
  compactHeader = false,
  defaultWidth = 35,
  minWidth = 25,
  maxWidth = 50,
  onMentionSearch,
  className,
  position = "right",
  standalone = false,
}: ThreadPanelProps) {
  const { user } = useAuth();
  const [showParticipants, setShowParticipants] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Use thread hook
  const {
    thread,
    parentMessage,
    messages,
    participants,
    loading,
    loadingMessages,
    hasMore,
    error,
    sendReply,
    loadMore,
    markAsRead,
    joinThread,
    leaveThread,
    toggleNotifications,
    isParticipant,
    hasUnread,
  } = useThread({ threadId, autoSubscribe: true });

  // Update notifications state when participant data loads
  useEffect(() => {
    if (user && participants.length > 0) {
      const userParticipation = participants.find((p) => p.user_id === user.id);
      if (userParticipation) {
        setNotificationsEnabled(userParticipation.notifications_enabled);
      }
    }
  }, [participants, user]);

  // Handle notification toggle
  const handleToggleNotifications = useCallback(
    async (enabled: boolean) => {
      setNotificationsEnabled(enabled);
      await toggleNotifications(enabled);
    },
    [toggleNotifications],
  );

  // Handle send reply
  const handleSendReply = useCallback(
    async (content: string, attachments?: File[]) => {
      await sendReply(content, attachments);
    },
    [sendReply],
  );

  // Panel content
  const panelContent = (
    <div
      className={cn(
        "flex h-full flex-col border-l bg-background",
        position === "left" && "border-l-0 border-r",
        className,
      )}
    >
      {/* Loading state */}
      {loading && !thread && <ThreadPanelSkeleton />}

      {/* Error state */}
      {error && !loading && (
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <p className="mb-4 text-sm text-destructive">Failed to load thread</p>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      )}

      {/* Thread content */}
      {thread && !loading && (
        <>
          {/* Header */}
          {compactHeader ? (
            <ThreadHeaderCompact
              replyCount={thread.message_count}
              participantCount={participants.length}
              onClose={onClose}
            />
          ) : (
            <ThreadHeader
              thread={thread}
              parentMessage={parentMessage}
              participants={participants}
              replyCount={thread.message_count}
              isParticipant={isParticipant}
              notificationsEnabled={notificationsEnabled}
              onClose={onClose}
              onJoin={joinThread}
              onLeave={leaveThread}
              onToggleNotifications={handleToggleNotifications}
              onViewParticipants={() => setShowParticipants(true)}
            />
          )}

          {/* Messages */}
          <ThreadMessageList
            messages={messages}
            loading={loadingMessages}
            loadingMore={false}
            hasMore={hasMore}
            currentUserId={user?.id}
            onLoadMore={loadMore}
            className="flex-1"
          />

          {/* Reply input */}
          <ThreadReplyInput
            onSend={handleSendReply}
            onMentionSearch={onMentionSearch}
            sending={loadingMessages}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
        </>
      )}

      {/* Participants dialog */}
      <Dialog open={showParticipants} onOpenChange={setShowParticipants}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Thread Participants ({participants.length})
            </DialogTitle>
          </DialogHeader>
          <ThreadParticipantList participants={participants} />
        </DialogContent>
      </Dialog>
    </div>
  );

  // Standalone mode (no resize)
  if (standalone) {
    return panelContent;
  }

  // Resizable panel mode
  return (
    <Panel
      defaultSize={defaultWidth}
      minSize={minWidth}
      maxSize={maxWidth}
      order={position === "right" ? 2 : 0}
    >
      {panelContent}
    </Panel>
  );
}

// ============================================================================
// PANEL WITH MAIN CONTENT (Wrapper for chat + thread layout)
// ============================================================================

export interface ThreadPanelLayoutProps {
  /** Main content (chat messages) */
  children: React.ReactNode;
  /** Thread ID to display (null if no thread is open) */
  threadId: string | null;
  /** Handler for closing the thread */
  onCloseThread: () => void;
  /** Handler for mention search */
  onMentionSearch?: (query: string) => Promise<Mention[]>;
  /** Default thread panel width percentage */
  defaultThreadWidth?: number;
  /** Additional class name */
  className?: string;
}

export function ThreadPanelLayout({
  children,
  threadId,
  onCloseThread,
  onMentionSearch,
  defaultThreadWidth = 35,
  className,
}: ThreadPanelLayoutProps) {
  return (
    <PanelGroup
      direction="horizontal"
      className={cn("h-full", className)}
      autoSaveId="nchat-thread-panel"
    >
      {/* Main content panel */}
      <Panel
        defaultSize={threadId ? 100 - defaultThreadWidth : 100}
        minSize={50}
      >
        {children}
      </Panel>

      {/* Thread panel (conditionally rendered) */}
      {threadId && (
        <>
          <ResizeHandle />
          <ThreadPanel
            threadId={threadId}
            onClose={onCloseThread}
            onMentionSearch={onMentionSearch}
            defaultWidth={defaultThreadWidth}
          />
        </>
      )}
    </PanelGroup>
  );
}

// ============================================================================
// SLIDE-IN PANEL (Alternative layout for mobile/overlay)
// ============================================================================

export interface ThreadSlideInPanelProps {
  /** Whether the panel is open */
  open: boolean;
  /** Thread ID to display */
  threadId: string | null;
  /** Handler for closing the panel */
  onClose: () => void;
  /** Handler for mention search */
  onMentionSearch?: (query: string) => Promise<Mention[]>;
  /** Additional class name */
  className?: string;
}

export function ThreadSlideInPanel({
  open,
  threadId,
  onClose,
  onMentionSearch,
  className,
}: ThreadSlideInPanelProps) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open || !threadId) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50",
          "w-full max-w-md",
          "transform transition-transform duration-300 ease-out",
          "shadow-2xl",
          open ? "translate-x-0" : "translate-x-full",
          className,
        )}
      >
        <ThreadPanel
          threadId={threadId}
          onClose={onClose}
          onMentionSearch={onMentionSearch}
          standalone
          compactHeader
        />
      </div>
    </>
  );
}

export default ThreadPanel;
