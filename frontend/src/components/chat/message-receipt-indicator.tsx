/**
 * Message Receipt Indicator - Platform-specific delivery/read status display
 *
 * Renders message status indicators matching WhatsApp, Telegram, Signal,
 * Slack, and Discord visual styles.
 *
 * @module components/chat/message-receipt-indicator
 * @version 1.0.0
 */

"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  XCircle,
  Circle,
  CheckCircle,
  CheckCircle2,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type PlatformPreset,
  type DeliveryStatus,
  type PlatformPresenceConfig,
  getPlatformConfig,
  getDeliveryStatusIcon,
  getDeliveryStatusColor,
} from "@/lib/presence/platform-presence";

// ============================================================================
// TYPES
// ============================================================================

export interface MessageReceiptIndicatorProps {
  /** Delivery status */
  status: DeliveryStatus;

  /** Platform preset for styling */
  platform?: PlatformPreset;

  /** Custom configuration */
  config?: PlatformPresenceConfig;

  /** Size of the indicator */
  size?: "sm" | "md" | "lg";

  /** Whether to animate status changes */
  animated?: boolean;

  /** Show tooltip on hover */
  showTooltip?: boolean;

  /** Additional CSS classes */
  className?: string;
}

export interface GroupReceiptIndicatorProps {
  /** Delivery status */
  status: DeliveryStatus;

  /** Users who have read the message */
  readBy: Array<{
    userId: string;
    userName: string;
    userAvatar?: string;
    readAt: Date;
  }>;

  /** Total recipients */
  totalRecipients: number;

  /** Platform preset for styling */
  platform?: PlatformPreset;

  /** Max avatars to show */
  maxAvatars?: number;

  /** Whether to show "Seen by X" text */
  showSeenByText?: boolean;

  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// ICON MAPPING
// ============================================================================

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  clock: Clock,
  check: Check,
  "check-check": CheckCheck,
  "alert-circle": AlertCircle,
  "x-circle": XCircle,
  circle: Circle,
  "circle-check": CheckCircle,
  "circle-check-filled": CheckCircle2,
  eye: Eye,
  "alert-triangle": AlertTriangle,
  x: XCircle,
};

const sizeClasses = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

// ============================================================================
// STATUS LABELS
// ============================================================================

const statusLabels: Record<DeliveryStatus, string> = {
  pending: "Sending...",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
  failed: "Failed to send",
};

// ============================================================================
// SINGLE MESSAGE INDICATOR
// ============================================================================

/**
 * Message receipt indicator for single messages
 *
 * Displays checkmarks/icons based on platform style
 */
export function MessageReceiptIndicator({
  status,
  platform = "default",
  config: customConfig,
  size = "sm",
  animated = true,
  showTooltip = true,
  className,
}: MessageReceiptIndicatorProps) {
  const config = useMemo(() => {
    return customConfig ?? getPlatformConfig(platform);
  }, [customConfig, platform]);

  // Don't render if receipts are disabled
  if (!config.receipts.enabled) {
    return null;
  }

  // Don't show delivery status if platform doesn't support it
  if (
    !config.receipts.showDeliveryStatus &&
    status !== "read" &&
    status !== "failed"
  ) {
    return null;
  }

  // Don't show read status if platform doesn't support it
  if (!config.receipts.showReadStatus && status === "read") {
    return null;
  }

  const iconName = getDeliveryStatusIcon(status, config);
  const color = getDeliveryStatusColor(status, config);
  const Icon = iconMap[iconName] ?? Check;

  const indicator = (
    <motion.span
      initial={animated ? { scale: 0.8, opacity: 0 } : undefined}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.15 }}
      className={cn("inline-flex items-center", className)}
      style={{ color }}
      aria-label={statusLabels[status]}
    >
      <Icon className={cn(sizeClasses[size])} />
    </motion.span>
  );

  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>{indicator}</TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {statusLabels[status]}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return indicator;
}

// ============================================================================
// GROUP MESSAGE INDICATOR
// ============================================================================

/**
 * Group message receipt indicator
 *
 * Shows avatars of readers and "Seen by X" text
 */
