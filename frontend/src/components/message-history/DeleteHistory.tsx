"use client";

import { useState } from "react";
import { Trash2, AlertTriangle, Loader2, ShieldAlert } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { MessageEditHistory, MessageVersion } from "@/lib/message-history";

export interface DeleteHistoryProps {
  /** The message history to delete */
  history: MessageEditHistory;
  /** Callback when deletion is confirmed */
  onDelete: (keepOriginal: boolean, reason?: string) => Promise<void>;
  /** Whether deletion is in progress */
  isDeleting?: boolean;
  /** Whether the user can delete (has permission) */
  canDelete?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Admin control to clear/delete message edit history.
 * Can optionally keep the original version.
 */
export function DeleteHistory({
  history,
  onDelete,
  isDeleting = false,
  canDelete = true,
  className,
}: DeleteHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [keepOriginal, setKeepOriginal] = useState(true);
  const [reason, setReason] = useState("");

  const handleDelete = async () => {
    await onDelete(keepOriginal, reason || undefined);
    setShowConfirm(false);
    setIsOpen(false);
    setReason("");
    setKeepOriginal(true);
  };

  if (!canDelete) {
    return null;
  }

  // Don't show if there's only the original version
  if (history.versions.length <= 1) {
    return null;
  }

  const versionsToDelete = keepOriginal
    ? history.versions.length - 1
    : history.versions.length;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="destructive"
            size="sm"
            className={cn("gap-2", className)}
          >
            <Trash2 className="h-4 w-4" />
            Clear History
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Clear Edit History
            </DialogTitle>
            <DialogDescription>
              This will permanently delete the edit history for this message.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* History summary */}
            <div className="rounded-md border p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Message ID:</span>
                  <p className="font-mono text-xs">{history.messageId}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total versions:</span>
                  <p className="font-medium">{history.versions.length}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Edit count:</span>
                  <p className="font-medium">{history.editCount}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Author:</span>
                  <p>{history.author.displayName}</p>
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="keep-original"
                  checked={keepOriginal}
                  onCheckedChange={(checked) =>
                    setKeepOriginal(checked === true)
                  }
                />
                <Label htmlFor="keep-original">
                  Keep original version (recommended)
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                {keepOriginal
                  ? `This will delete ${versionsToDelete} version${
                      versionsToDelete !== 1 ? "s" : ""
                    } and keep the original message.`
                  : "This will delete ALL versions including the original. The message will have no edit history."}
              </p>
            </div>

            {/* Reason field */}
            <div className="space-y-2">
              <Label htmlFor="delete-reason">
                Reason for deletion (optional)
              </Label>
              <Textarea
                id="delete-reason"
                placeholder="Enter a reason for clearing the history..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                This action is irreversible. All selected edit history will be
                permanently deleted. This action will be logged in the audit
                trail.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => setShowConfirm(true)}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Final confirmation dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete {versionsToDelete} version
              {versionsToDelete !== 1 ? "s" : ""} from this message&apos;s edit
              history. This action cannot be undone.
              {!keepOriginal && (
                <span className="mt-2 block font-medium text-destructive">
                  Warning: You are also deleting the original version!
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete History
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
 * Delete specific versions from history.
 */
export interface DeleteVersionsProps {
  /** Available versions */
  versions: MessageVersion[];
  /** Currently selected version IDs */
  selectedIds: string[];
  /** Toggle selection callback */
  onToggleSelect: (versionId: string) => void;
  /** Delete selected versions callback */
  onDelete: (versionIds: string[]) => Promise<void>;
  /** Whether deletion is in progress */
  isDeleting?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function DeleteVersions({
  versions,
  selectedIds,
  onToggleSelect,
  onDelete,
  isDeleting = false,
  className,
}: DeleteVersionsProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  // Can't delete original or current versions
  const deletableVersions = versions.filter(
    (v) => !v.isOriginal && !v.isCurrent,
  );

  if (deletableVersions.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        No versions available for deletion. Original and current versions cannot
        be deleted.
      </p>
    );
  }

  const handleDelete = async () => {
    await onDelete(selectedIds);
    setShowConfirm(false);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        {deletableVersions.map((version) => (
          <div
            key={version.id}
            className="flex items-center space-x-3 rounded-md border p-3"
          >
            <Checkbox
              id={`version-${version.id}`}
              checked={selectedIds.includes(version.id)}
              onCheckedChange={() => onToggleSelect(version.id)}
            />
            <Label
              htmlFor={`version-${version.id}`}
              className="flex-1 cursor-pointer"
            >
              <span className="font-medium">
                Version {version.versionNumber}
              </span>
              <span className="ml-2 text-sm text-muted-foreground">
                by {version.editedBy.displayName}
              </span>
            </Label>
          </div>
        ))}
      </div>

      <Button
        variant="destructive"
        size="sm"
        disabled={selectedIds.length === 0 || isDeleting}
        onClick={() => setShowConfirm(true)}
        className="gap-2"
      >
        <Trash2 className="h-4 w-4" />
        Delete Selected ({selectedIds.length})
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Versions</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.length} version
              {selectedIds.length !== 1 ? "s" : ""}? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
