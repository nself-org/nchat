"use client";

/**
 * Scheduled Messages List Component
 *
 * Displays a list of all pending scheduled messages,
 * grouped by channel with edit, cancel, and send now options.
 *
 * @example
 * ```tsx
 * <ScheduledMessagesList
 *   userId="user-123"
 *   onEdit={handleEdit}
 *   onCancel={handleCancel}
 *   onSendNow={handleSendNow}
 * />
 * ```
 */

import { useMemo, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CalendarClock,
  Search,
  ChevronDown,
  ChevronRight,
  Hash,
  Lock,
  Calendar,
  Inbox,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScheduledMessageItem } from "./scheduled-message-item";
import { useScheduled } from "@/lib/scheduled/use-scheduled";
import type { ScheduledMessage } from "@/graphql/scheduled";

// ============================================================================
// Types
// ============================================================================

interface ScheduledMessagesListProps {
  userId: string;
  channelId?: string;
  onEdit?: (message: ScheduledMessage) => void;
  onScheduleNew?: () => void;
  maxHeight?: string | number;
  showHeader?: boolean;
  showSearch?: boolean;
  showGrouping?: boolean;
  className?: string;
}

type GroupBy = "channel" | "date" | "none";
type SortBy = "time-asc" | "time-desc" | "channel";

interface GroupedMessages {
  key: string;
  label: string;
  icon?: React.ReactNode;
  messages: ScheduledMessage[];
  isPrivate?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

function groupMessagesByChannel(
  messages: ScheduledMessage[],
): GroupedMessages[] {
  const groups: Record<string, GroupedMessages> = {};

  for (const message of messages) {
    const channelId = message.channel_id;
    const channelName = message.channel?.name || "Unknown";
    const isPrivate = message.channel?.is_private || false;

    if (!groups[channelId]) {
      groups[channelId] = {
        key: channelId,
        label: channelName,
        icon: isPrivate ? (
          <Lock className="h-4 w-4" />
        ) : (
          <Hash className="h-4 w-4" />
        ),
        messages: [],
        isPrivate,
      };
    }

    groups[channelId].messages.push(message);
  }

  return Object.values(groups).sort((a, b) => a.label.localeCompare(b.label));
}

function groupMessagesByDate(messages: ScheduledMessage[]): GroupedMessages[] {
  const groups: Record<string, GroupedMessages> = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  for (const message of messages) {
    const scheduledDate = new Date(message.scheduled_at);
    scheduledDate.setHours(0, 0, 0, 0);

    let key: string;
    let label: string;

    if (scheduledDate.getTime() === today.getTime()) {
      key = "today";
      label = "Today";
    } else if (scheduledDate.getTime() === tomorrow.getTime()) {
      key = "tomorrow";
      label = "Tomorrow";
    } else if (scheduledDate < nextWeek) {
      key = "this-week";
      label = "This Week";
    } else {
      key = "later";
      label = "Later";
    }

    if (!groups[key]) {
      groups[key] = {
        key,
        label,
        icon: <Calendar className="h-4 w-4" />,
        messages: [],
      };
    }

    groups[key].messages.push(message);
  }

  // Sort groups in order: today, tomorrow, this week, later
  const order = ["today", "tomorrow", "this-week", "later"];
  return order.filter((key) => groups[key]).map((key) => groups[key]);
}

function filterMessages(
  messages: ScheduledMessage[],
  searchQuery: string,
): ScheduledMessage[] {
  if (!searchQuery.trim()) return messages;

  const query = searchQuery.toLowerCase();
  return messages.filter(
    (msg) =>
      msg.content.toLowerCase().includes(query) ||
      msg.channel?.name?.toLowerCase().includes(query),
  );
}

function sortMessages(
  messages: ScheduledMessage[],
  sortBy: SortBy,
): ScheduledMessage[] {
  const sorted = [...messages];

  switch (sortBy) {
    case "time-asc":
      return sorted.sort(
        (a, b) =>
          new Date(a.scheduled_at).getTime() -
          new Date(b.scheduled_at).getTime(),
      );
    case "time-desc":
      return sorted.sort(
        (a, b) =>
          new Date(b.scheduled_at).getTime() -
          new Date(a.scheduled_at).getTime(),
      );
    case "channel":
      return sorted.sort((a, b) =>
        (a.channel?.name || "").localeCompare(b.channel?.name || ""),
      );
    default:
      return sorted;
  }
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function ScheduledMessagesListSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-24 w-full" />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function ScheduledMessagesEmpty({
  onScheduleNew,
}: {
  onScheduleNew?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Inbox className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mb-2 text-lg font-medium">No scheduled messages</h3>
      <p className="mb-4 max-w-sm text-sm text-muted-foreground">
        You don&apos;t have any messages scheduled to be sent. Schedule a
        message to send it at a specific time.
      </p>
      {onScheduleNew && (
        <Button onClick={onScheduleNew}>
          <CalendarClock className="mr-2 h-4 w-4" />
          Schedule a message
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// Group Component
// ============================================================================

interface MessageGroupProps {
  group: GroupedMessages;
  onEdit?: (message: ScheduledMessage) => void;
  onCancel?: (id: string) => Promise<void>;
  onSendNow?: (id: string) => Promise<void>;
  processingIds: Set<string>;
  defaultExpanded?: boolean;
}

function MessageGroup({
  group,
  onEdit,
  onCancel,
  onSendNow,
  processingIds,
  defaultExpanded = true,
}: MessageGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "flex w-full items-center gap-2 rounded-lg p-2",
            "text-left transition-colors hover:bg-accent",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          )}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          {group.icon}
          <span className="text-sm font-medium">{group.label}</span>
          <Badge variant="secondary" className="ml-auto">
            {group.messages.length}
          </Badge>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-3 pl-6 pt-2">
          {group.messages.map((message) => (
            <ScheduledMessageItem
              key={message.id}
              message={message}
              onEdit={onEdit}
              onCancel={onCancel}
              onSendNow={onSendNow}
              isCancelling={processingIds.has(`cancel-${message.id}`)}
              isSending={processingIds.has(`send-${message.id}`)}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ScheduledMessagesList({
  userId,
  channelId,
  onEdit,
  onScheduleNew,
  maxHeight = "100%",
  showHeader = true,
  showSearch = true,
  showGrouping = true,
  className,
}: ScheduledMessagesListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("channel");
  const [sortBy, setSortBy] = useState<SortBy>("time-asc");
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const {
    messages,
    isLoading,
    error,
    cancelScheduledMessage,
    sendNow,
    fetchScheduledMessages,
    isFeatureEnabled,
  } = useScheduled({ userId, channelId, autoFetch: true });

  // Filter and sort messages
  const processedMessages = useMemo(() => {
    let result = messages.filter((msg) => msg.status === "pending");
    result = filterMessages(result, searchQuery);
    result = sortMessages(result, sortBy);
    return result;
  }, [messages, searchQuery, sortBy]);

  // Group messages
  const groupedMessages = useMemo(() => {
    if (groupBy === "none") {
      return null;
    }
    if (groupBy === "channel") {
      return groupMessagesByChannel(processedMessages);
    }
    return groupMessagesByDate(processedMessages);
  }, [processedMessages, groupBy]);

  // Handlers
  const handleCancel = useCallback(
    async (id: string) => {
      setProcessingIds((prev) => new Set(prev).add(`cancel-${id}`));
      try {
        await cancelScheduledMessage(id);
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(`cancel-${id}`);
          return next;
        });
      }
    },
    [cancelScheduledMessage],
  );

  const handleSendNow = useCallback(
    async (id: string) => {
      setProcessingIds((prev) => new Set(prev).add(`send-${id}`));
      try {
        await sendNow(id);
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(`send-${id}`);
          return next;
        });
      }
    },
    [sendNow],
  );

  // Feature not enabled
  if (!isFeatureEnabled) {
    return (
      <div className={cn("p-4 text-center text-muted-foreground", className)}>
        Scheduled messages are not enabled.
      </div>
    );
  }

  // Loading state
  if (isLoading && messages.length === 0) {
    return (
      <div className={className}>
        <ScheduledMessagesListSkeleton />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn("p-4", className)}>
        <div className="text-center text-destructive">
          <p className="text-sm">Failed to load scheduled messages</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchScheduledMessages}
            className="mt-4"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold">Scheduled Messages</h2>
            {processedMessages.length > 0 && (
              <Badge variant="secondary">{processedMessages.length}</Badge>
            )}
          </div>
          {onScheduleNew && (
            <Button size="sm" onClick={onScheduleNew}>
              Schedule new
            </Button>
          )}
        </div>
      )}

