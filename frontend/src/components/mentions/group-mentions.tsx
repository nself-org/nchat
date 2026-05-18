"use client";

/**
 * GroupMentions - Group mention handling components
 *
 * Provides components for handling @here, @channel, and @everyone mentions
 * including permission checks, confirmation dialogs, and display indicators.
 *
 * @example
 * ```tsx
 * // Permission check before sending
 * <GroupMentionGuard
 *   type="everyone"
 *   userId={user.id}
 *   channelId={channel.id}
 *   onPermissionDenied={handleDenied}
 * >
 *   <SendButton />
 * </GroupMentionGuard>
 *
 * // Confirmation dialog
 * <GroupMentionConfirmDialog
 *   isOpen={showConfirm}
 *   type="channel"
 *   memberCount={45}
 *   onConfirm={handleSend}
 *   onCancel={handleCancel}
 * />
 * ```
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  useMentionPermissions,
  isSpecialMention,
  getMentionType,
} from "@/lib/mentions/use-mentions";
import type { MentionType } from "@/lib/mentions/mention-store";

// ============================================================================
// Types
// ============================================================================

export interface GroupMentionInfo {
  type: MentionType;
  label: string;
  description: string;
  icon: React.ReactNode;
  warningMessage: string;
}

// ============================================================================
// Constants
// ============================================================================

const GROUP_MENTION_INFO: Record<string, GroupMentionInfo> = {
  here: {
    type: "here",
    label: "@here",
    description: "Notifies all online users in this channel",
    warningMessage: "This will notify all online members of this channel.",
    icon: (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="4" fill="currentColor" />
      </svg>
    ),
  },
  channel: {
    type: "channel",
    label: "@channel",
    description: "Notifies all members of this channel",
    warningMessage: "This will notify all members of this channel.",
    icon: (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M4 9h16M4 15h16M10 3l-1 18M15 3l-1 18" />
      </svg>
    ),
  },
  everyone: {
    type: "everyone",
    label: "@everyone",
    description: "Notifies all members of the workspace",
    warningMessage:
      "This will notify EVERYONE in the workspace. Use sparingly.",
    icon: (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
};

// ============================================================================
// Permission Guard Component
// ============================================================================

export interface GroupMentionGuardProps {
  /** The mention type to check */
  type: MentionType;
  /** Current user's ID */
  userId: string;
  /** Channel ID for permission check */
  channelId: string;
  /** Called when permission is denied */
  onPermissionDenied?: (type: MentionType) => void;
  /** Whether to show a disabled state instead of hiding */
  showDisabled?: boolean;
  /** Children to render if permitted */
  children: React.ReactNode;
  /** Fallback to render if not permitted */
  fallback?: React.ReactNode;
}

export function GroupMentionGuard({
  type,
  userId,
  channelId,
  onPermissionDenied,
  showDisabled = false,
  children,
  fallback,
}: GroupMentionGuardProps) {
  const { canUseGroupMention, isLoading } = useMentionPermissions({
    userId,
    channelId,
  });

  const hasPermission = canUseGroupMention(type);

  // Handle permission denied
  React.useEffect(() => {
    if (!isLoading && !hasPermission && onPermissionDenied) {
      onPermissionDenied(type);
    }
  }, [isLoading, hasPermission, type, onPermissionDenied]);

  if (isLoading) {
    return null;
  }

  if (!hasPermission) {
    if (showDisabled) {
      return (
        <div className="pointer-events-none opacity-50" aria-disabled="true">
          {children}
        </div>
      );
    }
    return <>{fallback}</> || null;
  }

  return <>{children}</>;
}

// ============================================================================
// Confirmation Dialog Component
// ============================================================================

export interface GroupMentionConfirmDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** The type of group mention */
  type: MentionType;
  /** Number of members that will be notified */
  memberCount?: number;
  /** Channel name for context */
  channelName?: string;
  /** Called when confirmed */
  onConfirm: () => void;
  /** Called when cancelled */
  onCancel: () => void;
}

