"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
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
import type { UserInvite } from "@/lib/admin/users/user-types";

import { logger } from "@/lib/logger";

interface RevokeInviteProps {
  invite: UserInvite | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRevoked?: () => void;
}

export function RevokeInvite({
  invite,
  open,
  onOpenChange,
  onRevoked,
}: RevokeInviteProps) {
  const [isRevoking, setIsRevoking] = useState(false);

  const { updateInvite } = useUserManagementStore();

  const handleRevoke = async () => {
    if (!invite) return;

    setIsRevoking(true);
    try {
      // In production, call the API
      await new Promise((resolve) => setTimeout(resolve, 500));

      updateInvite(invite.id, {
        status: "revoked",
        revokedAt: new Date().toISOString(),
      });

      onRevoked?.();
      onOpenChange(false);
    } catch (error) {
      logger.error("Failed to revoke invite:", error);
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke Invitation</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to revoke the invitation for{" "}
            <strong>{invite?.email}</strong>?
            <br />
            <br />
            They will no longer be able to join using this invitation link or
            code. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleRevoke();
            }}
            disabled={isRevoking}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isRevoking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Revoke Invitation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default RevokeInvite;
