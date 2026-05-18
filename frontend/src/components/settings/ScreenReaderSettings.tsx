"use client";

import { SettingsSection } from "./settings-section";
import { SettingsToggle } from "./SettingsToggle";
import { useSettingsStore } from "@/stores/settings-store";

interface ScreenReaderSettingsProps {
  className?: string;
}

/**
 * ScreenReaderSettings - Screen reader optimization options
 */
export function ScreenReaderSettings({ className }: ScreenReaderSettingsProps) {
  const { settings, updateAccessibility } = useSettingsStore();

  return (
    <SettingsSection
      title="Screen Reader"
      description="Optimize the interface for screen reader users"
      className={className}
    >
      <SettingsToggle
        id="screen-reader-mode"
        label="Screen reader optimization"
        description="Enhance ARIA labels and descriptions for better screen reader compatibility"
        checked={settings.accessibility.screenReaderMode}
        onCheckedChange={(checked) =>
          updateAccessibility({ screenReaderMode: checked })
        }
      />

      <SettingsToggle
        id="announce-messages"
        label="Announce new messages"
        description="Automatically announce new chat messages to screen readers"
        checked={settings.accessibility.announceMessages}
        onCheckedChange={(checked) =>
          updateAccessibility({ announceMessages: checked })
        }
      />

      <SettingsToggle
        id="prefer-captions"
        label="Prefer captions"
        description="Show captions or transcripts for audio and video content when available"
        checked={settings.accessibility.preferCaptions}
        onCheckedChange={(checked) =>
          updateAccessibility({ preferCaptions: checked })
        }
      />
    </SettingsSection>
  );
}
