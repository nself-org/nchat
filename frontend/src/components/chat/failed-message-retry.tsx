"use client";

import { useState, memo, useCallback } from "react";
import { AlertCircle, RefreshCw, Trash2, ChevronDown, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface FailedMessageRetryProps {
  /** Unique message ID */
  messageId: string;
  /** The message content that failed */
  content: string;
  /** Error message describing the failure */
  errorMessage?: string;
  /** Number of retry attempts */
  retryCount?: number;
  /** Maximum retry attempts before giving up */
  maxRetries?: number;
  /** Whether a retry is currently in progress */
  isRetrying?: boolean;
  /** Callback to retry sending the message */
  onRetry: (messageId: string) => void | Promise<void>;
  /** Callback to delete the failed message */
  onDelete: (messageId: string) => void;
  /** Callback to dismiss the error */
  onDismiss?: (messageId: string) => void;
  /** Display variant */
  variant?: "inline" | "banner" | "toast";
  /** Additional CSS classes */
  className?: string;
}

export interface FailedMessageBannerProps {
  /** Number of failed messages */
  failedCount: number;
  /** Callback to retry all failed messages */
  onRetryAll: () => void;
  /** Callback to clear all failed messages */
  onClearAll: () => void;
  /** Whether retrying is in progress */
  isRetrying?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Delete confirmation dialog
 */
const DeleteConfirmDialog = memo(function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete failed message?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove the message from your draft queue. This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});

// ============================================================================
// Inline Variant
// ============================================================================

/**
 * Inline failed message indicator
 * Shows within the message bubble
 */
const InlineFailedIndicator = memo(function InlineFailedIndicator({
  messageId,
  errorMessage,
  retryCount = 0,
  maxRetries = 3,
  isRetrying = false,
  onRetry,
  onDelete,
  className,
}: Omit<FailedMessageRetryProps, "content" | "variant">) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const canRetry = retryCount < maxRetries;

  const handleRetry = useCallback(() => {
    onRetry(messageId);
  }, [messageId, onRetry]);

  const handleDelete = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const confirmDelete = useCallback(() => {
    onDelete(messageId);
    setShowDeleteConfirm(false);
  }, [messageId, onDelete]);

  return (
    <>
      <div
        className={cn(
          "bg-destructive/10 flex items-center gap-2 rounded-md px-2 py-1.5 text-destructive",
          className,
        )}
      >
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-xs">
          {errorMessage || "Failed to send"}
          {retryCount > 0 && ` (attempt ${retryCount}/${maxRetries})`}
        </span>

        <div className="flex items-center gap-1">
          {canRetry && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-destructive/20 h-6 w-6 text-destructive hover:text-destructive"
                    onClick={handleRetry}
                    disabled={isRetrying}
                  >
                    <RefreshCw
                      className={cn(
                        "h-3.5 w-3.5",
                        isRetrying && "animate-spin",
                      )}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Retry</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-destructive/20 h-6 w-6 text-destructive hover:text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <DeleteConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={confirmDelete}
      />
    </>
  );
});

// ============================================================================
// Banner Variant
// ============================================================================

/**
 * Banner for multiple failed messages
 */
export const FailedMessageBanner = memo(function FailedMessageBanner({
  failedCount,
  onRetryAll,
  onClearAll,
  isRetrying = false,
  className,
}: FailedMessageBannerProps) {
  if (failedCount === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "border-destructive/50 bg-destructive/10 flex items-center justify-between gap-3 rounded-lg border px-4 py-3",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-destructive" />
        <span className="text-sm font-medium text-destructive">
          {failedCount} message{failedCount !== 1 ? "s" : ""} failed to send
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="border-destructive/50 hover:bg-destructive/20 text-destructive"
          onClick={onRetryAll}
          disabled={isRetrying}
        >
          {isRetrying ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Retrying...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry all
            </>
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="hover:bg-destructive/20 text-destructive"
          onClick={onClearAll}
        >
          Clear all
        </Button>
      </div>
    </motion.div>
  );
});

// ============================================================================
// Toast Variant
// ============================================================================

/**
 * Toast-style failed message indicator
 */
const ToastFailedIndicator = memo(function ToastFailedIndicator({
  messageId,
  content,
  errorMessage,
  isRetrying = false,
  onRetry,
  onDelete,
  onDismiss,
  className,
}: Omit<FailedMessageRetryProps, "variant">) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleRetry = useCallback(() => {
    onRetry(messageId);
  }, [messageId, onRetry]);

  const handleDismiss = useCallback(() => {
    onDismiss?.(messageId);
  }, [messageId, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      className={cn(
        "border-destructive/50 w-80 rounded-lg border bg-background shadow-lg",
        className,
      )}
    >
      {/* Header */}
      <div className="border-destructive/30 flex items-center justify-between gap-2 border-b px-4 py-2">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Message failed</span>
        </div>
        {onDismiss && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-sm text-muted-foreground">
          {errorMessage || "Failed to send message"}
        </p>

        {/* Expandable message preview */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 flex w-full items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform",
              isExpanded && "rotate-180",
            )}
          />
          {isExpanded ? "Hide message" : "Show message"}
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 rounded-md bg-muted p-2 text-sm">
                {content.length > 200 ? `${content.slice(0, 200)}...` : content}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 border-t px-4 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(messageId)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
        <Button size="sm" onClick={handleRetry} disabled={isRetrying}>
          {isRetrying ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Retrying...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
});

// ============================================================================
// Main Component
// ============================================================================

/**
 * Failed Message Retry Component
 *
 * Shows a failed message indicator with retry and delete options.
 * Supports multiple display variants:
 * - inline: Within the message bubble
 * - banner: Top banner for multiple failures
 * - toast: Floating toast notification
 */
export const FailedMessageRetry = memo(function FailedMessageRetry({
  variant = "inline",
  ...props
}: FailedMessageRetryProps) {
  switch (variant) {
    case "toast":
      return <ToastFailedIndicator {...props} />;
    case "inline":
    default:
      return <InlineFailedIndicator {...props} />;
  }
});

// ============================================================================
// Failed Messages Container
// ============================================================================

export interface FailedMessagesContainerProps {
  /** List of failed messages */
  failedMessages: Array<{
    id: string;
    content: string;
    error?: string;
    retryCount?: number;
  }>;
  /** Callback to retry a message */
  onRetry: (messageId: string) => void;
  /** Callback to delete a message */
  onDelete: (messageId: string) => void;
  /** Callback to retry all messages */
  onRetryAll: () => void;
  /** Callback to clear all messages */
  onClearAll: () => void;
  /** Whether currently retrying */
  isRetrying?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Container for multiple failed message toasts
 */
export const FailedMessagesContainer = memo(function FailedMessagesContainer({
  failedMessages,
  onRetry,
  onDelete,
  onRetryAll,
  onClearAll,
  isRetrying = false,
  className,
}: FailedMessagesContainerProps) {
  if (failedMessages.length === 0) {
    return null;
  }

  return (
    <div className={cn("fixed bottom-4 right-4 z-50 space-y-2", className)}>
      <AnimatePresence mode="popLayout">
        {failedMessages.slice(0, 3).map((msg) => (
          <ToastFailedIndicator
            key={msg.id}
            messageId={msg.id}
            content={msg.content}
            errorMessage={msg.error}
            retryCount={msg.retryCount}
            isRetrying={isRetrying}
            onRetry={onRetry}
            onDelete={onDelete}
          />
        ))}

        {failedMessages.length > 3 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="rounded-lg border bg-background p-3 shadow-lg"
          >
            <p className="text-sm text-muted-foreground">
              +{failedMessages.length - 3} more failed message
              {failedMessages.length - 3 !== 1 ? "s" : ""}
            </p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" onClick={onRetryAll}>
                Retry all
              </Button>
              <Button size="sm" variant="ghost" onClick={onClearAll}>
                Clear all
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default FailedMessageRetry;
