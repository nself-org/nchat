"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserManagementStore } from "@/stores/user-management-store";
import {
  getUserInitials,
  formatLastSeen,
} from "@/lib/admin/users/user-manager";
import type { AdminUser, UserSortOptions } from "@/lib/admin/users/user-types";

interface UserTableProps {
  users: AdminUser[];
  total: number;
  page: number;
  perPage: number;
  sort: UserSortOptions;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  onSortChange: (sort: UserSortOptions) => void;
  onUserClick?: (user: AdminUser) => void;
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

type SortableColumn =
  | "username"
  | "displayName"
  | "email"
  | "createdAt"
  | "lastSeenAt"
  | "messagesCount";

const columns: {
  key: SortableColumn;
  label: string;
  sortable: boolean;
  className?: string;
}[] = [
  { key: "displayName", label: "User", sortable: true },
  { key: "username", label: "Role", sortable: false },
  {
    key: "createdAt",
    label: "Status",
    sortable: false,
    className: "hidden md:table-cell",
  },
  {
    key: "createdAt",
    label: "Joined",
    sortable: true,
    className: "hidden lg:table-cell",
  },
  {
    key: "lastSeenAt",
    label: "Last Seen",
    sortable: true,
    className: "hidden lg:table-cell",
  },
  {
    key: "messagesCount",
    label: "Messages",
    sortable: true,
    className: "hidden xl:table-cell",
  },
];

export function UserTable({
  users,
  total,
  page,
  perPage,
  sort,
  isLoading = false,
  onPageChange,
  onPerPageChange,
  onSortChange,
  onUserClick,
}: UserTableProps) {
  const {
    selectedUserIds,
    toggleUserSelection,
    selectAllUsers,
    clearUserSelection,
  } = useUserManagementStore();

  const totalPages = Math.ceil(total / perPage);
  const startItem = (page - 1) * perPage + 1;
  const endItem = Math.min(page * perPage, total);

  const isAllSelected =
    users.length > 0 && users.every((u) => selectedUserIds.includes(u.id));
  const isSomeSelected =
    users.some((u) => selectedUserIds.includes(u.id)) && !isAllSelected;

  const handleSelectAll = () => {
    if (isAllSelected) {
      clearUserSelection();
    } else {
      selectAllUsers();
    }
  };

  const handleSort = (column: SortableColumn) => {
    if (sort.field === column) {
      onSortChange({
        field: column,
        direction: sort.direction === "asc" ? "desc" : "asc",
      });
    } else {
      onSortChange({ field: column, direction: "asc" });
    }
  };

  const getSortIcon = (column: SortableColumn) => {
    if (sort.field !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sort.direction === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  const getUserStatus = (user: AdminUser): "active" | "inactive" | "banned" => {
    if (user.isBanned) return "banned";
    if (!user.isActive) return "inactive";
    return "active";
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="w-12 px-4 py-3">
                  <Checkbox
                    checked={isAllSelected}
                    ref={(ref) => {
                      if (ref) {
                        // @ts-expect-error indeterminate is valid
                        ref.indeterminate = isSomeSelected;
                      }
                    }}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </th>
                <th className="px-4 py-3 text-left">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8"
                    onClick={() => handleSort("displayName")}
                  >
                    User
                    {getSortIcon("displayName")}
                  </Button>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Role
                </th>
                <th className="hidden px-4 py-3 text-left text-sm font-medium text-muted-foreground md:table-cell">
                  Status
                </th>
                <th className="hidden px-4 py-3 text-left lg:table-cell">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8"
                    onClick={() => handleSort("createdAt")}
                  >
                    Joined
                    {getSortIcon("createdAt")}
                  </Button>
                </th>
                <th className="hidden px-4 py-3 text-left lg:table-cell">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8"
                    onClick={() => handleSort("lastSeenAt")}
                  >
                    Last Seen
                    {getSortIcon("lastSeenAt")}
                  </Button>
                </th>
                <th className="hidden px-4 py-3 text-left xl:table-cell">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8"
                    onClick={() => handleSort("messagesCount")}
                  >
                    Messages
                    {getSortIcon("messagesCount")}
                  </Button>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: perPage }).map((_, i) => (
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
                    <td className="hidden px-4 py-3 md:table-cell">
                      <div className="h-5 w-16 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="hidden px-4 py-3 xl:table-cell">
                      <div className="h-4 w-12 animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const status = getUserStatus(user);
                  const isSelected = selectedUserIds.includes(user.id);

                  return (
                    <tr
                      key={user.id}
                      className={cn(
                        "hover:bg-muted/50 cursor-pointer border-b last:border-b-0",
                        isSelected && "bg-muted/30",
                      )}
                      onClick={() => onUserClick?.(user)}
                    >
                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
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
                              onClick={(e) => e.stopPropagation()}
                            >
                              {user.displayName}
                            </Link>
                            <div className="text-sm text-muted-foreground">
                              @{user.username}
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
                      <td className="hidden px-4 py-3 text-sm text-muted-foreground xl:table-cell">
                        {user.messagesCount.toLocaleString()}
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            Showing {startItem} to {endItem} of {total.toLocaleString()} users
          </span>
          <Select
            value={perPage.toString()}
            onValueChange={(value) => onPerPageChange(parseInt(value, 10))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span>per page</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(1)}
            disabled={page <= 1 || isLoading}
          >
            <ChevronsLeft className="h-4 w-4" />
            <span className="sr-only">First page</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous page</span>
          </Button>
          <span className="text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || isLoading}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next page</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages || isLoading}
          >
            <ChevronsRight className="h-4 w-4" />
            <span className="sr-only">Last page</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default UserTable;
