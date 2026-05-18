"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useNotificationSettingsStore } from "@/stores/notification-settings-store";

export interface DMNotificationSettingsPanelProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * DMNotificationSettingsPanel - Direct message notification settings
 */
export function DMNotificationSettingsPanel({
  className,
  ...props
}: DMNotificationSettingsPanelProps) {
  const dmSettings = useNotificationSettingsStore(
    (state) => state.preferences.directMessages,
  );
  const updateDMSettings = useNotificationSettingsStore(
    (state) => state.updateDMSettings,
  );

  return (
    <div className={cn("space-y-6", className)} {...props}>
      {/* Master Toggle */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="dm-enabled" className="text-base font-medium">
              Direct Message Notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Get notified when someone sends you a direct message
            </p>
          </div>
          <Switch
            id="dm-enabled"
            checked={dmSettings.enabled}
            onCheckedChange={(enabled) => updateDMSettings({ enabled })}
          />
        </div>
      </Card>

      {/* Delivery Options */}
      <Card
        className={cn(
          "p-4",
          !dmSettings.enabled && "pointer-events-none opacity-50",
        )}
      >
        <h3 className="mb-4 text-sm font-medium">Delivery Methods</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="dm-desktop">Desktop notifications</Label>
              <p className="text-xs text-muted-foreground">
                Show desktop notification for new DMs
              </p>
            </div>
            <Switch
              id="dm-desktop"
              checked={dmSettings.desktop}
              onCheckedChange={(desktop) => updateDMSettings({ desktop })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="dm-mobile">Mobile push notifications</Label>
              <p className="text-xs text-muted-foreground">
                Send push notification to mobile
              </p>
            </div>
            <Switch
              id="dm-mobile"
              checked={dmSettings.mobile}
              onCheckedChange={(mobile) => updateDMSettings({ mobile })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="dm-email">Email notifications</Label>
              <p className="text-xs text-muted-foreground">
                Send email for unread DMs
              </p>
            </div>
            <Switch
              id="dm-email"
              checked={dmSettings.email}
              onCheckedChange={(email) => updateDMSettings({ email })}
            />
          </div>
        </div>
      </Card>

      {/* Display Options */}
      <Card
        className={cn(
          "p-4",
          !dmSettings.enabled && "pointer-events-none opacity-50",
        )}
      >
        <h3 className="mb-4 text-sm font-medium">Display Options</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="dm-preview">Show message preview</Label>
              <p className="text-xs text-muted-foreground">
                Display message content in notification
              </p>
            </div>
            <Switch
              id="dm-preview"
              checked={dmSettings.showPreview}
              onCheckedChange={(showPreview) =>
                updateDMSettings({ showPreview })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="dm-sound">Play sound</Label>
              <p className="text-xs text-muted-foreground">
                Play a sound when receiving DMs
              </p>
            </div>
            <Switch
              id="dm-sound"
              checked={dmSettings.playSound}
              onCheckedChange={(playSound) => updateDMSettings({ playSound })}
            />
          </div>
        </div>
      </Card>

      {/* Quiet Hours Override */}
      <Card
        className={cn(
          "p-4",
          !dmSettings.enabled && "pointer-events-none opacity-50",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="dm-quiet-hours" className="font-medium">
              Allow during quiet hours
            </Label>
            <p className="text-sm text-muted-foreground">
              Receive DM notifications even when quiet hours are active
            </p>
          </div>
          <Switch
            id="dm-quiet-hours"
            checked={dmSettings.allowDuringQuietHours}
            onCheckedChange={(allowDuringQuietHours) =>
              updateDMSettings({ allowDuringQuietHours })
            }
          />
        </div>
      </Card>

      {/* Muted Conversations */}
      {dmSettings.mutedConversations.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-medium">Muted Conversations</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            You have {dmSettings.mutedConversations.length} muted
            conversation(s)
          </p>
          <p className="text-xs text-muted-foreground">
            Manage muted conversations from within each DM
          </p>
        </Card>
      )}
    </div>
  );
}

DMNotificationSettingsPanel.displayName = "DMNotificationSettingsPanel";

export default DMNotificationSettingsPanel;
