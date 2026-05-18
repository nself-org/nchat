"use client";

/**
 * IntegrationActivity Component
 *
 * Displays integration event activities (GitHub, Jira, etc.)
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { ActivityDate } from "../ActivityDate";
import type { IntegrationEventActivity } from "@/lib/activity/activity-types";

interface IntegrationActivityProps {
  activity: IntegrationEventActivity;
  onClick?: () => void;
  className?: string;
}

// Integration icons
function IntegrationIcon({
  type,
  iconUrl,
  className,
}: {
  type: string;
  iconUrl?: string;
  className?: string;
}) {
  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt={type}
        className={cn("h-5 w-5 rounded", className)}
      />
    );
  }

  // Default icons for known integrations
  switch (type) {
    case "github":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
      );
    case "jira":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.005 1.005 0 0 0 23.013 0z" />
        </svg>
      );
    case "slack":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
        </svg>
      );
    case "google_drive":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M4.433 22.396l4-6.929H24l-4 6.929H4.433zm3.566-6.929L0 3.396h7.868l7.998 12.071H7.999zM16.132 3.396L24 15.467h-7.867L8.264 3.396h7.868z" />
        </svg>
      );
    default:
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
          <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
          <line x1="6" y1="6" x2="6.01" y2="6" />
          <line x1="6" y1="18" x2="6.01" y2="18" />
        </svg>
      );
  }
}

export function IntegrationActivity({
  activity,
  onClick,
  className,
}: IntegrationActivityProps) {
  const { integration, channel, isRead, createdAt } = activity;

  return (
    <div
      className={cn(
        "group relative flex cursor-pointer gap-3 rounded-lg p-3 transition-colors",
        "hover:bg-muted/50",
        !isRead && "bg-violet-50 dark:bg-violet-950/30",
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
        <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-violet-500" />
      )}

      {/* Integration icon */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <IntegrationIcon
          type={integration.type}
          iconUrl={integration.iconUrl}
          className="h-5 w-5"
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {/* Header */}
            <p className={cn("text-sm", !isRead && "font-medium")}>
              <span className="font-medium">{integration.name}</span>
              {": "}
              {integration.eventType}
            </p>

            {/* Event details */}
            {integration.eventData && (
              <div className="mt-2 rounded-md border bg-background p-2 font-mono text-xs">
                {Object.entries(integration.eventData)
                  .slice(0, 3)
                  .map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <span className="text-muted-foreground">{key}:</span>
                      <span className="truncate">{String(value)}</span>
                    </div>
                  ))}
                {Object.keys(integration.eventData).length > 3 && (
                  <p className="mt-1 text-muted-foreground">
                    +{Object.keys(integration.eventData).length - 3} more fields
                  </p>
                )}
              </div>
            )}

            {/* Channel context if available */}
            {channel && (
              <p className="mt-1 text-xs text-muted-foreground">
                in <span className="font-medium">#{channel.name}</span>
              </p>
            )}
          </div>

          {/* Timestamp */}
          <ActivityDate date={createdAt} className="shrink-0" />
        </div>
      </div>
    </div>
  );
}

export default IntegrationActivity;
