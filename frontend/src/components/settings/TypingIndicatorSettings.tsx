"use client";

import { SettingsSection } from "./settings-section";
import { SettingsToggle } from "./SettingsToggle";
import { useSettingsStore } from "@/stores/settings-store";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface TypingIndicatorSettingsProps {
  className?: string;
}

/**
 * TypingIndicatorSettings - Control typing indicator visibility
 */
export function TypingIndicatorSettings({
  className,
}: TypingIndicatorSettingsProps) {
  const { settings, updatePrivacy } = useSettingsStore();

  return (
    <SettingsSection
      title="Typing Indicator"
      description="Control when others see you typing"
      className={className}
    >
      <SettingsToggle
        id="typing-indicator"
        label="Show typing indicator"
        description="Let others see when you are typing a message"
        checked={settings.privacy.typingIndicator}
        onCheckedChange={(checked) =>
          updatePrivacy({ typingIndicator: checked })
        }
      />

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          This setting is reciprocal. If you turn off the typing indicator, you
          will no longer see when others are typing either.
        </AlertDescription>
      </Alert>
    </SettingsSection>
  );
}
