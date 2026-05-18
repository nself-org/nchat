/**
 * Theme Customizer Usage Examples
 *
 * Demonstrates various ways to use the theme customization system.
 */

"use client";

import { useState } from "react";
import { useThemeCustomizer } from "@/hooks/use-theme-customizer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Palette, Download, Upload, Share2 } from "lucide-react";

/**
 * Example 1: Simple Color Changer
 */
export function SimpleColorChanger() {
  const { theme, updateColor, saveTheme, isModified } = useThemeCustomizer();
  const { toast } = useToast();

  const handleColorChange = (color: string) => {
    updateColor("primaryColor", color);
  };

  const handleSave = async () => {
    await saveTheme();
    toast({ title: "Theme saved!" });
  };

  return (
    <Card className="p-6">
      <h3 className="mb-4 text-lg font-semibold">Simple Color Changer</h3>

      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <label htmlFor="primary-color-input">Primary Color:</label>
          <input
            id="primary-color-input"
            type="color"
            value={theme.colors.primaryColor}
            onChange={(e) => handleColorChange(e.target.value)}
            className="h-10 w-20 cursor-pointer rounded border"
          />
          <span className="font-mono text-sm">{theme.colors.primaryColor}</span>
        </div>

        {isModified && <Badge variant="secondary">Unsaved changes</Badge>}

        <Button onClick={handleSave} disabled={!isModified}>
          Save Theme
        </Button>
      </div>
    </Card>
  );
}

/**
 * Example 2: Preset Switcher
 */
export function PresetSwitcher() {
  const { loadPreset, theme } = useThemeCustomizer();
  const { toast } = useToast();

  const presets = ["nself", "slack", "discord", "ocean", "sunset", "midnight"];

  const handlePresetChange = (preset: string) => {
    loadPreset(preset);
    toast({ title: `Loaded ${preset} theme` });
  };

  return (
    <Card className="p-6">
      <h3 className="mb-4 text-lg font-semibold">Preset Switcher</h3>

      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <Button
            key={preset}
            variant={theme.preset === preset ? "default" : "outline"}
            onClick={() => handlePresetChange(preset)}
          >
            <Palette className="mr-2 h-4 w-4" />
            {preset}
          </Button>
        ))}
      </div>
    </Card>
  );
}

/**
 * Example 3: Font Customizer
 */
export function FontCustomizer() {
  const { theme, setFontFamily, setFontScale } = useThemeCustomizer();

  const fonts = [
    "Inter, system-ui, sans-serif",
    "Georgia, serif",
    '"Courier New", monospace',
  ];

  return (
    <Card className="p-6">
      <h3 className="mb-4 text-lg font-semibold">Font Customizer</h3>

      <div className="space-y-4">
        {/* Font Family */}
        <div>
          <label
            htmlFor="font-family-select"
            className="mb-2 block text-sm font-medium"
          >
            Font Family
          </label>
          <select
            id="font-family-select"
            value={theme.fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="w-full rounded border p-2"
          >
            {fonts.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
        </div>

        {/* Font Scale */}
        <div>
          <label className="mb-2 block text-sm font-medium">
            Font Size: {(theme.fontScale * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min="0.75"
            max="1.5"
            step="0.125"
            value={theme.fontScale}
            onChange={(e) => setFontScale(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Preview */}
        <div
          className="rounded border p-4"
          style={{
            fontFamily: theme.fontFamily,
            fontSize: `${theme.fontScale}rem`,
          }}
        >
          <p className="text-2xl font-bold">The quick brown fox</p>
          <p>jumps over the lazy dog</p>
        </div>
      </div>
    </Card>
  );
}

/**
 * Example 4: Import/Export
 */
export function ThemeImportExport() {
  const { exportJSON, importJSON, downloadJSON, copyJSON, generateShareURL } =
    useThemeCustomizer();
  const { toast } = useToast();
  const [importText, setImportText] = useState("");

  const handleExport = async () => {
    await copyJSON();
    toast({ title: "Theme copied to clipboard!" });
  };

  const handleImport = () => {
    try {
      importJSON(importText);
      setImportText("");
      toast({ title: "Theme imported successfully!" });
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Invalid JSON",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    const url = generateShareURL();
    await navigator.clipboard.writeText(url);
    toast({ title: "Share link copied!" });
  };

  return (
    <Card className="p-6">
      <h3 className="mb-4 text-lg font-semibold">Import/Export Theme</h3>

      <div className="space-y-4">
        {/* Export Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={downloadJSON}>
            <Download className="mr-2 h-4 w-4" />
            Download JSON
          </Button>

          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Copy JSON
          </Button>

          <Button onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share Link
          </Button>
        </div>

        {/* Import */}
        <div>
          <label
            htmlFor="import-theme-json"
            className="mb-2 block text-sm font-medium"
          >
            Import Theme JSON
          </label>
          <textarea
            id="import-theme-json"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder='{"colors": {...}, ...}'
            className="w-full rounded border p-2 font-mono text-sm"
            rows={4}
          />
          <Button
            onClick={handleImport}
            disabled={!importText.trim()}
            className="mt-2"
          >
            <Upload className="mr-2 h-4 w-4" />
            Import Theme
          </Button>
        </div>
      </div>
    </Card>
  );
}

/**
 * Example 5: Complete Example Page
 */
export function ThemeCustomizerExamples() {
  return (
    <div className="container mx-auto max-w-4xl space-y-6 py-8">
      <div>
        <h1 className="text-3xl font-bold">Theme Customizer Examples</h1>
        <p className="text-muted-foreground">
          Various ways to use the theme customization system
        </p>
      </div>

      <SimpleColorChanger />
      <PresetSwitcher />
      <FontCustomizer />
      <ThemeImportExport />
    </div>
  );
}
