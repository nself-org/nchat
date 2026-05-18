"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Circle,
  Clock,
  Moon,
  MinusCircle,
  X,
  Smile,
  Loader2,
} from "lucide-react";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export type PresenceStatus = "online" | "away" | "dnd" | "offline";

export interface CustomStatus {
  emoji?: string;
  text?: string;
  expiresAt?: Date;
}

export type ClearAfterOption =
  | "never"
  | "30min"
  | "1hour"
  | "4hours"
  | "today"
  | "tomorrow";

export interface UserStatusSelectorProps {
  currentPresence: PresenceStatus;
  currentStatus?: CustomStatus;
  onPresenceChange: (presence: PresenceStatus) => void;
  onStatusChange: (status: CustomStatus | null) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const PRESENCE_OPTIONS: {
  value: PresenceStatus;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    value: "online",
    label: "Online",
    description: "You will appear online",
    icon: <Circle className="h-3 w-3 fill-green-500 text-green-500" />,
    color: "bg-green-500",
  },
  {
    value: "away",
    label: "Away",
    description: "You will appear away",
    icon: <Clock className="h-3 w-3 text-yellow-500" />,
    color: "bg-yellow-500",
  },
  {
    value: "dnd",
    label: "Do Not Disturb",
    description: "You won't receive notifications",
    icon: <MinusCircle className="h-3 w-3 text-red-500" />,
    color: "bg-red-500",
  },
  {
    value: "offline",
    label: "Invisible",
    description: "You will appear offline",
    icon: <Moon className="h-3 w-3 text-gray-400" />,
    color: "bg-gray-400",
  },
];

const CLEAR_AFTER_OPTIONS: { value: ClearAfterOption; label: string }[] = [
  { value: "never", label: "Don't clear" },
  { value: "30min", label: "30 minutes" },
  { value: "1hour", label: "1 hour" },
  { value: "4hours", label: "4 hours" },
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
];

const PRESET_EMOJIS = [
  "😀",
  "😊",
  "🎉",
  "💻",
  "🏠",
  "☕",
  "🎧",
  "✈️",
  "🏖️",
  "🤒",
  "🍕",
  "📚",
];

// ============================================================================
// Helper Functions
// ============================================================================

export function getPresenceConfig(presence: PresenceStatus) {
  return (
    PRESENCE_OPTIONS.find((p) => p.value === presence) ?? PRESENCE_OPTIONS[0]
  );
}

export function calculateExpiryDate(
  clearAfter: ClearAfterOption,
): Date | undefined {
  const now = new Date();

  switch (clearAfter) {
    case "30min":
      return new Date(now.getTime() + 30 * 60 * 1000);
    case "1hour":
      return new Date(now.getTime() + 60 * 60 * 1000);
    case "4hours":
      return new Date(now.getTime() + 4 * 60 * 60 * 1000);
    case "today":
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);
      return endOfToday;
    case "tomorrow":
      const endOfTomorrow = new Date(now);
      endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
      endOfTomorrow.setHours(23, 59, 59, 999);
      return endOfTomorrow;
    case "never":
    default:
      return undefined;
  }
}

// ============================================================================
// Presence Indicator Component
// ============================================================================

interface PresenceIndicatorProps {
  presence: PresenceStatus;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PresenceIndicator({
  presence,
  size = "md",
  className,
}: PresenceIndicatorProps) {
  const config = getPresenceConfig(presence);
  const sizeClass = {
    sm: "h-2 w-2",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  }[size];

  return (
    <span
      className={cn("rounded-full", config.color, sizeClass, className)}
      data-testid={`presence-indicator-${presence}`}
      aria-label={config.label}
    />
  );
}

// ============================================================================
// Emoji Picker Component
// ============================================================================

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  className?: string;
}

