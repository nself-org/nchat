"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { UserAvatar } from "@/components/user/user-avatar";
import { RoleBadge } from "@/components/user/role-badge";
import {
  type UserProfile,
  type UserRole,
  type PresenceStatus,
  getPresenceLabel,
} from "@/stores/user-store";
import {
  X,
  Crown,
  Shield,
  ShieldCheck,
  MessageSquare,
  UserPlus,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface MemberListProps {
  members: UserProfile[];
  loading?: boolean;
  onClose?: () => void;
  onMemberClick?: (member: UserProfile) => void;
  onStartDM?: (member: UserProfile) => void;
  className?: string;
}

interface MemberGroupProps {
  title: string;
  icon?: React.ReactNode;
  members: UserProfile[];
  onMemberClick?: (member: UserProfile) => void;
  onStartDM?: (member: UserProfile) => void;
  defaultExpanded?: boolean;
}

// ============================================================================
// Helper: Group members by role
// ============================================================================

function groupMembersByRole(
  members: UserProfile[],
): Record<UserRole, UserProfile[]> {
  const groups: Record<UserRole, UserProfile[]> = {
    owner: [],
    admin: [],
    moderator: [],
    member: [],
    guest: [],
  };

  members.forEach((member) => {
    groups[member.role].push(member);
  });

  // Sort each group by online status, then alphabetically
  const sortByPresenceAndName = (a: UserProfile, b: UserProfile) => {
    const presenceOrder: Record<PresenceStatus, number> = {
      online: 0,
      away: 1,
      dnd: 2,
      invisible: 3,
      offline: 3,
    };
    const presenceDiff = presenceOrder[a.presence] - presenceOrder[b.presence];
    if (presenceDiff !== 0) return presenceDiff;
    return a.displayName.localeCompare(b.displayName);
  };

  Object.keys(groups).forEach((role) => {
    groups[role as UserRole].sort(sortByPresenceAndName);
  });

  return groups;
}

// ============================================================================
// Member Item Component
// ============================================================================

interface MemberItemProps {
  member: UserProfile;
  onClick?: () => void;
  onStartDM?: () => void;
}

function MemberItem({ member, onClick, onStartDM }: MemberItemProps) {
  const [showPopover, setShowPopover] = React.useState(false);

  return (
    <Popover open={showPopover} onOpenChange={setShowPopover}>
      <PopoverTrigger asChild>
        <button
          onClick={() => setShowPopover(true)}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-2 py-1.5",
            "transition-colors hover:bg-accent",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <UserAvatar
            user={member}
            size="sm"
            presence={member.presence}
            showPresence
          />
          <div className="min-w-0 flex-1 text-left">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "truncate text-sm font-medium",
                  member.presence === "offline" && "text-muted-foreground",
                )}
              >
                {member.displayName}
              </span>
            </div>
            {member.customStatus?.text && (
              <p className="truncate text-xs text-muted-foreground">
                {member.customStatus.emoji} {member.customStatus.text}
              </p>
            )}
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0" sideOffset={4}>
        <div className="p-4">
          {/* Profile Header */}
          <div className="flex items-start gap-3">
            <UserAvatar
              user={member}
              size="lg"
              presence={member.presence}
              showPresence
            />
            <div className="min-w-0 flex-1">
              <h4 className="truncate font-semibold">{member.displayName}</h4>
              <p className="truncate text-sm text-muted-foreground">
                @{member.username}
              </p>
              <RoleBadge role={member.role} size="xs" className="mt-1" />
            </div>
          </div>

          {/* Status */}
          <div className="mt-3 flex items-center gap-2 text-sm">
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                member.presence === "online" && "bg-green-500",
                member.presence === "away" && "bg-yellow-500",
                member.presence === "dnd" && "bg-red-500",
                member.presence === "offline" && "bg-gray-400",
              )}
            />
            <span className="text-muted-foreground">
              {getPresenceLabel(member.presence)}
            </span>
          </div>

          {member.customStatus?.text && (
            <p className="mt-2 text-sm">
              {member.customStatus.emoji} {member.customStatus.text}
            </p>
          )}

          {member.bio && (
            <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
              {member.bio}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 border-t p-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              onClick?.();
              setShowPopover(false);
            }}
          >
            View Profile
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={() => {
              onStartDM?.();
              setShowPopover(false);
            }}
          >
            <MessageSquare className="mr-1.5 h-4 w-4" />
            Message
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// Member Group Component
// ============================================================================

function MemberGroup({
  title,
  icon,
  members,
  onMemberClick,
  onStartDM,
  defaultExpanded = true,
}: MemberGroupProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  if (members.length === 0) return null;

  return (
    <div className="mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-2 py-1 text-xs font-semibold uppercase text-muted-foreground transition-colors hover:text-foreground"
      >
        {icon}
        <span>{title}</span>
        <span className="ml-auto">{members.length}</span>
      </button>
      {expanded && (
        <div className="mt-1 space-y-0.5">
          {members.map((member) => (
            <MemberItem
              key={member.id}
              member={member}
              onClick={() => onMemberClick?.(member)}
              onStartDM={() => onStartDM?.(member)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Member List Skeleton
// ============================================================================

function MemberListSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[1, 2, 3].map((group) => (
        <div key={group} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="flex items-center gap-3 px-2 py-1.5">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Member List Component
// ============================================================================

export function MemberList({
  members,
  loading = false,
  onClose,
  onMemberClick,
  onStartDM,
  className,
}: MemberListProps) {
  const groupedMembers = React.useMemo(
    () => groupMembersByRole(members),
    [members],
  );

  const onlineCount = members.filter((m) => m.presence !== "offline").length;

  return (
    <div
      className={cn("flex h-full flex-col border-l bg-background", className)}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Members</h2>
          <span className="text-xs text-muted-foreground">
            {onlineCount} online
          </span>
        </div>
        {onClose && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Close member list</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Member List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <MemberListSkeleton />
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <UserPlus className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No members in this channel yet.
            </p>
          </div>
        ) : (
          <div className="p-2">
            {/* Owners */}
            <MemberGroup
              title="Owner"
              icon={<Crown className="h-3 w-3" />}
              members={groupedMembers.owner}
              onMemberClick={onMemberClick}
              onStartDM={onStartDM}
            />

            {/* Admins */}
            <MemberGroup
              title="Admins"
              icon={<ShieldCheck className="h-3 w-3" />}
              members={groupedMembers.admin}
              onMemberClick={onMemberClick}
              onStartDM={onStartDM}
            />

            {/* Moderators */}
            <MemberGroup
              title="Moderators"
              icon={<Shield className="h-3 w-3" />}
              members={groupedMembers.moderator}
              onMemberClick={onMemberClick}
              onStartDM={onStartDM}
            />

            {/* Members */}
            <MemberGroup
              title="Members"
              members={groupedMembers.member}
              onMemberClick={onMemberClick}
              onStartDM={onStartDM}
            />

            {/* Guests */}
            <MemberGroup
              title="Guests"
              members={groupedMembers.guest}
              onMemberClick={onMemberClick}
              onStartDM={onStartDM}
              defaultExpanded={false}
            />
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export { MemberListSkeleton, MemberItem, MemberGroup };
