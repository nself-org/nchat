"use client";

/**
 * DraftCard - Card component for displaying a draft in a list
 *
 * Full draft preview with actions
 */

import * as React from "react";
import { useState, useCallback } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Hash,
  MessageSquare,
  User,
  Paperclip,
  Reply,
  Trash2,
  Send,
  Edit,
  MoreHorizontal,
  Clock,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import type { Draft, DraftContextType } from "@/lib/drafts/draft-types";
import { getDraftPreview } from "@/lib/drafts";

// ============================================================================
// Types
// ============================================================================

export interface DraftCardProps {
  /** The draft to display */
  draft: Draft;
  /** Context name (e.g., channel name) */
  contextName?: string;
  /** Whether the card is selected */
  isSelected?: boolean;
  /** Show actions */
  showActions?: boolean;
  /** Compact mode */
  compact?: boolean;

  /** Called when draft should be restored to composer */
  onRestore?: (draft: Draft) => void;
  /** Called when draft should be sent */
  onSend?: (draft: Draft) => void;
  /** Called when draft should be edited */
  onEdit?: (draft: Draft) => void;
  /** Called when draft should be deleted */
  onDelete?: (draft: Draft) => void;
  /** Called when card is clicked */
  onClick?: (draft: Draft) => void;

  /** Additional class names */
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getContextIcon(type: DraftContextType) {
  switch (type) {
    case "channel":
      return Hash;
    case "thread":
      return MessageSquare;
    case "dm":
      return User;
    default:
      return FileText;
  }
}

function getContextLabel(type: DraftContextType): string {
  switch (type) {
    case "channel":
      return "Channel";
    case "thread":
      return "Thread";
    case "dm":
      return "Direct Message";
    default:
      return "Draft";
  }
}

// ============================================================================
// Component
// ============================================================================

export function DraftCard({
  draft,
  contextName,
  isSelected = false,
  showActions = true,
  compact = false,
  onRestore,
  onSend,
  onEdit,
  onDelete,
  onClick,
  className,
}: DraftCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const ContextIcon = getContextIcon(draft.contextType);
  const preview = getDraftPreview(draft, compact ? 80 : 150);
  const attachmentCount =
    draft.attachmentIds.length || draft.attachments?.length || 0;
  const isReply = draft.replyToMessageId !== null;

  // Format the timestamp
  const timestamp = formatDistanceToNow(new Date(draft.lastModified), {
    addSuffix: true,
  });
  const fullTimestamp = format(
    new Date(draft.lastModified),
    "MMM d, yyyy h:mm a",
  );

  // Handlers
  const handleClick = useCallback(() => {
    onClick?.(draft);
  }, [onClick, draft]);

  const handleRestore = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRestore?.(draft);
    },
    [onRestore, draft],
  );

  const handleSend = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSend?.(draft);
    },
    [onSend, draft],
  );

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onEdit?.(draft);
    },
    [onEdit, draft],
  );

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    onDelete?.(draft);
    setShowDeleteDialog(false);
  }, [onDelete, draft]);

  return (
    <>
      <Card
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          isSelected && "ring-2 ring-primary",
          onClick && "hover:bg-accent/50",
          className,
        )}
        onClick={handleClick}
      >
        <CardContent className={cn("p-4", compact && "p-3")}>
          {/* Header */}
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                <ContextIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">
                    {contextName || draft.contextId}
                  </span>
                  {isReply && (
                    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                      <Reply className="h-3 w-3" />
                      Reply
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span title={fullTimestamp}>{timestamp}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  asChild
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onRestore && (
                    <DropdownMenuItem onClick={handleRestore}>
                      <Edit className="mr-2 h-4 w-4" />
                      Continue editing
                    </DropdownMenuItem>
                  )}
                  {onSend && (
                    <DropdownMenuItem onClick={handleSend}>
                      <Send className="mr-2 h-4 w-4" />
                      Send now
                    </DropdownMenuItem>
                  )}
                  {(onRestore || onSend) && onDelete && (
                    <DropdownMenuSeparator />
                  )}
                  {onDelete && (
                    <DropdownMenuItem
                      onClick={handleDeleteClick}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete draft
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Content preview */}
          <div className="space-y-2">
            <p
              className={cn(
                "text-sm text-foreground",
                compact ? "line-clamp-2" : "line-clamp-3",
              )}
            >
              {preview || (
                <span className="italic text-muted-foreground">
                  {attachmentCount > 0
                    ? `${attachmentCount} attachment${attachmentCount > 1 ? "s" : ""}`
                    : "Empty draft"}
                </span>
              )}
            </p>

            {/* Attachments indicator */}
            {attachmentCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Paperclip className="h-3 w-3" />
                <span>
                  {attachmentCount} attachment{attachmentCount > 1 ? "s" : ""}
                </span>
              </div>
            )}

            {/* Reply preview */}
            {isReply && draft.replyToPreview && !compact && (
              <div className="border-l-2 border-muted pl-2 text-xs text-muted-foreground">
                <span className="font-medium">
                  {draft.replyToPreview.userName}:
                </span>{" "}
                <span className="truncate">{draft.replyToPreview.content}</span>
              </div>
            )}
          </div>

          {/* Quick actions (if not in dropdown) */}
          {!compact && showActions && (
            <div className="mt-3 flex items-center gap-2 border-t pt-3">
              {onRestore && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRestore}
                  className="gap-1.5"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </Button>
              )}
              {onSend && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSend}
                  className="gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  Send
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteClick}
                  className="ml-auto gap-1.5 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this draft. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default DraftCard;
