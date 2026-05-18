"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useNotificationSettingsStore } from "@/stores/notification-settings-store";
import { NotificationPreferencesGlobal } from "./NotificationPreferencesGlobal";
import { ChannelNotificationSettingsList } from "./ChannelNotificationSettingsList";
import { DMNotificationSettingsPanel } from "./DMNotificationSettingsPanel";
import { MentionSettingsPanel } from "./MentionSettingsPanel";
import { KeywordNotificationsPanel } from "./KeywordNotificationsPanel";
import { QuietHoursPanel } from "./QuietHoursPanel";
import { NotificationSoundPicker } from "./NotificationSoundPicker";
import { NotificationPreviewPanel } from "./NotificationPreviewPanel";
import { PushNotificationSettingsPanel } from "./PushNotificationSettingsPanel";
import { EmailNotificationSettingsPanel } from "./EmailNotificationSettingsPanel";
import { DesktopNotificationSettingsPanel } from "./DesktopNotificationSettingsPanel";
import { MobileNotificationSettingsPanel } from "./MobileNotificationSettingsPanel";
import { NotificationFiltersPanel } from "./NotificationFiltersPanel";
import { NotificationHistoryPanel } from "./NotificationHistoryPanel";
import { MuteOptionsPanel } from "./MuteOptionsPanel";

export interface NotificationSettingsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Initial active tab */
  initialTab?: string;
  /** Callback when settings are saved */
  onSave?: () => void;
  /** Callback when settings are closed */
  onClose?: () => void;
  /** Whether to show as compact mode */
  compact?: boolean;
  /** Whether to hide the navigation tabs */
  hideNavigation?: boolean;
}

/**
 * NotificationSettings - Main notification settings page component
 *
 * Provides a comprehensive settings interface for all notification preferences.
 */
