/**
 * NotificationList Component
 *
 * Displays a scrollable list of notifications with filtering and actions.
 */

"use client";

import React, { useCallback, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Filter,
  MessageSquare,
  AtSign,
  Reply,
  Heart,
  Users,
  Settings,
  Megaphone,
  Trash2,
  Archive,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotifications } from "@/hooks/use-notifications";
import {
  useNotificationStore,
  type Notification,
  type NotificationType,
} from "@/stores/notification-store";

// =============================================================================
// Types
// =============================================================================

export interface NotificationListProps {
  /**
   * Additional class name
   */
  className?: string;

  /**
   * Maximum height of the list
   */
  maxHeight?: string;

  /**
   * Whether to show header with filter tabs
   */
  showHeader?: boolean;

  /**
   * Whether to show empty state
   */
  showEmptyState?: boolean;

  /**
   * Whether to show action menu on each item
   */
  showActions?: boolean;

  /**
   * Callback when a notification is clicked
   */
  onNotificationClick?: (notification: Notification) => void;

  /**
   * Maximum number of notifications to show
   */
  limit?: number;
}

// =============================================================================
// Icon Map
// =============================================================================

const notificationIcons: Record<NotificationType, React.ElementType> = {
  mention: AtSign,
  direct_message: MessageSquare,
  thread_reply: Reply,
  reaction: Heart,
  channel_invite: Users,
  channel_update: Settings,
  system: Bell,
  announcement: Megaphone,
};

// =============================================================================
// Notification Item Component
// =============================================================================

interface NotificationItemProps {
  notification: Notification;
  showActions?: boolean;
  onNotificationClick?: (notification: Notification) => void;
}

function NotificationItem({
  notification,
  showActions = true,
  onNotificationClick,
}: NotificationItemProps) {
  const { markAsRead, dismissNotification } = useNotifications();
  const archiveNotification = useNotificationStore(
    (state) => state.archiveNotification,
  );

  const Icon = notificationIcons[notification.type] || Bell;

  const handleClick = useCallback(() => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    onNotificationClick?.(notification);

    // Navigate if action URL exists
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  }, [notification, markAsRead, onNotificationClick]);

  const handleMarkAsRead = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      markAsRead(notification.id);
    },
    [notification.id, markAsRead],
  );

  const handleArchive = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      archiveNotification(notification.id);
    },
    [notification.id, archiveNotification],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      dismissNotification(notification.id);
    },
    [notification.id, dismissNotification],
  );

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
  });

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      className={cn(
        "hover:bg-muted/50 flex cursor-pointer items-start gap-3 p-3 transition-colors",
        "border-b border-border last:border-b-0",
        !notification.isRead && "bg-muted/30",
      )}
    >
      {/* Avatar or Icon */}
      {notification.actor ? (
        <Avatar className="h-9 w-9 flex-shrink-0">
          <AvatarImage
            src={notification.actor.avatarUrl}
            alt={notification.actor.name}
          />
          <AvatarFallback>
            {notification.actor.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "line-clamp-1 text-sm",
              !notification.isRead && "font-medium",
            )}
          >
            {notification.title}
          </p>
          {!notification.isRead && (
            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
          {notification.body}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
          {notification.channelName && (
            <>
              <span className="text-xs text-muted-foreground">in</span>
              <span className="text-xs font-medium text-muted-foreground">
                #{notification.channelName}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      {showActions && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0 opacity-0 focus:opacity-100 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">More options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!notification.isRead && (
              <DropdownMenuItem onClick={handleMarkAsRead}>
                <Check className="mr-2 h-4 w-4" />
                Mark as read
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleArchive}>
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

// =============================================================================
// Empty State Component
// =============================================================================

function EmptyState({ filter }: { filter: string }) {
  const messages: Record<string, { icon: React.ElementType; message: string }> =
    {
      all: { icon: Bell, message: "No notifications yet" },
      mentions: { icon: AtSign, message: "No mentions" },
      threads: { icon: Reply, message: "No thread replies" },
      reactions: { icon: Heart, message: "No reactions" },
      unread: { icon: CheckCheck, message: "All caught up!" },
    };

  const { icon: Icon, message } = messages[filter] || messages.all;

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function NotificationList({
  className,
  maxHeight = "400px",
  showHeader = true,
  showEmptyState = true,
  showActions = true,
  onNotificationClick,
  limit,
}: NotificationListProps) {
  const [filter, setFilter] = useState<
    "all" | "mentions" | "threads" | "reactions" | "unread"
  >("all");

  const { notifications, markAllAsRead, clearAll } = useNotifications();
  const setActiveFilter = useNotificationStore(
    (state) => state.setActiveFilter,
  );
  const getFilteredNotifications = useNotificationStore(
    (state) => state.getFilteredNotifications,
  );

  // Apply filter
  const handleFilterChange = useCallback(
    (newFilter: typeof filter) => {
      setFilter(newFilter);
      setActiveFilter(newFilter);
    },
    [setActiveFilter],
  );

  // Get filtered notifications
  const filteredNotifications = useMemo(() => {
    let result = getFilteredNotifications();
    if (limit && limit > 0) {
      result = result.slice(0, limit);
    }
    return result;
  }, [getFilteredNotifications, limit]);

  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header */}
      {showHeader && (
        <div className="flex flex-col border-b border-border">
          <div className="flex items-center justify-between p-3">
            <h3 className="font-semibold">Notifications</h3>
            <div className="flex items-center gap-1">
              {hasUnread && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-8 text-xs"
                >
                  <CheckCheck className="mr-1 h-3 w-3" />
                  Mark all read
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={markAllAsRead}
                    disabled={!hasUnread}
                  >
                    <CheckCheck className="mr-2 h-4 w-4" />
                    Mark all as read
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={clearAll}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear all
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Filter Tabs */}
          <Tabs
            value={filter}
            onValueChange={(v) => handleFilterChange(v as typeof filter)}
            className="px-3 pb-2"
          >
            <TabsList className="grid h-8 w-full grid-cols-5">
              <TabsTrigger value="all" className="text-xs">
                All
              </TabsTrigger>
              <TabsTrigger value="mentions" className="text-xs">
                Mentions
              </TabsTrigger>
              <TabsTrigger value="threads" className="text-xs">
                Threads
              </TabsTrigger>
              <TabsTrigger value="reactions" className="text-xs">
                Reactions
              </TabsTrigger>
              <TabsTrigger value="unread" className="text-xs">
                Unread
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Notification List */}
      <ScrollArea style={{ maxHeight }}>
        <div className="divide-y divide-border">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <div key={notification.id} className="group">
                <NotificationItem
                  notification={notification}
                  showActions={showActions}
                  onNotificationClick={onNotificationClick}
                />
              </div>
            ))
          ) : showEmptyState ? (
            <EmptyState filter={filter} />
          ) : null}
        </div>
      </ScrollArea>

      {/* Footer */}
      {showHeader && filteredNotifications.length > 0 && (
        <div className="border-t border-border p-2">
          <Button variant="ghost" className="h-8 w-full text-xs" asChild>
            <a href="/settings/notifications">Notification settings</a>
          </Button>
        </div>
      )}
    </div>
  );
}

export default NotificationList;
