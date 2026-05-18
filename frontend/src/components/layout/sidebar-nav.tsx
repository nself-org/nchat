"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Hash,
  Lock,
  ChevronDown,
  ChevronRight,
  Plus,
  MessageSquare,
  Users,
  Settings,
  Search,
  MoreHorizontal,
  Megaphone,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ============================================================================
// Types
// ============================================================================

export type ChannelType = "public" | "private" | "direct" | "group";

export interface SidebarChannel {
  id: string;
  name: string;
  slug: string;
  type: ChannelType;
  unreadCount?: number;
  hasUnreadMentions?: boolean;
  isMuted?: boolean;
  isArchived?: boolean;
  emoji?: string;
}

export interface DirectMessage {
  id: string;
  name: string;
  avatarUrl?: string;
  presence: "online" | "away" | "dnd" | "offline";
  unreadCount?: number;
  hasUnreadMentions?: boolean;
}

export interface SidebarSection {
  id: string;
  title: string;
  channels: SidebarChannel[];
  collapsed?: boolean;
}

export interface SidebarNavProps {
  sections?: SidebarSection[];
  directMessages?: DirectMessage[];
  onCreateChannel?: () => void;
  onCreateDM?: () => void;
  onOpenSearch?: () => void;
  onOpenSettings?: () => void;
  onSectionToggle?: (sectionId: string, collapsed: boolean) => void;
  onChannelAction?: (
    channelId: string,
    action: "mute" | "leave" | "settings",
  ) => void;
  loading?: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  className?: string;
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function SidebarNavSkeleton() {
  return (
    <div className="space-y-4 p-2" data-testid="sidebar-nav-skeleton">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}

// ============================================================================
// Channel Icon
// ============================================================================

function ChannelIcon({
  channel,
  className,
}: {
  channel: SidebarChannel;
  className?: string;
}) {
  if (channel.emoji) {
    return <span className={cn("text-sm", className)}>{channel.emoji}</span>;
  }

  if (channel.name === "announcements") {
    return <Megaphone className={cn("h-4 w-4", className)} />;
  }

  if (channel.type === "private") {
    return <Lock className={cn("h-4 w-4", className)} />;
  }

  return <Hash className={cn("h-4 w-4", className)} />;
}

// ============================================================================
// Channel Item
// ============================================================================

interface ChannelItemProps {
  channel: SidebarChannel;
  isActive: boolean;
  onAction?: (action: "mute" | "leave" | "settings") => void;
}

function ChannelItem({ channel, isActive, onAction }: ChannelItemProps) {
  const hasUnread = (channel.unreadCount ?? 0) > 0;

  return (
    <div className="group relative flex items-center">
      <Link
        href={`/chat/channel/${channel.slug}`}
        className={cn(
          "flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
          "hover:text-accent-foreground text-muted-foreground hover:bg-accent",
          isActive && "text-accent-foreground bg-accent font-medium",
          hasUnread && !channel.isMuted && "font-semibold text-foreground",
          channel.isMuted && "opacity-60",
        )}
        data-testid={`channel-item-${channel.id}`}
      >
        <ChannelIcon
          channel={channel}
          className={cn(
            "flex-shrink-0 text-muted-foreground",
            isActive && "text-accent-foreground",
          )}
        />
        <span className="flex-1 truncate">{channel.name}</span>
        {hasUnread && (
          <span
            className={cn(
              "ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-medium",
              channel.hasUnreadMentions
                ? "bg-destructive text-destructive-foreground"
                : "text-primary-foreground bg-primary",
            )}
            data-testid={`channel-unread-${channel.id}`}
          >
            {channel.unreadCount}
          </span>
        )}
      </Link>

      {onAction && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
              data-testid={`channel-menu-${channel.id}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onAction("mute")}>
              {channel.isMuted ? "Unmute" : "Mute"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction("settings")}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onAction("leave")}
              className="text-destructive"
            >
              Leave Channel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

// ============================================================================
// Direct Message Item
// ============================================================================

interface DMItemProps {
  dm: DirectMessage;
  isActive: boolean;
}

function DMItem({ dm, isActive }: DMItemProps) {
  const hasUnread = (dm.unreadCount ?? 0) > 0;

  const presenceColor = {
    online: "bg-green-500",
    away: "bg-yellow-500",
    dnd: "bg-red-500",
    offline: "bg-gray-400",
  }[dm.presence];

  return (
    <Link
      href={`/chat/dm/${dm.id}`}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        "hover:text-accent-foreground text-muted-foreground hover:bg-accent",
        isActive && "text-accent-foreground bg-accent font-medium",
        hasUnread && "font-semibold text-foreground",
      )}
      data-testid={`dm-item-${dm.id}`}
    >
      <div className="relative flex-shrink-0">
        <Avatar className="h-6 w-6">
          <AvatarImage src={dm.avatarUrl} alt={dm.name} />
          <AvatarFallback className="text-xs">
            {dm.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span
          className={cn(
            "absolute bottom-0 right-0 h-2 w-2 rounded-full ring-2 ring-background",
            presenceColor,
          )}
          data-testid={`dm-presence-${dm.id}`}
        />
      </div>
      <span className="flex-1 truncate">{dm.name}</span>
      {hasUnread && (
        <span
          className={cn(
            "ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-medium",
            dm.hasUnreadMentions
              ? "bg-destructive text-destructive-foreground"
              : "text-primary-foreground bg-primary",
          )}
          data-testid={`dm-unread-${dm.id}`}
        >
          {dm.unreadCount}
        </span>
      )}
    </Link>
  );
}

// ============================================================================
// Section Header
// ============================================================================

interface SectionHeaderProps {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  onAdd?: () => void;
}

function SectionHeader({
  title,
  collapsed,
  onToggle,
  onAdd,
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between px-2 py-1">
      <CollapsibleTrigger
        onClick={onToggle}
        className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
        data-testid={`section-toggle-${title.toLowerCase().replace(/\s+/g, "-")}`}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        {title}
      </CollapsibleTrigger>
      {onAdd && (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={onAdd}
                data-testid={`section-add-${title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Create {title.toLowerCase()}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SidebarNav({
  sections = [],
  directMessages = [],
  onCreateChannel,
  onCreateDM,
  onOpenSearch,
  onOpenSettings,
  onSectionToggle,
  onChannelAction,
  loading = false,
  collapsed: isCollapsed = false,
  onCollapsedChange,
  className,
}: SidebarNavProps) {
  const pathname = usePathname();
  const [collapsedSections, setCollapsedSections] = React.useState<Set<string>>(
    new Set(sections.filter((s) => s.collapsed).map((s) => s.id)),
  );
  const [dmCollapsed, setDmCollapsed] = React.useState(false);

  const handleSectionToggle = (sectionId: string) => {
    const newCollapsed = new Set(collapsedSections);
    const isNowCollapsed = !newCollapsed.has(sectionId);

    if (isNowCollapsed) {
      newCollapsed.add(sectionId);
    } else {
      newCollapsed.delete(sectionId);
    }

    setCollapsedSections(newCollapsed);
    onSectionToggle?.(sectionId, isNowCollapsed);
  };

  if (loading) {
    return (
      <nav className={cn("flex flex-col", className)}>
        <SidebarNavSkeleton />
      </nav>
    );
  }

  // Collapsed view (icons only)
  if (isCollapsed) {
    return (
      <nav
        className={cn("flex flex-col items-center gap-2 py-4", className)}
        data-testid="sidebar-nav-collapsed"
      >
        <TooltipProvider delayDuration={300}>
          {onOpenSearch && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onOpenSearch}
                  data-testid="sidebar-search-collapsed"
                >
                  <Search className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Search</TooltipContent>
            </Tooltip>
          )}
          {onCreateChannel && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onCreateChannel}
                  data-testid="sidebar-create-channel-collapsed"
                >
                  <Hash className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Channels</TooltipContent>
            </Tooltip>
          )}
          {onCreateDM && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onCreateDM}
                  data-testid="sidebar-create-dm-collapsed"
                >
                  <MessageSquare className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Direct Messages</TooltipContent>
            </Tooltip>
          )}
          {onOpenSettings && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onOpenSettings}
                  data-testid="sidebar-settings-collapsed"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Settings</TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
      </nav>
    );
  }

  return (
    <nav
      className={cn("flex h-full flex-col", className)}
      data-testid="sidebar-nav"
    >
      {/* Quick Actions */}
      <div className="flex items-center gap-1 border-b p-2">
        {onOpenSearch && (
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-start"
            onClick={onOpenSearch}
            data-testid="sidebar-search"
          >
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
        )}
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-2">
          {/* Channel Sections */}
          {sections.map((section) => (
            <Collapsible
              key={section.id}
              open={!collapsedSections.has(section.id)}
              data-testid={`section-${section.id}`}
            >
              <SectionHeader
                title={section.title}
                collapsed={collapsedSections.has(section.id)}
                onToggle={() => handleSectionToggle(section.id)}
                onAdd={onCreateChannel}
              />
              <CollapsibleContent className="space-y-0.5">
                {section.channels.map((channel) => (
                  <ChannelItem
                    key={channel.id}
                    channel={channel}
                    isActive={pathname === `/chat/channel/${channel.slug}`}
                    onAction={
                      onChannelAction
                        ? (action) => onChannelAction(channel.id, action)
                        : undefined
                    }
                  />
                ))}
                {section.channels.length === 0 && (
                  <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                    No channels yet
                  </p>
                )}
              </CollapsibleContent>
            </Collapsible>
          ))}

          {/* Direct Messages */}
          {directMessages.length > 0 && (
            <Collapsible open={!dmCollapsed}>
              <SectionHeader
                title="Direct Messages"
                collapsed={dmCollapsed}
                onToggle={() => setDmCollapsed(!dmCollapsed)}
                onAdd={onCreateDM}
              />
              <CollapsibleContent className="space-y-0.5">
                {directMessages.map((dm) => (
                  <DMItem
                    key={dm.id}
                    dm={dm}
                    isActive={pathname === `/chat/dm/${dm.id}`}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Empty State */}
          {sections.length === 0 && directMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No channels or DMs yet
              </p>
              {onCreateChannel && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={onCreateChannel}
                  data-testid="sidebar-empty-create"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Channel
                </Button>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      {onOpenSettings && (
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={onOpenSettings}
            data-testid="sidebar-settings"
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      )}
    </nav>
  );
}

export { SidebarNavSkeleton, ChannelItem, DMItem };
