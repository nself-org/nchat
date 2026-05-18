"use client";

import { useState, useCallback, useEffect } from "react";
import { Palette, Sun, Moon, Pipette } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWhiteLabelStore } from "@/stores/white-label-store";
import { ColorPicker } from "./ColorPicker";
import { ColorPaletteGenerator } from "./ColorPaletteGenerator";
import { getDominantColor } from "@/lib/white-label/logo-processor";
import type { ColorPalette } from "@/lib/white-label/color-generator";

import { logger } from "@/lib/logger";

interface Step4ColorSchemeProps {
  onValidChange?: (isValid: boolean) => void;
  className?: string;
}

type ColorMode = "light" | "dark";

export function Step4ColorScheme({
  onValidChange,
  className,
}: Step4ColorSchemeProps) {
  const { config, updateColors, markStepComplete } = useWhiteLabelStore();
  const [mode, setMode] = useState<ColorMode>("light");
  const [isExtractingColor, setIsExtractingColor] = useState(false);

  // Mark step as complete when we have valid colors
  useEffect(() => {
    if (config.colors.primary) {
      markStepComplete("colors");
      onValidChange?.(true);
    }
  }, [config.colors.primary, markStepComplete, onValidChange]);

  const handlePrimaryChange = useCallback(
    (color: string) => {
      updateColors({ primary: color });
    },
    [updateColors],
  );

  const handlePaletteGenerated = useCallback(
    (palette: ColorPalette, paletteMode: ColorMode) => {
      // Only update if the mode matches
      if (paletteMode === mode) {
        updateColors(palette);
      }
    },
    [mode, updateColors],
  );

  const handleExtractFromLogo = useCallback(async () => {
    if (!config.logo.original) return;

    setIsExtractingColor(true);
    try {
      const dominantColor = await getDominantColor(config.logo.original);
      handlePrimaryChange(dominantColor);
    } catch (error) {
      logger.error("Failed to extract color:", error);
    } finally {
      setIsExtractingColor(false);
    }
  }, [config.logo.original, handlePrimaryChange]);

  const handleColorChange = useCallback(
    (key: keyof typeof config.colors, value: string) => {
      updateColors({ [key]: value });
    },
    [updateColors],
  );

  // Color categories for manual editing
  const colorCategories = [
    {
      title: "Brand Colors",
      colors: [
        { key: "primary" as const, label: "Primary" },
        { key: "secondary" as const, label: "Secondary" },
        { key: "accent" as const, label: "Accent" },
      ],
    },
    {
      title: "Background & Surface",
      colors: [
        { key: "background" as const, label: "Background" },
        { key: "foreground" as const, label: "Foreground" },
        { key: "muted" as const, label: "Muted" },
        { key: "mutedForeground" as const, label: "Muted Text" },
      ],
    },
    {
      title: "Semantic",
      colors: [
        { key: "success" as const, label: "Success" },
        { key: "warning" as const, label: "Warning" },
        { key: "error" as const, label: "Error" },
        { key: "info" as const, label: "Info" },
      ],
    },
  ];

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 shadow-lg">
          <Palette className="h-6 w-6 text-white" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
          Color Scheme
        </h2>
        <p className="mx-auto max-w-md text-zinc-600 dark:text-zinc-400">
          Choose your brand colors and we'll generate a complete palette.
        </p>
      </div>

      <div className="mx-auto max-w-2xl space-y-8">
        {/* Mode toggle */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
            <button
              type="button"
              onClick={() => setMode("light")}
              className={cn(
                "flex items-center gap-2 rounded-md px-4 py-2 text-sm transition-all",
                mode === "light"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white",
              )}
            >
              <Sun className="h-4 w-4" />
              Light Mode
            </button>
            <button
              type="button"
              onClick={() => setMode("dark")}
              className={cn(
                "flex items-center gap-2 rounded-md px-4 py-2 text-sm transition-all",
                mode === "dark"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white",
              )}
            >
              <Moon className="h-4 w-4" />
              Dark Mode
            </button>
          </div>
        </div>

        {/* Extract from logo */}
        {config.logo.original && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleExtractFromLogo}
              disabled={isExtractingColor}
              className="flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              <Pipette className="h-4 w-4" />
              {isExtractingColor ? "Extracting..." : "Extract from Logo"}
            </button>
          </div>
        )}

        {/* Palette generator */}
        <ColorPaletteGenerator
          primaryColor={config.colors.primary}
          onPrimaryChange={handlePrimaryChange}
          onPaletteGenerated={handlePaletteGenerated}
        />

        {/* Advanced color editing */}
        <div className="space-y-6 border-t border-zinc-200 pt-6 dark:border-zinc-700">
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Fine-tune Colors
          </h3>

          {colorCategories.map((category) => (
            <div key={category.title} className="space-y-3">
              <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {category.title}
              </h4>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {category.colors.map(({ key, label }) => (
                  <div key={key} className="space-y-1">
                    <label className="text-xs text-zinc-500">{label}</label>
                    <ColorPicker
                      value={config.colors[key]}
                      onChange={(color) => handleColorChange(key, color)}
                      showInput={false}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
