/**
 * Theme Customizer Component
 *
 * Complete theme customization UI with:
 * - Color picker for all theme colors
 * - Live preview
 * - Preset selection
 * - Typography customization
 * - Spacing/border radius
 * - Custom CSS injection
 * - Import/Export functionality
 * - Share theme link
 */

"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Palette,
  Type,
  Layout,
  Code,
  Download,
  Upload,
  Share2,
  Copy,
  RotateCcw,
  Save,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SettingsColorPicker } from "./SettingsColorPicker";
import { useThemeCustomizer } from "@/hooks/use-theme-customizer";
import { useToast } from "@/hooks/use-toast";
import {
  colorProperties,
  fontFamilies,
  borderRadiusOptions,
  fontScaleOptions,
  spacingScaleOptions,
  getThemePresets,
} from "@/lib/theme/custom-theme";

interface ThemeCustomizerProps {
  className?: string;
}

/**
 * Main Theme Customizer Component
 */
export function ThemeCustomizer({ className }: ThemeCustomizerProps) {
  const {
    theme,
    isModified,
    isLoading,
    updateColor,
    setFontFamily,
    setFontScale,
    setBorderRadius,
    setSpacingScale,
    setColorScheme,
    setCustomCSS,
    loadPreset,
    resetToPreset,
    saveTheme,
    resetTheme,
    exportJSON,
    importJSON,
    downloadJSON,
    copyJSON,
    generateShareURL,
  } = useThemeCustomizer();

  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(true);
  const [importJSONInput, setImportJSONInput] = useState("");
  const [activeTab, setActiveTab] = useState("colors");

  const themePresets = useMemo(() => getThemePresets(), []);

  // Group colors by category
  const colorsByCategory = useMemo(() => {
    const grouped: Record<string, Array<(typeof colorProperties)[number]>> = {};
    colorProperties.forEach((prop) => {
      if (!grouped[prop.category]) {
        grouped[prop.category] = [];
      }
      grouped[prop.category].push(prop);
    });
    return grouped;
  }, []);

  /**
   * Handle save theme
   */
  const handleSave = async () => {
    try {
      await saveTheme();
      toast({
        title: "Theme saved",
        description: "Your theme has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save theme. Please try again.",
        variant: "destructive",
      });
    }
  };

  /**
   * Handle reset theme
   */
  const handleReset = () => {
    resetTheme();
    toast({
      title: "Theme reset",
      description: "Theme has been reset to default.",
    });
  };

  /**
   * Handle reset to preset
   */
  const handleResetToPreset = () => {
    resetToPreset();
    toast({
      title: "Changes discarded",
      description: "Theme has been reset to last saved state.",
    });
  };

  /**
   * Handle preset selection
   */
  const handlePresetSelect = (presetKey: string) => {
    loadPreset(presetKey);
    toast({
      title: "Preset loaded",
      description: `Loaded ${presetKey} theme preset.`,
    });
  };

  /**
   * Handle export JSON
   */
  const handleExportJSON = () => {
    downloadJSON();
    toast({
      title: "Theme exported",
      description: "Theme JSON file has been downloaded.",
    });
  };

  /**
   * Handle copy JSON
   */
  const handleCopyJSON = async () => {
    try {
      await copyJSON();
      toast({
        title: "JSON copied",
        description: "Theme JSON copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  /**
   * Handle import JSON
   */
  const handleImportJSON = () => {
    try {
      importJSON(importJSONInput);
      setImportJSONInput("");
      toast({
        title: "Theme imported",
        description: "Theme has been imported successfully.",
      });
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Invalid JSON",
        variant: "destructive",
      });
    }
  };

  /**
   * Handle share theme
   */
  const handleShareTheme = async () => {
    try {
      const url = generateShareURL();
      await navigator.clipboard.writeText(url);
      toast({
        title: "Share link copied",
        description: "Theme share link copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate share link.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Theme Customizer
          </h2>
          <p className="text-muted-foreground">
            Customize colors, typography, and spacing to match your brand.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? (
              <>
                <EyeOff className="mr-2 h-4 w-4" />
                Hide Preview
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Show Preview
              </>
            )}
          </Button>

          {isModified && (
            <Badge variant="secondary" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              Unsaved Changes
            </Badge>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSave} disabled={!isModified}>
          <Save className="mr-2 h-4 w-4" />
          Save Theme
        </Button>

        <Button
          variant="outline"
          onClick={handleResetToPreset}
          disabled={!isModified}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Discard Changes
        </Button>

        <Separator orientation="vertical" className="h-10" />

        <Button variant="outline" onClick={handleExportJSON}>
          <Download className="mr-2 h-4 w-4" />
          Export JSON
        </Button>

        <Button variant="outline" onClick={handleCopyJSON}>
          <Copy className="mr-2 h-4 w-4" />
          Copy JSON
        </Button>

        <Button variant="outline" onClick={handleShareTheme}>
          <Share2 className="mr-2 h-4 w-4" />
          Share Link
        </Button>

        <Separator orientation="vertical" className="h-10" />

        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to Default
        </Button>
      </div>

      {/* Live Preview */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="p-6">
              <h3 className="mb-4 text-lg font-semibold">Live Preview</h3>
              <ThemePreview theme={theme} />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="colors" className="gap-2">
            <Palette className="h-4 w-4" />
            Colors
          </TabsTrigger>
          <TabsTrigger value="presets" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Presets
          </TabsTrigger>
          <TabsTrigger value="typography" className="gap-2">
            <Type className="h-4 w-4" />
            Typography
          </TabsTrigger>
          <TabsTrigger value="spacing" className="gap-2">
            <Layout className="h-4 w-4" />
            Spacing
          </TabsTrigger>
          <TabsTrigger value="advanced" className="gap-2">
            <Code className="h-4 w-4" />
            Advanced
          </TabsTrigger>
        </TabsList>

        {/* Colors Tab */}
        <TabsContent value="colors" className="space-y-6">
          <Accordion
            type="multiple"
            defaultValue={["Brand", "Surfaces", "Text", "Buttons", "Status"]}
          >
            {Object.entries(colorsByCategory).map(([category, props]) => (
              <AccordionItem key={category} value={category}>
                <AccordionTrigger className="text-lg font-semibold">
                  {category} Colors
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-4">
                    {props.map((prop) => (
                      <SettingsColorPicker
                        key={prop.key}
                        id={prop.key}
                        label={prop.label}
                        description={prop.description}
                        value={theme.colors[prop.key]}
                        onChange={(color) => updateColor(prop.key, color)}
                      />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>

        {/* Presets Tab */}
        <TabsContent value="presets" className="space-y-6">
          <div>
            <h3 className="mb-4 text-lg font-semibold">Theme Presets</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Choose a pre-designed theme as a starting point. You can customize
              it further in the Colors tab.
            </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {themePresets.map((preset) => (
                <PresetCard
                  key={preset.preset}
                  preset={preset}
                  isActive={theme.preset === preset.preset}
                  colorScheme={
                    theme.colorScheme === "system" ? "dark" : theme.colorScheme
                  }
                  onSelect={() => handlePresetSelect(preset.preset)}
                />
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Typography Tab */}
        <TabsContent value="typography" className="space-y-6">
          <Card className="p-6">
            <h3 className="mb-6 text-lg font-semibold">Typography Settings</h3>

            <div className="space-y-6">
              {/* Font Family */}
              <div className="space-y-3">
                <Label htmlFor="font-family">Font Family</Label>
                <Select value={theme.fontFamily} onValueChange={setFontFamily}>
                  <SelectTrigger id="font-family">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontFamilies.map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        <span style={{ fontFamily: font.value }}>
                          {font.label}{" "}
                          <span className="text-muted-foreground">
                            ({font.category})
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Font Scale */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="font-scale">Font Size Scale</Label>
                  <span className="text-sm text-muted-foreground">
                    {(theme.fontScale * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  id="font-scale"
                  value={[theme.fontScale]}
                  onValueChange={(value) => setFontScale(value[0])}
                  min={0.75}
                  max={1.5}
                  step={0.125}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Small</span>
                  <span>Normal</span>
                  <span>Large</span>
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2 rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Preview</p>
                <div
                  style={{
                    fontFamily: theme.fontFamily,
                    fontSize: `${theme.fontScale}rem`,
                  }}
                >
                  <p className="text-2xl font-bold">The quick brown fox</p>
                  <p className="text-lg">jumps over the lazy dog</p>
                  <p className="text-base">1234567890</p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Spacing Tab */}
        <TabsContent value="spacing" className="space-y-6">
          <Card className="p-6">
            <h3 className="mb-6 text-lg font-semibold">Spacing & Layout</h3>

            <div className="space-y-6">
              {/* Border Radius */}
              <div className="space-y-3">
                <Label>Border Radius</Label>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {borderRadiusOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setBorderRadius(option.value)}
                      className={cn(
                        "flex h-16 flex-col items-center justify-center gap-1 rounded-lg border-2 transition-colors",
                        theme.borderRadius === option.value
                          ? "bg-primary/10 border-primary"
                          : "border-border hover:border-muted-foreground",
                      )}
                    >
                      <div
                        className="h-6 w-6 bg-primary"
                        style={{ borderRadius: option.value }}
                      />
                      <span className="text-xs">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Spacing Scale */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="spacing-scale">Spacing Scale</Label>
                  <span className="text-sm text-muted-foreground">
                    {(theme.spacingScale * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  id="spacing-scale"
                  value={[theme.spacingScale]}
                  onValueChange={(value) => setSpacingScale(value[0])}
                  min={0.75}
                  max={1.5}
                  step={0.125}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Compact</span>
                  <span>Normal</span>
                  <span>Spacious</span>
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2 rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Preview</p>
                <div className="space-y-2">
                  <div
                    className="text-primary-foreground bg-primary p-4"
                    style={{
                      borderRadius: theme.borderRadius,
                      padding: `${theme.spacingScale}rem`,
                    }}
                  >
                    Button with custom spacing and radius
                  </div>
                  <div
                    className="flex gap-2"
                    style={{ gap: `${theme.spacingScale * 0.5}rem` }}
                  >
                    <div
                      className="flex-1 bg-muted p-2"
                      style={{ borderRadius: theme.borderRadius }}
                    >
                      Card 1
                    </div>
                    <div
                      className="flex-1 bg-muted p-2"
                      style={{ borderRadius: theme.borderRadius }}
                    >
                      Card 2
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-6">
          {/* Custom CSS */}
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Custom CSS</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Add custom CSS to override or extend the theme. Use with caution.
            </p>

            <Textarea
              value={theme.customCSS || ""}
              onChange={(e) => setCustomCSS(e.target.value)}
              placeholder="/* Your custom CSS here */&#10;.my-custom-class {&#10;  color: red;&#10;}"
              className="font-mono text-sm"
              rows={12}
            />
          </Card>

          {/* Import/Export */}
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Import Theme JSON</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Paste a theme JSON to import it. This will replace your current
              theme.
            </p>

            <div className="space-y-4">
              <Textarea
                value={importJSONInput}
                onChange={(e) => setImportJSONInput(e.target.value)}
                placeholder='{"colors": {...}, "fontFamily": "...", ...}'
                className="font-mono text-sm"
                rows={8}
              />

              <Button
                onClick={handleImportJSON}
                disabled={!importJSONInput.trim()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import Theme
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Preset Card Component
 */
interface PresetCardProps {
  preset: {
    name: string;
    preset: string;
    light: any;
    dark: any;
  };
  isActive: boolean;
  colorScheme: "light" | "dark";
  onSelect: () => void;
}

function PresetCard({
  preset,
  isActive,
  colorScheme,
  onSelect,
}: PresetCardProps) {
  const colors = colorScheme === "dark" ? preset.dark : preset.light;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative overflow-hidden rounded-lg border-2 text-left transition-all hover:shadow-lg",
        isActive
          ? "border-primary ring-2 ring-primary ring-offset-2"
          : "border-border hover:border-muted-foreground",
      )}
    >
      {/* Color Preview */}
      <div
        className="h-24 p-4"
        style={{ backgroundColor: colors.backgroundColor }}
      >
        <div
          className="h-full rounded"
          style={{ backgroundColor: colors.surfaceColor }}
        >
          <div className="flex h-full items-center justify-center gap-2 p-2">
            <div
              className="h-8 w-8 rounded-full"
              style={{ backgroundColor: colors.primaryColor }}
            />
            <div
              className="h-8 w-8 rounded-full"
              style={{ backgroundColor: colors.secondaryColor }}
            />
            <div
              className="h-8 w-8 rounded-full"
              style={{ backgroundColor: colors.accentColor }}
            />
          </div>
        </div>
      </div>

      {/* Label */}
      <div className="bg-card p-3">
        <div className="flex items-center justify-between">
          <p className="font-medium">{preset.name}</p>
          {isActive && <Check className="h-4 w-4 text-primary" />}
        </div>
      </div>
    </button>
  );
}

/**
 * Theme Preview Component
 */
function ThemePreview({ theme }: { theme: any }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Buttons */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Buttons</p>
        <button
          type="button"
          className="w-full rounded px-4 py-2 font-medium"
          style={{
            backgroundColor: theme.colors.buttonPrimaryBg,
            color: theme.colors.buttonPrimaryText,
            borderRadius: theme.borderRadius,
          }}
        >
          Primary Button
        </button>
        <button
          type="button"
          className="w-full rounded px-4 py-2 font-medium"
          style={{
            backgroundColor: theme.colors.buttonSecondaryBg,
            color: theme.colors.buttonSecondaryText,
            borderRadius: theme.borderRadius,
          }}
        >
          Secondary Button
        </button>
      </div>

      {/* Surface */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Surface</p>
        <div
          className="p-4"
          style={{
            backgroundColor: theme.colors.surfaceColor,
            color: theme.colors.textColor,
            borderRadius: theme.borderRadius,
          }}
        >
          <p className="font-medium">Surface</p>
          <p className="text-sm" style={{ color: theme.colors.mutedColor }}>
            Muted text
          </p>
        </div>
      </div>

      {/* Status Colors */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Status</p>
        <div className="flex gap-2">
          <div
            className="h-8 flex-1 rounded"
            style={{ backgroundColor: theme.colors.successColor }}
          />
          <div
            className="h-8 flex-1 rounded"
            style={{ backgroundColor: theme.colors.warningColor }}
          />
          <div
            className="h-8 flex-1 rounded"
            style={{ backgroundColor: theme.colors.errorColor }}
          />
          <div
            className="h-8 flex-1 rounded"
            style={{ backgroundColor: theme.colors.infoColor }}
          />
        </div>
      </div>
    </div>
  );
}
