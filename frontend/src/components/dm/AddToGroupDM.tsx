"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { Search, X, Check, Loader2, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { DirectMessage } from "@/lib/dm/dm-types";
import { canAddToGroup, canInviteToGroup } from "@/lib/dm";
import { useDMStore } from "@/stores/dm-store";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  status: string;
}

interface AddToGroupDMProps {
  dm: DirectMessage;
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMembersAdded?: (userIds: string[]) => void;
}

// ============================================================================
// Component
// ============================================================================

export function AddToGroupDM({
  dm,
  currentUserId,
  open,
  onOpenChange,
  onMembersAdded,
}: AddToGroupDMProps) {
  const { addParticipant } = useDMStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Check if current user can invite
  const canInvite = canInviteToGroup(dm, currentUserId);

  // Get existing member IDs
  const existingMemberIds = new Set(dm.participants.map((p) => p.userId));

  // Mock users (replace with actual user fetch)
  const mockUsers: User[] = [
    {
      id: "user-2",
      username: "alice",
      displayName: "Alice Johnson",
      avatarUrl: null,
      status: "online",
    },
    {
      id: "user-3",
      username: "bob",
      displayName: "Bob Smith",
      avatarUrl: null,
      status: "away",
    },
    {
      id: "user-4",
      username: "charlie",
      displayName: "Charlie Brown",
      avatarUrl: null,
      status: "offline",
    },
    {
      id: "user-5",
      username: "diana",
      displayName: "Diana Prince",
      avatarUrl: null,
      status: "online",
    },
    {
      id: "user-6",
      username: "eve",
      displayName: "Eve Wilson",
      avatarUrl: null,
      status: "busy",
    },
    {
      id: "user-7",
      username: "frank",
      displayName: "Frank Miller",
      avatarUrl: null,
      status: "online",
    },
    {
      id: "user-8",
      username: "grace",
      displayName: "Grace Lee",
      avatarUrl: null,
      status: "offline",
    },
  ].filter((u) => !existingMemberIds.has(u.id));

  const filteredUsers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return mockUsers;
    return mockUsers.filter(
      (user) =>
        user.displayName.toLowerCase().includes(query) ||
        user.username.toLowerCase().includes(query),
    );
  }, [searchQuery, mockUsers]);

  const selectedUsers = mockUsers.filter((u) => selectedUserIds.includes(u.id));

  const handleClose = () => {
    setSearchQuery("");
    setSelectedUserIds([]);
    onOpenChange(false);
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleAdd = async () => {
    if (selectedUserIds.length === 0) return;

    setIsLoading(true);
    try {
      // Add each selected user to the group
      for (const userId of selectedUserIds) {
        const user = mockUsers.find((u) => u.id === userId);
        if (user) {
          addParticipant(dm.id, {
            id: `p-${userId}`,
            userId,
            dmId: dm.id,
            joinedAt: new Date().toISOString(),
            lastReadAt: null,
            lastReadMessageId: null,
            notificationSetting: "all",
            isMuted: false,
            mutedUntil: null,
            role: "member",
            user: {
              id: user.id,
              username: user.username,
              displayName: user.displayName,
              avatarUrl: user.avatarUrl,
              status: user.status as "online" | "away" | "busy" | "offline",
              statusEmoji: null,
              lastSeenAt: null,
            },
          });
        }
      }

      onMembersAdded?.(selectedUserIds);
      handleClose();
    } catch (error) {
      logger.error("Failed to add members:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!canInvite) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Members</DialogTitle>
          <DialogDescription>
            Add people to {dm.name || "this group"}.
          </DialogDescription>
        </DialogHeader>

        {/* Selected Users */}
        {selectedUsers.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-2">
            {selectedUsers.map((user) => (
              <Badge key={user.id} variant="secondary" className="gap-1 pr-1">
                {user.displayName}
                <button
                  onClick={() => toggleUserSelection(user.id)}
                  className="hover:bg-muted-foreground/20 ml-1 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
        </div>

        {/* User List */}
        <ScrollArea className="-mx-6 h-[280px] px-6">
          <div className="space-y-1">
            {filteredUsers.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {mockUsers.length === 0
                  ? "No more people to add"
                  : "No users found"}
              </p>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = selectedUserIds.includes(user.id);
                const addResult = canAddToGroup(dm, user.id);

                return (
                  <button
                    key={user.id}
                    onClick={() =>
                      addResult.allowed && toggleUserSelection(user.id)
                    }
                    disabled={!addResult.allowed}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2 py-2 transition-colors",
                      "hover:text-accent-foreground hover:bg-accent",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                      isSelected && "bg-accent",
                    )}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.avatarUrl || undefined} />
                      <AvatarFallback>
                        {user.displayName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">{user.displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        @{user.username}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                        <Check className="text-primary-foreground h-3 w-3" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={selectedUserIds.length === 0 || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Add ({selectedUserIds.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

AddToGroupDM.displayName = "AddToGroupDM";
