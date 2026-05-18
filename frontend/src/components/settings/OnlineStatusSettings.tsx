"use client";

import { SettingsSection } from "./settings-section";
import { SettingsSelect } from "./SettingsSelect";
import { SettingsToggle } from "./SettingsToggle";
import { useSettingsStore } from "@/stores/settings-store";
import type { OnlineStatusVisibility } from "@/lib/settings/settings-types";

interface OnlineStatusSettingsProps {
  className?: string;
}

const visibilityOptions = [
  {
    value: "everyone",
    label: "Everyone",
    description: "Anyone can see when you are online",
  },
  {
    value: "contacts",
    label: "Contacts only",
    description: "Only people you have messaged can see",
  },
  {
    value: "nobody",
    label: "Nobody",
    description: "Your online status is always hidden",
  },
];

/**
 * OnlineStatusSettings - Control who sees your online status
 */
export function OnlineStatusSettings({ className }: OnlineStatusSettingsProps) {
  const { settings, updatePrivacy } = useSettingsStore();

  return (
    <SettingsSection
      title="Online Status"
      description="Control who can see when you are online"
      className={className}
    >
      <SettingsSelect
        id="online-status-visibility"
        label="Online status visibility"
        description="Choose who can see your online/offline status"
        value={settings.privacy.onlineStatus}
        onValueChange={(value) =>
          updatePrivacy({ onlineStatus: value as OnlineStatusVisibility })
        }
        options={visibilityOptions}
        vertical
      />

      <SettingsToggle
        id="show-last-seen"
        label="Show last seen"
        description="Let others see when you were last active"
        checked={settings.privacy.lastSeen}
        onCheckedChange={(checked) => updatePrivacy({ lastSeen: checked })}
        disabled={settings.privacy.onlineStatus === "nobody"}
      />
    </SettingsSection>
  );
}
