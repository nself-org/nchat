"use client";

import { useState, useEffect, useCallback } from "react";
import { Type, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWhiteLabelStore } from "@/stores/white-label-store";
import { FontSelector, FontPairingSelector } from "./FontSelector";
import { loadFonts, FONT_PREVIEW_SAMPLES } from "@/lib/white-label/font-loader";

import { logger } from "@/lib/logger";

interface Step5TypographyProps {
  onValidChange?: (isValid: boolean) => void;
  className?: string;
}

export function Step5Typography({
  onValidChange,
  className,
}: Step5TypographyProps) {
  const { config, updateTypography, markStepComplete } = useWhiteLabelStore();
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"presets" | "custom">("presets");

  // Load fonts on mount
  useEffect(() => {
    const fonts = [
      { family: config.typography.headingFont },
      { family: config.typography.bodyFont },
      { family: config.typography.monoFont },
    ];
    loadFonts(fonts)
      .then(() => setFontsLoaded(true))
      .catch(console.error);
  }, [
    config.typography.headingFont,
    config.typography.bodyFont,
    config.typography.monoFont,
  ]);

  // Mark step as complete
  useEffect(() => {
    if (config.typography.headingFont && config.typography.bodyFont) {
      markStepComplete("typography");
      onValidChange?.(true);
    }
  }, [
    config.typography.headingFont,
    config.typography.bodyFont,
    markStepComplete,
    onValidChange,
  ]);

  const handleHeadingChange = useCallback(
    (font: string) => {
      updateTypography({ headingFont: font });
      loadFonts([{ family: font }]).catch(console.error);
    },
    [updateTypography],
  );

  const handleBodyChange = useCallback(
    (font: string) => {
      updateTypography({ bodyFont: font });
      loadFonts([{ family: font }]).catch(console.error);
    },
    [updateTypography],
  );

  const handleMonoChange = useCallback(
    (font: string) => {
      updateTypography({ monoFont: font });
      loadFonts([{ family: font }]).catch(console.error);
    },
    [updateTypography],
  );

  const handleFontSizeChange = useCallback(
    (delta: number) => {
      const newSize = Math.min(
        24,
        Math.max(12, config.typography.baseFontSize + delta),
      );
      updateTypography({ baseFontSize: newSize });
    },
    [config.typography.baseFontSize, updateTypography],
  );

  const handleLineHeightChange = useCallback(
    (delta: number) => {
      const newHeight = Math.min(
        2,
        Math.max(1, config.typography.lineHeight + delta),
      );
      updateTypography({ lineHeight: Math.round(newHeight * 10) / 10 });
    },
    [config.typography.lineHeight, updateTypography],
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
          <Type className="h-6 w-6 text-white" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
          Typography
        </h2>
        <p className="mx-auto max-w-md text-zinc-600 dark:text-zinc-400">
          Choose fonts that reflect your brand's personality.
        </p>
      </div>

      <div className="mx-auto max-w-2xl space-y-8">
        {/* Tab buttons */}
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("presets")}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTab === "presets"
                ? "dark:bg-sky-900/30 bg-sky-100 text-sky-700 dark:text-sky-300"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700",
            )}
          >
            Recommended Pairings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("custom")}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTab === "custom"
                ? "dark:bg-sky-900/30 bg-sky-100 text-sky-700 dark:text-sky-300"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700",
            )}
          >
            Custom Selection
          </button>
        </div>

        {/* Presets tab */}
        {activeTab === "presets" && (
          <FontPairingSelector
            headingFont={config.typography.headingFont}
            bodyFont={config.typography.bodyFont}
            onHeadingChange={handleHeadingChange}
            onBodyChange={handleBodyChange}
          />
        )}

        {/* Custom tab */}
        {activeTab === "custom" && (
          <div className="space-y-6">
            <div className="relative">
              <FontSelector
                value={config.typography.headingFont}
                onChange={handleHeadingChange}
                label="Heading Font"
                showPreview
                previewText={FONT_PREVIEW_SAMPLES.heading}
              />
            </div>

            <div className="relative">
              <FontSelector
                value={config.typography.bodyFont}
                onChange={handleBodyChange}
                label="Body Font"
                showPreview
                previewText={FONT_PREVIEW_SAMPLES.paragraph}
              />
            </div>

            <div className="relative">
              <FontSelector
                value={config.typography.monoFont}
                onChange={handleMonoChange}
                label="Monospace Font"
                category="monospace"
                showPreview
                previewText="const hello = 'world';"
              />
            </div>
          </div>
        )}

        {/* Size and spacing controls */}
        <div className="space-y-4 border-t border-zinc-200 pt-6 dark:border-zinc-700">
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Size & Spacing
          </h3>

          <div className="grid grid-cols-2 gap-6">
            {/* Base font size */}
            <div className="space-y-2">
              <span className="text-xs text-zinc-500">Base Font Size</span>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleFontSizeChange(-1)}
                  className="h-8 w-8"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-mono text-zinc-700 dark:text-zinc-300">
                  {config.typography.baseFontSize}px
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleFontSizeChange(1)}
                  className="h-8 w-8"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Line height */}
            <div className="space-y-2">
              <span className="text-xs text-zinc-500">Line Height</span>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleLineHeightChange(-0.1)}
                  className="h-8 w-8"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-mono text-zinc-700 dark:text-zinc-300">
                  {config.typography.lineHeight}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleLineHeightChange(0.1)}
                  className="h-8 w-8"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Preview
          </h3>
          <div
            className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800"
            style={{
              fontSize: `${config.typography.baseFontSize}px`,
              lineHeight: config.typography.lineHeight,
            }}
          >
            <h1
              className="text-3xl font-bold text-zinc-900 dark:text-white"
              style={{
                fontFamily: fontsLoaded
                  ? config.typography.headingFont
                  : undefined,
              }}
            >
              {config.appInfo.appName || "Your App Name"}
            </h1>
            <p
              className="text-zinc-600 dark:text-zinc-400"
              style={{
                fontFamily: fontsLoaded
                  ? config.typography.bodyFont
                  : undefined,
              }}
            >
              {FONT_PREVIEW_SAMPLES.paragraph}
            </p>
            <pre
              className="rounded-lg bg-zinc-100 p-3 text-sm dark:bg-zinc-900"
              style={{
                fontFamily: fontsLoaded
                  ? config.typography.monoFont
                  : undefined,
              }}
            >
              <code>{`const config = { theme: 'custom' };`}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
