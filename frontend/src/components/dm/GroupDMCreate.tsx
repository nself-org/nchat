"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { Search, X, Check, Loader2, Users, Camera } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useDMStore } from "@/stores/dm-store";
import { useAuth } from "@/contexts/auth-context";
import { validateGroupDMCreation } from "@/lib/dm";

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

export function GroupDMCreate() {
  const { user: currentUser } = useAuth();
  const {
    isGroupDMCreateOpen,
    closeGroupDMCreate,
    selectedUserIds,
    toggleUserSelection,
    clearUserSelection,
    addDM,
    setActiveDM,
  } = useDMStore();

  const [step, setStep] = useState<"select" | "details">("select");
  const [searchQuery, setSearchQuery] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  ];

  const filteredUsers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return mockUsers;
    return mockUsers.filter(
      (user) =>
        user.displayName.toLowerCase().includes(query) ||
        user.username.toLowerCase().includes(query),
    );
  }, [searchQuery]);

  const selectedUsers = mockUsers.filter((u) => selectedUserIds.includes(u.id));

  const handleClose = () => {
    setStep("select");
    setSearchQuery("");
    setGroupName("");
    setGroupDescription("");
    setError(null);
    clearUserSelection();
    closeGroupDMCreate();
  };

  const handleNext = () => {
    if (selectedUserIds.length < 2) {
      setError("Select at least 2 people for a group");
      return;
    }
    setError(null);
    setStep("details");
  };

  const handleBack = () => {
    setStep("select");
    setError(null);
  };

  const handleCreate = async () => {
    // Validate
    const validation = validateGroupDMCreation({
      name: groupName,
      description: groupDescription,
      participantIds: selectedUserIds,
    });

    if (!validation.valid) {
      setError(validation.errors[0]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newDM = {
        id: `gdm-${Date.now()}`,
        type: "group",
        name: groupName,
        slug: `gdm-${Date.now()}`,
        description: groupDescription || null,
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
            dmId: `gdm-${Date.now()}`,
            joinedAt: new Date().toISOString(),
            lastReadAt: null,
            lastReadMessageId: null,
            notificationSetting: "all",
            isMuted: false,
            mutedUntil: null,
            role: "owner",
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
            dmId: `gdm-${Date.now()}`,
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
    } catch (err) {
      setError("Failed to create group. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={isGroupDMCreateOpen}
      onOpenChange={(open) => !open && handleClose()}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "select" ? "Create Group" : "Group Details"}
          </DialogTitle>
          <DialogDescription>
            {step === "select"
              ? "Select people to add to your group."
              : "Give your group a name and optional description."}
          </DialogDescription>
        </DialogHeader>

        {step === "select" ? (
          <>
            {/* Selected Users */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-2">
                {selectedUsers.map((user) => (
                  <Badge
                    key={user.id}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
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
                {filteredUsers.map((user) => {
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
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.avatarUrl || undefined} />
                        <AvatarFallback>
                          {user.displayName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium">
                          {user.displayName}
                        </p>
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
                })}
              </div>
            </ScrollArea>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleNext}
                disabled={selectedUserIds.length < 2}
              >
                Next
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Group Avatar Placeholder */}
            <div className="flex justify-center">
              <button
                type="button"
                className="group relative"
                aria-label="Change group avatar"
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera className="h-6 w-6 text-white" />
                </div>
              </button>
            </div>

            {/* Group Name */}
            <div className="space-y-2">
              <Label htmlFor="group-name">Group name</Label>
              <Input
                id="group-name"
                placeholder="Enter group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                maxLength={100}
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
              />
              <p className="text-right text-xs text-muted-foreground">
                {groupName.length}/100
              </p>
            </div>

            {/* Group Description */}
            <div className="space-y-2">
              <Label htmlFor="group-description">Description (optional)</Label>
              <Textarea
                id="group-description"
                placeholder="What's this group about?"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                maxLength={500}
                rows={3}
              />
              <p className="text-right text-xs text-muted-foreground">
                {groupDescription.length}/500
              </p>
            </div>

            {/* Members Preview */}
            <div className="space-y-2">
              <Label>Members ({selectedUsers.length + 1})</Label>
              <div className="flex -space-x-2">
                <Avatar className="h-8 w-8 border-2 border-background">
                  <AvatarImage src={currentUser?.avatarUrl || undefined} />
                  <AvatarFallback>
                    {currentUser?.displayName?.charAt(0) || "Y"}
                  </AvatarFallback>
                </Avatar>
                {selectedUsers.slice(0, 5).map((user) => (
                  <Avatar
                    key={user.id}
                    className="h-8 w-8 border-2 border-background"
                  >
                    <AvatarImage src={user.avatarUrl || undefined} />
                    <AvatarFallback>
                      {user.displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {selectedUsers.length > 5 && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
                    +{selectedUsers.length - 5}
                  </div>
                )}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!groupName.trim() || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Group"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

GroupDMCreate.displayName = "GroupDMCreate";
