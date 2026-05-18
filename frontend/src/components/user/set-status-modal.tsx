"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { type CustomStatus, useUserStore } from "@/stores/user-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Smile, X, Clock } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface SetStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStatus?: CustomStatus;
  onSave?: (status: CustomStatus) => void;
}

// ============================================================================
// Preset statuses
// ============================================================================

const presetStatuses: Array<{ emoji: string; text: string }> = [
  { emoji: "📅", text: "In a meeting" },
  { emoji: "🚗", text: "Commuting" },
  { emoji: "🤒", text: "Out sick" },
  { emoji: "🌴", text: "Vacationing" },
  { emoji: "🏠", text: "Working remotely" },
  { emoji: "🎯", text: "Focusing" },
  { emoji: "🍔", text: "Lunch break" },
  { emoji: "💻", text: "Coding" },
  { emoji: "☕", text: "Coffee break" },
  { emoji: "🎧", text: "Listening to music" },
];

// ============================================================================
// Common emojis for quick selection
// ============================================================================

const commonEmojis = [
  "😀",
  "😊",
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
];

// ============================================================================
// Clear time options
// ============================================================================

const clearTimeOptions = [
  { value: "none", label: "Don't clear" },
  { value: "30m", label: "in 30 minutes" },
  { value: "1h", label: "in 1 hour" },
  { value: "4h", label: "in 4 hours" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
];

// ============================================================================
// Component
// ============================================================================

export const SetStatusModal: React.FC<SetStatusModalProps> = ({
  open,
  onOpenChange,
  currentStatus,
  onSave,
}) => {
  const setMyCustomStatus = useUserStore((state) => state.setMyCustomStatus);
  const clearMyCustomStatus = useUserStore(
    (state) => state.clearMyCustomStatus,
  );

  const [emoji, setEmoji] = React.useState(currentStatus?.emoji ?? "");
  const [text, setText] = React.useState(currentStatus?.text ?? "");
  const [clearTime, setClearTime] = React.useState("none");
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      setEmoji(currentStatus?.emoji ?? "");
      setText(currentStatus?.text ?? "");
      setClearTime("none");
      setShowEmojiPicker(false);
    }
  }, [open, currentStatus]);

  const handlePresetClick = (preset: { emoji: string; text: string }) => {
    setEmoji(preset.emoji);
    setText(preset.text);
  };

  const handleEmojiClick = (selectedEmoji: string) => {
    setEmoji(selectedEmoji);
    setShowEmojiPicker(false);
  };

  const calculateExpiresAt = (clearTimeValue: string): Date | null => {
    const now = new Date();
    switch (clearTimeValue) {
      case "30m":
        return new Date(now.getTime() + 30 * 60 * 1000);
      case "1h":
        return new Date(now.getTime() + 60 * 60 * 1000);
      case "4h":
        return new Date(now.getTime() + 4 * 60 * 60 * 1000);
      case "today": {
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        return endOfDay;
      }
      case "week": {
        const endOfWeek = new Date(now);
        endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
        endOfWeek.setHours(23, 59, 59, 999);
        return endOfWeek;
      }
      default:
        return null;
    }
  };

  const handleSave = () => {
    if (!emoji && !text) {
      handleClear();
      return;
    }

    const status: CustomStatus = {
      emoji: emoji || undefined,
      text: text || undefined,
      expiresAt: calculateExpiresAt(clearTime),
    };

    setMyCustomStatus(status);
    onSave?.(status);
    onOpenChange(false);
  };

  const handleClear = () => {
    clearMyCustomStatus();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Set a status</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status input */}
          <div className="flex gap-2">
            <div className="relative">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 text-lg"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                {emoji || <Smile className="h-5 w-5 text-muted-foreground" />}
              </Button>

              {/* Simple emoji picker dropdown */}
              {showEmojiPicker && (
                <div className="absolute left-0 top-12 z-50 rounded-md border bg-popover p-3 shadow-lg">
                  <div className="grid grid-cols-8 gap-1">
                    {commonEmojis.map((e) => (
                      <button
                        key={e}
                        onClick={() => handleEmojiClick(e)}
                        className="rounded p-1 text-lg transition-colors hover:bg-muted"
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
                maxLength={80}
              />
              {(emoji || text) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
                  onClick={() => {
                    setEmoji("");
                    setText("");
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Clear time selector */}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="clear-after" className="text-sm">
              Clear after:
            </Label>
            <Select value={clearTime} onValueChange={setClearTime}>
              <SelectTrigger id="clear-after" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {clearTimeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Preset statuses */}
          <div>
            <Label className="mb-2 block text-sm text-muted-foreground">
              Quick select
            </Label>
            <ScrollArea className="h-40">
              <div className="space-y-1">
                {presetStatuses.map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => handlePresetClick(preset)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors",
                      emoji === preset.emoji && text === preset.text
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted",
                    )}
                  >
                    <span className="text-lg">{preset.emoji}</span>
                    <span className="text-sm">{preset.text}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {currentStatus && (
            <Button variant="outline" onClick={handleClear} className="mr-auto">
              Clear Status
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SetStatusModal;
