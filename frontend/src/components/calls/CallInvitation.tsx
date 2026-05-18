/**
 * CallInvitation Component
 *
 * Full-screen modal for incoming call invitations.
 * Shows caller info, ring animation, and accept/decline actions.
 */

"use client";

import { useEffect, useState } from "react";
import { Phone, PhoneOff, Video, User } from "lucide-react";
import { CallInvitation as CallInvitationType } from "@/lib/calls";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

export interface CallInvitationProps {
  invitation: CallInvitationType;
  onAccept: () => void;
  onDecline: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// =============================================================================
// Component
// =============================================================================

export function CallInvitation({
  invitation,
  onAccept,
  onDecline,
  open = true,
  onOpenChange,
}: CallInvitationProps) {
  const [ringingDuration, setRingingDuration] = useState(0);

  // Update ringing duration
  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => {
      const duration = Date.now() - invitation.receivedAt.getTime();
      setRingingDuration(Math.floor(duration / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [open, invitation.receivedAt]);

  // Auto-decline on timeout
  useEffect(() => {
    if (!open) return;

    const timeout = invitation.expiresAt.getTime() - Date.now();
    if (timeout <= 0) {
      onDecline();
      return;
    }

    const timer = setTimeout(() => {
      onDecline();
    }, timeout);

    return () => clearTimeout(timer);
  }, [open, invitation.expiresAt, onDecline]);

  const handleAccept = () => {
    onAccept();
    onOpenChange?.(false);
  };

  const handleDecline = () => {
    onDecline();
    onOpenChange?.(false);
  };

  const isVideo = invitation.type === "video";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center">
          <DialogTitle className="sr-only">
            Incoming {invitation.type} call
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 py-6">
          {/* Avatar with pulse animation */}
          <div className="relative">
            <div className="bg-primary/20 absolute inset-0 animate-ping rounded-full" />
            <Avatar className="relative h-24 w-24">
              <AvatarImage src={invitation.callerAvatarUrl} />
              <AvatarFallback>
                <User className="h-12 w-12" />
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Caller name */}
          <div className="text-center">
            <h2 className="text-2xl font-bold">{invitation.callerName}</h2>
            <p className="text-muted-foreground">
              Incoming {invitation.type} call
            </p>
          </div>

          {/* Ringing duration */}
          <div className="text-sm text-muted-foreground">
            Ringing for {ringingDuration}s
          </div>

          {/* Action buttons */}
          <div className="flex gap-4">
            {/* Decline */}
            <Button
              variant="destructive"
              size="lg"
              className="h-16 w-16 rounded-full"
              onClick={handleDecline}
              aria-label="Decline call"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>

            {/* Accept */}
            <Button
              variant="default"
              size="lg"
              className={cn(
                "h-16 w-16 rounded-full",
                isVideo
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-green-600 hover:bg-green-700",
              )}
              onClick={handleAccept}
              aria-label="Accept call"
            >
              {isVideo ? (
                <Video className="h-6 w-6" />
              ) : (
                <Phone className="h-6 w-6" />
              )}
            </Button>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="text-xs text-muted-foreground">
            Press <kbd className="rounded bg-muted px-1">A</kbd> to accept or{" "}
            <kbd className="rounded bg-muted px-1">D</kbd> to decline
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Keyboard shortcut handler
export function useCallInvitationKeyboard(
  onAccept: () => void,
  onDecline: () => void,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        onAccept();
      } else if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        onDecline();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onAccept, onDecline]);
}
