"use client";

// ===============================================================================
// Slack Sidebar Component
// ===============================================================================
//
// The classic Slack aubergine sidebar with workspace name, navigation,
// channels, and direct messages sections.
//
// ===============================================================================

import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { slackColors } from "../config";
import {
  Hash,
  Lock,
  ChevronDown,
  ChevronRight,
  Plus,
  MessageSquare,
  Home,
  Bell,
  Bookmark,
  MoreHorizontal,
  Search,
  Edit,
} from "lucide-react";

// -------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------

export interface SlackSidebarProps {
  workspaceName?: string;
  workspaceIcon?: ReactNode;
  channels?: SlackChannelItem[];
  directMessages?: SlackDMItem[];
  activeChannelId?: string;
  onChannelSelect?: (channelId: string) => void;
  onDMSelect?: (dmId: string) => void;
  className?: string;
}

export interface SlackChannelItem {
  id: string;
  name: string;
  isPrivate?: boolean;
  unreadCount?: number;
  mentionCount?: number;
  isMuted?: boolean;
}

export interface SlackDMItem {
  id: string;
  name: string;
  avatarUrl?: string;
  status?: "online" | "away" | "dnd" | "offline";
  unreadCount?: number;
}

// -------------------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------------------

function SidebarSection({
  title,
  children,
  defaultOpen = true,
  onAdd,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  onAdd?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center px-4 py-1 text-sm font-medium",
          "text-white/70 transition-colors hover:text-white",
        )}
      >
        {isOpen ? (
          <ChevronDown className="mr-1 h-3 w-3" />
        ) : (
          <ChevronRight className="mr-1 h-3 w-3" />
        )}
        <span>{title}</span>
        {onAdd && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            className="ml-auto rounded p-1 hover:bg-white/10"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </button>
      {isOpen && <div className="mt-1">{children}</div>}
    </div>
  );
}

function PresenceIndicator({ status }: { status: SlackDMItem["status"] }) {
  const colors = {
    online: slackColors.sidebarPresence,
    away: "transparent",
    dnd: slackColors.red,
    offline: "transparent",
  };

  const borderColors = {
    online: slackColors.sidebarPresence,
    away: slackColors.sidebarPresence,
    dnd: slackColors.red,
    offline: slackColors.sidebarTextMuted,
  };

  return (
    <span
      className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
      style={{
        backgroundColor: colors[status || "offline"],
        border: `2px solid ${borderColors[status || "offline"]}`,
      }}
    />
  );
}

// -------------------------------------------------------------------------------
// Main Component
// -------------------------------------------------------------------------------

export function SlackSidebar({
  workspaceName = "Workspace",
  workspaceIcon,
  channels = [],
  directMessages = [],
  activeChannelId,
  onChannelSelect,
  onDMSelect,
  className,
}: SlackSidebarProps) {
  return (
    <div
      className={cn("flex h-full flex-col text-white", className)}
      style={{ backgroundColor: slackColors.aubergine }}
    >
      {/* Workspace Header */}
      <div
        className="flex items-center justify-between border-b px-4"
        style={{
          height: 49,
          borderColor: "rgba(255, 255, 255, 0.1)",
        }}
      >
        <button className="-ml-1 flex items-center gap-2 rounded p-1 hover:bg-white/10">
          {workspaceIcon || (
            <div
              className="flex h-6 w-6 items-center justify-center rounded text-sm font-bold"
              style={{ backgroundColor: slackColors.aubergineLight }}
            >
              {workspaceName[0]?.toUpperCase()}
            </div>
          )}
          <span className="max-w-[160px] truncate text-lg font-bold">
            {workspaceName}
          </span>
          <ChevronDown className="h-4 w-4 opacity-70" />
        </button>
        <button className="rounded p-1.5 hover:bg-white/10">
          <Edit className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <div
        className="border-b px-2 py-3"
        style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}
      >
        <NavItem icon={<MessageSquare className="h-4 w-4" />} label="Threads" />
        <NavItem icon={<Home className="h-4 w-4" />} label="All DMs" />
        <NavItem
          icon={<Bell className="h-4 w-4" />}
          label="Activity"
          badge={3}
        />
        <NavItem icon={<Bookmark className="h-4 w-4" />} label="Later" />
        <NavItem icon={<MoreHorizontal className="h-4 w-4" />} label="More" />
      </div>

      {/* Channels & DMs */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {/* Channels Section */}
        <SidebarSection title="Channels" onAdd={() => {}}>
          {channels.map((channel) => (
            <ChannelItem
              key={channel.id}
              channel={channel}
              isActive={activeChannelId === channel.id}
              onClick={() => onChannelSelect?.(channel.id)}
            />
          ))}
        </SidebarSection>

        {/* Direct Messages Section */}
        <SidebarSection title="Direct messages" onAdd={() => {}}>
          {directMessages.map((dm) => (
            <DMItem
              key={dm.id}
              dm={dm}
              isActive={activeChannelId === dm.id}
              onClick={() => onDMSelect?.(dm.id)}
            />
          ))}
        </SidebarSection>
      </div>
    </div>
  );
}

function NavItem({
  icon,
  label,
  badge,
}: {
  icon: ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 rounded px-3 py-1",
        "text-white/90 transition-colors hover:bg-white/10",
      )}
    >
      {icon}
      <span className="text-sm">{label}</span>
      {badge && badge > 0 && (
        <span
          className="ml-auto rounded px-1.5 text-xs font-bold"
          style={{ backgroundColor: slackColors.red }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function ChannelItem({
  channel,
  isActive,
  onClick,
}: {
  channel: SlackChannelItem;
  isActive: boolean;
  onClick: () => void;
}) {
  const hasUnread = (channel.unreadCount ?? 0) > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded px-3 py-1 text-sm",
        "transition-colors",
        isActive
          ? "bg-[#1264A3] text-white"
          : hasUnread
            ? "font-medium text-white hover:bg-white/10"
            : "text-white/70 hover:bg-white/10 hover:text-white",
      )}
    >
      {channel.isPrivate ? (
        <Lock className="h-4 w-4 flex-shrink-0" />
      ) : (
        <Hash className="h-4 w-4 flex-shrink-0" />
      )}
      <span className="truncate">{channel.name}</span>
      {(channel.mentionCount ?? 0) > 0 && (
        <span
          className="ml-auto rounded px-1.5 text-xs font-bold"
          style={{ backgroundColor: slackColors.red }}
        >
          {channel.mentionCount}
        </span>
      )}
    </button>
  );
}

function DMItem({
  dm,
  isActive,
  onClick,
}: {
  dm: SlackDMItem;
  isActive: boolean;
  onClick: () => void;
}) {
  const hasUnread = (dm.unreadCount ?? 0) > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded px-3 py-1 text-sm",
        "transition-colors",
        isActive
          ? "bg-[#1264A3] text-white"
          : hasUnread
            ? "font-medium text-white hover:bg-white/10"
            : "text-white/70 hover:bg-white/10 hover:text-white",
      )}
    >
      <PresenceIndicator status={dm.status} />
      <span className="truncate">{dm.name}</span>
      {hasUnread && <span className="ml-auto h-2 w-2 rounded-full bg-white" />}
    </button>
  );
}

export default SlackSidebar;
