"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MoreHorizontal,
  Ban,
  Shield,
  UserX,
  UserCheck,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminUser, Role } from "@/lib/admin/admin-store";

// Legacy type for backwards compatibility
export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: "owner" | "admin" | "moderator" | "member" | "guest";
  status: "active" | "inactive" | "banned";
  avatarUrl?: string;
  createdAt: string;
  lastSeenAt?: string;
}

interface UserTableProps {
  users: (AdminUser | User)[];
  roles?: Role[];
  total?: number;
  page?: number;
  perPage?: number;
  search?: string;
  roleFilter?: string | null;
  bannedFilter?: boolean | null;
  isLoading?: boolean;
  // New props for controlled mode
  onPageChange?: (page: number) => void;
  onSearchChange?: (search: string) => void;
  onRoleFilterChange?: (roleId: string | null) => void;
  onBannedFilterChange?: (banned: boolean | null) => void;
  // Action handlers
  onViewUser?: (user: AdminUser | User) => void;
  onBanUser?: (user: AdminUser | User) => void;
  onUnbanUser?: (user: AdminUser | User) => void;
  onChangeRole?: (user: AdminUser | User) => void;
  onEditRole?: (user: AdminUser | User) => void;
  onDeactivateUser?: (user: AdminUser | User) => void;
  onReactivateUser?: (user: AdminUser | User) => void;
  onDeleteUser?: (user: AdminUser | User) => void;
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

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

// Type guard to check if user is AdminUser
function isAdminUser(user: AdminUser | User): user is AdminUser {
  return "role" in user && typeof user.role === "object" && user.role !== null;
}

// Get role name from user
function getRoleName(user: AdminUser | User): string {
  if (isAdminUser(user)) {
    return user.role.name;
  }
  return user.role;
}

// Get user status
function getUserStatus(
  user: AdminUser | User,
): "active" | "inactive" | "banned" {
  if (isAdminUser(user)) {
    if (user.isBanned) return "banned";
    if (!user.isActive) return "inactive";
    return "active";
  }
  return user.status;
}

export function UserTable({
  users,
  roles = [],
  total,
  page = 1,
  perPage = 20,
  search: controlledSearch,
  roleFilter: controlledRoleFilter,
  bannedFilter: controlledBannedFilter,
  isLoading = false,
  onPageChange,
  onSearchChange,
  onRoleFilterChange,
  onBannedFilterChange,
  onViewUser,
  onBanUser,
  onUnbanUser,
  onChangeRole,
  onEditRole,
  onDeactivateUser,
  onReactivateUser,
  onDeleteUser,
}: UserTableProps) {
  // Local state for uncontrolled mode
  const [localSearch, setLocalSearch] = useState("");
  const [localRoleFilter, setLocalRoleFilter] = useState<string>("all");
  const [localStatusFilter, setLocalStatusFilter] = useState<string>("all");

  // Use controlled or local state
  const isControlled = onSearchChange !== undefined;
  const searchQuery = isControlled ? (controlledSearch ?? "") : localSearch;
  const roleFilter = isControlled
    ? (controlledRoleFilter ?? "all")
    : localRoleFilter;
  const statusFilter = isControlled
    ? controlledBannedFilter === null
      ? "all"
      : controlledBannedFilter
        ? "banned"
        : "active"
    : localStatusFilter;

  // Filter users locally if not controlled
  const displayUsers = isControlled
    ? users
    : users.filter((user) => {
        const displayName = isAdminUser(user)
          ? user.displayName
          : user.displayName;
        const username = user.username;
        const email = user.email;

        const matchesSearch =
          username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          email.toLowerCase().includes(searchQuery.toLowerCase());

        const roleName = getRoleName(user).toLowerCase();
        const matchesRole = roleFilter === "all" || roleName === roleFilter;

        const status = getUserStatus(user);
        const matchesStatus = statusFilter === "all" || status === statusFilter;

        return matchesSearch && matchesRole && matchesStatus;
      });

  const totalItems = total ?? displayUsers.length;
  const totalPages = Math.ceil(totalItems / perPage);
  const startItem = (page - 1) * perPage + 1;
  const endItem = Math.min(page * perPage, totalItems);

  const handleSearchChange = (value: string) => {
    if (onSearchChange) {
      onSearchChange(value);
    } else {
      setLocalSearch(value);
    }
  };

  const handleRoleFilterChange = (value: string) => {
    if (onRoleFilterChange) {
      onRoleFilterChange(value === "all" ? null : value);
    } else {
      setLocalRoleFilter(value);
    }
  };

  const handleStatusFilterChange = (value: string) => {
    if (onBannedFilterChange) {
      onBannedFilterChange(value === "all" ? null : value === "banned");
    } else {
      setLocalStatusFilter(value);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={roleFilter ?? "all"}
            onValueChange={handleRoleFilterChange}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {roles.length > 0
                ? roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))
                : ["owner", "admin", "moderator", "member", "guest"].map(
                    (role) => (
                      <SelectItem key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </SelectItem>
                    ),
                  )}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="banned">Banned</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b">
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
              {isLoading ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
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
                    <td className="hidden px-4 py-3 md:table-cell">
                      <div className="h-5 w-16 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="ml-auto h-8 w-8 animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))
              ) : displayUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No users found
                  </td>
                </tr>
              ) : (
                displayUsers.map((user) => {
                  const roleName = getRoleName(user);
                  const status = getUserStatus(user);
                  const isOwner = roleName.toLowerCase() === "owner";

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-muted/50 border-b last:border-b-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={user.avatarUrl}
                              alt={user.displayName}
                            />
                            <AvatarFallback>
                              {getInitials(user.displayName)}
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
                            roleColors[roleName.toLowerCase()],
                          )}
                        >
                          {roleName}
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
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-muted-foreground lg:table-cell">
                        {user.lastSeenAt
                          ? formatDate(user.lastSeenAt)
                          : "Never"}
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
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onViewUser?.(user)}
                              asChild
                            >
                              <Link href={`/admin/users/${user.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                (onChangeRole ?? onEditRole)?.(user)
                              }
                              disabled={isOwner}
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              Change Role
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {status === "banned" ? (
                              <DropdownMenuItem
                                onClick={() => onUnbanUser?.(user)}
                                disabled={isOwner}
                              >
                                <UserCheck className="mr-2 h-4 w-4" />
                                Unban User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => onBanUser?.(user)}
                                disabled={isOwner}
                                className="text-orange-600"
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                Ban User
                              </DropdownMenuItem>
                            )}
                            {status === "inactive" ? (
                              <DropdownMenuItem
                                onClick={() => onReactivateUser?.(user)}
                                disabled={isOwner}
                              >
                                <UserCheck className="mr-2 h-4 w-4" />
                                Reactivate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => onDeactivateUser?.(user)}
                                disabled={isOwner}
                                className="text-orange-600"
                              >
                                <UserX className="mr-2 h-4 w-4" />
                                Deactivate
                              </DropdownMenuItem>
                            )}
                            {onDeleteUser && (
                              <DropdownMenuItem
                                onClick={() => onDeleteUser(user)}
                                disabled={isOwner}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete User
                              </DropdownMenuItem>
                            )}
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

      {/* Pagination */}
      {isControlled && onPageChange ? (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startItem} to {endItem} of {totalItems.toLocaleString()}{" "}
            users
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="text-sm">
              Page {page} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || isLoading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          Showing {displayUsers.length} of {users.length} users
        </div>
      )}
    </div>
  );
}

export default UserTable;
