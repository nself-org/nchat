"use client";

import { SettingsSection } from "./settings-section";
import { SettingsSelect } from "./SettingsSelect";
import { SettingsSlider } from "./SettingsSlider";
import { useSettingsStore } from "@/stores/settings-store";
import {
  fontFamilyOptions,
  fontSizeOptions,
} from "@/lib/settings/settings-defaults";
import type { FontSize, FontFamily } from "@/lib/settings/settings-types";

interface FontSettingsProps {
  className?: string;
}

/**
 * FontSettings - Font size and family settings
 */
export function FontSettings({ className }: FontSettingsProps) {
  const { settings, updateAppearance } = useSettingsStore();

  const fontSizeSelectOptions = fontSizeOptions.map((opt) => ({
    value: opt.value,
    label: `${opt.label} (${opt.size})`,
  }));

  const fontFamilySelectOptions = fontFamilyOptions.map((opt) => ({
    value: opt.value,
    label: opt.label,
  }));

  return (
    <SettingsSection
      title="Typography"
      description="Customize font size and family"
      className={className}
    >
      <div className="space-y-4">
        <SettingsSelect
          id="font-size"
          label="Font size"
          description="Base text size throughout the app"
          value={settings.appearance.fontSize}
          onValueChange={(value) =>
            updateAppearance({ fontSize: value as FontSize })
          }
          options={fontSizeSelectOptions}
        />

        <SettingsSelect
          id="font-family"
          label="Font family"
          description="Primary typeface for text"
          value={settings.appearance.fontFamily}
          onValueChange={(value) =>
            updateAppearance({ fontFamily: value as FontFamily })
          }
          options={fontFamilySelectOptions}
        />

        {/* Preview */}
        <div className="bg-muted/50 rounded-lg border p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Preview
          </p>
          <p
            className="text-foreground"
            style={{
              fontSize:
                fontSizeOptions.find(
                  (o) => o.value === settings.appearance.fontSize,
                )?.size || "16px",
              fontFamily:
                fontFamilyOptions.find(
                  (o) => o.value === settings.appearance.fontFamily,
                )?.family || "system-ui",
            }}
          >
            The quick brown fox jumps over the lazy dog. 1234567890
          </p>
        </div>
      </div>
    </SettingsSection>
  );
}
