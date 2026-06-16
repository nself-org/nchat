"use client";

/**
 * ChannelListAsync — ChannelList surface with 7-state AsyncScreen contract.
 *
 * Purpose: Wraps channel list data fetching with all 7 async states including
 *          skeleton loading, offline banner, permission-denied (unauthed/unauth'd),
 *          rate-limit, error, empty, and connected.
 * Inputs:  jwt, channels data, async state.
 * Outputs: 7-state wrapped channel list or skeleton.
 * SPORT: REGISTRY-WEB-SURFACES.md — nchat web: ChannelList: 7-state: complete
 */

import * as React from "react";
import { AsyncScreen, type AsyncState, type AsyncScreenProps } from "@/components/common/AsyncScreen";
import { ChannelList } from "./channel-list";
import { ChannelSkeleton } from "./channel-skeleton";
import type { Channel } from "@/stores/channel-store";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface ChannelListAsyncProps
  extends Pick<
    AsyncScreenProps,
    | "onLoginRedirect"
    | "onRequestAccess"
    | "isNetworkOffline"
    | "isReconnecting"
    | "error"
    | "onRetry"
    | "rateLimitRetryAfterMs"
    | "onRateLimitRetry"
  > {
  state: AsyncState;
  permissionKind?: AsyncScreenProps["permissionKind"];
  channels?: Channel[];
  onChannelSelect?: (channel: Channel) => void;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * 7-state channel list with skeleton loading placeholder.
 */
export function ChannelListAsync({
  state,
  permissionKind = "unauthorized",
  channels,
  onChannelSelect,
  onLoginRedirect,
  onRequestAccess,
  isNetworkOffline,
  isReconnecting,
  error,
  onRetry,
  rateLimitRetryAfterMs,
  onRateLimitRetry,
  className,
}: ChannelListAsyncProps) {
  return (
    <AsyncScreen
      state={state}
      permissionKind={permissionKind}
      onLoginRedirect={onLoginRedirect}
      onRequestAccess={onRequestAccess}
      isNetworkOffline={isNetworkOffline}
      isReconnecting={isReconnecting}
      error={error}
      onRetry={onRetry}
      rateLimitRetryAfterMs={rateLimitRetryAfterMs}
      onRateLimitRetry={onRateLimitRetry}
      loadingSlot={<ChannelSkeleton variant="list" className="flex-1" />}
      emptyTitle="No channels yet"
      emptyMessage="Create a channel to start chatting with your team."
      className={cn("flex flex-col h-full", className)}
    >
      <ChannelList onChannelSelect={onChannelSelect} />
    </AsyncScreen>
  );
}