export function GroupMentionConfirmDialog({
  isOpen,
  type,
  memberCount,
  channelName,
  onConfirm,
  onCancel,
}: GroupMentionConfirmDialogProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const info = GROUP_MENTION_INFO[type];

  // Close on escape
  React.useEffect(() => {
    if (!isOpen) return;

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCancel();
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onCancel]);

  // Focus trap
  React.useEffect(() => {
    if (!isOpen || !dialogRef.current) return;

    const focusableElements = dialogRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[
      focusableElements.length - 1
    ] as HTMLElement;

    firstElement?.focus();

    function handleTab(e: KeyboardEvent) {
      if (e.key !== "Tab") return;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }

    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [isOpen]);

  if (!isOpen || !info) return null;

  const getSeverityColor = () => {
    switch (type) {
      case "everyone":
        return "text-destructive bg-destructive/10";
      case "channel":
        return "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30";
      default:
        return "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="group-mention-title"
        aria-describedby="group-mention-description"
        className="relative mx-4 w-full max-w-md rounded-lg bg-background p-6 shadow-lg"
      >
        {/* Icon */}
        <div
          className={cn(
            "mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full",
            getSeverityColor(),
          )}
        >
          {info.icon}
        </div>

        {/* Title */}
        <h2
          id="group-mention-title"
          className="mb-2 text-center text-lg font-semibold"
        >
          Send {info.label} mention?
        </h2>

        {/* Description */}
        <p
          id="group-mention-description"
          className="mb-4 text-center text-sm text-muted-foreground"
        >
          {info.warningMessage}
          {memberCount !== undefined && (
            <span className="mt-1 block font-medium">
              This will notify{" "}
              <span className="text-foreground">
                {memberCount} {memberCount === 1 ? "person" : "people"}
              </span>
              {channelName && ` in #${channelName}`}.
            </span>
          )}
        </p>

        {/* Warning for @everyone */}
        {type === "everyone" && (
          <div className="bg-destructive/10 mb-4 flex items-start gap-2 rounded-md p-3 text-sm text-destructive">
            <svg
              className="h-5 w-5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>
              @everyone notifications should be used sparingly. Consider using
              @channel or @here instead.
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant={type === "everyone" ? "destructive" : "default"}
            className="flex-1"
            onClick={onConfirm}
          >
            Send {info.label}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Group Mention Badge Component
// ============================================================================

export interface GroupMentionBadgeProps {
  type: MentionType;
  className?: string;
}

export function GroupMentionBadge({ type, className }: GroupMentionBadgeProps) {
  const info = GROUP_MENTION_INFO[type];
  if (!info) return null;

  const getBadgeColor = () => {
    switch (type) {
      case "everyone":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "channel":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800/50";
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/50";
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
        "border text-xs font-medium",
        getBadgeColor(),
        className,
      )}
    >
      <span className="[&>svg]:h-3 [&>svg]:w-3">{info.icon}</span>
      {info.label}
    </span>
  );
}

// ============================================================================
// Group Mention Indicator (Shows who will be notified)
// ============================================================================

export interface GroupMentionIndicatorProps {
  type: MentionType;
  onlineCount?: number;
  memberCount?: number;
  workspaceCount?: number;
  className?: string;
}

export function GroupMentionIndicator({
  type,
  onlineCount,
  memberCount,
  workspaceCount,
  className,
}: GroupMentionIndicatorProps) {
  const info = GROUP_MENTION_INFO[type];
  if (!info) return null;

  const getTargetCount = (): number | undefined => {
    switch (type) {
      case "here":
        return onlineCount;
      case "channel":
        return memberCount;
      case "everyone":
        return workspaceCount;
      default:
        return undefined;
    }
  };

  const getTargetLabel = (): string => {
    switch (type) {
      case "here":
        return "online users";
      case "channel":
        return "channel members";
      case "everyone":
        return "workspace members";
      default:
        return "users";
    }
  };

  const count = getTargetCount();
  const label = getTargetLabel();

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground",
        className,
      )}
    >
      <span className="text-amber-500 [&>svg]:h-4 [&>svg]:w-4">
        {info.icon}
      </span>
      <span>
        {info.label} will notify{" "}
        {count !== undefined ? (
          <strong className="text-foreground">
            {count} {label}
          </strong>
        ) : (
          <span>{label}</span>
        )}
      </span>
    </div>
  );
}

// ============================================================================
// Hook for detecting group mentions in content
// ============================================================================

export interface UseGroupMentionDetectionOptions {
  content: string;
  userId: string;
  channelId: string;
}

export interface UseGroupMentionDetectionReturn {
  hasGroupMention: boolean;
  groupMentionTypes: MentionType[];
  needsConfirmation: boolean;
  canSend: boolean;
}

export function useGroupMentionDetection({
  content,
  userId,
  channelId,
}: UseGroupMentionDetectionOptions): UseGroupMentionDetectionReturn {
  const { canUseGroupMention, isLoading } = useMentionPermissions({
    userId,
    channelId,
  });

  const result = React.useMemo(() => {
    // Find all @mentions in content
    const mentionRegex = /@(here|channel|everyone)/gi;
    const matches = content.match(mentionRegex) || [];

    // Get unique mention types
    const types = Array.from(
      new Set(
        matches.map(
          (match) => getMentionType(match.replace("@", "")) as MentionType,
        ),
      ),
    ).filter((type) => isSpecialMention(type));

    const hasGroupMention = types.length > 0;

    // Check if all mentions are permitted
    const canSend = isLoading
      ? false
      : types.every((type) => canUseGroupMention(type));

    // Determine if confirmation is needed (for @channel or @everyone)
    const needsConfirmation =
      hasGroupMention &&
      canSend &&
      types.some((type) => type === "channel" || type === "everyone");

    return {
      hasGroupMention,
      groupMentionTypes: types,
      needsConfirmation,
      canSend,
    };
  }, [content, canUseGroupMention, isLoading]);

  return result;
}

// ============================================================================
// Permission Denied Message
// ============================================================================

export interface GroupMentionPermissionDeniedProps {
  type: MentionType;
  className?: string;
}

export function GroupMentionPermissionDenied({
  type,
  className,
}: GroupMentionPermissionDeniedProps) {
  const info = GROUP_MENTION_INFO[type];
  if (!info) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md p-3",
        "bg-destructive/10 text-sm text-destructive",
        className,
      )}
    >
      <svg
        className="h-5 w-5 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      </svg>
      <div>
        <p className="font-medium">Cannot use {info.label}</p>
        <p className="text-destructive/80">
          You don't have permission to use {info.label} mentions in this
          channel. Contact a channel admin if you need this permission.
        </p>
      </div>
    </div>
  );
}

export default GroupMentionGuard;
