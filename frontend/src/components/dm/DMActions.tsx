"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  MoreVertical,
  Archive,
  ArchiveRestore,
  Trash2,
  VolumeX,
  Volume2,
  Bell,
  Clock,
} from "lucide-react";
import type { DirectMessage } from "@/lib/dm/dm-types";
import { getMutePresets } from "@/lib/dm";
import { useDMStore } from "@/stores/dm-store";

// ============================================================================
// Types
// ============================================================================

interface DMActionsProps {
  dm: DirectMessage;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onDelete?: () => void;
  onMute?: (until?: string | null) => void;
  onUnmute?: () => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function DMActions({
  dm,
  onArchive,
  onUnarchive,
  onDelete,
  onMute,
  onUnmute,
  className,
}: DMActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const {
    mutedDMs,
    archivedDMs,
    setDMMuted,
    archiveDM,
    unarchiveDM,
    removeDM,
  } = useDMStore();

  const isMuted = mutedDMs.has(dm.id);
  const isArchived = archivedDMs.has(dm.id);
  const mutePresets = getMutePresets();

  const handleArchive = () => {
    archiveDM(dm.id);
    onArchive?.();
  };

  const handleUnarchive = () => {
    unarchiveDM(dm.id);
    onUnarchive?.();
  };

  const handleDelete = () => {
    removeDM(dm.id);
    onDelete?.();
    setShowDeleteDialog(false);
  };

  const handleMute = (preset: { duration: number | null; unit?: string }) => {
    let muteUntil: string | null = null;
    if (preset.duration !== null) {
      const now = new Date();
      let ms = preset.duration;
      switch (preset.unit) {
        case "minutes":
          ms *= 60 * 1000;
          break;
        case "hours":
          ms *= 60 * 60 * 1000;
          break;
        case "days":
          ms *= 24 * 60 * 60 * 1000;
          break;
      }
      muteUntil = new Date(now.getTime() + ms).toISOString();
    }
    setDMMuted(dm.id, true, muteUntil);
    onMute?.(muteUntil);
  };

  const handleUnmute = () => {
    setDMMuted(dm.id, false, null);
    onUnmute?.();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", className)}
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {/* Mute/Unmute */}
          {isMuted ? (
            <DropdownMenuItem onClick={handleUnmute}>
              <Volume2 className="mr-2 h-4 w-4" />
              Unmute conversation
            </DropdownMenuItem>
          ) : (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <VolumeX className="mr-2 h-4 w-4" />
                Mute conversation
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-48">
                {mutePresets.map((preset) => (
                  <DropdownMenuItem
                    key={preset.label}
                    onClick={() => handleMute(preset.value)}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    {preset.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}

          <DropdownMenuSeparator />

          {/* Archive/Unarchive */}
          {isArchived ? (
            <DropdownMenuItem onClick={handleUnarchive}>
              <ArchiveRestore className="mr-2 h-4 w-4" />
              Unarchive
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={handleArchive}>
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* Delete */}
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all messages in this conversation.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ============================================================================
// Individual Action Buttons
// ============================================================================

export function ArchiveDMButton({
  dmId,
  isArchived,
  onArchive,
  onUnarchive,
  className,
}: {
  dmId: string;
  isArchived: boolean;
  onArchive?: () => void;
  onUnarchive?: () => void;
  className?: string;
}) {
  const { archiveDM, unarchiveDM } = useDMStore();

  const handleClick = () => {
    if (isArchived) {
      unarchiveDM(dmId);
      onUnarchive?.();
    } else {
      archiveDM(dmId);
      onArchive?.();
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      onClick={handleClick}
    >
      {isArchived ? (
        <>
          <ArchiveRestore className="mr-2 h-4 w-4" />
          Unarchive
        </>
      ) : (
        <>
          <Archive className="mr-2 h-4 w-4" />
          Archive
        </>
      )}
    </Button>
  );
}

export function DeleteDMButton({
  dmId,
  onDelete,
  className,
}: {
  dmId: string;
  onDelete?: () => void;
  className?: string;
}) {
  const [showDialog, setShowDialog] = React.useState(false);
  const { removeDM } = useDMStore();

  const handleDelete = () => {
    removeDM(dmId);
    onDelete?.();
    setShowDialog(false);
  };

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        className={className}
        onClick={() => setShowDialog(true)}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </Button>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all messages. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function MuteDMButton({
  dmId,
  isMuted,
  onMute,
  onUnmute,
  className,
}: {
  dmId: string;
  isMuted: boolean;
  onMute?: () => void;
  onUnmute?: () => void;
  className?: string;
}) {
  const { toggleMuteDM } = useDMStore();

  const handleClick = () => {
    toggleMuteDM(dmId);
    if (isMuted) {
      onUnmute?.();
    } else {
      onMute?.();
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      onClick={handleClick}
    >
      {isMuted ? (
        <>
          <Volume2 className="mr-2 h-4 w-4" />
          Unmute
        </>
      ) : (
        <>
          <VolumeX className="mr-2 h-4 w-4" />
          Mute
        </>
      )}
    </Button>
  );
}

DMActions.displayName = "DMActions";
ArchiveDMButton.displayName = "ArchiveDMButton";
DeleteDMButton.displayName = "DeleteDMButton";
MuteDMButton.displayName = "MuteDMButton";
