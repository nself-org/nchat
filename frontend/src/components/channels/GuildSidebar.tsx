"use client";

/**
 * Guild Sidebar Component - Discord-style server sidebar
 * Shows categories and channels in hierarchical structure
 */

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Hash,
  Volume2,
  Lock,
  Plus,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChannelCategory, Channel } from "@/types/advanced-channels";

// ============================================================================
// Interfaces
// ============================================================================

export interface GuildSidebarProps {
  workspaceId: string;
  workspaceName: string;
  workspaceIcon?: string;
  categories: ChannelCategory[];
  channels: Channel[];
  currentChannelId?: string;
  onChannelSelect?: (channelId: string) => void;
  onCreateChannel?: (categoryId?: string) => void;
  onCreateCategory?: () => void;
  onManageChannel?: (channelId: string) => void;
  userPermissions?: {
    canManageChannels: boolean;
    canManageCategories: boolean;
  };
}

interface CategoryWithChannels extends ChannelCategory {
  channels: Channel[];
}

// ============================================================================
// Component
// ============================================================================

export function GuildSidebar({
  workspaceId,
  workspaceName,
  workspaceIcon,
  categories,
  channels,
  currentChannelId,
  onChannelSelect,
  onCreateChannel,
  onCreateCategory,
  onManageChannel,
  userPermissions = { canManageChannels: false, canManageCategories: false },
}: GuildSidebarProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set(),
  );

  // Group channels by category
  const categoriesWithChannels: CategoryWithChannels[] = categories.map(
    (cat) => ({
      ...cat,
      channels: channels.filter((ch) => ch.categoryId === cat.id),
    }),
  );

  // Uncategorized channels
  const uncategorizedChannels = channels.filter((ch) => !ch.categoryId);

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

  const getChannelIcon = (channel: Channel) => {
    if (channel.type === "voice") return <Volume2 className="h-4 w-4" />;
    if (channel.isPrivate) return <Lock className="h-4 w-4" />;
    return <Hash className="h-4 w-4" />;
  };

  return (
    <div className="bg-secondary/30 flex h-full w-60 flex-col">
      {/* Workspace Header */}
      <div className="flex h-12 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          {workspaceIcon ? (
            <img
              src={workspaceIcon}
              alt={workspaceName}
              className="h-6 w-6 rounded"
            />
          ) : (
            <div className="text-primary-foreground flex h-6 w-6 items-center justify-center rounded bg-primary text-xs font-bold">
              {workspaceName[0].toUpperCase()}
            </div>
          )}
          <span className="font-semibold">{workspaceName}</span>
        </div>
        {userPermissions.canManageChannels && (
          <button
            onClick={() => onCreateChannel?.()}
            className="rounded p-1 hover:bg-secondary"
            title="Create Channel"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto py-2">
        {/* Uncategorized Channels */}
        {uncategorizedChannels.length > 0 && (
          <div className="mb-4">
            {uncategorizedChannels.map((channel) => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                isActive={channel.id === currentChannelId}
                icon={getChannelIcon(channel)}
                onClick={() => onChannelSelect?.(channel.id)}
                onManage={() => onManageChannel?.(channel.id)}
                canManage={userPermissions.canManageChannels}
              />
            ))}
          </div>
        )}

        {/* Categories with Channels */}
        {categoriesWithChannels.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            isCollapsed={collapsedCategories.has(category.id)}
            onToggle={() => toggleCategory(category.id)}
            currentChannelId={currentChannelId}
            onChannelSelect={onChannelSelect}
            onCreateChannel={onCreateChannel}
            onManageChannel={onManageChannel}
            getChannelIcon={getChannelIcon}
            userPermissions={userPermissions}
          />
        ))}

        {/* Create Category Button */}
        {userPermissions.canManageCategories && (
          <button
            onClick={onCreateCategory}
            className="mx-2 mt-2 flex w-[calc(100%-1rem)] items-center gap-2 rounded px-2 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
            <span>Create Category</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

interface CategorySectionProps {
  category: CategoryWithChannels;
  isCollapsed: boolean;
  onToggle: () => void;
  currentChannelId?: string;
  onChannelSelect?: (channelId: string) => void;
  onCreateChannel?: (categoryId?: string) => void;
  onManageChannel?: (channelId: string) => void;
  getChannelIcon: (channel: Channel) => React.ReactNode;
  userPermissions: {
    canManageChannels: boolean;
    canManageCategories: boolean;
  };
}

function CategorySection({
  category,
  isCollapsed,
  onToggle,
  currentChannelId,
  onChannelSelect,
  onCreateChannel,
  onManageChannel,
  getChannelIcon,
  userPermissions,
}: CategorySectionProps) {
  return (
    <div className="mb-4">
      {/* Category Header */}
      <div className="group mx-2 flex items-center justify-between px-2 py-1">
        <button
          onClick={onToggle}
          className="flex flex-1 items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          {category.icon && <span>{category.icon}</span>}
          <span>{category.name}</span>
        </button>
        {userPermissions.canManageChannels && (
          <button
            onClick={() => onCreateChannel?.(category.id)}
            className="opacity-0 transition-opacity group-hover:opacity-100"
            title="Create Channel"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Channels */}
      {!isCollapsed && (
        <div>
          {category.channels.map((channel) => (
            <ChannelItem
              key={channel.id}
              channel={channel}
              isActive={channel.id === currentChannelId}
              icon={getChannelIcon(channel)}
              onClick={() => onChannelSelect?.(channel.id)}
              onManage={() => onManageChannel?.(channel.id)}
              canManage={userPermissions.canManageChannels}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ChannelItemProps {
  channel: Channel;
  isActive: boolean;
  icon: React.ReactNode;
  onClick: () => void;
  onManage: () => void;
  canManage: boolean;
}

function ChannelItem({
  channel,
  isActive,
  icon,
  onClick,
  onManage,
  canManage,
}: ChannelItemProps) {
  return (
    <div
      className={cn(
        "group mx-2 flex items-center justify-between rounded px-2 py-1.5",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex flex-1 cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-left"
      >
        {icon}
        <span className="text-sm font-medium">{channel.name}</span>
        {channel.isDefault && (
          <span className="text-xs text-muted-foreground">(default)</span>
        )}
      </button>
      {canManage && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onManage();
          }}
          className="opacity-0 transition-opacity group-hover:opacity-100"
          title="Manage Channel"
        >
          <Settings className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
