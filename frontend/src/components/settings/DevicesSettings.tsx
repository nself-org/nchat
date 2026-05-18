"use client";

import { useState } from "react";
import { SettingsSection } from "./settings-section";
import { Button } from "@/components/ui/button";
import {
  Monitor,
  Smartphone,
  Tablet,
  MoreVertical,
  Trash2,
  AlertCircle,
  Check,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Device {
  id: string;
  name: string;
  type: "desktop" | "mobile" | "tablet";
  lastSync: Date;
  isCurrent: boolean;
  pushEnabled: boolean;
}

interface DevicesSettingsProps {
  className?: string;
}

// Mock devices data
const mockDevices: Device[] = [
  {
    id: "1",
    name: "MacBook Pro",
    type: "desktop",
    lastSync: new Date(),
    isCurrent: true,
    pushEnabled: true,
  },
  {
    id: "2",
    name: "iPhone 15 Pro",
    type: "mobile",
    lastSync: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
    isCurrent: false,
    pushEnabled: true,
  },
  {
    id: "3",
    name: "iPad Air",
    type: "tablet",
    lastSync: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    isCurrent: false,
    pushEnabled: false,
  },
];

const deviceIcons = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

/**
 * DevicesSettings - Manage logged-in devices
 */
export function DevicesSettings({ className }: DevicesSettingsProps) {
  const [devices, setDevices] = useState<Device[]>(mockDevices);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRemoveDevice = async (deviceId: string) => {
    setLoading(deviceId);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      setDevices((prev) => prev.filter((d) => d.id !== deviceId));
    } catch {
      setError("Failed to remove device");
    } finally {
      setLoading(null);
    }
  };

  const handleTogglePush = async (deviceId: string) => {
    setLoading(`push-${deviceId}`);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      setDevices((prev) =>
        prev.map((d) =>
          d.id === deviceId ? { ...d, pushEnabled: !d.pushEnabled } : d,
        ),
      );
    } catch {
      setError("Failed to update push settings");
    } finally {
      setLoading(null);
    }
  };

  return (
    <SettingsSection
      title="Logged-in Devices"
      description="Devices where you are currently logged in"
      className={className}
    >
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        {devices.map((device) => {
          const DeviceIcon = deviceIcons[device.type];

          return (
            <div
              key={device.id}
              className={cn(
                "flex items-center justify-between rounded-lg border p-4",
                device.isCurrent && "border-primary/30 bg-primary/5",
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    device.isCurrent ? "bg-primary/10" : "bg-muted",
                  )}
                >
                  <DeviceIcon
                    className={cn(
                      "h-5 w-5",
                      device.isCurrent
                        ? "text-primary"
                        : "text-muted-foreground",
                    )}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{device.name}</p>
                    {device.isCurrent && (
                      <span className="bg-primary/10 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-primary">
                        <Check className="h-3 w-3" />
                        This device
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {device.isCurrent
                      ? "Active now"
                      : `Last synced ${formatDistanceToNow(device.lastSync, { addSuffix: true })}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Push notifications:{" "}
                    {device.pushEnabled ? "Enabled" : "Disabled"}
                  </p>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={
                      loading?.startsWith(device.id) ||
                      loading === `push-${device.id}`
                    }
                  >
                    {loading === device.id ||
                    loading === `push-${device.id}` ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <MoreVertical className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleTogglePush(device.id)}>
                    {device.pushEnabled ? "Disable" : "Enable"} push
                    notifications
                  </DropdownMenuItem>
                  {!device.isCurrent && (
                    <DropdownMenuItem
                      onClick={() => handleRemoveDevice(device.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove device
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Removing a device will sign you out and stop syncing data to that
        device.
      </p>
    </SettingsSection>
  );
}
