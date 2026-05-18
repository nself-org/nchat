"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Check } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface ProfileThemeOption {
  id: string;
  name: string;
  primaryColor: string;
  backgroundColor: string;
  preview?: string;
}

export interface ProfileThemeProps extends React.HTMLAttributes<HTMLDivElement> {
  themes?: ProfileThemeOption[];
  selectedTheme: string;
  onThemeChange: (themeId: string) => void;
  disabled?: boolean;
}

// ============================================================================
// Default themes
// ============================================================================

const DEFAULT_THEMES: ProfileThemeOption[] = [
  {
    id: "default",
    name: "Default",
    primaryColor: "#6366f1",
    backgroundColor: "#f3f4f6",
  },
  {
    id: "ocean",
    name: "Ocean",
    primaryColor: "#0ea5e9",
    backgroundColor: "#e0f2fe",
  },
  {
    id: "forest",
    name: "Forest",
    primaryColor: "#22c55e",
    backgroundColor: "#dcfce7",
  },
  {
    id: "sunset",
    name: "Sunset",
    primaryColor: "#f97316",
    backgroundColor: "#ffedd5",
  },
  {
    id: "lavender",
    name: "Lavender",
    primaryColor: "#a855f7",
    backgroundColor: "#f3e8ff",
  },
  {
    id: "rose",
    name: "Rose",
    primaryColor: "#f43f5e",
    backgroundColor: "#ffe4e6",
  },
  {
    id: "midnight",
    name: "Midnight",
    primaryColor: "#3b82f6",
    backgroundColor: "#1e293b",
  },
  {
    id: "monochrome",
    name: "Monochrome",
    primaryColor: "#71717a",
    backgroundColor: "#f4f4f5",
  },
];

// ============================================================================
// Component
// ============================================================================

const ProfileTheme = React.forwardRef<HTMLDivElement, ProfileThemeProps>(
  (
    {
      className,
      themes = DEFAULT_THEMES,
      selectedTheme,
      onThemeChange,
      disabled = false,
      ...props
    },
    ref,
  ) => {
    return (
      <div ref={ref} className={cn("space-y-4", className)} {...props}>
        <div>
          <Label className="text-sm font-medium">Profile Theme</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose a color scheme for your profile
          </p>
        </div>

        <RadioGroup
          value={selectedTheme}
          onValueChange={onThemeChange}
          disabled={disabled}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {themes.map((theme) => (
            <div key={theme.id}>
              <RadioGroupItem
                value={theme.id}
                id={`theme-${theme.id}`}
                className="peer sr-only"
              />
              <Label
                htmlFor={`theme-${theme.id}`}
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-3",
                  "hover:border-muted-foreground/50 transition-all",
                  "peer-data-[state=checked]:border-primary peer-data-[state=checked]:ring-1 peer-data-[state=checked]:ring-primary",
                  disabled && "cursor-not-allowed opacity-50",
                )}
              >
                {/* Theme preview */}
                <div
                  className="relative h-12 w-full overflow-hidden rounded-md"
                  style={{ backgroundColor: theme.backgroundColor }}
                >
                  {/* Primary color accent */}
                  <div
                    className="absolute inset-x-0 top-0 h-4"
                    style={{
                      background: `linear-gradient(to right, ${theme.primaryColor}, ${theme.primaryColor}80)`,
                    }}
                  />
                  {/* Selected indicator */}
                  {selectedTheme === theme.id && (
                    <div
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full"
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium">{theme.name}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>

        {/* Custom color preview */}
        {selectedTheme && (
          <div className="rounded-lg border p-4">
            <p className="mb-2 text-xs font-medium">Preview</p>
            <div
              className="h-20 overflow-hidden rounded-md"
              style={{
                backgroundColor:
                  themes.find((t) => t.id === selectedTheme)?.backgroundColor ||
                  "#f3f4f6",
              }}
            >
              <div
                className="h-6"
                style={{
                  background: `linear-gradient(to right, ${
                    themes.find((t) => t.id === selectedTheme)?.primaryColor ||
                    "#6366f1"
                  }, ${themes.find((t) => t.id === selectedTheme)?.primaryColor || "#6366f1"}80)`,
                }}
              />
              <div className="p-2">
                <div
                  className="h-2 w-24 rounded"
                  style={{
                    backgroundColor:
                      themes.find((t) => t.id === selectedTheme)
                        ?.primaryColor || "#6366f1",
                    opacity: 0.5,
                  }}
                />
                <div className="mt-1 h-2 w-16 rounded bg-muted" />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);
ProfileTheme.displayName = "ProfileTheme";

export { ProfileTheme, DEFAULT_THEMES };
