"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Circle,
  CircleDot,
  Clock,
  Eye,
  EyeOff,
  MessageSquare,
  Moon,
  Settings,
  User,
  Pencil,
} from "lucide-react";
import { usePresenceStore } from "@/stores/presence-store";
import {
  StatusPicker,
  CustomStatusPicker,
  PresenceStatus,
  PresenceIndicator,
} from "@/components/presence";
import type {
  PresenceStatus as PresenceStatusType,
  CustomStatus,
  PresenceSettings,
} from "@/lib/presence/presence-types";
import {
  DEFAULT_PRESENCE_SETTINGS,
  PRESENCE_LABELS,
} from "@/lib/presence/presence-types";

export default function StatusSettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  const {
    myStatus,
    myCustomStatus,
    settings,
    setMyStatus,
    setMyCustomStatus,
    clearMyCustomStatus,
    updateSettings,
  } = usePresenceStore();

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleStatusChange = useCallback(
    (status: PresenceStatusType) => {
      setMyStatus(status);
    },
    [setMyStatus],
  );

  const handleCustomStatusChange = useCallback(
    (status: CustomStatus | null) => {
      if (status) {
        setMyCustomStatus(status);
      } else {
        clearMyCustomStatus();
      }
      setShowStatusPicker(false);
    },
    [setMyCustomStatus, clearMyCustomStatus],
  );

  const handleSettingChange = useCallback(
    <K extends keyof PresenceSettings>(
      section: K,
      key: keyof PresenceSettings[K],
      value: PresenceSettings[K][keyof PresenceSettings[K]],
    ) => {
      updateSettings({
        [section]: {
          ...settings[section],
          [key]: value,
        },
      } as Partial<PresenceSettings>);
    },
    [settings, updateSettings],
  );

  if (!mounted) {
    return (
      <div className="container max-w-2xl py-8">
        <h1 className="mb-8 flex items-center gap-3 text-3xl font-bold">
          <CircleDot className="h-8 w-8" />
          Status Settings
        </h1>
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="mb-8 flex items-center gap-3 text-3xl font-bold">
        <CircleDot className="h-8 w-8" />
        Status Settings
      </h1>

      <div className="space-y-8">
        {/* Current Status */}
        <Card>
          <CardHeader>
            <CardTitle>Current Status</CardTitle>
            <CardDescription>
              Set your availability and let others know what you are up to
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status display */}
            <div className="bg-muted/50 flex items-center justify-between rounded-lg p-4">
              <PresenceStatus
                status={myStatus}
                customStatus={myCustomStatus ?? undefined}
                variant="full"
                isOwn
                onClear={clearMyCustomStatus}
              />
              <Dialog
                open={showStatusPicker}
                onOpenChange={setShowStatusPicker}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Update your status</DialogTitle>
                    <DialogDescription>
                      Set your presence and custom status message
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div>
                      <Label className="mb-3 block text-sm font-medium">
                        Presence
                      </Label>
                      <StatusPicker
                        value={myStatus}
                        onChange={handleStatusChange}
                        showDescriptions={false}
                      />
                    </div>
                    <Separator />
                    <div>
                      <Label className="mb-3 block text-sm font-medium">
                        Custom Status
                      </Label>
                      <CustomStatusPicker
                        value={myCustomStatus ?? undefined}
                        onChange={handleCustomStatusChange}
                        onCancel={() => setShowStatusPicker(false)}
                      />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Quick status buttons */}
            <div>
              <Label className="mb-3 block text-sm font-medium">
                Quick status change
              </Label>
              <div className="flex flex-wrap gap-2">
                {(
                  ["online", "away", "dnd", "invisible"] as PresenceStatusType[]
                ).map((status) => (
                  <Button
                    key={status}
                    variant={myStatus === status ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => handleStatusChange(status)}
                    className="gap-2"
                  >
                    <PresenceIndicator
                      status={status}
                      size="xs"
                      position="inline"
                      animate={false}
                    />
                    {PRESENCE_LABELS[status]}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Auto-Away Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Auto-Away
            </CardTitle>
            <CardDescription>
              Automatically set your status to away when you are inactive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable auto-away</Label>
                <p className="text-sm text-muted-foreground">
                  Set status to away after period of inactivity
                </p>
              </div>
              <Switch
                checked={settings.autoAway.enabled}
                onCheckedChange={(checked) =>
                  handleSettingChange("autoAway", "enabled", checked)
                }
              />
            </div>

            {settings.autoAway.enabled && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>Timeout (minutes)</Label>
                  <Select
                    value={String(settings.autoAway.timeout)}
                    onValueChange={(value) =>
                      handleSettingChange("autoAway", "timeout", Number(value))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 minute</SelectItem>
                      <SelectItem value="2">2 minutes</SelectItem>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Set status to</Label>
                  <Select
                    value={settings.autoAway.setStatus}
                    onValueChange={(value) =>
                      handleSettingChange(
                        "autoAway",
                        "setStatus",
                        value as PresenceStatusType,
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="away">Away</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Privacy
            </CardTitle>
            <CardDescription>
              Control what others can see about your activity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Show last seen
                </Label>
                <p className="text-sm text-muted-foreground">
                  Let others see when you were last active
                </p>
              </div>
              <Switch
                checked={settings.privacy.showLastSeen}
                onCheckedChange={(checked) =>
                  handleSettingChange("privacy", "showLastSeen", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Show typing indicator
                </Label>
                <p className="text-sm text-muted-foreground">
                  Let others see when you are typing
                </p>
              </div>
              <Switch
                checked={settings.privacy.showTypingIndicator}
                onCheckedChange={(checked) =>
                  handleSettingChange("privacy", "showTypingIndicator", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Share activity status
                </Label>
                <p className="text-sm text-muted-foreground">
                  Show your custom status to other users
                </p>
              </div>
              <Switch
                checked={settings.privacy.shareActivityStatus}
                onCheckedChange={(checked) =>
                  handleSettingChange("privacy", "shareActivityStatus", checked)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Do Not Disturb Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5" />
              Do Not Disturb Schedule
            </CardTitle>
            <CardDescription>
              Automatically enable DND during specific hours
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable scheduled DND</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically set DND at specific times
                </p>
              </div>
              <Switch
                checked={settings.dndSchedule.enabled}
                onCheckedChange={(checked) =>
                  handleSettingChange("dndSchedule", "enabled", checked)
                }
              />
            </div>

            {settings.dndSchedule.enabled && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start time</Label>
                    <Input
                      type="time"
                      value={settings.dndSchedule.startTime}
                      onChange={(e) =>
                        handleSettingChange(
                          "dndSchedule",
                          "startTime",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End time</Label>
                    <Input
                      type="time"
                      value={settings.dndSchedule.endTime}
                      onChange={(e) =>
                        handleSettingChange(
                          "dndSchedule",
                          "endTime",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Days</Label>
                  <div className="flex flex-wrap gap-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (day, index) => {
                        const isSelected =
                          settings.dndSchedule.days.includes(index);
                        return (
                          <Button
                            key={day}
                            variant={isSelected ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => {
                              const newDays = isSelected
                                ? settings.dndSchedule.days.filter(
                                    (d) => d !== index,
                                  )
                                : [...settings.dndSchedule.days, index].sort();
                              handleSettingChange(
                                "dndSchedule",
                                "days",
                                newDays,
                              );
                            }}
                          >
                            {day}
                          </Button>
                        );
                      },
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Reset to Defaults */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Reset Settings
            </CardTitle>
            <CardDescription>
              Reset all status settings to their default values
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => updateSettings(DEFAULT_PRESENCE_SETTINGS)}
            >
              Reset to defaults
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
