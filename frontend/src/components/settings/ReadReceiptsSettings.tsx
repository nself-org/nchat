"use client";

import { SettingsSection } from "./settings-section";
import { SettingsToggle } from "./SettingsToggle";
import { useSettingsStore } from "@/stores/settings-store";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface ReadReceiptsSettingsProps {
  className?: string;
}

/**
 * ReadReceiptsSettings - Control read receipt visibility
 */
export function ReadReceiptsSettings({ className }: ReadReceiptsSettingsProps) {
  const { settings, updatePrivacy } = useSettingsStore();

  return (
    <SettingsSection
      title="Read Receipts"
      description="Control who knows when you have read their messages"
      className={className}
    >
      <SettingsToggle
        id="read-receipts"
        label="Send read receipts"
        description="Let others know when you have read their messages"
        checked={settings.privacy.readReceipts}
        onCheckedChange={(checked) => updatePrivacy({ readReceipts: checked })}
      />

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          This setting is reciprocal. If you turn off read receipts, you will no
          longer see when others have read your messages either.
        </AlertDescription>
      </Alert>
    </SettingsSection>
  );
}
