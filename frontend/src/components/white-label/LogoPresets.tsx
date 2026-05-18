"use client";

import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

import { logger } from "@/lib/logger";

interface LogoPreset {
  id: string;
  name: string;
  icon: string;
  colors: string[];
  shape: "circle" | "square" | "rounded" | "hexagon";
}

const LOGO_PRESETS: LogoPreset[] = [
  {
    id: "gradient-blue",
    name: "Ocean Blue",
    icon: "O",
    colors: ["#3B82F6", "#8B5CF6"],
    shape: "rounded",
  },
  {
    id: "gradient-sunset",
    name: "Sunset",
    icon: "S",
    colors: ["#F97316", "#EC4899"],
    shape: "circle",
  },
  {
    id: "gradient-forest",
    name: "Forest",
    icon: "F",
    colors: ["#10B981", "#14B8A6"],
    shape: "rounded",
  },
  {
    id: "gradient-midnight",
    name: "Midnight",
    icon: "M",
    colors: ["#6366F1", "#8B5CF6"],
    shape: "square",
  },
  {
    id: "gradient-flame",
    name: "Flame",
    icon: "F",
    colors: ["#EF4444", "#F59E0B"],
    shape: "hexagon",
  },
  {
    id: "gradient-sky",
    name: "Sky",
    icon: "S",
    colors: ["#0EA5E9", "#22D3EE"],
    shape: "circle",
  },
  {
    id: "solid-dark",
    name: "Dark",
    icon: "D",
    colors: ["#18181B", "#18181B"],
    shape: "rounded",
  },
  {
    id: "solid-light",
    name: "Light",
    icon: "L",
    colors: ["#F4F4F5", "#E4E4E7"],
    shape: "rounded",
  },
];

interface LogoPresetsProps {
  appName?: string;
  selectedPreset?: string;
  onSelect: (preset: LogoPreset, dataUrl: string) => void;
  className?: string;
}

export function LogoPresets({
  appName = "App",
  selectedPreset,
  onSelect,
  className,
}: LogoPresetsProps) {
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const getInitials = (name: string): string => {
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  const generateLogo = async (preset: LogoPreset): Promise<string> => {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, preset.colors[0]);
    gradient.addColorStop(1, preset.colors[1]);

    // Draw shape
    ctx.fillStyle = gradient;

    switch (preset.shape) {
      case "circle":
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2);
        ctx.fill();
        break;

      case "square":
        ctx.fillRect(10, 10, size - 20, size - 20);
        break;

      case "rounded":
        const radius = size * 0.15;
        ctx.beginPath();
        ctx.moveTo(radius + 10, 10);
        ctx.lineTo(size - radius - 10, 10);
        ctx.quadraticCurveTo(size - 10, 10, size - 10, radius + 10);
        ctx.lineTo(size - 10, size - radius - 10);
        ctx.quadraticCurveTo(
          size - 10,
          size - 10,
          size - radius - 10,
          size - 10,
        );
        ctx.lineTo(radius + 10, size - 10);
        ctx.quadraticCurveTo(10, size - 10, 10, size - radius - 10);
        ctx.lineTo(10, radius + 10);
        ctx.quadraticCurveTo(10, 10, radius + 10, 10);
        ctx.fill();
        break;

      case "hexagon":
        const s = size / 2 - 10;
        const cx = size / 2;
        const cy = size / 2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const x = cx + s * Math.cos(angle);
          const y = cy + s * Math.sin(angle);
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.fill();
        break;
    }

    // Add text
    const initials = getInitials(appName);
    const isDark =
      preset.id === "solid-dark" ||
      preset.colors[0].startsWith("#1") ||
      preset.colors[0].startsWith("#0");
    ctx.fillStyle = isDark ? "#FFFFFF" : "#FFFFFF";
    ctx.font = `bold ${size * 0.35}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, size / 2, size / 2 + size * 0.02);

    return canvas.toDataURL("image/png");
  };

  const handleSelect = async (preset: LogoPreset) => {
    setGeneratingId(preset.id);
    try {
      const dataUrl = await generateLogo(preset);
      onSelect(preset, dataUrl);
    } catch (error) {
      logger.error("Failed to generate logo:", error);
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <Sparkles className="h-4 w-4" />
        <span>Quick logo templates</span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {LOGO_PRESETS.map((preset) => {
          const initials = getInitials(appName);
          const isSelected = selectedPreset === preset.id;
          const isGenerating = generatingId === preset.id;

          return (
            <button
              key={preset.id}
              onClick={() => handleSelect(preset)}
              disabled={isGenerating}
              className={cn(
                "group relative aspect-square overflow-hidden rounded-xl border-2 transition-all",
                isSelected
                  ? "ring-sky-500/20 border-sky-500 ring-2"
                  : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500",
              )}
            >
              {/* Preview */}
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${preset.colors[0]}, ${preset.colors[1]})`,
                }}
              >
                <span
                  className="text-lg font-bold text-white"
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}
                >
                  {initials}
                </span>
              </div>

              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-sky-500">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}

              {/* Loading overlay */}
              {isGenerating && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}

              {/* Hover name */}
              <div className="absolute inset-x-0 bottom-0 bg-black/60 py-1 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="text-xs text-white">{preset.name}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
