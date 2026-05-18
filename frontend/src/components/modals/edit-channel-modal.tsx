"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Hash,
  Lock,
  Users,
  X,
  Search,
  Loader2,
  Smile,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { logger } from "@/lib/logger";

// Common emoji options for channel icons
const CHANNEL_EMOJIS = [
  "💬",
  "📢",
  "📣",
  "🔔",
  "💡",
  "🎯",
  "🚀",
  "⭐",
  "📝",
  "📚",
  "🎨",
  "🎵",
  "🎮",
  "💻",
  "🔧",
  "📊",
  "🌍",
  "🏠",
  "🎉",
  "❤️",
  "🔥",
  "⚡",
  "🌟",
  "✨",
];

export interface ChannelMember {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface ChannelCategory {
  id: string;
  name: string;
}

export interface ChannelData {
  id: string;
  name: string;
  slug: string;
  description: string;
  isPrivate: boolean;
  members: string[];
  categoryId: string | null;
  emoji: string | null;
}

export interface EditChannelData {
  name: string;
  slug: string;
  description: string;
  isPrivate: boolean;
  members: string[];
  categoryId: string | null;
  emoji: string | null;
}

interface EditChannelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: ChannelData | null;
  onSubmit: (channelId: string, data: EditChannelData) => Promise<void>;
  onDelete?: (channelId: string) => Promise<void>;
  availableMembers?: ChannelMember[];
  categories?: ChannelCategory[];
  isLoading?: boolean;
  canDelete?: boolean;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function EditChannelModal({
  open,
  onOpenChange,
  channel,
  onSubmit,
  onDelete,
  availableMembers = [],
  categories = [],
  isLoading = false,
  canDelete = false,
}: EditChannelModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [emoji, setEmoji] = useState<string | null>(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Populate form with channel data
  useEffect(() => {
    if (channel && open) {
      setName(channel.name);
      setSlug(channel.slug);
      setDescription(channel.description);
      setIsPrivate(channel.isPrivate);
      setSelectedMembers(channel.members);
      setCategoryId(channel.categoryId);
      setEmoji(channel.emoji);
      setMemberSearchQuery("");
      setShowEmojiPicker(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmText("");
    }
  }, [channel, open]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setShowDeleteConfirm(false);
      setDeleteConfirmText("");
    }
  }, [open]);

  const filteredMembers = useMemo(() => {
    if (!memberSearchQuery) return availableMembers;
    const query = memberSearchQuery.toLowerCase();
    return availableMembers.filter(
      (member) =>
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query),
    );
  }, [availableMembers, memberSearchQuery]);

  const selectedMemberObjects = useMemo(() => {
    return availableMembers.filter((member) =>
      selectedMembers.includes(member.id),
    );
  }, [availableMembers, selectedMembers]);

