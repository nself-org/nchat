"use client";

/**
 * NotificationHistoryPanel - View notification history
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface NotificationHistoryPanelProps {
  className?: string;
}

export function NotificationHistoryPanel({
  className,
}: NotificationHistoryPanelProps) {
  return (
    <div className={cn("space-y-4 p-4", className)}>
      <h3 className="text-lg font-medium">Notification History</h3>
      <p className="text-sm text-muted-foreground">
        View your past notifications.
      </p>
      {/* Placeholder content */}
      <div className="rounded-lg border p-4">
        <p className="text-sm">No notification history available.</p>
      </div>
    </div>
  );
}

export default NotificationHistoryPanel;
