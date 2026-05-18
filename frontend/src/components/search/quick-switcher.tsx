"use client";

import * as React from "react";
import { Command } from "cmdk";
import { useHotkeys } from "react-hotkeys-hook";
import {
  Hash,
  Lock,
  User,
  Plus,
  MessageSquare,
  Settings,
  LogOut,
  Search,
  Clock,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useUIStore } from "@/stores/ui-store";
import {
  useSearchStore,
  type ChannelSearchResult,
  type UserSearchResult,
} from "@/stores/search-store";

// ============================================================================
// Types
// ============================================================================

export interface QuickSwitcherProps {
  /** Whether the quick switcher is open */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** List of recent channels */
  recentChannels?: ChannelSearchResult[];
  /** List of starred channels */
  starredChannels?: ChannelSearchResult[];
  /** List of all channels */
  allChannels?: ChannelSearchResult[];
  /** List of direct message users */
  directMessages?: UserSearchResult[];
  /** Callback when a channel is selected */
  onSelectChannel?: (channel: ChannelSearchResult) => void;
  /** Callback when a user is selected (for DM) */
  onSelectUser?: (user: UserSearchResult) => void;
  /** Callback when "Create channel" is selected */
  onCreateChannel?: () => void;
  /** Callback when "Start DM" is selected */
  onStartDM?: () => void;
  /** Callback when settings is selected */
  onOpenSettings?: () => void;
  /** Callback when sign out is selected */
  onSignOut?: () => void;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Main Component
// ============================================================================

export function QuickSwitcher({
  open: controlledOpen,
  onOpenChange,
  recentChannels = [],
  starredChannels = [],
  allChannels = [],
  directMessages = [],
  onSelectChannel,
  onSelectUser,
  onCreateChannel,
  onStartDM,
  onOpenSettings,
  onSignOut,
  className,
}: QuickSwitcherProps) {
  // Use controlled or uncontrolled state
  const quickSwitcherOpen = useUIStore((state) => state.quickSwitcherOpen);
  const setQuickSwitcherOpen = useUIStore(
    (state) => state.setQuickSwitcherOpen,
  );

  const isOpen = controlledOpen ?? quickSwitcherOpen;
  const setIsOpen = onOpenChange ?? setQuickSwitcherOpen;

  const [search, setSearch] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Keyboard shortcut to open
  useHotkeys(
    "mod+k",
    (e) => {
      e.preventDefault();
      setIsOpen(!isOpen);
    },
    { enableOnFormTags: true },
  );

  // Focus input when opened
  React.useEffect(() => {
    if (isOpen) {
      setSearch("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Handle selection
  const handleSelectChannel = (channel: ChannelSearchResult) => {
    onSelectChannel?.(channel);
    setIsOpen(false);
  };

  const handleSelectUser = (user: UserSearchResult) => {
    onSelectUser?.(user);
    setIsOpen(false);
  };

  const handleCreateChannel = () => {
    onCreateChannel?.();
    setIsOpen(false);
  };

  const handleStartDM = () => {
    onStartDM?.();
    setIsOpen(false);
  };

  const handleOpenSettings = () => {
    onOpenSettings?.();
    setIsOpen(false);
  };

  const handleSignOut = () => {
    onSignOut?.();
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="bg-background/80 absolute inset-0 backdrop-blur-sm"
        role="button"
        tabIndex={0}
        aria-label="Close quick switcher"
        onClick={() => setIsOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen(false);
          }
        }}
      />

      {/* Command palette */}
      <div
        className={cn(
          "absolute left-1/2 top-[15%] w-full max-w-lg -translate-x-1/2",
          "rounded-xl border bg-popover shadow-2xl",
          className,
        )}
      >
        <Command
          className="flex flex-col overflow-hidden rounded-xl"
          shouldFilter={true}
          filter={(value, search) => {
            // Custom filter to search by name
            if (value.toLowerCase().includes(search.toLowerCase())) return 1;
            return 0;
          }}
        >
          {/* Search input */}
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              ref={inputRef}
              value={search}
              onValueChange={setSearch}
              placeholder="Search channels, people, or commands..."
              className={cn(
                "flex h-12 w-full bg-transparent py-3 pl-2 text-sm outline-none",
                "placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
              )}
            />
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            {/* Recent channels */}
            {recentChannels.length > 0 && (
              <Command.Group heading="Recent">
                {recentChannels.map((channel) => (
                  <ChannelItem
                    key={channel.channelId}
                    channel={channel}
                    icon={Clock}
                    onSelect={() => handleSelectChannel(channel)}
                  />
                ))}
              </Command.Group>
            )}

            {/* Starred channels */}
            {starredChannels.length > 0 && (
              <Command.Group heading="Starred">
                {starredChannels.map((channel) => (
                  <ChannelItem
                    key={channel.channelId}
                    channel={channel}
                    icon={Star}
                    iconClassName="text-yellow-500"
                    onSelect={() => handleSelectChannel(channel)}
                  />
                ))}
              </Command.Group>
            )}

            {/* All channels */}
            {allChannels.length > 0 && (
              <Command.Group heading="Channels">
                {allChannels.map((channel) => (
                  <ChannelItem
                    key={channel.channelId}
                    channel={channel}
                    onSelect={() => handleSelectChannel(channel)}
                  />
                ))}
              </Command.Group>
            )}

            {/* Direct messages */}
            {directMessages.length > 0 && (
              <Command.Group heading="Direct Messages">
                {directMessages.map((user) => (
                  <UserItem
                    key={user.userId}
                    user={user}
                    onSelect={() => handleSelectUser(user)}
                  />
                ))}
              </Command.Group>
            )}

            {/* Actions */}
            <Command.Group heading="Actions">
              <Command.Item
                value="create-channel"
                onSelect={handleCreateChannel}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                  "aria-selected:text-accent-foreground aria-selected:bg-accent",
                )}
              >
                <Plus className="h-4 w-4 text-muted-foreground" />
                Create a new channel
              </Command.Item>

              <Command.Item
                value="start-dm"
                onSelect={handleStartDM}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                  "aria-selected:text-accent-foreground aria-selected:bg-accent",
                )}
              >
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Start a direct message
              </Command.Item>

