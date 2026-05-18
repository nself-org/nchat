"use client";

import { useState } from "react";
import { RotateCcw, AlertTriangle, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { formatMessageTime } from "@/lib/date";
import type { MessageVersion, MessageEditHistory } from "@/lib/message-history";

export interface RestoreVersionProps {
  /** The version to restore */
  version: MessageVersion;
  /** Full history for context */
  history: MessageEditHistory;
  /** Callback when restore is confirmed */
  onRestore: (version: MessageVersion, reason?: string) => Promise<void>;
  /** Whether restore is in progress */
  isRestoring?: boolean;
  /** Whether the user can restore (has permission) */
  canRestore?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Admin control to restore a message to a previous version.
 * Creates a new version with the old content.
 */
export function RestoreVersion({
  version,
  history,
  onRestore,
  isRestoring = false,
  canRestore = true,
  className,
}: RestoreVersionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [reason, setReason] = useState("");

  const handleRestore = async () => {
    await onRestore(version, reason || undefined);
    setShowConfirm(false);
    setIsOpen(false);
    setReason("");
  };

  if (!canRestore) {
    return null;
  }

  // Don't show restore for current version
  if (version.isCurrent) {
    return null;
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("gap-2", className)}
          >
            <RotateCcw className="h-4 w-4" />
            Restore
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Restore to Version {version.versionNumber}
            </DialogTitle>
            <DialogDescription>
              This will create a new version of the message with the content
              from version {version.versionNumber}. The current content will be
              preserved in the edit history.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Version info */}
            <div className="rounded-md border p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">
                  Version {version.versionNumber}
                  {version.isOriginal && " (original)"}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatMessageTime(version.createdAt)}
                </span>
              </div>
              <div className="bg-muted/50 rounded-md p-3">
                <pre className="max-h-[200px] overflow-auto whitespace-pre-wrap font-mono text-sm">
                  {version.content}
                </pre>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Edited by {version.editedBy.displayName}
              </p>
            </div>

            {/* Current content comparison */}
            <div className="rounded-md border p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">Current Version</span>
                <span className="text-sm text-muted-foreground">
                  Will be replaced
                </span>
              </div>
              <div className="bg-muted/50 rounded-md p-3">
                <pre className="max-h-[100px] overflow-auto whitespace-pre-wrap font-mono text-sm">
                  {history.currentContent}
                </pre>
              </div>
            </div>

            {/* Reason field */}
            <div className="space-y-2">
              <Label htmlFor="restore-reason">
                Reason for restore (optional)
              </Label>
              <Textarea
                id="restore-reason"
                placeholder="Enter a reason for restoring this version..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This action will be logged in the audit trail. The message
                author and other users will see the restored content.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowConfirm(true)}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Restore</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore this message to version{" "}
              {version.versionNumber}? This action cannot be undone but will be
              recorded in the edit history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRestoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={isRestoring}>
              {isRestoring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restore
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * Inline restore button for history list items.
 */
export interface RestoreButtonProps {
  /** The version to restore */
  version: MessageVersion;
  /** Callback when clicked */
  onClick: () => void;
  /** Whether restore is in progress */
  isLoading?: boolean;
  /** Whether disabled */
  disabled?: boolean;
  /** Size variant */
  size?: "sm" | "default";
  /** Additional CSS classes */
  className?: string;
}

export function RestoreButton({
  version,
  onClick,
  isLoading = false,
  disabled = false,
  size = "sm",
  className,
}: RestoreButtonProps) {
  if (version.isCurrent) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn("gap-1", className)}
    >
      {isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <RotateCcw className="h-3 w-3" />
      )}
      <span>Restore</span>
    </Button>
  );
}

/**
 * Restore success indicator.
 */
export interface RestoreSuccessProps {
  /** The restored version number */
  versionNumber: number;
  /** When restore occurred */
  restoredAt: Date;
  /** Additional CSS classes */
  className?: string;
}

export function RestoreSuccess({
  versionNumber,
  restoredAt,
  className,
}: RestoreSuccessProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md bg-green-50 p-3 text-green-700 dark:bg-green-950 dark:text-green-300",
        className,
      )}
    >
      <Check className="h-4 w-4" />
      <span>
        Successfully restored to version {versionNumber} at{" "}
        {formatMessageTime(restoredAt)}
      </span>
    </div>
  );
}
