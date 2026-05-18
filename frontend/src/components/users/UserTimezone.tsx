"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Clock, Sun, Moon, Sunrise, Sunset } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface UserTimezoneProps extends React.HTMLAttributes<HTMLDivElement> {
  timezone: string;
  showLocalTime?: boolean;
  showDifference?: boolean;
}

// ============================================================================
// Helper: Get time of day icon
// ============================================================================

function getTimeOfDayIcon(hour: number): React.ReactNode {
  const iconProps = { className: "h-4 w-4" };
  if (hour >= 6 && hour < 9) return <Sunrise {...iconProps} />;
  if (hour >= 9 && hour < 17) return <Sun {...iconProps} />;
  if (hour >= 17 && hour < 20) return <Sunset {...iconProps} />;
  return <Moon {...iconProps} />;
}

function getTimeOfDayLabel(hour: number): string {
  if (hour >= 5 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 17) return "Afternoon";
  if (hour >= 17 && hour < 21) return "Evening";
  return "Night";
}

// ============================================================================
// Component
// ============================================================================

const UserTimezone = React.forwardRef<HTMLDivElement, UserTimezoneProps>(
  (
    {
      className,
      timezone,
      showLocalTime = true,
      showDifference = true,
      ...props
    },
    ref,
  ) => {
    const [currentTime, setCurrentTime] = React.useState<Date | null>(null);

    // Update time every minute
    React.useEffect(() => {
      const updateTime = () => {
        setCurrentTime(new Date());
      };

      updateTime();
      const interval = setInterval(updateTime, 60000);

      return () => clearInterval(interval);
    }, []);

    if (!currentTime) {
      return (
        <div
          ref={ref}
          className={cn("flex items-center gap-3", className)}
          {...props}
        >
          <div className="flex h-10 w-10 animate-pulse items-center justify-center rounded-lg bg-muted" />
          <div className="space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          </div>
        </div>
      );
    }

    // Get user's local time in their timezone
    let userTime: Date;
    let userTimeString: string;
    let hour: number;

    try {
      userTimeString = currentTime.toLocaleTimeString("en-US", {
        timeZone: timezone,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const tempDate = new Date(
        currentTime.toLocaleString("en-US", { timeZone: timezone }),
      );
      hour = tempDate.getHours();
      userTime = tempDate;
    } catch {
      // Fallback if timezone is invalid
      userTimeString = currentTime.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      hour = currentTime.getHours();
      userTime = currentTime;
    }

    // Calculate time difference from viewer's timezone
    let timeDiffString = "";
    if (showDifference) {
      try {
        const viewerOffset = currentTime.getTimezoneOffset();
        const userOffset =
          new Date(
            currentTime.toLocaleString("en-US", { timeZone: timezone }),
          ).getTime() - currentTime.getTime();
        const diffMinutes = Math.round(userOffset / 60000 + viewerOffset);
        const diffHours = Math.round(diffMinutes / 60);

        if (diffHours === 0) {
          timeDiffString = "Same as you";
        } else if (diffHours > 0) {
          timeDiffString = `${diffHours}h ahead`;
        } else {
          timeDiffString = `${Math.abs(diffHours)}h behind`;
        }
      } catch {
        timeDiffString = "";
      }
    }

    // Format timezone name
    const timezoneName = timezone.replace(/_/g, " ").replace(/\//g, " / ");

    return (
      <div
        ref={ref}
        className={cn("flex items-center gap-3", className)}
        {...props}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          {getTimeOfDayIcon(hour)}
        </div>
        <div>
          {showLocalTime && (
            <div className="flex items-center gap-2">
              <span className="font-medium">{userTimeString}</span>
              <span className="text-xs text-muted-foreground">
                ({getTimeOfDayLabel(hour)})
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{timezoneName}</span>
            {timeDiffString && (
              <>
                <span className="text-muted-foreground/50">|</span>
                <span>{timeDiffString}</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  },
);
UserTimezone.displayName = "UserTimezone";

export { UserTimezone };
