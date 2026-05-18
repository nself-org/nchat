"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNotificationSettingsStore } from "@/stores/notification-settings-store";
import type { ChannelNotificationLevel } from "@/lib/notifications/notification-types";
import { MUTE_DURATIONS } from "@/lib/notifications/notification-types";

// Mock channel data - in real app this would come from the channel store
const MOCK_CHANNELS = [
  { id: "1", name: "general", type: "public" as const },
  { id: "2", name: "random", type: "public" as const },
  { id: "3", name: "dev-team", type: "private" as const },
  { id: "4", name: "announcements", type: "public" as const },
  { id: "5", name: "support", type: "public" as const },
];

const NOTIFICATION_LEVELS: Array<{
  value: ChannelNotificationLevel;
  label: string;
  description: string;
}> = [
  { value: "all", label: "All messages", description: "Every message" },
  { value: "mentions", label: "Mentions only", description: "@mentions" },
  { value: "nothing", label: "Muted", description: "No notifications" },
];

export interface ChannelNotificationSettingsListProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Channels to display (defaults to mock data) */
  channels?: Array<{
    id: string;
    name: string;
    type: "public" | "private" | "dm";
  }>;
}

/**
 * ChannelNotificationSettingsList - List of channel notification settings
 */
export function ChannelNotificationSettingsList({
  channels = MOCK_CHANNELS,
  className,
  ...props
}: ChannelNotificationSettingsListProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [expandedChannel, setExpandedChannel] = React.useState<string | null>(
    null,
  );

  const channelSettings = useNotificationSettingsStore(
    (state) => state.preferences.channelSettings,
  );
  const setChannelLevel = useNotificationSettingsStore(
    (state) => state.setChannelLevel,
  );
  const muteChannel = useNotificationSettingsStore(
    (state) => state.muteChannel,
  );
  const unmuteChannel = useNotificationSettingsStore(
    (state) => state.unmuteChannel,
  );

  // Filter channels by search
  const filteredChannels = React.useMemo(() => {
    if (!searchQuery) return channels;
    const query = searchQuery.toLowerCase();
    return channels.filter((ch) => ch.name.toLowerCase().includes(query));
  }, [channels, searchQuery]);

  // Get current settings for a channel
  const getSettings = (channelId: string) => {
    return (
      channelSettings[channelId] || { level: "all" as ChannelNotificationLevel }
    );
  };

  // Check if channel is muted
  const isMuted = (channelId: string) => {
    const settings = channelSettings[channelId];
    if (!settings) return false;
    if (settings.level === "nothing") return true;
    if (settings.muteUntil && new Date(settings.muteUntil) > new Date())
      return true;
    return false;
  };

  // Get mute remaining time
  const getMuteRemaining = (channelId: string): string | null => {
    const settings = channelSettings[channelId];
    if (!settings?.muteUntil) return null;

    const muteUntil = new Date(settings.muteUntil);
    if (muteUntil <= new Date()) return null;

    const diff = muteUntil.getTime() - Date.now();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? "s" : ""}`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Handle level change
  const handleLevelChange = (
    channelId: string,
    level: ChannelNotificationLevel,
  ) => {
    if (level === "nothing") {
      muteChannel(channelId, "forever");
    } else {
      setChannelLevel(channelId, level);
    }
  };

  // Handle mute with duration
  const handleMute = (channelId: string, duration: string) => {
    muteChannel(channelId, duration);
    setExpandedChannel(null);
  };

  return (
    <div className={cn("space-y-4", className)} {...props}>
      {/* Search */}
      <div className="relative">
        <Input
          type="search"
          placeholder="Search channels..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{channels.length} channels</span>
        <span>
          {
            Object.values(channelSettings).filter((s) => s.level === "nothing")
              .length
          }{" "}
          muted
        </span>
      </div>

      {/* Channel List */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-2 pr-4">
          {filteredChannels.map((channel) => {
            const settings = getSettings(channel.id);
            const muted = isMuted(channel.id);
            const muteRemaining = getMuteRemaining(channel.id);
            const isExpanded = expandedChannel === channel.id;

            return (
              <Card key={channel.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {channel.type === "private" ? (
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect
                            x="3"
                            y="11"
                            width="18"
                            height="11"
                            rx="2"
                            ry="2"
                          />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      ) : (
                        <span className="text-lg">#</span>
                      )}
                    </span>
                    <span className="font-medium">{channel.name}</span>
                    {muted && (
                      <Badge variant="secondary" className="text-xs">
                        {muteRemaining ? `Muted for ${muteRemaining}` : "Muted"}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={settings.level}
                      onValueChange={(value) =>
                        handleLevelChange(
                          channel.id,
                          value as ChannelNotificationLevel,
                        )
                      }
                    >
                      <SelectTrigger className="h-8 w-[140px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {NOTIFICATION_LEVELS.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            <div className="flex flex-col">
                              <span>{level.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {muted ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => unmuteChannel(channel.id)}
                      >
                        Unmute
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpandedChannel(isExpanded ? null : channel.id)
                        }
                      >
                        Mute
                      </Button>
                    )}
                  </div>
                </div>

                {/* Mute Duration Options */}
                {isExpanded && !muted && (
                  <div className="mt-3 border-t pt-3">
                    <p className="mb-2 text-xs text-muted-foreground">
                      Mute for:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {MUTE_DURATIONS.map((duration) => (
                        <Button
                          key={duration.value}
                          variant="outline"
                          size="sm"
                          onClick={() => handleMute(channel.id, duration.value)}
                          className="text-xs"
                        >
                          {duration.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}

          {filteredChannels.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              <p>No channels found</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

ChannelNotificationSettingsList.displayName = "ChannelNotificationSettingsList";

export default ChannelNotificationSettingsList;
