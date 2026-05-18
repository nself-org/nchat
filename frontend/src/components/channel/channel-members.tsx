"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import {
  Search,
  Crown,
  Shield,
  User as UserIcon,
  MoreVertical,
  UserMinus,
  ShieldCheck,
  ShieldOff,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useChannelStore, type ChannelMember } from "@/stores/channel-store";
import { useUIStore } from "@/stores/ui-store";
import { useAuth } from "@/contexts/auth-context";

// ============================================================================
// Types
// ============================================================================

interface ChannelMembersProps {
  channelId: string;
  className?: string;
}

interface MemberUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isOnline: boolean;
  lastSeenAt?: Date;
}

// ============================================================================
// Mock Data (for development)
// ============================================================================

const mockMembers: (ChannelMember & { user: MemberUser })[] = [
  {
    userId: "1",
    role: "owner",
    joinedAt: "2024-01-01T00:00:00Z",
    lastReadAt: null,
    lastReadMessageId: null,
    user: {
      id: "1",
      username: "owner",
      displayName: "Channel Owner",
      avatarUrl: undefined,
      isOnline: true,
    },
  },
  {
    userId: "2",
    role: "admin",
    joinedAt: "2024-01-02T00:00:00Z",
    lastReadAt: null,
    lastReadMessageId: null,
    user: {
      id: "2",
      username: "admin",
      displayName: "Admin User",
      avatarUrl: undefined,
      isOnline: true,
    },
  },
  {
    userId: "3",
    role: "member",
    joinedAt: "2024-01-03T00:00:00Z",
    lastReadAt: null,
    lastReadMessageId: null,
    user: {
      id: "3",
      username: "alice",
      displayName: "Alice Johnson",
      avatarUrl: undefined,
      isOnline: true,
    },
  },
  {
    userId: "4",
    role: "member",
    joinedAt: "2024-01-04T00:00:00Z",
    lastReadAt: null,
    lastReadMessageId: null,
    user: {
      id: "4",
      username: "bob",
      displayName: "Bob Smith",
      avatarUrl: undefined,
      isOnline: false,
      lastSeenAt: new Date(Date.now() - 3600000), // 1 hour ago
    },
  },
  {
    userId: "5",
    role: "member",
    joinedAt: "2024-01-05T00:00:00Z",
    lastReadAt: null,
    lastReadMessageId: null,
    user: {
      id: "5",
      username: "charlie",
      displayName: "Charlie Brown",
      avatarUrl: undefined,
      isOnline: false,
      lastSeenAt: new Date(Date.now() - 86400000), // 1 day ago
    },
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

function getRoleIcon(role: ChannelMember["role"]) {
  switch (role) {
    case "owner":
      return <Crown className="h-3.5 w-3.5 text-yellow-500" />;
    case "admin":
      return <Shield className="h-3.5 w-3.5 text-blue-500" />;
    default:
      return null;
  }
}

function getRoleBadge(role: ChannelMember["role"]) {
  switch (role) {
    case "owner":
      return (
        <Badge
          variant="outline"
          className="border-yellow-500 px-1.5 py-0 text-[10px] text-yellow-600"
        >
          Owner
        </Badge>
      );
    case "admin":
      return (
        <Badge
          variant="outline"
          className="border-blue-500 px-1.5 py-0 text-[10px] text-blue-600"
        >
          Admin
        </Badge>
      );
    default:
      return null;
  }
}

// ============================================================================
// Member Item Component
// ============================================================================

function MemberItem({
  member,
  isCurrentUserAdmin,
  currentUserId,
  onMessage,
  onPromote,
  onDemote,
  onRemove,
}: {
  member: ChannelMember & { user: MemberUser };
  isCurrentUserAdmin: boolean;
  currentUserId?: string;
  onMessage?: (userId: string) => void;
  onPromote?: (userId: string) => void;
  onDemote?: (userId: string) => void;
  onRemove?: (userId: string) => void;
}) {
  const isCurrentUser = member.userId === currentUserId;
  const canManage =
    isCurrentUserAdmin && !isCurrentUser && member.role !== "owner";

  return (
    <div className="hover:bg-accent/50 group flex items-center gap-3 rounded-md px-3 py-2 transition-colors">
      {/* Avatar with presence */}
      <div className="relative">
        <Avatar className="h-8 w-8">
          <AvatarImage
            src={member.user.avatarUrl}
            alt={member.user.displayName}
          />
          <AvatarFallback className="text-xs">
            {member.user.displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {/* Online indicator */}
        <span
          className={cn(
            "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background",
            member.user.isOnline ? "bg-green-500" : "bg-gray-400",
          )}
        />
      </div>

      {/* User info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">
            {member.user.displayName}
          </span>
          {getRoleIcon(member.role)}
          {isCurrentUser && (
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              You
            </Badge>
          )}
        </div>
        <span className="block truncate text-xs text-muted-foreground">
          @{member.user.username}
        </span>
      </div>

      {/* Role badge */}
      <div className="hidden items-center gap-1 group-hover:flex">
        {getRoleBadge(member.role)}
      </div>

      {/* Actions */}
      {(canManage || !isCurrentUser) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {!isCurrentUser && (
              <DropdownMenuItem onClick={() => onMessage?.(member.userId)}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Send message
              </DropdownMenuItem>
            )}
            {canManage && (
              <>
                <DropdownMenuSeparator />
                {member.role === "member" ? (
                  <DropdownMenuItem onClick={() => onPromote?.(member.userId)}>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Make admin
                  </DropdownMenuItem>
                ) : member.role === "admin" ? (
                  <DropdownMenuItem onClick={() => onDemote?.(member.userId)}>
                    <ShieldOff className="mr-2 h-4 w-4" />
                    Remove admin
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  onClick={() => onRemove?.(member.userId)}
                  className="text-destructive focus:text-destructive"
                >
                  <UserMinus className="mr-2 h-4 w-4" />
                  Remove from channel
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function ChannelMembers({ channelId, className }: ChannelMembersProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "owner" || user?.role === "admin";

  const { openModal } = useUIStore();
  const { updateChannelMember, removeChannelMember } = useChannelStore();

  const [searchQuery, setSearchQuery] = useState("");

  // In production, this would come from the store/API
  const members = mockMembers;

  // Filter and sort members
  const { onlineMembers, offlineMembers } = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    let filtered = members;

    if (query) {
      filtered = members.filter(
        (m) =>
          m.user.displayName.toLowerCase().includes(query) ||
          m.user.username.toLowerCase().includes(query),
      );
    }

    // Sort by role (owner > admin > member) then by name
    const sortByRole = (a: (typeof members)[0], b: (typeof members)[0]) => {
      const roleOrder = { owner: 0, admin: 1, member: 2 };
      const roleCompare = roleOrder[a.role] - roleOrder[b.role];
      if (roleCompare !== 0) return roleCompare;
      return a.user.displayName.localeCompare(b.user.displayName);
    };

    const online = filtered.filter((m) => m.user.isOnline).sort(sortByRole);
    const offline = filtered.filter((m) => !m.user.isOnline).sort(sortByRole);

    return { onlineMembers: online, offlineMembers: offline };
  }, [members, searchQuery]);

  const handleMessage = (userId: string) => {};

  const handlePromote = (userId: string) => {
    updateChannelMember(channelId, userId, { role: "admin" });
  };

  const handleDemote = (userId: string) => {
    updateChannelMember(channelId, userId, { role: "member" });
  };

  const handleRemove = (userId: string) => {
    const member = members.find((m) => m.userId === userId);
    if (!member) return;

    openModal("confirm-action", {
      title: "Remove Member",
      message: `Are you sure you want to remove ${member.user.displayName} from this channel?`,
      confirmLabel: "Remove",
      onConfirm: () => {
        removeChannelMember(channelId, userId);
      },
    });
  };

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      {/* Members List */}
      <ScrollArea className="flex-1">
        <div className="px-1">
          {/* Online Section */}
          {onlineMembers.length > 0 && (
            <div className="mb-4">
              <div className="px-3 py-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Online - {onlineMembers.length}
                </span>
              </div>
              {onlineMembers.map((member) => (
                <MemberItem
                  key={member.userId}
                  member={member}
                  isCurrentUserAdmin={isAdmin}
                  currentUserId={user?.id}
                  onMessage={handleMessage}
                  onPromote={handlePromote}
                  onDemote={handleDemote}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}

          {/* Offline Section */}
          {offlineMembers.length > 0 && (
            <div>
              <div className="px-3 py-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Offline - {offlineMembers.length}
                </span>
              </div>
              {offlineMembers.map((member) => (
                <MemberItem
                  key={member.userId}
                  member={member}
                  isCurrentUserAdmin={isAdmin}
                  currentUserId={user?.id}
                  onMessage={handleMessage}
                  onPromote={handlePromote}
                  onDemote={handleDemote}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}

          {/* No Results */}
          {onlineMembers.length === 0 && offlineMembers.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No members found
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Add Members Button (Admin only) */}
      {isAdmin && (
        <div className="border-t p-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => openModal("invite-members", { channelId })}
          >
            <UserIcon className="mr-2 h-4 w-4" />
            Add members
          </Button>
        </div>
      )}
    </div>
  );
}

ChannelMembers.displayName = "ChannelMembers";
