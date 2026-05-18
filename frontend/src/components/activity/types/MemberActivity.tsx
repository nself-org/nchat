"use client";

/**
 * MemberActivity Component
 *
 * Displays member-related activities (joined, left, invited)
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { ActivityAvatar } from "../ActivityAvatar";
import { ActivityDate } from "../ActivityDate";
import { ActivityIcon } from "../ActivityIcon";
import type {
  MemberJoinedActivity,
  MemberLeftActivity,
  MemberInvitedActivity,
} from "@/lib/activity/activity-types";

type MemberActivityType =
  | MemberJoinedActivity
  | MemberLeftActivity
  | MemberInvitedActivity;

interface MemberActivityProps {
  activity: MemberActivityType;
  onClick?: () => void;
  className?: string;
}

export function MemberActivity({
  activity,
  onClick,
  className,
}: MemberActivityProps) {
  const { actor, channel, type, isRead, createdAt } = activity;

  const getActivityText = () => {
    switch (type) {
      case "member_joined":
        const joinedActivity = activity as MemberJoinedActivity;
        if (joinedActivity.invitedBy) {
          return (
            <>
              was added to <span className="font-medium">#{channel.name}</span>
              {" by "}
              <span className="font-medium">
                {joinedActivity.invitedBy.displayName}
              </span>
            </>
          );
        }
        return (
          <>
            joined <span className="font-medium">#{channel.name}</span>
          </>
        );

      case "member_left":
        const leftActivity = activity as MemberLeftActivity;
        if (leftActivity.removedBy) {
          const actionText =
            leftActivity.reason === "banned"
              ? "was banned from"
              : leftActivity.reason === "kicked"
                ? "was removed from"
                : "left";
          return (
            <>
              {actionText} <span className="font-medium">#{channel.name}</span>
            </>
          );
        }
        return (
          <>
            left <span className="font-medium">#{channel.name}</span>
          </>
        );

      case "member_invited":
        const invitedActivity = activity as MemberInvitedActivity;
        return (
          <>
            invited{" "}
            <span className="font-medium">
              {invitedActivity.invitee.displayName}
            </span>
            {" to "}
            <span className="font-medium">#{channel.name}</span>
          </>
        );

      default:
        return "member activity";
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case "member_joined":
      case "member_invited":
        return "bg-emerald-50 dark:bg-emerald-950/30";
      case "member_left":
        return "bg-red-50 dark:bg-red-950/30";
      default:
        return "";
    }
  };

  const getIndicatorColor = () => {
    switch (type) {
      case "member_joined":
      case "member_invited":
        return "bg-emerald-500";
      case "member_left":
        return "bg-red-500";
      default:
        return "bg-primary";
    }
  };

  return (
    <div
      className={cn(
        "group relative flex cursor-pointer gap-3 rounded-lg p-3 transition-colors",
        "hover:bg-muted/50",
        !isRead && getBackgroundColor(),
        className,
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Unread indicator */}
      {!isRead && (
        <div
          className={cn(
            "absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full",
            getIndicatorColor(),
          )}
        />
      )}

      {/* Avatar */}
      <ActivityAvatar actor={actor} size="md" />

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {/* Header */}
            <p className={cn("text-sm", !isRead && "font-medium")}>
              <span className="font-medium">{actor.displayName}</span>{" "}
              {getActivityText()}
            </p>

            {/* Additional context for invitee */}
            {type === "member_invited" && (
              <div className="mt-2 flex items-center gap-2">
                <ActivityAvatar
                  actor={(activity as MemberInvitedActivity).invitee}
                  size="sm"
                />
                <span className="text-sm text-muted-foreground">
                  {(activity as MemberInvitedActivity).invitee.displayName}
                </span>
              </div>
            )}
          </div>

          {/* Timestamp */}
          <ActivityDate date={createdAt} className="shrink-0" />
        </div>
      </div>
    </div>
  );
}

export default MemberActivity;
