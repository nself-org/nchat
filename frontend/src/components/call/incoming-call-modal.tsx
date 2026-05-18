/**
 * Incoming Call Modal Component
 *
 * Full-screen modal for incoming calls with accept/decline actions.
 */

"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
import { IncomingCall } from "./incoming-call";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

export interface IncomingCallData {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatarUrl?: string;
  callType: "voice" | "video";
  channelName?: string;
}

export interface IncomingCallModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  call: IncomingCallData | null;
  onAccept: (callId: string) => void;
  onDecline: (callId: string) => void;
  autoDeclineTimeout?: number;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function IncomingCallModal({
  open,
  onOpenChange,
  call,
  onAccept,
  onDecline,
  autoDeclineTimeout,
  className,
}: IncomingCallModalProps) {
  const [timeRemaining, setTimeRemaining] = React.useState(autoDeclineTimeout);

  // Auto-decline timer
  React.useEffect(() => {
    if (!open || !call || !autoDeclineTimeout) return;

    setTimeRemaining(autoDeclineTimeout);

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === undefined || prev <= 1) {
          clearInterval(interval);
          onDecline(call.callId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [open, call, autoDeclineTimeout, onDecline]);

  if (!call) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/90 backdrop-blur-sm" />
        <DialogContent
          className={cn(
            "fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]",
            "max-w-md border-0 bg-transparent p-0 shadow-none",
            className,
          )}
          aria-describedby={undefined}
        >
          <div className="flex flex-col items-center gap-4">
            <IncomingCall
              callId={call.callId}
              callerName={call.callerName}
              callerAvatarUrl={call.callerAvatarUrl}
              callType={call.callType}
              channelName={call.channelName}
              onAccept={onAccept}
              onDecline={onDecline}
              isRinging
              variant="floating"
              size="lg"
            />

            {/* Auto-decline countdown */}
            {timeRemaining !== undefined && timeRemaining > 0 && (
              <div className="text-sm text-white/60">
                Auto-declining in {timeRemaining}s
              </div>
            )}
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

IncomingCallModal.displayName = "IncomingCallModal";

// =============================================================================
// Queue Modal for Multiple Incoming Calls
// =============================================================================

export interface IncomingCallQueueProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  calls: IncomingCallData[];
  onAccept: (callId: string) => void;
  onDecline: (callId: string) => void;
  onDeclineAll: () => void;
  className?: string;
}

export function IncomingCallQueue({
  open,
  onOpenChange,
  calls,
  onAccept,
  onDecline,
  onDeclineAll,
  className,
}: IncomingCallQueueProps) {
  if (calls.length === 0) return null;

  const currentCall = calls[0];
  const remainingCalls = calls.slice(1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/90 backdrop-blur-sm" />
        <DialogContent
          className={cn(
            "fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]",
            "max-w-md border-0 bg-transparent p-0 shadow-none",
            className,
          )}
          aria-describedby={undefined}
        >
          <div className="flex flex-col items-center gap-4">
            {/* Current Call */}
            <IncomingCall
              callId={currentCall.callId}
              callerName={currentCall.callerName}
              callerAvatarUrl={currentCall.callerAvatarUrl}
              callType={currentCall.callType}
              channelName={currentCall.channelName}
              onAccept={onAccept}
              onDecline={onDecline}
              isRinging
              variant="floating"
              size="lg"
            />

            {/* Queue Info */}
            {remainingCalls.length > 0 && (
              <div className="flex flex-col items-center gap-2 text-white">
                <p className="text-sm">
                  +{remainingCalls.length} more incoming{" "}
                  {remainingCalls.length === 1 ? "call" : "calls"}
                </p>
                <button
                  onClick={onDeclineAll}
                  className="text-xs text-red-400 underline hover:text-red-300"
                >
                  Decline all
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

IncomingCallQueue.displayName = "IncomingCallQueue";
