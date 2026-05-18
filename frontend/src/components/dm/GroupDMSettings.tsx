"use client";

import * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
  Camera,
  Save,
  LogOut,
  Trash2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import type { DirectMessage } from "@/lib/dm/dm-types";
import {
  canModifyGroupSettings,
  canDeleteDM,
  getLeaveConsequences,
} from "@/lib/dm";
import { useDMStore } from "@/stores/dm-store";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

interface GroupDMSettingsProps {
  dm: DirectMessage;
  currentUserId: string;
  onClose?: () => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function GroupDMSettings({
  dm,
  currentUserId,
  onClose,
  className,
}: GroupDMSettingsProps) {
  const { updateDM, removeDM, removeParticipant } = useDMStore();

  const [name, setName] = useState(dm.name || "");
  const [description, setDescription] = useState(dm.description || "");
  const [isSaving, setIsSaving] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const canEdit = canModifyGroupSettings(dm, currentUserId);
  const canDelete = canDeleteDM(dm, currentUserId);
  const leaveConsequences = getLeaveConsequences(dm, currentUserId);

  const hasChanges =
    name !== (dm.name || "") || description !== (dm.description || "");

  const handleSave = async () => {
    if (!canEdit || !hasChanges) return;

    setIsSaving(true);
    try {
      updateDM(dm.id, {
        name: name.trim(),
        description: description.trim() || null,
      });
    } catch (error) {
      logger.error("Failed to update group:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLeave = () => {
    removeParticipant(dm.id, currentUserId);
    setShowLeaveDialog(false);
    onClose?.();
  };

  const handleDelete = () => {
    removeDM(dm.id);
    setShowDeleteDialog(false);
    onClose?.();
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Group Photo */}
      <section className="flex flex-col items-center">
        <button
          className="group relative disabled:cursor-not-allowed"
          disabled={!canEdit}
        >
          <Avatar className="h-24 w-24">
            <AvatarImage src={dm.avatarUrl || undefined} />
            <AvatarFallback className="text-2xl">
              {(dm.name || "G").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {canEdit && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="h-6 w-6 text-white" />
            </div>
          )}
        </button>
        {canEdit && (
          <p className="mt-2 text-xs text-muted-foreground">
            Click to change photo
          </p>
        )}
      </section>

      {/* Group Info */}
      <section className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="group-name">Group name</Label>
          <Input
            id="group-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter group name"
            maxLength={100}
            disabled={!canEdit}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="group-description">Description</Label>
          <Textarea
            id="group-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this group about?"
            maxLength={500}
            rows={3}
            disabled={!canEdit}
          />
        </div>

        {canEdit && hasChanges && (
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        )}
      </section>

      <Separator />

      {/* Group Actions */}
      <section className="space-y-2">
        <h3 className="mb-4 text-sm font-semibold">Actions</h3>

        {/* Leave Group */}
        <Button
          variant="outline"
          className="w-full justify-start text-destructive hover:text-destructive"
          onClick={() => setShowLeaveDialog(true)}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Leave group
        </Button>

        {/* Delete Group (only for owner) */}
        {canDelete && (
          <Button
            variant="destructive"
            className="w-full justify-start"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete group
          </Button>
        )}
      </section>

      {/* Leave Confirmation */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave group?</AlertDialogTitle>
            <AlertDialogDescription>
              {leaveConsequences.willDeleteGroup ? (
                <>
                  You are the last member. Leaving will delete this group
                  permanently.
                </>
              ) : leaveConsequences.requiresOwnerTransfer ? (
                <>
                  You are the owner. Please transfer ownership to another member
                  before leaving.
                </>
              ) : (
                <>
                  You will no longer receive messages from this group. You can
                  be added back by a member.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeave}
              disabled={
                leaveConsequences.requiresOwnerTransfer &&
                !leaveConsequences.willDeleteGroup
              }
              className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete group?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the group and all messages for
              everyone. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
            >
              Delete Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

GroupDMSettings.displayName = "GroupDMSettings";
