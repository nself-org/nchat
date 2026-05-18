"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  X,
  Download,
  Sparkles,
  Type,
  Smile,
  Search,
  Square,
  Circle,
  SquareCheckBig,
} from "lucide-react";
import { unicodeSymbols } from "@/lib/unicode-symbols";
import { generateIconSVG } from "@/lib/svg-generator";

interface IconGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (
    dataUrl: string,
    svgString?: string,
    variants?: {
      light?: string;
      dark?: string;
      lightSvg?: string;
      darkSvg?: string;
    },
  ) => void;
}

const presetColors = [
  // Primary colors
  { name: "Sky Blue", value: "#38BDF8", group: "primary" },
  { name: "Blue", value: "#3B82F6", group: "primary" },
  { name: "Indigo", value: "#6366F1", group: "primary" },
  { name: "Purple", value: "#8B5CF6", group: "primary" },
  { name: "Pink", value: "#EC4899", group: "primary" },
  { name: "Red", value: "#EF4444", group: "primary" },
  { name: "Orange", value: "#F97316", group: "primary" },
  { name: "Yellow", value: "#EAB308", group: "primary" },
  { name: "Green", value: "#10B981", group: "primary" },
  { name: "Teal", value: "#14B8A6", group: "primary" },
  // Neutral colors
  { name: "Gray", value: "#6B7280", group: "neutral" },
  { name: "Slate", value: "#475569", group: "neutral" },
  { name: "Zinc", value: "#71717A", group: "neutral" },
  { name: "Black", value: "#000000", group: "neutral" },
  { name: "White", value: "#FFFFFF", group: "neutral" },
  // Gradient suggestions
  { name: "Ocean", value: "#38BDF8", group: "gradient", pair: "#8B5CF6" },
  { name: "Sunset", value: "#F97316", group: "gradient", pair: "#EC4899" },
  { name: "Forest", value: "#10B981", group: "gradient", pair: "#14B8A6" },
  { name: "Royal", value: "#6366F1", group: "gradient", pair: "#8B5CF6" },
  { name: "Fire", value: "#EF4444", group: "gradient", pair: "#F97316" },
];

const gradientDirections = [
  { name: "Top to Bottom", value: "to bottom" },
  { name: "Left to Right", value: "to right" },
  { name: "Diagonal", value: "to bottom right" },
  { name: "Radial", value: "radial" },
];

