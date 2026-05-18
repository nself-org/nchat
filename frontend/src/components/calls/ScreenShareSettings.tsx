"use client";

/**
 * Screen Share Settings Component
 *
 * Advanced settings panel for screen sharing configuration.
 * Includes quality presets, frame rates, and optimization options.
 */

import * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Info, Zap, Network, Save } from "lucide-react";
import type { ScreenCaptureOptions } from "@/lib/webrtc/screen-capture";

// =============================================================================
// Types
// =============================================================================

export interface ScreenShareSettingsProps {
  /** Current settings */
  settings?: ScreenCaptureOptions;
  /** Callback when settings are saved */
  onSave: (settings: ScreenCaptureOptions) => void;
  /** Whether system audio is supported */
  supportsSystemAudio?: boolean;
  /** Additional class name */
  className?: string;
}

// =============================================================================
// Quality Info
// =============================================================================

const QUALITY_INFO = {
  auto: {
    resolution: "1920x1080",
    bitrate: "2.5 Mbps",
    network: "5+ Mbps",
    description: "Automatically adjusts based on network",
  },
  "720p": {
    resolution: "1280x720",
    bitrate: "1.5 Mbps",
    network: "3+ Mbps",
    description: "Lower quality, better for slow connections",
  },
  "1080p": {
    resolution: "1920x1080",
    bitrate: "2.5 Mbps",
    network: "5+ Mbps",
    description: "Standard quality, good balance",
  },
  "4k": {
    resolution: "3840x2160",
    bitrate: "8 Mbps",
    network: "20+ Mbps",
    description: "Highest quality, requires fast connection",
  },
};

// =============================================================================
// Component
// =============================================================================

export function ScreenShareSettings({
  settings: initialSettings,
  onSave,
  supportsSystemAudio = false,
  className,
}: ScreenShareSettingsProps) {
  const [settings, setSettings] = useState<ScreenCaptureOptions>(
    initialSettings ?? {
      quality: "auto",
      frameRate: 30,
      captureSystemAudio: false,
      captureCursor: true,
      allowSurfaceSwitching: true,
    },
  );

  const currentQualityInfo = QUALITY_INFO[settings.quality ?? "auto"];

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleSave = () => {
    onSave(settings);
  };

  const updateSetting = <K extends keyof ScreenCaptureOptions>(
    key: K,
    value: ScreenCaptureOptions[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <Card className={cn("w-full max-w-2xl", className)}>
      <CardHeader>
        <CardTitle>Screen Share Settings</CardTitle>
        <CardDescription>
          Configure quality, performance, and advanced options
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quality Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-semibold">Quality Preset</Label>
              <p className="text-sm text-muted-foreground">
                Choose video quality and resolution
              </p>
            </div>
            <Badge variant="outline">
              <Zap className="mr-1 h-3 w-3" />
              {currentQualityInfo.bitrate}
            </Badge>
          </div>

          <RadioGroup
            value={settings.quality}
            onValueChange={(value) =>
              updateSetting("quality", value as ScreenCaptureOptions["quality"])
            }
          >
            {Object.entries(QUALITY_INFO).map(([key, info]) => (
              <div
                key={key}
                className="hover:bg-accent/50 flex items-start space-x-3 space-y-0 rounded-md border p-4 transition-colors"
              >
                <RadioGroupItem value={key} id={key} />
                <div className="flex-1 space-y-1">
                  <Label
                    htmlFor={key}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {key === "auto" ? "Auto" : key.toUpperCase()}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {info.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{info.resolution}</span>
                    <span>•</span>
                    <span>{info.bitrate}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Network className="h-3 w-3" />
                      {info.network}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>

        <Separator />

        {/* Frame Rate */}
        <div className="space-y-4">
          <div>
            <Label className="text-base font-semibold">Frame Rate</Label>
            <p className="text-sm text-muted-foreground">
              Higher frame rates are smoother but use more bandwidth
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="frameRate">{settings.frameRate ?? 30} fps</Label>
              <Badge variant="outline">
                {settings.frameRate! >= 60
                  ? "Smooth"
                  : settings.frameRate! >= 30
                    ? "Standard"
                    : "Economy"}
              </Badge>
            </div>
            <Slider
              id="frameRate"
              value={[settings.frameRate ?? 30]}
              onValueChange={(value) => updateSetting("frameRate", value[0])}
              min={15}
              max={60}
              step={15}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>15 fps</span>
              <span>30 fps</span>
              <span>60 fps</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Audio Options */}
        <div className="space-y-4">
          <div>
            <Label className="text-base font-semibold">Audio Options</Label>
            <p className="text-sm text-muted-foreground">
              Capture system audio along with screen
            </p>
          </div>

          <div className="flex items-center justify-between space-x-2">
            <div className="flex-1">
              <Label htmlFor="systemAudio" className="text-sm font-medium">
                Capture System Audio
              </Label>
              <p className="text-sm text-muted-foreground">
                Share audio from your computer (Chrome/Edge only)
              </p>
            </div>
            <Switch
              id="systemAudio"
              checked={settings.captureSystemAudio ?? false}
              onCheckedChange={(checked) =>
                updateSetting("captureSystemAudio", checked)
              }
              disabled={!supportsSystemAudio}
            />
          </div>

          {!supportsSystemAudio && (
            <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm dark:bg-amber-950">
              <Info className="mt-0.5 h-4 w-4 text-amber-600 dark:text-amber-400" />
              <div className="text-amber-900 dark:text-amber-100">
                System audio capture is only supported in Chrome and Edge
                browsers.
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Display Options */}
        <div className="space-y-4">
          <div>
            <Label className="text-base font-semibold">Display Options</Label>
            <p className="text-sm text-muted-foreground">
              Customize how your screen is shared
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between space-x-2">
              <div className="flex-1">
                <Label htmlFor="cursor" className="text-sm font-medium">
                  Show Cursor
                </Label>
                <p className="text-sm text-muted-foreground">
                  Display your mouse cursor in the shared screen
                </p>
              </div>
              <Switch
                id="cursor"
                checked={settings.captureCursor ?? true}
                onCheckedChange={(checked) =>
                  updateSetting("captureCursor", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between space-x-2">
              <div className="flex-1">
                <Label
                  htmlFor="surfaceSwitching"
                  className="text-sm font-medium"
                >
                  Allow Surface Switching
                </Label>
                <p className="text-sm text-muted-foreground">
                  Let users switch between windows/screens during share
                </p>
              </div>
              <Switch
                id="surfaceSwitching"
                checked={settings.allowSurfaceSwitching ?? true}
                onCheckedChange={(checked) =>
                  updateSetting("allowSurfaceSwitching", checked)
                }
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Recommended Settings */}
        <div className="space-y-2 rounded-lg bg-muted p-4">
          <div className="flex items-center gap-2 font-semibold">
            <Info className="h-4 w-4" />
            Recommended Settings
          </div>
          <ul className="ml-6 list-disc space-y-1 text-sm text-muted-foreground">
            <li>
              <strong>Presentations:</strong> 720p @ 30fps (better
              compatibility)
            </li>
            <li>
              <strong>Design/Video:</strong> 1080p @ 60fps (higher quality)
            </li>
            <li>
              <strong>Poor Network:</strong> Auto or 720p @ 15fps (stability)
            </li>
            <li>
              <strong>System Audio:</strong> Enable for videos/music playback
            </li>
          </ul>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-2">
          <Button onClick={handleSave} className="w-full sm:w-auto">
            <Save className="mr-2 h-4 w-4" />
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
