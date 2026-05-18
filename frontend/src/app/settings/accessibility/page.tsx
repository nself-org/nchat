"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import {
  useA11yStore,
  applyA11ySettings,
  FontSize,
  ContrastMode,
} from "@/lib/accessibility";
import { useReducedMotion } from "@/lib/accessibility/use-reduced-motion";
import { cn } from "@/lib/utils";

interface SettingToggleProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function SettingToggle({
  id,
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: SettingToggleProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="flex-1">
        <label
          htmlFor={id}
          className={cn(
            "block text-sm font-medium",
            disabled ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {label}
        </label>
        <p
          id={`${id}-description`}
          className="mt-1 text-sm text-muted-foreground"
        >
          {description}
        </p>
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        aria-describedby={`${id}-description`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent",
          "transition-colors duration-200 ease-in-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-primary" : "bg-muted",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0",
            "transition duration-200 ease-in-out",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}

interface SettingSelectProps {
  id: string;
  label: string;
  description: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

function SettingSelect({
  id,
  label,
  description,
  value,
  options,
  onChange,
}: SettingSelectProps) {
  return (
    <div className="py-4">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      <p
        id={`${id}-description`}
        className="mt-1 text-sm text-muted-foreground"
      >
        {description}
      </p>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={`${id}-description`}
        className={cn(
          "mt-2 block w-full rounded-md border border-input bg-background px-3 py-2",
          "text-sm text-foreground shadow-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function KeyboardHint({ keys, action }: { keys: string[]; action: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{action}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <React.Fragment key={key}>
            <kbd
              className={cn(
                "inline-flex h-6 min-w-[24px] items-center justify-center rounded border",
                "border-border bg-muted px-1.5 text-xs font-medium text-muted-foreground",
              )}
            >
              {key}
            </kbd>
            {index < keys.length - 1 && (
              <span className="text-muted-foreground">+</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default function AccessibilitySettingsPage() {
  const [mounted, setMounted] = useState(false);
  const systemReducedMotion = useReducedMotion();
  const {
    reduceMotion,
    highContrast,
    contrastMode,
    fontSize,
    screenReaderMode,
    alwaysShowFocus,
    reduceTransparency,
    dyslexiaFont,
    largerTargets,
    showKeyboardHints,
    preferCaptions,
    announceMessages,
    setReduceMotion,
    setHighContrast,
    setContrastMode,
    setFontSize,
    setScreenReaderMode,
    setAlwaysShowFocus,
    setReduceTransparency,
    setDyslexiaFont,
    setLargerTargets,
    setShowKeyboardHints,
    setPreferCaptions,
    setAnnounceMessages,
    resetSettings,
  } = useA11yStore();

  // Apply settings on change
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      applyA11ySettings({
        reduceMotion,
        highContrast,
        contrastMode,
        fontSize,
        screenReaderMode,
        alwaysShowFocus,
        reduceTransparency,
        dyslexiaFont,
        largerTargets,
        showKeyboardHints,
        preferCaptions,
        announceMessages,
      });
    }
  }, [
    mounted,
    reduceMotion,
    highContrast,
    contrastMode,
    fontSize,
    screenReaderMode,
    alwaysShowFocus,
    reduceTransparency,
    dyslexiaFont,
    largerTargets,
    showKeyboardHints,
    preferCaptions,
    announceMessages,
  ]);

  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const fontSizeOptions = [
    { value: "small", label: "Small (14px)" },
    { value: "medium", label: "Medium (16px) - Default" },
    { value: "large", label: "Large (18px)" },
    { value: "extra-large", label: "Extra Large (20px)" },
  ];

  const contrastOptions = [
    { value: "normal", label: "Normal" },
    { value: "high", label: "High" },
    { value: "higher", label: "Higher" },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Accessibility Settings
        </h1>
        <p className="mt-2 text-muted-foreground">
          Customize nchat to better suit your needs. These settings help make
          the application more accessible and comfortable to use.
        </p>
      </header>

      <main>
        {/* Visual Settings */}
        <section aria-labelledby="visual-settings-heading" className="mb-8">
          <h2
            id="visual-settings-heading"
            className="mb-4 text-lg font-semibold text-foreground"
          >
            Visual
          </h2>
          <div className="divide-y divide-border rounded-lg border border-border bg-card p-4">
            <SettingToggle
              id="high-contrast"
              label="High Contrast Mode"
              description="Increase contrast between text and backgrounds for better readability."
              checked={highContrast}
              onChange={setHighContrast}
            />

            {highContrast && (
              <SettingSelect
                id="contrast-level"
                label="Contrast Level"
                description="Choose the level of contrast enhancement."
                value={contrastMode}
                options={contrastOptions}
                onChange={(v) => setContrastMode(v as ContrastMode)}
              />
            )}

            <SettingSelect
              id="font-size"
              label="Text Size"
              description="Adjust the base text size throughout the application."
              value={fontSize}
              options={fontSizeOptions}
              onChange={(v) => setFontSize(v as FontSize)}
            />

            <SettingToggle
              id="dyslexia-font"
              label="Dyslexia-Friendly Font"
              description="Use a font designed to improve readability for users with dyslexia."
              checked={dyslexiaFont}
              onChange={setDyslexiaFont}
            />

            <SettingToggle
              id="reduce-transparency"
              label="Reduce Transparency"
              description="Reduce transparency effects for better visibility."
              checked={reduceTransparency}
              onChange={setReduceTransparency}
            />
          </div>
        </section>

        {/* Motion Settings */}
        <section aria-labelledby="motion-settings-heading" className="mb-8">
          <h2
            id="motion-settings-heading"
            className="mb-4 text-lg font-semibold text-foreground"
          >
            Motion
          </h2>
          <div className="divide-y divide-border rounded-lg border border-border bg-card p-4">
            <SettingToggle
              id="reduce-motion"
              label="Reduce Motion"
              description={
                systemReducedMotion
                  ? "Your system prefers reduced motion. This setting is enabled automatically."
                  : "Minimize animations and transitions throughout the application."
              }
              checked={reduceMotion || systemReducedMotion}
              onChange={setReduceMotion}
              disabled={systemReducedMotion}
            />
          </div>
          {systemReducedMotion && (
            <p className="mt-2 text-sm text-muted-foreground">
              Note: Your operating system is set to reduce motion. This
              preference is being respected automatically.
            </p>
          )}
        </section>

        {/* Focus & Navigation */}
        <section aria-labelledby="focus-settings-heading" className="mb-8">
          <h2
            id="focus-settings-heading"
            className="mb-4 text-lg font-semibold text-foreground"
          >
            Focus & Navigation
          </h2>
          <div className="divide-y divide-border rounded-lg border border-border bg-card p-4">
            <SettingToggle
              id="always-show-focus"
              label="Always Show Focus Indicators"
              description="Show focus rings on all interactions, not just keyboard navigation."
              checked={alwaysShowFocus}
              onChange={setAlwaysShowFocus}
            />

            <SettingToggle
              id="larger-targets"
              label="Larger Touch Targets"
              description="Increase the size of interactive elements for easier clicking and tapping."
              checked={largerTargets}
              onChange={setLargerTargets}
            />

            <SettingToggle
              id="keyboard-hints"
              label="Show Keyboard Shortcuts"
              description="Display keyboard shortcut hints on buttons and actions."
              checked={showKeyboardHints}
              onChange={setShowKeyboardHints}
            />
          </div>
        </section>

        {/* Screen Reader Settings */}
        <section aria-labelledby="screen-reader-heading" className="mb-8">
          <h2
            id="screen-reader-heading"
            className="mb-4 text-lg font-semibold text-foreground"
          >
            Screen Reader
          </h2>
          <div className="divide-y divide-border rounded-lg border border-border bg-card p-4">
            <SettingToggle
              id="screen-reader-mode"
              label="Screen Reader Optimization"
              description="Optimize the interface for screen reader users with enhanced ARIA labels and descriptions."
              checked={screenReaderMode}
              onChange={setScreenReaderMode}
            />

            <SettingToggle
              id="announce-messages"
              label="Announce New Messages"
              description="Automatically announce new chat messages to screen readers."
              checked={announceMessages}
              onChange={setAnnounceMessages}
            />

            <SettingToggle
              id="prefer-captions"
              label="Prefer Captions"
              description="Show captions or transcripts for audio and video content when available."
              checked={preferCaptions}
              onChange={setPreferCaptions}
            />
          </div>
        </section>

        {/* Keyboard Shortcuts Reference */}
        <section aria-labelledby="keyboard-shortcuts-heading" className="mb-8">
          <h2
            id="keyboard-shortcuts-heading"
            className="mb-4 text-lg font-semibold text-foreground"
          >
            Keyboard Navigation
          </h2>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="mb-4 text-sm text-muted-foreground">
              Common keyboard shortcuts for navigating nchat:
            </p>
            <div className="divide-y divide-border">
              <KeyboardHint keys={["Tab"]} action="Move to next element" />
              <KeyboardHint
                keys={["Shift", "Tab"]}
                action="Move to previous element"
              />
              <KeyboardHint keys={["Enter"]} action="Activate button or link" />
              <KeyboardHint
                keys={["Space"]}
                action="Toggle checkbox or button"
              />
              <KeyboardHint
                keys={["Esc"]}
                action="Close modal or cancel action"
              />
              <KeyboardHint
                keys={["Arrow Up"]}
                action="Previous item in list"
              />
              <KeyboardHint keys={["Arrow Down"]} action="Next item in list" />
              <KeyboardHint keys={["Home"]} action="Go to first item" />
              <KeyboardHint keys={["End"]} action="Go to last item" />
              <KeyboardHint keys={["Cmd", "K"]} action="Open command palette" />
              <KeyboardHint keys={["Cmd", "/"]} action="Toggle sidebar" />
            </div>
          </div>
        </section>

        {/* Reset Button */}
        <section className="border-t border-border pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-foreground">
                Reset Settings
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Restore all accessibility settings to their defaults.
              </p>
            </div>
            <button
              onClick={() => {
                if (
                  confirm(
                    "Are you sure you want to reset all accessibility settings?",
                  )
                ) {
                  resetSettings();
                }
              }}
              className={cn(
                "rounded-md border border-destructive bg-background px-4 py-2",
                "text-sm font-medium text-destructive",
                "hover:bg-destructive hover:text-destructive-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "transition-colors",
              )}
            >
              Reset to Defaults
            </button>
          </div>
        </section>
      </main>

      {/* Help Section */}
      <footer className="bg-muted/50 mt-12 rounded-lg p-4">
        <h2 className="text-sm font-medium text-foreground">Need Help?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          If you encounter any accessibility issues or have suggestions for
          improvement, please{" "}
          <a
            href="mailto:support@nself.org"
            className="text-primary underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            contact our support team
          </a>
          . We are committed to making nchat accessible to everyone.
        </p>
      </footer>
    </div>
  );
}
