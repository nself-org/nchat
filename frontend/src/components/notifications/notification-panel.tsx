/**
 * NotificationPanel - Dropdown panel showing notifications list
 *
 * Features:
 * - List of notifications
 * - Mark all as read
 * - Filter by type
 * - Grouped by date
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useNotificationStore,
  type Notification,
} from "@/stores/notification-store";
import { NotificationItem } from "./notification-item";

// ============================================================================
// Types
// ============================================================================

export type NotificationFilterType =
  | "all"
  | "mentions"
  | "threads"
  | "reactions"
  | "unread";

export interface NotificationPanelProps {
  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Max height of the panel
   * @default 400
   */
  maxHeight?: number;

  /**
   * Whether to show the filter tabs
   * @default true
   */
  showFilters?: boolean;

  /**
   * Whether to show the mark all as read button
   * @default true
   */
  showMarkAllRead?: boolean;

  /**
   * Whether to show empty state
   * @default true
   */
  showEmpty?: boolean;

  /**
   * Callback when a notification is clicked
   */
  onNotificationClick?: (notification: Notification) => void;

  /**
   * Callback when close is requested
   */
  onClose?: () => void;
}

// ============================================================================
// Filter Tabs
// ============================================================================

interface FilterTabsProps {
  activeFilter: NotificationFilterType;
  onFilterChange: (filter: NotificationFilterType) => void;
  unreadCount: number;
}

function FilterTabs({
  activeFilter,
  onFilterChange,
  unreadCount,
}: FilterTabsProps) {
  const filters: { value: NotificationFilterType; label: string }[] = [
    { value: "all", label: "All" },
    { value: "mentions", label: "Mentions" },
    { value: "threads", label: "Threads" },
    { value: "reactions", label: "Reactions" },
    {
      value: "unread",
      label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}`,
    },
  ];

  return (
    <div className="flex gap-1 border-b p-2" role="tablist">
      {filters.map((filter) => (
        <button
          key={filter.value}
          role="tab"
          aria-selected={activeFilter === filter.value}
          onClick={() => onFilterChange(filter.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            activeFilter === filter.value
              ? "text-primary-foreground bg-primary"
              : "hover:text-accent-foreground text-muted-foreground hover:bg-accent",
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

interface EmptyStateProps {
  filter: NotificationFilterType;
}

function EmptyState({ filter }: EmptyStateProps) {
  const messages: Record<
    NotificationFilterType,
    { title: string; description: string }
  > = {
    all: {
      title: "No notifications",
      description: "You're all caught up!",
    },
    mentions: {
      title: "No mentions",
      description: "No one has mentioned you yet.",
    },
    threads: {
      title: "No thread replies",
      description: "No replies to your threads yet.",
    },
    reactions: {
      title: "No reactions",
      description: "No reactions to your messages yet.",
    },
    unread: {
      title: "No unread notifications",
      description: "All notifications have been read.",
    },
  };

  const { title, description } = messages[filter];

  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <svg
          className="h-6 w-6 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
      </div>
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

// ============================================================================
// Notification Panel Component
// ============================================================================

export function NotificationPanel({
  className,
  maxHeight = 400,
  showFilters = true,
  showMarkAllRead = true,
  showEmpty = true,
  onNotificationClick,
  onClose,
}: NotificationPanelProps) {
  // Store state
  const notifications = useNotificationStore((state) => state.notifications);
  const activeFilter = useNotificationStore((state) => state.activeFilter);
  const unreadCount = useNotificationStore((state) => state.unreadCounts.total);
  const setActiveFilter = useNotificationStore(
    (state) => state.setActiveFilter,
  );
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const archiveNotification = useNotificationStore(
    (state) => state.archiveNotification,
  );
  const getFilteredNotifications = useNotificationStore(
    (state) => state.getFilteredNotifications,
  );

  // Get filtered notifications
  const filteredNotifications = React.useMemo(() => {
    return getFilteredNotifications();
  }, [getFilteredNotifications, notifications, activeFilter]);

  // Handle notification click
  const handleNotificationClick = React.useCallback(
    (notification: Notification) => {
      markAsRead(notification.id);
      onNotificationClick?.(notification);
    },
    [markAsRead, onNotificationClick],
  );

  // Handle archive
  const handleArchive = React.useCallback(
    (id: string) => {
      archiveNotification(id);
    },
    [archiveNotification],
  );

  // Handle mark all as read
  const handleMarkAllAsRead = React.useCallback(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  // Handle filter change
  const handleFilterChange = React.useCallback(
    (filter: NotificationFilterType) => {
      setActiveFilter(filter);
    },
    [setActiveFilter],
  );

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-lg border bg-background shadow-lg",
        className,
      )}
      role="dialog"
      aria-label="Notifications"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-lg font-semibold">Notifications</h2>
        <div className="flex items-center gap-2">
          {showMarkAllRead && unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs"
            >
              Mark all as read
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      {showFilters && (
        <FilterTabs
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          unreadCount={unreadCount}
        />
      )}

      {/* Notifications List */}
      <ScrollArea style={{ maxHeight }}>
        {filteredNotifications.length === 0 && showEmpty ? (
          <EmptyState filter={activeFilter} />
        ) : (
          <div className="divide-y" role="list" aria-label="Notifications list">
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={() => handleNotificationClick(notification)}
                onArchive={() => handleArchive(notification.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {filteredNotifications.length > 0 && (
        <div className="border-t p-2 text-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
          >
            View all notifications
          </Button>
        </div>
      )}
    </div>
  );
}

NotificationPanel.displayName = "NotificationPanel";

export default NotificationPanel;
