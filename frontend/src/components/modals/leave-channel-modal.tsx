"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, AlertTriangle, Hash, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

import { logger } from "@/lib/logger";

export interface ChannelInfo {
  id: string;
  name: string;
  slug: string;
  isPrivate: boolean;
  memberCount?: number;
}

interface LeaveChannelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: ChannelInfo | null;
  onLeave: (channelId: string) => Promise<void>;
  isLastAdmin?: boolean;
}

export function LeaveChannelModal({
  open,
  onOpenChange,
  channel,
  onLeave,
  isLastAdmin = false,
}: LeaveChannelModalProps) {
  const [loading, setLoading] = useState(false);

  // Reset loading state when modal closes
  useEffect(() => {
    if (!open) {
      setLoading(false);
    }
  }, [open]);

  const handleLeave = async () => {
    if (!channel) return;

    setLoading(true);
    try {
      await onLeave(channel.id);
      onOpenChange(false);
    } catch (error) {
      logger.error("Failed to leave channel:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!channel) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader className="space-y-4">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500",
              )}
            >
              <LogOut className="h-5 w-5" />
            </div>
            <div className="space-y-1.5 pt-0.5">
              <DialogTitle>Leave channel?</DialogTitle>
              <DialogDescription>
                You are about to leave{" "}
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  {channel.isPrivate ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : (
                    <Hash className="h-3.5 w-3.5" />
                  )}
                  {channel.name}
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Warning messages */}
        <div className="space-y-3">
          {channel.isPrivate && (
            <div className="flex items-start gap-3 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-500" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                This is a private channel. You will need to be re-invited to
                rejoin.
              </p>
            </div>
          )}

          {isLastAdmin && (
            <div className="bg-destructive/10 border-destructive/20 flex items-start gap-3 rounded-lg border p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-sm text-destructive">
                You are the last admin of this channel. Leaving will remove all
                admin privileges. Consider assigning another admin before
                leaving.
              </p>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            You will no longer receive notifications from this channel. Your
            messages will remain visible to other members.
          </p>
        </div>

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleLeave}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Leave Channel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
