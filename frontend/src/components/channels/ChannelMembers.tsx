"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import {
  Users,
  Search,
  UserPlus,
  Crown,
  Shield,
  MoreVertical,
  UserMinus,
  ShieldCheck,
  ShieldX,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChannelInvite } from "./ChannelInvite";
import type { Channel, ChannelMember } from "@/stores/channel-store";
import { formatTimeAgo } from "@/lib/channels/channel-stats";

// ============================================================================
// Types
// ============================================================================

export interface ChannelMembersProps {
  channel: Channel;
  isAdmin?: boolean;
  currentUserId?: string;
  onInvite?: (userIds: string[]) => Promise<void>;
  onRemove?: (userId: string) => Promise<void>;
  onPromote?: (userId: string, role: "admin" | "member") => Promise<void>;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function ChannelMembers({
  channel,
  isAdmin = false,
  currentUserId,
  onInvite,
  onRemove,
  onPromote,
  className,
}: ChannelMembersProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filter members by search
  const filteredMembers = useMemo(() => {
    if (!channel.members) return [];

    if (!searchQuery) return channel.members;

    const query = searchQuery.toLowerCase();
    return channel.members.filter((member) =>
      member.userId.toLowerCase().includes(query),
    );
  }, [channel.members, searchQuery]);

  // Group members by role
  const { owners, admins, members } = useMemo(() => {
    const result = {
      owners: [] as ChannelMember[],
      admins: [] as ChannelMember[],
      members: [] as ChannelMember[],
    };

    for (const member of filteredMembers) {
      if (member.role === "owner") {
        result.owners.push(member);
      } else if (member.role === "admin") {
        result.admins.push(member);
      } else {
        result.members.push(member);
      }
    }

    return result;
  }, [filteredMembers]);

  const handleRemove = async (userId: string) => {
    try {
      setIsLoading(true);
      await onRemove?.(userId);
    } finally {
      setIsLoading(false);
      setRemovingUserId(null);
    }
  };

  const handlePromote = async (userId: string, role: "admin" | "member") => {
    try {
      setIsLoading(true);
      await onPromote?.(userId, role);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMemberRow = (member: ChannelMember) => {
    const isCurrentUser = member.userId === currentUserId;
    const isOwner = member.role === "owner";
    const canManage = isAdmin && !isOwner && !isCurrentUser;

    return (
      <div
        key={member.userId}
        className="hover:bg-accent/50 flex items-center gap-3 rounded-lg p-3"
      >
        <Avatar className="h-10 w-10">
          <AvatarFallback>
            {member.userId.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">
              {member.userId}
              {isCurrentUser && " (you)"}
            </span>
            {member.role === "owner" && (
              <Crown className="h-4 w-4 text-yellow-500" />
            )}
            {member.role === "admin" && (
              <Shield className="h-4 w-4 text-blue-500" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Joined {formatTimeAgo(new Date(member.joinedAt))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={member.role === "owner" ? "default" : "secondary"}
            className="text-xs"
          >
            {member.role}
          </Badge>
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {member.role === "member" ? (
                  <DropdownMenuItem
                    onClick={() => handlePromote(member.userId, "admin")}
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Make admin
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => handlePromote(member.userId, "member")}
                  >
                    <ShieldX className="mr-2 h-4 w-4" />
                    Remove admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setRemovingUserId(member.userId)}
                >
                  <UserMinus className="mr-2 h-4 w-4" />
                  Remove from channel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("space-y-6", className)}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Members ({channel.memberCount})
              </CardTitle>
              <CardDescription>
                People who have access to this channel
              </CardDescription>
            </div>
            {isAdmin && (
              <Button onClick={() => setShowInviteDialog(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Member List */}
          <ScrollArea className="h-[400px]">
            <div className="space-y-1">
              {/* Owners */}
              {owners.length > 0 && (
                <div className="space-y-1">
                  <p className="px-3 py-2 text-xs font-medium text-muted-foreground">
                    OWNER - {owners.length}
                  </p>
                  {owners.map(renderMemberRow)}
                </div>
              )}

              {/* Admins */}
              {admins.length > 0 && (
                <div className="space-y-1">
                  <p className="px-3 py-2 text-xs font-medium text-muted-foreground">
                    ADMINS - {admins.length}
                  </p>
                  {admins.map(renderMemberRow)}
                </div>
              )}

              {/* Members */}
              {members.length > 0 && (
                <div className="space-y-1">
                  <p className="px-3 py-2 text-xs font-medium text-muted-foreground">
                    MEMBERS - {members.length}
                  </p>
                  {members.map(renderMemberRow)}
                </div>
              )}

              {/* Empty state */}
              {filteredMembers.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  {searchQuery
                    ? `No members match "${searchQuery}"`
                    : "No members in this channel"}
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <ChannelInvite
        channel={channel}
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        onInvite={onInvite}
      />

      {/* Remove Confirmation Dialog */}
      <AlertDialog
        open={removingUserId !== null}
        onOpenChange={() => setRemovingUserId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member from #{channel.name}?
              They will no longer have access to this channel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removingUserId && handleRemove(removingUserId)}
              className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

ChannelMembers.displayName = "ChannelMembers";
