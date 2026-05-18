"use client";

// ===============================================================================
// Theme Editor Component
// ===============================================================================
//
// Visual theme editor with:
// - Color picker for all 16 properties
// - Live preview panel
// - Contrast ratio checker (WCAG compliance)
// - Font selector
// - Custom CSS editor
// - Import/export JSON
// - Save as preset
//
// ===============================================================================

import { useState, useCallback, useMemo } from "react";
import { useTemplate } from "@/templates/hooks/use-template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  Upload,
  Save,
  RotateCcw,
  Sun,
  Moon,
  Check,
  AlertTriangle,
} from "lucide-react";
import type { ThemeColors } from "@/templates/types";

import { logger } from "@/lib/logger";

// -------------------------------------------------------------------------------
// Color Utilities
// -------------------------------------------------------------------------------

/**
 * Calculate relative luminance for a color
 */
function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [r, g, b] = rgb.map((val) => {
    const channel = val / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors
 */
function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Convert hex to RGB array
 */
function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : null;
}

/**
 * Get WCAG compliance level
 */
function getWCAGLevel(
  ratio: number,
  fontSize: "normal" | "large",
): {
  level: "AAA" | "AA" | "Fail";
  color: string;
} {
  const threshold =
    fontSize === "large" ? { AAA: 4.5, AA: 3 } : { AAA: 7, AA: 4.5 };

  if (ratio >= threshold.AAA) {
    return { level: "AAA", color: "text-green-500" };
  } else if (ratio >= threshold.AA) {
    return { level: "AA", color: "text-yellow-500" };
  } else {
    return { level: "Fail", color: "text-red-500" };
  }
}

// -------------------------------------------------------------------------------
// Color Picker Component
// -------------------------------------------------------------------------------

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  contrastWith?: string;
  description?: string;
}

