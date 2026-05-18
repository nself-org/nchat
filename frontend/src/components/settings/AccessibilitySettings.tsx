"use client";

import { SettingsSection } from "./settings-section";
import { ScreenReaderSettings } from "./ScreenReaderSettings";
import { KeyboardSettings } from "./KeyboardSettings";
import { ContrastSettings } from "./ContrastSettings";
import { MotionSettings } from "./MotionSettings";
import { FontSizeSettings } from "./FontSizeSettings";
import { SettingsReset } from "./SettingsReset";
import { useSettingsStore } from "@/stores/settings-store";
import { Accessibility } from "lucide-react";

interface AccessibilitySettingsProps {
  className?: string;
}

/**
 * AccessibilitySettings - Comprehensive accessibility options
 */
export function AccessibilitySettings({
  className,
}: AccessibilitySettingsProps) {
  const { resetAccessibility } = useSettingsStore();

  return (
    <div className={className}>
      {/* Page Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
          <Accessibility className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accessibility</h1>
          <p className="text-sm text-muted-foreground">
            Customize the app to better suit your needs
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <ContrastSettings />
        <FontSizeSettings />
        <MotionSettings />
        <KeyboardSettings />
        <ScreenReaderSettings />

        <SettingsReset
          label="Reset Accessibility Settings"
          description="Reset all accessibility settings to their default values"
          onReset={resetAccessibility}
          confirmDescription="This will reset all accessibility settings including contrast, font size, motion, and screen reader options."
        />

        {/* Help Section */}
        <SettingsSection title="Need Help?">
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              If you encounter any accessibility issues or have suggestions for
              improvement, please{" "}
              <a
                href="mailto:support@nself.org"
                className="text-primary underline hover:no-underline"
              >
                contact our support team
              </a>
              . We are committed to making nchat accessible to everyone.
            </p>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}
