"use client";

import { SettingsSection } from "./settings-section";
import { SettingsSelect } from "./SettingsSelect";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settings-store";
import type { MessageDensity } from "@/lib/settings/settings-types";
import { Check } from "lucide-react";

interface MessageDisplaySettingsProps {
  className?: string;
}

const densityOptions: {
  value: MessageDensity;
  label: string;
  description: string;
  spacing: string;
}[] = [
  {
    value: "compact",
    label: "Compact",
    description: "Minimal spacing, more messages visible",
    spacing: "gap-1",
  },
  {
    value: "comfortable",
    label: "Comfortable",
    description: "Balanced spacing for easy reading",
    spacing: "gap-2",
  },
  {
    value: "spacious",
    label: "Spacious",
    description: "More room between messages",
    spacing: "gap-4",
  },
];

/**
 * MessageDisplaySettings - Message density and display options
 */
export function MessageDisplaySettings({
  className,
}: MessageDisplaySettingsProps) {
  const { settings, updateAppearance } = useSettingsStore();

  return (
    <SettingsSection
      title="Message Display"
      description="Customize how messages are displayed"
      className={className}
    >
      <div className="space-y-4">
        <p className="text-sm font-medium">Message density</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {densityOptions.map((option) => {
            const isActive =
              settings.appearance.messageDensity === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  updateAppearance({ messageDensity: option.value })
                }
                className={cn(
                  "relative flex flex-col rounded-lg border p-4 text-left transition-all",
                  isActive
                    ? "border-primary ring-2 ring-primary ring-offset-2"
                    : "hover:border-muted-foreground/50 border-input",
                )}
              >
                {isActive && (
                  <div className="absolute right-2 top-2">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                )}

                {/* Preview */}
                <div
                  className={cn(
                    "bg-muted/50 mb-3 flex flex-col rounded border p-2",
                    option.spacing,
                  )}
                >
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="h-4 w-4 rounded-full bg-muted" />
                      <div className="flex-1 space-y-1">
                        <div className="h-1.5 w-12 rounded bg-muted" />
                        <div className="bg-muted/70 h-1 w-full rounded" />
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-sm font-medium">{option.label}</p>
                <p className="text-xs text-muted-foreground">
                  {option.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </SettingsSection>
  );
}
