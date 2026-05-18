/**
 * High Contrast Mode Component
 *
 * Provides high contrast theme support for improved accessibility.
 */

"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun, Contrast } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ContrastMode = "normal" | "high" | "higher";

interface HighContrastModeProps {
  defaultMode?: ContrastMode;
  onChange?: (mode: ContrastMode) => void;
}

/**
 * High Contrast Mode Toggle
 */
export function HighContrastMode({
  defaultMode = "normal",
  onChange,
}: HighContrastModeProps) {
  const [mode, setMode] = useState<ContrastMode>(defaultMode);

  useEffect(() => {
    // Load saved preference
    const saved = localStorage.getItem("contrast-mode") as ContrastMode;
    if (saved && ["normal", "high", "higher"].includes(saved)) {
      setMode(saved);
      applyContrastMode(saved);
    }
  }, []);

  const applyContrastMode = (newMode: ContrastMode) => {
    // Remove previous contrast classes
    document.documentElement.classList.remove(
      "contrast-normal",
      "contrast-high",
      "contrast-higher",
    );

    // Add new contrast class
    document.documentElement.classList.add(`contrast-${newMode}`);

    // Update CSS variables for high contrast
    const root = document.documentElement;

    if (newMode === "high") {
      root.style.setProperty("--contrast-multiplier", "1.5");
      root.style.setProperty("--text-shadow", "0 0 1px currentColor");
      root.style.setProperty("--border-width", "2px");
    } else if (newMode === "higher") {
      root.style.setProperty("--contrast-multiplier", "2");
      root.style.setProperty("--text-shadow", "0 0 2px currentColor");
      root.style.setProperty("--border-width", "3px");
    } else {
      root.style.setProperty("--contrast-multiplier", "1");
      root.style.setProperty("--text-shadow", "none");
      root.style.setProperty("--border-width", "1px");
    }

    // Save preference
    localStorage.setItem("contrast-mode", newMode);

    // Notify parent
    onChange?.(newMode);
  };

  const handleModeChange = (newMode: ContrastMode) => {
    setMode(newMode);
    applyContrastMode(newMode);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="Toggle contrast mode"
          aria-haspopup="true"
          aria-expanded="false"
        >
          <Contrast className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">Toggle contrast mode</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        role="menu"
        aria-label="Contrast mode options"
      >
        <DropdownMenuItem
          onClick={() => handleModeChange("normal")}
          role="menuitem"
          aria-current={mode === "normal" ? "true" : "false"}
        >
          <Sun className="mr-2 h-4 w-4" aria-hidden="true" />
          <span>Normal Contrast</span>
          {mode === "normal" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleModeChange("high")}
          role="menuitem"
          aria-current={mode === "high" ? "true" : "false"}
        >
          <Contrast className="mr-2 h-4 w-4" aria-hidden="true" />
          <span>High Contrast</span>
          {mode === "high" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleModeChange("higher")}
          role="menuitem"
          aria-current={mode === "higher" ? "true" : "false"}
        >
          <Moon className="mr-2 h-4 w-4" aria-hidden="true" />
          <span>Higher Contrast</span>
          {mode === "higher" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Hook for using high contrast mode
 */
export function useHighContrast() {
  const [mode, setMode] = useState<ContrastMode>("normal");

  useEffect(() => {
    const saved = localStorage.getItem("contrast-mode") as ContrastMode;
    if (saved) {
      setMode(saved);
    }
  }, []);

  const setContrastMode = (newMode: ContrastMode) => {
    setMode(newMode);
    localStorage.setItem("contrast-mode", newMode);

    // Apply to document
    document.documentElement.classList.remove(
      "contrast-normal",
      "contrast-high",
      "contrast-higher",
    );
    document.documentElement.classList.add(`contrast-${newMode}`);
  };

  return {
    mode,
    setContrastMode,
    isHighContrast: mode === "high" || mode === "higher",
  };
}
