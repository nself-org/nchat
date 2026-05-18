"use client";

/**
 * Quick Remind Component
 *
 * Provides preset time options for quickly setting reminders.
 * Includes common options like "In 20 minutes", "Tomorrow morning", etc.
 *
 * @example
 * ```tsx
 * <QuickRemind
 *   onSelect={(date) => setReminder({ remindAt: date })}
 *   onCustom={() => openCustomTimePicker()}
 * />
 * ```
 */

import * as React from "react";
import {
  Clock,
  Sun,
  Sunrise,
  CalendarDays,
  Settings2,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getPresetReminderTimes,
  getTomorrowMorning,
  getTomorrowAfternoon,
  getNextWeek,
  formatFutureTime,
} from "@/lib/reminders/reminder-store";

// ============================================================================
// Types
// ============================================================================

export interface QuickRemindProps {
  onSelect: (date: Date) => void;
  onCustom?: () => void;
  triggerLabel?: string;
  showTrigger?: boolean;
  disabled?: boolean;
  className?: string;
}

export interface QuickRemindOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  getTime: () => Date;
}

// ============================================================================
// Preset Options
// ============================================================================

const QUICK_REMIND_OPTIONS: QuickRemindOption[] = [
  {
    id: "20min",
    label: "In 20 minutes",
    description: "",
    icon: <Timer className="h-4 w-4" />,
    getTime: () => new Date(Date.now() + 20 * 60 * 1000),
  },
  {
    id: "1hour",
    label: "In 1 hour",
    description: "",
    icon: <Clock className="h-4 w-4" />,
    getTime: () => new Date(Date.now() + 60 * 60 * 1000),
  },
  {
    id: "3hours",
    label: "In 3 hours",
    description: "",
    icon: <Clock className="h-4 w-4" />,
    getTime: () => new Date(Date.now() + 3 * 60 * 60 * 1000),
  },
  {
    id: "tomorrow-morning",
    label: "Tomorrow morning",
    description: "9:00 AM",
    icon: <Sunrise className="h-4 w-4" />,
    getTime: getTomorrowMorning,
  },
  {
    id: "tomorrow-afternoon",
    label: "Tomorrow afternoon",
    description: "1:00 PM",
    icon: <Sun className="h-4 w-4" />,
    getTime: getTomorrowAfternoon,
  },
  {
    id: "next-week",
    label: "Next week",
    description: "",
    icon: <CalendarDays className="h-4 w-4" />,
    getTime: getNextWeek,
  },
];

// ============================================================================
// Quick Remind Item
// ============================================================================

interface QuickRemindItemProps {
  option: QuickRemindOption;
  onSelect: () => void;
  disabled?: boolean;
}

function QuickRemindItem({ option, onSelect, disabled }: QuickRemindItemProps) {
  const [description, setDescription] = React.useState(option.description);

  // Update description with actual time on mount
  React.useEffect(() => {
    if (!option.description) {
      setDescription(formatFutureTime(option.getTime()));
    }
  }, [option]);

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left",
        "hover:text-accent-foreground hover:bg-accent",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-colors",
      )}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {option.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{option.label}</div>
        {description && (
          <div className="truncate text-xs text-muted-foreground">
            {description}
          </div>
        )}
      </div>
    </button>
  );
}

// ============================================================================
// Quick Remind Menu (Inline)
// ============================================================================

export interface QuickRemindMenuProps {
  onSelect: (date: Date) => void;
  onCustom?: () => void;
  disabled?: boolean;
  className?: string;
}

export function QuickRemindMenu({
  onSelect,
  onCustom,
  disabled = false,
  className,
}: QuickRemindMenuProps) {
  const handleSelect = React.useCallback(
    (option: QuickRemindOption) => {
      onSelect(option.getTime());
    },
    [onSelect],
  );

  return (
    <div className={cn("space-y-1", className)}>
      {QUICK_REMIND_OPTIONS.map((option) => (
        <QuickRemindItem
          key={option.id}
          option={option}
          onSelect={() => handleSelect(option)}
          disabled={disabled}
        />
      ))}

      {onCustom && (
        <>
          <div className="my-2 h-px bg-border" />
          <button
            type="button"
            onClick={onCustom}
            disabled={disabled}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left",
              "hover:text-accent-foreground hover:bg-accent",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "transition-colors",
            )}
          >
            <span className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full text-primary">
              <Settings2 className="h-4 w-4" />
            </span>
            <div className="text-sm font-medium">Custom time...</div>
          </button>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Quick Remind Popover
// ============================================================================

export function QuickRemind({
  onSelect,
  onCustom,
  triggerLabel = "Remind me",
  showTrigger = true,
  disabled = false,
  className,
}: QuickRemindProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSelect = React.useCallback(
    (date: Date) => {
      onSelect(date);
      setIsOpen(false);
    },
    [onSelect],
  );

  const handleCustom = React.useCallback(() => {
    setIsOpen(false);
    onCustom?.();
  }, [onCustom]);

  if (!showTrigger) {
    return (
      <QuickRemindMenu
        onSelect={handleSelect}
        onCustom={onCustom}
        disabled={disabled}
        className={className}
      />
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className={cn("gap-2", className)}
        >
          <Clock className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <QuickRemindMenu
          onSelect={handleSelect}
          onCustom={handleCustom}
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// Quick Remind Buttons (Horizontal Layout)
// ============================================================================

export interface QuickRemindButtonsProps {
  onSelect: (date: Date) => void;
  onCustom?: () => void;
  options?: QuickRemindOption[];
  disabled?: boolean;
  className?: string;
}

export function QuickRemindButtons({
  onSelect,
  onCustom,
  options = QUICK_REMIND_OPTIONS.slice(0, 4),
  disabled = false,
  className,
}: QuickRemindButtonsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => (
        <Button
          key={option.id}
          variant="outline"
          size="sm"
          onClick={() => onSelect(option.getTime())}
          disabled={disabled}
          className="text-xs"
        >
          {option.icon}
          <span className="ml-1.5">{option.label}</span>
        </Button>
      ))}
      {onCustom && (
        <Button
          variant="outline"
          size="sm"
          onClick={onCustom}
          disabled={disabled}
          className="text-xs"
        >
          <Settings2 className="h-3.5 w-3.5" />
          <span className="ml-1.5">Custom</span>
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// Message Quick Remind (for context menu)
// ============================================================================

export interface MessageQuickRemindProps {
  messageId: string;
  onRemind: (date: Date) => void;
  onClose?: () => void;
  disabled?: boolean;
  className?: string;
}

export function MessageQuickRemind({
  onRemind,
  onClose,
  disabled = false,
  className,
}: MessageQuickRemindProps) {
  const handleSelect = React.useCallback(
    (date: Date) => {
      onRemind(date);
      onClose?.();
    },
    [onRemind, onClose],
  );

  return (
    <div className={cn("py-1", className)}>
      <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
        Remind me about this
      </div>
      <QuickRemindMenu onSelect={handleSelect} disabled={disabled} />
    </div>
  );
}

export default QuickRemind;
