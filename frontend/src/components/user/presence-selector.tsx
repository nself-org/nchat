"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  type PresenceStatus,
  getPresenceColor,
  getPresenceLabel,
  useUserStore,
} from "@/stores/user-store";
import { UserPresenceDot } from "./user-presence-dot";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Circle,
  Moon,
  MinusCircle,
  CircleOff,
  Sparkles,
  ChevronDown,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface PresenceSelectorProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onChange"
> {
  value?: PresenceStatus;
  onChange?: (presence: PresenceStatus) => void;
  showAutoOption?: boolean;
  variant?: "dropdown" | "radio" | "buttons";
  size?: "sm" | "md" | "lg";
}

// ============================================================================
// Presence options
// ============================================================================

const presenceOptions: Array<{
  value: PresenceStatus | "auto";
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    value: "online",
    label: "Online",
    description: "You appear as online",
    icon: <Circle className="h-4 w-4 fill-green-500 text-green-500" />,
  },
  {
    value: "away",
    label: "Away",
    description: "You appear as away",
    icon: <Moon className="h-4 w-4 fill-yellow-500 text-yellow-500" />,
  },
  {
    value: "dnd",
    label: "Do Not Disturb",
    description: "Notifications are paused",
    icon: <MinusCircle className="h-4 w-4 fill-red-500 text-red-500" />,
  },
  {
    value: "offline",
    label: "Invisible",
    description: "You appear as offline",
    icon: <CircleOff className="h-4 w-4 text-gray-500" />,
  },
];

const autoOption = {
  value: "auto" as const,
  label: "Auto",
  description: "Based on your activity",
  icon: <Sparkles className="h-4 w-4 text-primary" />,
};

// ============================================================================
// PresenceSelector Component
// ============================================================================

const PresenceSelector = React.forwardRef<
  HTMLDivElement,
  PresenceSelectorProps
>(
  (
    {
      className,
      value = "online",
      onChange,
      showAutoOption = true,
      variant = "dropdown",
      size = "md",
      ...props
    },
    ref,
  ) => {
    const setMyPresence = useUserStore((state) => state.setMyPresence);
    const [isAuto, setIsAuto] = React.useState(false);

    const handleChange = (newValue: PresenceStatus | "auto") => {
      if (newValue === "auto") {
        setIsAuto(true);
        // Auto mode: set to online for now (could be based on activity)
        const autoPresence = "online";
        onChange?.(autoPresence);
        setMyPresence(autoPresence);
      } else {
        setIsAuto(false);
        onChange?.(newValue);
        setMyPresence(newValue);
      }
    };

    const options = showAutoOption
      ? [autoOption, ...presenceOptions]
      : presenceOptions;

    const currentOption =
      presenceOptions.find((opt) => opt.value === value) ?? presenceOptions[0];

    // Dropdown variant
    if (variant === "dropdown") {
      return (
        <div ref={ref} className={className} {...props}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size={size === "sm" ? "sm" : size === "lg" ? "lg" : "default"}
                className="justify-between"
              >
                <div className="flex items-center gap-2">
                  <UserPresenceDot
                    status={value}
                    size={size === "sm" ? "xs" : "sm"}
                    position="inline"
                    animate={false}
                  />
                  <span>{isAuto ? "Auto" : currentOption.label}</span>
                </div>
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {showAutoOption && (
                <>
                  <DropdownMenuItem
                    onClick={() => handleChange("auto")}
                    className="flex items-center gap-3"
                  >
                    {autoOption.icon}
                    <div className="flex flex-col">
                      <span className="font-medium">{autoOption.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {autoOption.description}
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {presenceOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => handleChange(option.value as PresenceStatus)}
                  className="flex items-center gap-3"
                >
                  <UserPresenceDot
                    status={option.value as PresenceStatus}
                    size="sm"
                    position="inline"
                    animate={false}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    }

    // Radio variant
    if (variant === "radio") {
      return (
        <div ref={ref} className={className} {...props}>
          <RadioGroup
            value={isAuto ? "auto" : value}
            onValueChange={(val) =>
              handleChange(val as PresenceStatus | "auto")
            }
            className="space-y-2"
          >
            {options.map((option) => (
              <div
                key={option.value}
                className="flex cursor-pointer items-center space-x-3 rounded-md p-2 hover:bg-muted"
              >
                <RadioGroupItem value={option.value} id={option.value} />
                <Label
                  htmlFor={option.value}
                  className="flex flex-1 cursor-pointer items-center gap-3"
                >
                  {option.value === "auto" ? (
                    option.icon
                  ) : (
                    <UserPresenceDot
                      status={option.value as PresenceStatus}
                      size="md"
                      position="inline"
                      animate={false}
                    />
                  )}
                  <div className="flex flex-col">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      );
    }

    // Buttons variant
    return (
      <div
        ref={ref}
        className={cn("flex flex-wrap gap-2", className)}
        {...props}
      >
        {options.map((option) => (
          <Button
            key={option.value}
            variant={
              (isAuto && option.value === "auto") ||
              (!isAuto && option.value === value)
                ? "default"
                : "outline"
            }
            size={size === "sm" ? "sm" : size === "lg" ? "lg" : "default"}
            onClick={() =>
              handleChange(option.value as PresenceStatus | "auto")
            }
            className="gap-2"
          >
            {option.value === "auto" ? (
              option.icon
            ) : (
              <UserPresenceDot
                status={option.value as PresenceStatus}
                size="sm"
                position="inline"
                animate={false}
              />
            )}
            <span>{option.label}</span>
          </Button>
        ))}
      </div>
    );
  },
);
PresenceSelector.displayName = "PresenceSelector";

export { PresenceSelector };
