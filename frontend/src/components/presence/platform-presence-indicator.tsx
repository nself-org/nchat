/**
 * Platform Presence Indicator - User presence dot and status display
 *
 * Renders presence indicators matching WhatsApp, Telegram, Signal,
 * Slack, and Discord visual styles.
 *
 * @module components/presence/platform-presence-indicator
 * @version 1.0.0
 */

"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type PlatformPreset,
  type PresenceStatus,
  getPlatformConfig,
  getPresenceColor,
  formatLastSeen,
} from "@/lib/presence/platform-presence";
import { usePresenceStatus } from "@/hooks/use-platform-presence";

// ============================================================================
// TYPES
// ============================================================================

export interface PresenceIndicatorProps {
  /** User ID to show presence for */
  userId?: string;

  /** Direct status (if not using userId) */
  status?: PresenceStatus;

  /** Last seen timestamp */
  lastSeenAt?: Date;

  /** Platform preset for styling */
  platform?: PlatformPreset;

  /** Size of the indicator */
  size?: "xs" | "sm" | "md" | "lg";

  /** Position relative to avatar */
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";

  /** Whether to show tooltip */
  showTooltip?: boolean;

  /** Whether to animate status changes */
  animated?: boolean;

  /** Whether to show when offline */
  showOffline?: boolean;

  /** Whether this is a Slack-style "active" indicator */
  slackStyle?: boolean;

  /** Additional CSS classes */
  className?: string;
}

export interface PresenceStatusBadgeProps {
  /** User ID or direct status */
  userId?: string;
  status?: PresenceStatus;

  /** Custom status text */
  customStatusText?: string;

  /** Custom status emoji */
  customStatusEmoji?: string;

