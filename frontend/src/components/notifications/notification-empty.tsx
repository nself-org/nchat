"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface NotificationEmptyProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Custom title text
   * @default "You're all caught up!"
   */
  title?: string;

  /**
   * Custom description text
   * @default "No new notifications"
   */
  description?: string;

  /**
   * Whether to show the illustration icon
   * @default true
   */
  showIcon?: boolean;

  /**
   * Custom icon to display
   */
  icon?: React.ReactNode;
}

/**
 * NotificationEmpty - Empty state for notification center
 *
 * Displays a friendly message and illustration when there are no notifications.
 */
export function NotificationEmpty({
  title = "You're all caught up!",
  description = "No new notifications",
  showIcon = true,
  icon,
  className,
  ...props
}: NotificationEmptyProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-12 text-center",
        className,
      )}
      {...props}
    >
      {showIcon && (
        <div className="mb-4">
          {icon || (
            <svg
              className="text-muted-foreground/50 h-16 w-16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
              />
              {/* Check mark overlay */}
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4"
                className="text-primary"
                stroke="currentColor"
              />
            </svg>
          )}
        </div>
      )}
      <h3 className="mb-1 text-lg font-medium text-foreground">{title}</h3>
      <p className="max-w-[200px] text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

/**
 * Variant for filtered empty states
 */
export function NotificationFilteredEmpty({
  filterName,
  className,
  ...props
}: {
  filterName: string;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <NotificationEmpty
      title={`No ${filterName}`}
      description={`You don't have any ${filterName.toLowerCase()} notifications`}
      icon={
        <svg
          className="text-muted-foreground/50 h-16 w-16"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
      }
      className={className}
      {...props}
    />
  );
}

NotificationEmpty.displayName = "NotificationEmpty";
NotificationFilteredEmpty.displayName = "NotificationFilteredEmpty";

export default NotificationEmpty;
