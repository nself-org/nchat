"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Role, EffectivePermissions } from "@/lib/admin/roles/role-types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, UserPlus, UserMinus, MoreVertical, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RoleBadge } from "./RoleBadge";
import { getInitials } from "@/stores/user-store";

interface RoleMember {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  email?: string;
  assignedAt: Date;
  assignedBy?: string;
}

interface RoleMembersProps {
  role: Role;
  members: RoleMember[];
  isLoading?: boolean;
  canManage?: boolean;
  onAddMember?: () => void;
  onRemoveMember?: (userId: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  className?: string;
}

/**
 * RoleMembers - Displays and manages members with a specific role
 */
export function RoleMembers({
  role,
  members,
  isLoading = false,
  canManage = false,
  onAddMember,
  onRemoveMember,
  searchQuery = "",
  onSearchChange,
  className,
}: RoleMembersProps) {
  const filteredMembers = React.useMemo(() => {
    if (!searchQuery) return members;
    const query = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.username.toLowerCase().includes(query) ||
        m.displayName.toLowerCase().includes(query) ||
        m.email?.toLowerCase().includes(query),
    );
  }, [members, searchQuery]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RoleBadge name={role.name} color={role.color} icon={role.icon} />
          <span className="text-muted-foreground">
            {members.length} member{members.length !== 1 ? "s" : ""}
          </span>
        </div>
        {canManage && onAddMember && (
          <Button onClick={onAddMember} size="sm">
            <UserPlus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="Search members..."
          className="pl-9"
        />
      </div>

      {/* Members list */}
      <div className="space-y-2">
        {isLoading ? (
          // Loading skeletons
          <>
            <MemberSkeleton />
            <MemberSkeleton />
            <MemberSkeleton />
          </>
        ) : filteredMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8">
            <p className="text-muted-foreground">
              {searchQuery
                ? "No members found matching your search"
                : "No members with this role"}
            </p>
            {canManage && onAddMember && !searchQuery && (
              <Button variant="outline" className="mt-4" onClick={onAddMember}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add first member
              </Button>
            )}
          </div>
        ) : (
          filteredMembers.map((member) => (
            <MemberItem
              key={member.userId}
              member={member}
              roleColor={role.color}
              canManage={canManage}
              onRemove={
                onRemoveMember ? () => onRemoveMember(member.userId) : undefined
              }
            />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * MemberItem - Single member display
 */
interface MemberItemProps {
  member: RoleMember;
  roleColor: string;
  canManage?: boolean;
  onRemove?: () => void;
}

function MemberItem({
  member,
  roleColor,
  canManage = false,
  onRemove,
}: MemberItemProps) {
  const assignedDate = new Date(member.assignedAt);
  const formattedDate = assignedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="hover:bg-accent/50 group flex items-center gap-3 rounded-lg border p-3 transition-colors">
      <Avatar>
        <AvatarImage src={member.avatarUrl} alt={member.displayName} />
        <AvatarFallback
          style={{ backgroundColor: `${roleColor}20`, color: roleColor }}
        >
          {getInitials(member.displayName)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{member.displayName}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>@{member.username}</span>
          <span className="text-xs">Added {formattedDate}</span>
        </div>
      </div>

      {canManage && onRemove && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100"
            >
              <MoreVertical size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onRemove}
            >
              <UserMinus size={14} className="mr-2" />
              Remove Role
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

/**
 * MemberSkeleton - Loading skeleton for member item
 */
function MemberSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-3 rounded-lg border p-3">
      <div className="h-10 w-10 rounded-full bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-3 w-48 rounded bg-muted" />
      </div>
    </div>
  );
}

/**
 * MemberSelector - Component for selecting users to add to a role
 */
interface MemberSelectorProps {
  availableUsers: Array<{
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  }>;
  selectedUserIds: string[];
  onSelect: (userId: string) => void;
  onDeselect: (userId: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function MemberSelector({
  availableUsers,
  selectedUserIds,
  onSelect,
  onDeselect,
  searchQuery = "",
  onSearchChange,
  isLoading = false,
  className,
}: MemberSelectorProps) {
  const filteredUsers = React.useMemo(() => {
    if (!searchQuery) return availableUsers;
    const query = searchQuery.toLowerCase();
    return availableUsers.filter(
      (u) =>
        u.username.toLowerCase().includes(query) ||
        u.displayName.toLowerCase().includes(query),
    );
  }, [availableUsers, searchQuery]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Selected users */}
      {selectedUserIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedUserIds.map((userId) => {
            const user = availableUsers.find((u) => u.id === userId);
            if (!user) return null;

            return (
              <div
                key={userId}
                className="bg-primary/10 flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2"
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage src={user.avatarUrl} />
                  <AvatarFallback className="text-xs">
                    {getInitials(user.displayName)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{user.displayName}</span>
                <button
                  type="button"
                  onClick={() => onDeselect(userId)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="Search users..."
          className="pl-9"
        />
      </div>

      {/* User list */}
      <div className="max-h-48 space-y-1 overflow-y-auto">
        {isLoading ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            Loading users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            No users found
          </div>
        ) : (
          filteredUsers.map((user) => {
            const isSelected = selectedUserIds.includes(user.id);

            return (
              <button
                key={user.id}
                type="button"
                onClick={() =>
                  isSelected ? onDeselect(user.id) : onSelect(user.id)
                }
                className={cn(
                  "flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors",
                  isSelected ? "bg-primary/10" : "hover:bg-accent",
                )}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatarUrl} />
                  <AvatarFallback>
                    {getInitials(user.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{user.displayName}</div>
                  <div className="truncate text-sm text-muted-foreground">
                    @{user.username}
                  </div>
                </div>
                {isSelected && (
                  <div className="h-2 w-2 rounded-full bg-primary" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export default RoleMembers;
