"use client";

/**
 * CallActivity Component
 *
 * Displays call-related activities (started, ended)
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { ActivityAvatar } from "../ActivityAvatar";
import { ActivityDate } from "../ActivityDate";
import { ActivityIcon } from "../ActivityIcon";
import { formatCallDuration } from "@/lib/activity/activity-formatter";
import type {
  CallStartedActivity,
  CallEndedActivity,
} from "@/lib/activity/activity-types";

type CallActivityType = CallStartedActivity | CallEndedActivity;

interface CallActivityProps {
  activity: CallActivityType;
  onClick?: () => void;
  className?: string;
}

export function CallActivity({
  activity,
  onClick,
  className,
}: CallActivityProps) {
  const { actor, call, channel, type, isRead, createdAt } = activity;

  const isCallStarted = type === "call_started";
  const callTypeText = call.type === "video" ? "video call" : "voice call";

  return (
    <div
      className={cn(
        "group relative flex cursor-pointer gap-3 rounded-lg p-3 transition-colors",
        "hover:bg-muted/50",
        !isRead &&
          (isCallStarted
            ? "bg-cyan-50 dark:bg-cyan-950/30"
            : "bg-gray-50 dark:bg-gray-900/30"),
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
            isCallStarted ? "bg-cyan-500" : "bg-gray-500",
          )}
        />
      )}

      {/* Icon */}
      <ActivityIcon type={type} size="md" />

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {/* Header */}
            <p className={cn("text-sm", !isRead && "font-medium")}>
              {isCallStarted ? (
                <>
                  <span className="font-medium">{actor.displayName}</span>
                  {" started a "}
                  {callTypeText}
                  {" in "}
                  <span className="font-medium">#{channel.name}</span>
                </>
              ) : (
                <>
                  {callTypeText.charAt(0).toUpperCase() + callTypeText.slice(1)}
                  {" ended in "}
                  <span className="font-medium">#{channel.name}</span>
                </>
              )}
            </p>

            {/* Call details */}
            <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
              {/* Call type icon */}
              <div className="flex items-center gap-1">
                {call.type === "video" ? (
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                ) : (
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                )}
                <span className="capitalize">{call.type}</span>
              </div>

              {/* Duration (for ended calls) */}
              {!isCallStarted && call.duration && (
                <div className="flex items-center gap-1">
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>{formatCallDuration(call.duration)}</span>
                </div>
              )}

              {/* Participants */}
              {call.participantCount && call.participantCount > 0 && (
                <div className="flex items-center gap-1">
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span>
                    {call.participantCount}{" "}
                    {call.participantCount === 1
                      ? "participant"
                      : "participants"}
                  </span>
                </div>
              )}
            </div>

            {/* Join button for active calls */}
            {isCallStarted && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle join call
                }}
                className="mt-2 rounded-md bg-green-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-600"
              >
                Join call
              </button>
            )}
          </div>

          {/* Timestamp */}
          <ActivityDate date={createdAt} className="shrink-0" />
        </div>
      </div>
    </div>
  );
}

export default CallActivity;
