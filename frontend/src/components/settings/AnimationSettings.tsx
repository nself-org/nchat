"use client";

import { SettingsSection } from "./settings-section";
import { SettingsToggle } from "./SettingsToggle";
import { useSettingsStore } from "@/stores/settings-store";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface AnimationSettingsProps {
  className?: string;
}

/**
 * AnimationSettings - Control animations and motion
 */
export function AnimationSettings({ className }: AnimationSettingsProps) {
  const { settings, updateAppearance } = useSettingsStore();

  // Check for system preference
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <SettingsSection
      title="Animations"
      description="Control motion and transitions"
      className={className}
    >
      {prefersReducedMotion && (
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Your system is set to reduce motion. These settings will be
            automatically applied.
          </AlertDescription>
        </Alert>
      )}

      <SettingsToggle
        id="animations-enabled"
        label="Enable animations"
        description="Show transitions and animations throughout the app"
        checked={settings.appearance.animationsEnabled}
        onCheckedChange={(checked) =>
          updateAppearance({ animationsEnabled: checked })
        }
        disabled={prefersReducedMotion}
      />

      <SettingsToggle
        id="reduce-motion"
        label="Reduce motion"
        description="Minimize or eliminate motion for accessibility"
        checked={settings.appearance.reduceMotion || prefersReducedMotion}
        onCheckedChange={(checked) =>
          updateAppearance({ reduceMotion: checked })
        }
        disabled={prefersReducedMotion}
      />

      <SettingsToggle
        id="reduce-transparency"
        label="Reduce transparency"
        description="Reduce background blur and transparency effects"
        checked={settings.appearance.reduceTransparency}
        onCheckedChange={(checked) =>
          updateAppearance({ reduceTransparency: checked })
        }
      />
    </SettingsSection>
  );
}