      {/* Search and Filters */}
      {(showSearch || showGrouping) && processedMessages.length > 0 && (
        <div className="flex flex-col gap-2 border-b p-4 sm:flex-row">
          {showSearch && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search scheduled messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
          {showGrouping && (
            <div className="flex gap-2">
              <Select
                value={groupBy}
                onValueChange={(v) => setGroupBy(v as GroupBy)}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Group by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="channel">By Channel</SelectItem>
                  <SelectItem value="date">By Date</SelectItem>
                  <SelectItem value="none">No Grouping</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={sortBy}
                onValueChange={(v) => setSortBy(v as SortBy)}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="time-asc">Earliest first</SelectItem>
                  <SelectItem value="time-desc">Latest first</SelectItem>
                  <SelectItem value="channel">By channel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Message List */}
      <ScrollArea style={{ maxHeight }} className="flex-1">
        <div className="p-4">
          {processedMessages.length === 0 ? (
            <ScheduledMessagesEmpty onScheduleNew={onScheduleNew} />
          ) : groupedMessages ? (
            <div className="space-y-4">
              {groupedMessages.map((group) => (
                <MessageGroup
                  key={group.key}
                  group={group}
                  onEdit={onEdit}
                  onCancel={handleCancel}
                  onSendNow={handleSendNow}
                  processingIds={processingIds}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {processedMessages.map((message) => (
                <ScheduledMessageItem
                  key={message.id}
                  message={message}
                  onEdit={onEdit}
                  onCancel={handleCancel}
                  onSendNow={handleSendNow}
                  isCancelling={processingIds.has(`cancel-${message.id}`)}
                  isSending={processingIds.has(`send-${message.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default ScheduledMessagesList;
