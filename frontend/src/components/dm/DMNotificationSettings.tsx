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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, BellOff, Volume2, VolumeX, Clock, Settings } from "lucide-react";
import type { DirectMessage, DMNotificationSetting } from "@/lib/dm/dm-types";
import {
  getMutePresets,
  getMuteTimeRemaining,
  type MuteOptions,
} from "@/lib/dm";
import { useDMStore } from "@/stores/dm-store";

// ============================================================================
// Types
// ============================================================================

interface DMNotificationSettingsProps {
  dm: DirectMessage;
  currentUserId: string;
  variant?: "popover" | "inline";
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function DMNotificationSettings({
  dm,
  currentUserId,
  variant = "popover",
  className,
}: DMNotificationSettingsProps) {
  const {
    mutedDMs,
    notificationPreferences,
    setDMMuted,
    updateNotificationPreference,
  } = useDMStore();

  const isMuted = mutedDMs.has(dm.id);
  const preference = notificationPreferences.get(dm.id);
  const notificationSetting = preference?.setting || "all";
  const muteUntil = preference?.muteUntil || null;

  const mutePresets = getMutePresets();
  const muteTimeRemaining = getMuteTimeRemaining(muteUntil);

  const handleNotificationChange = (value: DMNotificationSetting) => {
    updateNotificationPreference(dm.id, { setting: value });
  };

  const handleMute = (preset: MuteOptions) => {
    let until: string | null = null;
    if (preset.duration !== null) {
      const now = new Date();
      let ms = preset.duration;
      switch (preset.unit) {
        case "minutes":
          ms *= 60 * 1000;
          break;
        case "hours":
          ms *= 60 * 60 * 1000;
          break;
        case "days":
          ms *= 24 * 60 * 60 * 1000;
          break;
      }
      until = new Date(now.getTime() + ms).toISOString();
    }
    setDMMuted(dm.id, true, until);
    updateNotificationPreference(dm.id, { muteUntil: until });
  };

  const handleUnmute = () => {
    setDMMuted(dm.id, false, null);
    updateNotificationPreference(dm.id, { muteUntil: null });
  };

  const handleSoundToggle = (enabled: boolean) => {
    updateNotificationPreference(dm.id, { soundEnabled: enabled });
  };

  const content = (
    <div className="space-y-4">
      {/* Notification Level */}
      <div className="space-y-2">
        <Label>Notifications</Label>
        <Select
          value={notificationSetting}
          onValueChange={handleNotificationChange}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                All messages
              </div>
            </SelectItem>
            <SelectItem value="mentions">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Mentions only
              </div>
            </SelectItem>
            <SelectItem value="none">
              <div className="flex items-center gap-2">
                <BellOff className="h-4 w-4" />
                Nothing
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mute Status */}
      <div className="space-y-2">
        <Label>Mute</Label>
        {isMuted ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <VolumeX className="h-4 w-4" />
                Muted{" "}
                {muteTimeRemaining.remaining
                  ? `for ${muteTimeRemaining.remaining}`
                  : "indefinitely"}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={handleUnmute}>
              <Volume2 className="mr-2 h-4 w-4" />
              Unmute
            </Button>
          </div>
        ) : (
          <Select
            value=""
            onValueChange={(value) => {
              const preset = mutePresets.find((p) => p.label === value);
              if (preset) handleMute(preset.value);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Mute conversation..." />
            </SelectTrigger>
            <SelectContent>
              {mutePresets.map((preset) => (
                <SelectItem key={preset.label} value={preset.label}>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {preset.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Sound Toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="sound-toggle">Sound</Label>
        <Switch
          id="sound-toggle"
          checked={preference?.soundEnabled ?? true}
          onCheckedChange={handleSoundToggle}
        />
      </div>
    </div>
  );

  if (variant === "inline") {
    return <div className={className}>{content}</div>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-9 w-9", className)}
        >
          {isMuted ? (
            <BellOff className="h-4 w-4" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          <span className="sr-only">Notification settings</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-medium">
            <Settings className="h-4 w-4" />
            Notification Settings
          </h4>
          {content}
        </div>
      </PopoverContent>
    </Popover>
  );
}

DMNotificationSettings.displayName = "DMNotificationSettings";
