/**
 * Call Actions Component
 *
 * Provides call action buttons that can be integrated into various UI locations
 * like channel headers, user profiles, direct messages, etc.
 */

"use client";

import * as React from "react";
import { Phone, Video } from "lucide-react";
import { CallButton } from "./call-button";
import { FeatureGate } from "@/components/features/feature-gate";
import { Button } from "@/components/ui/button";
import { useCall } from "@/hooks/use-call";
import { useToast } from "@/hooks/use-toast";

import { logger } from "@/lib/logger";

// =============================================================================
// Upgrade Prompt Button
// =============================================================================

interface UpgradeCallButtonProps {
  callType: "voice" | "video";
  variant?: "default" | "ghost" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
  showLabel?: boolean;
}

function UpgradeCallButton({
  callType,
  variant = "ghost",
  size = "icon",
  showLabel = false,
}: UpgradeCallButtonProps) {
  const Icon = callType === "voice" ? Phone : Video;
  const label = callType === "voice" ? "Voice Call" : "Video Call";
  const upgradeTitle = "Requires Starter plan or higher";

  return (
    <Button
      variant={variant as "default" | "ghost" | "outline"}
      size={size === "md" ? "default" : (size as "sm" | "lg" | "icon")}
      disabled
      aria-label={upgradeTitle}
      title={upgradeTitle}
      className="opacity-40 cursor-not-allowed"
    >
      <Icon className="h-4 w-4" />
      {showLabel && <span className="ml-2">{label}</span>}
    </Button>
  );
}

// =============================================================================
// Types
// =============================================================================

export interface CallActionsProps {
  /** Target user ID to call */
  targetUserId: string;
  /** Target user name for display */
  targetUserName: string;
  /** Optional channel ID if calling within a channel */
  channelId?: string;
  /** Show voice call button */
  showVoiceCall?: boolean;
  /** Show video call button */
  showVideoCall?: boolean;
  /** Button variant */
  variant?: "default" | "ghost" | "outline";
  /** Button size */
  size?: "sm" | "md" | "lg" | "icon";
  /** Show labels on buttons */
  showLabels?: boolean;
  /** Custom className */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function CallActions({
  targetUserId,
  targetUserName,
  channelId,
  showVoiceCall = true,
  showVideoCall = true,
  variant = "ghost",
  size = "icon",
  showLabels = false,
  className,
}: CallActionsProps) {
  const livekitEnabled = Boolean(process.env.NEXT_PUBLIC_LIVEKIT_URL);
  const { initiateVoiceCall, initiateVideoCall, isInCall } = useCall();
  const { toast } = useToast();

  const handleVoiceCall = React.useCallback(async () => {
    if (isInCall) {
      toast({
        title: "Already in a call",
        description: "Please end your current call before starting a new one.",
        variant: "destructive",
      });
      return;
    }

    try {
      await initiateVoiceCall(targetUserId, targetUserName, channelId);
    } catch (error) {
      logger.error("Failed to initiate voice call:", error);
    }
  }, [
    isInCall,
    initiateVoiceCall,
    targetUserId,
    targetUserName,
    channelId,
    toast,
  ]);

  const handleVideoCall = React.useCallback(async () => {
    if (isInCall) {
      toast({
        title: "Already in a call",
        description: "Please end your current call before starting a new one.",
        variant: "destructive",
      });
      return;
    }

    try {
      await initiateVideoCall(targetUserId, targetUserName, channelId);
    } catch (error) {
      logger.error("Failed to initiate video call:", error);
    }
  }, [
    isInCall,
    initiateVideoCall,
    targetUserId,
    targetUserName,
    channelId,
    toast,
  ]);

  return (
    <div className={className}>
      {showVoiceCall && (
        <FeatureGate
          category="voice"
          feature="calls"
          fallback={
            <UpgradeCallButton
              callType="voice"
              variant={variant}
              size={size}
              showLabel={showLabels}
            />
          }
        >
          {livekitEnabled && (
            <CallButton
              callType="voice"
              variant={variant}
              size={size}
              showLabel={showLabels}
              onInitiateCall={handleVoiceCall}
              disabled={isInCall}
            />
          )}
        </FeatureGate>
      )}
      {showVideoCall && (
        <FeatureGate
          category="video"
          feature="calls"
          fallback={
            <UpgradeCallButton
              callType="video"
              variant={variant}
              size={size}
              showLabel={showLabels}
            />
          }
        >
          {livekitEnabled && (
            <CallButton
              callType="video"
              variant={variant}
              size={size}
              showLabel={showLabels}
              onInitiateCall={handleVideoCall}
              disabled={isInCall}
            />
          )}
        </FeatureGate>
      )}
    </div>
  );
}

CallActions.displayName = "CallActions";

// =============================================================================
// User Profile Call Actions
// =============================================================================

export interface UserProfileCallActionsProps {
  userId: string;
  userName: string;
  userAvatar?: string;
  className?: string;
}

export function UserProfileCallActions({
  userId,
  userName,
  className,
}: UserProfileCallActionsProps) {
  return (
    <div className={className}>
      <CallActions
        targetUserId={userId}
        targetUserName={userName}
        showVoiceCall
        showVideoCall
        variant="outline"
        size="md"
        showLabels
        className="flex gap-2"
      />
    </div>
  );
}

UserProfileCallActions.displayName = "UserProfileCallActions";

// =============================================================================
// DM Call Actions (for Direct Message headers)
// =============================================================================

export interface DMCallActionsProps {
  userId: string;
  userName: string;
  className?: string;
}

export function DMCallActions({
  userId,
  userName,
  className,
}: DMCallActionsProps) {
  return (
    <CallActions
      targetUserId={userId}
      targetUserName={userName}
      showVoiceCall
      showVideoCall
      variant="ghost"
      size="icon"
      className={className}
    />
  );
}

DMCallActions.displayName = "DMCallActions";

// =============================================================================
// Channel Call Actions (for channel headers)
// =============================================================================

export interface ChannelCallActionsProps {
  channelId: string;
  /** For 1-on-1 DMs, provide the other user's info */
  targetUserId?: string;
  targetUserName?: string;
  /** For group channels, show group call option */
  isGroupChannel?: boolean;
  className?: string;
}

export function ChannelCallActions({
  channelId,
  targetUserId,
  targetUserName,
  isGroupChannel = false,
  className,
}: ChannelCallActionsProps) {
  // For now, group calls are not implemented, so disable for group channels
  if (isGroupChannel) {
    return null;
  }

  // For DM channels, require target user info
  if (!targetUserId || !targetUserName) {
    return null;
  }

  return (
    <CallActions
      targetUserId={targetUserId}
      targetUserName={targetUserName}
      channelId={channelId}
      showVoiceCall
      showVideoCall
      variant="ghost"
      size="icon"
      className={className}
    />
  );
}

ChannelCallActions.displayName = "ChannelCallActions";
