"use client";

import * as React from "react";
import { useState } from "react";
import { Check, Plus, Lock, Loader2, LogOut } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ============================================================================
// Types
// ============================================================================

export interface JoinChannelButtonProps {
  channelId: string;
  channelName?: string;
  isJoined?: boolean;
  isPrivate?: boolean;
  isPending?: boolean;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "ghost";
  showLeaveConfirm?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onJoin?: (channelId: string) => Promise<void>;
  onLeave?: (channelId: string) => Promise<void>;
  onRequestAccess?: (channelId: string) => Promise<void>;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function JoinChannelButton({
  channelId,
  channelName,
  isJoined = false,
  isPrivate = false,
  isPending = false,
  size = "default",
  variant = "default",
  showLeaveConfirm = true,
  onClick,
  onJoin,
  onLeave,
  onRequestAccess,
  className,
}: JoinChannelButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (onClick) {
      onClick(e);
      return;
    }

    if (isLoading) return;

    try {
      setIsLoading(true);

      if (isJoined) {
        if (showLeaveConfirm) {
          setShowLeaveDialog(true);
          setIsLoading(false);
          return;
        }
        await onLeave?.(channelId);
      } else if (isPrivate) {
        await onRequestAccess?.(channelId);
      } else {
        await onJoin?.(channelId);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveConfirm = async () => {
    try {
      setIsLoading(true);
      await onLeave?.(channelId);
    } finally {
      setIsLoading(false);
      setShowLeaveDialog(false);
    }
  };

  // Pending state (waiting for approval)
  if (isPending) {
    return (
      <Button
        variant="outline"
        size={size}
        disabled
        className={cn("pointer-events-none", className)}
      >
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Pending
      </Button>
    );
  }

  // Already joined
  if (isJoined) {
    const leaveButton = (
      <Button
        variant="outline"
        size={size}
        onClick={showLeaveConfirm ? undefined : handleClick}
        disabled={isLoading}
        className={cn(
          "group hover:border-destructive hover:bg-destructive hover:text-destructive-foreground",
          className,
        )}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <>
            <Check className="mr-2 h-4 w-4 group-hover:hidden" />
            <LogOut className="mr-2 hidden h-4 w-4 group-hover:block" />
          </>
        )}
        <span className="group-hover:hidden">Joined</span>
        <span className="hidden group-hover:inline">Leave</span>
      </Button>
    );

    if (showLeaveConfirm) {
      return (
        <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
          <AlertDialogTrigger asChild>{leaveButton}</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave channel?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to leave{" "}
                {channelName ? (
                  <span className="font-semibold">#{channelName}</span>
                ) : (
                  "this channel"
                )}
                ? You can rejoin at any time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLeaveConfirm}
                className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Leave Channel
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    }

    return leaveButton;
  }

  // Private channel - request access
  if (isPrivate) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={isLoading}
        className={className}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Lock className="mr-2 h-4 w-4" />
        )}
        Request Access
      </Button>
    );
  }

  // Public channel - join
  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Plus className="mr-2 h-4 w-4" />
      )}
      Join
    </Button>
  );
}

JoinChannelButton.displayName = "JoinChannelButton";
