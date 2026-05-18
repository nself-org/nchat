"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  type NotificationPreferences,
} from "@/stores/notification-store";
import { useNotifications } from "@/hooks/use-notifications";

// Days of the week for DND schedule
const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

// Email digest frequency options
const EMAIL_FREQUENCIES = [
  { value: "instant", label: "Instant" },
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily digest" },
  { value: "weekly", label: "Weekly digest" },
  { value: "never", label: "Never" },
];

export interface NotificationPreferencesProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Callback when preferences are saved
   */
  onSave?: () => void;

  /**
   * Whether to show the save button
   * @default true
   */
  showSaveButton?: boolean;

  /**
   * Whether changes are auto-saved (updates applied immediately without save button)
   * @default true
   */
  saveOnChange?: boolean;
}

/**
 * NotificationPreferences - Settings page for notification configuration
 *
 * Allows users to configure:
 * - Desktop notifications
 * - Sound notifications
 * - Email notifications
 * - Do Not Disturb schedule
 * - Per-type notification settings
 */
export function NotificationPreferences({
  onSave,
  showSaveButton = true,
  saveOnChange = true,
  className,
  ...props
}: NotificationPreferencesProps) {
  const preferences = useNotificationStore((state) => state.preferences);
  const updatePreferences = useNotificationStore(
    (state) => state.updatePreferences,
  );
  const { requestDesktopPermission, desktopPermission } = useNotifications();

  const [localPreferences, setLocalPreferences] =
    React.useState<NotificationPreferences>(preferences);
  const [hasChanges, setHasChanges] = React.useState(false);

  // Sync local state with store
  React.useEffect(() => {
    setLocalPreferences(preferences);
  }, [preferences]);

  // Update handler
  const handleUpdate = React.useCallback(
    <K extends keyof NotificationPreferences>(
      key: K,
      value: NotificationPreferences[K],
    ) => {
      const updated = { ...localPreferences, [key]: value };
      setLocalPreferences(updated);
      setHasChanges(true);

      if (saveOnChange) {
        updatePreferences({ [key]: value });
      }
    },
    [localPreferences, saveOnChange, updatePreferences],
  );

  // DND schedule handler
  const handleDndUpdate = React.useCallback(
    <K extends keyof NotificationPreferences["dndSchedule"]>(
      key: K,
      value: NotificationPreferences["dndSchedule"][K],
    ) => {
      const updated = {
        ...localPreferences,
        dndSchedule: { ...localPreferences.dndSchedule, [key]: value },
      };
      setLocalPreferences(updated);
      setHasChanges(true);

      if (saveOnChange) {
        updatePreferences({ dndSchedule: updated.dndSchedule });
      }
    },
    [localPreferences, saveOnChange, updatePreferences],
  );

  // Toggle DND day
  const toggleDndDay = React.useCallback(
    (day: number) => {
      const currentDays = localPreferences.dndSchedule.days;
      const newDays = currentDays.includes(day)
        ? currentDays.filter((d) => d !== day)
        : [...currentDays, day].sort((a, b) => a - b);

      handleDndUpdate("days", newDays);
    },
    [localPreferences.dndSchedule.days, handleDndUpdate],
  );

  // Save handler
  const handleSave = React.useCallback(() => {
    updatePreferences(localPreferences);
    setHasChanges(false);
    onSave?.();
  }, [localPreferences, updatePreferences, onSave]);

  // Request desktop permission
  const handleRequestPermission = React.useCallback(async () => {
    const permission = await requestDesktopPermission();
    if (permission === "granted") {
      handleUpdate("desktopEnabled", true);
    }
  }, [requestDesktopPermission, handleUpdate]);

  return (
    <div className={cn("space-y-6", className)} {...props}>
      {/* Desktop Notifications */}
      <Card className="p-4">
        <h3 className="mb-4 text-sm font-medium">Desktop Notifications</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="desktop-enabled">
                Enable desktop notifications
              </Label>
              <p className="text-xs text-muted-foreground">
                Show notifications on your desktop
              </p>
            </div>
            <div className="flex items-center gap-2">
              {desktopPermission !== "granted" &&
                localPreferences.desktopEnabled && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRequestPermission}
                  >
                    Grant Permission
                  </Button>
                )}
              <Switch
                id="desktop-enabled"
                checked={localPreferences.desktopEnabled}
                onCheckedChange={(checked) =>
                  handleUpdate("desktopEnabled", checked)
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-preview">Show message preview</Label>
              <p className="text-xs text-muted-foreground">
                Display message content in notifications
              </p>
            </div>
            <Switch
              id="show-preview"
              checked={localPreferences.showPreview}
              onCheckedChange={(checked) =>
                handleUpdate("showPreview", checked)
              }
              disabled={!localPreferences.desktopEnabled}
            />
          </div>
        </div>
      </Card>

      {/* Sound Notifications */}
      <Card className="p-4">
        <h3 className="mb-4 text-sm font-medium">Sound Notifications</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sound-enabled">Enable sound</Label>
              <p className="text-xs text-muted-foreground">
                Play a sound for new notifications
              </p>
            </div>
            <Switch
              id="sound-enabled"
              checked={localPreferences.soundEnabled}
              onCheckedChange={(checked) =>
                handleUpdate("soundEnabled", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="volume">Volume</Label>
              <p className="text-xs text-muted-foreground">
                Notification sound volume: {localPreferences.soundVolume}%
              </p>
            </div>
            <input
              type="range"
              id="volume"
              min="0"
              max="100"
              value={localPreferences.soundVolume}
              onChange={(e) =>
                handleUpdate("soundVolume", parseInt(e.target.value, 10))
              }
              className="w-32"
              disabled={!localPreferences.soundEnabled}
            />
          </div>
        </div>
      </Card>

      {/* Email Notifications */}
      <Card className="p-4">
        <h3 className="mb-4 text-sm font-medium">Email Notifications</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-enabled">Enable email notifications</Label>
              <p className="text-xs text-muted-foreground">
                Receive notifications via email
              </p>
            </div>
            <Switch
              id="email-enabled"
              checked={localPreferences.emailEnabled}
              onCheckedChange={(checked) =>
                handleUpdate("emailEnabled", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-frequency">Email frequency</Label>
              <p className="text-xs text-muted-foreground">
                How often to send email digests
              </p>
            </div>
            <Select
              value={localPreferences.emailDigestFrequency}
              onValueChange={(value) =>
                handleUpdate(
                  "emailDigestFrequency",
                  value as NotificationPreferences["emailDigestFrequency"],
                )
              }
              disabled={!localPreferences.emailEnabled}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMAIL_FREQUENCIES.map((freq) => (
                  <SelectItem key={freq.value} value={freq.value}>
                    {freq.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Notification Types */}
      <Card className="p-4">
        <h3 className="mb-4 text-sm font-medium">Notification Types</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="mentions-enabled">Mentions</Label>
              <p className="text-xs text-muted-foreground">
                When someone @mentions you
              </p>
            </div>
            <Switch
              id="mentions-enabled"
              checked={localPreferences.mentionsEnabled}
              onCheckedChange={(checked) =>
                handleUpdate("mentionsEnabled", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="dm-enabled">Direct messages</Label>
              <p className="text-xs text-muted-foreground">
                When someone sends you a direct message
              </p>
            </div>
            <Switch
              id="dm-enabled"
              checked={localPreferences.directMessagesEnabled}
              onCheckedChange={(checked) =>
                handleUpdate("directMessagesEnabled", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="threads-enabled">Thread replies</Label>
              <p className="text-xs text-muted-foreground">
                When someone replies to a thread you're in
              </p>
            </div>
            <Switch
              id="threads-enabled"
              checked={localPreferences.threadRepliesEnabled}
              onCheckedChange={(checked) =>
                handleUpdate("threadRepliesEnabled", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="reactions-enabled">Reactions</Label>
              <p className="text-xs text-muted-foreground">
                When someone reacts to your message
              </p>
            </div>
            <Switch
              id="reactions-enabled"
              checked={localPreferences.reactionsEnabled}
              onCheckedChange={(checked) =>
                handleUpdate("reactionsEnabled", checked)
              }
            />
          </div>
        </div>
      </Card>

      {/* Do Not Disturb */}
      <Card className="p-4">
        <h3 className="mb-4 text-sm font-medium">Do Not Disturb</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="dnd-enabled">Enable scheduled DND</Label>
              <p className="text-xs text-muted-foreground">
                Automatically mute notifications during set hours
              </p>
            </div>
            <Switch
              id="dnd-enabled"
              checked={localPreferences.dndSchedule.enabled}
              onCheckedChange={(checked) => handleDndUpdate("enabled", checked)}
            />
          </div>

          {localPreferences.dndSchedule.enabled && (
            <>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label
                    htmlFor="dnd-start"
                    className="text-xs text-muted-foreground"
                  >
                    Start time
                  </Label>
                  <input
                    type="time"
                    id="dnd-start"
                    value={localPreferences.dndSchedule.startTime}
                    onChange={(e) =>
                      handleDndUpdate("startTime", e.target.value)
                    }
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <Label
                    htmlFor="dnd-end"
                    className="text-xs text-muted-foreground"
                  >
                    End time
                  </Label>
                  <input
                    type="time"
                    id="dnd-end"
                    value={localPreferences.dndSchedule.endTime}
                    onChange={(e) => handleDndUpdate("endTime", e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <Label className="mb-2 block text-xs text-muted-foreground">
                  Active days
                </Label>
                <div className="flex gap-1">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDndDay(day.value)}
                      className={cn(
                        "rounded-md border px-2 py-1 text-xs transition-colors",
                        localPreferences.dndSchedule.days.includes(day.value)
                          ? "text-primary-foreground border-primary bg-primary"
                          : "border-input bg-background hover:bg-accent",
                      )}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Save Button */}
      {showSaveButton && !saveOnChange && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!hasChanges}>
            Save Preferences
          </Button>
        </div>
      )}
    </div>
  );
}

NotificationPreferences.displayName = "NotificationPreferences";

export default NotificationPreferences;
