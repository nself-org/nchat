"use client";

import { SettingsSection } from "./settings-section";
import { SettingsToggle } from "./SettingsToggle";
import { useSettingsStore } from "@/stores/settings-store";
import { cn } from "@/lib/utils";

interface KeyboardSettingsProps {
  className?: string;
}

interface ShortcutInfo {
  keys: string[];
  action: string;
  category: string;
}

const shortcuts: ShortcutInfo[] = [
  { keys: ["Tab"], action: "Move to next element", category: "Navigation" },
  {
    keys: ["Shift", "Tab"],
    action: "Move to previous element",
    category: "Navigation",
  },
  {
    keys: ["Enter"],
    action: "Activate button or link",
    category: "Navigation",
  },
  {
    keys: ["Space"],
    action: "Toggle checkbox or button",
    category: "Navigation",
  },
  {
    keys: ["Esc"],
    action: "Close modal or cancel action",
    category: "Navigation",
  },
  {
    keys: ["Arrow Up"],
    action: "Previous item in list",
    category: "Navigation",
  },
  { keys: ["Arrow Down"], action: "Next item in list", category: "Navigation" },
  { keys: ["Cmd", "K"], action: "Open command palette", category: "Global" },
  { keys: ["Cmd", "/"], action: "Toggle sidebar", category: "Global" },
  { keys: ["Cmd", "N"], action: "New message", category: "Messaging" },
  { keys: ["Cmd", "Enter"], action: "Send message", category: "Messaging" },
];

/**
 * KeyboardSettings - Keyboard navigation and shortcuts
 */
export function KeyboardSettings({ className }: KeyboardSettingsProps) {
  const { settings, updateAccessibility } = useSettingsStore();

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce(
    (acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = [];
      }
      acc[shortcut.category].push(shortcut);
      return acc;
    },
    {} as Record<string, ShortcutInfo[]>,
  );

  return (
    <SettingsSection
      title="Keyboard Navigation"
      description="Keyboard shortcuts and navigation options"
      className={className}
    >
      <SettingsToggle
        id="always-show-focus"
        label="Always show focus indicators"
        description="Show focus rings on all interactions, not just keyboard navigation"
        checked={settings.accessibility.alwaysShowFocus}
        onCheckedChange={(checked) =>
          updateAccessibility({ alwaysShowFocus: checked })
        }
      />

      <SettingsToggle
        id="larger-targets"
        label="Larger touch targets"
        description="Increase the size of interactive elements for easier clicking and tapping"
        checked={settings.accessibility.largerTargets}
        onCheckedChange={(checked) =>
          updateAccessibility({ largerTargets: checked })
        }
      />

      <SettingsToggle
        id="show-keyboard-hints"
        label="Show keyboard shortcuts"
        description="Display keyboard shortcut hints on buttons and actions"
        checked={settings.accessibility.showKeyboardHints}
        onCheckedChange={(checked) =>
          updateAccessibility({ showKeyboardHints: checked })
        }
      />

      {/* Keyboard shortcuts reference */}
      <div className="mt-6 rounded-lg border p-4">
        <p className="mb-4 text-sm font-medium">Keyboard Shortcuts Reference</p>
        <div className="space-y-4">
          {Object.entries(groupedShortcuts).map(
            ([category, categoryShortcuts]) => (
              <div key={category}>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {category}
                </p>
                <div className="space-y-1">
                  {categoryShortcuts.map((shortcut) => (
                    <div
                      key={shortcut.action}
                      className="flex items-center justify-between py-1"
                    >
                      <span className="text-sm text-muted-foreground">
                        {shortcut.action}
                      </span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, index) => (
                          <span key={key} className="flex items-center gap-1">
                            <kbd
                              className={cn(
                                "inline-flex h-6 min-w-[24px] items-center justify-center rounded border",
                                "border-border bg-muted px-1.5 text-xs font-medium text-muted-foreground",
                              )}
                            >
                              {key === "Cmd" &&
                              typeof navigator !== "undefined" &&
                              navigator.platform.includes("Mac")
                                ? "Cmd"
                                : key === "Cmd"
                                  ? "Ctrl"
                                  : key}
                            </kbd>
                            {index < shortcut.keys.length - 1 && (
                              <span className="text-muted-foreground">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    </SettingsSection>
  );
}
