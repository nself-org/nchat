"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useNotificationSettingsStore } from "@/stores/notification-settings-store";
import {
  isDesktopAvailable,
  getDesktopPermission,
  requestDesktopPermission,
} from "@/lib/notifications/notification-channels";

export interface DesktopNotificationSettingsPanelProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * DesktopNotificationSettingsPanel - Desktop browser notification settings
 */
export function DesktopNotificationSettingsPanel({
  className,
  ...props
}: DesktopNotificationSettingsPanelProps) {
  const desktopSettings = useNotificationSettingsStore(
    (state) => state.preferences.desktop,
  );
  const setDesktopEnabled = useNotificationSettingsStore(
    (state) => state.setDesktopEnabled,
  );
  const setDesktopPermission = useNotificationSettingsStore(
    (state) => state.setDesktopPermission,
  );
  const updateDesktopSettings = useNotificationSettingsStore(
    (state) => state.updateDesktopSettings,
  );

  const [isAvailable, setIsAvailable] = React.useState(false);
  const [permission, setPermission] = React.useState<
    NotificationPermission | "unavailable"
  >("default");

  React.useEffect(() => {
    setIsAvailable(isDesktopAvailable());
    setPermission(getDesktopPermission());
  }, []);

  const handleRequestPermission = async () => {
    const result = await requestDesktopPermission();
    setPermission(result);
    setDesktopPermission(result);
    if (result === "granted") {
      setDesktopEnabled(true);
    }
  };

  if (!isAvailable) {
    return (
      <Card className={cn("p-4", className)} {...props}>
        <div className="py-6 text-center text-muted-foreground">
          <p>Desktop notifications are not available in this browser.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)} {...props}>
      {/* Permission Status */}
      {permission !== "granted" && (
        <Card className="border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Permission Required
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {permission === "denied"
                  ? "Desktop notifications are blocked. Please enable them in browser settings."
                  : "Allow desktop notifications to receive alerts."}
              </p>
            </div>
            {permission !== "denied" && (
              <Button onClick={handleRequestPermission}>Enable</Button>
            )}
          </div>
        </Card>
      )}

      {/* Master Toggle */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="desktop-enabled" className="text-base font-medium">
              Desktop Notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Show notifications on your desktop
            </p>
          </div>
          <Switch
            id="desktop-enabled"
            checked={desktopSettings.enabled}
            onCheckedChange={setDesktopEnabled}
            disabled={permission !== "granted"}
          />
        </div>
      </Card>

      {/* Display Options */}
      <Card
        className={cn(
          "p-4",
          (!desktopSettings.enabled || permission !== "granted") &&
            "pointer-events-none opacity-50",
        )}
      >
        <h3 className="mb-4 text-sm font-medium">Display Options</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="desktop-preview">Show message preview</Label>
              <p className="text-xs text-muted-foreground">
                Display message content
              </p>
            </div>
            <Switch
              id="desktop-preview"
              checked={desktopSettings.showPreview}
              onCheckedChange={(showPreview) =>
                updateDesktopSettings({ showPreview })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="desktop-avatar">Show sender avatar</Label>
              <p className="text-xs text-muted-foreground">
                Display sender's profile picture
              </p>
            </div>
            <Switch
              id="desktop-avatar"
              checked={desktopSettings.showAvatar}
              onCheckedChange={(showAvatar) =>
                updateDesktopSettings({ showAvatar })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="desktop-sound">Play sound</Label>
              <p className="text-xs text-muted-foreground">
                Play a sound with notifications
              </p>
            </div>
            <Switch
              id="desktop-sound"
              checked={desktopSettings.playSound}
              onCheckedChange={(playSound) =>
                updateDesktopSettings({ playSound })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="desktop-interaction">Require interaction</Label>
              <p className="text-xs text-muted-foreground">
                Keep notification until clicked
              </p>
            </div>
            <Switch
              id="desktop-interaction"
              checked={desktopSettings.requireInteraction}
              onCheckedChange={(requireInteraction) =>
                updateDesktopSettings({ requireInteraction })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="desktop-focused">Show when focused</Label>
              <p className="text-xs text-muted-foreground">
                Show even when app is focused
              </p>
            </div>
            <Switch
              id="desktop-focused"
              checked={desktopSettings.showWhenFocused}
              onCheckedChange={(showWhenFocused) =>
                updateDesktopSettings({ showWhenFocused })
              }
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

DesktopNotificationSettingsPanel.displayName =
  "DesktopNotificationSettingsPanel";

export default DesktopNotificationSettingsPanel;