  /** Platform preset */
  platform?: PlatformPreset;

  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// SIZE MAPPINGS
// ============================================================================

const sizeClasses = {
  xs: "h-2 w-2",
  sm: "h-2.5 w-2.5",
  md: "h-3 w-3",
  lg: "h-4 w-4",
};

const borderSizes = {
  xs: "border",
  sm: "border",
  md: "border-2",
  lg: "border-2",
};

const positionClasses = {
  "bottom-right": "bottom-0 right-0",
  "bottom-left": "bottom-0 left-0",
  "top-right": "top-0 right-0",
  "top-left": "top-0 left-0",
};

// ============================================================================
// STATUS LABELS
// ============================================================================

const statusLabels: Record<PresenceStatus, string> = {
  online: "Online",
  away: "Away",
  busy: "Busy",
  dnd: "Do Not Disturb",
  invisible: "Invisible",
  offline: "Offline",
};

// ============================================================================
// PRESENCE INDICATOR
// ============================================================================

/**
 * Presence indicator dot component
 *
 * Shows a colored dot indicating user's presence status
 */
export function PresenceIndicator({
  userId,
  status: directStatus,
  lastSeenAt,
  platform = "default",
  size = "sm",
  position = "bottom-right",
  showTooltip = true,
  animated = true,
  showOffline = false,
  slackStyle = false,
  className,
}: PresenceIndicatorProps) {
  // Get presence from store if userId provided
  const presenceFromStore = usePresenceStatus(userId ?? "", platform);

  // Use direct status or store status
  const status = directStatus ?? presenceFromStore.status;
  const effectiveLastSeen = lastSeenAt ?? (userId ? undefined : undefined);

  const config = useMemo(() => getPlatformConfig(platform), [platform]);

  // Don't show if presence display is disabled
  if (!config.presence.showOnline) {
    return null;
  }

  // Don't show offline indicator unless explicitly requested
  if (status === "offline" && !showOffline) {
    return null;
  }

  // Don't show invisible status
  if (status === "invisible") {
    return null;
  }

  const color = getPresenceColor(status, platform);
  const label = statusLabels[status];

  // Slack-style uses a filled circle with border
  const slackIndicator = slackStyle && (
    <span
      className={cn(
        "absolute rounded-full bg-background",
        positionClasses[position],
        sizeClasses[size],
        borderSizes[size],
        className,
      )}
    >
      <span
        className={cn("block h-full w-full rounded-full")}
        style={{ backgroundColor: color }}
      />
    </span>
  );

  // Regular presence dot
  const regularIndicator = (
    <AnimatePresence mode="wait">
      <motion.span
        key={status}
        initial={animated ? { scale: 0, opacity: 0 } : undefined}
        animate={{ scale: 1, opacity: 1 }}
        exit={animated ? { scale: 0, opacity: 0 } : undefined}
        transition={{ duration: 0.15, type: "spring" }}
        className={cn(
          "absolute rounded-full border-background",
          positionClasses[position],
          sizeClasses[size],
          borderSizes[size],
          className,
        )}
        style={{ backgroundColor: color }}
        aria-label={label}
      >
        {/* Pulse animation for online status */}
        {status === "online" && animated && (
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: color }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.7, 0, 0.7],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
      </motion.span>
    </AnimatePresence>
  );

  const indicator = slackStyle ? slackIndicator : regularIndicator;

  // Tooltip content
  const tooltipContent = (
    <>
      <p className="font-medium">{label}</p>
      {effectiveLastSeen && status !== "online" && (
        <p className="text-muted-foreground">
          {formatLastSeen(effectiveLastSeen, platform)}
        </p>
      )}
    </>
  );

  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>{indicator}</TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return indicator;
}

// ============================================================================
// PRESENCE STATUS BADGE
// ============================================================================

/**
 * Full presence status badge with text
 *
 * Shows status text and optional custom status
 */
export function PresenceStatusBadge({
  userId,
  status: directStatus,
  customStatusText,
  customStatusEmoji,
  platform = "default",
  className,
}: PresenceStatusBadgeProps) {
  const presenceFromStore = usePresenceStatus(userId ?? "", platform);

  const status = directStatus ?? presenceFromStore.status;
  const statusText = customStatusText ?? presenceFromStore.customStatus?.text;
  const statusEmoji =
    customStatusEmoji ?? presenceFromStore.customStatus?.emoji;

  const color = getPresenceColor(status, platform);
  const label = statusLabels[status];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Status dot */}
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />

      {/* Status label */}
      <span className="text-sm font-medium">{label}</span>

