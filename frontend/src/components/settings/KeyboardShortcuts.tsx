"use client";

/**
 * Keyboard Shortcuts Settings Component
 *
 * Allows users to view, customize, and manage keyboard shortcuts.
 * Includes conflict detection and shortcut recording.
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { SettingsSection } from "./settings-section";
import { SettingsToggle } from "./SettingsToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useShortcutStore,
  selectShortcutsByCategory,
  selectConflicts,
  selectShortcutsEnabled,
  selectShowKeyboardHints,
  selectRecordingShortcut,
} from "@/lib/keyboard/shortcut-store";
import {
  ShortcutKey,
  ShortcutCategory,
  getCategories,
} from "@/lib/keyboard/shortcuts";
import { formatShortcut, isMacOS } from "@/lib/keyboard/shortcut-utils";
import {
  Search,
  RotateCcw,
  AlertTriangle,
  Info,
  Keyboard,
  Zap,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface KeyboardShortcutsProps {
  className?: string;
}

/**
 * Keyboard Shortcuts Settings Component
 */
export function KeyboardShortcuts({ className }: KeyboardShortcutsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    ShortcutCategory | "All"
  >("All");
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [recordedKeys, setRecordedKeys] = useState<string>("");

  const isMac = useMemo(() => isMacOS(), []);

  // Store selectors
  const shortcutsByCategory = useShortcutStore(selectShortcutsByCategory);
  const conflicts = useShortcutStore(selectConflicts);
  const shortcutsEnabled = useShortcutStore(selectShortcutsEnabled);
  const showKeyboardHints = useShortcutStore(selectShowKeyboardHints);
  const recordingShortcut = useShortcutStore(selectRecordingShortcut);

  // Store actions
  const {
    setShortcutsEnabled,
    setShowKeyboardHints,
    setCustomKey,
    resetToDefault,
    resetAllToDefaults,
    disableShortcut,
    enableShortcut,
    startRecording,
    stopRecording,
    recordKey,
    exportCustomizations,
    importCustomizations,
  } = useShortcutStore();

  // Get all shortcuts as flat array
  const allShortcuts = useMemo(() => {
    return Object.values(shortcutsByCategory).flat();
  }, [shortcutsByCategory]);

  // Filter shortcuts based on search and category
  const filteredShortcuts = useMemo(() => {
    let shortcuts = allShortcuts;

    // Filter by category
    if (selectedCategory !== "All") {
      shortcuts = shortcuts.filter((s) => s.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      shortcuts = shortcuts.filter(
        (s) =>
          s.label.toLowerCase().includes(query) ||
          s.description?.toLowerCase().includes(query) ||
          s.effectiveKey.toLowerCase().includes(query),
      );
    }

    return shortcuts;
  }, [allShortcuts, selectedCategory, searchQuery]);

  // Group filtered shortcuts by category
  const groupedShortcuts = useMemo(() => {
    const grouped: Record<ShortcutCategory, typeof filteredShortcuts> = {
      Navigation: [],
      Messages: [],
      Formatting: [],
      UI: [],
      Actions: [],
    };

    for (const shortcut of filteredShortcuts) {
      grouped[shortcut.category].push(shortcut);
    }

    return grouped;
  }, [filteredShortcuts]);

  // Categories with shortcuts
  const categories = useMemo(() => {
    return getCategories().filter((cat) => groupedShortcuts[cat].length > 0);
  }, [groupedShortcuts]);

  // Handle recording keyboard shortcut
  const handleStartRecording = useCallback(
    (shortcutId: ShortcutKey) => {
      startRecording(shortcutId);
      setRecordDialogOpen(true);
      setRecordedKeys("");
    },
    [startRecording],
  );

  const handleStopRecording = useCallback(() => {
    stopRecording();
    setRecordDialogOpen(false);
    setRecordedKeys("");
  }, [stopRecording]);

  const handleKeyRecord = useCallback(
    (event: KeyboardEvent) => {
      if (!recordingShortcut) return;

      event.preventDefault();
      event.stopPropagation();

      // Build key combination
      const keys: string[] = [];
      if (event.metaKey || event.ctrlKey) keys.push("mod");
      if (event.altKey) keys.push("alt");
      if (event.shiftKey) keys.push("shift");

      // Add main key (not a modifier)
      if (
        !["Control", "Alt", "Shift", "Meta"].includes(event.key) &&
        event.key !== "Unidentified"
      ) {
        keys.push(event.key.toLowerCase());
      }

      if (keys.length > 0) {
        const keyCombo = keys.join("+");
        setRecordedKeys(keyCombo);
      }
    },
    [recordingShortcut],
  );

  const handleSaveRecording = useCallback(() => {
    if (recordedKeys) {
      const success = recordKey(recordedKeys);
      if (success) {
        handleStopRecording();
      }
    }
  }, [recordedKeys, recordKey, handleStopRecording]);

  // Keyboard listener for recording
  useEffect(() => {
    if (recordDialogOpen && recordingShortcut) {
      window.addEventListener("keydown", handleKeyRecord);
      return () => window.removeEventListener("keydown", handleKeyRecord);
    }
  }, [recordDialogOpen, recordingShortcut, handleKeyRecord]);

  // Export customizations
  const handleExport = useCallback(() => {
    const json = exportCustomizations();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nchat-shortcuts.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [exportCustomizations]);

  // Import customizations
  const handleImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const json = e.target?.result as string;
        importCustomizations(json);
      };
      reader.readAsText(file);
    };
    input.click();
  }, [importCustomizations]);

  return (
    <SettingsSection
      title="Keyboard Shortcuts"
      description="Customize keyboard shortcuts and preferences"
      className={className}
    >
      {/* Global toggles */}
      <div className="space-y-4">
        <SettingsToggle
          id="shortcuts-enabled"
          label="Enable keyboard shortcuts"
          description="Toggle all keyboard shortcuts on/off"
          checked={shortcutsEnabled}
          onCheckedChange={setShortcutsEnabled}
        />

        <SettingsToggle
          id="show-hints"
          label="Show keyboard hints"
          description="Display keyboard shortcut hints in tooltips and buttons"
          checked={showKeyboardHints}
          onCheckedChange={setShowKeyboardHints}
        />
      </div>

      {/* Conflicts warning */}
      {conflicts.length > 0 && (
        <Alert variant="destructive" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {conflicts.length} shortcut conflict
            {conflicts.length > 1 ? "s" : ""} detected. Multiple shortcuts are
            using the same key combination.
          </AlertDescription>
        </Alert>
      )}

      {/* Search and filters */}
      <div className="mt-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === "All" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("All")}
          >
            All
          </Button>
          {getCategories().map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Shortcuts list */}
      <ScrollArea className="mt-6 h-[500px] rounded-lg border">
        <div className="space-y-6 p-4">
          {categories.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No shortcuts found matching your criteria
              </p>
            </div>
          ) : (
            categories.map((category) => (
              <div key={category}>
                <h3 className="mb-3 text-sm font-medium">{category}</h3>
                <div className="space-y-2">
                  {groupedShortcuts[category].map((shortcut) => {
                    const hasConflict = conflicts.some(
                      (c) => c.shortcutId === shortcut.id,
                    );

                    return (
                      <div
                        key={shortcut.id}
                        className={cn(
                          "flex items-center justify-between rounded-lg p-3",
                          "hover:bg-muted/50 transition-colors",
                          hasConflict && "bg-destructive/10",
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">
                              {shortcut.label}
                            </p>
                            {shortcut.isCustomized && (
                              <Badge variant="secondary" className="text-xs">
                                Custom
                              </Badge>
                            )}
                            {!shortcut.isEnabled && (
                              <Badge variant="outline" className="text-xs">
                                Disabled
                              </Badge>
                            )}
                            {hasConflict && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <AlertTriangle className="h-3 w-3 text-destructive" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Conflicts with other shortcuts</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                          {shortcut.description && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {shortcut.description}
                            </p>
                          )}
                        </div>

                        <div className="ml-4 flex items-center gap-2">
                          {/* Key display */}
                          <kbd
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-1 font-mono text-xs",
                              "min-w-[80px] rounded border border-border bg-muted shadow-sm",
                              "justify-center",
                            )}
                          >
                            {formatShortcut(shortcut.effectiveKey, {
                              useMacSymbols: isMac,
                            })}
                          </kbd>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleStartRecording(shortcut.id)
                                    }
                                    className="h-8 w-8 p-0"
                                  >
                                    <Keyboard className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Change shortcut</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {shortcut.isCustomized && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        resetToDefault(shortcut.id)
                                      }
                                      className="h-8 w-8 p-0"
                                    >
                                      <RotateCcw className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Reset to default</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      shortcut.isEnabled
                                        ? disableShortcut(shortcut.id)
                                        : enableShortcut(shortcut.id)
                                    }
                                    className="h-8 w-8 p-0"
                                  >
                                    {shortcut.isEnabled ? (
                                      <Check className="h-3 w-3" />
                                    ) : (
                                      <X className="h-3 w-3" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    {shortcut.isEnabled ? "Disable" : "Enable"}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="mt-6 flex items-center justify-between gap-4">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleImport}>
            Import
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={resetAllToDefaults}>
          <RotateCcw className="mr-2 h-3 w-3" />
          Reset All
        </Button>
      </div>

      {/* Info */}
      <Alert className="mt-6">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <p className="mb-1 font-medium">Tips:</p>
          <ul className="list-inside list-disc space-y-1">
            <li>Click the keyboard icon to record a new shortcut</li>
            <li>
              Use {isMac ? "Cmd" : "Ctrl"} for cross-platform compatibility
            </li>
            <li>Avoid common browser shortcuts to prevent conflicts</li>
            <li>Export your customizations to backup or share</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Recording Dialog */}
      <Dialog open={recordDialogOpen} onOpenChange={setRecordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Keyboard Shortcut</DialogTitle>
            <DialogDescription>
              {recordingShortcut && (
                <>
                  Recording new shortcut for:{" "}
                  <span className="font-medium">
                    {
                      allShortcuts.find((s) => s.id === recordingShortcut)
                        ?.label
                    }
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            <div className="space-y-4 text-center">
              <Keyboard className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Press your desired key combination...
              </p>

              {recordedKeys && (
                <div className="flex justify-center">
                  <kbd
                    className={cn(
                      "inline-flex items-center gap-1 px-4 py-2 font-mono text-base",
                      "text-primary-foreground rounded border border-border bg-primary shadow-sm",
                    )}
                  >
                    {formatShortcut(recordedKeys, { useMacSymbols: isMac })}
                  </kbd>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleStopRecording}>
              Cancel
            </Button>
            <Button onClick={handleSaveRecording} disabled={!recordedKeys}>
              <Check className="mr-2 h-4 w-4" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
