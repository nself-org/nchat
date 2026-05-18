"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
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
import { useUserManagementStore } from "@/stores/user-management-store";
import { getUserInitials } from "@/lib/admin/users/user-manager";
import type { AdminUser } from "@/lib/admin/users/user-types";

import { logger } from "@/lib/logger";

interface UnbanUserModalProps {
  open: boolean;
  user: AdminUser | null;
  onClose: () => void;
  onUnbanned?: () => void;
}

export function UnbanUserModal({
  open,
  user,
  onClose,
  onUnbanned,
}: UnbanUserModalProps) {
  const [reason, setReason] = useState("");
  const [notifyUser, setNotifyUser] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { updateUserInList } = useUserManagementStore();

  const handleUnban = async () => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      // In production, call the API
      await new Promise((resolve) => setTimeout(resolve, 500));

      updateUserInList(user.id, {
        isBanned: false,
        bannedAt: undefined,
        bannedUntil: undefined,
        banReason: undefined,
      });

      onUnbanned?.();
      handleClose();
    } catch (error) {
      logger.error("Failed to unban user:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason("");
    setNotifyUser(true);
    onClose();
  };

  if (!user) return null;

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unban User</AlertDialogTitle>
          <AlertDialogDescription>
            Remove the ban from this user's account and restore their access to
            the workspace.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          {/* User Info */}
          <div className="mb-4 flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatarUrl} alt={user.displayName} />
              <AvatarFallback>
                {getUserInitials(user.displayName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{user.displayName}</p>
              <p className="text-sm text-muted-foreground">@{user.username}</p>
            </div>
          </div>

          {/* Current Ban Info */}
          {user.banReason && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm dark:border-red-800 dark:bg-red-950">
              <p className="font-medium">Ban Reason:</p>
              <p className="text-muted-foreground">{user.banReason}</p>
              {user.bannedAt && (
                <p className="mt-1 text-muted-foreground">
                  Banned on: {new Date(user.bannedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {/* Unban Reason */}
          <div className="mb-4 space-y-2">
            <Label htmlFor="unban-reason">Reason for Unban (optional)</Label>
            <Textarea
              id="unban-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Add a note about why the ban is being lifted..."
              rows={2}
            />
          </div>

          {/* Notify User */}
          <div className="flex items-center space-x-2">
            <Switch
              id="notify-unban"
              checked={notifyUser}
              onCheckedChange={setNotifyUser}
            />
            <Label htmlFor="notify-unban">Notify user by email</Label>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleUnban();
            }}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Unban User
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default UnbanUserModal;
