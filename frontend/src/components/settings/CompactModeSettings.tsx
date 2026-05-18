"use client";

import { SettingsSection } from "./settings-section";
import { SettingsToggle } from "./SettingsToggle";
import { useSettingsStore } from "@/stores/settings-store";

interface CompactModeSettingsProps {
  className?: string;
}

/**
 * CompactModeSettings - Toggle compact mode
 */
export function CompactModeSettings({ className }: CompactModeSettingsProps) {
  const { settings, updateAppearance } = useSettingsStore();

  return (
    <SettingsSection
      title="Compact Mode"
      description="Reduce spacing for a denser interface"
      className={className}
    >
      <SettingsToggle
        id="compact-mode"
        label="Enable compact mode"
        description="Use less spacing between elements to fit more content on screen"
        checked={settings.appearance.compactMode}
        onCheckedChange={(checked) =>
          updateAppearance({ compactMode: checked })
        }
      />

      <SettingsToggle
        id="show-avatars"
        label="Show avatars"
        description="Display user avatars in messages and lists"
        checked={settings.appearance.showAvatars}
        onCheckedChange={(checked) =>
          updateAppearance({ showAvatars: checked })
        }
      />

      <SettingsToggle
        id="show-timestamps"
        label="Show timestamps"
        description="Display timestamps on messages"
        checked={settings.appearance.showTimestamps}
        onCheckedChange={(checked) =>
          updateAppearance({ showTimestamps: checked })
        }
      />
    </SettingsSection>
  );
}
