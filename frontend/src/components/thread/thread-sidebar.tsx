"use client";

import * as React from "react";
import { useState, useCallback, useMemo } from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  MessageSquare,
  Bell,
  BellOff,
  Search,
  Filter,
  X,
  ChevronRight,
  Loader2,
  Inbox,
  CheckCheck,
} from "lucide-react";
import { useUserThreads, type UserThread } from "@/hooks/graphql/use-threads";
import {
  useThreadStore,
  selectTotalUnreadThreadCount,
} from "@/stores/thread-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

type ThreadFilter = "all" | "unread" | "following";

export interface ThreadSidebarProps {
  /** Handler when a thread is selected */
  onSelectThread: (threadId: string) => void;
  /** Currently selected thread ID */
  selectedThreadId?: string | null;
  /** Handler for closing the sidebar */
  onClose?: () => void;
  /** Whether to show the header with close button */
  showHeader?: boolean;
  /** Additional class name */
  className?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getInitials = (name: string): string => {
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const formatRelativeTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: false });
  } catch {
    return "";
  }
};

const truncateContent = (content: string, maxLength: number = 60): string => {
  if (!content) return "";
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength).trim() + "...";
};

// ============================================================================
// THREAD ITEM COMPONENT
// ============================================================================

interface ThreadItemProps {
  thread: UserThread;
  isSelected: boolean;
  onSelect: () => void;
  hasUnread: boolean;
}

function ThreadItem({
  thread,
  isSelected,
  onSelect,
  hasUnread,
}: ThreadItemProps) {
  const threadData = thread.thread;
  if (!threadData) return null;

  const parentMessage = threadData.parent_message;
  const channel = threadData.channel;
  const latestReply = threadData.latest_reply?.[0];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-lg px-3 py-2.5 text-left transition-colors",
        "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isSelected && "bg-muted",
        hasUnread && "bg-primary/5",
      )}
    >
      {/* Header row - Channel name and time */}
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {channel && (
            <span className="truncate text-xs text-muted-foreground">
              #{channel.name}
            </span>
          )}
          {hasUnread && (
            <Badge variant="default" className="h-4 px-1 text-[10px]">
              New
            </Badge>
          )}
        </div>
        {threadData.last_reply_at && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatRelativeTime(threadData.last_reply_at)}
          </span>
        )}
      </div>

      {/* Parent message preview */}
      {parentMessage && (
        <div className="mb-1.5 flex items-start gap-2">
          <Avatar className="h-5 w-5 shrink-0">
            <AvatarImage
              src={parentMessage.user?.avatar_url}
              alt={
                parentMessage.user?.display_name || parentMessage.user?.username
              }
            />
            <AvatarFallback className="text-[8px]">
              {getInitials(
                parentMessage.user?.display_name ||
                  parentMessage.user?.username ||
                  "?",
              )}
            </AvatarFallback>
          </Avatar>
          <p className="line-clamp-1 text-sm font-medium">
            {truncateContent(parentMessage.content)}
          </p>
        </div>
      )}

      {/* Latest reply and stats */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MessageSquare className="h-3 w-3" />
          <span>
            {threadData.message_count}{" "}
            {threadData.message_count === 1 ? "reply" : "replies"}
          </span>
        </div>

        {latestReply && (
          <span className="max-w-[120px] truncate text-xs text-muted-foreground">
            {latestReply.user?.display_name || latestReply.user?.username}:{" "}
            {truncateContent(latestReply.content, 30)}
          </span>
        )}
      </div>
    </button>
  );
}

// ============================================================================
// THREAD ITEM SKELETON
// ============================================================================

