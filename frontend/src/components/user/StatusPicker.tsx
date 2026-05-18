/**
 * StatusPicker Component
 *
 * Complete status picker with:
 * - Online status selector (online, away, busy/dnd, offline)
 * - Custom status with emoji and text
 * - Status presets (meeting, lunch, vacation, etc.)
 * - Clear after duration (30m, 1h, 4h, today, custom)
 * - Clear status button
 *
 * @example
 * ```tsx
 * <StatusPicker
 *   currentStatus="online"
 *   customStatus={customStatus}
 *   onStatusChange={(status) => /* console.log status)}
 *   onCustomStatusChange={(custom) => /* console.log custom)}
 * />
 * ```
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  type PresenceStatus,
  type CustomStatus,
  PRESENCE_LABELS,
  PRESENCE_DESCRIPTIONS,
  PRESET_ACTIVITIES,
  DURATION_OPTIONS,
  type StatusDuration,
  type ActivityType,
  getPresetActivity,
  getDurationOption,
} from "@/lib/presence/presence-types";
import { usePresenceStore } from "@/stores/presence-store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPresenceDot } from "./user-presence-dot";
import {
  Circle,
  Moon,
  MinusCircle,
  CircleOff,
  Smile,
  X,
  Clock,
  ChevronDown,
  Calendar,
  Pencil,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface StatusPickerProps {
  /** Current presence status */
  currentStatus?: PresenceStatus;
  /** Current custom status */
  customStatus?: CustomStatus | null;
  /** Callback when status changes */
  onStatusChange?: (status: PresenceStatus) => void;
  /** Callback when custom status changes */
  onCustomStatusChange?: (customStatus: CustomStatus | null) => void;
  /** Show as compact button instead of full UI */
  variant?: "button" | "dropdown" | "full";
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Additional className */
  className?: string;
}

// ============================================================================
// Status Icons
// ============================================================================

const statusIcons: Record<PresenceStatus, React.ReactNode> = {
  online: <Circle className="h-4 w-4 fill-green-500 text-green-500" />,
  away: <Moon className="h-4 w-4 fill-yellow-500 text-yellow-500" />,
  dnd: <MinusCircle className="h-4 w-4 fill-red-500 text-red-500" />,
  invisible: <CircleOff className="h-4 w-4 text-gray-500" />,
  offline: <CircleOff className="h-4 w-4 text-gray-500" />,
};

// ============================================================================
// Common Emojis
// ============================================================================

const COMMON_EMOJIS = [
  "😀",
  "😊",
  "😎",
  "🙂",
  "😁",
  "🎉",
  "🔥",
  "💪",
  "👋",
  "🙏",
  "💡",
  "⚡",
  "🚀",
  "💻",
  "📱",
  "🎯",
  "✅",
  "❤️",
  "⭐",
  "🌟",
  "🎮",
  "🎨",
  "📚",
  "🎵",
  "🏃",
  "🍕",
  "☕",
  "🌈",
  "🎪",
  "🎭",
  "🎬",
  "🎤",
];

// ============================================================================
// StatusPicker Component
// ============================================================================

