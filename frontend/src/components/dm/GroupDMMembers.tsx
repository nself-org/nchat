"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Crown,
  Shield,
  UserMinus,
  MessageSquare,
  User,
} from "lucide-react";
import type { DirectMessage, DMParticipant } from "@/lib/dm/dm-types";
import { canRemoveFromGroup, canChangeRole } from "@/lib/dm";
import { useDMStore } from "@/stores/dm-store";

// ============================================================================
// Types
// ============================================================================

interface GroupDMMembersProps {
  dm: DirectMessage;
  currentUserId: string;
  onMemberClick?: (participant: DMParticipant) => void;
  onStartDM?: (userId: string) => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function GroupDMMembers({
  dm,
  currentUserId,
  onMemberClick,
  onStartDM,
  className,
}: GroupDMMembersProps) {
  const { removeParticipant, updateParticipant } = useDMStore();

  // Sort participants: owner first, then admins, then members
  const sortedParticipants = [...dm.participants].sort((a, b) => {
    const roleOrder = { owner: 0, admin: 1, member: 2 };
    return roleOrder[a.role] - roleOrder[b.role];
  });

  const handleRemoveMember = (userId: string) => {
    removeParticipant(dm.id, userId);
  };

  const handlePromoteToAdmin = (userId: string) => {
    updateParticipant(dm.id, userId, { role: "admin" });
  };

  const handleDemoteToMember = (userId: string) => {
    updateParticipant(dm.id, userId, { role: "member" });
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold">
          Members ({dm.participantCount})
        </h3>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="space-y-1">
          {sortedParticipants.map((participant) => (
            <MemberItem
              key={participant.userId}
              participant={participant}
              dm={dm}
              currentUserId={currentUserId}
              onMemberClick={onMemberClick}
              onStartDM={onStartDM}
              onRemove={() => handleRemoveMember(participant.userId)}
              onPromote={() => handlePromoteToAdmin(participant.userId)}
              onDemote={() => handleDemoteToMember(participant.userId)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// Member Item Component
// ============================================================================

interface MemberItemProps {
  participant: DMParticipant;
  dm: DirectMessage;
  currentUserId: string;
  onMemberClick?: (participant: DMParticipant) => void;
  onStartDM?: (userId: string) => void;
  onRemove: () => void;
  onPromote: () => void;
  onDemote: () => void;
}

function MemberItem({
  participant,
  dm,
  currentUserId,
  onMemberClick,
  onStartDM,
  onRemove,
  onPromote,
  onDemote,
}: MemberItemProps) {
  const { user } = participant;
  const isCurrentUser = participant.userId === currentUserId;
  const canRemove = canRemoveFromGroup(dm, currentUserId, participant.userId);
  const canPromote = canChangeRole(
    dm,
    currentUserId,
    participant.userId,
    "admin",
  );
  const canDemote = canChangeRole(
    dm,
    currentUserId,
    participant.userId,
    "member",
  );

  const statusColor = {
    online: "bg-green-500",
    away: "bg-yellow-500",
    busy: "bg-red-500",
    offline: "bg-gray-400",
  }[user.status];

  const roleIcon = {
    owner: <Crown className="h-3.5 w-3.5 text-yellow-500" />,
    admin: <Shield className="h-3.5 w-3.5 text-blue-500" />,
    member: null,
  }[participant.role];

  const roleBadge = {
    owner: "Owner",
    admin: "Admin",
    member: null,
  }[participant.role];

  return (
    <div className="group flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent">
      <button
        className="relative flex-shrink-0"
        onClick={() => onMemberClick?.(participant)}
      >
        <Avatar className="h-10 w-10">
          <AvatarImage src={user.avatarUrl || undefined} />
          <AvatarFallback>
            {user.displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span
          className={cn(
            "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
            statusColor,
          )}
        />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <button
            className="truncate font-medium hover:underline"
            onClick={() => onMemberClick?.(participant)}
          >
            {user.displayName}
            {isCurrentUser && (
              <span className="ml-1 text-muted-foreground">(you)</span>
            )}
          </button>
          {roleIcon}
          {roleBadge && (
            <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
              {roleBadge}
            </Badge>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          @{user.username}
        </p>
      </div>

      {/* Actions */}
      {!isCurrentUser && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onMemberClick?.(participant)}>
              <User className="mr-2 h-4 w-4" />
              View profile
            </DropdownMenuItem>

            {onStartDM && (
              <DropdownMenuItem onClick={() => onStartDM(participant.userId)}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Send message
              </DropdownMenuItem>
            )}

            {(canPromote.allowed || canDemote.allowed) && (
              <>
                <DropdownMenuSeparator />
                {participant.role === "member" && canPromote.allowed && (
                  <DropdownMenuItem onClick={onPromote}>
                    <Shield className="mr-2 h-4 w-4" />
                    Make admin
                  </DropdownMenuItem>
                )}
                {participant.role === "admin" && canDemote.allowed && (
                  <DropdownMenuItem onClick={onDemote}>
                    <Shield className="mr-2 h-4 w-4" />
                    Remove admin
                  </DropdownMenuItem>
                )}
              </>
            )}

            {canRemove.allowed && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onRemove}
                  className="text-destructive focus:text-destructive"
                >
                  <UserMinus className="mr-2 h-4 w-4" />
                  Remove from group
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

GroupDMMembers.displayName = "GroupDMMembers";
