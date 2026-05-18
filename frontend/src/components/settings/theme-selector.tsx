"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sun, Moon, Monitor, Check } from "lucide-react";

interface ThemeOption {
  value: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

const themeOptions: ThemeOption[] = [
  {
    value: "light",
    label: "Light",
    icon: Sun,
    description: "A clean, bright interface",
  },
  {
    value: "dark",
    label: "Dark",
    icon: Moon,
    description: "Easy on the eyes in low light",
  },
  {
    value: "system",
    label: "System",
    icon: Monitor,
    description: "Match your device settings",
  },
];

interface ThemeSelectorProps {
  className?: string;
  variant?: "cards" | "radio" | "buttons";
}

export function ThemeSelector({
  className,
  variant = "cards",
}: ThemeSelectorProps) {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("space-y-3", className)}>
        {themeOptions.map((option) => (
          <div
            key={option.value}
            className="flex items-center space-x-3 rounded-lg border p-4 opacity-50"
          >
            <div className="h-5 w-5 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "buttons") {
    return (
      <div className={cn("flex gap-2", className)}>
        {themeOptions.map((option) => {
          const Icon = option.icon;
          const isActive = theme === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "text-primary-foreground border-primary bg-primary"
                  : "border-input bg-background hover:bg-muted",
              )}
            >
              <Icon className="h-4 w-4" />
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === "radio") {
    return (
      <RadioGroup
        value={theme}
        onValueChange={setTheme}
        className={cn("space-y-2", className)}
      >
        {themeOptions.map((option) => {
          const Icon = option.icon;
          return (
            <div key={option.value} className="flex items-center space-x-3">
              <RadioGroupItem
                value={option.value}
                id={`theme-${option.value}`}
              />
              <Icon className="h-4 w-4 text-muted-foreground" />
              <Label
                htmlFor={`theme-${option.value}`}
                className="cursor-pointer"
              >
                {option.label}
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    );
  }

  // Cards variant (default)
  return (
    <div className={cn("grid gap-3 sm:grid-cols-3", className)}>
      {themeOptions.map((option) => {
        const Icon = option.icon;
        const isActive = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            className={cn(
              "relative flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-all",
              isActive
                ? "bg-primary/5 border-primary ring-2 ring-primary ring-offset-2"
                : "hover:border-muted-foreground/50 hover:bg-muted/50 border-input",
            )}
          >
            {isActive && (
              <div className="absolute right-2 top-2">
                <Check className="h-4 w-4 text-primary" />
              </div>
            )}
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                isActive ? "text-primary-foreground bg-primary" : "bg-muted",
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">{option.label}</p>
              <p className="text-xs text-muted-foreground">
                {option.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
