/**
 * PresenceIndicator Component
 *
 * Displays user presence information with:
 * - Status dot with colors (green, yellow, red, gray)
 * - Custom status emoji and text
 * - Last seen timestamp with formatting
 * - Avatar badge overlay
 * - Privacy-aware display
 * - Tooltip with full details
 *
 * @example
 * ```tsx
 * // As avatar badge
 * <PresenceIndicator
 *   userId="user-123"
 *   status="online"
 *   position="bottom-right"
 * />
 *
 * // With custom status
 * <PresenceIndicator
 *   userId="user-123"
 *   status="away"
 *   customStatus={{ emoji: '📅', text: 'In a meeting' }}
 *   showLastSeen
 * />
 *
 * // As standalone indicator
 * <PresenceIndicator
 *   userId="user-123"
 *   status="dnd"
 *   variant="full"
 *   showTooltip
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
  PRESENCE_COLORS,
  formatLastSeen,
  formatDurationRemaining,
} from "@/lib/presence/presence-types";
import { usePresenceStore, selectUserPresence } from "@/stores/presence-store";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserPresenceDot } from "./user-presence-dot";
import { Clock } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface PresenceIndicatorProps {
  /** User ID to show presence for */
  userId: string;
  /** Override presence status (if not using store) */
  status?: PresenceStatus;
  /** Override custom status */
  customStatus?: CustomStatus | null;
  /** Override last seen time */
  lastSeenAt?: Date;
  /** Display variant */
  variant?: "dot" | "badge" | "inline" | "full";
  /** Position for badge variant */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** Size of the indicator */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Show tooltip with details */
  showTooltip?: boolean;
  /** Show last seen timestamp */
  showLastSeen?: boolean;
  /** Show custom status */
  showCustomStatus?: boolean;
  /** Animate online status */
  animate?: boolean;
  /** Respect privacy settings (hide if user has privacy enabled) */
  respectPrivacy?: boolean;
  /** Additional className */
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get display text for presence status
 */
const getStatusDisplay = (
  status: PresenceStatus,
  customStatus?: CustomStatus | null,
  lastSeenAt?: Date,
): { primary: string; secondary?: string } => {
  // If custom status exists, show it
  if (customStatus?.text) {
    const expiryText = customStatus.expiresAt
      ? ` (${formatDurationRemaining(customStatus.expiresAt)} left)`
      : "";

    return {
      primary: `${customStatus.emoji || ""} ${customStatus.text}`.trim(),
      secondary: PRESENCE_LABELS[status] + expiryText,
    };
  }

  // Show status label
  const primary = PRESENCE_LABELS[status];

  // Show last seen for offline/away users
  if (
    (status === "offline" || status === "away" || status === "invisible") &&
    lastSeenAt
  ) {
    return {
      primary,
      secondary: `Last seen ${formatLastSeen(lastSeenAt)}`,
    };
  }

  return { primary };
};

// ============================================================================
// PresenceIndicator Component
// ============================================================================

export const PresenceIndicator = React.forwardRef<
  HTMLDivElement,
  PresenceIndicatorProps
