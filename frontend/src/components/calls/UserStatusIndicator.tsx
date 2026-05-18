/**
 * UserStatusIndicator Component
 *
 * Displays user availability status for calls.
 * Shows online, busy, away, DND, and offline states.
 */

"use client";

import { UserStatus } from "@/lib/calls";
import { cn } from "@/lib/utils";
import { Circle, Phone, Moon, MinusCircle, XCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// =============================================================================
// Types
// =============================================================================

export interface UserStatusIndicatorProps {
  status: UserStatus;
  customMessage?: string;
  inCall?: boolean;
  className?: string;
  variant?: "dot" | "badge" | "full";
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function UserStatusIndicator({
  status,
  customMessage,
  inCall = false,
  className,
  variant = "dot",
  size = "md",
  showTooltip = true,
}: UserStatusIndicatorProps) {
  const config = getStatusConfig(status, inCall);

  const sizeClasses = {
    sm: {
      dot: "h-2 w-2",
      icon: "h-3 w-3",
      text: "text-xs",
    },
    md: {
      dot: "h-2.5 w-2.5",
      icon: "h-4 w-4",
      text: "text-sm",
    },
    lg: {
      dot: "h-3 w-3",
      icon: "h-5 w-5",
      text: "text-base",
    },
  };

  const sizes = sizeClasses[size];

  const indicator = (
    <div className={cn("inline-flex items-center gap-2", className)}>
      {variant === "dot" && (
        <span
          className={cn(
            "rounded-full",
            sizes.dot,
            config.dotClassName,
            config.animated && "animate-pulse",
          )}
          aria-label={config.label}
        />
      )}

      {variant === "badge" && (
        <div
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-1",
            config.badgeClassName,
          )}
        >
          {config.icon && (
            <config.icon className={cn(sizes.icon, config.iconClassName)} />
          )}
          <span className={cn(sizes.text, "font-medium")}>
            {customMessage || config.label}
          </span>
        </div>
      )}

      {variant === "full" && (
        <>
          {config.icon ? (
            <config.icon className={cn(sizes.icon, config.iconClassName)} />
          ) : (
            <span
              className={cn(
                "rounded-full",
                sizes.dot,
                config.dotClassName,
                config.animated && "animate-pulse",
              )}
            />
          )}
          <span className={cn(sizes.text, "font-medium", config.textClassName)}>
            {customMessage || config.label}
          </span>
        </>
      )}
    </div>
  );

  if (!showTooltip || variant === "full") {
    return indicator;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{indicator}</TooltipTrigger>
        <TooltipContent>
          <p>{customMessage || config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// =============================================================================
// Status Configuration
// =============================================================================

interface StatusConfig {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  dotClassName: string;
  iconClassName?: string;
  textClassName?: string;
  badgeClassName?: string;
  animated?: boolean;
}

function getStatusConfig(status: UserStatus, inCall: boolean): StatusConfig {
  if (inCall) {
    return {
      label: "In a call",
      icon: Phone,
      dotClassName: "bg-blue-600",
      iconClassName: "text-blue-600",
      textClassName: "text-blue-600",
      badgeClassName:
        "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
      animated: true,
    };
  }

  const configs: Record<UserStatus, StatusConfig> = {
    online: {
      label: "Available",
      dotClassName: "bg-green-600",
      iconClassName: "text-green-600",
      textClassName: "text-green-600",
      badgeClassName:
        "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
    },
    busy: {
      label: "Busy",
      icon: MinusCircle,
      dotClassName: "bg-red-600",
      iconClassName: "text-red-600",
      textClassName: "text-red-600",
      badgeClassName:
        "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    },
    away: {
      label: "Away",
      icon: Moon,
      dotClassName: "bg-yellow-600",
      iconClassName: "text-yellow-600",
      textClassName: "text-yellow-600",
      badgeClassName:
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
    },
    dnd: {
      label: "Do Not Disturb",
      icon: MinusCircle,
      dotClassName: "bg-red-600",
      iconClassName: "text-red-600",
      textClassName: "text-red-600",
      badgeClassName:
        "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    },
    offline: {
      label: "Offline",
      icon: XCircle,
      dotClassName: "bg-gray-400",
      iconClassName: "text-gray-400",
      textClassName: "text-gray-400",
      badgeClassName:
        "bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-300",
    },
  };

  return configs[status];
}

// =============================================================================
// Status Menu Component
// =============================================================================

export interface UserStatusMenuProps {
  currentStatus: UserStatus;
  onStatusChange: (status: UserStatus, message?: string) => void;
  className?: string;
}

export function UserStatusMenu({
  currentStatus,
  onStatusChange,
  className,
}: UserStatusMenuProps) {
  const statuses: Array<{
    status: UserStatus;
    label: string;
    description: string;
  }> = [
    {
      status: "online",
      label: "Available",
      description: "Available for calls",
    },
    {
      status: "busy",
      label: "Busy",
      description: "Not available",
    },
    {
      status: "away",
      label: "Away",
      description: "Away from keyboard",
    },
    {
      status: "dnd",
      label: "Do Not Disturb",
      description: "Block all notifications",
    },
    {
      status: "offline",
      label: "Appear Offline",
      description: "Invisible to others",
    },
  ];

  return (
    <div className={cn("space-y-1", className)}>
      {statuses.map(({ status, label, description }) => (
        <button
          key={status}
          onClick={() => onStatusChange(status)}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2",
            "transition-colors hover:bg-accent",
            currentStatus === status && "bg-accent",
          )}
        >
          <UserStatusIndicator
            status={status}
            variant="dot"
            size="md"
            showTooltip={false}
          />
          <div className="flex-1 text-left">
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          {currentStatus === status && (
            <Circle className="h-2 w-2 fill-current" />
          )}
        </button>
      ))}
    </div>
  );
}
