"use client";

/**
 * Reminder Notification Component
 *
 * Displays a reminder notification popup when a reminder is due.
 * Includes options to mark complete, snooze, or dismiss the reminder.
 *
 * @example
 * ```tsx
 * <ReminderNotification
 *   reminder={dueReminder}
 *   onComplete={(id) => completeReminder(id)}
 *   onSnooze={(id, duration) => snoozeReminder(id, duration)}
 *   onDismiss={(id) => dismissReminder(id)}
 * />
 * ```
 */

import * as React from "react";
import {
  AlarmClock,
  Bell,
  Check,
  ChevronDown,
  Clock,
  Hash,
  MessageSquare,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  getSnoozeDurations,
  formatFutureTime,
} from "@/lib/reminders/reminder-store";
import { formatMessageTime } from "@/lib/date";
import type { Reminder } from "@/graphql/reminders";

// ============================================================================
// Types
// ============================================================================

export interface ReminderNotificationProps {
  reminder: Reminder;
  onComplete: (id: string) => void;
  onSnooze: (id: string, duration: number) => void;
  onDismiss: (id: string) => void;
  onClick?: (reminder: Reminder) => void;
  autoHide?: boolean;
  autoHideDelay?: number;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  className?: string;
}

export interface ReminderNotificationContainerProps {
  reminders: Reminder[];
  onComplete: (id: string) => void;
  onSnooze: (id: string, duration: number) => void;
  onDismiss: (id: string) => void;
  onClick?: (reminder: Reminder) => void;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  maxVisible?: number;
  className?: string;
}

// ============================================================================
// Position Classes
// ============================================================================

const POSITION_CLASSES = {
  "top-right": "top-4 right-4",
  "top-left": "top-4 left-4",
  "bottom-right": "bottom-4 right-4",
  "bottom-left": "bottom-4 left-4",
};

// ============================================================================
// Single Notification Component
// ============================================================================

