"use client";

// ===============================================================================
// Slack Channel List Component
// ===============================================================================
//
// A collapsible list of channels with icons, unread indicators,
// and mention badges.
//
// ===============================================================================

import { useState } from "react";
import { cn } from "@/lib/utils";
import { slackColors } from "../config";
import {
  Hash,
  Lock,
  ChevronDown,
  ChevronRight,
  Plus,
  Globe,
} from "lucide-react";

// -------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------

export interface SlackChannelListProps {
  channels?: SlackChannelData[];
  activeChannelId?: string;
  onChannelSelect?: (channelId: string) => void;
  onAddChannel?: () => void;
  title?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
}

export interface SlackChannelData {
  id: string;
  name: string;
  type: "public" | "private" | "shared";
  unreadCount?: number;
  mentionCount?: number;
  isMuted?: boolean;
  isStarred?: boolean;
}

// -------------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------------

export function SlackChannelList({
  channels = [],
  activeChannelId,
  onChannelSelect,
  onAddChannel,
  title = "Channels",
  collapsible = true,
  defaultCollapsed = false,
  className,
}: SlackChannelListProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const handleToggle = () => {
    if (collapsible) {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <div className={cn("select-none", className)}>
      {/* Section Header */}
      <div className="flex items-center justify-between px-4 py-1">
        <button
          onClick={handleToggle}
          className="flex items-center gap-1 text-sm font-medium text-white/70 transition-colors hover:text-white"
        >
          {collapsible &&
            (isCollapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            ))}
          <span>{title}</span>
        </button>
        {onAddChannel && (
          <button
            onClick={onAddChannel}
            className="rounded p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Channel List */}
      {!isCollapsed && (
        <div className="mt-1">
          {channels.map((channel) => (
            <ChannelItem
              key={channel.id}
              channel={channel}
              isActive={channel.id === activeChannelId}
              onClick={() => onChannelSelect?.(channel.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------------------------
// Channel Item Sub-component
// -------------------------------------------------------------------------------

function ChannelItem({
  channel,
  isActive,
  onClick,
}: {
  channel: SlackChannelData;
  isActive: boolean;
  onClick: () => void;
}) {
  const hasUnread = !channel.isMuted && (channel.unreadCount ?? 0) > 0;
  const hasMention = !channel.isMuted && (channel.mentionCount ?? 0) > 0;

  const Icon = {
    public: Hash,
    private: Lock,
    shared: Globe,
  }[channel.type];

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-4 py-1 text-sm transition-colors",
        isActive
          ? "bg-[#1264A3] text-white"
          : hasUnread
            ? "font-medium text-white hover:bg-white/10"
            : "text-white/70 hover:bg-white/10 hover:text-white",
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0 opacity-80" />
      <span className="flex-1 truncate text-left">{channel.name}</span>

      {/* Mention Badge */}
      {hasMention && (
        <span
          className="flex h-[18px] min-w-[18px] flex-shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-bold"
          style={{ backgroundColor: slackColors.red }}
        >
          {channel.mentionCount}
        </span>
      )}

      {/* Unread Dot (when no mentions) */}
      {hasUnread && !hasMention && (
        <span className="h-2 w-2 flex-shrink-0 rounded-full bg-white" />
      )}

      {/* Muted Indicator */}
      {channel.isMuted && (
        <span className="flex-shrink-0 text-xs text-white/40">muted</span>
      )}
    </button>
  );
}

export default SlackChannelList;
