"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import {
  useNotificationStore,
  type ChannelNotificationLevel,
  type ChannelNotificationSettings as ChannelSettings,
} from "@/stores/notification-store";

// Notification level options
const NOTIFICATION_LEVELS: Array<{
  value: ChannelNotificationLevel;
  label: string;
  description: string;
}> = [
  {
    value: "all",
    label: "All messages",
    description: "Get notified for every message",
  },
  {
    value: "mentions",
    label: "Mentions only",
    description: "Only when someone @mentions you",
  },
  {
    value: "nothing",
    label: "Nothing",
    description: "No notifications from this channel",
  },
];

// Mute duration options
const MUTE_DURATIONS = [
  { value: "15m", label: "15 minutes", minutes: 15 },
  { value: "1h", label: "1 hour", minutes: 60 },
  { value: "8h", label: "8 hours", minutes: 480 },
  { value: "24h", label: "24 hours", minutes: 1440 },
  { value: "1w", label: "1 week", minutes: 10080 },
  { value: "forever", label: "Until I turn it back on", minutes: Infinity },
];

export interface ChannelNotificationSettingsProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The channel ID
   */
  channelId: string;

  /**
   * The channel name (for display)
   */
  channelName: string;

  /**
   * Callback when settings are saved
   */
  onSave?: () => void;

  /**
   * Callback when dialog should close
   */
  onClose?: () => void;

  /**
   * Whether to show as a compact inline form
   * @default false
   */
  compact?: boolean;
}

/**
 * ChannelNotificationSettings - Per-channel notification configuration
 *
 * Allows users to configure:
 * - Notification level (all, mentions, nothing)
 * - Temporary mute with duration
 * - Custom sound (optional)
 */
