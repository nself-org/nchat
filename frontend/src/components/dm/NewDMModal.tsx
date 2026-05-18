"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { Search, X, Check, Loader2 } from "lucide-react";
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
import { useDMStore } from "@/stores/dm-store";
import { useUserStore } from "@/stores/user-store";
import { useAuth } from "@/contexts/auth-context";

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

// ============================================================================
// Component
// ============================================================================

export function NewDMModal() {
  const { user: currentUser } = useAuth();
  const {
    isNewDMModalOpen,
    closeNewDMModal,
    selectedUserIds,
    toggleUserSelection,
    clearUserSelection,
    addDM,
    setActiveDM,
  } = useDMStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Get users from store (mock for now)
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
  ];

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return mockUsers;

    return mockUsers.filter(
      (user) =>
        user.displayName.toLowerCase().includes(query) ||
        user.username.toLowerCase().includes(query),
    );
  }, [searchQuery]);

  // Selected users list
  const selectedUsers = mockUsers.filter((u) => selectedUserIds.includes(u.id));

  const handleClose = () => {
    setSearchQuery("");
    clearUserSelection();
    closeNewDMModal();
  };

  const handleStartConversation = async () => {
    if (selectedUserIds.length === 0) return;

    setIsLoading(true);
    try {
      // For now, create a mock DM
      const newDM = {
        id: `dm-${Date.now()}`,
        type: selectedUserIds.length === 1 ? "direct" : "group",
        name: selectedUserIds.length > 1 ? null : null,
        slug: `dm-${Date.now()}`,
        description: null,
        avatarUrl: null,
        createdBy: currentUser?.id || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "active",
        archivedAt: null,
        archivedBy: null,
        participants: [
          {
            id: `p-${currentUser?.id}`,
            userId: currentUser?.id || "",
            dmId: `dm-${Date.now()}`,
            joinedAt: new Date().toISOString(),
            lastReadAt: null,
            lastReadMessageId: null,
            notificationSetting: "all",
            isMuted: false,
            mutedUntil: null,
            role: "member",
            user: {
              id: currentUser?.id || "",
              username: currentUser?.email?.split("@")[0] || "",
              displayName:
                currentUser?.displayName ||
                currentUser?.email?.split("@")[0] ||
                "",
              avatarUrl: currentUser?.avatarUrl || null,
              status: "online",
              statusEmoji: null,
              lastSeenAt: null,
            },
          },
          ...selectedUsers.map((u) => ({
            id: `p-${u.id}`,
            userId: u.id,
            dmId: `dm-${Date.now()}`,
            joinedAt: new Date().toISOString(),
            lastReadAt: null,
            lastReadMessageId: null,
            notificationSetting: "all" as const,
            isMuted: false,
            mutedUntil: null,
            role: "member" as const,
            user: {
              id: u.id,
              username: u.username,
              displayName: u.displayName,
              avatarUrl: u.avatarUrl,
              status: u.status as "online" | "away" | "busy" | "offline",
              statusEmoji: null,
              lastSeenAt: null,
            },
          })),
        ],
        participantCount: selectedUserIds.length + 1,
        lastMessageId: null,
        lastMessageAt: null,
        lastMessagePreview: null,
        lastMessageUserId: null,
        settings: {
          allowReactions: true,
          allowAttachments: true,
          maxAttachmentSize: 100 * 1024 * 1024,
          allowVoiceMessages: true,
          allowVideoMessages: true,
          readReceiptsEnabled: true,
          typingIndicatorsEnabled: true,
        },
      };

      // @ts-expect-error - Type mismatch for DirectMessage
      addDM(newDM);
      setActiveDM(newDM.id);
      handleClose();
    } catch (error) {
      logger.error("Failed to create DM:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={isNewDMModalOpen}
      onOpenChange={(open) => !open && handleClose()}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
          <DialogDescription>
            Start a conversation with one or more people.
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

        {/* Search Input */}
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
        <ScrollArea className="-mx-6 h-[300px] px-6">
          <div className="space-y-1">
            {filteredUsers.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No users found
              </p>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = selectedUserIds.includes(user.id);
                return (
                  <button
                    key={user.id}
                    onClick={() => toggleUserSelection(user.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2 py-2 transition-colors",
                      "hover:text-accent-foreground hover:bg-accent",
                      isSelected && "bg-accent",
                    )}
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatarUrl || undefined} />
                        <AvatarFallback>
                          {user.displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        className={cn(
                          "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
                          user.status === "online" && "bg-green-500",
                          user.status === "away" && "bg-yellow-500",
                          user.status === "busy" && "bg-red-500",
                          user.status === "offline" && "bg-gray-400",
                        )}
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium">{user.displayName}</p>
                      <p className="text-sm text-muted-foreground">
                        @{user.username}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary">
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
            onClick={handleStartConversation}
            disabled={selectedUserIds.length === 0 || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : selectedUserIds.length > 1 ? (
              `Start Group (${selectedUserIds.length})`
            ) : (
              "Start Chat"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

NewDMModal.displayName = "NewDMModal";