function ColorPicker({
  label,
  value,
  onChange,
  contrastWith,
  description,
}: ColorPickerProps) {
  const contrast = contrastWith ? getContrastRatio(value, contrastWith) : null;
  const wcag = contrast ? getWCAGLevel(contrast, "normal") : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={label}>{label}</Label>
        {wcag && (
          <Badge variant="outline" className={wcag.color}>
            {wcag.level} {contrast?.toFixed(2)}:1
          </Badge>
        )}
      </div>
      <div className="flex gap-2">
        <div
          className="h-10 w-12 cursor-pointer rounded border"
          style={{ backgroundColor: value }}
          role="button"
          tabIndex={0}
          aria-label={`Pick ${label} color`}
          onClick={() => document.getElementById(`${label}-input`)?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              document.getElementById(`${label}-input`)?.click();
            }
          }}
        />
        <Input
          id={`${label}-input`}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 font-mono text-sm"
        />
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {wcag && wcag.level === "Fail" && (
        <div className="flex items-start gap-2 text-xs text-red-500">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            Insufficient contrast. Consider adjusting for better accessibility.
          </span>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------------------------
// Theme Editor Component
// -------------------------------------------------------------------------------

interface ThemeEditorProps {
  onSave?: (colors: ThemeColors) => void;
  onExport?: (colors: ThemeColors) => void;
}

export function ThemeEditor({ onSave, onExport }: ThemeEditorProps) {
  const {
    template,
    theme,
    setTheme,
    colors: currentColors,
    applyOverrides,
  } = useTemplate();
  const [editingMode, setEditingMode] = useState<"light" | "dark">(theme);
  const [colors, setColors] = useState<ThemeColors>(currentColors);
  const [customCSS, setCustomCSS] = useState<string>(template?.customCSS || "");
  const [fontFamily, setFontFamily] = useState<string>(
    "Inter, system-ui, sans-serif",
  );

  // Update colors when theme changes
  useMemo(() => {
    setColors(currentColors);
  }, [currentColors]);

  // Update a single color
  const updateColor = useCallback((key: keyof ThemeColors, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Apply changes
  const handleApply = useCallback(() => {
    applyOverrides({
      theme: {
        [editingMode]: colors,
      },
      customCSS,
    });
  }, [applyOverrides, editingMode, colors, customCSS]);

  // Reset to original
  const handleReset = useCallback(() => {
    if (!template) return;
    const originalColors =
      editingMode === "dark" ? template.theme.dark : template.theme.light;
    setColors(originalColors);
    setCustomCSS(template.customCSS || "");
  }, [template, editingMode]);

  // Export theme as JSON
  const handleExport = useCallback(() => {
    if (!template) return;

    const themeData = {
      name: `${template.name} Custom`,
      version: "1.0.0",
      colors: {
        light: editingMode === "light" ? colors : template.theme.light,
        dark: editingMode === "dark" ? colors : template.theme.dark,
      },
      customCSS,
      fontFamily,
    };

    const blob = new Blob([JSON.stringify(themeData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `theme-${template.id}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    onExport?.(colors);
  }, [template, colors, editingMode, customCSS, fontFamily, onExport]);

  // Import theme from JSON
  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (imported.colors?.[editingMode]) {
            setColors(imported.colors[editingMode]);
          }
          if (imported.customCSS) {
            setCustomCSS(imported.customCSS);
          }
          if (imported.fontFamily) {
            setFontFamily(imported.fontFamily);
          }
        } catch (error) {
          logger.error("Failed to import theme:", error);
          alert("Invalid theme file format");
        }
      };
      reader.readAsText(file);
    },
    [editingMode],
  );

  // Save theme
  const handleSave = useCallback(() => {
    handleApply();
    onSave?.(colors);
  }, [handleApply, colors, onSave]);

  if (!template) {
    return <div>Loading template...</div>;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h2 className="text-xl font-semibold">Theme Editor</h2>
          <p className="text-sm text-muted-foreground">
            Customize colors and styles for {template.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Mode Selector */}
          <div className="flex items-center gap-1 rounded-lg border p-1">
            <Button
              size="sm"
              variant={editingMode === "light" ? "default" : "ghost"}
              onClick={() => setEditingMode("light")}
            >
              <Sun className="mr-1 h-4 w-4" />
              Light
            </Button>
            <Button
              size="sm"
              variant={editingMode === "dark" ? "default" : "ghost"}
              onClick={() => setEditingMode("dark")}
            >
              <Moon className="mr-1 h-4 w-4" />
              Dark
            </Button>
          </div>

          {/* Actions */}
          <Button size="sm" variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-1 h-4 w-4" />
            Reset
          </Button>
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="mr-1 h-4 w-4" />
            Export
          </Button>
          <label className="cursor-pointer">
            <span className="sr-only">Import theme</span>
            <Button size="sm" variant="outline" asChild>
              <span>
                <Upload className="mr-1 h-4 w-4" />
                Import
              </span>
            </Button>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="sr-only"
            />
          </label>
          <Button size="sm" onClick={handleSave}>
            <Save className="mr-1 h-4 w-4" />
            Save
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="colors" className="flex h-full flex-col">
          <TabsList className="w-full justify-start rounded-none border-b px-4">
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="typography">Typography</TabsTrigger>
            <TabsTrigger value="custom">Custom CSS</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          {/* Colors Tab */}
          <TabsContent value="colors" className="flex-1 overflow-y-auto p-4">
            <div className="max-w-2xl space-y-6">
              {/* Primary Colors */}
              <div className="space-y-4">
                <h3 className="font-medium">Primary Colors</h3>
                <ColorPicker
                  label="Primary"
                  value={colors.primaryColor}
                  onChange={(v) => updateColor("primaryColor", v)}
                  contrastWith={colors.backgroundColor}
                  description="Main brand color used for primary buttons and accents"
                />
                <ColorPicker
                  label="Secondary"
                  value={colors.secondaryColor}
                  onChange={(v) => updateColor("secondaryColor", v)}
                  contrastWith={colors.backgroundColor}
                  description="Secondary brand color for subtle emphasis"
                />
                <ColorPicker
                  label="Accent"
                  value={colors.accentColor}
                  onChange={(v) => updateColor("accentColor", v)}
                  contrastWith={colors.backgroundColor}
                  description="Accent color for highlights and call-to-actions"
                />
              </div>

              {/* Background Colors */}
              <div className="space-y-4">
                <h3 className="font-medium">Background Colors</h3>
                <ColorPicker
                  label="Background"
                  value={colors.backgroundColor}
                  onChange={(v) => updateColor("backgroundColor", v)}
                  description="Main background color"
                />
                <ColorPicker
                  label="Surface"
                  value={colors.surfaceColor}
                  onChange={(v) => updateColor("surfaceColor", v)}
                  description="Color for cards and elevated surfaces"
                />
                <ColorPicker
                  label="Card"
                  value={colors.cardColor}
                  onChange={(v) => updateColor("cardColor", v)}
                  description="Card background color"
                />
                <ColorPicker
                  label="Popover"
                  value={colors.popoverColor}
                  onChange={(v) => updateColor("popoverColor", v)}
                  description="Popover and dropdown background"
                />
              </div>

              {/* Text Colors */}
              <div className="space-y-4">
                <h3 className="font-medium">Text Colors</h3>
                <ColorPicker
                  label="Text"
                  value={colors.textColor}
                  onChange={(v) => updateColor("textColor", v)}
                  contrastWith={colors.backgroundColor}
                  description="Primary text color"
                />
                <ColorPicker
                  label="Muted Text"
                  value={colors.textMutedColor}
                  onChange={(v) => updateColor("textMutedColor", v)}
                  contrastWith={colors.backgroundColor}
                  description="Secondary or muted text"
                />
                <ColorPicker
                  label="Inverse Text"
                  value={colors.textInverseColor}
                  onChange={(v) => updateColor("textInverseColor", v)}
                  description="Text on primary color backgrounds"
                />
              </div>

              {/* Border Colors */}
              <div className="space-y-4">
                <h3 className="font-medium">Border Colors</h3>
                <ColorPicker
                  label="Border"
                  value={colors.borderColor}
                  onChange={(v) => updateColor("borderColor", v)}
                  description="Default border color"
                />
                <ColorPicker
                  label="Muted Border"
                  value={colors.borderMutedColor}
                  onChange={(v) => updateColor("borderMutedColor", v)}
                  description="Subtle borders and dividers"
                />
              </div>

              {/* Button Colors */}
              <div className="space-y-4">
                <h3 className="font-medium">Button Colors</h3>
                <ColorPicker
                  label="Primary Button Background"
                  value={colors.buttonPrimaryBg}
                  onChange={(v) => updateColor("buttonPrimaryBg", v)}
                  description="Primary button background"
                />
                <ColorPicker
                  label="Primary Button Text"
                  value={colors.buttonPrimaryText}
                  onChange={(v) => updateColor("buttonPrimaryText", v)}
                  contrastWith={colors.buttonPrimaryBg}
                  description="Text on primary buttons"
                />
                <ColorPicker
                  label="Secondary Button Background"
                  value={colors.buttonSecondaryBg}
                  onChange={(v) => updateColor("buttonSecondaryBg", v)}
                  description="Secondary button background"
                />
                <ColorPicker
                  label="Secondary Button Text"
                  value={colors.buttonSecondaryText}
                  onChange={(v) => updateColor("buttonSecondaryText", v)}
                  contrastWith={colors.buttonSecondaryBg}
                  description="Text on secondary buttons"
                />
              </div>

              {/* Status Colors */}
              <div className="space-y-4">
                <h3 className="font-medium">Status Colors</h3>
                <ColorPicker
                  label="Success"
                  value={colors.successColor}
                  onChange={(v) => updateColor("successColor", v)}
                  contrastWith={colors.backgroundColor}
                  description="Success messages and indicators"
                />
                <ColorPicker
                  label="Warning"
                  value={colors.warningColor}
                  onChange={(v) => updateColor("warningColor", v)}
                  contrastWith={colors.backgroundColor}
                  description="Warning messages and alerts"
                />
                <ColorPicker
                  label="Error"
                  value={colors.errorColor}
                  onChange={(v) => updateColor("errorColor", v)}
                  contrastWith={colors.backgroundColor}
                  description="Error messages and destructive actions"
                />
                <ColorPicker
                  label="Info"
                  value={colors.infoColor}
                  onChange={(v) => updateColor("infoColor", v)}
                  contrastWith={colors.backgroundColor}
                  description="Informational messages"
                />
              </div>

              {/* Special Colors */}
              <div className="space-y-4">
                <h3 className="font-medium">Special Colors</h3>
                <ColorPicker
                  label="Link"
                  value={colors.linkColor}
                  onChange={(v) => updateColor("linkColor", v)}
                  contrastWith={colors.backgroundColor}
                  description="Hyperlink color"
                />
                <ColorPicker
                  label="Focus Ring"
                  value={colors.focusRingColor}
                  onChange={(v) => updateColor("focusRingColor", v)}
                  description="Focus indicator color for keyboard navigation"
                />
                <ColorPicker
                  label="Selection"
                  value={colors.selectionBg}
                  onChange={(v) => updateColor("selectionBg", v)}
                  description="Text selection background"
                />
                <ColorPicker
                  label="Highlight"
                  value={colors.highlightBg}
                  onChange={(v) => updateColor("highlightBg", v)}
                  description="Highlighted text background"
                />
              </div>
            </div>
          </TabsContent>

          {/* Typography Tab */}
          <TabsContent
            value="typography"
            className="flex-1 overflow-y-auto p-4"
          >
            <div className="max-w-2xl space-y-6">
              <div className="space-y-4">
                <Label htmlFor="fontFamily">Font Family</Label>
                <Select value={fontFamily} onValueChange={setFontFamily}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inter, system-ui, sans-serif">
                      Inter (Default)
                    </SelectItem>
                    <SelectItem value="system-ui, sans-serif">
                      System UI
                    </SelectItem>
                    <SelectItem value="'SF Pro Display', system-ui, sans-serif">
                      SF Pro Display
                    </SelectItem>
                    <SelectItem value="'Segoe UI', system-ui, sans-serif">
                      Segoe UI
                    </SelectItem>
                    <SelectItem value="Roboto, sans-serif">Roboto</SelectItem>
                    <SelectItem value="'Open Sans', sans-serif">
                      Open Sans
                    </SelectItem>
                    <SelectItem value="'Fira Code', monospace">
                      Fira Code (Mono)
                    </SelectItem>
                    <SelectItem value="'JetBrains Mono', monospace">
                      JetBrains Mono
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Font family for the entire application
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium">Preview</h3>
                <div
                  className="space-y-4 rounded-lg border p-6"
                  style={{ fontFamily }}
                >
                  <h1 className="text-4xl font-bold">Heading 1</h1>
                  <h2 className="text-3xl font-semibold">Heading 2</h2>
                  <h3 className="text-2xl font-medium">Heading 3</h3>
                  <p className="text-base">
                    This is a paragraph of body text. The quick brown fox jumps
                    over the lazy dog.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This is small muted text used for captions and helper text.
                  </p>
                  <code className="font-mono text-sm">
                    const code = 'example'
                  </code>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Custom CSS Tab */}
          <TabsContent value="custom" className="flex-1 overflow-y-auto p-4">
            <div className="max-w-2xl space-y-4">
              <div>
                <Label htmlFor="customCSS">Custom CSS</Label>
                <p className="mb-2 text-sm text-muted-foreground">
                  Add custom CSS to further customize your theme. Use CSS
                  variables for colors.
                </p>
                <Textarea
                  id="customCSS"
                  value={customCSS}
                  onChange={(e) => setCustomCSS(e.target.value)}
                  className="h-96 font-mono text-sm"
                  placeholder={`/* Example custom CSS */
.message-item {
  border-radius: 12px;
}

.sidebar {
  background: var(--surface);
}`}
                />
              </div>
              <div className="space-y-2 rounded-lg bg-muted p-4">
                <h4 className="text-sm font-medium">Available CSS Variables</h4>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                  <div>--primary</div>
                  <div>--secondary</div>
                  <div>--accent</div>
                  <div>--background</div>
                  <div>--surface</div>
                  <div>--foreground</div>
                  <div>--muted</div>
                  <div>--border</div>
                  <div>--success</div>
                  <div>--warning</div>
                  <div>--destructive</div>
                  <div>--info</div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
              <div
                className="rounded-lg border p-6"
                style={{ backgroundColor: colors.backgroundColor }}
              >
                <div className="space-y-4">
                  <h3
                    className="text-2xl font-bold"
                    style={{ color: colors.textColor }}
                  >
                    Theme Preview
                  </h3>
                  <p style={{ color: colors.textMutedColor }}>
                    This is how your theme will look in the application.
                  </p>

                  {/* Buttons */}
                  <div className="flex gap-2">
                    <button
                      className="rounded-lg px-4 py-2 font-medium"
                      style={{
                        backgroundColor: colors.buttonPrimaryBg,
                        color: colors.buttonPrimaryText,
                      }}
                    >
                      Primary Button
                    </button>
                    <button
                      className="rounded-lg px-4 py-2 font-medium"
                      style={{
                        backgroundColor: colors.buttonSecondaryBg,
                        color: colors.buttonSecondaryText,
                        border: `1px solid ${colors.borderColor}`,
                      }}
                    >
                      Secondary Button
                    </button>
                  </div>

                  {/* Card */}
                  <div
                    className="rounded-lg p-4"
                    style={{
                      backgroundColor: colors.surfaceColor,
                      border: `1px solid ${colors.borderColor}`,
                    }}
                  >
                    <h4
                      className="mb-2 font-medium"
                      style={{ color: colors.textColor }}
                    >
                      Card Title
                    </h4>
                    <p style={{ color: colors.textMutedColor }}>
                      This is a card with surface background and border.
                    </p>
                  </div>

                  {/* Status Badges */}
                  <div className="flex gap-2">
                    <span
                      className="rounded-full px-3 py-1 text-sm font-medium"
                      style={{
                        backgroundColor: colors.successColor,
                        color: "white",
                      }}
                    >
                      Success
                    </span>
                    <span
                      className="rounded-full px-3 py-1 text-sm font-medium"
                      style={{
                        backgroundColor: colors.warningColor,
                        color: "white",
                      }}
                    >
                      Warning
                    </span>
                    <span
                      className="rounded-full px-3 py-1 text-sm font-medium"
                      style={{
                        backgroundColor: colors.errorColor,
                        color: "white",
                      }}
                    >
                      Error
                    </span>
                    <span
                      className="rounded-full px-3 py-1 text-sm font-medium"
                      style={{
                        backgroundColor: colors.infoColor,
                        color: "white",
                      }}
                    >
                      Info
                    </span>
                  </div>

                  {/* Link */}
                  <p>
                    <button
                      type="button"
                      style={{
                        color: colors.linkColor,
                        textDecoration: "underline",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      This is a link
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t p-4">
        <div className="text-sm text-muted-foreground">
          Editing {editingMode} mode for {template.name}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            Reset Changes
          </Button>
          <Button onClick={handleApply}>
            <Check className="mr-1 h-4 w-4" />
            Apply Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ThemeEditor;
