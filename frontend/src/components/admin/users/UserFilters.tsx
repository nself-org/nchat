"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { X } from "lucide-react";
import { useUserManagementStore } from "@/stores/user-management-store";
import type {
  UserFilterOptions,
  UserRole,
  UserStatus,
} from "@/lib/admin/users/user-types";

interface UserFiltersProps {
  filters: UserFilterOptions;
  onFiltersChange: (filters: UserFilterOptions) => void;
  onClear: () => void;
}

export function UserFilters({
  filters,
  onFiltersChange,
  onClear,
}: UserFiltersProps) {
  const { roles, isLoadingRoles } = useUserManagementStore();

  const handleChange = (key: keyof UserFilterOptions, value: unknown) => {
    onFiltersChange({
      ...filters,
      [key]: value === "" || value === "all" ? undefined : value,
    });
  };

  const hasActiveFilters = Object.values(filters).some(
    (v) => v !== undefined && v !== null && v !== "",
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Role Filter */}
        <div className="space-y-2">
          <Label htmlFor="role-filter">Role</Label>
          <Select
            value={filters.role || "all"}
            onValueChange={(value) => handleChange("role", value)}
          >
            <SelectTrigger id="role-filter">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {isLoadingRoles ? (
                <SelectItem value="loading" disabled>
                  Loading...
                </SelectItem>
              ) : roles.length > 0 ? (
                roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))
              ) : (
                <>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="guest">Guest</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <Label htmlFor="status-filter">Status</Label>
          <Select
            value={filters.status || "all"}
            onValueChange={(value) =>
              handleChange("status", value as UserStatus)
            }
          >
            <SelectTrigger id="status-filter">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="banned">Banned</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Created After */}
        <div className="space-y-2">
          <Label htmlFor="created-after">Joined After</Label>
          <Input
            id="created-after"
            type="date"
            value={filters.createdAfter?.split("T")[0] || ""}
            onChange={(e) =>
              handleChange(
                "createdAfter",
                e.target.value
                  ? new Date(e.target.value).toISOString()
                  : undefined,
              )
            }
          />
        </div>

        {/* Created Before */}
        <div className="space-y-2">
          <Label htmlFor="created-before">Joined Before</Label>
          <Input
            id="created-before"
            type="date"
            value={filters.createdBefore?.split("T")[0] || ""}
            onChange={(e) =>
              handleChange(
                "createdBefore",
                e.target.value
                  ? new Date(e.target.value).toISOString()
                  : undefined,
              )
            }
          />
        </div>

        {/* Last Seen After */}
        <div className="space-y-2">
          <Label htmlFor="last-seen-after">Last Seen After</Label>
          <Input
            id="last-seen-after"
            type="date"
            value={filters.lastSeenAfter?.split("T")[0] || ""}
            onChange={(e) =>
              handleChange(
                "lastSeenAfter",
                e.target.value
                  ? new Date(e.target.value).toISOString()
                  : undefined,
              )
            }
          />
        </div>

        {/* Last Seen Before */}
        <div className="space-y-2">
          <Label htmlFor="last-seen-before">Last Seen Before</Label>
          <Input
            id="last-seen-before"
            type="date"
            value={filters.lastSeenBefore?.split("T")[0] || ""}
            onChange={(e) =>
              handleChange(
                "lastSeenBefore",
                e.target.value
                  ? new Date(e.target.value).toISOString()
                  : undefined,
              )
            }
          />
        </div>
      </div>

      {/* Toggle Filters */}
      <div className="flex flex-wrap gap-6">
        <div className="flex items-center space-x-2">
          <Switch
            id="is-verified"
            checked={filters.isVerified === true}
            onCheckedChange={(checked) =>
              handleChange("isVerified", checked ? true : undefined)
            }
          />
          <Label htmlFor="is-verified">Verified only</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="is-banned"
            checked={filters.isBanned === true}
            onCheckedChange={(checked) =>
              handleChange("isBanned", checked ? true : undefined)
            }
          />
          <Label htmlFor="is-banned">Banned only</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="is-inactive"
            checked={filters.isActive === false}
            onCheckedChange={(checked) =>
              handleChange("isActive", checked ? false : undefined)
            }
          />
          <Label htmlFor="is-inactive">Inactive only</Label>
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="mr-2 h-4 w-4" />
            Clear all filters
          </Button>
        </div>
      )}
    </div>
  );
}

export default UserFilters;
