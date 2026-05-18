"use client";

/**
 * Incoming Call Component
 *
 * Displays an incoming call notification with caller information
 * and accept/decline buttons.
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Phone, PhoneOff, Video, User } from "lucide-react";

// =============================================================================
// Types
// =============================================================================

export type CallType = "voice" | "video";

export interface IncomingCallProps extends VariantProps<
  typeof incomingCallVariants
> {
  /** Unique call ID */
  callId: string;
  /** Caller's name */
  callerName: string;
  /** Caller's avatar URL */
  callerAvatarUrl?: string;
  /** Type of call (voice or video) */
  callType: CallType;
  /** Optional channel name */
  channelName?: string;
  /** Callback when call is accepted */
  onAccept: (callId: string) => void;
  /** Callback when call is declined */
  onDecline: (callId: string) => void;
  /** Whether the component is animating */
  isRinging?: boolean;
  /** Additional class name */
  className?: string;
  /** Whether actions are disabled */
  disabled?: boolean;
}

// =============================================================================
// Variants
// =============================================================================

const incomingCallVariants = cva(
  "flex flex-col items-center gap-4 rounded-2xl p-6 shadow-2xl transition-all",
  {
    variants: {
      variant: {
        default: "bg-background border",
        dark: "bg-gray-900 text-white",
        floating: "bg-black/90 backdrop-blur-lg text-white",
        card: "bg-card border shadow-lg",
      },
      size: {
        sm: "p-4 gap-3 max-w-[280px]",
        default: "p-6 gap-4 max-w-[320px]",
        lg: "p-8 gap-6 max-w-[400px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const avatarVariants = cva(
  "flex items-center justify-center rounded-full bg-muted overflow-hidden",
  {
    variants: {
      size: {
        sm: "h-16 w-16",
        default: "h-20 w-20",
        lg: "h-24 w-24",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

const actionButtonVariants = cva(
  "flex items-center justify-center rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      action: {
        accept:
          "bg-green-500 text-white hover:bg-green-600 active:bg-green-700",
        decline: "bg-red-500 text-white hover:bg-red-600 active:bg-red-700",
      },
      size: {
        sm: "h-12 w-12",
        default: "h-14 w-14",
        lg: "h-16 w-16",
      },
    },
    defaultVariants: {
      action: "accept",
      size: "default",
    },
  },
);

// =============================================================================
// Avatar Component
// =============================================================================

interface CallerAvatarProps {
  name: string;
  avatarUrl?: string;
  isRinging?: boolean;
  size?: "sm" | "default" | "lg";
}

function CallerAvatar({
  name,
  avatarUrl,
  isRinging,
  size = "default",
}: CallerAvatarProps) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={cn("relative", isRinging && "animate-pulse")}>
      {/* Ringing animation rings */}
      {isRinging && (
        <>
          <div
            className={cn(
              avatarVariants({ size }),
              "absolute inset-0 animate-ping bg-green-500/20",
            )}
          />
          <div
            className={cn(
              avatarVariants({ size }),
              "animation-delay-150 absolute inset-0 animate-ping bg-green-500/10",
            )}
            style={{ animationDelay: "150ms" }}
          />
        </>
      )}

      {/* Avatar */}
      <div className={cn(avatarVariants({ size }), "relative")}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`${name}'s avatar`}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-2xl font-semibold text-muted-foreground">
            {initials || <User size={32} />}
          </span>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Action Button Component
// =============================================================================

interface ActionButtonProps {
  action: "accept" | "decline";
  callType: CallType;
  onClick: () => void;
  disabled?: boolean;
  size?: "sm" | "default" | "lg";
}

function ActionButton({
  action,
  callType,
  onClick,
  disabled,
  size = "default",
}: ActionButtonProps) {
  const iconSize = size === "sm" ? 20 : size === "lg" ? 28 : 24;

  const getIcon = () => {
    if (action === "decline") {
      return <PhoneOff size={iconSize} />;
    }
    return callType === "video" ? (
      <Video size={iconSize} />
    ) : (
      <Phone size={iconSize} />
    );
  };

  const getLabel = () => {
    if (action === "decline") {
      return "Decline call";
    }
    return callType === "video" ? "Accept video call" : "Accept call";
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={getLabel()}
      title={getLabel()}
      className={cn(
        actionButtonVariants({ action, size }),
        action === "accept" && "animate-bounce-gentle",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      {getIcon()}
    </button>
  );
}

// =============================================================================
// Incoming Call Component
// =============================================================================

export function IncomingCall({
  callId,
  callerName,
  callerAvatarUrl,
  callType,
  channelName,
  onAccept,
  onDecline,
  isRinging = true,
  variant,
  size,
  className,
  disabled = false,
}: IncomingCallProps) {
  const handleAccept = React.useCallback(() => {
    onAccept(callId);
  }, [callId, onAccept]);

  const handleDecline = React.useCallback(() => {
    onDecline(callId);
  }, [callId, onDecline]);

  const buttonSize = size ?? "default";

  return (
    <div
      className={cn(incomingCallVariants({ variant, size }), className)}
      role="alertdialog"
      aria-labelledby={`incoming-call-title-${callId}`}
      aria-describedby={`incoming-call-desc-${callId}`}
    >
      {/* Avatar */}
      <CallerAvatar
        name={callerName}
        avatarUrl={callerAvatarUrl}
        isRinging={isRinging}
        size={buttonSize}
      />

      {/* Call Info */}
      <div className="flex flex-col items-center gap-1 text-center">
        <h3
          id={`incoming-call-title-${callId}`}
          className="text-lg font-semibold"
        >
          {callerName}
        </h3>
        <p
          id={`incoming-call-desc-${callId}`}
          className="text-sm text-muted-foreground"
        >
          {callType === "video" ? "Incoming video call" : "Incoming call"}
          {channelName && ` in ${channelName}`}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-6">
        <ActionButton
          action="decline"
          callType={callType}
          onClick={handleDecline}
          disabled={disabled}
          size={buttonSize}
        />
        <ActionButton
          action="accept"
          callType={callType}
          onClick={handleAccept}
          disabled={disabled}
          size={buttonSize}
        />
      </div>
    </div>
  );
}

// =============================================================================
// Compact Incoming Call Component (for notifications)
// =============================================================================

export interface CompactIncomingCallProps {
  callId: string;
  callerName: string;
  callerAvatarUrl?: string;
  callType: CallType;
  onAccept: (callId: string) => void;
  onDecline: (callId: string) => void;
  className?: string;
  disabled?: boolean;
}

export function CompactIncomingCall({
  callId,
  callerName,
  callerAvatarUrl,
  callType,
  onAccept,
  onDecline,
  className,
  disabled = false,
}: CompactIncomingCallProps) {
  const handleAccept = React.useCallback(() => {
    onAccept(callId);
  }, [callId, onAccept]);

  const handleDecline = React.useCallback(() => {
    onDecline(callId);
  }, [callId, onDecline]);

  const initials = callerName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card p-3 shadow-lg",
        className,
      )}
      role="alertdialog"
      aria-label={`Incoming ${callType} call from ${callerName}`}
    >
      {/* Avatar */}
      <div className="relative">
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-muted">
          {callerAvatarUrl ? (
            <img
              src={callerAvatarUrl}
              alt={`${callerName}'s avatar`}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm font-medium text-muted-foreground">
              {initials}
            </span>
          )}
        </div>
        <div className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-green-500" />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{callerName}</p>
        <p className="text-xs text-muted-foreground">
          {callType === "video" ? "Video call" : "Voice call"}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDecline}
          disabled={disabled}
          aria-label="Decline call"
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white",
            "transition-colors hover:bg-red-600",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          <PhoneOff size={16} />
        </button>
        <button
          type="button"
          onClick={handleAccept}
          disabled={disabled}
          aria-label={
            callType === "video" ? "Accept video call" : "Accept call"
          }
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white",
            "transition-colors hover:bg-green-600",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          {callType === "video" ? <Video size={16} /> : <Phone size={16} />}
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Exports
// =============================================================================

export {
  incomingCallVariants,
  avatarVariants,
  actionButtonVariants,
  CallerAvatar,
  ActionButton,
};
