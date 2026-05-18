"use client";

import { Bell } from "lucide-react";
import { SettingsLayout, SettingsSection } from "@/components/settings";
import { NotificationPreferences } from "@/components/notifications/NotificationPreferences";
import { useToast } from "@/hooks/use-toast";

export default function NotificationsSettingsPage() {
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Notification settings saved",
      description:
        "Your notification preferences have been updated successfully.",
    });
  };

  return (
    <SettingsLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              Configure how and when you receive notifications
            </p>
          </div>
        </div>

        {/* Main Notification Preferences */}
        <SettingsSection
          title="Notification Preferences"
          description="Manage notification channels, quiet hours, and digest settings"
        >
          <NotificationPreferences onSave={handleSave} />
        </SettingsSection>
      </div>
    </SettingsLayout>
  );
}
