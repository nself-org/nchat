/**
 * Scheduled Messages List Component
 *
 * Display and manage all scheduled messages with edit, cancel, send now,
 * and delete functionality.
 */

"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Clock,
  Edit2,
  X,
  Send,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  useScheduledMessagesList,
  useScheduledMessage,
  useMessageScheduler,
} from "@/hooks/use-message-scheduler";
import { ScheduleMessageModal } from "./ScheduleMessageModal";
import {
  formatScheduledTime,
  getRelativeTime,
  type ScheduledMessage,
} from "@/lib/messages/scheduled-messages";

interface ScheduledMessagesListProps {
  channelId?: string;
  userId?: string;
  className?: string;
}

export function ScheduledMessagesList({
  channelId,
  userId,
  className,
}: ScheduledMessagesListProps) {
  const {
    messages,
    pendingCount,
    failedCount,
    upcomingMessages,
    overdueMessages,
  } = useScheduledMessagesList(channelId, userId);
  const { sendNow } = useMessageScheduler();

  const [selectedMessage, setSelectedMessage] =
    useState<ScheduledMessage | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleSendNow = async (messageId: string) => {
    setIsSending(true);
    try {
      await sendNow(messageId);
    } finally {
      setIsSending(false);
    }
  };

  const handleEdit = (message: ScheduledMessage) => {
    setSelectedMessage(message);
    setIsEditModalOpen(true);
  };

  const handleDelete = (message: ScheduledMessage) => {
    setSelectedMessage(message);
    setIsDeleteDialogOpen(true);
  };

  if (messages.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-8 text-center",
          className,
        )}
      >
        <Clock className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 text-lg font-semibold">No scheduled messages</h3>
        <p className="text-sm text-muted-foreground">
          Schedule messages to be sent at a specific time
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Stats */}
      <div className="bg-muted/50 flex gap-4 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            <span className="font-semibold">{pendingCount}</span> pending
          </span>
        </div>
        {failedCount > 0 && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm">
                <span className="font-semibold">{failedCount}</span> failed
              </span>
            </div>
          </>
        )}
        {upcomingMessages.length > 0 && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-blue-600" />
              <span className="text-sm">
                <span className="font-semibold">{upcomingMessages.length}</span>{" "}
                upcoming (next hour)
              </span>
            </div>
          </>
        )}
        {overdueMessages.length > 0 && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <span className="text-sm">
                <span className="font-semibold">{overdueMessages.length}</span>{" "}
                overdue
              </span>
            </div>
          </>
        )}
      </div>

      {/* Messages List */}
      <div className="space-y-2">
        {messages.map((message) => (
          <ScheduledMessageItem
            key={message.id}
            message={message}
            onEdit={() => handleEdit(message)}
            onDelete={() => handleDelete(message)}
            onSendNow={() => handleSendNow(message.id)}
            isSending={isSending}
          />
        ))}
      </div>

      {/* Edit Modal */}
      {selectedMessage && (
        <EditScheduledMessageModal
          message={selectedMessage}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedMessage(null);
          }}
        />
      )}

      {/* Delete Dialog */}
      {selectedMessage && (
        <DeleteScheduledMessageDialog
          message={selectedMessage}
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setSelectedMessage(null);
          }}
        />
      )}
    </div>
  );
}

/**
 * Scheduled Message Item
 */
interface ScheduledMessageItemProps {
  message: ScheduledMessage;
  onEdit: () => void;
  onDelete: () => void;
  onSendNow: () => void;
  isSending: boolean;
}

