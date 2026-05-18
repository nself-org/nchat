"use client";

import { SettingsSection } from "./settings-section";
import { SettingsToggle } from "./SettingsToggle";
import { SettingsSelect } from "./SettingsSelect";
import { useSettingsStore } from "@/stores/settings-store";
import type { ContrastMode } from "@/lib/settings/settings-types";

interface ContrastSettingsProps {
  className?: string;
}

const contrastOptions = [
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "higher", label: "Higher" },
];

/**
 * ContrastSettings - High contrast mode settings
 */
export function ContrastSettings({ className }: ContrastSettingsProps) {
  const { settings, updateAccessibility } = useSettingsStore();

  return (
    <SettingsSection
      title="Visual"
      description="Adjust visual settings for better visibility"
      className={className}
    >
      <SettingsToggle
        id="high-contrast"
        label="High contrast mode"
        description="Increase contrast between text and backgrounds for better readability"
        checked={settings.accessibility.highContrast}
        onCheckedChange={(checked) =>
          updateAccessibility({ highContrast: checked })
        }
      />

      {settings.accessibility.highContrast && (
        <SettingsSelect
          id="contrast-level"
          label="Contrast level"
          description="Choose the level of contrast enhancement"
          value={settings.accessibility.contrastMode}
          onValueChange={(value) =>
            updateAccessibility({ contrastMode: value as ContrastMode })
          }
          options={contrastOptions}
        />
      )}

      <SettingsToggle
        id="dyslexia-font"
        label="Dyslexia-friendly font"
        description="Use a font designed to improve readability for users with dyslexia"
        checked={settings.accessibility.dyslexiaFont}
        onCheckedChange={(checked) =>
          updateAccessibility({ dyslexiaFont: checked })
        }
      />

      <SettingsToggle
        id="reduce-transparency"
        label="Reduce transparency"
        description="Reduce transparency effects for better visibility"
        checked={settings.accessibility.reduceTransparency}
        onCheckedChange={(checked) =>
          updateAccessibility({ reduceTransparency: checked })
        }
      />
    </SettingsSection>
  );
}