export function IconGeneratorModal({
  isOpen,
  onClose,
  onGenerate,
}: IconGeneratorModalProps) {
  const [inputType, setInputType] = useState<"text" | "symbol">("text");
  const [text, setText] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("→");
  const [selectedCategory, setSelectedCategory] = useState("arrows");
  const [searchQuery, setSearchQuery] = useState("");
  const [bgType, setBgType] = useState<"solid" | "gradient">("gradient");
  const [bgColor1, setBgColor1] = useState("#38BDF8");
  const [bgColor2, setBgColor2] = useState("#8B5CF6");
  const [gradientDirection, setGradientDirection] = useState("to bottom right");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [iconShape, setIconShape] = useState<"square" | "rounded" | "circle">(
    "rounded",
  );
  const [generateVariants, setGenerateVariants] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textColorInputRef = useRef<HTMLInputElement>(null);
  const bgColor1InputRef = useRef<HTMLInputElement>(null);
  const bgColor2InputRef = useRef<HTMLInputElement>(null);

  const generateIcon = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = 512;
    canvas.height = 512;

    // Clear canvas
    ctx.clearRect(0, 0, 512, 512);

    // Create clipping path based on shape
    ctx.save();
    if (iconShape === "circle") {
      ctx.beginPath();
      ctx.arc(256, 256, 256, 0, Math.PI * 2);
      ctx.clip();
    } else if (iconShape === "rounded") {
      const radius = 64;
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(512 - radius, 0);
      ctx.quadraticCurveTo(512, 0, 512, radius);
      ctx.lineTo(512, 512 - radius);
      ctx.quadraticCurveTo(512, 512, 512 - radius, 512);
      ctx.lineTo(radius, 512);
      ctx.quadraticCurveTo(0, 512, 0, 512 - radius);
      ctx.lineTo(0, radius);
      ctx.quadraticCurveTo(0, 0, radius, 0);
      ctx.clip();
    }

    // Draw background
    if (bgType === "solid") {
      ctx.fillStyle = bgColor1;
      ctx.fillRect(0, 0, 512, 512);
    } else {
      // Create gradient
      let gradient;
      if (gradientDirection === "radial") {
        gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
      } else if (gradientDirection === "to right") {
        gradient = ctx.createLinearGradient(0, 256, 512, 256);
      } else if (gradientDirection === "to bottom") {
        gradient = ctx.createLinearGradient(256, 0, 256, 512);
      } else {
        gradient = ctx.createLinearGradient(0, 0, 512, 512);
      }
      gradient.addColorStop(0, bgColor1);
      gradient.addColorStop(1, bgColor2);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);
    }

    ctx.restore();

    // Draw text or symbol
    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const content = inputType === "symbol" ? selectedSymbol : text;

    if (inputType === "symbol") {
      ctx.font = "280px Arial";
    } else {
      // Adjust font size based on text length
      const fontSize = text.length === 1 ? 320 : text.length === 2 ? 240 : 180;
      ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
    }

    ctx.fillText(content, 256, 256);

    // Generate SVG string
    const svgString = generateIconSVG({
      content,
      isSymbol: inputType === "symbol",
      textColor,
      bgType,
      bgColor1,
      bgColor2,
      gradientDirection,
      iconShape,
      size: 512,
    });

    // Convert to data URL
    const dataUrl = canvas.toDataURL("image/png");

    // Generate variants if requested
    let variants:
      | { light?: string; dark?: string; lightSvg?: string; darkSvg?: string }
      | undefined;
    if (generateVariants) {
      // Generate light variant (dark text on light background)
      const lightSvg = generateIconSVG({
        content,
        isSymbol: inputType === "symbol",
        textColor: "#18181B", // Dark text
        bgType: "solid",
        bgColor1: "#FFFFFF", // White background
        iconShape,
        size: 512,
      });

      // Generate dark variant (light text on dark background)
      const darkSvg = generateIconSVG({
        content,
        isSymbol: inputType === "symbol",
        textColor: "#FFFFFF", // White text
        bgType: "solid",
        bgColor1: "#18181B", // Dark background
        iconShape,
        size: 512,
      });

      // Convert SVGs to data URLs
      const lightDataUrl = `data:image/svg+xml;base64,${btoa(lightSvg)}`;
      const darkDataUrl = `data:image/svg+xml;base64,${btoa(darkSvg)}`;

      variants = {
        light: lightDataUrl,
        dark: darkDataUrl,
        lightSvg,
        darkSvg,
      };
    }

    onGenerate(dataUrl, svgString, variants);
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      // Reset to defaults when opened
      setText("");
      setSelectedSymbol("→");
      setSelectedCategory("arrows");
      setSearchQuery("");
      setBgColor1("#38BDF8");
      setBgColor2("#8B5CF6");
    }
  }, [isOpen]);

  // Filter symbols based on search query
  const getFilteredSymbols = () => {
    if (!searchQuery) {
      return unicodeSymbols[selectedCategory as keyof typeof unicodeSymbols]
        .symbols;
    }

    // Search across all categories
    const allSymbols: string[] = [];
    Object.values(unicodeSymbols).forEach((category) => {
      allSymbols.push(...category.symbols);
    });

    // For emoji/symbol search, we can't use toLowerCase
    // Just return all symbols since they can't be searched by text
    return allSymbols;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200 bg-gradient-to-r from-sky-50 to-indigo-50 p-4 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 p-1.5">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Icon Generator
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-800"
            >
              <X className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-4">
          {/* Input Type Selection */}
          <div>
            <Label>Content Type</Label>
            <div className="mt-2 flex gap-2">
              <Button
                variant={inputType === "text" ? "default" : "outline"}
                onClick={() => setInputType("text")}
                className="flex-1"
              >
                <Type className="mr-2 h-4 w-4" />
                Text (1-3 letters)
              </Button>
              <Button
                variant={inputType === "symbol" ? "default" : "outline"}
                onClick={() => setInputType("symbol")}
                className="flex-1"
              >
                <Smile className="mr-2 h-4 w-4" />
                Symbol/Emoji
              </Button>
            </div>
          </div>

          {/* Text/Emoji Input */}
          {inputType === "text" ? (
            <div>
              <Label htmlFor="icon-text">Text (1-3 characters)</Label>
              <Input
                id="icon-text"
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 3))}
                placeholder="e.g., NC"
                maxLength={3}
                className="mt-1.5"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label>Search Symbols</Label>
                <div className="relative mt-1.5">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for symbols..."
                    className="pl-10"
                  />
                </div>
              </div>

              {!searchQuery && (
                <div>
                  <Label>Categories</Label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {Object.entries(unicodeSymbols).map(([key, category]) => (
                      <Button
                        key={key}
                        variant={
                          selectedCategory === key ? "default" : "outline"
                        }
                        onClick={() => setSelectedCategory(key)}
                        size="sm"
                        className="h-7 px-2.5 text-xs"
                      >
                        {category.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label>
                  {searchQuery
                    ? `Search Results (${getFilteredSymbols().length})`
                    : unicodeSymbols[
                        selectedCategory as keyof typeof unicodeSymbols
                      ].name}
                </Label>
                <div className="mt-1.5 max-h-48 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
                  <div className="grid grid-cols-12 gap-1">
                    {getFilteredSymbols().map((symbol, index) => (
                      <button
                        key={`${symbol}-${index}`}
                        onClick={() => setSelectedSymbol(symbol)}
                        className={`rounded p-2 text-xl text-zinc-900 transition-colors hover:bg-sky-50 dark:text-zinc-100 dark:hover:bg-zinc-800 ${
                          selectedSymbol === symbol
                            ? "bg-sky-100 ring-2 ring-sky-500 dark:bg-zinc-800"
                            : ""
                        }`}
                        title={symbol}
                      >
                        {symbol}
                      </button>
                    ))}
                  </div>
                  {searchQuery && getFilteredSymbols().length === 0 && (
                    <p className="py-4 text-center text-zinc-500 dark:text-zinc-400">
                      No symbols found matching "{searchQuery}"
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="rounded-lg border border-zinc-200 bg-white p-2 text-3xl text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100">
                  {selectedSymbol}
                </div>
                <Input
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  placeholder="Or type/paste any symbol"
                  className="flex-1"
                />
              </div>
            </div>
          )}

          {/* Text Color */}
          <div>
            <Label>Text Color</Label>
            <div className="mt-1.5 flex gap-2">
              <div className="flex gap-1.5">
                <button
                  onClick={() => textColorInputRef.current?.click()}
                  className="h-7 w-7 cursor-pointer rounded border-2 border-zinc-300 transition-transform hover:scale-110 dark:border-zinc-700"
                  style={{ backgroundColor: textColor }}
                  title="Click to pick color"
                />
                <input
                  ref={textColorInputRef}
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="hidden"
                />
                {[
                  "#FFFFFF",
                  "#18181B",
                  "#6B7280",
                  "#EF4444",
                  "#10B981",
                  "#3B82F6",
                  "#8B5CF6",
                  "#F59E0B",
                ].map((color) => (
                  <button
                    key={color}
                    onClick={() => setTextColor(color)}
                    className="h-7 w-7 rounded border-2 border-zinc-300 transition-transform hover:scale-110 dark:border-zinc-700"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <Input
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                placeholder="#FFFFFF"
                className="h-7 flex-1 text-xs"
              />
            </div>
          </div>

          {/* Icon Shape */}
          <div className="flex items-center gap-3">
            <Label className="text-sm">Shape:</Label>
            <div className="flex gap-1.5">
              <Button
                variant={iconShape === "square" ? "default" : "outline"}
                onClick={() => setIconShape("square")}
                size="sm"
                className="h-7 w-7 p-0"
                title="Square"
              >
                <Square className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={iconShape === "rounded" ? "default" : "outline"}
                onClick={() => setIconShape("rounded")}
                size="sm"
                className="h-7 w-7 p-0"
                title="Rounded Square"
              >
                <SquareCheckBig className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={iconShape === "circle" ? "default" : "outline"}
                onClick={() => setIconShape("circle")}
                size="sm"
                className="h-7 w-7 p-0"
                title="Circle"
              >
                <Circle className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Generate Variants */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="generateVariants"
              checked={generateVariants}
              onChange={(e) => setGenerateVariants(e.target.checked)}
              className="rounded border-zinc-300 text-sky-600 focus:ring-sky-500 dark:border-zinc-700"
            />
            <Label
              htmlFor="generateVariants"
              className="cursor-pointer text-sm"
            >
              Generate light/dark variants
            </Label>
          </div>

          {/* Background Type */}
          <div className="flex items-center gap-3">
            <Label className="text-sm">Background:</Label>
            <div className="flex gap-1.5">
              <Button
                variant={bgType === "solid" ? "default" : "outline"}
                onClick={() => setBgType("solid")}
                size="sm"
                className="h-7 px-3 text-xs"
              >
                Solid
              </Button>
              <Button
                variant={bgType === "gradient" ? "default" : "outline"}
                onClick={() => setBgType("gradient")}
                size="sm"
                className="h-7 px-3 text-xs"
              >
                Gradient
              </Button>
            </div>
          </div>

          {/* Background Colors */}
          <div className="space-y-2">
            <div className="flex items-end gap-2">
              {/* Color inputs */}
              <div className="flex-1">
                <Label className="text-xs">
                  {bgType === "gradient" ? "Start" : "Color"}
                </Label>
                <div className="mt-1 flex gap-1.5">
                  <button
                    onClick={() => bgColor1InputRef.current?.click()}
                    className="h-7 w-8 cursor-pointer rounded border-2 border-zinc-300 shadow-sm transition-transform hover:scale-105 dark:border-zinc-700"
                    style={{ backgroundColor: bgColor1 }}
                    title="Click to pick color"
                  />
                  <input
                    ref={bgColor1InputRef}
                    type="color"
                    value={bgColor1}
                    onChange={(e) => setBgColor1(e.target.value)}
                    className="hidden"
                  />
                  <Input
                    value={bgColor1}
                    onChange={(e) => setBgColor1(e.target.value)}
                    placeholder="#38BDF8"
                    className="h-7 flex-1 text-xs"
                  />
                </div>
              </div>

              {bgType === "gradient" && (
                <div className="flex-1">
                  <Label className="text-xs">End</Label>
                  <div className="mt-1 flex gap-1.5">
                    <button
                      onClick={() => bgColor2InputRef.current?.click()}
                      className="h-7 w-8 cursor-pointer rounded border-2 border-zinc-300 shadow-sm transition-transform hover:scale-105 dark:border-zinc-700"
                      style={{ backgroundColor: bgColor2 }}
                      title="Click to pick color"
                    />
                    <input
                      ref={bgColor2InputRef}
                      type="color"
                      value={bgColor2}
                      onChange={(e) => setBgColor2(e.target.value)}
                      className="hidden"
                    />
                    <Input
                      value={bgColor2}
                      onChange={(e) => setBgColor2(e.target.value)}
                      placeholder="#8B5CF6"
                      className="h-7 flex-1 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Quick colors */}
            <div className="flex gap-1.5">
              {presetColors
                .filter((c) => c.group === "primary")
                .slice(0, 10)
                .map((color) => (
                  <button
                    key={color.value}
                    onClick={() => {
                      setBgColor1(color.value);
                      if (bgType === "gradient" && color.pair) {
                        setBgColor2(color.pair);
                      }
                    }}
                    className="h-7 w-7 rounded border border-zinc-300 transition-transform hover:scale-110 dark:border-zinc-700"
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
            </div>

            {bgType === "gradient" && (
              <div className="flex gap-1.5">
                {presetColors
                  .filter((c) => c.group === "gradient")
                  .map((color) => (
                    <button
                      key={color.name}
                      onClick={() => {
                        setBgColor1(color.value);
                        setBgColor2(color.pair!);
                      }}
                      className="h-7 flex-1 rounded border border-zinc-300 transition-transform hover:scale-105 dark:border-zinc-700"
                      style={{
                        background: `linear-gradient(to right, ${color.value}, ${color.pair})`,
                      }}
                      title={color.name}
                    />
                  ))}
              </div>
            )}
          </div>

          {bgType === "gradient" && (
            <div>
              <Label className="text-xs">Direction</Label>
              <div className="mt-1.5 flex gap-1.5">
                {gradientDirections.map((dir) => (
                  <Button
                    key={dir.value}
                    variant={
                      gradientDirection === dir.value ? "default" : "outline"
                    }
                    onClick={() => setGradientDirection(dir.value)}
                    size="sm"
                    className="h-7 flex-1 px-2 text-xs"
                  >
                    {dir.name.split(" ")[0]}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="-mx-4 border-y border-zinc-200 bg-gradient-to-br from-zinc-50 to-zinc-100 p-6 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-800">
            <div className="flex justify-center gap-6">
              <div className="text-center">
                <div
                  className={`flex h-24 w-24 items-center justify-center font-bold shadow-lg ${
                    iconShape === "circle"
                      ? "rounded-full"
                      : iconShape === "rounded"
                        ? "rounded-2xl"
                        : ""
                  }`}
                  style={{
                    background:
                      bgType === "solid"
                        ? bgColor1
                        : gradientDirection === "radial"
                          ? `radial-gradient(circle, ${bgColor1}, ${bgColor2})`
                          : `linear-gradient(${gradientDirection}, ${bgColor1}, ${bgColor2})`,
                    color: textColor,
                    fontSize:
                      inputType === "symbol"
                        ? "48px"
                        : text.length === 1
                          ? "56px"
                          : text.length === 2
                            ? "42px"
                            : "32px",
                  }}
                >
                  {inputType === "symbol" ? selectedSymbol : text}
                </div>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Large
                </p>
              </div>
              <div className="text-center">
                <div
                  className={`flex h-12 w-12 items-center justify-center font-bold shadow-md ${
                    iconShape === "circle"
                      ? "rounded-full"
                      : iconShape === "rounded"
                        ? "rounded-xl"
                        : ""
                  }`}
                  style={{
                    background:
                      bgType === "solid"
                        ? bgColor1
                        : gradientDirection === "radial"
                          ? `radial-gradient(circle, ${bgColor1}, ${bgColor2})`
                          : `linear-gradient(${gradientDirection}, ${bgColor1}, ${bgColor2})`,
                    color: textColor,
                    fontSize:
                      inputType === "symbol"
                        ? "24px"
                        : text.length === 1
                          ? "28px"
                          : text.length === 2
                            ? "20px"
                            : "16px",
                  }}
                >
                  {inputType === "symbol" ? selectedSymbol : text}
                </div>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Small
                </p>
              </div>
            </div>
          </div>

          {/* Hidden canvas for generation */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={generateIcon}
            disabled={inputType === "text" ? !text : !selectedSymbol}
            size="sm"
            className="bg-gradient-to-r from-sky-600 to-indigo-600 text-white hover:from-sky-700 hover:to-indigo-700"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Generate
          </Button>
        </div>
      </div>
    </div>
  );
}
