/**
 * Theme Editor with Live Preview
 *
 * Visual theme customization interface with real-time preview
 */

"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Palette,
  Type,
  Layout,
  Sparkles,
  Code,
  Download,
  Upload,
  RotateCcw,
} from "lucide-react";
import type { ThemeColors } from "@/templates/types";
import { generateCSSVariables } from "@/templates";
import { cn } from "@/lib/utils";

interface ThemeEditorProps {
  tenantId: string;
  initialColors?: {
    light: Partial<ThemeColors>;
    dark: Partial<ThemeColors>;
  };
  onSave?: (theme: { light: ThemeColors; dark: ThemeColors }) => void;
  className?: string;
}

const DEFAULT_LIGHT_COLORS: ThemeColors = {
  primaryColor: "#3B82F6",
  secondaryColor: "#6B7280",
  accentColor: "#8B5CF6",
  backgroundColor: "#FFFFFF",
  surfaceColor: "#F9FAFB",
  cardColor: "#FFFFFF",
  popoverColor: "#FFFFFF",
  textColor: "#18181B",
  textMutedColor: "#71717A",
  textInverseColor: "#FFFFFF",
  borderColor: "#E4E4E7",
  borderMutedColor: "#F4F4F5",
  buttonPrimaryBg: "#3B82F6",
  buttonPrimaryText: "#FFFFFF",
  buttonSecondaryBg: "#F4F4F5",
  buttonSecondaryText: "#18181B",
  buttonGhostHover: "#F4F4F5",
  successColor: "#22C55E",
  warningColor: "#F59E0B",
  errorColor: "#EF4444",
  infoColor: "#3B82F6",
  linkColor: "#3B82F6",
  focusRingColor: "#3B82F6",
  selectionBg: "#3B82F620",
  highlightBg: "#FEF08A",
};

const DEFAULT_DARK_COLORS: ThemeColors = {
  primaryColor: "#60A5FA",
  secondaryColor: "#9CA3AF",
  accentColor: "#A78BFA",
  backgroundColor: "#09090B",
  surfaceColor: "#18181B",
  cardColor: "#18181B",
  popoverColor: "#18181B",
  textColor: "#FAFAFA",
  textMutedColor: "#A1A1AA",
  textInverseColor: "#18181B",
  borderColor: "#27272A",
  borderMutedColor: "#18181B",
  buttonPrimaryBg: "#60A5FA",
  buttonPrimaryText: "#18181B",
  buttonSecondaryBg: "#27272A",
  buttonSecondaryText: "#FAFAFA",
  buttonGhostHover: "#27272A",
  successColor: "#4ADE80",
  warningColor: "#FBBF24",
  errorColor: "#F87171",
  infoColor: "#60A5FA",
  linkColor: "#60A5FA",
  focusRingColor: "#60A5FA",
  selectionBg: "#60A5FA20",
  highlightBg: "#713F12",
};

const COLOR_GROUPS = [
  {
    id: "primary",
    label: "Primary Colors",
    colors: ["primaryColor", "secondaryColor", "accentColor"],
  },
  {
    id: "background",
    label: "Background Colors",
    colors: ["backgroundColor", "surfaceColor", "cardColor", "popoverColor"],
  },
  {
    id: "text",
    label: "Text Colors",
    colors: ["textColor", "textMutedColor", "textInverseColor"],
  },
  {
    id: "border",
    label: "Border Colors",
    colors: ["borderColor", "borderMutedColor"],
  },
  {
    id: "button",
    label: "Button Colors",
    colors: [
      "buttonPrimaryBg",
      "buttonPrimaryText",
      "buttonSecondaryBg",
      "buttonSecondaryText",
      "buttonGhostHover",
    ],
  },
  {
    id: "status",
    label: "Status Colors",
    colors: ["successColor", "warningColor", "errorColor", "infoColor"],
  },
  {
    id: "special",
    label: "Special Colors",
    colors: ["linkColor", "focusRingColor", "selectionBg", "highlightBg"],
  },
];

