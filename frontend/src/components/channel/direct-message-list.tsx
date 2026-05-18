"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  MoreVertical,
  VolumeX,
  Volume2,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useChannelStore,
  selectDirectMessages,
  type Channel,
} from "@/stores/channel-store";
import { useUIStore } from "@/stores/ui-store";

// ============================================================================
// Types
// ============================================================================

interface DirectMessageListProps {
  className?: string;
  onSelect?: (dm: Channel) => void;
}

// ============================================================================
// Mock DMs (for development)
// ============================================================================

const mockDMs: Channel[] = [
  {
    id: "dm-1",
    name: "alice",
    slug: "dm-alice",
    description: null,
    type: "direct",
    categoryId: null,
    createdBy: "user-1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-15T10:30:00Z",
    topic: null,
    icon: null,
    color: null,
    isArchived: false,
    isDefault: false,
    memberCount: 2,
    lastMessageAt: "2024-01-15T10:30:00Z",
    lastMessagePreview: "Hey, are you free for a quick call?",
    otherUserId: "2",
    otherUserName: "Alice Johnson",
    otherUserAvatar: undefined,
  },
  {
    id: "dm-2",
    name: "bob",
    slug: "dm-bob",
    description: null,
    type: "direct",
    categoryId: null,
    createdBy: "user-1",
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-14T15:45:00Z",
    topic: null,
    icon: null,
    color: null,
    isArchived: false,
    isDefault: false,
    memberCount: 2,
    lastMessageAt: "2024-01-14T15:45:00Z",
    lastMessagePreview: "The PR looks good, merging now",
    otherUserId: "3",
    otherUserName: "Bob Smith",
    otherUserAvatar: undefined,
  },
  {
    id: "dm-3",
    name: "charlie",
    slug: "dm-charlie",
    description: null,
    type: "direct",
    categoryId: null,
    createdBy: "user-1",
    createdAt: "2024-01-03T00:00:00Z",
    updatedAt: "2024-01-10T09:00:00Z",
    topic: null,
    icon: null,
    color: null,
    isArchived: false,
    isDefault: false,
    memberCount: 2,
    lastMessageAt: "2024-01-10T09:00:00Z",
    lastMessagePreview: "Thanks for your help!",
    otherUserId: "4",
    otherUserName: "Charlie Brown",
    otherUserAvatar: undefined,
  },
];

// ============================================================================
// DM Item Component
// ============================================================================

function DirectMessageItem({
  dm,
  isActive,
  isMuted,
  onSelect,
  onMute,
  onUnmute,
  onHide,
}: {
  dm: Channel;
  isActive: boolean;
  isMuted: boolean;
  onSelect?: (dm: Channel) => void;
  onMute: () => void;
  onUnmute: () => void;
  onHide: () => void;
}) {
  const handleClick = (e: React.MouseEvent) => {
    if (onSelect) {
      e.preventDefault();
      onSelect(dm);
    }
  };

  return (
    <div className="group relative flex items-center">
      <Link
        href={`/chat/dm/${dm.slug}`}
        onClick={handleClick}
        className={cn(
          "flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
          "hover:text-accent-foreground hover:bg-accent",
          isActive && "text-accent-foreground bg-accent font-medium",
          isMuted && "opacity-60",
        )}
      >
        {/* Avatar with presence */}
        <div className="relative">
          <Avatar className="h-6 w-6">
            <AvatarImage src={dm.otherUserAvatar} alt={dm.otherUserName} />
            <AvatarFallback className="text-[10px]">
              {dm.otherUserName?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          {/* Online indicator - would come from real-time presence */}
          <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-background bg-green-500" />
        </div>

        {/* Name and Preview */}
        <div className="min-w-0 flex-1">
          <span
            className={cn("block truncate", isMuted && "text-muted-foreground")}
          >
            {dm.otherUserName || dm.name}
          </span>
          {dm.lastMessagePreview && (
            <span className="block truncate text-xs text-muted-foreground">
              {dm.lastMessagePreview}
            </span>
          )}
        </div>

        {/* Indicators */}
        <div className="flex items-center gap-1">
          {isMuted && <VolumeX className="h-3 w-3 text-muted-foreground" />}
        </div>
      </Link>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={isMuted ? onUnmute : onMute}>
            {isMuted ? (
              <>
                <Volume2 className="mr-2 h-4 w-4" />
                Unmute conversation
              </>
            ) : (
              <>
                <VolumeX className="mr-2 h-4 w-4" />
                Mute conversation
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onHide} className="text-destructive">
            <X className="mr-2 h-4 w-4" />
            Close conversation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function DirectMessageList({
  className,
  onSelect,
}: DirectMessageListProps) {
  const pathname = usePathname();
  const { openModal } = useUIStore();
  const { mutedChannels, hiddenChannels, toggleMuteChannel, hideChannel } =
    useChannelStore();

  // Local state
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Get DMs from store (using mock data for now)
  const directMessages = mockDMs;

  // Filter DMs
  const filteredDMs = useMemo(() => {
    let dms = directMessages.filter((dm) => !hiddenChannels.has(dm.id));

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      dms = dms.filter(
        (dm) =>
          dm.otherUserName?.toLowerCase().includes(query) ||
          dm.name.toLowerCase().includes(query),
      );
    }

    // Sort by last message time
    return dms.sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [directMessages, hiddenChannels, searchQuery]);

  const handleCreateDM = () => {
    openModal("create-workspace"); // Would be 'create-dm' in production
  };

  return (
    <div className={cn("mb-4", className)}>
      {/* Header */}
      <div
        className="hover:bg-accent/50 group flex cursor-pointer items-center justify-between rounded-md px-2 py-1 transition-colors"
        role="button"
        tabIndex={0}
        onClick={() => setIsCollapsed(!isCollapsed)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsCollapsed(!isCollapsed);
          }
        }}
      >
        <div className="flex items-center gap-1.5">
          <button className="p-0.5">
            {isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Direct Messages
          </span>
          {filteredDMs.length > 0 && (
            <span className="text-muted-foreground/60 text-xs">
              ({filteredDMs.length})
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={(e) => {
              e.stopPropagation();
              setShowSearch(!showSearch);
            }}
          >
            <Search className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={(e) => {
              e.stopPropagation();
              handleCreateDM();
            }}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="mt-1 space-y-0.5">
          {/* Search */}
          {showSearch && (
            <div className="px-2 pb-1">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Find a conversation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-7 pl-7 text-xs"
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* DM List */}
          {filteredDMs.length > 0 ? (
            filteredDMs.map((dm) => (
              <DirectMessageItem
                key={dm.id}
                dm={dm}
                isActive={pathname === `/chat/dm/${dm.slug}`}
                isMuted={mutedChannels.has(dm.id)}
                onSelect={onSelect}
                onMute={() => toggleMuteChannel(dm.id)}
                onUnmute={() => toggleMuteChannel(dm.id)}
                onHide={() => hideChannel(dm.id)}
              />
            ))
          ) : searchQuery ? (
            <div className="px-2 py-4 text-center text-xs text-muted-foreground">
              No conversations found
            </div>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start text-sm text-muted-foreground hover:text-foreground"
              onClick={handleCreateDM}
            >
              <Plus className="mr-2 h-4 w-4" />
              Start a conversation
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

DirectMessageList.displayName = "DirectMessageList";
