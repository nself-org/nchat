"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotificationSettingsStore } from "@/stores/notification-settings-store";
import {
  isPushAvailable,
  getPushSubscription,
} from "@/lib/notifications/notification-channels";

export interface PushNotificationSettingsPanelProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * PushNotificationSettingsPanel - Push notification settings
 */
export function PushNotificationSettingsPanel({
  className,
  ...props
}: PushNotificationSettingsPanelProps) {
  const pushSettings = useNotificationSettingsStore(
    (state) => state.preferences.push,
  );
  const updatePushSettings = useNotificationSettingsStore(
    (state) => state.updatePushSettings,
  );

  const [isAvailable, setIsAvailable] = React.useState(false);
  const [hasSubscription, setHasSubscription] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  // Check push availability
  React.useEffect(() => {
    const checkPush = async () => {
      setIsAvailable(isPushAvailable());
      const subscription = await getPushSubscription();
      setHasSubscription(!!subscription);
      setLoading(false);
    };
    checkPush();
  }, []);

  if (loading) {
    return (
      <Card className={cn("p-4", className)} {...props}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-1/3 rounded bg-muted" />
          <div className="h-10 rounded bg-muted" />
        </div>
      </Card>
    );
  }

  if (!isAvailable) {
    return (
      <Card className={cn("p-4", className)} {...props}>
        <div className="py-6 text-center">
          <svg
            className="mx-auto mb-3 h-12 w-12 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
          <p className="font-medium">Push notifications not available</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your browser doesn't support push notifications or they're blocked.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)} {...props}>
      {/* Registration Status */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-3 w-3 rounded-full",
                hasSubscription ? "bg-green-500" : "bg-muted",
              )}
            />
            <div>
              <p className="font-medium">
                {hasSubscription
                  ? "Device registered"
                  : "Device not registered"}
              </p>
              <p className="text-sm text-muted-foreground">
                {hasSubscription
                  ? "This device will receive push notifications"
                  : "Register this device to receive push notifications"}
              </p>
            </div>
          </div>
          {!hasSubscription && (
            <Button variant="outline" size="sm">
              Register Device
            </Button>
          )}
        </div>
      </Card>

      {/* Push Settings */}
      <Card
        className={cn(
          "p-4",
          !hasSubscription && "pointer-events-none opacity-50",
        )}
      >
        <h3 className="mb-4 text-sm font-medium">Push Options</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-preview">Show message preview</Label>
              <p className="text-xs text-muted-foreground">
                Display message content in push notifications
              </p>
            </div>
            <Switch
              id="push-preview"
              checked={pushSettings.showPreview}
              onCheckedChange={(showPreview) =>
                updatePushSettings({ showPreview })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-sound">Play sound</Label>
              <p className="text-xs text-muted-foreground">
                Play a sound with push notifications
              </p>
            </div>
            <Switch
              id="push-sound"
              checked={pushSettings.playSound}
              onCheckedChange={(playSound) => updatePushSettings({ playSound })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-vibrate">Vibrate</Label>
              <p className="text-xs text-muted-foreground">
                Vibrate device for notifications
              </p>
            </div>
            <Switch
              id="push-vibrate"
              checked={pushSettings.vibrate}
              onCheckedChange={(vibrate) => updatePushSettings({ vibrate })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-group">Group notifications</Label>
              <p className="text-xs text-muted-foreground">
                Combine multiple notifications
              </p>
            </div>
            <Switch
              id="push-group"
              checked={pushSettings.groupNotifications}
              onCheckedChange={(groupNotifications) =>
                updatePushSettings({ groupNotifications })
              }
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

PushNotificationSettingsPanel.displayName = "PushNotificationSettingsPanel";

export default PushNotificationSettingsPanel;
