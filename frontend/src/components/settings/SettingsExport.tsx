"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Download, Check, Copy } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { UserSettings } from "@/lib/settings/settings-types";

interface SettingsExportProps {
  className?: string;
}

type SettingsCategory = keyof UserSettings;

const categoryLabels: Record<SettingsCategory, string> = {
  account: "Account Settings",
  appearance: "Appearance",
  notifications: "Notifications",
  privacy: "Privacy",
  accessibility: "Accessibility",
  language: "Language & Region",
  advanced: "Advanced",
};

/**
 * SettingsExport - Export settings to file
 */
export function SettingsExport({ className }: SettingsExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<
    SettingsCategory[]
  >([
    "appearance",
    "notifications",
    "privacy",
    "accessibility",
    "language",
    "advanced",
  ]);
  const [copied, setCopied] = useState(false);
  const exportSettings = useSettingsStore((state) => state.exportSettings);
  const settings = useSettingsStore((state) => state.settings);

  const allCategories = Object.keys(categoryLabels) as SettingsCategory[];

  const toggleCategory = (category: SettingsCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };

  const selectAll = () => {
    setSelectedCategories([...allCategories]);
  };

  const selectNone = () => {
    setSelectedCategories([]);
  };

  const getExportData = (): string => {
    const exportData: Partial<UserSettings> = {};
    for (const category of selectedCategories) {
      (exportData as Record<string, unknown>)[category] = settings[category];
    }

    return JSON.stringify(
      {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        settings: exportData,
      },
      null,
      2,
    );
  };

  const handleDownload = () => {
    const json = getExportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `nchat-settings-${new Date().toISOString().split("T")[0]}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  const handleCopy = async () => {
    const json = getExportData();
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={cn("gap-2", className)}>
          <Download className="h-4 w-4" />
          Export Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Settings</DialogTitle>
          <DialogDescription>
            Choose which settings to export. Your data will be saved as a JSON
            file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Quick selection */}
          <div className="flex gap-2 text-sm">
            <button
              type="button"
              onClick={selectAll}
              className="text-primary hover:underline"
            >
              Select all
            </button>
            <span className="text-muted-foreground">|</span>
            <button
              type="button"
              onClick={selectNone}
              className="text-primary hover:underline"
            >
              Select none
            </button>
          </div>

          {/* Category checkboxes */}
          <div className="space-y-3">
            {allCategories.map((category) => (
              <div key={category} className="flex items-center space-x-3">
                <Checkbox
                  id={`export-${category}`}
                  checked={selectedCategories.includes(category)}
                  onCheckedChange={() => toggleCategory(category)}
                />
                <Label
                  htmlFor={`export-${category}`}
                  className="cursor-pointer text-sm font-normal"
                >
                  {categoryLabels[category]}
                </Label>
              </div>
            ))}
          </div>

          {/* Info */}
          <p className="text-xs text-muted-foreground">
            Selected: {selectedCategories.length} of {allCategories.length}{" "}
            categories
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={handleCopy}
            disabled={selectedCategories.length === 0}
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy to Clipboard
              </>
            )}
          </Button>
          <Button
            onClick={handleDownload}
            disabled={selectedCategories.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download File
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
