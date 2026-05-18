"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Role, EffectivePermissions } from "@/lib/admin/roles/role-types";
import { canManageRole } from "@/lib/admin/roles/role-hierarchy";
import { RoleCard, RoleCardSkeleton } from "./RoleCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Filter, ArrowUpDown } from "lucide-react";

interface RoleListProps {
  roles: Role[];
  selectedRoleId?: string | null;
  currentUserPermissions?: EffectivePermissions | null;
  isLoading?: boolean;
  onSelectRole?: (roleId: string) => void;
  onEditRole?: (roleId: string) => void;
  onDuplicateRole?: (roleId: string) => void;
  onDeleteRole?: (roleId: string) => void;
  onViewMembers?: (roleId: string) => void;
  onCreateRole?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  filterBuiltIn?: boolean | null;
  onFilterChange?: (filter: boolean | null) => void;
  sortBy?: "position" | "name" | "memberCount";
  onSortChange?: (sort: "position" | "name" | "memberCount") => void;
  sortOrder?: "asc" | "desc";
  onSortOrderChange?: (order: "asc" | "desc") => void;
  className?: string;
}

/**
 * RoleList - Displays a list of roles with search and filtering
 */
export function RoleList({
  roles,
  selectedRoleId,
  currentUserPermissions,
  isLoading = false,
  onSelectRole,
  onEditRole,
  onDuplicateRole,
  onDeleteRole,
  onViewMembers,
  onCreateRole,
  searchQuery = "",
  onSearchChange,
  filterBuiltIn = null,
  onFilterChange,
  sortBy = "position",
  onSortChange,
  sortOrder = "desc",
  onSortOrderChange,
  className,
}: RoleListProps) {
  const canCreateRoles =
    currentUserPermissions &&
    (currentUserPermissions.isAdmin ||
      currentUserPermissions.permissions.includes("manage_roles"));

  const getCanManageRole = (role: Role): boolean => {
    if (!currentUserPermissions) return false;
    return canManageRole(currentUserPermissions.highestRole, role);
  };

  // Filter and sort roles
  const filteredRoles = React.useMemo(() => {
    let result = [...roles];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (role) =>
          role.name.toLowerCase().includes(query) ||
          role.description?.toLowerCase().includes(query),
      );
    }

    // Apply built-in filter
    if (filterBuiltIn !== null) {
      result = result.filter((role) => role.isBuiltIn === filterBuiltIn);
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "position":
          comparison = a.position - b.position;
          break;
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "memberCount":
          comparison = (a.memberCount ?? 0) - (b.memberCount ?? 0);
          break;
      }
      return sortOrder === "desc" ? -comparison : comparison;
    });

    return result;
  }, [roles, searchQuery, filterBuiltIn, sortBy, sortOrder]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with search and filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search roles..."
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Filter by type */}
          <Select
            value={
              filterBuiltIn === null
                ? "all"
                : filterBuiltIn
                  ? "builtin"
                  : "custom"
            }
            onValueChange={(value) => {
              if (value === "all") onFilterChange?.(null);
              else if (value === "builtin") onFilterChange?.(true);
              else onFilterChange?.(false);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="builtin">Built-in</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select
            value={sortBy}
            onValueChange={(value) =>
              onSortChange?.(value as "position" | "name" | "memberCount")
            }
          >
            <SelectTrigger className="w-[130px]">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="position">Position</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="memberCount">Members</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              onSortOrderChange?.(sortOrder === "asc" ? "desc" : "asc")
            }
            title={sortOrder === "asc" ? "Sort descending" : "Sort ascending"}
          >
            <ArrowUpDown
              className={cn(
                "h-4 w-4 transition-transform",
                sortOrder === "asc" && "rotate-180",
              )}
            />
          </Button>

          {/* Create button */}
          {canCreateRoles && onCreateRole && (
            <Button onClick={onCreateRole}>
              <Plus className="mr-2 h-4 w-4" />
              Create Role
            </Button>
          )}
        </div>
      </div>

      {/* Roles count */}
      <div className="text-sm text-muted-foreground">
        {filteredRoles.length} role{filteredRoles.length !== 1 ? "s" : ""}
        {searchQuery && ` matching "${searchQuery}"`}
      </div>

      {/* Role list */}
      <div className="space-y-2">
        {isLoading ? (
          // Loading skeletons
          <>
            <RoleCardSkeleton />
            <RoleCardSkeleton />
            <RoleCardSkeleton />
          </>
        ) : filteredRoles.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8">
            <p className="text-muted-foreground">
              {searchQuery
                ? "No roles found matching your search"
                : "No roles found"}
            </p>
            {canCreateRoles && onCreateRole && !searchQuery && (
              <Button variant="outline" className="mt-4" onClick={onCreateRole}>
                <Plus className="mr-2 h-4 w-4" />
                Create your first role
              </Button>
            )}
          </div>
        ) : (
          // Role cards
          filteredRoles.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              isSelected={selectedRoleId === role.id}
              canManage={getCanManageRole(role)}
              onSelect={() => onSelectRole?.(role.id)}
              onEdit={() => onEditRole?.(role.id)}
              onDuplicate={() => onDuplicateRole?.(role.id)}
              onDelete={() => onDeleteRole?.(role.id)}
              onViewMembers={() => onViewMembers?.(role.id)}
              draggable={getCanManageRole(role)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default RoleList;
