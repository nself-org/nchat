"use client";

import { SettingsSection } from "./settings-section";
import { SettingsSelect } from "./SettingsSelect";
import { SettingsToggle } from "./SettingsToggle";
import { useSettingsStore } from "@/stores/settings-store";
import type { ProfileVisibility } from "@/lib/settings/settings-types";

interface ProfileVisibilitySettingsProps {
  className?: string;
}

const visibilityOptions = [
  {
    value: "public",
    label: "Public",
    description: "Anyone can view your full profile",
  },
  {
    value: "members",
    label: "Workspace members",
    description: "Only workspace members can view your profile",
  },
  {
    value: "private",
    label: "Private",
    description: "Only show your name and avatar",
  },
];

/**
 * ProfileVisibilitySettings - Control profile visibility
 */
export function ProfileVisibilitySettings({
  className,
}: ProfileVisibilitySettingsProps) {
  const { settings, updatePrivacy } = useSettingsStore();

  return (
    <SettingsSection
      title="Profile Visibility"
      description="Control who can see your profile information"
      className={className}
    >
      <SettingsSelect
        id="profile-visibility"
        label="Profile visibility"
        description="Choose who can view your full profile"
        value={settings.privacy.profileVisibility}
        onValueChange={(value) =>
          updatePrivacy({ profileVisibility: value as ProfileVisibility })
        }
        options={visibilityOptions}
        vertical
      />

      <div className="rounded-lg border p-4">
        <p className="mb-3 text-sm font-medium">Profile fields visibility</p>

        <SettingsToggle
          id="show-email"
          label="Show email address"
          description="Display your email on your public profile"
          checked={settings.privacy.showEmail}
          onCheckedChange={(checked) => updatePrivacy({ showEmail: checked })}
          disabled={settings.privacy.profileVisibility === "private"}
        />

        <SettingsToggle
          id="show-bio"
          label="Show bio"
          description="Display your bio on your profile"
          checked={settings.privacy.showBio}
          onCheckedChange={(checked) => updatePrivacy({ showBio: checked })}
          disabled={settings.privacy.profileVisibility === "private"}
        />

        <SettingsToggle
          id="show-activity"
          label="Show activity status"
          description="Let others see what channels you are active in"
          checked={settings.privacy.showActivity}
          onCheckedChange={(checked) =>
            updatePrivacy({ showActivity: checked })
          }
        />
      </div>
    </SettingsSection>
  );
}
