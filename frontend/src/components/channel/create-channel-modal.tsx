"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Hash, Lock, Info, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useChannelStore,
  type Channel,
  type ChannelCategory,
} from "@/stores/channel-store";
import { useAuth } from "@/contexts/auth-context";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

interface CreateChannelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCategoryId?: string;
}

interface UserOption {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

// ============================================================================
// Mock Users (for development)
// ============================================================================

const mockUsers: UserOption[] = [
  { id: "1", username: "alice", displayName: "Alice Johnson" },
  { id: "2", username: "bob", displayName: "Bob Smith" },
  { id: "3", username: "charlie", displayName: "Charlie Brown" },
  { id: "4", username: "diana", displayName: "Diana Prince" },
  { id: "5", username: "eve", displayName: "Eve Wilson" },
];

// ============================================================================
// Component
// ============================================================================

export function CreateChannelModal({
  open,
  onOpenChange,
  defaultCategoryId,
}: CreateChannelModalProps) {
  const { user } = useAuth();
  const { categories, addChannel } = useChannelStore();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [categoryId, setCategoryId] = useState<string | undefined>(
    defaultCategoryId,
  );
  const [selectedMembers, setSelectedMembers] = useState<UserOption[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setIsPrivate(false);
      setCategoryId(defaultCategoryId);
      setSelectedMembers([]);
      setMemberSearch("");
      setError(null);
    }
  }, [open, defaultCategoryId]);

  // Filter users for member search
  const filteredUsers = React.useMemo(() => {
    if (!memberSearch.trim()) return [];
    const query = memberSearch.toLowerCase();
    return mockUsers
      .filter(
        (u) =>
          !selectedMembers.some((m) => m.id === u.id) &&
          (u.displayName.toLowerCase().includes(query) ||
            u.username.toLowerCase().includes(query)),
      )
      .slice(0, 5);
  }, [memberSearch, selectedMembers]);

  const handleAddMember = (member: UserOption) => {
    setSelectedMembers((prev) => [...prev, member]);
    setMemberSearch("");
  };

  const handleRemoveMember = (memberId: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m.id !== memberId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Channel name is required");
      return;
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    if (!slug) {
      setError("Channel name must contain letters or numbers");
      return;
    }

    setIsLoading(true);
    try {
      const newChannel: Channel = {
        id: `channel-${Date.now()}`,
        name: name.trim(),
        slug,
        description: description.trim() || null,
        type: isPrivate ? "private" : "public",
        categoryId: categoryId || null,
        createdBy: user?.id || "unknown",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        topic: null,
        icon: null,
        color: null,
        isArchived: false,
        isDefault: false,
        memberCount: selectedMembers.length + 1, // Include creator
        lastMessageAt: null,
        lastMessagePreview: null,
      };

      addChannel(newChannel);
      onOpenChange(false);
    } catch (err) {
      setError("Failed to create channel. Please try again.");
      logger.error("Create channel error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const slugPreview = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isPrivate ? (
                <Lock className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Hash className="h-5 w-5 text-muted-foreground" />
              )}
              Create a channel
            </DialogTitle>
            <DialogDescription>
              Channels are where your team communicates. They&apos;re best when
              organized around a topic.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Error Message */}
            {error && (
              <div className="bg-destructive/10 rounded-md p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Channel Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  #
                </span>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., marketing"
                  className="pl-7"
                  maxLength={80}
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                />
              </div>
              {name && (
                <p className="text-xs text-muted-foreground">
                  URL: /chat/channel/{slugPreview || "channel-name"}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Description{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this channel about?"
                rows={2}
                maxLength={250}
              />
            </div>

            {/* Category */}
            {categories.length > 0 && (
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={categoryId || "none"}
                  onValueChange={(v) =>
                    setCategoryId(v === "none" ? undefined : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Privacy Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <Label className="font-medium">Make private</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Only specific people can view and join this channel
                </p>
              </div>
              <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
            </div>

            {/* Add Members (for private channels) */}
            {isPrivate && (
              <div className="space-y-2">
                <Label>Add members</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search for people"
                    className="pl-9"
                  />
                </div>

                {/* Search Results */}
                {filteredUsers.length > 0 && (
                  <ScrollArea className="h-[120px] rounded-md border">
                    <div className="p-2">
                      {filteredUsers.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          className="flex w-full items-center gap-2 rounded-md p-2 transition-colors hover:bg-accent"
                          onClick={() => handleAddMember(u)}
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={u.avatarUrl} />
                            <AvatarFallback className="text-xs">
                              {u.displayName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 text-left">
                            <span className="text-sm">{u.displayName}</span>
                            <span className="ml-1 text-xs text-muted-foreground">
                              @{u.username}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                {/* Selected Members */}
                {selectedMembers.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedMembers.map((m) => (
                      <Badge
                        key={m.id}
                        variant="secondary"
                        className="gap-1 py-0.5 pl-1 pr-0.5"
                      >
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={m.avatarUrl} />
                          <AvatarFallback className="text-[8px]">
                            {m.displayName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs">{m.displayName}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(m.id)}
                          className="rounded p-0.5 transition-colors hover:bg-muted"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Info Note */}
            <div className="bg-muted/50 flex items-start gap-2 rounded-md p-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>
                {isPrivate
                  ? "Only people you add will be able to see this channel. You can always add more people later."
                  : "Anyone in your workspace can view and join public channels."}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? "Creating..." : "Create channel"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

CreateChannelModal.displayName = "CreateChannelModal";
