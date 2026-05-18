"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useNotificationStore } from "@/stores/notification-store";
import { NotificationItem } from "./notification-item";
import {
  NotificationEmpty,
  NotificationFilteredEmpty,
} from "./notification-empty";
import type { NotificationFilterTab } from "./types";

// Filter tab configuration
const FILTER_TABS: Array<{ id: NotificationFilterTab; label: string }> = [
  { id: "all", label: "All" },
  { id: "mentions", label: "Mentions" },
  { id: "threads", label: "Threads" },
  { id: "reactions", label: "Reactions" },
];

export interface NotificationCenterProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Callback when close button is clicked
   */
  onClose?: () => void;

  /**
   * Callback when settings link is clicked
   */
  onSettingsClick?: () => void;

  /**
   * Whether the panel is open (for slide-out animation)
   */
  isOpen?: boolean;

  /**
   * Position of the panel
   * @default 'right'
   */
  position?: "left" | "right" | "dropdown";

  /**
   * Maximum height of the notification list
   * @default '400px'
   */
  maxHeight?: string;
}

/**
 * NotificationCenter - Main notification panel
 *
 * Can be rendered as:
 * - A slide-out panel (position: 'left' | 'right')
 * - A dropdown (position: 'dropdown')
 */
export function NotificationCenter({
  onClose,
  onSettingsClick,
  isOpen = true,
  position = "right",
  maxHeight = "400px",
  className,
  ...props
}: NotificationCenterProps) {
  const notifications = useNotificationStore((state) => state.notifications);
  const activeFilter = useNotificationStore((state) => state.activeFilter);
  const setActiveFilter = useNotificationStore(
    (state) => state.setActiveFilter,
  );
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const removeNotification = useNotificationStore(
    (state) => state.removeNotification,
  );
  const unreadCount = useNotificationStore((state) => state.unreadCounts.total);

  // Filter notifications based on active filter
  const filteredNotifications = React.useMemo(() => {
    return notifications.filter((notification) => {
      if (notification.isArchived) return false;

      switch (activeFilter) {
        case "all":
          return true;
        case "mentions":
          return notification.type === "mention";
        case "threads":
          return notification.type === "thread_reply";
        case "reactions":
          return notification.type === "reaction";
        case "unread":
          return !notification.isRead;
        default:
          return true;
      }
    });
  }, [notifications, activeFilter]);

  const handleFilterChange = React.useCallback(
    (value: string) => {
      setActiveFilter(value as NotificationFilterTab);
    },
    [setActiveFilter],
  );

  const handleNotificationClick = React.useCallback(
    (id: string) => {
      const notification = notifications.find((n) => n.id === id);
      if (notification?.actionUrl) {
        window.location.href = notification.actionUrl;
      }
      onClose?.();
    },
    [notifications, onClose],
  );

  // Get filter-specific empty message
  const getFilterLabel = () => {
    const tab = FILTER_TABS.find((t) => t.id === activeFilter);
    return tab?.label || "notifications";
  };

  const isDropdown = position === "dropdown";
  const isSlidePanel = position === "left" || position === "right";

  return (
    <div
      className={cn(
        "flex flex-col border border-border bg-background",
        isDropdown && "w-[380px] rounded-lg shadow-lg",
        isSlidePanel && "h-full w-[380px]",
        position === "right" && "rounded-l-lg border-l-0",
        position === "left" && "rounded-r-lg border-r-0",
        !isOpen && isSlidePanel && "translate-x-full",
        isOpen && isSlidePanel && "translate-x-0",
        "transition-transform duration-200",
        className,
      )}
      role="dialog"
      aria-label="Notifications"
      {...props}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Notifications</h2>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">
              ({unreadCount} unread)
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
            >
              Mark all read
            </Button>
          )}
          {onSettingsClick && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onSettingsClick}
              aria-label="Notification settings"
              className="h-8 w-8"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close notifications"
              className="h-8 w-8"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <Tabs
        value={activeFilter}
        onValueChange={handleFilterChange}
        className="w-full"
      >
        <TabsList className="h-auto w-full justify-start rounded-none border-b border-border bg-transparent px-2 py-1">
          {FILTER_TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="px-3 py-1.5 text-xs data-[state=active]:bg-accent"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Notification List */}
        <TabsContent value={activeFilter} className="mt-0">
          <ScrollArea style={{ maxHeight }} className="flex-1">
            {filteredNotifications.length === 0 ? (
              activeFilter === "all" ? (
                <NotificationEmpty />
              ) : (
                <NotificationFilteredEmpty filterName={getFilterLabel()} />
              )
            ) : (
              <div className="divide-y divide-border">
                {filteredNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRead={markAsRead}
                    onDismiss={removeNotification}
                    onClick={handleNotificationClick}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t border-border px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              // Navigate to full notifications page
              window.location.href = "/notifications";
            }}
          >
            View all notifications
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * NotificationCenterDropdown - Dropdown wrapper for notification center
 */
export function NotificationCenterDropdown({
  trigger,
  ...props
}: NotificationCenterProps & { trigger?: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const notificationCenterOpen = useNotificationStore(
    (state) => state.notificationCenterOpen,
  );
  const setNotificationCenterOpen = useNotificationStore(
    (state) => state.setNotificationCenterOpen,
  );

  const handleClose = React.useCallback(() => {
    setIsOpen(false);
    setNotificationCenterOpen(false);
    props.onClose?.();
  }, [props, setNotificationCenterOpen]);

  // Sync with store
  React.useEffect(() => {
    setIsOpen(notificationCenterOpen);
  }, [notificationCenterOpen]);

  return (
    <div className="relative">
      {trigger}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={handleClose}
            aria-hidden="true"
          />
          {/* Dropdown */}
          <div className="absolute right-0 top-full z-50 mt-2">
            <NotificationCenter
              {...props}
              position="dropdown"
              isOpen={isOpen}
              onClose={handleClose}
            />
          </div>
        </>
      )}
    </div>
  );
}

NotificationCenter.displayName = "NotificationCenter";
NotificationCenterDropdown.displayName = "NotificationCenterDropdown";

export default NotificationCenter;