function EmojiPicker({ onSelect, className }: EmojiPickerProps) {
  return (
    <div
      className={cn("grid grid-cols-6 gap-1 p-2", className)}
      data-testid="emoji-picker"
    >
      {PRESET_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onSelect(emoji)}
          className="rounded p-2 text-lg transition-colors hover:bg-accent"
          data-testid={`emoji-${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function UserStatusSelector({
  currentPresence,
  currentStatus,
  onPresenceChange,
  onStatusChange,
  disabled = false,
  className,
}: UserStatusSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [showStatusForm, setShowStatusForm] = React.useState(false);
  const [statusEmoji, setStatusEmoji] = React.useState(
    currentStatus?.emoji || "",
  );
  const [statusText, setStatusText] = React.useState(currentStatus?.text || "");
  const [clearAfter, setClearAfter] = React.useState<ClearAfterOption>("never");
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // Reset form when popover opens
  React.useEffect(() => {
    if (isOpen) {
      setStatusEmoji(currentStatus?.emoji || "");
      setStatusText(currentStatus?.text || "");
      setClearAfter("never");
      setShowStatusForm(false);
      setShowEmojiPicker(false);
    }
  }, [isOpen, currentStatus]);

  const handlePresenceChange = (presence: PresenceStatus) => {
    onPresenceChange(presence);
    if (!showStatusForm) {
      setIsOpen(false);
    }
  };

  const handleSetStatus = async () => {
    if (!statusText.trim() && !statusEmoji) return;

    setSaving(true);
    try {
      await onStatusChange({
        emoji: statusEmoji || undefined,
        text: statusText.trim() || undefined,
        expiresAt: calculateExpiryDate(clearAfter),
      });
      setIsOpen(false);
    } catch (error) {
      logger.error("Failed to set status:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleClearStatus = async () => {
    setSaving(true);
    try {
      await onStatusChange(null);
      setStatusEmoji("");
      setStatusText("");
      setIsOpen(false);
    } catch (error) {
      logger.error("Failed to clear status:", error);
    } finally {
      setSaving(false);
    }
  };

  const presenceConfig = getPresenceConfig(currentPresence);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className={cn("gap-2", className)}
          data-testid="status-selector-trigger"
        >
          <PresenceIndicator presence={currentPresence} size="sm" />
          <span className="text-sm">
            {currentStatus?.emoji && `${currentStatus.emoji} `}
            {currentStatus?.text || presenceConfig.label}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        {/* Status Form */}
        {showStatusForm ? (
          <div className="space-y-4 p-4" data-testid="status-form">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Set a status</h4>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowStatusForm(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Status Input */}
            <div className="flex gap-2">
              <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="flex-shrink-0"
                    data-testid="emoji-picker-trigger"
                  >
                    {statusEmoji || <Smile className="h-4 w-4" />}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0"
                  side="bottom"
                  align="start"
                >
                  <EmojiPicker
                    onSelect={(emoji) => {
                      setStatusEmoji(emoji);
                      setShowEmojiPicker(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
              <Input
                placeholder="What's your status?"
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                maxLength={100}
                data-testid="status-text-input"
              />
            </div>

            {/* Clear After */}
            <div className="space-y-2">
              <Label>Clear after</Label>
              <Select
                value={clearAfter}
                onValueChange={(value: ClearAfterOption) =>
                  setClearAfter(value)
                }
              >
                <SelectTrigger data-testid="clear-after-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLEAR_AFTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowStatusForm(false)}
                className="flex-1"
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSetStatus}
                disabled={saving || (!statusText.trim() && !statusEmoji)}
                className="flex-1"
                data-testid="save-status-button"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Current Status */}
            {currentStatus && (currentStatus.emoji || currentStatus.text) && (
              <>
                <div className="border-b p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {currentStatus.emoji && (
                        <span className="text-lg">{currentStatus.emoji}</span>
                      )}
                      <span className="text-sm">{currentStatus.text}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearStatus}
                      disabled={saving}
                      data-testid="clear-status-button"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Clear"
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Set Status Button */}
            <div className="p-2">
              <button
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent"
                onClick={() => setShowStatusForm(true)}
                data-testid="set-status-button"
              >
                <Smile className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Set a status</span>
              </button>
            </div>

            <Separator />

            {/* Presence Options */}
            <div className="p-2" data-testid="presence-options">
              {PRESENCE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent",
                    currentPresence === option.value && "bg-accent",
                  )}
                  onClick={() => handlePresenceChange(option.value)}
                  data-testid={`presence-option-${option.value}`}
                >
                  <span className={cn("h-3 w-3 rounded-full", option.color)} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{option.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                  {currentPresence === option.value && (
                    <span className="text-sm text-primary">✓</span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

export { PRESENCE_OPTIONS, CLEAR_AFTER_OPTIONS, EmojiPicker };
