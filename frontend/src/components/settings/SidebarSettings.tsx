"use client";

import { SettingsSection } from "./settings-section";
import { SettingsSelect } from "./SettingsSelect";
import { SettingsSlider } from "./SettingsSlider";
import { useSettingsStore } from "@/stores/settings-store";
import type { SidebarPosition } from "@/lib/settings/settings-types";

interface SidebarSettingsProps {
  className?: string;
}

const positionOptions = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
];

/**
 * SidebarSettings - Sidebar position and width
 */
export function SidebarSettings({ className }: SidebarSettingsProps) {
  const { settings, updateAppearance } = useSettingsStore();

  return (
    <SettingsSection
      title="Sidebar"
      description="Customize sidebar appearance and behavior"
      className={className}
    >
      <SettingsSelect
        id="sidebar-position"
        label="Sidebar position"
        description="Place the sidebar on the left or right"
        value={settings.appearance.sidebarPosition}
        onValueChange={(value) =>
          updateAppearance({ sidebarPosition: value as SidebarPosition })
        }
        options={positionOptions}
      />

      <SettingsSlider
        id="sidebar-width"
        label="Sidebar width"
        description="Adjust the width of the sidebar"
        value={settings.appearance.sidebarWidth}
        onValueChange={(value) => updateAppearance({ sidebarWidth: value })}
        min={200}
        max={400}
        step={10}
        unit="px"
        vertical
      />
    </SettingsSection>
  );
}