export function ReminderNotification({
  reminder,
  onComplete,
  onSnooze,
  onDismiss,
  onClick,
  autoHide = false,
  autoHideDelay = 30000,
  className,
}: ReminderNotificationProps) {
  const [isVisible, setIsVisible] = React.useState(true);
  const [isExiting, setIsExiting] = React.useState(false);
  const snoozeDurations = React.useMemo(() => getSnoozeDurations(), []);

  // Auto-hide timer
  React.useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay]);

  // Handle dismiss with animation
  const handleDismiss = React.useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onDismiss(reminder.id);
    }, 200);
  }, [onDismiss, reminder.id]);

  // Handle complete
  const handleComplete = React.useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onComplete(reminder.id);
    }, 200);
  }, [onComplete, reminder.id]);

  // Handle snooze
  const handleSnooze = React.useCallback(
    (duration: number) => {
      setIsExiting(true);
      setTimeout(() => {
        onSnooze(reminder.id, duration);
      }, 200);
    },
    [onSnooze, reminder.id],
  );

  if (!isVisible) return null;

  const hasMessage = !!reminder.message;
  const channelName = reminder.channel?.name || reminder.message?.channel?.name;

  return (
    <div
      className={cn(
        "relative w-[400px] rounded-lg border bg-background shadow-lg",
        "duration-200 animate-in fade-in slide-in-from-right",
        isExiting && "duration-200 animate-out fade-out slide-out-to-right",
        className,
      )}
      role="alert"
      aria-live="assertive"
    >
      {/* Header */}
      <div className="bg-primary/5 flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <AlarmClock className="h-4 w-4 animate-pulse text-primary" />
          <span className="text-sm font-medium">Reminder</span>
        </div>
        <div className="flex items-center gap-1">
          {channelName && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <Hash className="h-3 w-3" />
              {channelName}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div
        className={cn(
          "space-y-3 p-4",
          onClick && "hover:bg-accent/50 cursor-pointer",
        )}
        {...(onClick
          ? {
              onClick: () => onClick(reminder),
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick(reminder);
                }
              },
              role: "button" as const,
              tabIndex: 0,
            }
          : {})}
      >
        {/* Reminder Content */}
        <div className="space-y-1">
          <p className="font-medium">{reminder.content}</p>
          {reminder.note && (
            <p className="text-sm text-muted-foreground">{reminder.note}</p>
          )}
        </div>

        {/* Message Preview (if message reminder) */}
        {hasMessage && reminder.message && (
          <div className="bg-muted/50 space-y-2 rounded-md p-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Original message
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={reminder.message.user.avatar_url} />
                <AvatarFallback className="text-[8px]">
                  {reminder.message.user.display_name?.[0] ||
                    reminder.message.user.username[0]}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">
                    {reminder.message.user.display_name ||
                      reminder.message.user.username}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatMessageTime(reminder.message.created_at)}
                  </span>
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {reminder.message.content}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Time Info */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>Set for {formatFutureTime(new Date(reminder.remind_at))}</span>
          {reminder.snooze_count > 0 && (
            <Badge variant="outline" className="text-[10px]">
              Snoozed {reminder.snooze_count}x
            </Badge>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-muted/30 flex items-center justify-end gap-2 border-t px-4 py-3">
        {/* Snooze Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Clock className="mr-2 h-4 w-4" />
              Snooze
              <ChevronDown className="ml-2 h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {snoozeDurations.map((option) => (
              <DropdownMenuItem
                key={option.label}
                onClick={() => handleSnooze(option.value)}
              >
                <div className="flex flex-col">
                  <span>{option.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Complete Button */}
        <Button size="sm" onClick={handleComplete}>
          <Check className="mr-2 h-4 w-4" />
          Mark Complete
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Notification Container (Multiple Notifications)
// ============================================================================

export function ReminderNotificationContainer({
  reminders,
  onComplete,
  onSnooze,
  onDismiss,
  onClick,
  position = "top-right",
  maxVisible = 3,
  className,
}: ReminderNotificationContainerProps) {
  const visibleReminders = reminders.slice(0, maxVisible);
  const hiddenCount = reminders.length - maxVisible;

  if (reminders.length === 0) return null;

  return (
    <div
      className={cn(
        "fixed z-50 flex flex-col gap-3",
        POSITION_CLASSES[position],
        className,
      )}
    >
      {visibleReminders.map((reminder, index) => (
        <div
          key={reminder.id}
          style={{
            // Stagger animation delay
            animationDelay: `${index * 100}ms`,
          }}
        >
          <ReminderNotification
            reminder={reminder}
            onComplete={onComplete}
            onSnooze={onSnooze}
            onDismiss={onDismiss}
            onClick={onClick}
          />
        </div>
      ))}

      {/* Hidden count indicator */}
      {hiddenCount > 0 && (
        <div className="bg-background/95 flex items-center justify-center rounded-lg border px-4 py-2 backdrop-blur">
          <Bell className="mr-2 h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            +{hiddenCount} more reminder{hiddenCount > 1 ? "s" : ""}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Toast-style Notification (Minimal)
// ============================================================================

export interface ReminderToastProps {
  reminder: Reminder;
  onComplete: (id: string) => void;
  onSnooze: (id: string, duration: number) => void;
  onDismiss: (id: string) => void;
  onViewAll?: () => void;
  className?: string;
}

export function ReminderToast({
  reminder,
  onComplete,
  onSnooze,
  onDismiss,
  onViewAll,
  className,
}: ReminderToastProps) {
  const [isExiting, setIsExiting] = React.useState(false);

  const handleAction = React.useCallback((action: () => void) => {
    setIsExiting(true);
    setTimeout(action, 200);
  }, []);

  return (
    <div
      className={cn(
        "flex min-w-[300px] max-w-[400px] items-center gap-3 rounded-lg border bg-background p-3 shadow-lg",
        "duration-200 animate-in fade-in slide-in-from-top",
        isExiting && "duration-200 animate-out fade-out slide-out-to-top",
        className,
      )}
    >
      <div className="bg-primary/10 flex-shrink-0 rounded-full p-2">
        <Bell className="h-4 w-4 text-primary" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{reminder.content}</p>
        <p className="text-xs text-muted-foreground">
          {formatFutureTime(new Date(reminder.remind_at))}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => handleAction(() => onComplete(reminder.id))}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() =>
            handleAction(() => onSnooze(reminder.id, 15 * 60 * 1000))
          }
        >
          <Clock className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => handleAction(() => onDismiss(reminder.id))}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Reminder Bell with Badge (for nav/header)
// ============================================================================

export interface ReminderBellProps {
  count: number;
  hasUrgent?: boolean;
  onClick?: () => void;
  className?: string;
}

export function ReminderBell({
  count,
  hasUrgent = false,
  onClick,
  className,
}: ReminderBellProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={cn("relative", className)}
    >
      <Bell className={cn("h-5 w-5", hasUrgent && "animate-pulse")} />
      {count > 0 && (
        <span
          className={cn(
            "absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-medium",
            hasUrgent
              ? "bg-destructive text-destructive-foreground"
              : "text-primary-foreground bg-primary",
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
      <span className="sr-only">
        {count} reminder{count !== 1 ? "s" : ""}
      </span>
    </Button>
  );
}

// ============================================================================
// Hook for managing notification visibility
// ============================================================================

export function useReminderNotifications(
  dueReminders: Reminder[],
  onComplete: (id: string) => void,
  onSnooze: (id: string, duration: number) => void,
  onDismiss: (id: string) => void,
) {
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(
    new Set(),
  );

  const visibleReminders = React.useMemo(
    () => dueReminders.filter((r) => !dismissedIds.has(r.id)),
    [dueReminders, dismissedIds],
  );

  const handleDismiss = React.useCallback(
    (id: string) => {
      setDismissedIds((prev) => new Set([...prev, id]));
      onDismiss(id);
    },
    [onDismiss],
  );

  const handleComplete = React.useCallback(
    (id: string) => {
      setDismissedIds((prev) => new Set([...prev, id]));
      onComplete(id);
    },
    [onComplete],
  );

  const handleSnooze = React.useCallback(
    (id: string, duration: number) => {
      setDismissedIds((prev) => new Set([...prev, id]));
      onSnooze(id, duration);
    },
    [onSnooze],
  );

  // Clear dismissed IDs when reminders change
  React.useEffect(() => {
    const currentIds = new Set(dueReminders.map((r) => r.id));
    setDismissedIds((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (currentIds.has(id)) {
          next.add(id);
        }
      }
      return next;
    });
  }, [dueReminders]);

  return {
    visibleReminders,
    hasReminders: visibleReminders.length > 0,
    handleComplete,
    handleSnooze,
    handleDismiss,
  };
}

export default ReminderNotification;
