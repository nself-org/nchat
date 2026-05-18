"use client";

// ===============================================================================
// Discord Channel Sidebar Component
// ===============================================================================
//
// The channel sidebar with server name, categories, text/voice channels,
// and user panel at the bottom.
//
// ===============================================================================

import { useState, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { discordColors, discordLayout } from "../config";
import {
  ChevronDown,
  ChevronRight,
  Hash,
  Volume2,
  Plus,
  Settings,
  Mic,
  MicOff,
  Headphones,
  VolumeX,
} from "lucide-react";

// -------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------

export interface DiscordChannelSidebarProps {
  serverName?: string;
  categories?: DiscordCategoryData[];
  activeChannelId?: string;
  onChannelSelect?: (channelId: string) => void;
  currentUser?: DiscordCurrentUser;
  onMuteToggle?: () => void;
  onDeafenToggle?: () => void;
  onSettingsClick?: () => void;
  className?: string;
}

export interface DiscordCategoryData {
  id: string;
  name: string;
  channels: DiscordChannelData[];
  isCollapsed?: boolean;
}

export interface DiscordChannelData {
  id: string;
  name: string;
  type: "text" | "voice" | "announcement" | "stage" | "forum";
  unreadCount?: number;
  mentionCount?: number;
  isPrivate?: boolean;
  connectedUsers?: number;
}

export interface DiscordCurrentUser {
  id: string;
  name: string;
  discriminator?: string;
  avatar?: string;
  status: "online" | "idle" | "dnd" | "offline";
  isMuted?: boolean;
  isDeafened?: boolean;
}

// -------------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------------

export function DiscordChannelSidebar({
  serverName = "Server",
  categories = [],
  activeChannelId,
  onChannelSelect,
  currentUser,
  onMuteToggle,
  onDeafenToggle,
  onSettingsClick,
  className,
}: DiscordChannelSidebarProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set(),
  );

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  return (
    <div
      className={cn("flex h-full flex-col", className)}
      style={{ backgroundColor: discordColors.gray750 }}
    >
      {/* Server Header */}
      <button
        className="flex h-12 items-center justify-between border-b px-4 shadow-sm transition-colors hover:bg-[#35373C]"
        style={{ borderColor: discordColors.gray850 }}
      >
        <span className="truncate font-semibold text-white">{serverName}</span>
        <ChevronDown className="h-4 w-4 flex-shrink-0 text-white" />
      </button>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto px-2 pt-4">
        {categories.map((category) => (
          <Category
            key={category.id}
            category={category}
            isCollapsed={collapsedCategories.has(category.id)}
            onToggle={() => toggleCategory(category.id)}
            activeChannelId={activeChannelId}
            onChannelSelect={onChannelSelect}
          />
        ))}
      </div>

      {/* User Panel */}
      {currentUser && (
        <UserPanel
          user={currentUser}
          onMuteToggle={onMuteToggle}
          onDeafenToggle={onDeafenToggle}
          onSettingsClick={onSettingsClick}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------------------

function Category({
  category,
  isCollapsed,
  onToggle,
  activeChannelId,
  onChannelSelect,
}: {
  category: DiscordCategoryData;
  isCollapsed: boolean;
  onToggle: () => void;
  activeChannelId?: string;
  onChannelSelect?: (channelId: string) => void;
}) {
  return (
    <div className="mb-4">
      {/* Category Header */}
      <button
        onClick={onToggle}
        className="mb-1 flex w-full items-center gap-1 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400 transition-colors hover:text-gray-200"
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        <span>{category.name}</span>
        <button className="ml-auto rounded p-1 hover:bg-white/10">
          <Plus className="h-3 w-3" />
        </button>
      </button>

      {/* Channels */}
      {!isCollapsed && (
        <div className="space-y-0.5">
          {category.channels.map((channel) => (
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

function ChannelItem({
  channel,
  isActive,
  onClick,
}: {
  channel: DiscordChannelData;
  isActive: boolean;
  onClick: () => void;
}) {
  const hasUnread = (channel.unreadCount ?? 0) > 0;
  const hasMention = (channel.mentionCount ?? 0) > 0;
  const isVoice = channel.type === "voice";

  const Icon = isVoice ? Volume2 : Hash;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-1.5 rounded px-2 py-1.5",
        "text-sm transition-colors",
        isActive
          ? "bg-[#404249] text-white"
          : hasUnread
            ? "text-white hover:bg-[#35373C]"
            : "text-gray-400 hover:bg-[#35373C] hover:text-gray-200",
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0 opacity-60" />
      <span
        className={cn("flex-1 truncate text-left", hasUnread && "font-medium")}
      >
        {channel.name}
      </span>

      {/* Voice Channel Users */}
      {isVoice && (channel.connectedUsers ?? 0) > 0 && (
        <span className="text-xs text-gray-400">{channel.connectedUsers}</span>
      )}

      {/* Mention Badge */}
      {hasMention && (
        <span
          className="flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-xs font-bold text-white"
          style={{ backgroundColor: discordColors.red }}
        >
          {channel.mentionCount}
        </span>
      )}
    </button>
  );
}

function UserPanel({
  user,
  onMuteToggle,
  onDeafenToggle,
  onSettingsClick,
}: {
  user: DiscordCurrentUser;
  onMuteToggle?: () => void;
  onDeafenToggle?: () => void;
  onSettingsClick?: () => void;
}) {
  const statusColors = {
    online: discordColors.statusOnline,
    idle: discordColors.statusIdle,
    dnd: discordColors.statusDnd,
    offline: discordColors.statusOffline,
  };

  return (
    <div
      className="flex items-center gap-2 px-2 py-2"
      style={{ backgroundColor: discordColors.gray800 }}
    >
      {/* Avatar with Status */}
      <div className="relative">
        <div className="h-8 w-8 overflow-hidden rounded-full">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center font-medium text-white"
              style={{ backgroundColor: discordColors.blurple }}
            >
              {user.name[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <span
          className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2"
          style={{
            backgroundColor: statusColors[user.status],
            borderColor: discordColors.gray800,
          }}
        />
      </div>

      {/* Name */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-white">
          {user.name}
        </div>
        <div className="truncate text-xs text-gray-400">
          {user.discriminator ? `#${user.discriminator}` : "Online"}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center">
        <button
          onClick={onMuteToggle}
          className={cn(
            "rounded p-1.5 hover:bg-[#35373C]",
            user.isMuted ? "text-red-400" : "text-gray-400",
          )}
        >
          {user.isMuted ? (
            <MicOff className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </button>
        <button
          onClick={onDeafenToggle}
          className={cn(
            "rounded p-1.5 hover:bg-[#35373C]",
            user.isDeafened ? "text-red-400" : "text-gray-400",
          )}
        >
          {user.isDeafened ? (
            <VolumeX className="h-5 w-5" />
          ) : (
            <Headphones className="h-5 w-5" />
          )}
        </button>
        <button
          onClick={onSettingsClick}
          className="rounded p-1.5 text-gray-400 hover:bg-[#35373C]"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export default DiscordChannelSidebar;
