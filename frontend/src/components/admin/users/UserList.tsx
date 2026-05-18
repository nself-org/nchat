"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MoreHorizontal,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserSearch } from "./UserSearch";
import { useUserManagementStore } from "@/stores/user-management-store";
import {
  getUserInitials,
  formatLastSeen,
} from "@/lib/admin/users/user-manager";
import type { AdminUser } from "@/lib/admin/users/user-types";

interface UserListProps {
  users: AdminUser[];
  isLoading?: boolean;
  showSearch?: boolean;
}

const roleColors: Record<string, string> = {
  owner: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  admin: "bg-red-500/10 text-red-600 border-red-500/20",
  moderator: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  member: "bg-green-500/10 text-green-600 border-green-500/20",
  guest: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

const statusColors: Record<string, string> = {
  active: "bg-green-500",
  inactive: "bg-gray-400",
  banned: "bg-red-500",
};

export function UserList({
  users,
  isLoading = false,
  showSearch = true,
}: UserListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const {
    selectedUserIds,
    isSelectionMode,
    toggleUserSelection,
    selectAllUsers,
    clearUserSelection,
    openUserModal,
    openBanModal,
    openDeleteConfirm,
    openRoleChangeModal,
    openImpersonateModal,
    openResetPasswordModal,
    setSelectionMode,
  } = useUserManagementStore();

  const filteredUsers = users.filter((user) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(query) ||
      user.displayName.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  });

  const getUserStatus = (user: AdminUser): "active" | "inactive" | "banned" => {
    if (user.isBanned) return "banned";
    if (!user.isActive) return "inactive";
    return "active";
  };

  const isAllSelected =
    filteredUsers.length > 0 &&
    filteredUsers.every((u) => selectedUserIds.includes(u.id));

  const handleSelectAll = () => {
    if (isAllSelected) {
      clearUserSelection();
    } else {
      selectAllUsers();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {showSearch && <UserSearch value="" onChange={() => {}} />}
        <div className="rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="w-12 px-4 py-3"></th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Joined
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Last Seen
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-4 py-3">
                      <div className="h-4 w-4 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                        <div className="space-y-1">
                          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 w-16 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 w-16 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="ml-auto h-8 w-8 animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showSearch && (
        <div className="flex items-center gap-4">
          <UserSearch value={searchQuery} onChange={setSearchQuery} />
          {isSelectionMode && selectedUserIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedUserIds.length} selected
              </span>
              <Button variant="outline" size="sm" onClick={clearUserSelection}>
                Clear
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="w-12 px-4 py-3">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  User
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Role
                </th>
                <th className="hidden px-4 py-3 text-left text-sm font-medium text-muted-foreground md:table-cell">
                  Status
                </th>
                <th className="hidden px-4 py-3 text-left text-sm font-medium text-muted-foreground lg:table-cell">
                  Joined
                </th>
                <th className="hidden px-4 py-3 text-left text-sm font-medium text-muted-foreground lg:table-cell">
                  Last Seen
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const status = getUserStatus(user);
                  const isOwner = user.role.name === "owner";
                  const isSelected = selectedUserIds.includes(user.id);

                  return (
                    <tr
                      key={user.id}
                      className={cn(
                        "hover:bg-muted/50 border-b last:border-b-0",
                        isSelected && "bg-muted/30",
                      )}
                    >
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleUserSelection(user.id)}
                          aria-label={`Select ${user.displayName}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={user.avatarUrl}
                              alt={user.displayName}
                            />
                            <AvatarFallback>
                              {getUserInitials(user.displayName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <Link
                              href={`/admin/users/${user.id}`}
                              className="font-medium hover:underline"
                            >
                              {user.displayName}
                            </Link>
                            <div className="text-sm text-muted-foreground">
                              @{user.username} &middot; {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            "capitalize",
                            roleColors[user.role.name.toLowerCase()],
                          )}
                        >
                          {user.role.name}
                        </Badge>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <div className="flex items-center space-x-2">
                          <div
                            className={cn(
                              "h-2 w-2 rounded-full",
                              statusColors[status],
                            )}
                          />
                          <span className="text-sm capitalize">{status}</span>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-muted-foreground lg:table-cell">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-muted-foreground lg:table-cell">
                        {formatLastSeen(user.lastSeenAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/users/${user.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openUserModal("edit", user)}
                            >
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
                            <DropdownMenuItem
                              onClick={() => openResetPasswordModal(user)}
                            >
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
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/admin/users/${user.id}?tab=activity`}
                              >
                                <Activity className="mr-2 h-4 w-4" />
                                View Activity
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/admin/users/${user.id}?tab=sessions`}
                              >
                                <Smartphone className="mr-2 h-4 w-4" />
                                View Sessions
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {status === "banned" ? (
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
                            {!user.isActive ? (
                              <DropdownMenuItem disabled={isOwner}>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Reactivate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                disabled={isOwner}
                                className="text-orange-600"
                              >
                                <UserX className="mr-2 h-4 w-4" />
                                Deactivate
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
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default UserList;
