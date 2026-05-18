"use client";

import * as React from "react";
import { useState } from "react";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Channel } from "@/stores/channel-store";

// ============================================================================
// Types
// ============================================================================

export interface ChannelDeleteProps {
  channel: Channel;
  isAdmin?: boolean;
  onDelete?: () => Promise<void>;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function ChannelDelete({
  channel,
  isAdmin = false,
  onDelete,
  className,
}: ChannelDeleteProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [showDialog, setShowDialog] = useState(false);

  const confirmationRequired = channel.name;
  const isConfirmed = confirmText === confirmationRequired;

  const handleDelete = async () => {
    if (!isConfirmed) return;

    try {
      setIsLoading(true);
      await onDelete?.();
      setShowDialog(false);
    } finally {
      setIsLoading(false);
      setConfirmText("");
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <Card className={cn("border-destructive/50", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Trash2 className="h-5 w-5" />
          Delete Channel
        </CardTitle>
        <CardDescription>
          Permanently delete this channel and all its content
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-destructive/10 space-y-2 rounded-lg p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertTriangle className="h-4 w-4" />
            This action is irreversible
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>- All messages will be permanently deleted</li>
            <li>- All files and attachments will be removed</li>
            <li>- Channel history cannot be recovered</li>
            <li>- Members will lose access immediately</li>
          </ul>
        </div>

        <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Channel
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                Delete #{channel.name}?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <p>
                  This action cannot be undone. This will permanently delete the
                  channel and all of its messages, files, and data.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="confirm-delete">
                    Type{" "}
                    <span className="font-mono font-bold">
                      {confirmationRequired}
                    </span>{" "}
                    to confirm
                  </Label>
                  <Input
                    id="confirm-delete"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={confirmationRequired}
                    className="font-mono"
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmText("")}>
                Cancel
              </AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={!isConfirmed || isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete Channel
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

ChannelDelete.displayName = "ChannelDelete";
