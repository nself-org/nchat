"use client";

import { SettingsSection } from "./settings-section";
import { OnlineStatusSettings } from "./OnlineStatusSettings";
import { ReadReceiptsSettings } from "./ReadReceiptsSettings";
import { TypingIndicatorSettings } from "./TypingIndicatorSettings";
import { ProfileVisibilitySettings } from "./ProfileVisibilitySettings";
import { BlockedUsersSettings } from "./BlockedUsersSettings";
import { DataSettings } from "./DataSettings";
import { SettingsReset } from "./SettingsReset";
import { useSettingsStore } from "@/stores/settings-store";
import { Shield } from "lucide-react";

interface PrivacySettingsProps {
  className?: string;
}

/**
 * PrivacySettings - Privacy overview and controls
 */
export function PrivacySettings({ className }: PrivacySettingsProps) {
  const { resetPrivacy } = useSettingsStore();

  return (
    <div className={className}>
      {/* Page Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Privacy</h1>
          <p className="text-sm text-muted-foreground">
            Control who can see your activity and contact you
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <OnlineStatusSettings />
        <ReadReceiptsSettings />
        <TypingIndicatorSettings />
        <ProfileVisibilitySettings />
        <BlockedUsersSettings />
        <DataSettings />

        <SettingsReset
          label="Reset Privacy Settings"
          description="Reset all privacy settings to their default values"
          onReset={resetPrivacy}
          confirmDescription="This will reset all your privacy settings, including online status visibility, read receipts, and profile visibility."
        />
      </div>
    </div>
  );
}
