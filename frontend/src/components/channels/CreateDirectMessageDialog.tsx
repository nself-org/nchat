"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { MessageCircle, Search, Users, X, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/lib/logger";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ============================================================================
// Types
// ============================================================================

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  status?: "online" | "away" | "busy" | "offline";
}

export interface CreateDirectMessageDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  users?: User[];
  currentUserId?: string;
  onCreateDM?: (userId: string) => Promise<void>;
  onCreateGroupDM?: (name: string, userIds: string[]) => Promise<void>;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function CreateDirectMessageDialog({
  open = false,
  onOpenChange,
  users = [],
  currentUserId,
  onCreateDM,
  onCreateGroupDM,
  className,
}: CreateDirectMessageDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<"direct" | "group">("direct");

  // Filter out current user and apply search
  const availableUsers = useMemo(() => {
    let filtered = users.filter((u) => u.id !== currentUserId);

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.username.toLowerCase().includes(query) ||
          user.displayName.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [users, currentUserId, searchQuery]);

  // Selected user objects
  const selectedUserObjects = useMemo(() => {
    return availableUsers.filter((user) => selectedUsers.has(user.id));
  }, [availableUsers, selectedUsers]);

  // Toggle user selection
  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  // Remove selected user
  const removeUser = (userId: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  };

  // Handle direct message creation
  const handleCreateDM = async (userId: string) => {
    try {
      setIsCreating(true);
      await onCreateDM?.(userId);
      handleClose();
    } catch (error) {
      logger.error("Failed to create DM:", error);
    } finally {
      setIsCreating(false);
    }
  };

  // Handle group DM creation
  const handleCreateGroupDM = async () => {
    if (selectedUsers.size < 1 || !groupName.trim()) return;

    try {
      setIsCreating(true);
      await onCreateGroupDM?.(groupName.trim(), Array.from(selectedUsers));
      handleClose();
    } catch (error) {
      logger.error("Failed to create group DM:", error);
    } finally {
      setIsCreating(false);
    }
  };

  // Reset and close
  const handleClose = () => {
    setSearchQuery("");
    setSelectedUsers(new Set());
    setGroupName("");
    setActiveTab("direct");
    onOpenChange?.(false);
  };

  // Auto-generate group name
  const suggestedGroupName = useMemo(() => {
    if (selectedUserObjects.length === 0) return "";
    if (selectedUserObjects.length === 1) {
      return `${selectedUserObjects[0].displayName}`;
    }
    return selectedUserObjects.map((u) => u.displayName).join(", ");
  }, [selectedUserObjects]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("flex max-h-[600px] max-w-md flex-col", className)}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            New Message
          </DialogTitle>
          <DialogDescription>
            Send a direct message or create a group conversation
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "direct" | "group")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="direct">
              <MessageCircle className="mr-2 h-4 w-4" />
              Direct
            </TabsTrigger>
            <TabsTrigger value="group">
              <Users className="mr-2 h-4 w-4" />
              Group
            </TabsTrigger>
          </TabsList>

          {/* Direct Message Tab */}
          <TabsContent
            value="direct"
            className="mt-4 flex flex-1 flex-col space-y-4"
          >
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
              />
            </div>

            {/* User List */}
            <ScrollArea className="-mx-6 flex-1 px-6">
              <div className="space-y-1">
                {availableUsers.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {searchQuery
                      ? `No users match "${searchQuery}"`
                      : "No users available"}
                  </p>
                ) : (
                  availableUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleCreateDM(user.id)}
                      disabled={isCreating}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg p-3",
                        "text-left transition-colors hover:bg-accent",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                      )}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={user.avatarUrl}
                          alt={user.displayName}
                        />
                        <AvatarFallback>
                          {user.displayName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {user.displayName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          @{user.username}
                        </p>
                      </div>
                      {user.status && (
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full",
                            user.status === "online" && "bg-green-500",
                            user.status === "away" && "bg-yellow-500",
                            user.status === "busy" && "bg-red-500",
                            user.status === "offline" && "bg-gray-400",
                          )}
                        />
                      )}
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Group DM Tab */}
          <TabsContent
            value="group"
            className="mt-4 flex flex-1 flex-col space-y-4"
          >
            {/* Group Name */}
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                placeholder={suggestedGroupName || "Enter group name..."}
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>

            {/* Selected Members */}
            {selectedUserObjects.length > 0 && (
              <div className="bg-muted/30 flex flex-wrap gap-1.5 rounded-lg border p-3">
                {selectedUserObjects.map((user) => (
                  <Badge
                    key={user.id}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {user.displayName}
                    <button
                      type="button"
                      onClick={() => removeUser(user.id)}
                      className="hover:bg-secondary-foreground/20 rounded p-0.5 transition-colors"
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
                placeholder="Search users to add..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* User List */}
            <ScrollArea className="-mx-6 flex-1 px-6">
              <div className="space-y-1">
                {availableUsers.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {searchQuery
                      ? `No users match "${searchQuery}"`
                      : "No users available"}
                  </p>
                ) : (
                  availableUsers.map((user) => {
                    const isSelected = selectedUsers.has(user.id);
                    const checkboxId = `group-user-checkbox-${user.id}`;
                    return (
                      <label
                        key={user.id}
                        htmlFor={checkboxId}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-lg p-3",
                          "transition-colors hover:bg-accent",
                          isSelected && "bg-accent",
                        )}
                      >
                        <Checkbox
                          id={checkboxId}
                          checked={isSelected}
                          onCheckedChange={() => toggleUser(user.id)}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={user.avatarUrl}
                            alt={user.displayName}
                          />
                          <AvatarFallback>
                            {user.displayName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">
                            {user.displayName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            @{user.username}
                          </p>
                        </div>
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </label>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button
                onClick={handleCreateGroupDM}
                disabled={
                  selectedUsers.size === 0 || !groupName.trim() || isCreating
                }
                className="w-full"
              >
                {isCreating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Group ({selectedUsers.size})
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

CreateDirectMessageDialog.displayName = "CreateDirectMessageDialog";
