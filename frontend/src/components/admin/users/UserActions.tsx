"use client";

import {
  Eye,
  Edit,
  Shield,
  Ban,
  UserX,
  UserCheck,
  Trash2,
  Key,
  UserCog,
  Activity,
  Smartphone,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserManagementStore } from "@/stores/user-management-store";
import type { AdminUser } from "@/lib/admin/users/user-types";

interface UserActionsProps {
  user: AdminUser;
  variant?: "dropdown" | "buttons";
  showViewDetails?: boolean;
  onViewDetails?: () => void;
  onEdit?: () => void;
}

export function UserActions({
  user,
  variant = "dropdown",
  showViewDetails = true,
  onViewDetails,
  onEdit,
}: UserActionsProps) {
  const {
    openUserModal,
    openBanModal,
    openDeleteConfirm,
    openRoleChangeModal,
    openImpersonateModal,
    openResetPasswordModal,
  } = useUserManagementStore();

  const isOwner = user.role.name === "owner";
  const isBanned = user.isBanned;
  const isActive = user.isActive;

  const handleViewDetails = () => {
    onViewDetails?.();
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit();
    } else {
      openUserModal("edit", user);
    }
  };

  if (variant === "buttons") {
    return (
      <div className="flex flex-wrap gap-2">
        {showViewDetails && (
          <Button variant="outline" size="sm" onClick={handleViewDetails}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={handleEdit}>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => openRoleChangeModal(user)}
          disabled={isOwner}
        >
          <Shield className="mr-2 h-4 w-4" />
          Role
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => openResetPasswordModal(user)}
        >
          <Key className="mr-2 h-4 w-4" />
          Password
        </Button>
        {isBanned ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => openBanModal(user)}
            disabled={isOwner}
          >
            <UserCheck className="mr-2 h-4 w-4" />
            Unban
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => openBanModal(user)}
            disabled={isOwner}
            className="text-orange-600 hover:text-orange-700"
          >
            <Ban className="mr-2 h-4 w-4" />
            Ban
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => openDeleteConfirm(user)}
          disabled={isOwner}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {showViewDetails && (
          <DropdownMenuItem onClick={handleViewDetails}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={handleEdit}>
          <Edit className="mr-2 h-4 w-4" />
          Edit User
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => openRoleChangeModal(user)}
          disabled={isOwner}
        >
          <Shield className="mr-2 h-4 w-4" />
          Change Role
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => openResetPasswordModal(user)}>
          <Key className="mr-2 h-4 w-4" />
          Reset Password
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => openImpersonateModal(user)}
          disabled={isOwner}
        >
          <UserCog className="mr-2 h-4 w-4" />
          Impersonate
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem>
          <Activity className="mr-2 h-4 w-4" />
          View Activity
        </DropdownMenuItem>

        <DropdownMenuItem>
          <Smartphone className="mr-2 h-4 w-4" />
          View Sessions
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {isBanned ? (
          <DropdownMenuItem
            onClick={() => openBanModal(user)}
            disabled={isOwner}
          >
            <UserCheck className="mr-2 h-4 w-4" />
            Unban User
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={() => openBanModal(user)}
            disabled={isOwner}
            className="text-orange-600"
          >
            <Ban className="mr-2 h-4 w-4" />
            Ban User
          </DropdownMenuItem>
        )}

        {isActive ? (
          <DropdownMenuItem disabled={isOwner} className="text-orange-600">
            <UserX className="mr-2 h-4 w-4" />
            Deactivate
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled={isOwner}>
            <UserCheck className="mr-2 h-4 w-4" />
            Reactivate
          </DropdownMenuItem>
        )}

        <DropdownMenuItem
          onClick={() => openDeleteConfirm(user)}
          disabled={isOwner}
          className="text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete User
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UserActions;
