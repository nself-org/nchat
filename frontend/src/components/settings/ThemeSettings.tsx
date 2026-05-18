"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { SettingsSection } from "./settings-section";
import { cn } from "@/lib/utils";
import { Sun, Moon, Monitor, Check } from "lucide-react";

interface ThemeOption {
  value: string;
  label: string;
  icon: React.ElementType;
  description: string;
  preview: {
    bg: string;
    surface: string;
    text: string;
  };
}

const themeOptions: ThemeOption[] = [
  {
    value: "light",
    label: "Light",
    icon: Sun,
    description: "A clean, bright interface",
    preview: {
      bg: "bg-gray-100",
      surface: "bg-white",
      text: "text-gray-900",
    },
  },
  {
    value: "dark",
    label: "Dark",
    icon: Moon,
    description: "Easy on the eyes in low light",
    preview: {
      bg: "bg-gray-900",
      surface: "bg-gray-800",
      text: "text-gray-100",
    },
  },
  {
    value: "system",
    label: "System",
    icon: Monitor,
    description: "Match your device settings",
    preview: {
      bg: "bg-gradient-to-r from-gray-100 to-gray-900",
      surface: "bg-gradient-to-r from-white to-gray-800",
      text: "text-gray-500",
    },
  },
];

interface ThemeSettingsProps {
  className?: string;
}

/**
 * ThemeSettings - Light/dark/system theme selection
 */
export function ThemeSettings({ className }: ThemeSettingsProps) {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <SettingsSection
        title="Theme"
        description="Select your preferred color scheme"
        className={className}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {themeOptions.map((option) => (
            <div
              key={option.value}
              className="h-32 animate-pulse rounded-lg border bg-muted"
            />
          ))}
        </div>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection
      title="Theme"
      description="Select your preferred color scheme"
      className={className}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {themeOptions.map((option) => {
          const Icon = option.icon;
          const isActive = theme === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-lg border text-left transition-all",
                isActive
                  ? "border-primary ring-2 ring-primary ring-offset-2"
                  : "hover:border-muted-foreground/50 border-input",
              )}
            >
              {/* Preview */}
              <div className={cn("h-20 p-3", option.preview.bg)}>
                <div className={cn("h-full rounded", option.preview.surface)}>
                  <div className="flex h-full flex-col justify-between p-2">
                    <div className="space-y-1">
                      <div
                        className={cn(
                          "h-1.5 w-12 rounded",
                          option.preview.text,
                          "opacity-30",
                        )}
                      />
                      <div
                        className={cn(
                          "h-1 w-8 rounded",
                          option.preview.text,
                          "opacity-20",
                        )}
                      />
                    </div>
                    <div className="flex gap-1">
                      <div
                        className={cn(
                          "h-4 w-4 rounded",
                          option.preview.text,
                          "opacity-20",
                        )}
                      />
                      <div
                        className={cn(
                          "h-4 flex-1 rounded",
                          option.preview.text,
                          "opacity-10",
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Label */}
              <div className="flex flex-1 items-center gap-2 bg-card p-3">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    isActive
                      ? "text-primary-foreground bg-primary"
                      : "bg-muted",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{option.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {option.description}
                  </p>
                </div>
                {isActive && <Check className="h-4 w-4 text-primary" />}
              </div>
            </button>
          );
        })}
      </div>
    </SettingsSection>
  );
}
