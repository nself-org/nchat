"use client";

/**
 * Notification Settings Component
 * Combines notification toggle with other notification settings
 */

import * as React from "react";
import { useState } from "react";
import { NotificationToggle } from "./notification-toggle";
import { SettingsSection } from "./settings-section";
import { cn } from "@/lib/utils";

export interface NotificationSettingsProps {
  className?: string;
}

export function NotificationSettings({ className }: NotificationSettingsProps) {
  const [desktopNotifications, setDesktopNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [messagePreview, setMessagePreview] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);

  return (
    <div className={cn("space-y-6", className)}>
      <SettingsSection title="Notification Preferences">
        <div className="space-y-4">
          <NotificationToggle
            id="desktop-notifications"
            label="Desktop Notifications"
            description="Receive notifications on your desktop"
            checked={desktopNotifications}
            onCheckedChange={setDesktopNotifications}
          />
          <NotificationToggle
            id="sound-enabled"
            label="Sound"
            description="Play a sound for new messages"
            checked={soundEnabled}
            onCheckedChange={setSoundEnabled}
          />
          <NotificationToggle
            id="message-preview"
            label="Message Preview"
            description="Show message content in notifications"
            checked={messagePreview}
            onCheckedChange={setMessagePreview}
          />
          <NotificationToggle
            id="email-notifications"
            label="Email Notifications"
            description="Receive email for missed messages"
            checked={emailNotifications}
            onCheckedChange={setEmailNotifications}
          />
        </div>
      </SettingsSection>
    </div>
  );
}

export default NotificationSettings;
