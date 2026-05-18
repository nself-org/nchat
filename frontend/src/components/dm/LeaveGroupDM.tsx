"use client";

import * as React from "react";
import { LogOut, AlertTriangle } from "lucide-react";
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
import type { DirectMessage } from "@/lib/dm/dm-types";
import { getLeaveConsequences } from "@/lib/dm";
import { useDMStore } from "@/stores/dm-store";

// ============================================================================
// Types
// ============================================================================

interface LeaveGroupDMProps {
  dm: DirectMessage;
  currentUserId: string;
  onLeave?: () => void;
  variant?: "button" | "menuItem";
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function LeaveGroupDM({
  dm,
  currentUserId,
  onLeave,
  variant = "button",
  className,
}: LeaveGroupDMProps) {
  const { removeParticipant, removeDM } = useDMStore();
  const [open, setOpen] = React.useState(false);

  const consequences = getLeaveConsequences(dm, currentUserId);

  const handleLeave = () => {
    if (consequences.willDeleteGroup) {
      // If last member, delete the group
      removeDM(dm.id);
    } else {
      // Otherwise just remove self from participants
      removeParticipant(dm.id, currentUserId);
    }

    setOpen(false);
    onLeave?.();
  };

  // Don't show if user is not in the group
  if (!consequences.canLeave) {
    return null;
  }

  const getDialogContent = () => {
    if (consequences.willDeleteGroup) {
      return {
        title: "Delete group?",
        description:
          "You are the last member of this group. Leaving will permanently delete it and all messages.",
        actionText: "Leave & Delete",
        showWarning: true,
      };
    }

    if (consequences.requiresOwnerTransfer) {
      return {
        title: "Transfer ownership first",
        description: (
          <>
            You are the owner of this group. Please transfer ownership to{" "}
            <strong>
              {consequences.suggestedNewOwner?.user.displayName ||
                "another member"}
            </strong>{" "}
            before leaving.
          </>
        ),
        actionText: "OK",
        cannotLeave: true,
      };
    }

    return {
      title: "Leave group?",
      description: `Are you sure you want to leave "${dm.name || "this group"}"? You will no longer receive messages, but you can be added back by a member.`,
      actionText: "Leave",
      showWarning: false,
    };
  };

  const dialogContent = getDialogContent();

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {variant === "button" ? (
          <Button variant="outline" className={className}>
            <LogOut className="mr-2 h-4 w-4" />
            Leave group
          </Button>
        ) : (
          <button className={className}>
            <LogOut className="mr-2 h-4 w-4" />
            Leave group
          </button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {dialogContent.showWarning && (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            )}
            {dialogContent.title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {dialogContent.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {!dialogContent.cannotLeave && (
            <AlertDialogAction
              onClick={handleLeave}
              className={
                dialogContent.showWarning
                  ? "hover:bg-destructive/90 bg-destructive text-destructive-foreground"
                  : undefined
              }
            >
              {dialogContent.actionText}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

LeaveGroupDM.displayName = "LeaveGroupDM";
