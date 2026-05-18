"use client";

import { useState } from "react";
import {
  Mail,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  Clock,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
import { useUserManagementStore } from "@/stores/user-management-store";
import {
  getInviteStatusColor,
  formatInviteExpiration,
  isInviteExpired,
} from "@/lib/admin/users/user-invite";
import { getUserInitials } from "@/lib/admin/users/user-manager";
import type { UserInvite } from "@/lib/admin/users/user-types";

export function PendingInvites() {
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState<UserInvite | null>(null);

  const { invites, updateInvite, removeInvite } = useUserManagementStore();

  const pendingInvites = invites.filter((i) => i.status === "pending");

  const handleResend = async (invite: UserInvite) => {
    // In production, call the API
  };

  const handleRevoke = async () => {
    if (!selectedInvite) return;

    // In production, call the API
    updateInvite(selectedInvite.id, {
      status: "revoked",
      revokedAt: new Date().toISOString(),
    });

    setRevokeDialogOpen(false);
    setSelectedInvite(null);
  };

  const handleDelete = async (invite: UserInvite) => {
    // In production, call the API
    removeInvite(invite.id);
  };

  const openRevokeDialog = (invite: UserInvite) => {
    setSelectedInvite(invite);
    setRevokeDialogOpen(true);
  };

  if (pendingInvites.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
          <CardDescription>No pending invitations at this time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            <Mail className="mx-auto h-12 w-12 opacity-50" />
            <p className="mt-2">
              All invitations have been accepted or expired
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
          <CardDescription>
            Manage invitations that haven't been accepted yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pendingInvites.map((invite) => {
              const expired = isInviteExpired(invite.expiresAt);

              return (
                <div
                  key={invite.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {invite.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{invite.email}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge
                          variant="outline"
                          className={getInviteStatusColor(
                            expired ? "expired" : "pending",
                          )}
                        >
                          {expired ? "Expired" : "Pending"}
                        </Badge>
                        <span>&middot;</span>
                        <Badge variant="outline" className="capitalize">
                          {invite.role}
                        </Badge>
                        <span>&middot;</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatInviteExpiration(invite.expiresAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Invited by {invite.invitedBy.displayName} on{" "}
                        {new Date(invite.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleResend(invite)}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Resend Invitation
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openRevokeDialog(invite)}
                        className="text-orange-600"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Revoke Invitation
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(invite)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke the invitation for{" "}
              <strong>{selectedInvite?.email}</strong>? They will no longer be
              able to join using this invitation link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Revoke Invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default PendingInvites;