export const StatusPicker = React.forwardRef<HTMLDivElement, StatusPickerProps>(
  (
    {
      currentStatus = "online",
      customStatus = null,
      onStatusChange,
      onCustomStatusChange,
      variant = "button",
      size = "md",
      className,
    },
    ref,
  ) => {
    const { setMyStatus, setMyCustomStatus, clearMyCustomStatus } =
      usePresenceStore();

    // Local state
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState<"status" | "custom">(
      "status",
    );
    const [emoji, setEmoji] = React.useState(customStatus?.emoji ?? "");
    const [text, setText] = React.useState(customStatus?.text ?? "");
    const [duration, setDuration] =
      React.useState<StatusDuration>("indefinite");
    const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);

    // Reset form when dialog opens
    React.useEffect(() => {
      if (dialogOpen) {
        setEmoji(customStatus?.emoji ?? "");
        setText(customStatus?.text ?? "");
        setDuration("indefinite");
        setShowEmojiPicker(false);
      }
    }, [dialogOpen, customStatus]);

    // Handle status change
    const handleStatusChange = (status: PresenceStatus) => {
      setMyStatus(status);
      onStatusChange?.(status);
    };

    // Handle preset activity selection
    const handlePresetSelect = (activity: ActivityType) => {
      const preset = getPresetActivity(activity);
      if (!preset) return;

      setEmoji(preset.emoji);
      setText(preset.text);
      if (preset.defaultDuration) {
        setDuration(preset.defaultDuration);
      }
    };

    // Handle custom status save
    const handleCustomStatusSave = () => {
      if (!emoji && !text) {
        clearMyCustomStatus();
        onCustomStatusChange?.(null);
        setDialogOpen(false);
        return;
      }

      const durationOption = getDurationOption(duration);
      const expiresAt = durationOption?.getExpiresAt() ?? null;

      const newCustomStatus: CustomStatus = {
        emoji: emoji || undefined,
        text: text || undefined,
        expiresAt,
      };

      setMyCustomStatus(newCustomStatus);
      onCustomStatusChange?.(newCustomStatus);
      setDialogOpen(false);
    };

    // Handle clear custom status
    const handleClearStatus = () => {
      clearMyCustomStatus();
      onCustomStatusChange?.(null);
      setEmoji("");
      setText("");
      setDialogOpen(false);
    };

    // Render status selector UI
    const renderStatusSelector = () => (
      <div className="space-y-3">
        <Label className="text-sm font-medium">Online Status</Label>
        <div className="grid gap-2">
          {(["online", "away", "dnd", "invisible"] as PresenceStatus[]).map(
            (status) => (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border-2 p-3 transition-all",
                  "hover:border-accent-foreground/20 hover:bg-accent",
                  currentStatus === status
                    ? "bg-primary/5 border-primary"
                    : "border-border",
                )}
              >
                <UserPresenceDot
                  status={status}
                  size="md"
                  position="inline"
                  animate={status === "online"}
                />
                <div className="flex-1 text-left">
                  <div className="font-medium">{PRESENCE_LABELS[status]}</div>
                  <div className="text-xs text-muted-foreground">
                    {PRESENCE_DESCRIPTIONS[status]}
                  </div>
                </div>
                {currentStatus === status && (
                  <div className="h-2 w-2 rounded-full bg-primary" />
                )}
              </button>
            ),
          )}
        </div>
      </div>
    );

    // Render custom status UI
    const renderCustomStatusSelector = () => (
      <div className="space-y-4">
        {/* Status Input */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Custom Status</Label>
          <div className="flex gap-2">
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="relative h-10 w-10 text-lg"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                {emoji || <Smile className="h-5 w-5 text-muted-foreground" />}
              </Button>

              {/* Emoji Picker Dropdown */}
              {showEmojiPicker && (
                <div className="absolute left-0 top-12 z-50 w-64 rounded-lg border bg-popover p-3 shadow-lg">
                  <div className="grid grid-cols-8 gap-1">
                    {COMMON_EMOJIS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => {
                          setEmoji(e);
                          setShowEmojiPicker(false);
                        }}
                        className="rounded p-1.5 text-lg transition-colors hover:bg-accent"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative flex-1">
              <Input
                placeholder="What's your status?"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={100}
                className="pr-8"
              />
              {(emoji || text) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                  onClick={() => {
                    setEmoji("");
                    setText("");
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Duration Selector */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4" />
            Clear After
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {DURATION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDuration(option.value)}
                className={cn(
                  "rounded-md border p-2.5 text-sm transition-all",
                  "hover:border-accent-foreground/20 hover:bg-accent",
                  duration === option.value
                    ? "bg-primary/5 border-primary font-medium"
                    : "border-border",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Preset Activities */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Quick Select</Label>
          <ScrollArea className="h-48">
            <div className="space-y-1 pr-4">
              {PRESET_ACTIVITIES.map((preset) => (
                <button
                  key={preset.type}
                  type="button"
                  onClick={() => handlePresetSelect(preset.type)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md p-2.5 text-left transition-colors",
                    emoji === preset.emoji && text === preset.text
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-accent",
                  )}
                >
                  <span className="text-lg">{preset.emoji}</span>
                  <span className="flex-1 text-sm">{preset.text}</span>
                  {preset.defaultDuration && (
                    <span className="text-xs text-muted-foreground">
                      {getDurationOption(preset.defaultDuration)?.label}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    );

    // Button variant (opens dialog)
    if (variant === "button") {
      return (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              ref={ref as any}
              variant="outline"
              size={size as any}
              className={cn("gap-2", className)}
            >
              <UserPresenceDot
                status={currentStatus}
                size="sm"
                position="inline"
                animate={currentStatus === "online"}
              />
              <span>
                {customStatus?.text || PRESENCE_LABELS[currentStatus]}
              </span>
              {customStatus?.emoji && (
                <span className="ml-1">{customStatus.emoji}</span>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Set Status</DialogTitle>
              <DialogDescription>
                Update your online status and set a custom message
              </DialogDescription>
            </DialogHeader>

            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as any)}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="status">Online Status</TabsTrigger>
                <TabsTrigger value="custom">Custom Status</TabsTrigger>
              </TabsList>

              <TabsContent value="status" className="mt-4">
                {renderStatusSelector()}
              </TabsContent>

              <TabsContent value="custom" className="mt-4">
                {renderCustomStatusSelector()}
              </TabsContent>
            </Tabs>

            <DialogFooter className="gap-2 sm:gap-0">
              {customStatus && activeTab === "custom" && (
                <Button
                  variant="outline"
                  onClick={handleClearStatus}
                  className="mr-auto"
                >
                  Clear Status
                </Button>
              )}
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              {activeTab === "custom" && (
                <Button onClick={handleCustomStatusSave}>Save Status</Button>
              )}
              {activeTab === "status" && (
                <Button onClick={() => setDialogOpen(false)}>Done</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    }

    // Dropdown variant
    if (variant === "dropdown") {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              ref={ref as any}
              variant="ghost"
              size={size as any}
              className={cn("gap-2", className)}
            >
              <UserPresenceDot
                status={currentStatus}
                size="sm"
                position="inline"
                animate={currentStatus === "online"}
              />
              <span>
                {customStatus?.text || PRESENCE_LABELS[currentStatus]}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>Set Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(["online", "away", "dnd", "invisible"] as PresenceStatus[]).map(
              (status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className="gap-3"
                >
                  <UserPresenceDot
                    status={status}
                    size="sm"
                    position="inline"
                    animate={status === "online"}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{PRESENCE_LABELS[status]}</div>
                    <div className="text-xs text-muted-foreground">
                      {PRESENCE_DESCRIPTIONS[status]}
                    </div>
                  </div>
                </DropdownMenuItem>
              ),
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDialogOpen(true)}
              className="gap-2"
            >
              <Pencil className="h-4 w-4" />
              <span>Set custom status...</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    // Full variant (inline UI)
    return (
      <div ref={ref} className={cn("space-y-6", className)}>
        {renderStatusSelector()}
        <Separator />
        {renderCustomStatusSelector()}
        <div className="flex justify-end gap-2">
          {customStatus && (
            <Button variant="outline" onClick={handleClearStatus}>
              Clear Status
            </Button>
          )}
          <Button onClick={handleCustomStatusSave}>Save Status</Button>
        </div>
      </div>
    );
  },
);

StatusPicker.displayName = "StatusPicker";

export default StatusPicker;
