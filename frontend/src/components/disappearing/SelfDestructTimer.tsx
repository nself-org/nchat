"use client";

import { useState, useCallback } from "react";
import { Flame, Clock, Eye, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  DisappearingMessageType,
  BURN_TIMER_OPTIONS,
  DISAPPEARING_TYPE_LABELS,
  formatDuration,
} from "@/lib/disappearing";

interface SelfDestructTimerProps {
  /** Current message type */
  type: DisappearingMessageType | null;
  /** Timer duration for regular type (seconds) */
  timerDuration?: number;
  /** Burn timer for burn_after_reading type (seconds) */
  burnTimer?: number;
  /** Callback when type changes */
  onTypeChange: (
    type: DisappearingMessageType | null,
    options?: { timerDuration?: number; burnTimer?: number },
  ) => void;
  /** Available timer presets */
  timerPresets?: number[];
  /** Whether the control is disabled */
  disabled?: boolean;
  /** Size variant */
  size?: "sm" | "default";
  /** Show as icon button or full button */
  variant?: "icon" | "button" | "dropdown";
  /** Additional class names */
  className?: string;
}

/**
 * Per-message self-destruct timer selector.
 * Allows setting view-once, burn-after-reading, or custom timer.
 */
export function SelfDestructTimer({
  type,
  timerDuration,
  burnTimer = 10,
  onTypeChange,
  timerPresets = [86400, 604800, 2592000],
  disabled = false,
  size = "default",
  variant = "dropdown",
  className,
}: SelfDestructTimerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleTypeSelect = useCallback(
    (
      newType: DisappearingMessageType | null,
      options?: { timerDuration?: number; burnTimer?: number },
    ) => {
      onTypeChange(newType, options);
      setIsOpen(false);
    },
    [onTypeChange],
  );

  const Icon =
    type === "view_once" ? Eye : type === "burn_after_reading" ? Flame : Clock;
  const label = type
    ? getLabel(type, timerDuration, burnTimer)
    : "Auto-delete off";
  const isActive = type !== null;

  if (variant === "icon") {
    return (
      <TooltipProvider>
        <Tooltip>
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <TooltipTrigger asChild>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="icon"
                  disabled={disabled}
                  className={cn(
                    size === "sm" ? "h-8 w-8" : "h-9 w-9",
                    isActive &&
                      type === "burn_after_reading" &&
                      "bg-red-500 hover:bg-red-600",
                    isActive &&
                      type === "view_once" &&
                      "bg-amber-500 hover:bg-amber-600",
                    className,
                  )}
                >
                  <Icon size={size === "sm" ? 14 : 16} />
                </Button>
              </TooltipTrigger>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="end">
              <SelfDestructOptions
                type={type}
                timerDuration={timerDuration}
                burnTimer={burnTimer}
                timerPresets={timerPresets}
                onSelect={handleTypeSelect}
              />
            </PopoverContent>
          </Popover>
          <TooltipContent side="top">
            <p>{label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === "button") {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={isActive ? "default" : "outline"}
            size={size}
            disabled={disabled}
            className={cn(
              "gap-2",
              isActive &&
                type === "burn_after_reading" &&
                "bg-red-500 text-white hover:bg-red-600",
              isActive &&
                type === "view_once" &&
                "bg-amber-500 text-white hover:bg-amber-600",
              className,
            )}
          >
            <Icon size={size === "sm" ? 14 : 16} />
            <span className="text-xs">{label}</span>
            <ChevronDown size={12} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="end">
          <SelfDestructOptions
            type={type}
            timerDuration={timerDuration}
            burnTimer={burnTimer}
            timerPresets={timerPresets}
            onSelect={handleTypeSelect}
          />
        </PopoverContent>
      </Popover>
    );
  }

  // Dropdown variant
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={size}
          disabled={disabled}
          className={cn(
            "justify-start gap-2",
            isActive && "text-primary",
            className,
          )}
        >
          <Icon size={size === "sm" ? 14 : 16} />
          <span className={size === "sm" ? "text-xs" : "text-sm"}>{label}</span>
          <ChevronDown size={12} className="ml-auto" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Message self-destruct</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Off */}
        <DropdownMenuItem
          onClick={() => handleTypeSelect(null)}
          className="gap-2"
        >
          <Clock size={14} className="text-muted-foreground" />
          <span>Off (persist)</span>
          {type === null && <Check size={14} className="ml-auto" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Timer presets */}
        {timerPresets.map((preset) => (
          <DropdownMenuItem
            key={preset}
            onClick={() =>
              handleTypeSelect("regular", { timerDuration: preset })
            }
            className="gap-2"
          >
            <Clock size={14} className="text-blue-500" />
            <span>{formatDuration(preset)}</span>
            {type === "regular" && timerDuration === preset && (
              <Check size={14} className="ml-auto" />
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        {/* View once */}
        <DropdownMenuItem
          onClick={() => handleTypeSelect("view_once")}
          className="gap-2"
        >
          <Eye size={14} className="text-amber-500" />
          <span>View once</span>
          {type === "view_once" && <Check size={14} className="ml-auto" />}
        </DropdownMenuItem>

        {/* Burn after reading */}
        <DropdownMenuItem
          onClick={() =>
            handleTypeSelect("burn_after_reading", { burnTimer: 10 })
          }
          className="gap-2"
        >
          <Flame size={14} className="text-red-500" />
          <span>Burn after reading</span>
          {type === "burn_after_reading" && (
            <Check size={14} className="ml-auto" />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Self-destruct options panel (for popover).
 */
function SelfDestructOptions({
  type,
  timerDuration,
  burnTimer,
  timerPresets,
  onSelect,
}: {
  type: DisappearingMessageType | null;
  timerDuration?: number;
  burnTimer?: number;
  timerPresets: number[];
  onSelect: (
    type: DisappearingMessageType | null,
    options?: { timerDuration?: number; burnTimer?: number },
  ) => void;
}) {
  return (
    <div className="py-2">
      <div className="px-3 py-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          Message self-destruct
        </Label>
      </div>

      {/* Off option */}
      <button
        className={cn(
          "flex w-full items-center gap-3 px-3 py-2 transition-colors hover:bg-muted",
          type === null && "bg-muted",
        )}
        onClick={() => onSelect(null)}
      >
        <Clock size={16} className="text-muted-foreground" />
        <div className="flex-1 text-left">
          <p className="text-sm font-medium">Off</p>
          <p className="text-xs text-muted-foreground">Message persists</p>
        </div>
        {type === null && <Check size={14} className="text-primary" />}
      </button>

      <div className="my-2 border-t" />

      {/* Timer presets */}
      <div className="px-3 py-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          Auto-delete timer
        </Label>
      </div>
      {timerPresets.map((preset) => (
        <button
          key={preset}
          className={cn(
            "flex w-full items-center gap-3 px-3 py-2 transition-colors hover:bg-muted",
            type === "regular" && timerDuration === preset && "bg-muted",
          )}
          onClick={() => onSelect("regular", { timerDuration: preset })}
        >
          <Clock size={16} className="text-blue-500" />
          <span className="text-sm">{formatDuration(preset)}</span>
          {type === "regular" && timerDuration === preset && (
            <Check size={14} className="ml-auto text-primary" />
          )}
        </button>
      ))}

      <div className="my-2 border-t" />

      {/* Special types */}
      <button
        className={cn(
          "flex w-full items-center gap-3 px-3 py-2 transition-colors hover:bg-muted",
          type === "view_once" && "bg-muted",
        )}
        onClick={() => onSelect("view_once")}
      >
        <Eye size={16} className="text-amber-500" />
        <div className="flex-1 text-left">
          <p className="text-sm font-medium">View once</p>
          <p className="text-xs text-muted-foreground">
            Disappears after viewing
          </p>
        </div>
        {type === "view_once" && <Check size={14} className="text-primary" />}
      </button>

      <button
        className={cn(
          "flex w-full items-center gap-3 px-3 py-2 transition-colors hover:bg-muted",
          type === "burn_after_reading" && "bg-muted",
        )}
        onClick={() => onSelect("burn_after_reading", { burnTimer: 10 })}
      >
        <Flame size={16} className="text-red-500" />
        <div className="flex-1 text-left">
          <p className="text-sm font-medium">Burn after reading</p>
          <p className="text-xs text-muted-foreground">
            10s countdown after opening
          </p>
        </div>
        {type === "burn_after_reading" && (
          <Check size={14} className="text-primary" />
        )}
      </button>
    </div>
  );
}

/**
 * Get label for current selection.
 */
function getLabel(
  type: DisappearingMessageType,
  timerDuration?: number,
  burnTimer?: number,
): string {
  switch (type) {
    case "view_once":
      return "View once";
    case "burn_after_reading":
      return `Burn ${burnTimer || 10}s`;
    default:
      return timerDuration ? formatDuration(timerDuration) : "Auto-delete";
  }
}

export default SelfDestructTimer;
