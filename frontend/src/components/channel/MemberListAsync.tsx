"use client";

/**
 * MemberListAsync — Member list surface with 7-state AsyncScreen contract.
 *
 * Purpose: Wraps channel member list with avatar+name skeleton during load,
 *          permission-denied for unauthed/unauth'd access, offline banner.
 * SPORT: REGISTRY-WEB-SURFACES.md — nchat web: MemberList: 7-state: complete
 */

import * as React from "react";
import { AsyncScreen, type AsyncState, type AsyncScreenProps } from "@/components/common/AsyncScreen";
import { ChannelMembers } from "./channel-members";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface MemberListAsyncProps
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
  channelId: string;
  channelName?: string;
  className?: string;
}

// =============================================================================
// Member skeleton: avatar + name rows (per spec)
// =============================================================================

function MemberListSkeleton() {
  return (
    <div className="flex flex-col gap-1 p-2" data-testid="member-list-skeleton">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex items-center gap-2 px-2 py-1.5">
          {/* Avatar */}
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          {/* Name */}
          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function MemberListAsync({
  state,
  permissionKind = "unauthorized",
  channelId,
  channelName,
  onLoginRedirect,
  onRequestAccess,
  isNetworkOffline,
  isReconnecting,
  error,
  onRetry,
  rateLimitRetryAfterMs,
  onRateLimitRetry,
  className,
}: MemberListAsyncProps) {
  return (
    <AsyncScreen
      state={state}
      permissionKind={permissionKind}
      channelName={channelName}
      onLoginRedirect={onLoginRedirect}
      onRequestAccess={onRequestAccess}
      isNetworkOffline={isNetworkOffline}
      isReconnecting={isReconnecting}
      error={error}
      onRetry={onRetry}
      rateLimitRetryAfterMs={rateLimitRetryAfterMs}
      onRateLimitRetry={onRateLimitRetry}
      loadingSlot={<MemberListSkeleton />}
      emptyTitle="No members"
      emptyMessage="This channel has no members yet."
      className={cn("flex flex-col h-full overflow-hidden", className)}
    >
      <ChannelMembers channelId={channelId} />
    </AsyncScreen>
  );
}