>(
  (
    {
      userId,
      status: statusProp,
      customStatus: customStatusProp,
      lastSeenAt: lastSeenAtProp,
      variant = "dot",
      position = "bottom-right",
      size = "md",
      showTooltip = false,
      showLastSeen = false,
      showCustomStatus = true,
      animate = true,
      respectPrivacy = true,
      className,
    },
    ref,
  ) => {
    // Get presence from store if not provided
    const presenceFromStore = usePresenceStore(selectUserPresence(userId));
    const privacySettings = usePresenceStore((state) => state.settings.privacy);

    // Use props if provided, otherwise use store values
    const status = statusProp ?? presenceFromStore?.status ?? "offline";
    const customStatus = customStatusProp ?? presenceFromStore?.customStatus;
    const lastSeenAt = lastSeenAtProp ?? presenceFromStore?.lastSeenAt;

    // Check privacy settings
    const shouldHidePresence =
      respectPrivacy && !privacySettings.showLastSeen && status === "offline";

    const shouldHideCustomStatus =
      respectPrivacy && !privacySettings.shareActivityStatus;

    // Get display text
    const displayText = getStatusDisplay(
      status,
      shouldHideCustomStatus ? null : customStatus,
      showLastSeen ? lastSeenAt : undefined,
    );

    // Render tooltip content
    const renderTooltipContent = () => (
      <div className="space-y-1">
        <div className="font-medium">{displayText.primary}</div>
        {displayText.secondary && (
          <div className="text-xs opacity-90">{displayText.secondary}</div>
        )}
        {showLastSeen && lastSeenAt && !shouldHidePresence && (
          <div className="flex items-center gap-1 text-xs opacity-75">
            <Clock className="h-3 w-3" />
            {formatLastSeen(lastSeenAt)}
          </div>
        )}
      </div>
    );

    // Render the indicator based on variant
    const renderIndicator = () => {
      // Dot variant - just the presence dot
      if (variant === "dot") {
        return (
          <UserPresenceDot
            status={status}
            size={size}
            position="inline"
            animate={animate && status === "online"}
            className={className}
          />
        );
      }

      // Badge variant - absolute positioned dot (for avatars)
      if (variant === "badge") {
        return (
          <UserPresenceDot
            status={status}
            size={size}
            position={position}
            animate={animate && status === "online"}
            className={className}
          />
        );
      }

      // Inline variant - dot with text
      if (variant === "inline") {
        return (
          <div ref={ref} className={cn("flex items-center gap-2", className)}>
            <UserPresenceDot
              status={status}
              size={size}
              position="inline"
              animate={animate && status === "online"}
            />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">
                {displayText.primary}
              </span>
              {displayText.secondary && (
                <span className="truncate text-xs text-muted-foreground">
                  {displayText.secondary}
                </span>
              )}
            </div>
          </div>
        );
      }

      // Full variant - complete presence card
      return (
        <div
          ref={ref}
          className={cn(
            "flex items-start gap-3 rounded-lg border bg-card p-3",
            className,
          )}
        >
          <UserPresenceDot
            status={status}
            size={size}
            position="inline"
            animate={animate && status === "online"}
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-medium"
                style={{ color: PRESENCE_COLORS[status] }}
              >
                {PRESENCE_LABELS[status]}
              </span>
              {customStatus?.expiresAt && (
                <span className="text-xs text-muted-foreground">
                  {formatDurationRemaining(customStatus.expiresAt)} left
                </span>
              )}
            </div>

            {showCustomStatus &&
              customStatus &&
              (customStatus.text || customStatus.emoji) && (
                <div className="text-sm">
                  {customStatus.emoji && (
                    <span className="mr-1">{customStatus.emoji}</span>
                  )}
                  {customStatus.text && (
                    <span className="text-muted-foreground">
                      {customStatus.text}
                    </span>
                  )}
                </div>
              )}

            {showLastSeen && lastSeenAt && !shouldHidePresence && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{formatLastSeen(lastSeenAt)}</span>
              </div>
            )}
          </div>
        </div>
      );
    };

    const indicator = renderIndicator();

    // Wrap in tooltip if requested
    if (showTooltip) {
      return (
        <TooltipProvider>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>{indicator}</TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              {renderTooltipContent()}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return indicator;
  },
);

PresenceIndicator.displayName = "PresenceIndicator";

// ============================================================================
// Convenience Components
// ============================================================================

/**
 * Avatar badge variant - for overlaying on avatars
 */
export const PresenceBadge: React.FC<
  Omit<PresenceIndicatorProps, "variant">
> = (props) => <PresenceIndicator {...props} variant="badge" />;

/**
 * Inline status variant - for lists and sidebars
 */
export const InlinePresence: React.FC<
  Omit<PresenceIndicatorProps, "variant">
> = (props) => <PresenceIndicator {...props} variant="inline" />;

/**
 * Full status card variant - for profiles
 */
export const PresenceCard: React.FC<Omit<PresenceIndicatorProps, "variant">> = (
  props,
) => <PresenceIndicator {...props} variant="full" />;

export default PresenceIndicator;
