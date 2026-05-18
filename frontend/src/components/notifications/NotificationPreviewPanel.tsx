"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNotificationSettingsStore } from "@/stores/notification-settings-store";

export interface NotificationPreviewPanelProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * NotificationPreviewPanel - Preview how notifications will look
 */
export function NotificationPreviewPanel({
  className,
  ...props
}: NotificationPreviewPanelProps) {
  const preferences = useNotificationSettingsStore(
    (state) => state.preferences,
  );
  const [showPreview, setShowPreview] = React.useState(false);

  // Send a test notification
  const handleSendTest = () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        const notification = new Notification("Test Notification", {
          body: preferences.showMessagePreview
            ? "This is a preview of how your notifications will look."
            : "You have a new notification",
          icon: "/favicon.ico",
          silent: !preferences.sound.enabled,
        });

        setTimeout(() => notification.close(), 5000);
        setShowPreview(true);
        setTimeout(() => setShowPreview(false), 5000);
      } else {
        alert("Please grant notification permissions first.");
      }
    }
  };

  return (
    <Card className={cn("p-4", className)} {...props}>
      <h3 className="mb-4 text-sm font-medium">Notification Preview</h3>

      {/* Preview Card */}
      <div
        className={cn(
          "rounded-lg border bg-card p-4 transition-all duration-300",
          showPreview && "ring-2 ring-primary",
        )}
      >
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full">
            <svg
              className="h-5 w-5 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {preferences.showSenderName ? "John Doe" : "New message"}
              </span>
              <span className="text-xs text-muted-foreground">just now</span>
            </div>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {preferences.showMessagePreview
                ? "Hey! Can you check the latest pull request when you get a chance?"
                : "You have a new notification"}
            </p>
          </div>
        </div>
      </div>

      {/* Preview Info */}
      <div className="mt-4 space-y-2 text-xs text-muted-foreground">
        <p>Preview shows:</p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            Sender name: {preferences.showSenderName ? "Visible" : "Hidden"}
          </li>
          <li>
            Message preview:{" "}
            {preferences.showMessagePreview ? "Visible" : "Hidden"}
          </li>
          <li>Sound: {preferences.sound.enabled ? "Enabled" : "Disabled"}</li>
        </ul>
      </div>

      {/* Test Button */}
      <div className="mt-4">
        <Button onClick={handleSendTest} variant="outline" className="w-full">
          Send Test Notification
        </Button>
      </div>
    </Card>
  );
}

NotificationPreviewPanel.displayName = "NotificationPreviewPanel";

export default NotificationPreviewPanel;