export function ChannelNotificationSettings({
  channelId,
  channelName,
  onSave,
  onClose,
  compact = false,
  className,
  ...props
}: ChannelNotificationSettingsProps) {
  const preferences = useNotificationStore((state) => state.preferences);
  const setChannelNotificationLevel = useNotificationStore(
    (state) => state.setChannelNotificationLevel,
  );
  const muteChannel = useNotificationStore((state) => state.muteChannel);
  const unmuteChannel = useNotificationStore((state) => state.unmuteChannel);

  // Get current channel settings
  const currentSettings: ChannelSettings = preferences.channelSettings[
    channelId
  ] || {
    channelId,
    level: "all",
    overrideGlobal: false,
  };

  const [level, setLevel] = React.useState<ChannelNotificationLevel>(
    currentSettings.level,
  );
  const [overrideGlobal, setOverrideGlobal] = React.useState(
    currentSettings.overrideGlobal,
  );
  const [isMuted, setIsMuted] = React.useState(
    currentSettings.level === "nothing" ||
      Boolean(
        currentSettings.muteUntil &&
        new Date(currentSettings.muteUntil) > new Date(),
      ),
  );
  const [selectedMuteDuration, setSelectedMuteDuration] =
    React.useState<string>("1h");

  // Check if currently muted
  const muteEndTime = currentSettings.muteUntil
    ? new Date(currentSettings.muteUntil)
    : null;
  const isCurrentlyMuted = muteEndTime && muteEndTime > new Date();

  // Handle level change
  const handleLevelChange = React.useCallback(
    (newLevel: ChannelNotificationLevel) => {
      setLevel(newLevel);
      if (overrideGlobal) {
        setChannelNotificationLevel(channelId, newLevel);
        if (newLevel === "nothing") {
          setIsMuted(true);
        } else {
          setIsMuted(false);
          unmuteChannel(channelId);
        }
      }
    },
    [channelId, overrideGlobal, setChannelNotificationLevel, unmuteChannel],
  );

  // Handle mute toggle
  const handleMuteToggle = React.useCallback(
    (muted: boolean) => {
      setIsMuted(muted);
      if (muted) {
        const duration = MUTE_DURATIONS.find(
          (d) => d.value === selectedMuteDuration,
        );
        if (duration) {
          if (duration.minutes === Infinity) {
            muteChannel(channelId);
          } else {
            const until = new Date();
            until.setMinutes(until.getMinutes() + duration.minutes);
            muteChannel(channelId, until.toISOString());
          }
        }
      } else {
        unmuteChannel(channelId);
      }
    },
    [channelId, selectedMuteDuration, muteChannel, unmuteChannel],
  );

  // Handle mute duration change
  const handleMuteDurationChange = React.useCallback(
    (duration: string) => {
      setSelectedMuteDuration(duration);
      if (isMuted) {
        const durationConfig = MUTE_DURATIONS.find((d) => d.value === duration);
        if (durationConfig) {
          if (durationConfig.minutes === Infinity) {
            muteChannel(channelId);
          } else {
            const until = new Date();
            until.setMinutes(until.getMinutes() + durationConfig.minutes);
            muteChannel(channelId, until.toISOString());
          }
        }
      }
    },
    [channelId, isMuted, muteChannel],
  );

  // Handle override toggle
  const handleOverrideToggle = React.useCallback(
    (override: boolean) => {
      setOverrideGlobal(override);
      if (override) {
        setChannelNotificationLevel(channelId, level);
      }
    },
    [channelId, level, setChannelNotificationLevel],
  );

  // Format remaining mute time
  const formatMuteRemaining = React.useCallback(() => {
    if (!muteEndTime) return null;
    const now = new Date();
    const diffMs = muteEndTime.getTime() - now.getTime();
    if (diffMs <= 0) return null;

    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} minutes`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days`;
  }, [muteEndTime]);

  const muteRemaining = formatMuteRemaining();

  // Save handler
  const handleSave = React.useCallback(() => {
    onSave?.();
    onClose?.();
  }, [onSave, onClose]);

  if (compact) {
    return (
      <div className={cn("space-y-3", className)} {...props}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Notifications</span>
          <Select value={level} onValueChange={handleLevelChange}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NOTIFICATION_LEVELS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {level !== "nothing" && (
          <div className="flex items-center justify-between">
            <span className="text-sm">Mute</span>
            <Switch checked={isMuted} onCheckedChange={handleMuteToggle} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)} {...props}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Notification Settings</h3>
          <p className="text-sm text-muted-foreground">#{channelName}</p>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </Button>
        )}
      </div>

      {/* Override Global */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="override-global">Override global settings</Label>
            <p className="text-xs text-muted-foreground">
              Use custom notification settings for this channel
            </p>
          </div>
          <Switch
            id="override-global"
            checked={overrideGlobal}
            onCheckedChange={handleOverrideToggle}
          />
        </div>
      </Card>

      {/* Notification Level */}
      <Card
        className={cn(
          "p-4",
          !overrideGlobal && "pointer-events-none opacity-50",
        )}
      >
        <h4 className="mb-3 text-sm font-medium">Notification Level</h4>
        <div className="space-y-2">
          {NOTIFICATION_LEVELS.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                level === option.value
                  ? "bg-primary/5 border-primary"
                  : "hover:bg-accent/50 border-border",
              )}
            >
              <input
                type="radio"
                name="notification-level"
                value={option.value}
                checked={level === option.value}
                onChange={() => handleLevelChange(option.value)}
                className="mt-1"
                disabled={!overrideGlobal}
                aria-label={option.label}
              />
              <div>
                <span className="text-sm font-medium">{option.label}</span>
                <p className="text-xs text-muted-foreground">
                  {option.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </Card>

      {/* Mute Settings */}
      {level !== "nothing" && (
        <Card
          className={cn(
            "p-4",
            !overrideGlobal && "pointer-events-none opacity-50",
          )}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="mute-channel">Mute channel</Label>
              {isCurrentlyMuted && muteRemaining && (
                <p className="text-xs text-muted-foreground">
                  Muted for {muteRemaining}
                </p>
              )}
            </div>
            <Switch
              id="mute-channel"
              checked={isMuted}
              onCheckedChange={handleMuteToggle}
              disabled={!overrideGlobal}
            />
          </div>

          {isMuted && (
            <div className="mt-3">
              <Label className="mb-2 block text-xs text-muted-foreground">
                Mute duration
              </Label>
              <Select
                value={selectedMuteDuration}
                onValueChange={handleMuteDurationChange}
                disabled={!overrideGlobal}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MUTE_DURATIONS.map((duration) => (
                    <SelectItem key={duration.value} value={duration.value}>
                      {duration.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSave}>Save Changes</Button>
      </div>
    </div>
  );
}

ChannelNotificationSettings.displayName = "ChannelNotificationSettings";

export default ChannelNotificationSettings;
