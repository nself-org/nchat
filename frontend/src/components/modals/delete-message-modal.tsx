"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

import { logger } from "@/lib/logger";

export interface MessagePreview {
  id: string;
  content: string;
  authorName: string;
  authorAvatarUrl?: string;
  createdAt: Date;
  hasAttachments?: boolean;
  attachmentCount?: number;
}

interface DeleteMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: MessagePreview | null;
  onDelete: (messageId: string, deleteForEveryone: boolean) => Promise<void>;
  isAdmin?: boolean;
  isSelfMessage?: boolean;
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  }).format(date);
}

function formatDate(date: Date): string {
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(date);
  }
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

export function DeleteMessageModal({
  open,
  onOpenChange,
  message,
  onDelete,
  isAdmin = false,
  isSelfMessage = true,
}: DeleteMessageModalProps) {
  const [loading, setLoading] = useState(false);
  const [deleteForEveryone, setDeleteForEveryone] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setLoading(false);
      setDeleteForEveryone(false);
    }
  }, [open]);

  const handleDelete = async () => {
    if (!message) return;

    setLoading(true);
    try {
      await onDelete(message.id, deleteForEveryone);
      onOpenChange(false);
    } catch (error) {
      logger.error("Failed to delete message:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!message) return null;

  const canDeleteForEveryone = isAdmin || isSelfMessage;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader className="space-y-4">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                "bg-destructive/10 text-destructive",
              )}
            >
              <Trash2 className="h-5 w-5" />
            </div>
            <div className="space-y-1.5 pt-0.5">
              <DialogTitle>Delete message?</DialogTitle>
              <DialogDescription>
                This action cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Message preview */}
        <div className="bg-muted/30 space-y-3 rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={message.authorAvatarUrl} />
              <AvatarFallback className="text-xs">
                {message.authorName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {message.authorName}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(message.createdAt)} at{" "}
                {formatTime(message.createdAt)}
              </p>
            </div>
          </div>

          <p className="whitespace-pre-wrap break-words pl-11 text-sm">
            {truncateText(message.content, 200)}
          </p>

          {message.hasAttachments && (
            <p className="pl-11 text-xs text-muted-foreground">
              + {message.attachmentCount || 1} attachment
              {(message.attachmentCount || 1) > 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Warning */}
        <div className="bg-destructive/5 border-destructive/20 flex items-start gap-3 rounded-lg border p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p className="text-sm text-muted-foreground">
            {deleteForEveryone
              ? "This message will be permanently deleted for everyone in this conversation."
              : "This message will only be hidden from your view. Others will still be able to see it."}
          </p>
        </div>

        {/* Delete for everyone option */}
        {canDeleteForEveryone && (
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label
                htmlFor="delete-for-everyone"
                className="cursor-pointer text-sm font-medium"
              >
                Delete for everyone
              </Label>
              <p className="text-xs text-muted-foreground">
                Remove this message for all members
              </p>
            </div>
            <Switch
              id="delete-for-everyone"
              checked={deleteForEveryone}
              onCheckedChange={setDeleteForEveryone}
              disabled={loading}
            />
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
