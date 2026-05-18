"use client";

import * as React from "react";
import { useState } from "react";
import { Archive, ArchiveRestore, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import type { Channel } from "@/stores/channel-store";
import { formatTimeAgo } from "@/lib/channels/channel-stats";

// ============================================================================
// Types
// ============================================================================

export interface ChannelArchiveProps {
  channel: Channel;
  isAdmin?: boolean;
  onArchive?: () => Promise<void>;
  onUnarchive?: () => Promise<void>;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function ChannelArchive({
  channel,
  isAdmin = false,
  onArchive,
  onUnarchive,
  className,
}: ChannelArchiveProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleArchive = async () => {
    try {
      setIsLoading(true);
      await onArchive?.();
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnarchive = async () => {
    try {
      setIsLoading(true);
      await onUnarchive?.();
    } finally {
      setIsLoading(false);
    }
  };

  if (channel.isArchived) {
    return (
      <Card className={cn("border-yellow-500/50", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-600">
            <Archive className="h-5 w-5" />
            Channel Archived
          </CardTitle>
          <CardDescription>
            This channel was archived and is now read-only
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 rounded-lg bg-yellow-500/10 p-4">
            <p className="text-sm">
              <strong>What this means:</strong>
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>- No new messages can be sent</li>
              <li>- All existing messages are preserved</li>
              <li>- Members can still read the message history</li>
              <li>- Channel will appear in archived section</li>
            </ul>
          </div>

          {isAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <ArchiveRestore className="mr-2 h-4 w-4" />
                  Unarchive Channel
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Unarchive channel?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will restore #{channel.name} to an active channel.
                    Members will be able to send messages again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleUnarchive}
                    disabled={isLoading}
                  >
                    {isLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Unarchive
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Archive className="h-5 w-5" />
          Archive Channel
        </CardTitle>
        <CardDescription>
          Archive this channel to preserve history while preventing new messages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 rounded-lg bg-muted p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Before you archive:
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>- Members will be notified of the archive</li>
            <li>- All message history will be preserved</li>
            <li>- Channel can be unarchived at any time</li>
            <li>- Active integrations will be paused</li>
          </ul>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <Archive className="mr-2 h-4 w-4" />
              Archive Channel
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive #{channel.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will archive the channel. No one will be able to send new
                messages, but the history will be preserved and the channel can
                be unarchived later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleArchive} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Archive Channel
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

ChannelArchive.displayName = "ChannelArchive";
