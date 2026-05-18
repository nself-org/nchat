"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Search, X, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useChannelStore, type Channel } from "@/stores/channel-store";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

interface CreateDmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UserOption {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isOnline: boolean;
}

// ============================================================================
// Mock Users (for development)
// ============================================================================

const mockUsers: UserOption[] = [
  { id: "1", username: "alice", displayName: "Alice Johnson", isOnline: true },
  { id: "2", username: "bob", displayName: "Bob Smith", isOnline: true },
  {
    id: "3",
    username: "charlie",
    displayName: "Charlie Brown",
    isOnline: false,
  },
  { id: "4", username: "diana", displayName: "Diana Prince", isOnline: true },
  { id: "5", username: "eve", displayName: "Eve Wilson", isOnline: false },
  { id: "6", username: "frank", displayName: "Frank Castle", isOnline: false },
  { id: "7", username: "grace", displayName: "Grace Hopper", isOnline: true },
  { id: "8", username: "henry", displayName: "Henry Adams", isOnline: false },
];

// ============================================================================
// Component
// ============================================================================

export function CreateDmModal({ open, onOpenChange }: CreateDmModalProps) {
  const router = useRouter();
  const { addChannel, channels } = useChannelStore();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<UserOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setSelectedUsers([]);
    }
  }, [open]);

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    let users = mockUsers;

    if (query) {
      users = users.filter(
        (u) =>
          u.displayName.toLowerCase().includes(query) ||
          u.username.toLowerCase().includes(query),
      );
    }

    // Sort: online first, then alphabetically
    return users.sort((a, b) => {
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [searchQuery]);

  const isGroupDM = selectedUsers.length > 1;

  const handleToggleUser = (user: UserOption) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.some((u) => u.id === user.id);
      if (isSelected) {
        return prev.filter((u) => u.id !== user.id);
      }
      return [...prev, user];
    });
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleStartConversation = async () => {
    if (selectedUsers.length === 0) return;

    setIsLoading(true);
    try {
      // Check if DM already exists
      const existingDM = Array.from(channels.values()).find((ch) => {
        if (selectedUsers.length === 1) {
          return ch.type === "direct" && ch.otherUserId === selectedUsers[0].id;
        }
        // For group DMs, would need to check all participants
        return false;
      });

      if (existingDM) {
        router.push(`/chat/dm/${existingDM.slug}`);
        onOpenChange(false);
        return;
      }

      // Create new DM
      const dmSlug = isGroupDM
        ? `group-${Date.now()}`
        : `dm-${selectedUsers[0].username}`;

      const newDM: Channel = {
        id: `dm-${Date.now()}`,
        name: isGroupDM
          ? selectedUsers.map((u) => u.displayName).join(", ")
          : selectedUsers[0].username,
        slug: dmSlug,
        description: null,
        type: isGroupDM ? "group" : "direct",
        categoryId: null,
        createdBy: "current-user", // Would be actual user ID
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        topic: null,
        icon: null,
        color: null,
        isArchived: false,
        isDefault: false,
        memberCount: selectedUsers.length + 1,
        lastMessageAt: null,
        lastMessagePreview: null,
        otherUserId: isGroupDM ? undefined : selectedUsers[0].id,
        otherUserName: isGroupDM ? undefined : selectedUsers[0].displayName,
        otherUserAvatar: isGroupDM ? undefined : selectedUsers[0].avatarUrl,
      };

      addChannel(newDM);
      router.push(`/chat/dm/${dmSlug}`);
      onOpenChange(false);
    } catch (error) {
      logger.error("Failed to create DM:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            New Message
          </DialogTitle>
          <DialogDescription>
            Start a conversation with one or more people.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Search Input */}
          <div className="space-y-2">
            <Label>To:</Label>
            <div className="flex min-h-[42px] flex-wrap items-center gap-1 rounded-lg border p-2">
              {selectedUsers.map((user) => (
                <Badge
                  key={user.id}
                  variant="secondary"
                  className="gap-1 py-0.5 pl-1 pr-0.5"
                >
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={user.avatarUrl} />
                    <AvatarFallback className="text-[8px]">
                      {user.displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs">{user.displayName}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveUser(user.id)}
                    className="rounded p-0.5 transition-colors hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  selectedUsers.length === 0 ? "Search for people..." : ""
                }
                className="h-6 min-w-[100px] flex-1 border-0 p-0 focus-visible:ring-0"
              />
            </div>
          </div>

          {/* User List */}
          <ScrollArea className="h-[250px] rounded-md border">
            <div className="p-2">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const isSelected = selectedUsers.some(
                    (u) => u.id === user.id,
                  );
                  return (
                    <button
                      key={user.id}
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors",
                        isSelected ? "bg-accent" : "hover:bg-accent/50",
                      )}
                      onClick={() => handleToggleUser(user)}
                    >
                      <Checkbox
                        checked={isSelected}
                        className="pointer-events-none"
                      />
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatarUrl} />
                          <AvatarFallback>
                            {user.displayName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={cn(
                            "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background",
                            user.isOnline ? "bg-green-500" : "bg-gray-400",
                          )}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {user.displayName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          @{user.username}
                        </p>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {searchQuery ? "No users found" : "Start typing to search"}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Group DM indicator */}
          {isGroupDM && (
            <div className="bg-muted/50 flex items-center gap-2 rounded-md p-2 text-xs text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>
                This will create a group conversation with{" "}
                {selectedUsers.length} people
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleStartConversation}
            disabled={selectedUsers.length === 0 || isLoading}
          >
            {isLoading
              ? "Starting..."
              : isGroupDM
                ? "Create Group"
                : "Start Chat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

CreateDmModal.displayName = "CreateDmModal";