export function GroupReceiptIndicator({
  status,
  readBy,
  totalRecipients,
  platform = "default",
  maxAvatars,
  showSeenByText = true,
  className,
}: GroupReceiptIndicatorProps) {
  const config = useMemo(() => getPlatformConfig(platform), [platform]);

  // Don't render if platform doesn't support group receipts
  if (!config.receipts.groupReceipts) {
    return null;
  }

  // Don't render if no one has read
  if (readBy.length === 0) {
    return status !== "read" ? (
      <MessageReceiptIndicator status={status} platform={platform} size="sm" />
    ) : null;
  }

  const effectiveMaxAvatars = maxAvatars ?? config.receipts.maxReadersDisplayed;
  const displayedReaders = readBy.slice(0, effectiveMaxAvatars);
  const remainingCount = Math.max(0, readBy.length - effectiveMaxAvatars);
  const allRead = readBy.length >= totalRecipients;

  // Format "Seen by" text
  const getSeenByLabel = () => {
    if (!showSeenByText || !config.receipts.style.showSeenByText) {
      return null;
    }

    if (allRead) {
      return "Seen by everyone";
    }

    const names = displayedReaders.map((r) => r.userName);
    if (names.length === 1) {
      return `Seen by ${names[0]}`;
    }

    if (remainingCount === 0) {
      return `Seen by ${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
    }

    return `Seen by ${names.join(", ")} and ${remainingCount} other${remainingCount > 1 ? "s" : ""}`;
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Reader avatars */}
      {config.receipts.style.showReaderAvatars && effectiveMaxAvatars > 0 && (
        <div className="flex -space-x-1.5">
          <AnimatePresence mode="popLayout">
            {displayedReaders.map((reader, index) => (
              <motion.div
                key={reader.userId}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <TooltipProvider>
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <Avatar className="h-4 w-4 border border-background">
                        <AvatarImage
                          src={reader.userAvatar}
                          alt={reader.userName}
                        />
                        <AvatarFallback className="text-[8px]">
                          {reader.userName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p>{reader.userName}</p>
                      <p className="text-muted-foreground">
                        {reader.readAt.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </motion.div>
            ))}
          </AnimatePresence>
          {remainingCount > 0 && (
            <div className="flex h-4 w-4 items-center justify-center rounded-full border border-background bg-muted text-[8px]">
              +{remainingCount}
            </div>
          )}
        </div>
      )}

      {/* Seen by text */}
      {getSeenByLabel() && (
        <span className="text-[10px] text-muted-foreground">
          {getSeenByLabel()}
        </span>
      )}

      {/* All read indicator */}
      {allRead && <CheckCheck className="h-3 w-3 text-green-500" />}
    </div>
  );
}

// ============================================================================
// PLATFORM-SPECIFIC INDICATORS
// ============================================================================

/**
 * WhatsApp-style receipt indicator
 *
 * Single gray check = sent
 * Double gray checks = delivered
 * Double blue checks = read
 */
export function WhatsAppReceiptIndicator({
  status,
  className,
}: {
  status: DeliveryStatus;
  className?: string;
}) {
  return (
    <MessageReceiptIndicator
      status={status}
      platform="whatsapp"
      size="sm"
      className={className}
    />
  );
}

/**
 * Telegram-style receipt indicator
 *
 * Single check = sent
 * Double checks = delivered
 * Double green checks = read (only in DMs)
 */
export function TelegramReceiptIndicator({
  status,
  isGroupChat = false,
  className,
}: {
  status: DeliveryStatus;
  isGroupChat?: boolean;
  className?: string;
}) {
  // Telegram doesn't show read receipts in groups
  if (isGroupChat && status === "read") {
    return (
      <MessageReceiptIndicator
        status="delivered"
        platform="telegram"
        size="sm"
        className={className}
      />
    );
  }

  return (
    <MessageReceiptIndicator
      status={status}
      platform="telegram"
      size="sm"
      className={className}
    />
  );
}

/**
 * Signal-style receipt indicator
 *
 * Privacy-focused, minimal design
 * Filled circles instead of checkmarks
 */
export function SignalReceiptIndicator({
  status,
  className,
}: {
  status: DeliveryStatus;
  className?: string;
}) {
  return (
    <MessageReceiptIndicator
      status={status}
      platform="signal"
      size="sm"
      className={className}
    />
  );
}

/**
 * Slack-style receipt indicator
 *
 * Shows "Seen by X" text with avatars
 */
export function SlackReceiptIndicator({
  readBy,
  totalRecipients,
  className,
}: {
  readBy: Array<{
    userId: string;
    userName: string;
    userAvatar?: string;
    readAt: Date;
  }>;
  totalRecipients: number;
  className?: string;
}) {
  if (readBy.length === 0) {
    return null;
  }

  return (
    <GroupReceiptIndicator
      status="read"
      readBy={readBy}
      totalRecipients={totalRecipients}
      platform="slack"
      className={className}
    />
  );
}

/**
 * Discord-style receipt indicator
 *
 * Discord doesn't show read receipts in servers
 * Only shows in DMs (minimal)
 */
export function DiscordReceiptIndicator({
  status,
  isDM = false,
  className,
}: {
  status: DeliveryStatus;
  isDM?: boolean;
  className?: string;
}) {
  // Discord only shows receipts in DMs
  if (!isDM) {
    return null;
  }

  // Only show for failed status in DMs
  if (status === "failed") {
    return (
      <span className={cn("text-destructive", className)}>
        <XCircle className="h-3 w-3" />
      </span>
    );
  }

  return null;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default MessageReceiptIndicator;
