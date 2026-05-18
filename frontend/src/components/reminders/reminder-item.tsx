"use client";

/**
 * Reminder Item Component
 *
 * Displays a single reminder with content preview, time/date,
 * channel/DM context, and action buttons (edit, complete, delete).
 *
 * @example
 * ```tsx
 * <ReminderItem
 *   reminder={reminder}
 *   onComplete={(id) => completeReminder(id)}
 *   onEdit={(reminder) => openEditModal(reminder)}
 *   onDelete={(id) => deleteReminder(id)}
 * />
 * ```
 */

import * as React from "react";
import {
  Bell,
  Check,
  Clock,
  Edit2,
  Hash,
  MessageSquare,
  MoreHorizontal,
  Repeat,
  Trash2,
  User,
  AlarmClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatFutureTime } from "@/lib/reminders/reminder-store";
import { formatMessageTime, formatMessageTimeTooltip } from "@/lib/date";
import type { Reminder } from "@/graphql/reminders";

// ============================================================================
// Types
// ============================================================================

export interface ReminderItemProps {
  reminder: Reminder;
  onComplete?: (id: string) => void;
  onEdit?: (reminder: Reminder) => void;
  onDelete?: (id: string) => void;
  onSnooze?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onClick?: (reminder: Reminder) => void;
  isLoading?: boolean;
  variant?: "default" | "compact" | "notification";
  showChannel?: boolean;
  showActions?: boolean;
  className?: string;
}

// ============================================================================
// Helper Components
// ============================================================================

interface ReminderContentPreviewProps {
  reminder: Reminder;
  maxLength?: number;
}

function ReminderContentPreview({
  reminder,
  maxLength = 100,
}: ReminderContentPreviewProps) {
  const content = reminder.content;
  const truncated =
    content.length > maxLength ? `${content.slice(0, maxLength)}...` : content;

  return (
    <div className="space-y-1">
      <p className="line-clamp-2 text-sm font-medium">{truncated}</p>
      {reminder.note && (
        <p className="line-clamp-1 text-xs text-muted-foreground">
          Note: {reminder.note}
        </p>
      )}
    </div>
  );
}

interface ReminderTimeDisplayProps {
  reminder: Reminder;
  showRelative?: boolean;
}

