"use client";

import * as React from "react";
import { useState } from "react";
import {
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Mail,
  Smartphone,
  Monitor,
  Clock,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Channel } from "@/stores/channel-store";

// ============================================================================
// Types
// ============================================================================

export interface ChannelNotificationSettingsProps {
  channel: Channel;
  currentSettings?: NotificationPreferences;
  onSave?: (settings: NotificationPreferences) => Promise<void>;
  className?: string;
}

export interface NotificationPreferences {
  enabled: boolean;
  muteUntil: string | null;
  notifyOn: "all" | "mentions" | "nothing";
  sound: boolean;
  desktop: boolean;
  mobile: boolean;
  email: boolean;
  emailDigest: "instant" | "hourly" | "daily" | "never";
}

// ============================================================================
// Component
// ============================================================================

export function ChannelNotificationSettings({
  channel,
  currentSettings,
  onSave,
  className,
}: ChannelNotificationSettingsProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationPreferences>(
    currentSettings || {
      enabled: true,
      muteUntil: null,
      notifyOn: "all",
      sound: true,
      desktop: true,
      mobile: true,
      email: false,
      emailDigest: "daily",
    },
  );

  const handleSettingChange = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave?.(settings);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMuteFor = (duration: string) => {
    const muteUntil = new Date();
    switch (duration) {
      case "15min":
        muteUntil.setMinutes(muteUntil.getMinutes() + 15);
        break;
      case "1hour":
        muteUntil.setHours(muteUntil.getHours() + 1);
        break;
      case "8hours":
        muteUntil.setHours(muteUntil.getHours() + 8);
        break;
      case "24hours":
        muteUntil.setHours(muteUntil.getHours() + 24);
        break;
      case "forever":
        muteUntil.setFullYear(muteUntil.getFullYear() + 10);
        break;
      default:
        return;
    }
    handleSettingChange("muteUntil", muteUntil.toISOString());
    handleSettingChange("enabled", false);
  };

  const handleUnmute = () => {
    handleSettingChange("muteUntil", null);
    handleSettingChange("enabled", true);
  };

  const isMuted = !settings.enabled || !!settings.muteUntil;
  const hasChanges =
    JSON.stringify(settings) !== JSON.stringify(currentSettings);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Main Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {isMuted ? (
                  <BellOff className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Bell className="h-5 w-5" />
                )}
                Notifications
              </CardTitle>
              <CardDescription>
                {isMuted
                  ? "Notifications are muted for this channel"
                  : "Get notified about activity in this channel"}
              </CardDescription>
            </div>
            <Switch
              checked={settings.enabled && !settings.muteUntil}
              onCheckedChange={(enabled) => {
                if (enabled) {
                  handleUnmute();
                } else {
                  handleSettingChange("enabled", false);
                }
              }}
            />
          </div>
        </CardHeader>

        {isMuted && settings.muteUntil && (
          <CardContent>
            <div className="flex items-center justify-between rounded-lg bg-muted p-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  Muted until {new Date(settings.muteUntil).toLocaleString()}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleUnmute}>
                Unmute
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Quick Mute */}
      {!isMuted && (
        <Card>
          <CardHeader>
            <CardTitle>Mute For...</CardTitle>
            <CardDescription>Temporarily silence notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMuteFor("15min")}
              >
                15 minutes
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMuteFor("1hour")}
              >
                1 hour
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMuteFor("8hours")}
              >
                8 hours
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMuteFor("24hours")}
              >
                24 hours
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMuteFor("forever")}
                className="col-span-2"
              >
                Until I turn it back on
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notification Type */}
      {!isMuted && (
        <Card>
          <CardHeader>
            <CardTitle>Notify me about...</CardTitle>
            <CardDescription>
              Choose what triggers a notification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={settings.notifyOn}
              onValueChange={(value) =>
                handleSettingChange(
                  "notifyOn",
                  value as NotificationPreferences["notifyOn"],
                )
              }
            >
              <div className="flex items-center space-x-2 rounded-lg p-3 hover:bg-accent">
                <RadioGroupItem value="all" id="notify-all" />
                <Label htmlFor="notify-all" className="flex-1 cursor-pointer">
                  <div className="font-medium">All new messages</div>
                  <p className="text-xs text-muted-foreground">
                    Every message posted in this channel
                  </p>
                </Label>
              </div>
              <div className="flex items-center space-x-2 rounded-lg p-3 hover:bg-accent">
                <RadioGroupItem value="mentions" id="notify-mentions" />
                <Label
                  htmlFor="notify-mentions"
                  className="flex-1 cursor-pointer"
                >
                  <div className="font-medium">Only @mentions</div>
                  <p className="text-xs text-muted-foreground">
                    When someone mentions you or @channel
                  </p>
                </Label>
              </div>
              <div className="flex items-center space-x-2 rounded-lg p-3 hover:bg-accent">
                <RadioGroupItem value="nothing" id="notify-nothing" />
                <Label
                  htmlFor="notify-nothing"
                  className="flex-1 cursor-pointer"
                >
                  <div className="font-medium">Nothing</div>
                  <p className="text-xs text-muted-foreground">
                    No notifications from this channel
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Notification Methods */}
      {!isMuted && settings.notifyOn !== "nothing" && (
        <Card>
          <CardHeader>
            <CardTitle>Notification Methods</CardTitle>
            <CardDescription>How you want to be notified</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sound */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {settings.sound ? (
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <Label>Sound</Label>
                  <p className="text-xs text-muted-foreground">
                    Play a sound when you receive a notification
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.sound}
                onCheckedChange={(checked) =>
                  handleSettingChange("sound", checked)
                }
              />
            </div>

            {/* Desktop */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Monitor className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label>Desktop notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Show desktop notifications on your computer
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.desktop}
                onCheckedChange={(checked) =>
                  handleSettingChange("desktop", checked)
                }
              />
            </div>

            {/* Mobile */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label>Mobile push notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Send notifications to your mobile device
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.mobile}
                onCheckedChange={(checked) =>
                  handleSettingChange("mobile", checked)
                }
              />
            </div>

            {/* Email */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label>Email notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Receive email for important messages
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.email}
                onCheckedChange={(checked) =>
                  handleSettingChange("email", checked)
                }
              />
            </div>

            {/* Email Digest */}
            {settings.email && (
              <div className="flex items-center justify-between pl-7 pt-2">
                <Label>Email frequency</Label>
                <Select
                  value={settings.emailDigest}
                  onValueChange={(value) =>
                    handleSettingChange(
                      "emailDigest",
                      value as NotificationPreferences["emailDigest"],
                    )
                  }
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instant">Instant</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Preferences
          </Button>
        </div>
      )}
    </div>
  );
}

ChannelNotificationSettings.displayName = "ChannelNotificationSettings";