      {/* Custom status */}
      {(statusEmoji || statusText) && (
        <span className="text-sm text-muted-foreground">
          {statusEmoji && <span className="mr-1">{statusEmoji}</span>}
          {statusText}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// LAST SEEN TEXT
// ============================================================================

export interface LastSeenTextProps {
  /** User ID */
  userId?: string;

  /** Direct last seen timestamp */
  lastSeenAt?: Date;

  /** Whether user is online */
  isOnline?: boolean;

  /** Platform preset */
  platform?: PlatformPreset;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Last seen text component
 *
 * Shows "online" or "last seen X ago" based on platform style
 */
export function LastSeenText({
  userId,
  lastSeenAt: directLastSeen,
  isOnline: directIsOnline,
  platform = "default",
  className,
}: LastSeenTextProps) {
  const presenceFromStore = usePresenceStatus(userId ?? "", platform);
  const config = useMemo(() => getPlatformConfig(platform), [platform]);

  // Use direct values or store values
  const isOnline = directIsOnline ?? presenceFromStore.isOnline;
  const lastSeen = directLastSeen ?? undefined;

  // Don't show if last seen is disabled
  if (!config.presence.showLastSeen && !config.presence.showOnline) {
    return null;
  }

  // If online and platform shows online status
  if (isOnline && config.presence.showOnline) {
    const onlineText = platform === "slack" ? "Active" : "online";
    return (
      <span className={cn("text-green-600", className)}>{onlineText}</span>
    );
  }

  // If last seen is available and platform shows it
  if (lastSeen && config.presence.showLastSeen) {
    return (
      <span className={cn("text-muted-foreground", className)}>
        {formatLastSeen(lastSeen, platform)}
      </span>
    );
  }

  // Fallback for Telegram-style approximations
  if (platform === "telegram" && !isOnline) {
    return (
      <span className={cn("text-muted-foreground", className)}>
        last seen recently
      </span>
    );
  }

  return null;
}

// ============================================================================
// PLATFORM-SPECIFIC COMPONENTS
// ============================================================================

/**
 * WhatsApp-style presence display
 */
export function WhatsAppPresence({
  isOnline,
  lastSeenAt,
  className,
}: {
  isOnline: boolean;
  lastSeenAt?: Date;
  className?: string;
}) {
  if (isOnline) {
    return (
      <span className={cn("text-green-600 text-sm", className)}>online</span>
    );
  }

  if (lastSeenAt) {
    return (
      <span className={cn("text-muted-foreground text-sm", className)}>
        {formatLastSeen(lastSeenAt, "whatsapp")}
      </span>
    );
  }

  return null;
}

/**
 * Telegram-style presence display with approximations
 */
export function TelegramPresence({
  isOnline,
  lastSeenAt,
  privacyLevel = "everyone",
  className,
}: {
  isOnline: boolean;
  lastSeenAt?: Date;
  privacyLevel?: "everyone" | "contacts" | "nobody";
  className?: string;
}) {
  if (isOnline) {
    return (
      <span className={cn("text-primary text-sm", className)}>online</span>
    );
  }

  // If privacy is set to nobody, show nothing
  if (privacyLevel === "nobody") {
    return null;
  }

  return (
    <span className={cn("text-muted-foreground text-sm", className)}>
      {formatLastSeen(lastSeenAt, "telegram")}
    </span>
  );
}

/**
 * Slack-style presence indicator
 */
export function SlackPresence({
  status,
  customStatusEmoji,
  customStatusText,
  className,
}: {
  status: PresenceStatus;
  customStatusEmoji?: string;
  customStatusText?: string;
  className?: string;
}) {
  const color = getPresenceColor(status, "slack");
  const activeText =
    status === "online"
      ? "Active"
      : status === "away"
        ? "Away"
        : "Do Not Disturb";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Green/yellow/red dot */}
      <span
        className="h-2.5 w-2.5 rounded-full border-2 border-background"
        style={{ backgroundColor: color }}
      />

      {/* Status text or custom status */}
      {customStatusEmoji || customStatusText ? (
        <span className="text-sm text-muted-foreground">
          {customStatusEmoji && (
            <span className="mr-1">{customStatusEmoji}</span>
          )}
          {customStatusText}
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">{activeText}</span>
      )}
    </div>
  );
}

/**
 * Discord-style presence indicator with activity
 */
export function DiscordPresence({
  status,
  activity,
  customStatusEmoji,
  customStatusText,
  className,
}: {
  status: PresenceStatus;
  activity?: {
    type: "playing" | "listening" | "watching" | "streaming";
    name: string;
    details?: string;
  };
  customStatusEmoji?: string;
  customStatusText?: string;
  className?: string;
}) {
  const color = getPresenceColor(status, "discord");

  const activityLabels = {
    playing: "Playing",
    listening: "Listening to",
    watching: "Watching",
    streaming: "Streaming",
  };

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {/* Status dot and text */}
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-sm capitalize">
          {status === "dnd" ? "Do Not Disturb" : status}
        </span>
      </div>

      {/* Custom status */}
      {(customStatusEmoji || customStatusText) && (
        <span className="text-xs text-muted-foreground">
          {customStatusEmoji && (
            <span className="mr-1">{customStatusEmoji}</span>
          )}
          {customStatusText}
        </span>
      )}

      {/* Activity */}
      {activity && (
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">{activityLabels[activity.type]}</span>{" "}
          <span>{activity.name}</span>
          {activity.details && (
            <span className="block">{activity.details}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default PresenceIndicator;
