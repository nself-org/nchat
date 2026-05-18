"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNotificationSettingsStore } from "@/stores/notification-settings-store";
import {
  NOTIFICATION_SOUNDS,
  playTestSound,
} from "@/lib/notifications/notification-sounds";

export interface NotificationSoundPickerProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * NotificationSoundPicker - Sound settings and picker
 */
export function NotificationSoundPicker({
  className,
  ...props
}: NotificationSoundPickerProps) {
  const soundSettings = useNotificationSettingsStore(
    (state) => state.preferences.sound,
  );
  const setSoundEnabled = useNotificationSettingsStore(
    (state) => state.setSoundEnabled,
  );
  const setSoundVolume = useNotificationSettingsStore(
    (state) => state.setSoundVolume,
  );
  const setNotificationSound = useNotificationSettingsStore(
    (state) => state.setNotificationSound,
  );
  const updateSoundSettings = useNotificationSettingsStore(
    (state) => state.updateSoundSettings,
  );

  const [isPlaying, setIsPlaying] = React.useState<string | null>(null);

  // Play test sound
  const handlePlaySound = async (soundId: string) => {
    setIsPlaying(soundId);
    await playTestSound(soundId, soundSettings.volume);
    setTimeout(() => setIsPlaying(null), 1000);
  };

  const soundOptions = NOTIFICATION_SOUNDS.filter(
    (s) => s.category !== "system" || s.id === "none",
  );

  return (
    <div className={cn("space-y-6", className)} {...props}>
      {/* Master Toggle */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="sound-enabled" className="text-base font-medium">
              Notification Sounds
            </Label>
            <p className="text-sm text-muted-foreground">
              Play sounds when you receive notifications
            </p>
          </div>
          <Switch
            id="sound-enabled"
            checked={soundSettings.enabled}
            onCheckedChange={setSoundEnabled}
          />
        </div>
      </Card>

      {/* Volume Control */}
      <Card
        className={cn(
          "p-4",
          !soundSettings.enabled && "pointer-events-none opacity-50",
        )}
      >
        <h3 className="mb-4 text-sm font-medium">Volume</h3>
        <div className="flex items-center gap-4">
          <svg
            className="h-5 w-5 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          </svg>
          <input
            type="range"
            min="0"
            max="100"
            value={soundSettings.volume}
            onChange={(e) => setSoundVolume(parseInt(e.target.value, 10))}
            className="flex-1"
          />
          <span className="w-12 text-right text-sm">
            {soundSettings.volume}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePlaySound("default")}
          >
            Test
          </Button>
        </div>
      </Card>

      {/* Sound Selection */}
      <Card
        className={cn(
          "p-4",
          !soundSettings.enabled && "pointer-events-none opacity-50",
        )}
      >
        <h3 className="mb-4 text-sm font-medium">Sound Selection</h3>
        <div className="space-y-4">
          {/* Default Sound */}
          <SoundRow
            label="Default"
            description="Used for general notifications"
            value={soundSettings.defaultSound}
            onChange={(value) => setNotificationSound("default", value)}
            onPlay={() => handlePlaySound(soundSettings.defaultSound)}
            isPlaying={isPlaying === soundSettings.defaultSound}
            options={soundOptions}
          />

          {/* Mention Sound */}
          <SoundRow
            label="Mentions"
            description="When someone @mentions you"
            value={soundSettings.mentionSound}
            onChange={(value) => setNotificationSound("mention", value)}
            onPlay={() => handlePlaySound(soundSettings.mentionSound)}
            isPlaying={isPlaying === soundSettings.mentionSound}
            options={soundOptions}
          />

          {/* DM Sound */}
          <SoundRow
            label="Direct Messages"
            description="When you receive a DM"
            value={soundSettings.dmSound}
            onChange={(value) => setNotificationSound("dm", value)}
            onPlay={() => handlePlaySound(soundSettings.dmSound)}
            isPlaying={isPlaying === soundSettings.dmSound}
            options={soundOptions}
          />

          {/* Thread Sound */}
          <SoundRow
            label="Thread Replies"
            description="When someone replies to a thread"
            value={soundSettings.threadSound}
            onChange={(value) => setNotificationSound("thread", value)}
            onPlay={() => handlePlaySound(soundSettings.threadSound)}
            isPlaying={isPlaying === soundSettings.threadSound}
            options={soundOptions}
          />

          {/* Reaction Sound */}
          <SoundRow
            label="Reactions"
            description="When someone reacts to your message"
            value={soundSettings.reactionSound}
            onChange={(value) => setNotificationSound("reaction", value)}
            onPlay={() => handlePlaySound(soundSettings.reactionSound)}
            isPlaying={isPlaying === soundSettings.reactionSound}
            options={soundOptions}
          />
        </div>
      </Card>

      {/* Additional Options */}
      <Card
        className={cn(
          "p-4",
          !soundSettings.enabled && "pointer-events-none opacity-50",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="play-focused">Play sounds when focused</Label>
            <p className="text-xs text-muted-foreground">
              Also play sounds when the app window is in focus
            </p>
          </div>
          <Switch
            id="play-focused"
            checked={soundSettings.playWhenFocused}
            onCheckedChange={(playWhenFocused) =>
              updateSoundSettings({ playWhenFocused })
            }
          />
        </div>
      </Card>
    </div>
  );
}

// Sound Row Component
interface SoundRowProps {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  onPlay: () => void;
  isPlaying: boolean;
  options: typeof NOTIFICATION_SOUNDS;
}

function SoundRow({
  label,
  description,
  value,
  onChange,
  onPlay,
  isPlaying,
  options,
}: SoundRowProps) {
  return (
    <div className="flex items-center justify-between border-b py-2 last:border-0">
      <div className="space-y-0.5">
        <span className="text-sm font-medium">{label}</span>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((sound) => (
              <SelectItem key={sound.id} value={sound.id}>
                {sound.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          onClick={onPlay}
          disabled={value === "none"}
          className="h-8 w-8"
        >
          {isPlaying ? (
            <svg
              className="h-4 w-4 animate-pulse"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          ) : (
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </Button>
      </div>
    </div>
  );
}

NotificationSoundPicker.displayName = "NotificationSoundPicker";

export default NotificationSoundPicker;