function ThreadItemSkeleton() {
  return (
    <div className="space-y-2 px-3 py-2.5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-12" />
      </div>
      <div className="flex items-start gap-2">
        <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
        <Skeleton className="h-4 w-full" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================

interface EmptyStateProps {
  filter: ThreadFilter;
}

function EmptyState({ filter }: EmptyStateProps) {
  const messages = {
    all: {
      icon: Inbox,
      title: "No threads yet",
      description: "Start a thread by replying to any message.",
    },
    unread: {
      icon: CheckCheck,
      title: "All caught up",
      description: "You have no unread thread replies.",
    },
    following: {
      icon: Bell,
      title: "Not following any threads",
      description: "Follow threads to receive notifications about new replies.",
    },
  };

  const { icon: Icon, title, description } = messages[filter];

  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mb-1 text-sm font-medium">{title}</h3>
      <p className="max-w-[200px] text-xs text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ThreadSidebar({
  onSelectThread,
  selectedThreadId,
  onClose,
  showHeader = true,
  className,
}: ThreadSidebarProps) {
  const [activeFilter, setActiveFilter] = useState<ThreadFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Fetch user threads
  const { threads, unreadCount, loading, error, refetch } = useUserThreads();

  // Get unread count from store
  const totalUnreadCount = useThreadStore(selectTotalUnreadThreadCount);
  const { markAllThreadsAsRead } = useThreadStore();

  // Filter threads based on active filter and search
  const filteredThreads = useMemo(() => {
    let result = threads;

    // Apply filter
    if (activeFilter === "unread") {
      result = result.filter((t) => t.has_unread);
    } else if (activeFilter === "following") {
      // In a real implementation, you'd check if the user explicitly followed the thread
      // For now, we consider all threads where the user participated as "following"
      result = result;
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((t) => {
        const parentContent =
          t.thread?.parent_message?.content?.toLowerCase() || "";
        const channelName = t.thread?.channel?.name?.toLowerCase() || "";
        return parentContent.includes(query) || channelName.includes(query);
      });
    }

    return result;
  }, [threads, activeFilter, searchQuery]);

  // Handle thread selection
  const handleSelectThread = useCallback(
    (threadId: string) => {
      onSelectThread(threadId);
    },
    [onSelectThread],
  );

  // Handle mark all as read
  const handleMarkAllRead = useCallback(() => {
    markAllThreadsAsRead();
  }, [markAllThreadsAsRead]);

  // Check if a thread has unread messages
  const hasUnreadMessages = (thread: UserThread): boolean => {
    return thread.has_unread || false;
  };

  return (
    <TooltipProvider>
      <div
        className={cn("flex h-full flex-col border-r bg-background", className)}
      >
        {/* Header */}
        {showHeader && (
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">Threads</h2>
              {(unreadCount > 0 || totalUnreadCount > 0) && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {unreadCount || totalUnreadCount}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* Search toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowSearch(!showSearch)}
                  >
                    <Search className="h-4 w-4" />
                    <span className="sr-only">Search threads</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Search threads</TooltipContent>
              </Tooltip>

              {/* More options */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Filter className="h-4 w-4" />
                    <span className="sr-only">Filter options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleMarkAllRead}>
                    <CheckCheck className="mr-2 h-4 w-4" />
                    Mark all as read
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => refetch()}>
                    Refresh
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Close button */}
              {onClose && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={onClose}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Close</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Close</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        )}

        {/* Search bar (collapsible) */}
        {showSearch && (
          <div className="border-b px-3 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search threads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-sm"
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <Tabs
          value={activeFilter}
          onValueChange={(v) => setActiveFilter(v as ThreadFilter)}
          className="w-full"
        >
          <div className="border-b px-2">
            <TabsList className="h-9 w-full bg-transparent p-0.5">
              <TabsTrigger
                value="all"
                className="h-7 flex-1 text-xs data-[state=active]:bg-muted"
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value="unread"
                className="h-7 flex-1 text-xs data-[state=active]:bg-muted"
              >
                Unread
                {unreadCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 h-4 px-1 text-[10px]"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="following"
                className="h-7 flex-1 text-xs data-[state=active]:bg-muted"
              >
                Following
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Thread list */}
          <ScrollArea className="flex-1">
            <div className="space-y-1 p-2">
              {/* Loading state */}
              {loading && threads.length === 0 && (
                <>
                  <ThreadItemSkeleton />
                  <ThreadItemSkeleton />
                  <ThreadItemSkeleton />
                </>
              )}

              {/* Error state */}
              {error && !loading && (
                <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
                  <p className="mb-2 text-sm text-destructive">
                    Failed to load threads
                  </p>
                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    Try again
                  </Button>
                </div>
              )}

              {/* Empty state */}
              {!loading && !error && filteredThreads.length === 0 && (
                <EmptyState filter={activeFilter} />
              )}

              {/* Thread items */}
              {!loading &&
                !error &&
                filteredThreads.map((thread) => (
                  <ThreadItem
                    key={thread.thread?.id}
                    thread={thread}
                    isSelected={selectedThreadId === thread.thread?.id}
                    onSelect={() => handleSelectThread(thread.thread!.id)}
                    hasUnread={hasUnreadMessages(thread)}
                  />
                ))}
            </div>
          </ScrollArea>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

// ============================================================================
// THREAD SIDEBAR TRIGGER (for opening from header/sidebar)
// ============================================================================

export interface ThreadSidebarTriggerProps {
  onClick?: () => void;
  unreadCount?: number;
  className?: string;
}

export function ThreadSidebarTrigger({
  onClick,
  unreadCount,
  className,
}: ThreadSidebarTriggerProps) {
  const totalUnreadCount = useThreadStore(selectTotalUnreadThreadCount);
  const displayCount = unreadCount ?? totalUnreadCount;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("relative", className)}
            onClick={onClick}
          >
            <MessageSquare className="h-5 w-5" />
            {displayCount > 0 && (
              <span className="text-primary-foreground absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium">
                {displayCount > 99 ? "99+" : displayCount}
              </span>
            )}
            <span className="sr-only">
              Threads {displayCount > 0 ? `(${displayCount} unread)` : ""}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Threads {displayCount > 0 ? `(${displayCount} unread)` : ""}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default ThreadSidebar;