              <Command.Item
                value="settings"
                onSelect={handleOpenSettings}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                  "aria-selected:text-accent-foreground aria-selected:bg-accent",
                )}
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                Open settings
              </Command.Item>

              <Command.Item
                value="sign-out"
                onSelect={handleSignOut}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                  "aria-selected:text-accent-foreground aria-selected:bg-accent",
                )}
              >
                <LogOut className="h-4 w-4 text-muted-foreground" />
                Sign out
              </Command.Item>
            </Command.Group>
          </Command.List>

          {/* Footer */}
          <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="rounded border bg-muted px-1">&#8593;</kbd>
                <kbd className="rounded border bg-muted px-1">&#8595;</kbd>
                to navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border bg-muted px-1">&#8629;</kbd>
                to select
              </span>
            </div>
            <span>
              <kbd className="rounded border bg-muted px-1.5">esc</kbd> to close
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}

// ============================================================================
// Channel Item
// ============================================================================

interface ChannelItemProps {
  channel: ChannelSearchResult;
  icon?: React.ElementType;
  iconClassName?: string;
  onSelect: () => void;
}

function ChannelItem({
  channel,
  icon: CustomIcon,
  iconClassName,
  onSelect,
}: ChannelItemProps) {
  const Icon = CustomIcon ?? (channel.isPrivate ? Lock : Hash);

  return (
    <Command.Item
      value={channel.name}
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm",
        "aria-selected:text-accent-foreground aria-selected:bg-accent",
      )}
    >
      <Icon
        className={cn("h-4 w-4 shrink-0 text-muted-foreground", iconClassName)}
      />
      <span className="min-w-0 flex-1 truncate">{channel.name}</span>
      {channel.isPrivate && !CustomIcon && (
        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
          Private
        </Badge>
      )}
      {!channel.isMember && (
        <Badge variant="outline" className="h-5 px-1.5 text-xs">
          Not joined
        </Badge>
      )}
    </Command.Item>
  );
}

// ============================================================================
// User Item
// ============================================================================

interface UserItemProps {
  user: UserSearchResult;
  onSelect: () => void;
}

function UserItem({ user, onSelect }: UserItemProps) {
  const initials = user.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const statusColors = {
    online: "bg-green-500",
    away: "bg-yellow-500",
    busy: "bg-red-500",
    offline: "bg-gray-400",
  };

  return (
    <Command.Item
      value={`${user.displayName} ${user.username}`}
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm",
        "aria-selected:text-accent-foreground aria-selected:bg-accent",
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="h-6 w-6">
          {user.avatar && (
            <AvatarImage src={user.avatar} alt={user.displayName} />
          )}
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background",
            statusColors[user.status],
          )}
        />
      </div>
      <span className="min-w-0 flex-1 truncate">{user.displayName}</span>
      <span className="shrink-0 text-xs text-muted-foreground">
        @{user.username}
      </span>
    </Command.Item>
  );
}

// ============================================================================
// Standalone Hook for Quick Switcher
// ============================================================================

export function useQuickSwitcher() {
  const isOpen = useUIStore((state) => state.quickSwitcherOpen);
  const setOpen = useUIStore((state) => state.setQuickSwitcherOpen);
  const toggle = useUIStore((state) => state.toggleQuickSwitcher);

  return {
    isOpen,
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle,
  };
}

export default QuickSwitcher;
