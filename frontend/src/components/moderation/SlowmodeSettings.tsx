"use client";

/**
 * Slowmode Settings Component
 * Allows moderators to configure slowmode for a channel
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SlowmodeSettingsProps {
  channelId: string;
  channelName?: string;
  moderatorId: string;
  onSettingsChanged?: () => void;
}

const SLOWMODE_OPTIONS = [
  { value: "off", label: "Off", ms: 0 },
  { value: "5s", label: "5 seconds", ms: 5000 },
  { value: "10s", label: "10 seconds", ms: 10000 },
  { value: "15s", label: "15 seconds", ms: 15000 },
  { value: "30s", label: "30 seconds", ms: 30000 },
  { value: "1m", label: "1 minute", ms: 60000 },
  { value: "2m", label: "2 minutes", ms: 120000 },
  { value: "5m", label: "5 minutes", ms: 300000 },
  { value: "10m", label: "10 minutes", ms: 600000 },
  { value: "15m", label: "15 minutes", ms: 900000 },
  { value: "30m", label: "30 minutes", ms: 1800000 },
  { value: "1h", label: "1 hour", ms: 3600000 },
  { value: "2h", label: "2 hours", ms: 7200000 },
  { value: "6h", label: "6 hours", ms: 21600000 },
];

export function SlowmodeSettings({
  channelId,
  channelName,
  moderatorId,
  onSettingsChanged,
}: SlowmodeSettingsProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState("off");
  const [currentConfig, setCurrentConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch current config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(
          `/api/moderation/slowmode?channelId=${channelId}`,
        );
        const data = await response.json();

        if (data.success) {
          setCurrentConfig(data.slowmode);
          setIsEnabled(data.isEnabled);
          if (data.slowmode?.intervalMs) {
            const option = SLOWMODE_OPTIONS.find(
              (o) => o.ms === data.slowmode.intervalMs,
            );
            setSelectedInterval(option?.value || "off");
          }
        }
      } catch (error) {
        toast.error("Failed to load slowmode settings");
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, [channelId]);

  const handleSave = async () => {
    setIsSaving(true);

    try {
      if (!isEnabled || selectedInterval === "off") {
        // Disable slowmode
        const response = await fetch(
          `/api/moderation/slowmode?channelId=${channelId}&moderatorId=${moderatorId}`,
          { method: "DELETE" },
        );
        const data = await response.json();

        if (data.success) {
          toast.success("Slowmode disabled");
          setIsEnabled(false);
          onSettingsChanged?.();
        } else {
          toast.error(data.error || "Failed to disable slowmode");
        }
      } else {
        // Enable/update slowmode
        const response = await fetch("/api/moderation/slowmode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channelId,
            interval: selectedInterval,
            moderatorId,
          }),
        });
        const data = await response.json();

        if (data.success) {
          toast.success(data.message);
          onSettingsChanged?.();
        } else {
          toast.error(data.error || "Failed to update slowmode");
        }
      }
    } catch (error) {
      toast.error("Failed to update slowmode settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Slow Mode
        </CardTitle>
        <CardDescription>
          Limit how often users can send messages in{" "}
          {channelName || "this channel"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="slowmode-toggle">Enable Slow Mode</Label>
            <p className="text-sm text-muted-foreground">
              Users must wait between messages
            </p>
          </div>
          <Switch
            id="slowmode-toggle"
            checked={isEnabled}
            onCheckedChange={(checked) => {
              setIsEnabled(checked);
              if (!checked) setSelectedInterval("off");
            }}
          />
        </div>

        {isEnabled && (
          <div className="space-y-2">
            <Label htmlFor="interval">Message Interval</Label>
            <Select
              value={selectedInterval}
              onValueChange={setSelectedInterval}
            >
              <SelectTrigger id="interval">
                <SelectValue placeholder="Select interval" />
              </SelectTrigger>
              <SelectContent>
                {SLOWMODE_OPTIONS.filter((o) => o.value !== "off").map(
                  (option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Users must wait this long between sending messages
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
