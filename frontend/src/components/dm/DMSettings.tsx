"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Star,
  StarOff,
  Archive,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import type { DirectMessage, DMNotificationSetting } from "@/lib/dm/dm-types";
import { getMutePresets, type MuteOptions } from "@/lib/dm";
import { useDMStore } from "@/stores/dm-store";

// ============================================================================
// Types
// ============================================================================

interface DMSettingsProps {
  dm: DirectMessage;
  currentUserId: string;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function DMSettings({ dm, currentUserId, className }: DMSettingsProps) {
  const {
    mutedDMs,
    starredDMs,
    notificationPreferences,
    toggleMuteDM,
    setDMMuted,
    toggleStarDM,
    archiveDM,
    removeDM,
    updateNotificationPreference,
  } = useDMStore();

  const isMuted = mutedDMs.has(dm.id);
  const isStarred = starredDMs.has(dm.id);
  const preference = notificationPreferences.get(dm.id);
  const notificationSetting = preference?.setting || "all";

  const mutePresets = getMutePresets();

  const handleNotificationSettingChange = (value: DMNotificationSetting) => {
    updateNotificationPreference(dm.id, { setting: value });
  };

  const handleMuteChange = (value: string) => {
    if (value === "unmute") {
      setDMMuted(dm.id, false, null);
    } else {
      const preset = mutePresets.find((p) => p.label === value);
      if (preset) {
        // Calculate mute expiry
        let muteUntil: string | null = null;
        if (preset.value.duration !== null) {
          const now = new Date();
          let ms = preset.value.duration;
          switch (preset.value.unit) {
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
          muteUntil = new Date(now.getTime() + ms).toISOString();
        }
        setDMMuted(dm.id, true, muteUntil);
      }
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Notification Settings */}
      <section>
        <h3 className="mb-4 text-sm font-semibold">Notifications</h3>

        <div className="space-y-4">
          {/* Notification Level */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notification-level">Notification level</Label>
              <p className="text-xs text-muted-foreground">
                Choose when to receive notifications
              </p>
            </div>
            <Select
              value={notificationSetting}
              onValueChange={(v) =>
                handleNotificationSettingChange(v as DMNotificationSetting)
              }
            >
              <SelectTrigger className="w-[140px]">
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

          {/* Mute */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="mute">Mute conversation</Label>
              <p className="text-xs text-muted-foreground">
                {isMuted
                  ? "Currently muted"
                  : "You will still receive messages"}
              </p>
            </div>
            <Select
              value={isMuted ? "muted" : "unmute"}
              onValueChange={handleMuteChange}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue>
                  {isMuted ? (
                    <div className="flex items-center gap-2">
                      <VolumeX className="h-4 w-4" />
                      Muted
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-4 w-4" />
                      Unmuted
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unmute">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4" />
                    Unmute
                  </div>
                </SelectItem>
                {mutePresets.map((preset) => (
                  <SelectItem key={preset.label} value={preset.label}>
                    Mute for {preset.label.toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sound */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="sound">Sound</Label>
              <p className="text-xs text-muted-foreground">
                Play sound for new messages
              </p>
            </div>
            <Switch
              id="sound"
              checked={preference?.soundEnabled ?? true}
              onCheckedChange={(checked) =>
                updateNotificationPreference(dm.id, { soundEnabled: checked })
              }
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* Quick Actions */}
      <section>
        <h3 className="mb-4 text-sm font-semibold">Quick Actions</h3>

        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => toggleStarDM(dm.id)}
          >
            {isStarred ? (
              <>
                <StarOff className="mr-2 h-4 w-4" />
                Remove from starred
              </>
            ) : (
              <>
                <Star className="mr-2 h-4 w-4" />
                Add to starred
              </>
            )}
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => archiveDM(dm.id)}
          >
            <Archive className="mr-2 h-4 w-4" />
            Archive conversation
          </Button>
        </div>
      </section>

      <Separator />

      {/* Danger Zone */}
      <section>
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Danger Zone
        </h3>

        <div className="space-y-2">
          <Button
            variant="destructive"
            className="w-full justify-start"
            onClick={() => removeDM(dm.id)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete conversation
          </Button>
          <p className="text-xs text-muted-foreground">
            This will permanently delete all messages in this conversation.
          </p>
        </div>
      </section>
    </div>
  );
}

DMSettings.displayName = "DMSettings";
