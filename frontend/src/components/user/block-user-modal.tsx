"use client";

/**
 * BlockUserModal - Confirmation modal for blocking a user
 *
 * Displays what happens when a user is blocked and provides
 * confirmation and cancel buttons.
 */

import * as React from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useBlock } from "@/lib/moderation/use-block";
import { cn } from "@/lib/utils";
import { Ban, MessageSquareOff, EyeOff, UserX, Loader2 } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface BlockUserModalProps {
  /** Whether the modal is open (controlled mode) */
  open?: boolean;
  /** Callback when open state changes (controlled mode) */
  onOpenChange?: (open: boolean) => void;
  /** User to block (optional, uses store state if not provided) */
  user?: {
    userId: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  /** Callback after successful block */
  onBlocked?: () => void;
  /** Additional class name */
  className?: string;
}

// ============================================================================
// Consequences List
// ============================================================================

const BLOCK_CONSEQUENCES = [
  {
    icon: MessageSquareOff,
    title: "No direct messages",
    description: "They will not be able to send you direct messages",
  },
  {
    icon: EyeOff,
    title: "Hidden messages",
    description: "Their messages in channels will be hidden from you",
  },
  {
    icon: UserX,
    title: "Removed from DM list",
    description: "They will not appear in your direct messages list",
  },
];

// ============================================================================
// Component
// ============================================================================

export function BlockUserModal({
  open,
  onOpenChange,
  user: propUser,
  onBlocked,
  className,
}: BlockUserModalProps) {
  const { blockUser, closeBlockModal, blockModalState, isBlocking, error } =
    useBlock();

  // Use prop user or modal state
  const targetUser = propUser || blockModalState.target;
  const isOpen = open ?? blockModalState.isOpen;

  // Handle close
  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        if (onOpenChange) {
          onOpenChange(false);
        } else {
          closeBlockModal();
        }
      }
    },
    [onOpenChange, closeBlockModal],
  );

  // Handle block confirmation
  const handleBlock = React.useCallback(async () => {
    if (!targetUser) return;

    try {
      await blockUser(
        targetUser.userId,
        targetUser.username,
        targetUser.displayName,
        targetUser.avatarUrl,
      );
      onBlocked?.();
      handleOpenChange(false);
    } catch {
      // Error is handled in the hook
    }
  }, [targetUser, blockUser, onBlocked, handleOpenChange]);

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!targetUser) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent className={cn("sm:max-w-md", className)}>
        <AlertDialogHeader>
          <div className="mb-2 flex items-center gap-3">
            <div className="bg-destructive/10 flex h-10 w-10 items-center justify-center rounded-full">
              <Ban className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle>Block {targetUser.displayName}?</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {/* User preview */}
              <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={targetUser.avatarUrl}
                    alt={targetUser.displayName}
                  />
                  <AvatarFallback>
                    {getInitials(targetUser.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">
                    {targetUser.displayName}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    @{targetUser.username}
                  </p>
                </div>
              </div>

              {/* Consequences list */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">
                  When you block this user:
                </p>
                <ul className="space-y-2">
                  {BLOCK_CONSEQUENCES.map((consequence, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <consequence.icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {consequence.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {consequence.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Note about unblocking */}
              <p className="text-xs text-muted-foreground">
                You can unblock this user anytime from your settings.
              </p>

              {/* Error message */}
              {error && (
                <p className="bg-destructive/10 rounded p-2 text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel asChild>
            <Button variant="outline" disabled={isBlocking}>
              Cancel
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant="destructive"
              onClick={handleBlock}
              disabled={isBlocking}
            >
              {isBlocking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Blocking...
                </>
              ) : (
                <>
                  <Ban className="mr-2 h-4 w-4" />
                  Block User
                </>
              )}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default BlockUserModal;
