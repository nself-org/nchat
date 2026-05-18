"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Upload, FileJson, AlertCircle, Check, X } from "lucide-react";
import { useSettingsStore } from "@/stores/settings-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { previewImport } from "@/lib/settings/settings-export";
import type { UserSettings } from "@/lib/settings/settings-types";

interface SettingsImportProps {
  className?: string;
}

type ImportPreview = {
  valid: boolean;
  categories: (keyof UserSettings)[];
  settingsCount: number;
  exportedAt?: string;
  version?: string;
} | null;

const categoryLabels: Record<keyof UserSettings, string> = {
  account: "Account Settings",
  appearance: "Appearance",
  notifications: "Notifications",
  privacy: "Privacy",
  accessibility: "Accessibility",
  language: "Language & Region",
  advanced: "Advanced",
};

/**
 * SettingsImport - Import settings from file
 */
export function SettingsImport({ className }: SettingsImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview>(null);
  const [selectedCategories, setSelectedCategories] = useState<
    (keyof UserSettings)[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [merge, setMerge] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importSettings = useSettingsStore((state) => state.importSettings);

  const resetState = () => {
    setFileContent(null);
    setPreview(null);
    setSelectedCategories([]);
    setError(null);
    setSuccess(false);
    setMerge(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFileContent(content);

      const previewData = previewImport(content);
      if (previewData) {
        setPreview(previewData);
        setSelectedCategories(previewData.categories);
      } else {
        setError("Invalid settings file format");
        setPreview(null);
      }
    };

    reader.onerror = () => {
      setError("Failed to read file");
    };

    reader.readAsText(file);
  };

  const toggleCategory = (category: keyof UserSettings) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };

  const handleImport = () => {
    if (!fileContent) return;

    try {
      // Parse and filter the settings
      const data = JSON.parse(fileContent);
      const filteredSettings: Partial<UserSettings> = {};

      for (const category of selectedCategories) {
        if (data.settings?.[category]) {
          filteredSettings[category] = data.settings[category];
        }
      }

      const filteredJson = JSON.stringify({
        ...data,
        settings: filteredSettings,
      });

      const success = importSettings(filteredJson);

      if (success) {
        setSuccess(true);
        setTimeout(() => {
          setIsOpen(false);
          resetState();
        }, 1500);
      } else {
        setError("Failed to import settings");
      }
    } catch {
      setError("Failed to import settings");
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    resetState();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
        else setIsOpen(true);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className={cn("gap-2", className)}>
          <Upload className="h-4 w-4" />
          Import Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Settings</DialogTitle>
          <DialogDescription>
            Import settings from a previously exported JSON file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileSelect}
            className="hidden"
            aria-hidden="true"
          />
          {/* File input trigger */}
          {!preview && !error && (
            <div
              className={cn(
                "flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8",
                "hover:border-primary/50 hover:bg-muted/50 cursor-pointer transition-colors",
              )}
              role="button"
              tabIndex={0}
              aria-label="Click to select a file"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
            >
              <FileJson className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">Click to select a file</p>
                <p className="text-sm text-muted-foreground">
                  or drag and drop your settings file here
                </p>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success state */}
          {success && (
            <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
              <Check className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>
                Settings imported successfully!
              </AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {preview && !success && (
            <div className="space-y-4">
              {/* File info */}
              <div className="bg-muted/50 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileJson className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium">Settings File</p>
                      <p className="text-sm text-muted-foreground">
                        {preview.settingsCount} settings in{" "}
                        {preview.categories.length} categories
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetState}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove file</span>
                  </Button>
                </div>
                {preview.exportedAt && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Exported on {new Date(preview.exportedAt).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Category selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Select categories to import
                </Label>
                {preview.categories.map((category) => (
                  <div key={category} className="flex items-center space-x-3">
                    <Checkbox
                      id={`import-${category}`}
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={() => toggleCategory(category)}
                    />
                    <Label
                      htmlFor={`import-${category}`}
                      className="cursor-pointer text-sm font-normal"
                    >
                      {categoryLabels[category]}
                    </Label>
                  </div>
                ))}
              </div>

              {/* Merge option */}
              <div className="flex items-center space-x-3 rounded-lg border p-4">
                <Checkbox
                  id="merge-settings"
                  checked={merge}
                  onCheckedChange={(checked) => setMerge(!!checked)}
                />
                <div className="space-y-0.5">
                  <Label
                    htmlFor="merge-settings"
                    className="cursor-pointer text-sm font-medium"
                  >
                    Merge with existing settings
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    When enabled, only imported values will be changed.
                    Otherwise, entire categories will be replaced.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {preview && !success && (
            <Button
              onClick={handleImport}
              disabled={selectedCategories.length === 0}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Import {selectedCategories.length} Categories
            </Button>
          )}
          {error && (
            <Button onClick={resetState} className="gap-2">
              Try Again
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
