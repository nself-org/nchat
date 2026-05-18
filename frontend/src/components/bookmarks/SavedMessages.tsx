"use client";

/**
 * SavedMessages Component
 *
 * Personal message space for saving any message (like Telegram "Saved Messages").
 * Users can save messages from any chat and access them from the sidebar.
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Save,
  Search,
  Plus,
  MoreVertical,
  Trash2,
  Edit,
  Tag,
  Hash,
  MessageSquare,
  X,
  Filter,
  SortAsc,
  SortDesc,
  Calendar,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  useSavedMessages,
  useSavedMessageMutations,
} from "@/hooks/use-bookmarks";
import { useJumpToMessage } from "@/hooks/use-messages";

interface SavedMessageItem {
  id: string;
  content: string;
  note?: string;
  tags?: string[];
  saved_at: string;
  source_channel_id?: string;
  source_channel?: {
    id: string;
    name: string;
  };
  original_message_id?: string;
  original_message?: {
    user?: {
      display_name: string;
    };
  };
}

interface SavedMessagesProps {
  className?: string;
}

export function SavedMessages({ className }: SavedMessagesProps) {
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"saved_at_desc" | "saved_at_asc">(
    "saved_at_desc",
  );
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Form state for new saved message
  const [newMessageContent, setNewMessageContent] = useState("");
  const [newMessageNote, setNewMessageNote] = useState("");
  const [newMessageTags, setNewMessageTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Hooks
  const { savedMessages, loading, loadMore } = useSavedMessages();
  const { saveMessage, updateSavedMessage, deleteSavedMessage, saving } =
    useSavedMessageMutations();
  const { jumpToMessage } = useJumpToMessage();

  // Computed
  const filteredMessages = useMemo(() => {
    let filtered = [...savedMessages];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (msg: SavedMessageItem) =>
          msg.content.toLowerCase().includes(query) ||
          msg.note?.toLowerCase().includes(query) ||
          msg.tags?.some((tag: string) => tag.toLowerCase().includes(query)),
      );
    }

    // Channel filter
    if (selectedChannel) {
      filtered = filtered.filter(
        (msg) => msg.source_channel_id === selectedChannel,
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.saved_at).getTime();
      const dateB = new Date(b.saved_at).getTime();
      return sortBy === "saved_at_desc" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [savedMessages, searchQuery, selectedChannel, sortBy]);

  const channels = useMemo(() => {
    const channelMap = new Map();
    savedMessages.forEach((msg: SavedMessageItem) => {
      if (msg.source_channel) {
        channelMap.set(msg.source_channel.id, {
          id: msg.source_channel.id,
          name: msg.source_channel.name,
        });
      }
    });
    return Array.from(channelMap.values());
  }, [savedMessages]);

  // Handlers
  const handleCreateSavedMessage = async () => {
    if (!newMessageContent.trim()) return;

    try {
      await saveMessage({
        content: newMessageContent,
        note: newMessageNote || undefined,
        tags: newMessageTags.length > 0 ? newMessageTags : undefined,
      });

      // Reset form
      setNewMessageContent("");
      setNewMessageNote("");
      setNewMessageTags([]);
      setTagInput("");
      setIsCreateDialogOpen(false);
    } catch (_error) {
      // Error handled by hook
    }
  };

  const handleDeleteMessage = async (savedMessageId: string) => {
    await deleteSavedMessage(savedMessageId);
  };

  const handleJumpToOriginal = (messageId: string, channelId: string) => {
    jumpToMessage(messageId, channelId);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !newMessageTags.includes(tagInput.trim())) {
      setNewMessageTags([...newMessageTags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setNewMessageTags(newMessageTags.filter((t) => t !== tag));
  };

  if (loading && savedMessages.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">
            Loading saved messages...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Save className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl font-semibold">Saved Messages</h2>
              <p className="text-sm text-muted-foreground">
                Your personal message space ({savedMessages.length})
              </p>
            </div>
          </div>

          {/* Create new saved message */}
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Message
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Save a new message</DialogTitle>
                <DialogDescription>
                  Create a personal note or save content for later reference.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Content */}
                <div className="space-y-2">
                  <Label>Message content</Label>
                  <Textarea
                    placeholder="Enter your message or note..."
                    value={newMessageContent}
                    onChange={(e) => setNewMessageContent(e.target.value)}
                    rows={6}
                    className="resize-none"
                  />
                </div>

                {/* Note */}
                <div className="space-y-2">
                  <Label>Note (optional)</Label>
                  <Input
                    placeholder="Add a note about this message..."
                    value={newMessageNote}
                    onChange={(e) => setNewMessageNote(e.target.value)}
                  />
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a tag..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleAddTag}
                    >
                      Add
                    </Button>
                  </div>
                  {newMessageTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {newMessageTags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          <Hash className="mr-1 h-3 w-3" />
                          {tag}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-1 h-4 w-4 p-0"
                            onClick={() => handleRemoveTag(tag)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateSavedMessage}
                  disabled={saving || !newMessageContent.trim()}
                >
                  {saving ? "Saving..." : "Save Message"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="space-y-3 border-b px-6 py-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search saved messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-2">
          {/* Channel filter */}
          {channels.length > 0 && (
            <Select
              value={selectedChannel || "all"}
              onValueChange={(value) =>
                setSelectedChannel(value === "all" ? null : value)
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {channels.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id}>
                    #{channel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Sort */}
          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as typeof sortBy)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="saved_at_desc">
                <div className="flex items-center gap-2">
                  <SortDesc className="h-4 w-4" />
                  Newest first
                </div>
              </SelectItem>
              <SelectItem value="saved_at_asc">
                <div className="flex items-center gap-2">
                  <SortAsc className="h-4 w-4" />
                  Oldest first
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Clear filters */}
          {(searchQuery || selectedChannel) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedChannel(null);
              }}
            >
              <X className="mr-2 h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Message list */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Save className="text-muted-foreground/50 mb-4 h-12 w-12" />
              <h3 className="mb-2 text-lg font-medium">No saved messages</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                {searchQuery || selectedChannel
                  ? "Try adjusting your filters"
                  : "Start saving messages to access them here anytime"}
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create your first saved message
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredMessages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    layout
                  >
                    <Card className="group relative overflow-hidden transition-shadow hover:shadow-md">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {/* Save icon */}
                          <div className="mt-1 flex-shrink-0">
                            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                              <Save className="h-5 w-5 text-primary" />
                            </div>
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            {/* Header */}
                            <div className="mb-2 flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {message.source_channel && (
                                  <>
                                    <span>
                                      from #{message.source_channel.name}
                                    </span>
                                    <span>•</span>
                                  </>
                                )}
                                <span>
                                  {formatRelativeTime(
                                    new Date(message.saved_at),
                                  )}
                                </span>
                              </div>
                              {message.original_message_id &&
                                message.source_channel_id && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleJumpToOriginal(
                                        message.original_message_id!,
                                        message.source_channel_id!,
                                      )
                                    }
                                    className="h-7 text-xs opacity-0 transition-opacity group-hover:opacity-100"
                                  >
                                    <MessageSquare className="mr-1 h-3 w-3" />
                                    View original
                                  </Button>
                                )}
                            </div>

                            {/* Message content */}
                            <p className="mb-2 whitespace-pre-wrap text-sm text-foreground">
                              {message.content}
                            </p>

                            {/* Note */}
                            {message.note && (
                              <div className="bg-muted/50 mb-2 rounded-md p-2">
                                <p className="text-xs text-muted-foreground">
                                  Note: {message.note}
                                </p>
                              </div>
                            )}

                            {/* Original author */}
                            {message.original_message?.user && (
                              <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Originally from</span>
                                <span className="font-medium">
                                  {message.original_message.user.display_name}
                                </span>
                              </div>
                            )}

                            {/* Tags */}
                            {message.tags && message.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {message.tags.map((tag: string) => (
                                  <Badge
                                    key={tag}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    <Hash className="mr-1 h-3 w-3" />
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit message
                              </DropdownMenuItem>
                              {message.original_message_id &&
                                message.source_channel_id && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleJumpToOriginal(
                                        message.original_message_id!,
                                        message.source_channel_id!,
                                      )
                                    }
                                  >
                                    <MessageSquare className="mr-2 h-4 w-4" />
                                    Jump to original
                                  </DropdownMenuItem>
                                )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteMessage(message.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Load more */}
              <div className="mt-6 text-center">
                <Button variant="outline" onClick={loadMore}>
                  Load more
                </Button>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Helper function for relative time formatting
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return date.toLocaleDateString();
  } else if (days > 0) {
    return `${days}d ago`;
  } else if (hours > 0) {
    return `${hours}h ago`;
  } else if (minutes > 0) {
    return `${minutes}m ago`;
  } else {
    return "Just now";
  }
}
