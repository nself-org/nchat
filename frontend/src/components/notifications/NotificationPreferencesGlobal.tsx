"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useNotificationSettingsStore } from "@/stores/notification-settings-store";
import { useNotifications } from "@/hooks/use-notifications";

export interface NotificationPreferencesGlobalProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether to show in compact mode */
  compact?: boolean;
}

/**
 * NotificationPreferencesGlobal - Global notification preferences
 */
export function NotificationPreferencesGlobal({
  compact = false,
  className,
  ...props
}: NotificationPreferencesGlobalProps) {
  const preferences = useNotificationSettingsStore(
    (state) => state.preferences,
  );
  const setGlobalEnabled = useNotificationSettingsStore(
    (state) => state.setGlobalEnabled,
  );
  const setDesktopEnabled = useNotificationSettingsStore(
    (state) => state.setDesktopEnabled,
  );
  const setPushEnabled = useNotificationSettingsStore(
    (state) => state.setPushEnabled,
  );
  const setEmailEnabled = useNotificationSettingsStore(
    (state) => state.setEmailEnabled,
  );
  const setSoundEnabled = useNotificationSettingsStore(
    (state) => state.setSoundEnabled,
  );
  const setShowSenderName = useNotificationSettingsStore(
    (state) => state.setShowSenderName,
  );
  const setShowMessagePreview = useNotificationSettingsStore(
    (state) => state.setShowMessagePreview,
  );

  const { requestDesktopPermission, desktopPermission } = useNotifications();

  // Handle desktop permission request
  const handleRequestPermission = async () => {
    const permission = await requestDesktopPermission();
    if (permission === "granted") {
      setDesktopEnabled(true);
    }
  };

  if (compact) {
    return (
      <div className={cn("space-y-3", className)} {...props}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Enable all notifications</span>
          <Switch
            checked={preferences.globalEnabled}
            onCheckedChange={setGlobalEnabled}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)} {...props}>
      {/* Master Toggle */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="global-enabled" className="text-base font-medium">
              Enable Notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Turn all notifications on or off
            </p>
          </div>
          <Switch
            id="global-enabled"
            checked={preferences.globalEnabled}
            onCheckedChange={setGlobalEnabled}
          />
        </div>
      </Card>

      {/* Delivery Methods */}
      <Card
        className={cn(
          "p-4",
          !preferences.globalEnabled && "pointer-events-none opacity-50",
        )}
      >
        <h3 className="mb-4 text-sm font-medium">Delivery Methods</h3>
        <div className="space-y-4">
          {/* Desktop */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="desktop-enabled">Desktop notifications</Label>
              <p className="text-xs text-muted-foreground">
                Show notifications on your desktop
              </p>
            </div>
            <div className="flex items-center gap-2">
              {desktopPermission !== "granted" &&
                preferences.desktop.enabled && (
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
                checked={preferences.desktop.enabled}
                onCheckedChange={setDesktopEnabled}
              />
            </div>
          </div>

          {/* Push */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-enabled">Mobile push notifications</Label>
              <p className="text-xs text-muted-foreground">
                Receive notifications on your mobile device
              </p>
            </div>
            <Switch
              id="push-enabled"
              checked={preferences.push.enabled}
              onCheckedChange={setPushEnabled}
            />
          </div>

          {/* Email */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-enabled">Email notifications</Label>
              <p className="text-xs text-muted-foreground">
                Receive notifications via email
              </p>
            </div>
            <Switch
              id="email-enabled"
              checked={preferences.email.enabled}
              onCheckedChange={setEmailEnabled}
            />
          </div>

          {/* Sound */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sound-enabled">Notification sounds</Label>
              <p className="text-xs text-muted-foreground">
                Play a sound for new notifications
              </p>
            </div>
            <Switch
              id="sound-enabled"
              checked={preferences.sound.enabled}
              onCheckedChange={setSoundEnabled}
            />
          </div>
        </div>
      </Card>

      {/* Display Options */}
      <Card
        className={cn(
          "p-4",
          !preferences.globalEnabled && "pointer-events-none opacity-50",
        )}
      >
        <h3 className="mb-4 text-sm font-medium">Display Options</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-sender">Show sender name</Label>
              <p className="text-xs text-muted-foreground">
                Display who sent the message
              </p>
            </div>
            <Switch
              id="show-sender"
              checked={preferences.showSenderName}
              onCheckedChange={setShowSenderName}
            />
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
              checked={preferences.showMessagePreview}
              onCheckedChange={setShowMessagePreview}
            />
          </div>
        </div>
      </Card>

      {/* Notification Types */}
      <Card
        className={cn(
          "p-4",
          !preferences.globalEnabled && "pointer-events-none opacity-50",
        )}
      >
        <h3 className="mb-4 text-sm font-medium">Notification Types</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Mentions</Label>
              <p className="text-xs text-muted-foreground">
                When someone @mentions you
              </p>
            </div>
            <Switch
              checked={preferences.mentions.enabled}
              onCheckedChange={(checked) =>
                useNotificationSettingsStore
                  .getState()
                  .setMentionsEnabled(checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Direct messages</Label>
              <p className="text-xs text-muted-foreground">
                When you receive a DM
              </p>
            </div>
            <Switch
              checked={preferences.directMessages.enabled}
              onCheckedChange={(checked) =>
                useNotificationSettingsStore.getState().setDMEnabled(checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Thread replies</Label>
              <p className="text-xs text-muted-foreground">
                When someone replies in a thread you're in
              </p>
            </div>
            <Switch
              checked={preferences.threadReplies}
              onCheckedChange={(checked) =>
                useNotificationSettingsStore
                  .getState()
                  .setThreadReplies(checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Reactions</Label>
              <p className="text-xs text-muted-foreground">
                When someone reacts to your message
              </p>
            </div>
            <Switch
              checked={preferences.reactions}
              onCheckedChange={(checked) =>
                useNotificationSettingsStore.getState().setReactions(checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Channel invites</Label>
              <p className="text-xs text-muted-foreground">
                When you're invited to a channel
              </p>
            </div>
            <Switch
              checked={preferences.channelInvites}
              onCheckedChange={(checked) =>
                useNotificationSettingsStore
                  .getState()
                  .setChannelInvites(checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Announcements</Label>
              <p className="text-xs text-muted-foreground">
                Important system announcements
              </p>
            </div>
            <Switch
              checked={preferences.announcements}
              onCheckedChange={(checked) =>
                useNotificationSettingsStore
                  .getState()
                  .setAnnouncements(checked)
              }
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

NotificationPreferencesGlobal.displayName = "NotificationPreferencesGlobal";

export default NotificationPreferencesGlobal;
