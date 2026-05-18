"use client";

import { useState } from "react";
import {
  Settings,
  Sun,
  Moon,
  Monitor,
  Volume2,
  VolumeX,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type {
  OnboardingStepProps,
  OnboardingPreferences,
} from "@/lib/onboarding/onboarding-types";
import { defaultOnboardingPreferences } from "@/lib/onboarding/onboarding-steps";

interface PreferencesStepProps extends OnboardingStepProps {
  initialData?: Partial<OnboardingPreferences>;
  onDataChange?: (data: OnboardingPreferences) => void;
}

type ThemeOption = OnboardingPreferences["theme"];
type DensityOption = OnboardingPreferences["messageDensity"];
type EmailDigestOption = OnboardingPreferences["emailDigest"];

export function PreferencesStep({
  onNext,
  onPrev,
  onSkip,
  isFirst,
  canSkip,
  initialData,
  onDataChange,
}: PreferencesStepProps) {
  const [preferences, setPreferences] = useState<OnboardingPreferences>({
    ...defaultOnboardingPreferences,
    ...initialData,
  });

  const handleChange = <K extends keyof OnboardingPreferences>(
    key: K,
    value: OnboardingPreferences[K],
  ) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    onDataChange?.(newPreferences);
  };

  const themeOptions: {
    value: ThemeOption;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { value: "light", label: "Light", icon: <Sun className="h-5 w-5" /> },
    { value: "dark", label: "Dark", icon: <Moon className="h-5 w-5" /> },
    { value: "system", label: "System", icon: <Monitor className="h-5 w-5" /> },
  ];

  const densityOptions: {
    value: DensityOption;
    label: string;
    description: string;
  }[] = [
    {
      value: "compact",
      label: "Compact",
      description: "More messages visible",
    },
    {
      value: "comfortable",
      label: "Comfortable",
      description: "Balanced spacing",
    },
    { value: "spacious", label: "Spacious", description: "Easier to read" },
  ];

  const emailDigestOptions: { value: EmailDigestOption; label: string }[] = [
    { value: "none", label: "Never" },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
  ];

  return (
    <div className="flex flex-col px-4 py-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="from-primary/20 to-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br">
          <Settings className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
          Set Your Preferences
        </h2>
        <p className="mx-auto max-w-md text-zinc-600 dark:text-zinc-400">
          Customize your experience. You can change these anytime in settings.
        </p>
      </div>

      {/* Preferences Form */}
      <div className="mx-auto w-full max-w-md space-y-8">
        {/* Theme */}
        <div className="space-y-3">
          <Label className="text-base">Theme</Label>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleChange("theme", option.value)}
                className={cn(
                  "flex flex-col items-center justify-center rounded-xl border-2 p-4 transition-all",
                  preferences.theme === option.value
                    ? "bg-primary/5 border-primary"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600",
                )}
              >
                <span
                  className={cn(
                    "mb-2",
                    preferences.theme === option.value
                      ? "text-primary"
                      : "text-zinc-500",
                  )}
                >
                  {option.icon}
                </span>
                <span
                  className={cn(
                    "text-sm font-medium",
                    preferences.theme === option.value
                      ? "text-primary"
                      : "text-zinc-700 dark:text-zinc-300",
                  )}
                >
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Message Density */}
        <div className="space-y-3">
          <Label className="text-base">Message Density</Label>
          <div className="space-y-2">
            {densityOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleChange("messageDensity", option.value)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border-2 p-3 text-left transition-all",
                  preferences.messageDensity === option.value
                    ? "bg-primary/5 border-primary"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600",
                )}
              >
                <div>
                  <div
                    className={cn(
                      "font-medium",
                      preferences.messageDensity === option.value
                        ? "text-primary"
                        : "text-zinc-900 dark:text-white",
                    )}
                  >
                    {option.label}
                  </div>
                  <div className="text-sm text-zinc-500">
                    {option.description}
                  </div>
                </div>
                <div
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full border-2",
                    preferences.messageDensity === option.value
                      ? "border-primary"
                      : "border-zinc-300 dark:border-zinc-600",
                  )}
                >
                  {preferences.messageDensity === option.value && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Sound Settings */}
        <div className="space-y-3">
          <Label className="text-base">Sound & Notifications</Label>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {preferences.soundsEnabled ? (
                  <Volume2 className="h-5 w-5 text-zinc-500" />
                ) : (
                  <VolumeX className="h-5 w-5 text-zinc-500" />
                )}
                <div>
                  <div className="font-medium text-zinc-900 dark:text-white">
                    Sound Effects
                  </div>
                  <div className="text-sm text-zinc-500">
                    Play sounds for notifications
                  </div>
                </div>
              </div>
              <Switch
                checked={preferences.soundsEnabled}
                onCheckedChange={(checked) =>
                  handleChange("soundsEnabled", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-zinc-900 dark:text-white">
                  Show Online Status
                </div>
                <div className="text-sm text-zinc-500">
                  Let others see when you're online
                </div>
              </div>
              <Switch
                checked={preferences.showOnlineStatus}
                onCheckedChange={(checked) =>
                  handleChange("showOnlineStatus", checked)
                }
              />
            </div>
          </div>
        </div>

        {/* Email Digest */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            Email Digest
          </Label>
          <div className="flex gap-2">
            {emailDigestOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleChange("emailDigest", option.value)}
                className={cn(
                  "flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all",
                  preferences.emailDigest === option.value
                    ? "bg-primary/5 border-primary text-primary"
                    : "border-zinc-200 text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-500">
            Receive a summary of activity you may have missed
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between border-t border-zinc-200 pt-6 dark:border-zinc-700">
        <div>
          {!isFirst && (
            <Button variant="ghost" onClick={onPrev}>
              Back
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {canSkip && onSkip && (
            <Button variant="ghost" onClick={onSkip}>
              Skip
            </Button>
          )}
          <Button onClick={onNext}>Continue</Button>
        </div>
      </div>
    </div>
  );
}
