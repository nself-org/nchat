"use client";

import * as React from "react";
import { useState } from "react";
import {
  UserPlus,
  Search,
  Copy,
  Check,
  Link,
  Mail,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Channel } from "@/stores/channel-store";

// ============================================================================
// Types
// ============================================================================

export interface ChannelInviteProps {
  channel: Channel;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onInvite?: (userIds: string[]) => Promise<void>;
  className?: string;
}

interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

// Mock users for demo
const MOCK_USERS: User[] = [
  { id: "1", username: "alice", displayName: "Alice Smith" },
  { id: "2", username: "bob", displayName: "Bob Johnson" },
  { id: "3", username: "charlie", displayName: "Charlie Brown" },
  { id: "4", username: "diana", displayName: "Diana Prince" },
  { id: "5", username: "eve", displayName: "Eve Wilson" },
];

// ============================================================================
// Component
// ============================================================================

export function ChannelInvite({
  channel,
  open = false,
  onOpenChange,
  onInvite,
  className,
}: ChannelInviteProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isInviting, setIsInviting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [emailAddresses, setEmailAddresses] = useState("");

  // Filter users by search
  const filteredUsers = MOCK_USERS.filter(
    (user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.displayName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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

  // Handle invite
  const handleInvite = async () => {
    if (selectedUsers.size === 0) return;

    try {
      setIsInviting(true);
      await onInvite?.(Array.from(selectedUsers));
      setSelectedUsers(new Set());
      onOpenChange?.(false);
    } finally {
      setIsInviting(false);
    }
  };

  // Generate invite link
  const inviteLink = `${typeof window !== "undefined" ? window.location.origin : ""}/invite/channel/${channel.slug}`;

  // Copy invite link
  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-md", className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite to #{channel.name}
          </DialogTitle>
          <DialogDescription>
            Invite people to join this channel
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="users" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="link">Link</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
          </TabsList>

          {/* Invite Users */}
          <TabsContent value="users" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[200px]">
              <div className="space-y-1">
                {filteredUsers.map((user) => {
                  const checkboxId = `user-checkbox-${user.id}`;
                  return (
                    <label
                      key={user.id}
                      htmlFor={checkboxId}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-md p-2",
                        "hover:bg-accent",
                        selectedUsers.has(user.id) && "bg-accent",
                      )}
                    >
                      <Checkbox
                        id={checkboxId}
                        checked={selectedUsers.has(user.id)}
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
                        <p className="truncate text-sm font-medium">
                          {user.displayName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          @{user.username}
                        </p>
                      </div>
                    </label>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No users found
                  </p>
                )}
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button
                onClick={handleInvite}
                disabled={selectedUsers.size === 0 || isInviting}
              >
                {isInviting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Invite {selectedUsers.size > 0 && `(${selectedUsers.size})`}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* Invite Link */}
          <TabsContent value="link" className="space-y-4">
            <div className="space-y-2">
              <Label>Invite Link</Label>
              <p className="text-xs text-muted-foreground">
                Share this link to invite people to this channel
              </p>
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly className="flex-1 text-xs" />
                <Button variant="outline" size="icon" onClick={copyLink}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-muted/50 space-y-2 rounded-lg p-4">
              <p className="text-sm font-medium">Link Settings</p>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>- Link expires in 7 days</p>
                <p>- Anyone with the link can join</p>
                <p>
                  -{" "}
                  {channel.type === "private"
                    ? "Requires approval"
                    : "Instant access"}
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Email Invite */}
          <TabsContent value="email" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emails">Email Addresses</Label>
              <p className="text-xs text-muted-foreground">
                Enter email addresses separated by commas
              </p>
              <textarea
                id="emails"
                value={emailAddresses}
                onChange={(e) => setEmailAddresses(e.target.value)}
                placeholder="email@example.com, another@example.com"
                rows={4}
                className={cn(
                  "flex w-full rounded-md border border-input bg-background px-3 py-2",
                  "text-sm ring-offset-background placeholder:text-muted-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              />
            </div>

            <DialogFooter>
              <Button disabled={!emailAddresses.trim()}>
                <Mail className="mr-2 h-4 w-4" />
                Send Invites
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

ChannelInvite.displayName = "ChannelInvite";
