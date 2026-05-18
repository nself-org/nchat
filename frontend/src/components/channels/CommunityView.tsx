/**
 * CommunityView - WhatsApp-style community view
 *
 * Displays community structure with:
 * - Community header with icon and description
 * - Announcement channel (read-only for members)
 * - List of sub-groups (up to 100)
 * - Member management
 * - Community events
 */

"use client";

import * as React from "react";
import { useState } from "react";
import {
  Megaphone,
  Users,
  Plus,
  Settings,
  UserPlus,
  Calendar,
  ChevronRight,
  Hash,
  Lock,
  Crown,
  Shield,
  MoreVertical,
  Eye,
  Bell,
  BellOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CommunityWithGroups, Channel } from "@/types/advanced-channels";

// ============================================================================
// Types
// ============================================================================

export interface CommunityViewProps {
  community: CommunityWithGroups;
  isAdmin?: boolean;
  onSelectChannel?: (channelId: string) => void;
  onAddGroup?: () => void;
  onInviteMembers?: () => void;
  onSettings?: () => void;
  onViewEvents?: () => void;
  selectedChannelId?: string;
  className?: string;
}

// ============================================================================
// Community Header
// ============================================================================

function CommunityHeader({
  community,
  isAdmin,
  onInviteMembers,
  onSettings,
  onViewEvents,
}: {
  community: CommunityWithGroups;
  isAdmin: boolean;
  onInviteMembers?: () => void;
  onSettings?: () => void;
  onViewEvents?: () => void;
}) {
  return (
    <div className="space-y-3 p-4">
      {/* Community info */}
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 flex-shrink-0">
          <AvatarImage src={community.iconUrl} alt={community.name} />
          <AvatarFallback className="text-lg font-bold">
            {community.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{community.name}</h2>
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {onInviteMembers && (
                    <DropdownMenuItem onClick={onInviteMembers}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Invite Members
                    </DropdownMenuItem>
                  )}
                  {community.eventsEnabled && onViewEvents && (
                    <DropdownMenuItem onClick={onViewEvents}>
                      <Calendar className="mr-2 h-4 w-4" />
                      Community Events
                    </DropdownMenuItem>
                  )}
                  {onSettings && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onSettings}>
                        <Settings className="mr-2 h-4 w-4" />
                        Community Settings
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {community.description && (
            <p className="text-sm text-muted-foreground">
              {community.description}
            </p>
          )}

          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {community.totalMemberCount.toLocaleString()} members
            </span>
            <span className="flex items-center gap-1">
              <Hash className="h-3 w-3" />
              {community.groupCount} groups
            </span>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      {isAdmin && (
        <div className="flex gap-2">
          {onInviteMembers && (
            <Button variant="outline" size="sm" onClick={onInviteMembers}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite
            </Button>
          )}
          {community.eventsEnabled && onViewEvents && (
            <Button variant="outline" size="sm" onClick={onViewEvents}>
              <Calendar className="mr-2 h-4 w-4" />
              Events
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Announcement Channel
// ============================================================================

function AnnouncementChannel({
  channel,
  isSelected,
  onClick,
}: {
  channel: Channel;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "hover:bg-muted/50 flex w-full items-center gap-3 rounded-lg p-3 transition-colors",
        isSelected && "bg-muted",
      )}
    >
      <div className="bg-primary/10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg">
        <Megaphone className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{channel.name}</span>
          <Badge variant="secondary" className="text-xs">
            Announcements
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {channel.topic || "Admin-only announcements"}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
    </button>
  );
}

// ============================================================================
// Group Item
// ============================================================================

function GroupItem({
  channel,
  isSelected,
  isAdmin,
  onClick,
  onRemove,
}: {
  channel: Channel;
  isSelected: boolean;
  isAdmin: boolean;
  onClick: () => void;
  onRemove?: () => void;
}) {
  const [showOptions, setShowOptions] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setShowOptions(true)}
      onMouseLeave={() => setShowOptions(false)}
      className={cn(
        "hover:bg-muted/50 flex w-full items-center gap-3 rounded-lg p-3 transition-colors",
        isSelected && "bg-muted",
      )}
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
        <Hash className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className="font-medium">{channel.name}</span>
          {channel.isPrivate && (
            <Lock className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {channel.memberCount.toLocaleString()} members
        </p>
      </div>
      {showOptions && isAdmin && onRemove ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      ) : (
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      )}
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CommunityView({
  community,
  isAdmin = false,
  onSelectChannel,
  onAddGroup,
  onInviteMembers,
  onSettings,
  onViewEvents,
  selectedChannelId,
  className,
}: CommunityViewProps) {
  const canAddGroups =
    isAdmin ||
    (community.addGroupsPermission === "member" &&
      community.groupCount < community.maxGroups);

  const groupsRemaining = community.maxGroups - community.groupCount;

  return (
    <div className={cn("flex h-full flex-col bg-background", className)}>
      {/* Header */}
      <CommunityHeader
        community={community}
        isAdmin={isAdmin}
        onInviteMembers={onInviteMembers}
        onSettings={onSettings}
        onViewEvents={onViewEvents}
      />

      <Separator />

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {/* Announcement channel */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-2">
              <Megaphone className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                Announcements
              </h3>
            </div>
            <AnnouncementChannel
              channel={community.announcementChannel}
              isSelected={
                selectedChannelId === community.announcementChannel.id
              }
              onClick={() =>
                onSelectChannel?.(community.announcementChannel.id)
              }
            />
          </div>

          <Separator />

          {/* Groups */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                  Groups ({community.groupCount})
                </h3>
              </div>
              {canAddGroups && onAddGroup && (
                <Button variant="ghost" size="sm" onClick={onAddGroup}>
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Group list */}
            <div className="space-y-1">
              {community.groups.map((group) => (
                <GroupItem
                  key={group.channel.id}
                  channel={group.channel}
                  isSelected={selectedChannelId === group.channel.id}
                  isAdmin={isAdmin}
                  onClick={() => onSelectChannel?.(group.channel.id)}
                  onRemove={
                    isAdmin
                      ? () => {
                          // Handle remove group
                        }
                      : undefined
                  }
                />
              ))}

              {community.groups.length === 0 && (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <Hash className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium">No groups yet</p>
                  <p className="text-xs text-muted-foreground">
                    {canAddGroups
                      ? "Add your first group to get started"
                      : "Admins can add groups to this community"}
                  </p>
                  {canAddGroups && onAddGroup && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={onAddGroup}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Group
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Groups remaining indicator */}
            {groupsRemaining > 0 && groupsRemaining <= 10 && (
              <div className="rounded-lg bg-amber-500/10 p-3">
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {groupsRemaining} {groupsRemaining === 1 ? "slot" : "slots"}{" "}
                  remaining
                </p>
              </div>
            )}
          </div>

          {/* Community info */}
          <Separator />
          <div className="space-y-2 px-2">
            <h4 className="text-sm font-semibold">Community Info</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Members can invite</span>
                <span>{community.membersCanInvite ? "Yes" : "No"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Approval required</span>
                <span>{community.approvalRequired ? "Yes" : "No"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Events enabled</span>
                <span>{community.eventsEnabled ? "Yes" : "No"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Max groups</span>
                <span>{community.maxGroups}</span>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

export default CommunityView;
