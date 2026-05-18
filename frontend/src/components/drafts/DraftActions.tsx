"use client";

/**
 * DraftActions - Action buttons for draft management
 *
 * Send, edit, delete draft actions
 */

import * as React from "react";
import { useState, useCallback } from "react";
import {
  Send,
  Edit,
  Trash2,
  MoreHorizontal,
  Copy,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Draft } from "@/lib/drafts/draft-types";

// ============================================================================
// Types
// ============================================================================

export interface DraftActionsProps {
  /** The draft to act upon */
  draft: Draft;
  /** Layout variant */
  variant?: "buttons" | "icons" | "dropdown";
  /** Button size */
  size?: "sm" | "default" | "lg";
  /** Show labels on buttons */
  showLabels?: boolean;
  /** Disable all actions */
  disabled?: boolean;

  /** Called when user wants to send the draft */
  onSend?: (draft: Draft) => void | Promise<void>;
  /** Called when user wants to edit the draft */
  onEdit?: (draft: Draft) => void | Promise<void>;
  /** Called when user wants to delete the draft */
  onDelete?: (draft: Draft) => void | Promise<void>;
  /** Called when user wants to copy the draft content */
  onCopy?: (draft: Draft) => void | Promise<void>;
  /** Called when user wants to restore the draft */
  onRestore?: (draft: Draft) => void | Promise<void>;

  /** Additional class names */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function DraftActions({
  draft,
  variant = "buttons",
  size = "default",
  showLabels = true,
  disabled = false,
  onSend,
  onEdit,
  onDelete,
  onCopy,
  onRestore,
  className,
}: DraftActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState<"send" | "delete" | null>(null);

  // Handlers
  const handleSend = useCallback(async () => {
    if (!onSend) return;
    setIsLoading("send");
    try {
      await onSend(draft);
    } finally {
      setIsLoading(null);
    }
  }, [onSend, draft]);

  const handleEdit = useCallback(() => {
    onEdit?.(draft);
  }, [onEdit, draft]);

  const handleDeleteClick = useCallback(() => {
    setShowDeleteDialog(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!onDelete) return;
    setIsLoading("delete");
    try {
      await onDelete(draft);
    } finally {
      setIsLoading(null);
      setShowDeleteDialog(false);
    }
  }, [onDelete, draft]);

  const handleCopy = useCallback(async () => {
    if (onCopy) {
      await onCopy(draft);
    } else {
      // Default copy behavior
      await navigator.clipboard.writeText(draft.content);
    }
  }, [onCopy, draft]);

  const handleRestore = useCallback(() => {
    onRestore?.(draft);
  }, [onRestore, draft]);

  // Render based on variant
  if (variant === "dropdown") {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" disabled={disabled}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onRestore && (
              <DropdownMenuItem onClick={handleRestore}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Restore to composer
              </DropdownMenuItem>
            )}
            {onEdit && (
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit draft
              </DropdownMenuItem>
            )}
            {onSend && (
              <DropdownMenuItem onClick={handleSend}>
                <Send className="mr-2 h-4 w-4" />
                Send now
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleCopy}>
              <Copy className="mr-2 h-4 w-4" />
              Copy content
            </DropdownMenuItem>
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDeleteClick}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete draft
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DeleteDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={handleDeleteConfirm}
          isLoading={isLoading === "delete"}
        />
      </>
    );
  }

  if (variant === "icons") {
    return (
      <>
        <TooltipProvider delayDuration={300}>
          <div className={cn("flex items-center gap-1", className)}>
            {onRestore && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRestore}
                    disabled={disabled}
                    className="h-8 w-8 p-0"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Restore to composer</TooltipContent>
              </Tooltip>
            )}

            {onEdit && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEdit}
                    disabled={disabled}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit draft</TooltipContent>
              </Tooltip>
            )}

            {onSend && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSend}
                    disabled={disabled || isLoading === "send"}
                    className="h-8 w-8 p-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Send now</TooltipContent>
              </Tooltip>
            )}

            {onDelete && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteClick}
                    disabled={disabled || isLoading === "delete"}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete draft</TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>

        <DeleteDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={handleDeleteConfirm}
          isLoading={isLoading === "delete"}
        />
      </>
    );
  }

  // Default: buttons variant
  return (
    <>
      <div className={cn("flex items-center gap-2", className)}>
        {onRestore && (
          <Button
            variant="outline"
            size={size}
            onClick={handleRestore}
            disabled={disabled}
            className="gap-1.5"
          >
            <RefreshCw className="h-4 w-4" />
            {showLabels && "Restore"}
          </Button>
        )}

        {onEdit && (
          <Button
            variant="outline"
            size={size}
            onClick={handleEdit}
            disabled={disabled}
            className="gap-1.5"
          >
            <Edit className="h-4 w-4" />
            {showLabels && "Edit"}
          </Button>
        )}

        {onSend && (
          <Button
            variant="default"
            size={size}
            onClick={handleSend}
            disabled={disabled || isLoading === "send"}
            className="gap-1.5"
          >
            <Send className="h-4 w-4" />
            {showLabels && (isLoading === "send" ? "Sending..." : "Send")}
          </Button>
        )}

        {onDelete && (
          <Button
            variant="ghost"
            size={size}
            onClick={handleDeleteClick}
            disabled={disabled || isLoading === "delete"}
            className="gap-1.5 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            {showLabels && "Delete"}
          </Button>
        )}
      </div>

      <DeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeleteConfirm}
        isLoading={isLoading === "delete"}
      />
    </>
  );
}

// ============================================================================
// Delete Dialog
// ============================================================================

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

function DeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: DeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete draft?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this draft. This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
          >
            {isLoading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DraftActions;
