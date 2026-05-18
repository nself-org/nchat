"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import type { PinnedMessage } from "@/lib/pinned";

export interface UnpinConfirmProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog is closed */
  onOpenChange: (open: boolean) => void;
  /** The pinned message to unpin */
  pin: PinnedMessage | null;
  /** Callback when unpin is confirmed */
  onConfirm: (pin: PinnedMessage) => void;
  /** Whether unpin is in progress */
  isLoading?: boolean;
}

/**
 * Confirmation dialog for unpinning a message.
 */
export function UnpinConfirm({
  open,
  onOpenChange,
  pin,
  onConfirm,
  isLoading = false,
}: UnpinConfirmProps) {
  const handleConfirm = () => {
    if (pin) {
      onConfirm(pin);
    }
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength).trim() + "...";
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unpin message?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                This will remove the message from the pinned messages list. The
                message will remain in the channel.
              </p>
              {pin && (
                <div className="bg-muted/50 rounded-md border p-3">
                  <p className="mb-1 text-sm font-medium">
                    {pin.message.user.displayName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {truncateContent(pin.message.content)}
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
          >
            {isLoading ? "Unpinning..." : "Unpin"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