function ReminderTimeDisplay({
  reminder,
  showRelative = true,
}: ReminderTimeDisplayProps) {
  const remindAt = new Date(reminder.remind_at);
  const now = new Date();
  const isPast = remindAt < now;
  const isDue = isPast && reminder.status === "pending";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "flex items-center gap-1.5 text-xs",
            isDue
              ? "font-medium text-destructive"
              : isPast
                ? "text-muted-foreground"
                : "text-muted-foreground",
          )}
        >
          {isDue ? (
            <AlarmClock className="h-3.5 w-3.5 animate-pulse" />
          ) : (
            <Clock className="h-3.5 w-3.5" />
          )}
          {showRelative ? (
            <span>{formatFutureTime(remindAt)}</span>
          ) : (
            <span>{formatMessageTime(remindAt)}</span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{formatMessageTimeTooltip(remindAt)}</p>
        {reminder.timezone && (
          <p className="mt-1 text-xs text-muted-foreground">
            Timezone: {reminder.timezone}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

interface ReminderChannelBadgeProps {
  reminder: Reminder;
}

function ReminderChannelBadge({ reminder }: ReminderChannelBadgeProps) {
  if (reminder.message?.channel) {
    return (
      <Badge variant="secondary" className="gap-1 text-xs font-normal">
        <Hash className="h-3 w-3" />
        {reminder.message.channel.name}
      </Badge>
    );
  }

  if (reminder.channel) {
    return (
      <Badge variant="secondary" className="gap-1 text-xs font-normal">
        <Hash className="h-3 w-3" />
        {reminder.channel.name}
      </Badge>
    );
  }

  return null;
}

interface ReminderTypeBadgeProps {
  type: Reminder["type"];
}

function ReminderTypeBadge({ type }: ReminderTypeBadgeProps) {
  const config = {
    message: { label: "Message", icon: MessageSquare },
    custom: { label: "Custom", icon: Bell },
    followup: { label: "Follow-up", icon: User },
  };

  const { label, icon: Icon } = config[type] || config.custom;

  return (
    <Badge variant="outline" className="gap-1 text-xs font-normal">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

interface ReminderStatusBadgeProps {
  status: Reminder["status"];
}

function ReminderStatusBadge({ status }: ReminderStatusBadgeProps) {
  const config = {
    pending: { label: "Pending", variant: "default" as const },
    completed: { label: "Completed", variant: "secondary" as const },
    dismissed: { label: "Dismissed", variant: "outline" as const },
    snoozed: { label: "Snoozed", variant: "secondary" as const },
  };

  const { label, variant } = config[status] || config.pending;

  return (
    <Badge variant={variant} className="text-xs">
      {label}
    </Badge>
  );
}

// ============================================================================
// Default Variant
// ============================================================================

function DefaultReminderItem({
  reminder,
  onComplete,
  onEdit,
  onDelete,
  onSnooze,
  onClick,
  isLoading,
  showChannel = true,
  showActions = true,
  className,
}: ReminderItemProps) {
  const isPending = reminder.status === "pending";
  const isCompleted = reminder.status === "completed";

  const interactiveProps = onClick
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
    : {};

  return (
    <div
      className={cn(
        "group relative flex items-start gap-4 rounded-lg border p-4 transition-colors",
        isPending && "hover:border-primary/50 hover:bg-accent/50",
        isCompleted && "opacity-75",
        onClick && "cursor-pointer",
        className,
      )}
      {...interactiveProps}
    >
      {/* Status Icon / Checkbox */}
      <div className="flex-shrink-0 pt-0.5">
        {isPending && onComplete ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onComplete(reminder.id);
            }}
            disabled={isLoading}
            className={cn(
              "border-muted-foreground/50 flex h-5 w-5 items-center justify-center rounded-full border-2",
              "hover:bg-primary/10 hover:border-primary",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "transition-colors",
            )}
          >
            <Check className="h-3 w-3 text-transparent group-hover:text-primary" />
          </button>
        ) : (
          <div
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full",
              isCompleted ? "bg-primary" : "bg-muted",
            )}
          >
            {isCompleted ? (
              <Check className="text-primary-foreground h-3 w-3" />
            ) : (
              <Bell className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-2">
        <ReminderContentPreview reminder={reminder} />

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-2">
          <ReminderTimeDisplay reminder={reminder} />

          {showChannel && <ReminderChannelBadge reminder={reminder} />}

          {reminder.is_recurring && (
            <Badge variant="outline" className="gap-1 text-xs font-normal">
              <Repeat className="h-3 w-3" />
              Recurring
            </Badge>
          )}

          {reminder.snooze_count > 0 && (
            <Badge variant="outline" className="text-xs font-normal">
              Snoozed {reminder.snooze_count}x
            </Badge>
          )}
        </div>

        {/* Original Message Preview (if message reminder) */}
        {reminder.message && (
          <div className="bg-muted/50 mt-2 rounded-md p-2">
            <div className="mb-1 flex items-center gap-2">
              <Avatar className="h-4 w-4">
                <AvatarImage src={reminder.message.user.avatar_url} />
                <AvatarFallback className="text-[8px]">
                  {reminder.message.user.display_name?.[0] ||
                    reminder.message.user.username[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium">
                {reminder.message.user.display_name ||
                  reminder.message.user.username}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatMessageTime(reminder.message.created_at)}
              </span>
            </div>
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {reminder.message.content}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && isPending && (
        <div className="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Reminder actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(reminder);
                  }}
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {onSnooze && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onSnooze(reminder.id);
                  }}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Snooze
                </DropdownMenuItem>
              )}
              {onComplete && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onComplete(reminder.id);
                  }}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Mark complete
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(reminder.id);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Compact Variant
// ============================================================================

function CompactReminderItem({
  reminder,
  onComplete,
  onEdit,
  onDelete,
  onClick,
  isLoading,
  className,
}: ReminderItemProps) {
  const isPending = reminder.status === "pending";

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 transition-colors",
        "hover:bg-accent",
        onClick && "cursor-pointer",
        className,
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
      {/* Checkbox */}
      {isPending && onComplete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onComplete(reminder.id);
          }}
          disabled={isLoading}
          aria-label="Mark reminder as complete"
          className={cn(
            "border-muted-foreground/50 flex h-4 w-4 items-center justify-center rounded border",
            "hover:bg-primary/10 hover:border-primary",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <Check className="h-2.5 w-2.5 text-transparent hover:text-primary" />
        </button>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{reminder.content}</p>
      </div>

      {/* Time */}
      <div className="flex-shrink-0">
        <ReminderTimeDisplay reminder={reminder} showRelative={false} />
      </div>

      {/* Actions */}
      {isPending && (onEdit || onDelete) && (
        <div className="flex flex-shrink-0 gap-1">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(reminder);
              }}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(reminder.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Notification Variant
// ============================================================================

function NotificationReminderItem({
  reminder,
  onComplete,
  onDismiss,
  onSnooze,
  onClick,
  className,
}: ReminderItemProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border bg-background p-3",
        onClick && "hover:bg-accent/50 cursor-pointer",
        className,
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
      <div className="bg-primary/10 flex-shrink-0 rounded-full p-2">
        <Bell className="h-4 w-4 text-primary" />
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <p className="line-clamp-2 text-sm font-medium">{reminder.content}</p>
        <ReminderTimeDisplay reminder={reminder} />
      </div>

      <div className="flex flex-shrink-0 gap-1">
        {onComplete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onComplete(reminder.id);
            }}
          >
            <Check className="h-4 w-4" />
          </Button>
        )}
        {onSnooze && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onSnooze(reminder.id);
            }}
          >
            <Clock className="h-4 w-4" />
          </Button>
        )}
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(reminder.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ReminderItem({
  variant = "default",
  ...props
}: ReminderItemProps) {
  switch (variant) {
    case "compact":
      return <CompactReminderItem {...props} />;
    case "notification":
      return <NotificationReminderItem {...props} />;
    default:
      return <DefaultReminderItem {...props} />;
  }
}

export default ReminderItem;