const formatColorName = (name: string): string => {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

export function ThemeEditor({
  tenantId,
  initialColors,
  onSave,
  className,
}: ThemeEditorProps) {
  const [lightColors, setLightColors] = useState<ThemeColors>({
    ...DEFAULT_LIGHT_COLORS,
    ...initialColors?.light,
  });
  const [darkColors, setDarkColors] = useState<ThemeColors>({
    ...DEFAULT_DARK_COLORS,
    ...initialColors?.dark,
  });
  const [activeMode, setActiveMode] = useState<"light" | "dark">("light");
  const [previewMode, setPreviewMode] = useState<"split" | "full">("split");
  const [hasChanges, setHasChanges] = useState(false);

  // Apply theme to preview
  useEffect(() => {
    applyThemePreview();
  }, [lightColors, darkColors, activeMode]);

  const applyThemePreview = () => {
    const colors = activeMode === "light" ? lightColors : darkColors;
    const cssVars = generateCSSVariables(colors);

    // Create style element if it doesn't exist
    let styleEl = document.getElementById(
      "theme-preview-styles",
    ) as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "theme-preview-styles";
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = `
      .theme-preview {
        ${cssVars}
      }
    `;
  };

  const updateColor = (colorKey: keyof ThemeColors, value: string) => {
    if (activeMode === "light") {
      setLightColors((prev) => ({ ...prev, [colorKey]: value }));
    } else {
      setDarkColors((prev) => ({ ...prev, [colorKey]: value }));
    }
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave?.({ light: lightColors, dark: darkColors });
    setHasChanges(false);
  };

  const handleReset = () => {
    setLightColors(DEFAULT_LIGHT_COLORS);
    setDarkColors(DEFAULT_DARK_COLORS);
    setHasChanges(false);
  };

  const handleExport = () => {
    const theme = { light: lightColors, dark: darkColors };
    const blob = new Blob([JSON.stringify(theme, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `theme-${tenantId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const theme = JSON.parse(text);
      if (theme.light) setLightColors(theme.light);
      if (theme.dark) setDarkColors(theme.dark);
      setHasChanges(true);
    } catch (error) {
      console.error("Failed to import theme:", error);
    }
  };

  const activeColors = activeMode === "light" ? lightColors : darkColors;

  return (
    <div className={cn("grid gap-6 lg:grid-cols-2", className)}>
      {/* Editor Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Theme Editor</CardTitle>
              <CardDescription>
                Customize your brand colors and appearance
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button variant="outline" size="sm" asChild>
                <label>
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                </label>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeMode}
            onValueChange={(v) => setActiveMode(v as "light" | "dark")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="light">Light Mode</TabsTrigger>
              <TabsTrigger value="dark">Dark Mode</TabsTrigger>
            </TabsList>

            <TabsContent value={activeMode} className="mt-6">
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-6">
                  {COLOR_GROUPS.map((group) => (
                    <div key={group.id} className="space-y-4">
                      <h3 className="text-sm font-semibold">{group.label}</h3>
                      <div className="grid gap-4">
                        {group.colors.map((colorKey) => (
                          <div
                            key={colorKey}
                            className="flex items-center gap-3"
                          >
                            <div className="relative">
                              <Input
                                type="color"
                                value={
                                  activeColors[colorKey as keyof ThemeColors]
                                }
                                onChange={(e) =>
                                  updateColor(
                                    colorKey as keyof ThemeColors,
                                    e.target.value,
                                  )
                                }
                                className="h-10 w-14 cursor-pointer p-1"
                              />
                            </div>
                            <div className="flex-1">
                              <Label className="text-xs">
                                {formatColorName(colorKey)}
                              </Label>
                              <Input
                                type="text"
                                value={
                                  activeColors[colorKey as keyof ThemeColors]
                                }
                                onChange={(e) =>
                                  updateColor(
                                    colorKey as keyof ThemeColors,
                                    e.target.value,
                                  )
                                }
                                className="mt-1 h-8 font-mono text-xs"
                                placeholder="#000000"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      {group.id !== "special" && <Separator className="my-4" />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSave} disabled={!hasChanges}>
              <Sparkles className="mr-2 h-4 w-4" />
              Save Theme
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live Preview Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Live Preview</CardTitle>
              <CardDescription>See your changes in real-time</CardDescription>
            </div>
            <Select
              value={previewMode}
              onValueChange={(v) => setPreviewMode(v as any)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="split">Split View</SelectItem>
                <SelectItem value="full">Full View</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div
            className={cn("theme-preview rounded-lg border p-6", activeMode)}
          >
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h1
                  className="text-2xl font-bold"
                  style={{ color: activeColors.textColor }}
                >
                  Welcome to Your App
                </h1>
                <Button
                  style={{
                    backgroundColor: activeColors.buttonPrimaryBg,
                    color: activeColors.buttonPrimaryText,
                  }}
                >
                  Get Started
                </Button>
              </div>

              <Separator
                style={{ backgroundColor: activeColors.borderColor }}
              />

              {/* Cards */}
              <div className="grid gap-4 md:grid-cols-2">
                <div
                  className="rounded-lg p-4"
                  style={{
                    backgroundColor: activeColors.cardColor,
                    borderColor: activeColors.borderColor,
                    borderWidth: "1px",
                  }}
                >
                  <h3
                    className="font-semibold"
                    style={{ color: activeColors.textColor }}
                  >
                    Feature Card
                  </h3>
                  <p
                    className="mt-2 text-sm"
                    style={{ color: activeColors.textMutedColor }}
                  >
                    This is how your cards will look with the current theme.
                  </p>
                </div>

                <div
                  className="rounded-lg p-4"
                  style={{
                    backgroundColor: activeColors.surfaceColor,
                    borderColor: activeColors.borderMutedColor,
                    borderWidth: "1px",
                  }}
                >
                  <h3
                    className="font-semibold"
                    style={{ color: activeColors.textColor }}
                  >
                    Surface Card
                  </h3>
                  <p
                    className="mt-2 text-sm"
                    style={{ color: activeColors.textMutedColor }}
                  >
                    Surface color variant for subtle distinction.
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  className="rounded-md px-4 py-2 text-sm font-medium"
                  style={{
                    backgroundColor: activeColors.buttonPrimaryBg,
                    color: activeColors.buttonPrimaryText,
                  }}
                >
                  Primary Button
                </button>
                <button
                  className="rounded-md px-4 py-2 text-sm font-medium"
                  style={{
                    backgroundColor: activeColors.buttonSecondaryBg,
                    color: activeColors.buttonSecondaryText,
                  }}
                >
                  Secondary Button
                </button>
                <button
                  className="rounded-md px-4 py-2 text-sm font-medium"
                  style={{
                    color: activeColors.primaryColor,
                  }}
                >
                  Ghost Button
                </button>
              </div>

              {/* Status Colors */}
              <div className="grid gap-3">
                <div
                  className="rounded-md p-3 text-sm"
                  style={{
                    backgroundColor: activeColors.successColor + "20",
                    color: activeColors.successColor,
                  }}
                >
                  Success: Operation completed successfully
                </div>
                <div
                  className="rounded-md p-3 text-sm"
                  style={{
                    backgroundColor: activeColors.warningColor + "20",
                    color: activeColors.warningColor,
                  }}
                >
                  Warning: Please review this action
                </div>
                <div
                  className="rounded-md p-3 text-sm"
                  style={{
                    backgroundColor: activeColors.errorColor + "20",
                    color: activeColors.errorColor,
                  }}
                >
                  Error: Something went wrong
                </div>
                <div
                  className="rounded-md p-3 text-sm"
                  style={{
                    backgroundColor: activeColors.infoColor + "20",
                    color: activeColors.infoColor,
                  }}
                >
                  Info: Here is some helpful information
                </div>
              </div>

              {/* Link Example */}
              <p
                className="text-sm"
                style={{ color: activeColors.textMutedColor }}
              >
                This is body text with a{" "}
                <span
                  className="cursor-pointer underline"
                  style={{ color: activeColors.linkColor }}
                >
                  link example
                </span>
                .
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