function ScheduledMessageItem({
  message,
  onEdit,
  onDelete,
  onSendNow,
  isSending,
}: ScheduledMessageItemProps) {
  const { cancelMessage, retryMessage } = useScheduledMessage(message.id);
  const isOverdue =
    message.status === "pending" && message.scheduledAt < Date.now();

  return (
    <div
      className={cn(
        "space-y-3 rounded-lg border p-4",
        message.status === "failed" && "border-destructive/50 bg-destructive/5",
        message.status === "sending" && "border-blue-500/50 bg-blue-500/5",
        isOverdue && "border-orange-500/50 bg-orange-500/5",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <StatusBadge status={message.status} isOverdue={isOverdue} />
            <span className="text-sm text-muted-foreground">
              {formatScheduledTime(message.scheduledAt)}
            </span>
            {!isOverdue && (
              <span className="text-xs text-muted-foreground">
                ({getRelativeTime(message.scheduledAt)})
              </span>
            )}
          </div>
          <p className="line-clamp-2 whitespace-pre-wrap text-sm">
            {message.content}
          </p>
        </div>
      </div>

      {/* Error Message */}
      {message.error && (
        <div className="bg-destructive/10 flex items-start gap-2 rounded p-2 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" />
          <span>{message.error}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {message.status === "pending" && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={onSendNow}
              disabled={isSending}
            >
              <Send className="mr-1 h-3 w-3" />
              Send Now
            </Button>
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Edit2 className="mr-1 h-3 w-3" />
              Edit
            </Button>
            <Button size="sm" variant="outline" onClick={cancelMessage}>
              <X className="mr-1 h-3 w-3" />
              Cancel
            </Button>
          </>
        )}
        {message.status === "failed" && (
          <>
            <Button size="sm" variant="outline" onClick={retryMessage}>
              <RefreshCw className="mr-1 h-3 w-3" />
              Retry
            </Button>
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Edit2 className="mr-1 h-3 w-3" />
              Edit
            </Button>
          </>
        )}
        {message.status === "sending" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Sending...
          </div>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          className="ml-auto text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Status Badge
 */
function StatusBadge({
  status,
  isOverdue,
}: {
  status: string;
  isOverdue: boolean;
}) {
  if (isOverdue) {
    return (
      <Badge variant="destructive" className="text-xs">
        <AlertCircle className="mr-1 h-3 w-3" />
        Overdue
      </Badge>
    );
  }

  switch (status) {
    case "pending":
      return (
        <Badge variant="secondary" className="text-xs">
          <Clock className="mr-1 h-3 w-3" />
          Scheduled
        </Badge>
      );
    case "sending":
      return (
        <Badge variant="default" className="bg-blue-600 text-xs">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Sending
        </Badge>
      );
    case "sent":
      return (
        <Badge variant="default" className="bg-green-600 text-xs">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Sent
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="text-xs">
          <AlertCircle className="mr-1 h-3 w-3" />
          Failed
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="outline" className="text-xs">
          <X className="mr-1 h-3 w-3" />
          Cancelled
        </Badge>
      );
    default:
      return null;
  }
}

/**
 * Edit Modal
 */
interface EditScheduledMessageModalProps {
  message: ScheduledMessage;
  isOpen: boolean;
  onClose: () => void;
}

function EditScheduledMessageModal({
  message,
  isOpen,
  onClose,
}: EditScheduledMessageModalProps) {
  const { updateMessage } = useScheduledMessage(message.id);

  const handleUpdate = async (options: any) => {
    updateMessage({
      content: options.content,
      scheduledAt: options.scheduledAt,
    });
    onClose();
  };

  return (
    <ScheduleMessageModal
      channelId={message.channelId}
      isOpen={isOpen}
      onClose={onClose}
      defaultContent={message.content}
      replyToId={message.replyToId}
      threadId={message.threadId}
      onMessageScheduled={() => {
        // Update handled in handleUpdate
      }}
    />
  );
}

/**
 * Delete Dialog
 */
interface DeleteScheduledMessageDialogProps {
  message: ScheduledMessage;
  isOpen: boolean;
  onClose: () => void;
}

function DeleteScheduledMessageDialog({
  message,
  isOpen,
  onClose,
}: DeleteScheduledMessageDialogProps) {
  const { deleteMessage } = useScheduledMessage(message.id);

  const handleDelete = () => {
    deleteMessage();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete scheduled message?</DialogTitle>
          <DialogDescription>
            This will permanently remove the scheduled message. This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg bg-muted p-4">
          <p className="line-clamp-3 whitespace-pre-wrap text-sm">
            {message.content}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Scheduled for {formatScheduledTime(message.scheduledAt)}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
