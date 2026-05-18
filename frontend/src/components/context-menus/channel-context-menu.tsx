"use client";

import * as React from "react";
import {
  Check,
  Bell,
  BellOff,
  Star,
  StarOff,
  Settings,
  LogOut,
  Link2,
  FolderInput,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItemWithIcon,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuLabel,
} from "./context-menu-base";
import { useAuth } from "@/contexts/auth-context";
import {
  useChannelStore,
  type Channel,
  type ChannelCategory,
} from "@/stores/channel-store";

// ============================================================================
// Types
// ============================================================================

export interface ChannelContextMenuProps {
  children: React.ReactNode;
  channel: Channel;
  categories?: ChannelCategory[];
  onMarkAsRead?: (channel: Channel) => void;
  onMuteToggle?: (channel: Channel, muted: boolean) => void;
  onStarToggle?: (channel: Channel, starred: boolean) => void;
  onNotificationSettings?: (channel: Channel) => void;
  onEditChannel?: (channel: Channel) => void;
  onLeaveChannel?: (channel: Channel) => void;
  onCopyLink?: (channel: Channel) => void;
  onMoveToCategory?: (channel: Channel, categoryId: string | null) => void;
  onDeleteChannel?: (channel: Channel) => void;
  disabled?: boolean;
}

type NotificationSetting = "all" | "mentions" | "nothing";

// ============================================================================
// Component
// ============================================================================

export function ChannelContextMenu({
  children,
  channel,
  categories = [],
  onMarkAsRead,
  onMuteToggle,
  onStarToggle,
  onNotificationSettings,
  onEditChannel,
  onLeaveChannel,
  onCopyLink,
  onMoveToCategory,
  onDeleteChannel,
  disabled = false,
}: ChannelContextMenuProps) {
  const { user } = useAuth();
  const { mutedChannels, starredChannels } = useChannelStore();

  const isAdmin = user?.role === "owner" || user?.role === "admin";
  const isMuted = mutedChannels.has(channel.id);
  const isStarred = starredChannels.has(channel.id);
  const isDM = channel.type === "direct" || channel.type === "group";

  // Local state for notification preference (would normally come from a store)
  const [notificationSetting, setNotificationSetting] =
    React.useState<NotificationSetting>("all");

  const handleCopyLink = React.useCallback(() => {
    if (onCopyLink) {
      onCopyLink(channel);
    } else {
      const url = `${window.location.origin}/chat/channel/${channel.slug}`;
      navigator.clipboard.writeText(url);
    }
  }, [channel, onCopyLink]);

  const handleMuteToggle = React.useCallback(() => {
    onMuteToggle?.(channel, !isMuted);
  }, [channel, isMuted, onMuteToggle]);

  const handleStarToggle = React.useCallback(() => {
    onStarToggle?.(channel, !isStarred);
  }, [channel, isStarred, onStarToggle]);

  const handleNotificationChange = React.useCallback(
    (value: string) => {
      setNotificationSetting(value as NotificationSetting);
      onNotificationSettings?.(channel);
    },
    [channel, onNotificationSettings],
  );

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {/* Mark as read */}
        <ContextMenuItemWithIcon
          icon={<Check className="h-4 w-4" />}
          onClick={() => onMarkAsRead?.(channel)}
        >
          Mark as read
        </ContextMenuItemWithIcon>

        <ContextMenuSeparator />

        {/* Mute/Unmute */}
        {isMuted ? (
          <ContextMenuItemWithIcon
            icon={<Volume2 className="h-4 w-4" />}
            onClick={handleMuteToggle}
          >
            Unmute channel
          </ContextMenuItemWithIcon>
        ) : (
          <ContextMenuItemWithIcon
            icon={<VolumeX className="h-4 w-4" />}
            onClick={handleMuteToggle}
          >
            Mute channel
          </ContextMenuItemWithIcon>
        )}

        {/* Star/Unstar */}
        {isStarred ? (
          <ContextMenuItemWithIcon
            icon={<StarOff className="h-4 w-4" />}
            onClick={handleStarToggle}
          >
            Unstar channel
          </ContextMenuItemWithIcon>
        ) : (
          <ContextMenuItemWithIcon
            icon={<Star className="h-4 w-4" />}
            onClick={handleStarToggle}
          >
            Star channel
          </ContextMenuItemWithIcon>
        )}

        {/* Notification Settings Submenu */}
        <ContextMenuSub>
          <ContextMenuSubTrigger icon={<Bell className="h-4 w-4" />}>
            Notification settings
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            <ContextMenuLabel>Notify me about...</ContextMenuLabel>
            <ContextMenuRadioGroup
              value={notificationSetting}
              onValueChange={handleNotificationChange}
            >
              <ContextMenuRadioItem value="all">
                All messages
              </ContextMenuRadioItem>
              <ContextMenuRadioItem value="mentions">
                Mentions only
              </ContextMenuRadioItem>
              <ContextMenuRadioItem value="nothing">
                Nothing
              </ContextMenuRadioItem>
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator />

        {/* Admin actions */}
        {isAdmin && !isDM && (
          <ContextMenuItemWithIcon
            icon={<Settings className="h-4 w-4" />}
            onClick={() => onEditChannel?.(channel)}
          >
            Edit channel
          </ContextMenuItemWithIcon>
        )}

        {/* Leave channel (not for DMs owned by user) */}
        {!isDM && !channel.isDefault && (
          <ContextMenuItemWithIcon
            icon={<LogOut className="h-4 w-4" />}
            onClick={() => onLeaveChannel?.(channel)}
          >
            Leave channel
          </ContextMenuItemWithIcon>
        )}

        {/* Copy link */}
        <ContextMenuItemWithIcon
          icon={<Link2 className="h-4 w-4" />}
          onClick={handleCopyLink}
        >
          Copy link
        </ContextMenuItemWithIcon>

        {/* Move to category (admin only, non-DM) */}
        {isAdmin && !isDM && categories.length > 0 && (
          <>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger icon={<FolderInput className="h-4 w-4" />}>
                Move to category
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-48">
                <ContextMenuItemWithIcon
                  onClick={() => onMoveToCategory?.(channel, null)}
                >
                  No category
                </ContextMenuItemWithIcon>
                <ContextMenuSeparator />
                {categories.map((category) => (
                  <ContextMenuItemWithIcon
                    key={category.id}
                    onClick={() => onMoveToCategory?.(channel, category.id)}
                  >
                    {category.name}
                    {channel.categoryId === category.id && (
                      <Check className="ml-auto h-4 w-4" />
                    )}
                  </ContextMenuItemWithIcon>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}

        {/* Delete channel (admin only, non-DM, non-default) */}
        {isAdmin && !isDM && !channel.isDefault && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItemWithIcon
              icon={<Trash2 className="h-4 w-4" />}
              destructive
              onClick={() => onDeleteChannel?.(channel)}
            >
              Delete channel
            </ContextMenuItemWithIcon>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

ChannelContextMenu.displayName = "ChannelContextMenu";