export function NotificationSettings({
  initialTab = "general",
  onSave,
  onClose,
  compact = false,
  hideNavigation = false,
  className,
  ...props
}: NotificationSettingsProps) {
  const activeSection = useNotificationSettingsStore(
    (state) => state.activeSection,
  );
  const setActiveSection = useNotificationSettingsStore(
    (state) => state.setActiveSection,
  );
  const isDirty = useNotificationSettingsStore((state) => state.isDirty);
  const isLoading = useNotificationSettingsStore((state) => state.isLoading);
  const savePreferences = useNotificationSettingsStore(
    (state) => state.savePreferences,
  );
  const resetToDefaults = useNotificationSettingsStore(
    (state) => state.resetToDefaults,
  );

  // Set initial tab on mount
  React.useEffect(() => {
    if (initialTab) {
      setActiveSection(initialTab);
    }
  }, [initialTab, setActiveSection]);

  // Handle save
  const handleSave = async () => {
    const success = await savePreferences();
    if (success) {
      onSave?.();
    }
  };

  // Handle reset
  const handleReset = () => {
    if (
      window.confirm(
        "Are you sure you want to reset all notification settings to defaults?",
      )
    ) {
      resetToDefaults();
    }
  };

  const tabs = [
    { id: "general", label: "General", icon: BellIcon },
    { id: "channels", label: "Channels", icon: HashIcon },
    { id: "dms", label: "Direct Messages", icon: MessageIcon },
    { id: "mentions", label: "Mentions", icon: AtSignIcon },
    { id: "keywords", label: "Keywords", icon: TagIcon },
    { id: "schedule", label: "Schedule", icon: ClockIcon },
    { id: "sounds", label: "Sounds", icon: VolumeIcon },
    { id: "desktop", label: "Desktop", icon: MonitorIcon },
    { id: "mobile", label: "Mobile", icon: PhoneIcon },
    { id: "email", label: "Email", icon: MailIcon },
    { id: "history", label: "History", icon: HistoryIcon },
  ];

  if (compact) {
    return (
      <div className={cn("space-y-4", className)} {...props}>
        <NotificationPreferencesGlobal compact />
      </div>
    );
  }

  return (
    <div className={cn("flex h-full flex-col", className)} {...props}>
      <Tabs
        value={activeSection}
        onValueChange={setActiveSection}
        className="flex flex-1 flex-col"
      >
        {!hideNavigation && (
          <div className="border-b bg-card">
            <ScrollArea className="w-full">
              <TabsList className="inline-flex h-12 items-center justify-start gap-1 bg-transparent p-1">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="data-[state=active]:text-primary-foreground inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium data-[state=active]:bg-primary"
                  >
                    <tab.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </ScrollArea>
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-4xl p-6">
            <TabsContent value="general" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">
                    General Notifications
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Configure your overall notification preferences
                  </p>
                </div>
                <NotificationPreferencesGlobal />
              </div>
            </TabsContent>

            <TabsContent value="channels" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">
                    Channel Notifications
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Customize notifications for individual channels
                  </p>
                </div>
                <ChannelNotificationSettingsList />
              </div>
            </TabsContent>

            <TabsContent value="dms" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">
                    Direct Message Notifications
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Configure how you receive DM notifications
                  </p>
                </div>
                <DMNotificationSettingsPanel />
              </div>
            </TabsContent>

            <TabsContent value="mentions" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">Mention Settings</h2>
                  <p className="text-sm text-muted-foreground">
                    Control how you're notified when mentioned
                  </p>
                </div>
                <MentionSettingsPanel />
              </div>
            </TabsContent>

            <TabsContent value="keywords" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">
                    Keyword Notifications
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Get notified when specific words or phrases are mentioned
                  </p>
                </div>
                <KeywordNotificationsPanel />
              </div>
            </TabsContent>

            <TabsContent value="schedule" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">Quiet Hours</h2>
                  <p className="text-sm text-muted-foreground">
                    Set up a schedule for when you don't want to be disturbed
                  </p>
                </div>
                <QuietHoursPanel />
              </div>
            </TabsContent>

            <TabsContent value="sounds" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">Notification Sounds</h2>
                  <p className="text-sm text-muted-foreground">
                    Choose sounds for different types of notifications
                  </p>
                </div>
                <NotificationSoundPicker />
              </div>
            </TabsContent>

            <TabsContent value="desktop" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">
                    Desktop Notifications
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Configure browser desktop notifications
                  </p>
                </div>
                <DesktopNotificationSettingsPanel />
                <NotificationPreviewPanel />
              </div>
            </TabsContent>

            <TabsContent value="mobile" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">
                    Mobile Push Notifications
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Configure push notifications for mobile devices
                  </p>
                </div>
                <MobileNotificationSettingsPanel />
                <PushNotificationSettingsPanel />
              </div>
            </TabsContent>

            <TabsContent value="email" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">Email Notifications</h2>
                  <p className="text-sm text-muted-foreground">
                    Configure email digests and notification emails
                  </p>
                </div>
                <EmailNotificationSettingsPanel />
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">
                    Notification History
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    View and manage your past notifications
                  </p>
                </div>
                <NotificationFiltersPanel />
                <NotificationHistoryPanel />
              </div>
            </TabsContent>
          </div>
        </ScrollArea>

        {/* Footer with actions */}
        <div className="flex items-center justify-between border-t bg-card px-6 py-4">
          <Button
            variant="ghost"
            onClick={handleReset}
            className="text-muted-foreground"
          >
            Reset to Defaults
          </Button>
          <div className="flex items-center gap-3">
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
            <Button onClick={handleSave} disabled={!isDirty || isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </Tabs>
    </div>
  );
}

// Icon components
function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function HashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  );
}

function MessageIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function AtSignIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
    </svg>
  );
}

function TagIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function VolumeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function MonitorIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 3v5h5" />
      <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

NotificationSettings.displayName = "NotificationSettings";

export default NotificationSettings;
