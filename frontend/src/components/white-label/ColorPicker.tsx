"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Pipette, Copy, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  hexToHsl,
  hslToHex,
  getContrastRatio,
  meetsWcagAA,
  type HSL,
} from "@/lib/white-label/color-generator";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  showInput?: boolean;
  showContrast?: boolean;
  contrastWith?: string;
  swatches?: string[];
  className?: string;
}

const DEFAULT_SWATCHES = [
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#EAB308",
  "#84CC16",
  "#22C55E",
  "#10B981",
  "#14B8A6",
  "#06B6D4",
  "#0EA5E9",
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#A855F7",
  "#D946EF",
  "#EC4899",
  "#F43F5E",
  "#18181B",
  "#71717A",
  "#FFFFFF",
];

export function ColorPicker({
  value,
  onChange,
  label,
  showInput = true,
  showContrast = false,
  contrastWith = "#FFFFFF",
  swatches = DEFAULT_SWATCHES,
  className,
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [copied, setCopied] = useState(false);
  const [hsl, setHsl] = useState<HSL>(() => hexToHsl(value));
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync input value with prop
  useEffect(() => {
    setInputValue(value);
    try {
      setHsl(hexToHsl(value));
    } catch (e) {
      // Invalid color, ignore
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);

      // Validate hex color
      if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
        onChange(newValue);
        setHsl(hexToHsl(newValue));
      }
    },
    [onChange],
  );

  const handleHslChange = useCallback(
    (component: keyof HSL, newValue: number) => {
      const newHsl = { ...hsl, [component]: newValue };
      setHsl(newHsl);
      const hex = hslToHex(newHsl);
      setInputValue(hex);
      onChange(hex);
    },
    [hsl, onChange],
  );

  const handleSwatchClick = useCallback(
    (color: string) => {
      setInputValue(color);
      setHsl(hexToHsl(color));
      onChange(color);
    },
    [onChange],
  );

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [value]);

  const handleRandomColor = useCallback(() => {
    const randomHex =
      "#" +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0");
    setInputValue(randomHex);
    setHsl(hexToHsl(randomHex));
    onChange(randomHex);
  }, [onChange]);

  const contrastRatio = showContrast
    ? getContrastRatio(value, contrastWith).toFixed(2)
    : null;
  const passesAA = showContrast ? meetsWcagAA(value, contrastWith) : true;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {label && (
        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </label>
      )}

      <div className="flex gap-2">
        {/* Color swatch button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "h-10 w-10 rounded-lg border-2 shadow-sm transition-all",
            isOpen
              ? "ring-sky-500/20 border-sky-500 ring-2"
              : "border-zinc-200 dark:border-zinc-700",
          )}
          style={{ backgroundColor: value }}
          aria-label="Open color picker"
        />

        {/* Hex input */}
        {showInput && (
          <div className="flex flex-1 gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              placeholder="#000000"
              className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleCopy}
              title="Copy color"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Contrast indicator */}
      {showContrast && contrastRatio && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="text-zinc-500">Contrast with background:</span>
          <span
            className={cn(
              "font-medium",
              passesAA
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400",
            )}
          >
            {contrastRatio}:1 {passesAA ? "(AA)" : "(Fail)"}
          </span>
        </div>
      )}

      {/* Picker dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-64 rounded-xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          {/* HSL Sliders */}
          <div className="mb-4 space-y-4">
            {/* Hue */}
            <div>
              <div className="mb-1 flex justify-between text-xs text-zinc-500">
                <span>Hue</span>
                <span>{hsl.h}</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                value={hsl.h}
                onChange={(e) => handleHslChange("h", parseInt(e.target.value))}
                className="h-3 w-full cursor-pointer appearance-none rounded-full"
                style={{
                  background:
                    "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
                }}
              />
            </div>

            {/* Saturation */}
            <div>
              <div className="mb-1 flex justify-between text-xs text-zinc-500">
                <span>Saturation</span>
                <span>{hsl.s}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={hsl.s}
                onChange={(e) => handleHslChange("s", parseInt(e.target.value))}
                className="h-3 w-full cursor-pointer appearance-none rounded-full"
                style={{
                  background: `linear-gradient(to right, ${hslToHex({ ...hsl, s: 0 })}, ${hslToHex({ ...hsl, s: 100 })})`,
                }}
              />
            </div>

            {/* Lightness */}
            <div>
              <div className="mb-1 flex justify-between text-xs text-zinc-500">
                <span>Lightness</span>
                <span>{hsl.l}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={hsl.l}
                onChange={(e) => handleHslChange("l", parseInt(e.target.value))}
                className="h-3 w-full cursor-pointer appearance-none rounded-full"
                style={{
                  background: `linear-gradient(to right, #000, ${hslToHex({ ...hsl, l: 50 })}, #fff)`,
                }}
              />
            </div>
          </div>

          {/* Swatches */}
          <div className="mb-3 grid grid-cols-10 gap-1">
            {swatches.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handleSwatchClick(color)}
                className={cn(
                  "h-5 w-5 rounded transition-transform hover:scale-110",
                  value === color && "ring-2 ring-sky-500 ring-offset-1",
                )}
                style={{
                  backgroundColor: color,
                  border: color === "#FFFFFF" ? "1px solid #e4e4e7" : undefined,
                }}
                title={color}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRandomColor}
              className="flex-1"
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Random
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