  const handleSlugChange = (value: string) => {
    setSlug(generateSlug(value));
  };

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  };

  const handleRemoveMember = (memberId: string) => {
    setSelectedMembers((prev) => prev.filter((id) => id !== memberId));
  };

  const handleSubmit = async () => {
    if (!channel || !name.trim() || !slug.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit(channel.id, {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        isPrivate,
        members: selectedMembers,
        categoryId,
        emoji,
      });
      onOpenChange(false);
    } catch (error) {
      logger.error("Failed to update channel:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!channel || !onDelete || deleteConfirmText !== channel.name) return;

    setDeleting(true);
    try {
      await onDelete(channel.id);
      onOpenChange(false);
    } catch (error) {
      logger.error("Failed to delete channel:", error);
    } finally {
      setDeleting(false);
    }
  };

  const isValid = name.trim().length > 0 && slug.trim().length > 0;

  if (!channel) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isPrivate ? (
              <Lock className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Hash className="h-5 w-5 text-muted-foreground" />
            )}
            Edit channel
          </DialogTitle>
          <DialogDescription>
            Update the channel settings and members.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="-mx-6 flex-1 px-6">
          <div className="space-y-6 py-4">
            {/* Channel Name */}
            <div className="space-y-2">
              <Label htmlFor="channel-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl border border-input bg-background transition-colors hover:bg-accent",
                    emoji && "text-xl",
                  )}
                >
                  {emoji || <Smile className="h-4 w-4 text-muted-foreground" />}
                </button>
                <Input
                  id="channel-name"
                  placeholder="e.g. marketing, engineering"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading || submitting}
                  className="flex-1"
                />
              </div>
              {showEmojiPicker && (
                <div className="rounded-xl border bg-background p-3">
                  <div className="grid grid-cols-8 gap-1">
                    {CHANNEL_EMOJIS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => {
                          setEmoji(e);
                          setShowEmojiPicker(false);
                        }}
                        className={cn(
                          "rounded-lg p-2 text-lg transition-colors hover:bg-accent",
                          emoji === e && "bg-accent",
                        )}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                  {emoji && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => {
                        setEmoji(null);
                        setShowEmojiPicker(false);
                      }}
                    >
                      Remove icon
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Label htmlFor="channel-slug">Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">#</span>
                <Input
                  id="channel-slug"
                  placeholder="channel-slug"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  disabled={isLoading || submitting}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This will be used in URLs and mentions
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="channel-description">
                Description{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="channel-description"
                placeholder="What is this channel about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading || submitting}
                rows={3}
              />
            </div>

            {/* Category */}
            {categories.length > 0 && (
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={categoryId || "none"}
                  onValueChange={(value) =>
                    setCategoryId(value === "none" ? null : value)
                  }
                  disabled={isLoading || submitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Privacy Toggle */}
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label htmlFor="private-toggle" className="cursor-pointer">
                  Make private
                </Label>
                <p className="text-xs text-muted-foreground">
                  Only invited members can see this channel
                </p>
              </div>
              <Switch
                id="private-toggle"
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
                disabled={isLoading || submitting}
              />
            </div>

            {/* Members */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Members
              </Label>

              {/* Selected members */}
              {selectedMemberObjects.length > 0 && (
                <div className="bg-muted/30 flex flex-wrap gap-1.5 rounded-xl border p-2">
                  {selectedMemberObjects.map((member) => (
                    <Badge
                      key={member.id}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {member.name}
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.id)}
                        className="hover:bg-secondary-foreground/20 rounded p-0.5 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Member search */}
              {availableMembers.length > 0 && (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search members..."
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      className="pl-9"
                      disabled={isLoading || submitting}
                    />
                  </div>

                  <div className="max-h-40 overflow-y-auto rounded-xl border">
                    {filteredMembers.length === 0 ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        No members found
                      </p>
                    ) : (
                      filteredMembers.map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => handleMemberToggle(member.id)}
                          className={cn(
                            "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-accent",
                            selectedMembers.includes(member.id) && "bg-accent",
                          )}
                          disabled={isLoading || submitting}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.avatarUrl} />
                            <AvatarFallback>
                              {member.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {member.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {member.email}
                            </p>
                          </div>
                          {selectedMembers.includes(member.id) && (
                            <Badge variant="secondary" className="text-xs">
                              Member
                            </Badge>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Danger Zone */}
            {canDelete && onDelete && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 text-sm font-medium text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Danger Zone
                  </h4>

                  {!showDeleteConfirm ? (
                    <Button
                      variant="destructive"
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={isLoading || submitting}
                      className="w-full"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Channel
                    </Button>
                  ) : (
                    <div className="bg-destructive/5 space-y-3 rounded-xl border border-destructive p-4">
                      <p className="text-sm text-destructive">
                        This action cannot be undone. All messages and files in
                        this channel will be permanently deleted.
                      </p>
                      <p className="text-sm">
                        Type <strong>{channel.name}</strong> to confirm:
                      </p>
                      <Input
                        placeholder={channel.name}
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        className="border-destructive"
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeleteConfirmText("");
                          }}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleDelete}
                          disabled={
                            deleteConfirmText !== channel.name || deleting
                          }
                          className="flex-1"
                        >
                          {deleting && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isLoading || submitting}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
