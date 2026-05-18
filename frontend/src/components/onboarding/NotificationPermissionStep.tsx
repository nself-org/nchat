"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, BellRing, Check, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type {
  OnboardingStepProps,
  NotificationPermissionStatus,
  NotificationSettings,
} from "@/lib/onboarding/onboarding-types";

import { defaultNotificationSettings } from "@/lib/onboarding/onboarding-steps";

import { logger } from "@/lib/logger";

interface NotificationPermissionStepProps extends OnboardingStepProps {
  initialSettings?: Partial<NotificationSettings>;
  onSettingsChange?: (settings: NotificationSettings) => void;
}

export function NotificationPermissionStep({
  onNext,
  onPrev,
  onSkip,
  isFirst,
  canSkip,
  initialSettings,
  onSettingsChange,
}: NotificationPermissionStepProps) {
  const [permissionStatus, setPermissionStatus] =
    useState<NotificationPermissionStatus>("default");
  const [isRequesting, setIsRequesting] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    ...defaultNotificationSettings,
    ...initialSettings,
  });

  useEffect(() => {
    // Check current permission status
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermissionStatus(
        Notification.permission as NotificationPermissionStatus,
      );
    }
  }, []);

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      return;
    }

    setIsRequesting(true);

    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission as NotificationPermissionStatus);

      if (permission === "granted") {
        // Show a test notification
        new Notification("Notifications enabled!", {
          body: "You'll now receive notifications from nchat",
          icon: "/favicon.ico",
        });

        const newSettings = { ...settings, desktopNotifications: true };
        setSettings(newSettings);
        onSettingsChange?.(newSettings);
      }
    } catch (error) {
      logger.error("Error requesting notification permission:", error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSettingChange = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K],
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const getStatusDisplay = () => {
    switch (permissionStatus) {
      case "granted":
        return {
          icon: <BellRing className="h-8 w-8 text-green-500" />,
          title: "Notifications Enabled",
          description:
            "You'll receive notifications for messages and mentions.",
          color: "text-green-500",
        };
      case "denied":
        return {
          icon: <BellOff className="h-8 w-8 text-red-500" />,
          title: "Notifications Blocked",
          description:
            "You've blocked notifications. Enable them in your browser settings to receive alerts.",
          color: "text-red-500",
        };
      default:
        return {
          icon: <Bell className="h-8 w-8 text-primary" />,
          title: "Enable Notifications",
          description:
            "Stay in the loop with desktop notifications for messages, mentions, and updates.",
          color: "text-primary",
        };
    }
  };

  const status = getStatusDisplay();

  return (
    <div className="flex flex-col px-4 py-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="from-primary/20 to-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br">
          <Bell className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
          Stay in the Loop
        </h2>
        <p className="mx-auto max-w-md text-zinc-600 dark:text-zinc-400">
          Enable notifications so you never miss important messages from your
          team.
        </p>
      </div>

      {/* Permission Status */}
      <div className="mx-auto mb-8 w-full max-w-md">
        <div
          className={cn(
            "rounded-xl border-2 p-6 text-center",
            permissionStatus === "granted"
              ? "border-green-500/30 bg-green-500/5"
              : permissionStatus === "denied"
                ? "border-red-500/30 bg-red-500/5"
                : "border-zinc-200 dark:border-zinc-700",
          )}
        >
          <div className="mb-4 flex justify-center">{status.icon}</div>
          <h3 className={cn("mb-2 text-lg font-semibold", status.color)}>
            {status.title}
          </h3>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            {status.description}
          </p>

          {permissionStatus === "default" && (
            <Button
              onClick={requestPermission}
              disabled={isRequesting}
              className="w-full"
            >
              {isRequesting ? (
                <>
                  <span className="animate-pulse">Requesting...</span>
                </>
              ) : (
                <>
                  <Bell className="mr-2 h-4 w-4" />
                  Enable Notifications
                </>
              )}
            </Button>
          )}

          {permissionStatus === "granted" && (
            <div className="flex items-center justify-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              <span className="font-medium">All set!</span>
            </div>
          )}

          {permissionStatus === "denied" && (
            <p className="mt-2 text-xs text-zinc-500">
              To enable notifications, click the lock icon in your browser's
              address bar and allow notifications for this site.
            </p>
          )}
        </div>
      </div>

      {/* Notification Settings */}
      {permissionStatus === "granted" && (
        <div className="mx-auto w-full max-w-md space-y-6">
          <h3 className="font-semibold text-zinc-900 dark:text-white">
            Customize Notifications
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Sound</Label>
                <p className="text-sm text-zinc-500">
                  Play a sound with notifications
                </p>
              </div>
              <Switch
                checked={settings.soundEnabled}
                onCheckedChange={(checked) =>
                  handleSettingChange("soundEnabled", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Direct Messages</Label>
                <p className="text-sm text-zinc-500">
                  Notify for all direct messages
                </p>
              </div>
              <Switch
                checked={settings.dmNotifications}
                onCheckedChange={(checked) =>
                  handleSettingChange("dmNotifications", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Channel Messages</Label>
                <p className="text-sm text-zinc-500">
                  Notify for channel activity
                </p>
              </div>
              <Switch
                checked={settings.channelNotifications}
                onCheckedChange={(checked) =>
                  handleSettingChange("channelNotifications", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Mentions Only</Label>
                <p className="text-sm text-zinc-500">
                  Only notify when you're @mentioned
                </p>
              </div>
              <Switch
                checked={settings.mentionsOnly}
                onCheckedChange={(checked) =>
                  handleSettingChange("mentionsOnly", checked)
                }
              />
            </div>

            {/* Mute Schedule */}
            <div className="border-t border-zinc-200 pt-4 dark:border-zinc-700">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-zinc-500" />
                  <div>
                    <Label className="font-medium">Mute Schedule</Label>
                    <p className="text-sm text-zinc-500">
                      Pause notifications during certain hours
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.muteSchedule?.enabled ?? false}
                  onCheckedChange={(checked) =>
                    handleSettingChange("muteSchedule", {
                      ...settings.muteSchedule,
                      enabled: checked,
                      startTime: settings.muteSchedule?.startTime ?? "22:00",
                      endTime: settings.muteSchedule?.endTime ?? "08:00",
                    })
                  }
                />
              </div>

              {settings.muteSchedule?.enabled && (
                <div className="mt-3 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <span>From</span>
                  <input
                    type="time"
                    value={settings.muteSchedule.startTime}
                    onChange={(e) =>
                      handleSettingChange("muteSchedule", {
                        ...settings.muteSchedule!,
                        startTime: e.target.value,
                      })
                    }
                    className="rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-600 dark:bg-zinc-800"
                  />
                  <span>to</span>
                  <input
                    type="time"
                    value={settings.muteSchedule.endTime}
                    onChange={(e) =>
                      handleSettingChange("muteSchedule", {
                        ...settings.muteSchedule!,
                        endTime: e.target.value,
                      })
                    }
                    className="rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-600 dark:bg-zinc-800"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between border-t border-zinc-200 pt-6 dark:border-zinc-700">
        <div>
          {!isFirst && (
            <Button variant="ghost" onClick={onPrev}>
              Back
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {canSkip && onSkip && (
            <Button variant="ghost" onClick={onSkip}>
              Skip for now
            </Button>
          )}
          <Button onClick={onNext}>Continue</Button>
        </div>
      </div>
    </div>
  );
}
