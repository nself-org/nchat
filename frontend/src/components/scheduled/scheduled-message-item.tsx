"use client";

/**
 * Scheduled Message Item Component
 *
 * Displays an individual scheduled message with preview,
 * scheduled time, destination, and action buttons.
 *
 * @example
 * ```tsx
 * <ScheduledMessageItem
 *   message={scheduledMessage}
 *   onEdit={handleEdit}
 *   onCancel={handleCancel}
 *   onSendNow={handleSendNow}
 * />
 * ```
 */

import { useMemo, useCallback, useState } from "react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Clock,
  Hash,
  Lock,
  MoreHorizontal,
  Pencil,
  Send,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScheduledMessage } from "@/graphql/scheduled";

// ============================================================================
// Types
// ============================================================================

interface ScheduledMessageItemProps {
  message: ScheduledMessage;
  onEdit?: (message: ScheduledMessage) => void;
  onCancel?: (id: string) => Promise<void>;
  onSendNow?: (id: string) => Promise<void>;
  isEditing?: boolean;
  isCancelling?: boolean;
  isSending?: boolean;
  compact?: boolean;
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatScheduledTime(date: string, timezone: string): string {
  const d = new Date(date);
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone,
  });
}

function formatRelativeTime(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();

  if (diffMs < 0) {
    return "Past due";
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) {
    return `in ${diffMinutes}m`;
  }

  if (diffHours < 24) {
    return `in ${diffHours}h`;
  }

  if (diffDays < 7) {
    return `in ${diffDays}d`;
  }

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getStatusConfig(status: ScheduledMessage["status"]) {
  switch (status) {
    case "pending":
      return {
        icon: Clock,
        label: "Scheduled",
        variant: "secondary" as const,
        className: "text-blue-500",
      };
    case "sent":
      return {
        icon: CheckCircle,
        label: "Sent",
        variant: "secondary" as const,
        className: "text-green-500",
      };
    case "cancelled":
      return {
        icon: XCircle,
        label: "Cancelled",
        variant: "outline" as const,
        className: "text-muted-foreground",
      };
    case "failed":
      return {
        icon: AlertCircle,
        label: "Failed",
        variant: "destructive" as const,
        className: "text-destructive",
      };
    default:
      return {
        icon: Clock,
        label: status,
        variant: "secondary" as const,
        className: "",
      };
  }
}

function truncateContent(content: string, maxLength: number = 150): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength).trim() + "...";
}

// ============================================================================
// Component
// ============================================================================

export function ScheduledMessageItem({
  message,
  onEdit,
  onCancel,
  onSendNow,
  isEditing = false,
  isCancelling = false,
  isSending = false,
  compact = false,
  className,
}: ScheduledMessageItemProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showSendNowDialog, setShowSendNowDialog] = useState(false);

  const statusConfig = useMemo(
    () => getStatusConfig(message.status),
    [message.status],
  );
  const StatusIcon = statusConfig.icon;

  const scheduledTimeFormatted = useMemo(
    () => formatScheduledTime(message.scheduled_at, message.timezone),
    [message.scheduled_at, message.timezone],
  );

  const relativeTime = useMemo(
    () => formatRelativeTime(message.scheduled_at),
    [message.scheduled_at],
  );

  const isActionable = message.status === "pending";
  const isProcessing = isEditing || isCancelling || isSending;

  const handleEdit = useCallback(() => {
    if (onEdit && isActionable) {
      onEdit(message);
    }
  }, [onEdit, message, isActionable]);

  const handleCancel = useCallback(async () => {
    if (onCancel && isActionable) {
      await onCancel(message.id);
      setShowCancelDialog(false);
    }
  }, [onCancel, message.id, isActionable]);

  const handleSendNow = useCallback(async () => {
    if (onSendNow && isActionable) {
      await onSendNow(message.id);
      setShowSendNowDialog(false);
    }
  }, [onSendNow, message.id, isActionable]);

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border bg-card p-2",
          isProcessing && "opacity-60",
          className,
        )}
      >
        <div className={cn("flex-shrink-0", statusConfig.className)}>
          <StatusIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">
            {truncateContent(message.content, 50)}
          </p>
          <p className="text-xs text-muted-foreground">
            {relativeTime} - #{message.channel?.name || "unknown"}
          </p>
        </div>
        {isActionable && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={handleEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {onSendNow && (
                <DropdownMenuItem onClick={() => setShowSendNowDialog(true)}>
                  <Send className="mr-2 h-4 w-4" />
                  Send now
                </DropdownMenuItem>
              )}
              {onCancel && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowCancelDialog(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Cancel
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "rounded-lg border bg-card p-4 transition-colors",
          "hover:border-accent-foreground/20",
          isProcessing && "pointer-events-none opacity-60",
          className,
        )}
      >
        {/* Header */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant={statusConfig.variant} className="gap-1">
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </Badge>
            <Badge variant="outline" className="gap-1">
              {message.channel?.is_private ? (
                <Lock className="h-3 w-3" />
              ) : (
                <Hash className="h-3 w-3" />
              )}
              {message.channel?.name || "Unknown channel"}
            </Badge>
          </div>

          {isActionable && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MoreHorizontal className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem
                    onClick={handleEdit}
                    disabled={isProcessing}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit message
                  </DropdownMenuItem>
                )}
                {onSendNow && (
                  <DropdownMenuItem
                    onClick={() => setShowSendNowDialog(true)}
                    disabled={isProcessing}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Send now
                  </DropdownMenuItem>
                )}
                {(onEdit || onSendNow) && onCancel && <DropdownMenuSeparator />}
                {onCancel && (
                  <DropdownMenuItem
                    onClick={() => setShowCancelDialog(true)}
                    disabled={isProcessing}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Cancel scheduled message
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Message Content */}
        <div className="mb-3">
          <p className="whitespace-pre-wrap break-words text-sm">
            {truncateContent(message.content)}
          </p>
        </div>

        {/* Scheduled Time */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{scheduledTimeFormatted}</span>
          <span className="text-xs">({relativeTime})</span>
        </div>

        {/* Error Message (for failed status) */}
        {message.status === "failed" && message.error_message && (
          <div className="bg-destructive/10 border-destructive/20 mt-3 rounded-md border p-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">
                {message.error_message}
              </p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {isActionable && (onEdit || onSendNow || onCancel) && (
          <div className="mt-4 flex items-center gap-2 border-t pt-3">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
                disabled={isProcessing}
              >
                {isEditing ? (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : (
                  <Pencil className="mr-2 h-3 w-3" />
                )}
                Edit
              </Button>
            )}
            {onSendNow && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSendNowDialog(true)}
                disabled={isProcessing}
              >
                {isSending ? (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : (
                  <Send className="mr-2 h-3 w-3" />
                )}
                Send now
              </Button>
            )}
            {onCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCancelDialog(true)}
                disabled={isProcessing}
                className="hover:bg-destructive/10 ml-auto text-destructive hover:text-destructive"
              >
                {isCancelling ? (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-3 w-3" />
                )}
                Cancel
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel scheduled message?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the scheduled message and it will not be sent.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep scheduled</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
            >
              Cancel message
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send Now Confirmation Dialog */}
      <AlertDialog open={showSendNowDialog} onOpenChange={setShowSendNowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send message now?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send the message immediately instead of at the scheduled
              time. The message will be sent to #
              {message.channel?.name || "the channel"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep scheduled</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendNow}>
              <Send className="mr-2 h-4 w-4" />
              Send now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ScheduledMessageItem;
