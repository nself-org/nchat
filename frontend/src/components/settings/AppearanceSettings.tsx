"use client";

import { SettingsSection } from "./settings-section";
import { ThemeSettings } from "./ThemeSettings";
import { FontSettings } from "./FontSettings";
import { CompactModeSettings } from "./CompactModeSettings";
import { SidebarSettings } from "./SidebarSettings";
import { MessageDisplaySettings } from "./MessageDisplaySettings";
import { EmojiSettings } from "./EmojiSettings";
import { AnimationSettings } from "./AnimationSettings";
import { SettingsColorPicker } from "./SettingsColorPicker";
import { SettingsReset } from "./SettingsReset";
import { useSettingsStore } from "@/stores/settings-store";
import { Palette } from "lucide-react";

interface AppearanceSettingsProps {
  className?: string;
}

/**
 * AppearanceSettings - Theme, colors, and display preferences
 */
export function AppearanceSettings({ className }: AppearanceSettingsProps) {
  const { settings, updateAppearance, resetAppearance } = useSettingsStore();

  return (
    <div className={className}>
      {/* Page Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
          <Palette className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appearance</h1>
          <p className="text-sm text-muted-foreground">
            Customize the look and feel of the app
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <ThemeSettings />

        <SettingsSection
          title="Accent Color"
          description="Choose your primary accent color"
        >
          <SettingsColorPicker
            id="accent-color"
            label="Accent color"
            description="Used for buttons, links, and highlights"
            value={settings.appearance.accentColor}
            onChange={(color) => updateAppearance({ accentColor: color })}
          />
        </SettingsSection>

        <FontSettings />
        <MessageDisplaySettings />
        <SidebarSettings />
        <CompactModeSettings />
        <EmojiSettings />
        <AnimationSettings />

        <SettingsReset
          label="Reset Appearance Settings"
          description="Reset all appearance settings to their default values"
          onReset={resetAppearance}
          confirmDescription="This will reset your theme, colors, fonts, and all other appearance settings to their defaults."
        />
      </div>
    </div>
  );
}
