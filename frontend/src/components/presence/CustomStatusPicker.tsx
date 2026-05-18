"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  type CustomStatus,
  type StatusDuration,
  type ActivityType,
  PRESET_ACTIVITIES,
  COMMON_STATUS_EMOJIS,
  DURATION_OPTIONS,
  getDurationOption,
  getPresetActivity,
} from "@/lib/presence/presence-types";
import { CustomStatusPreview } from "./CustomStatus";
import { StatusDurationPicker } from "./StatusDuration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { X, Smile } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface CustomStatusPickerProps {
  /**
   * Current custom status
   */
  value?: CustomStatus;

  /**
   * Callback when status changes
   */
  onChange: (status: CustomStatus | null) => void;

  /**
   * Callback when cancel is clicked
   */
  onCancel?: () => void;

  /**
   * Additional class names
   */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function CustomStatusPicker({
  value,
  onChange,
  onCancel,
  className,
}: CustomStatusPickerProps) {
  const [emoji, setEmoji] = useState(value?.emoji ?? "");
  const [text, setText] = useState(value?.text ?? "");
  const [duration, setDuration] = useState<StatusDuration>("indefinite");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handlePresetClick = useCallback((activity: ActivityType) => {
    const preset = getPresetActivity(activity);
    if (preset) {
      setEmoji(preset.emoji);
      setText(preset.text);
      if (preset.defaultDuration) {
        setDuration(preset.defaultDuration);
      }
    }
  }, []);

  const handleEmojiSelect = useCallback((selectedEmoji: string) => {
    setEmoji(selectedEmoji);
    setShowEmojiPicker(false);
  }, []);

  const handleSave = useCallback(() => {
    if (!emoji && !text) {
      onChange(null);
      return;
    }

    const durationOption = getDurationOption(duration);
    const expiresAt = durationOption?.getExpiresAt() ?? null;

    onChange({
      emoji: emoji || undefined,
      text: text || undefined,
      expiresAt,
    });
  }, [emoji, text, duration, onChange]);

  const handleClear = useCallback(() => {
    setEmoji("");
    setText("");
    setDuration("indefinite");
    onChange(null);
  }, [onChange]);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Preview */}
      <div>
        <Label className="mb-2 block text-xs text-muted-foreground">
          Preview
        </Label>
        <CustomStatusPreview
          emoji={emoji}
          text={text}
          expiresAt={getDurationOption(duration)?.getExpiresAt()}
        />
      </div>

      <Tabs defaultValue="custom" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="presets">Presets</TabsTrigger>
          <TabsTrigger value="custom">Custom</TabsTrigger>
        </TabsList>

        {/* Presets Tab */}
        <TabsContent value="presets" className="mt-4">
          <div className="grid grid-cols-1 gap-1">
            {PRESET_ACTIVITIES.filter((a) => a.type !== "custom").map(
              (activity) => (
                <button
                  key={activity.type}
                  onClick={() => handlePresetClick(activity.type)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-left",
                    "hover:bg-muted/50 transition-colors",
                    emoji === activity.emoji &&
                      text === activity.text &&
                      "bg-muted",
                  )}
                >
                  <span className="text-lg">{activity.emoji}</span>
                  <span className="text-sm">{activity.text}</span>
                </button>
              ),
            )}
          </div>
        </TabsContent>

        {/* Custom Tab */}
        <TabsContent value="custom" className="mt-4 space-y-4">
          {/* Emoji and Text Input */}
          <div className="flex gap-2">
            {/* Emoji Picker Trigger */}
            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 flex-shrink-0"
                  aria-label="Select emoji"
                >
                  {emoji ? (
                    <span className="text-lg">{emoji}</span>
                  ) : (
                    <Smile className="h-5 w-5 text-muted-foreground" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="start">
                <div className="grid grid-cols-5 gap-1">
                  {COMMON_STATUS_EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => handleEmojiSelect(e)}
                      className={cn(
                        "rounded p-2 text-lg transition-colors hover:bg-muted",
                        emoji === e && "bg-muted ring-2 ring-ring",
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Text Input */}
            <div className="relative flex-1">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What's your status?"
                className="pr-8"
                maxLength={100}
              />
              {(emoji || text) && (
                <button
                  onClick={() => {
                    setEmoji("");
                    setText("");
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-muted"
                  aria-label="Clear"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Duration Picker */}
      <div>
        <Label className="mb-2 block text-xs text-muted-foreground">
          Clear after
        </Label>
        <StatusDurationPicker value={duration} onChange={setDuration} />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={!emoji && !text && !value}
        >
          Clear status
        </Button>
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Quick Status Picker (Simplified)
// ============================================================================

export interface QuickStatusPickerProps {
  value?: CustomStatus;
  onChange: (status: CustomStatus | null) => void;
  className?: string;
}

export function QuickStatusPicker({
  value,
  onChange,
  className,
}: QuickStatusPickerProps) {
  const handlePresetClick = useCallback(
    (activity: (typeof PRESET_ACTIVITIES)[0]) => {
      const durationOption = activity.defaultDuration
        ? getDurationOption(activity.defaultDuration)
        : null;

      onChange({
        emoji: activity.emoji,
        text: activity.text,
        expiresAt: durationOption?.getExpiresAt() ?? null,
      });
    },
    [onChange],
  );

  return (
    <div className={cn("space-y-2", className)}>
      {/* Quick presets */}
      <div className="grid grid-cols-2 gap-1">
        {PRESET_ACTIVITIES.slice(0, 6).map((activity) => (
          <button
            key={activity.type}
            onClick={() => handlePresetClick(activity)}
            className={cn(
              "flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm",
              "hover:bg-muted/50 transition-colors",
              value?.emoji === activity.emoji &&
                value?.text === activity.text &&
                "bg-muted",
            )}
          >
            <span>{activity.emoji}</span>
            <span className="truncate">{activity.text}</span>
          </button>
        ))}
      </div>

      {/* Clear */}
      {value && (value.emoji || value.text) && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => onChange(null)}
        >
          <X className="mr-2 h-4 w-4" />
          Clear status
        </Button>
      )}
    </div>
  );
}

export default CustomStatusPicker;
