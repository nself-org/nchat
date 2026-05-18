"use client";

import { SettingsSection } from "./settings-section";
import { SettingsToggle } from "./SettingsToggle";
import { useSettingsStore } from "@/stores/settings-store";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface MotionSettingsProps {
  className?: string;
}

/**
 * MotionSettings - Control animations and motion
 */
export function MotionSettings({ className }: MotionSettingsProps) {
  const { settings, updateAccessibility } = useSettingsStore();

  // Check for system preference
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <SettingsSection
      title="Motion"
      description="Control animations and transitions"
      className={className}
    >
      {prefersReducedMotion && (
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Your operating system is set to reduce motion. This preference is
            being respected automatically.
          </AlertDescription>
        </Alert>
      )}

      <SettingsToggle
        id="reduce-motion-a11y"
        label="Reduce motion"
        description="Minimize animations and transitions throughout the application"
        checked={settings.accessibility.reduceMotion || prefersReducedMotion}
        onCheckedChange={(checked) =>
          updateAccessibility({ reduceMotion: checked })
        }
        disabled={prefersReducedMotion}
      />
    </SettingsSection>
  );
}
