"use client";

/**
 * Message Delivery Status Indicator
 *
 * Displays delivery status with checkmark icons:
 * - Sending: Clock icon (animated)
 * - Sent: Single check
 * - Delivered: Double check (gray)
 * - Read: Double check (blue/primary)
 * - Failed: Red X with retry option
 */

import { memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, CheckCheck, Clock, AlertCircle, RefreshCw } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useMessageStatus,
  useShowDeliveryStatus,
} from "@/lib/messages/use-message-status";
import {
  type DeliveryStatus,
  getStatusDescription,
  calculateReadPercentage,
} from "@/lib/messages/delivery-status";
import { format } from "date-fns";

// ============================================================================
// Types
// ============================================================================

export interface MessageDeliveryStatusProps {
  /** Message ID */
  messageId: string;
  /** Message author user ID */
  messageUserId: string;
  /** Current user ID */
  currentUserId: string;
  /** Message created timestamp */
  messageCreatedAt: Date;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Whether to show detailed tooltip */
  showTooltip?: boolean;
  /** Whether to show read receipts count */
  showReadCount?: boolean;
  /** Callback when retry is clicked */
  onRetry?: (messageId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

export interface DeliveryStatusIconProps {
  /** Current status */
  status: DeliveryStatus | null;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Whether sending/retrying */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Size Constants
// ============================================================================

const ICON_SIZES = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
} as const;

// ============================================================================
// Status Icon Component
// ============================================================================

/**
 * Renders the appropriate icon for a delivery status
 */
export const DeliveryStatusIcon = memo(function DeliveryStatusIcon({
  status,
  size = "sm",
  isLoading = false,
  className,
}: DeliveryStatusIconProps) {
  const iconSize = ICON_SIZES[size];

  // Animation variants
  const iconVariants = {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0, opacity: 0 },
  };

  // Render based on status
  if (!status || status === "sending" || isLoading) {
    return (
      <motion.div
        key="sending"
        variants={iconVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={cn("text-muted-foreground", className)}
      >
        <Clock className={cn(iconSize, "animate-pulse")} />
      </motion.div>
    );
  }

  if (status === "sent") {
    return (
      <motion.div
        key="sent"
        variants={iconVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={cn("text-muted-foreground", className)}
      >
        <Check className={iconSize} />
      </motion.div>
    );
  }

  if (status === "delivered") {
    return (
      <motion.div
        key="delivered"
        variants={iconVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={cn("text-muted-foreground", className)}
      >
        <CheckCheck className={iconSize} />
      </motion.div>
    );
  }

  if (status === "read") {
    return (
      <motion.div
        key="read"
        variants={iconVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={cn("text-primary", className)}
      >
        <CheckCheck className={iconSize} />
      </motion.div>
    );
  }

  if (status === "failed") {
    return (
      <motion.div
        key="failed"
        variants={iconVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={cn("text-destructive", className)}
      >
        <AlertCircle className={iconSize} />
      </motion.div>
    );
  }

  return null;
});

// ============================================================================
// Read Receipts Badge
// ============================================================================

interface ReadReceiptsBadgeProps {
  readCount: number;
  totalRecipients: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const ReadReceiptsBadge = memo(function ReadReceiptsBadge({
  readCount,
  totalRecipients,
  size = "sm",
  className,
}: ReadReceiptsBadgeProps) {
  if (!totalRecipients || totalRecipients <= 1) return null;

  const percentage = calculateReadPercentage(readCount, totalRecipients);

  const textSizes = {
    sm: "text-[10px]",
    md: "text-xs",
    lg: "text-sm",
  };

  return (
    <span
      className={cn(textSizes[size], "ml-0.5 text-muted-foreground", className)}
    >
      {readCount}/{totalRecipients}
    </span>
  );
});

// ============================================================================
// Tooltip Content
// ============================================================================

interface StatusTooltipContentProps {
  status: DeliveryStatus;
  updatedAt?: Date;
  readCount: number;
  totalRecipients: number | null;
  error?: string | null;
}

const StatusTooltipContent = memo(function StatusTooltipContent({
  status,
  updatedAt,
  readCount,
  totalRecipients,
  error,
}: StatusTooltipContentProps) {
  const description = getStatusDescription(status);

  return (
    <div className="space-y-1">
      <div className="font-medium">{description}</div>

      {status === "failed" && error && (
        <div className="text-xs text-destructive">{error}</div>
      )}

      {status === "read" && totalRecipients && totalRecipients > 1 && (
        <div className="text-xs text-muted-foreground">
          {readCount} of {totalRecipients} read (
          {calculateReadPercentage(readCount, totalRecipients)}%)
        </div>
      )}

      {updatedAt && (
        <div className="text-xs text-muted-foreground">
          {format(updatedAt, "MMM d, h:mm a")}
        </div>
      )}
    </div>
  );
});

// ============================================================================
// Main Component
// ============================================================================

/**
 * Message Delivery Status Indicator
 *
 * Shows the delivery status of a message with appropriate icons.
 * Only visible for the sender's own messages within 24 hours.
 */
export const MessageDeliveryStatus = memo(function MessageDeliveryStatus({
  messageId,
  messageUserId,
  currentUserId,
  messageCreatedAt,
  size = "sm",
  showTooltip = true,
  showReadCount = true,
  onRetry,
  className,
}: MessageDeliveryStatusProps) {
  // Check if we should show delivery status
  const shouldShow = useShowDeliveryStatus({
    messageUserId,
    currentUserId,
    messageCreatedAt,
  });

  // Get message status
  const {
    status,
    statusEntry,
    isFailed,
    error,
    readCount,
    totalRecipients,
    retryCount,
    retry,
  } = useMessageStatus({ messageId });

  // Handle retry click
  const handleRetry = useCallback(() => {
    if (onRetry) {
      onRetry(messageId);
    } else {
      retry();
    }
  }, [messageId, onRetry, retry]);

  // Don't render if we shouldn't show status
  if (!shouldShow && !isFailed) {
    return null;
  }

  // Failed state with retry button
  if (isFailed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex items-center gap-1", className)}>
              <DeliveryStatusIcon status="failed" size={size} />
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-destructive/10 h-5 w-5"
                onClick={handleRetry}
              >
                <RefreshCw className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <StatusTooltipContent
              status="failed"
              error={error}
              readCount={readCount}
              totalRecipients={totalRecipients}
            />
            <div className="mt-1 text-xs">Click to retry ({retryCount}/3)</div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Normal status display
  const content = (
    <div className={cn("flex items-center", className)}>
      <AnimatePresence mode="wait">
        <DeliveryStatusIcon status={status} size={size} />
      </AnimatePresence>
      {showReadCount && status === "read" && (
        <ReadReceiptsBadge
          readCount={readCount}
          totalRecipients={totalRecipients}
          size={size}
        />
      )}
    </div>
  );

  if (!showTooltip || !status) {
    return content;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>
          <StatusTooltipContent
            status={status}
            updatedAt={statusEntry?.updatedAt}
            readCount={readCount}
            totalRecipients={totalRecipients}
            error={error}
          />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

// ============================================================================
// Compact Variant
// ============================================================================

/**
 * Compact delivery status for inline use
 */
export const CompactDeliveryStatus = memo(function CompactDeliveryStatus({
  messageId,
  messageUserId,
  currentUserId,
  messageCreatedAt,
  className,
}: Omit<MessageDeliveryStatusProps, "size" | "showTooltip" | "showReadCount">) {
  return (
    <MessageDeliveryStatus
      messageId={messageId}
      messageUserId={messageUserId}
      currentUserId={currentUserId}
      messageCreatedAt={messageCreatedAt}
      size="sm"
      showTooltip={false}
      showReadCount={false}
      className={className}
    />
  );
});

// ============================================================================
// Exports
// ============================================================================

export default MessageDeliveryStatus;
