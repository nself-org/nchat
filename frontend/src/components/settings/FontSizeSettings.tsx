"use client";

import { SettingsSection } from "./settings-section";
import { SettingsSelect } from "./SettingsSelect";
import { useSettingsStore } from "@/stores/settings-store";
import { fontSizeOptions } from "@/lib/settings/settings-defaults";
import type { FontSize } from "@/lib/settings/settings-types";

interface FontSizeSettingsProps {
  className?: string;
}

/**
 * FontSizeSettings - Font scaling for accessibility
 */
export function FontSizeSettings({ className }: FontSizeSettingsProps) {
  const { settings, updateAccessibility } = useSettingsStore();

  const fontSizeSelectOptions = fontSizeOptions.map((opt) => ({
    value: opt.value,
    label: `${opt.label} (${opt.size})`,
  }));

  return (
    <SettingsSection
      title="Text Size"
      description="Adjust the base text size throughout the application"
      className={className}
    >
      <SettingsSelect
        id="font-size-a11y"
        label="Text size"
        description="Choose a comfortable text size"
        value={settings.accessibility.fontSize}
        onValueChange={(value) =>
          updateAccessibility({ fontSize: value as FontSize })
        }
        options={fontSizeSelectOptions}
      />

      {/* Preview */}
      <div className="bg-muted/50 mt-4 rounded-lg border p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Preview
        </p>
        <p
          style={{
            fontSize:
              fontSizeOptions.find(
                (o) => o.value === settings.accessibility.fontSize,
              )?.size || "16px",
          }}
        >
          The quick brown fox jumps over the lazy dog.
        </p>
        <p
          className="mt-2 text-muted-foreground"
          style={{
            fontSize: `calc(${
              fontSizeOptions.find(
                (o) => o.value === settings.accessibility.fontSize,
              )?.size || "16px"
            } * 0.875)`,
          }}
        >
          This is smaller secondary text for comparison.
        </p>
      </div>
    </SettingsSection>
  );
}
