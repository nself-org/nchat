"use client";

import { memo } from "react";
import { Clock, Check, CheckCheck, AlertCircle, RefreshCw } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

/**
 * Message delivery status states
 */
export type DeliveryStatusType =
  | "sending" // Message is being sent to server
  | "sent" // Server received the message
  | "delivered" // Recipient's device received (for DMs)
  | "read" // Recipient opened the chat
  | "failed"; // Message failed to send

export interface DeliveryStatusProps {
  /** Current delivery status */
  status: DeliveryStatusType;
  /** Whether this is a direct message (affects delivery/read semantics) */
  isDirectMessage?: boolean;
  /** Number of recipients who have read (for group chats) */
  readCount?: number;
  /** Total number of recipients (for group chats) */
  totalRecipients?: number;
  /** Callback for retry action (when failed) */
  onRetry?: () => void;
  /** Error message (when failed) */
  errorMessage?: string;
  /** Size variant */
  size?: "sm" | "default" | "lg";
  /** Whether to show tooltip */
  showTooltip?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Status Configuration
// ============================================================================

const statusConfig: Record<
  DeliveryStatusType,
  {
    icon: typeof Clock;
    label: string;
    description: string;
    color: string;
    colorFilled?: string;
  }
> = {
  sending: {
    icon: Clock,
    label: "Sending",
    description: "Message is being sent...",
    color: "text-muted-foreground",
  },
  sent: {
    icon: Check,
    label: "Sent",
    description: "Message sent to server",
    color: "text-muted-foreground",
  },
  delivered: {
    icon: CheckCheck,
    label: "Delivered",
    description: "Message delivered to recipient",
    color: "text-muted-foreground",
  },
  read: {
    icon: CheckCheck,
    label: "Read",
    description: "Message has been read",
    color: "text-primary",
    colorFilled: "text-primary fill-primary",
  },
  failed: {
    icon: AlertCircle,
    label: "Failed",
    description: "Message failed to send",
    color: "text-destructive",
  },
};

const sizeConfig = {
  sm: { icon: "h-3 w-3", container: "gap-0.5" },
  default: { icon: "h-4 w-4", container: "gap-1" },
  lg: { icon: "h-5 w-5", container: "gap-1.5" },
};

// ============================================================================
// Component
// ============================================================================

/**
 * Delivery Status Component
 *
 * Shows the delivery status of a message with appropriate icons:
 * - Sending: Clock icon (spinning)
 * - Sent: Single check
 * - Delivered: Double check (gray)
 * - Read: Double check (blue/filled)
 * - Failed: Exclamation with retry option
 */
export const DeliveryStatus = memo(function DeliveryStatus({
  status,
  isDirectMessage = false,
  readCount,
  totalRecipients,
  onRetry,
  errorMessage,
  size = "default",
  showTooltip = true,
  className,
}: DeliveryStatusProps) {
  const config = statusConfig[status];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  // Build tooltip content
  const getTooltipContent = () => {
    if (status === "failed") {
      return (
        <div className="space-y-1">
          <p className="font-medium text-destructive">{config.label}</p>
          {errorMessage && <p className="text-xs">{errorMessage}</p>}
          {onRetry && <p className="text-xs text-primary">Click to retry</p>}
        </div>
      );
    }

    if (
      status === "read" &&
      !isDirectMessage &&
      readCount !== undefined &&
      totalRecipients
    ) {
      return (
        <div className="space-y-1">
          <p className="font-medium">{config.label}</p>
          <p className="text-xs text-muted-foreground">
            Read by {readCount} of {totalRecipients} recipient
            {totalRecipients !== 1 ? "s" : ""}
          </p>
        </div>
      );
    }

    return (
      <div>
        <p className="font-medium">{config.label}</p>
        <p className="text-xs text-muted-foreground">{config.description}</p>
      </div>
    );
  };

  const isRetryable = status === "failed" && onRetry;

  const iconElement = isRetryable ? (
    <span
      className={cn(
        "inline-flex cursor-pointer items-center hover:opacity-80",
        sizeStyles.container,
        config.color,
        className,
      )}
      onClick={onRetry}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onRetry?.();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={config.label}
    >
      <Icon className={sizeStyles.icon} />
    </span>
  ) : (
    <span
      className={cn(
        "inline-flex items-center",
        sizeStyles.container,
        status === "read" ? config.colorFilled || config.color : config.color,
        status === "sending" && "animate-pulse",
        className,
      )}
      aria-label={config.label}
    >
      <Icon
        className={cn(sizeStyles.icon, status === "sending" && "animate-spin")}
      />
    </span>
  );

  if (!showTooltip) {
    return iconElement;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>{iconElement}</TooltipTrigger>
        <TooltipContent side="top" align="end">
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

// ============================================================================
// Status Badge Variant
// ============================================================================

export interface DeliveryStatusBadgeProps {
  /** Current delivery status */
  status: DeliveryStatusType;
  /** Show label text alongside icon */
  showLabel?: boolean;
  /** Size variant */
  size?: "sm" | "default";
  /** Additional CSS classes */
  className?: string;
}

/**
 * Delivery Status Badge
 *
 * A badge-style variant that can optionally show a label
 */
export const DeliveryStatusBadge = memo(function DeliveryStatusBadge({
  status,
  showLabel = false,
  size = "default",
  className,
}: DeliveryStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full",
        status === "failed"
          ? "bg-destructive/10 text-destructive"
          : status === "read"
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs",
        className,
      )}
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
});

// ============================================================================
// Inline Status for Message Footer
// ============================================================================

export interface InlineDeliveryStatusProps {
  /** Current delivery status */
  status: DeliveryStatusType;
  /** Timestamp to show alongside status */
  timestamp?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Inline Delivery Status
 *
 * Compact status indicator for message footers, showing timestamp + status
 */
export const InlineDeliveryStatus = memo(function InlineDeliveryStatus({
  status,
  timestamp,
  className,
}: InlineDeliveryStatusProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs text-muted-foreground",
        className,
      )}
    >
      {timestamp && <span>{timestamp}</span>}
      <Icon
        className={cn(
          "h-3 w-3",
          status === "read" && "text-primary",
          status === "failed" && "text-destructive",
          status === "sending" && "animate-spin",
        )}
      />
    </span>
  );
});

export default DeliveryStatus;
