"use client";

import { useState } from "react";
import {
  Monitor,
  Smartphone,
  Tablet,
  Trash2,
  ShieldCheck,
  ShieldOff,
  RefreshCw,
  Clock,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { UserDevice, DeviceType } from "@/lib/admin/users/user-types";

interface UserDevicesProps {
  devices: UserDevice[];
  userId: string;
  isLoading?: boolean;
  onRemoveDevice?: (deviceId: string) => Promise<void>;
  onTrustDevice?: (deviceId: string, trusted: boolean) => Promise<void>;
  onRefresh?: () => void;
}

const deviceIcons: Record<DeviceType, React.ReactNode> = {
  desktop: <Monitor className="h-5 w-5" />,
  mobile: <Smartphone className="h-5 w-5" />,
  tablet: <Tablet className="h-5 w-5" />,
  unknown: <Monitor className="h-5 w-5" />,
};

export function UserDevices({
  devices,
  userId,
  isLoading = false,
  onRemoveDevice,
  onTrustDevice,
  onRefresh,
}: UserDevicesProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<UserDevice | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRemoveDevice = async () => {
    if (!selectedDevice || !onRemoveDevice) return;

    setIsProcessing(true);
    try {
      await onRemoveDevice(selectedDevice.id);
    } finally {
      setIsProcessing(false);
      setDeleteDialogOpen(false);
      setSelectedDevice(null);
    }
  };

  const handleToggleTrust = async (device: UserDevice) => {
    if (!onTrustDevice) return;

    setIsProcessing(true);
    try {
      await onTrustDevice(device.id, !device.isTrusted);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);

    if (days < 1) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;

    return date.toLocaleDateString();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Known Devices</CardTitle>
              <CardDescription>
                Devices this user has logged in from
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 rounded-lg border p-4"
                >
                  <div className="h-12 w-12 animate-pulse rounded-lg bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : devices.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Monitor className="mx-auto h-12 w-12 opacity-50" />
              <p className="mt-2">No devices recorded</p>
            </div>
          ) : (
            <div className="space-y-4">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-4",
                    device.isTrusted &&
                      "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/50",
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-lg",
                        device.isTrusted
                          ? "bg-green-100 dark:bg-green-900"
                          : "bg-muted",
                      )}
                    >
                      {deviceIcons[device.deviceType]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {device.deviceName || `${device.deviceType} device`}
                        </span>
                        {device.isTrusted && (
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          >
                            <ShieldCheck className="mr-1 h-3 w-3" />
                            Trusted
                          </Badge>
                        )}
                        {device.isVerified && (
                          <Badge variant="secondary">Verified</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {device.browser && device.os && (
                          <span>
                            {device.browser} on {device.os}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                        {device.lastLocation && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {device.lastLocation.city}
                            {device.lastLocation.country &&
                              `, ${device.lastLocation.country}`}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last seen: {formatDate(device.lastSeenAt)}
                        </span>
                      </div>
                      {device.lastIpAddress && (
                        <div className="text-xs text-muted-foreground">
                          IP: {device.lastIpAddress}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleTrust(device)}
                      disabled={isProcessing}
                    >
                      {device.isTrusted ? (
                        <>
                          <ShieldOff className="mr-2 h-4 w-4" />
                          Untrust
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          Trust
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedDevice(device);
                        setDeleteDialogOpen(true);
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remove Device Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Device</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{selectedDevice?.deviceName}</strong> from the
              user's known devices. If they log in from this device again, it
              will be added back to the list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleRemoveDevice();
              }}
              disabled={isProcessing}
              className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
            >
              Remove Device
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default UserDevices;
