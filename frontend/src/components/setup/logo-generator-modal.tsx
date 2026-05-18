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
  Palette,
  Layout,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Square,
  Circle,
  SquareCheckBig,
  Minus,
} from "lucide-react";
import { iconSymbols } from "@/lib/icon-symbols";
import { generateLogoSVG, type LogoSVGOptions } from "@/lib/svg-generator";

interface LogoGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (dataUrl: string, svgString?: string) => void;
  appName?: string;
  iconDataUrl?: string;
  iconSvg?: string | null;
}

const googleFonts = [
  { name: "Inter", value: "Inter", weights: ["400", "600", "700", "900"] },
  { name: "Roboto", value: "Roboto", weights: ["300", "400", "700", "900"] },
  {
    name: "Open Sans",
    value: "Open Sans",
    weights: ["300", "400", "600", "700"],
  },
  {
    name: "Montserrat",
    value: "Montserrat",
    weights: ["400", "600", "700", "900"],
  },
  { name: "Poppins", value: "Poppins", weights: ["400", "600", "700", "900"] },
  { name: "Raleway", value: "Raleway", weights: ["400", "600", "700", "900"] },
  {
    name: "Playfair Display",
    value: "Playfair Display",
    weights: ["400", "700", "900"],
  },
  { name: "Lato", value: "Lato", weights: ["300", "400", "700", "900"] },
  { name: "Ubuntu", value: "Ubuntu", weights: ["300", "400", "500", "700"] },
  { name: "Bebas Neue", value: "Bebas Neue", weights: ["400"] },
  {
    name: "Oswald",
    value: "Oswald",
    weights: ["300", "400", "500", "600", "700"],
  },
  {
    name: "Space Grotesk",
    value: "Space Grotesk",
    weights: ["300", "400", "500", "700"],
  },
];

const presetColors = [
  { name: "Dark", value: "#18181B" },
  { name: "White", value: "#FFFFFF" },
  { name: "Gray", value: "#6B7280" },
  { name: "Sky Blue", value: "#38BDF8" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Indigo", value: "#6366F1" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Pink", value: "#EC4899" },
  { name: "Red", value: "#EF4444" },
  { name: "Orange", value: "#F97316" },
  { name: "Green", value: "#10B981" },
];

export function LogoGeneratorModal({
  isOpen,
  onClose,
  onGenerate,
  appName = "",
  iconDataUrl,
  iconSvg,
}: LogoGeneratorModalProps) {
  const [text, setText] = useState(appName);
  const [tagline, setTagline] = useState("");
  const [selectedFont, setSelectedFont] = useState("Inter");
  const [fontWeight, setFontWeight] = useState("700");
  const [textColor, setTextColor] = useState("#18181B");
  const [taglineColor, setTaglineColor] = useState("#6B7280");
  const [backgroundColor, setBackgroundColor] = useState("transparent");
  const [includeIcon, setIncludeIcon] = useState(!!iconDataUrl);
  const [iconPosition, setIconPosition] = useState<"left" | "top">("left");
  const [alignment, setAlignment] = useState<"left" | "center" | "right">(
    "left",
  );
  const [padding, setPadding] = useState(32);
  const [textOffsetX, setTextOffsetX] = useState(0);
  const [textOffsetY, setTextOffsetY] = useState(0);
  const [taglineOffsetX, setTaglineOffsetX] = useState(0);
  const [taglineOffsetY, setTaglineOffsetY] = useState(0);
  const [iconShape, setIconShape] = useState<"square" | "rounded" | "circle">(
    "square",
  );
  const [showDivider, setShowDivider] = useState(false);
  const [dividerPosition, setDividerPosition] = useState<"above" | "below">(
    "below",
  );
  const [dividerColor, setDividerColor] = useState("#6B7280");
  const [dividerWidth, setDividerWidth] = useState(60);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const iconImageRef = useRef<HTMLImageElement | null>(null);
  const textColorInputRef = useRef<HTMLInputElement>(null);
  const taglineColorInputRef = useRef<HTMLInputElement>(null);
  const bgColorInputRef = useRef<HTMLInputElement>(null);
  const dividerColorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setText(appName || "");
      if (iconDataUrl) {
        const img = new Image();
        img.onload = () => {
          iconImageRef.current = img;
        };
        img.src = iconDataUrl;
      }
    }
  }, [isOpen, appName, iconDataUrl]);

  // Load Google Fonts dynamically
  useEffect(() => {
    const fontData = googleFonts.find((f) => f.value === selectedFont);
    if (fontData) {
      // Remove any existing font link for this font
      const existingLink = document.querySelector(
        `link[data-font="${selectedFont}"]`,
      );
      if (existingLink) {
        document.head.removeChild(existingLink);
      }

      const link = document.createElement("link");
      link.setAttribute("data-font", selectedFont);
      link.href = `https://fonts.googleapis.com/css2?family=${selectedFont.replace(" ", "+")}:wght@${fontData.weights.join(";")}&display=swap`;
      link.rel = "stylesheet";
      document.head.appendChild(link);

      // Force re-render after font loads
      const timer = setTimeout(() => {
        setSelectedFont((prev) => prev + " ");
        setTimeout(() => setSelectedFont(selectedFont), 0);
      }, 200);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [selectedFont]);

  const generateLogo = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Calculate dimensions based on content
    const iconSize = includeIcon ? 48 : 0;
    const iconSpacing = includeIcon ? 16 : 0;
    const fontSize = 48;
    const taglineFontSize = tagline ? 18 : 0;
    const taglineSpacing = tagline ? 8 : 0;

    // Set temporary canvas to measure text
    ctx.font = `${fontWeight} ${fontSize}px '${selectedFont}', sans-serif`;
    const textWidth = ctx.measureText(text).width;
    ctx.font = `400 ${taglineFontSize}px '${selectedFont}', sans-serif`;
    const taglineWidth = tagline ? ctx.measureText(tagline).width : 0;

    const maxTextWidth = Math.max(textWidth, taglineWidth);

    // Calculate canvas dimensions
    let canvasWidth, canvasHeight;

    if (iconPosition === "left") {
      canvasWidth = iconSize + iconSpacing + maxTextWidth + padding * 2;
      canvasHeight =
        Math.max(iconSize, fontSize + taglineSpacing + taglineFontSize) +
        padding * 2;
    } else {
      canvasWidth = Math.max(iconSize, maxTextWidth) + padding * 2;
      canvasHeight =
        iconSize +
        iconSpacing +
        fontSize +
        taglineSpacing +
        taglineFontSize +
        padding * 2;
    }

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Draw background
    if (backgroundColor !== "transparent") {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    // Calculate positions based on alignment
    let startX = padding;
    if (alignment === "center") {
      startX = canvasWidth / 2;
      ctx.textAlign = "center";
    } else if (alignment === "right") {
      startX = canvasWidth - padding;
      ctx.textAlign = "right";
    } else {
      ctx.textAlign = "left";
    }

    let currentY = padding;
    let iconX = startX;
    let textX = startX;

    // Helper function to draw icon with shape
    const drawIcon = (x: number, y: number, size: number) => {
      if (!iconImageRef.current) return;

      ctx.save();

      // Create clipping path based on shape
      if (iconShape === "circle") {
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();
      } else if (iconShape === "rounded") {
        const radius = size * 0.15;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + size - radius, y);
        ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
        ctx.lineTo(x + size, y + size - radius);
        ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
        ctx.lineTo(x + radius, y + size);
        ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.clip();
      }

      ctx.drawImage(iconImageRef.current, x, y, size, size);
      ctx.restore();
    };

    // Draw icon and text based on position
    if (iconPosition === "top") {
      // Icon on top
      if (includeIcon && iconImageRef.current) {
        if (alignment === "center") {
          iconX = (canvasWidth - iconSize) / 2;
        } else if (alignment === "right") {
          iconX = canvasWidth - padding - iconSize;
        }
        drawIcon(iconX, currentY, iconSize);
        currentY += iconSize + iconSpacing;
      }

      // Text below icon
      // Draw divider if enabled (above text)
      if (showDivider && dividerPosition === "above") {
        const dividerY = currentY + fontSize * 0.3;
        const dividerX =
          alignment === "center"
            ? (canvasWidth - dividerWidth) / 2
            : alignment === "right"
              ? canvasWidth - padding - dividerWidth
              : textX + textOffsetX;
        ctx.strokeStyle = dividerColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(dividerX, dividerY);
        ctx.lineTo(dividerX + dividerWidth, dividerY);
        ctx.stroke();
        currentY += 8;
      }

      ctx.fillStyle = textColor;
      ctx.font = `${fontWeight} ${fontSize}px '${selectedFont}', sans-serif`;
      ctx.fillText(
        text,
        textX + textOffsetX,
        currentY + fontSize * 0.8 + textOffsetY,
      );

      // Draw divider if enabled (below text)
      if (showDivider && dividerPosition === "below" && !tagline) {
        const dividerY = currentY + fontSize + 8;
        const dividerX =
          alignment === "center"
            ? (canvasWidth - dividerWidth) / 2
            : alignment === "right"
              ? canvasWidth - padding - dividerWidth
              : textX + textOffsetX;
        ctx.strokeStyle = dividerColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(dividerX, dividerY);
        ctx.lineTo(dividerX + dividerWidth, dividerY);
        ctx.stroke();
      }

      if (tagline) {
        currentY += fontSize + taglineSpacing;
        ctx.fillStyle = taglineColor;
        ctx.font = `400 ${taglineFontSize}px '${selectedFont}', sans-serif`;
        ctx.fillText(
          tagline,
          textX + taglineOffsetX,
          currentY + taglineFontSize * 0.8 + taglineOffsetY,
        );

        // Draw divider below tagline if that's the position
        if (showDivider && dividerPosition === "below") {
          const dividerY = currentY + taglineFontSize + 8;
          const dividerX =
            alignment === "center"
              ? (canvasWidth - dividerWidth) / 2
              : alignment === "right"
                ? canvasWidth - padding - dividerWidth
                : textX + taglineOffsetX;
          ctx.strokeStyle = dividerColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(dividerX, dividerY);
          ctx.lineTo(dividerX + dividerWidth, dividerY);
          ctx.stroke();
        }
      }
    } else {
      // Icon on left
      if (includeIcon && iconImageRef.current) {
        const iconY = (canvasHeight - iconSize) / 2;
        drawIcon(iconX, iconY, iconSize);
        if (alignment === "left") {
          textX += iconSize + iconSpacing;
        }
      }

      // Text to the right of icon
      const textBlockHeight =
        fontSize + (tagline ? taglineSpacing + taglineFontSize : 0);
      currentY = (canvasHeight - textBlockHeight) / 2;

      // Draw divider if enabled (above text)
      if (showDivider && dividerPosition === "above") {
        const dividerY = currentY + fontSize * 0.3;
        const dividerX =
          alignment === "center"
            ? (canvasWidth - dividerWidth) / 2
            : alignment === "right"
              ? canvasWidth - padding - dividerWidth
              : textX + textOffsetX;
        ctx.strokeStyle = dividerColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(dividerX, dividerY);
        ctx.lineTo(dividerX + dividerWidth, dividerY);
        ctx.stroke();
        currentY += 8;
      }

      ctx.fillStyle = textColor;
      ctx.font = `${fontWeight} ${fontSize}px '${selectedFont}', sans-serif`;
      ctx.fillText(
        text,
        textX + textOffsetX,
        currentY + fontSize * 0.8 + textOffsetY,
      );

      // Draw divider if enabled (below text)
      if (showDivider && dividerPosition === "below" && !tagline) {
        const dividerY = currentY + fontSize + 8;
        const dividerX =
          alignment === "center"
            ? (canvasWidth - dividerWidth) / 2
            : alignment === "right"
              ? canvasWidth - padding - dividerWidth
              : textX + textOffsetX;
        ctx.strokeStyle = dividerColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(dividerX, dividerY);
        ctx.lineTo(dividerX + dividerWidth, dividerY);
        ctx.stroke();
      }

      if (tagline) {
        currentY += fontSize + taglineSpacing;
        ctx.fillStyle = taglineColor;
        ctx.font = `400 ${taglineFontSize}px '${selectedFont}', sans-serif`;
        ctx.fillText(
          tagline,
          textX + taglineOffsetX,
          currentY + taglineFontSize * 0.8 + taglineOffsetY,
        );

        // Draw divider below tagline if that's the position
        if (showDivider && dividerPosition === "below") {
          const dividerY = currentY + taglineFontSize + 8;
          const dividerX =
            alignment === "center"
              ? (canvasWidth - dividerWidth) / 2
              : alignment === "right"
                ? canvasWidth - padding - dividerWidth
                : textX + taglineOffsetX;
          ctx.strokeStyle = dividerColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(dividerX, dividerY);
          ctx.lineTo(dividerX + dividerWidth, dividerY);
          ctx.stroke();
        }
      }
    }

    // Convert to data URL
    const dataUrl = canvas.toDataURL("image/png");

    // Generate SVG version
    const svgOptions: LogoSVGOptions = {
      text,
      tagline: tagline || undefined,
      fontFamily: selectedFont,
      fontWeight: fontWeight,
      textColor,
      taglineColor,
      includeIcon: includeIcon && !!iconDataUrl,
      iconSvg: includeIcon && iconSvg ? iconSvg : iconDataUrl,
      iconPosition: iconPosition as "left" | "top",
      alignment: alignment as "left" | "center" | "right",
      backgroundColor: backgroundColor,
      showDivider,
      dividerPosition: dividerPosition as "above" | "below",
      dividerColor,
      dividerWidth,
      textOffsetX,
      textOffsetY,
      taglineOffsetX,
      taglineOffsetY,
    };
    const svgString = generateLogoSVG(svgOptions);

    onGenerate(dataUrl, svgString);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-4 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 p-1.5">
                <Type className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Logo Generator
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
          <div className="grid grid-cols-2 gap-4">
            {/* Text Settings */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="logo-text">Logo Text</Label>
                <Input
                  id="logo-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Your Brand Name"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="tagline">Tagline (Optional)</Label>
                <Input
                  id="tagline"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Your tagline here"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label>Font Family</Label>
                <div className="mt-1.5 grid max-h-28 grid-cols-3 gap-1.5 overflow-y-auto rounded-lg border border-zinc-200 p-1.5 dark:border-zinc-700">
                  {googleFonts.map((font) => (
                    <button
                      key={font.value}
                      onClick={() => {
                        setSelectedFont(font.value);
                        // Reset font weight if not supported
                        if (!font.weights.includes(fontWeight)) {
                          // Try to find closest weight
                          if (font.weights.includes("700")) {
                            setFontWeight("700");
                          } else if (font.weights.includes("600")) {
                            setFontWeight("600");
                          } else if (font.weights.includes("500")) {
                            setFontWeight("500");
                          } else {
                            setFontWeight(
                              font.weights[font.weights.length - 1] || "400",
                            );
                          }
                        }
                      }}
                      className={`rounded border p-1.5 text-xs transition-colors ${
                        selectedFont === font.value
                          ? "border-sky-500 bg-sky-50 font-semibold dark:bg-sky-950"
                          : "border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                      }`}
                      style={{ fontFamily: `'${font.value}', sans-serif` }}
                    >
                      {font.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Font Weight</Label>
                <div className="mt-1.5 flex gap-1.5">
                  {(() => {
                    const font = googleFonts.find(
                      (f) => f.value === selectedFont,
                    );
                    const availableWeights = font?.weights || ["400", "700"];
                    const weightLabels: Record<string, string> = {
                      "300": "Light",
                      "400": "Reg",
                      "500": "Med",
                      "600": "Semi",
                      "700": "Bold",
                      "900": "Black",
                    };

                    return availableWeights.map((weight) => (
                      <Button
                        key={weight}
                        variant={fontWeight === weight ? "default" : "outline"}
                        onClick={() => setFontWeight(weight)}
                        size="sm"
                        className="h-7 flex-1 px-1 text-xs"
                      >
                        {weightLabels[weight] || weight}
                      </Button>
                    ));
                  })()}
                </div>
              </div>
            </div>

            {/* Layout & Colors */}
            <div className="space-y-4">
              {iconDataUrl && (
                <>
                  <div>
                    <Label>Include Icon</Label>
                    <div className="mt-1.5 flex gap-1.5">
                      <Button
                        variant={includeIcon ? "default" : "outline"}
                        onClick={() => setIncludeIcon(true)}
                        size="sm"
                        className="h-7 flex-1 text-xs"
                      >
                        With Icon
                      </Button>
                      <Button
                        variant={!includeIcon ? "default" : "outline"}
                        onClick={() => setIncludeIcon(false)}
                        size="sm"
                        className="h-7 flex-1 text-xs"
                      >
                        Text Only
                      </Button>
                    </div>
                  </div>

                  {includeIcon && (
                    <div>
                      <Label>Icon Shape</Label>
                      <div className="mt-1.5 flex gap-1.5">
                        <Button
                          variant={
                            iconShape === "square" ? "default" : "outline"
                          }
                          onClick={() => setIconShape("square")}
                          size="sm"
                          className="h-7 flex-1"
                          title="Square"
                        >
                          <Square className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant={
                            iconShape === "rounded" ? "default" : "outline"
                          }
                          onClick={() => setIconShape("rounded")}
                          size="sm"
                          className="h-7 flex-1"
                          title="Rounded"
                        >
                          <SquareCheckBig className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant={
                            iconShape === "circle" ? "default" : "outline"
                          }
                          onClick={() => setIconShape("circle")}
                          size="sm"
                          className="h-7 flex-1"
                          title="Circle"
                        >
                          <Circle className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {includeIcon && (
                <div>
                  <Label>Icon Position</Label>
                  <div className="mt-1.5 flex gap-1.5">
                    <Button
                      variant={iconPosition === "left" ? "default" : "outline"}
                      onClick={() => setIconPosition("left")}
                      size="sm"
                      className="h-7 flex-1 text-xs"
                    >
                      <Layout className="mr-1 h-3.5 w-3.5" />
                      Left
                    </Button>
                    <Button
                      variant={iconPosition === "top" ? "default" : "outline"}
                      onClick={() => setIconPosition("top")}
                      size="sm"
                      className="h-7 flex-1 text-xs"
                    >
                      <Layout className="mr-1 h-3.5 w-3.5 rotate-90" />
                      Top
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <Label>Alignment</Label>
                <div className="mt-1.5 flex gap-1.5">
                  <Button
                    variant={alignment === "left" ? "default" : "outline"}
                    onClick={() => setAlignment("left")}
                    size="sm"
                    className="h-7 flex-1"
                  >
                    <AlignLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant={alignment === "center" ? "default" : "outline"}
                    onClick={() => setAlignment("center")}
                    size="sm"
                    className="h-7 flex-1"
                  >
                    <AlignCenter className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant={alignment === "right" ? "default" : "outline"}
                    onClick={() => setAlignment("right")}
                    size="sm"
                    className="h-7 flex-1"
                  >
                    <AlignRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>Text Color</Label>
                <div className="mt-1.5 flex gap-1.5">
                  <button
                    onClick={() => textColorInputRef.current?.click()}
                    className="h-7 w-8 cursor-pointer rounded border-2 border-zinc-300 shadow-sm transition-transform hover:scale-105 dark:border-zinc-700"
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
                  <Input
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    placeholder="#18181B"
                    className="h-7 flex-1 text-xs"
                  />
                </div>
                <div className="mt-1.5 flex gap-1.5">
                  {presetColors.slice(0, 8).map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setTextColor(color.value)}
                      className="h-7 w-7 rounded border border-zinc-300 transition-transform hover:scale-110 dark:border-zinc-700"
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {tagline && (
                <div>
                  <Label>Tagline Color</Label>
                  <div className="mt-1.5 flex gap-1.5">
                    <button
                      onClick={() => taglineColorInputRef.current?.click()}
                      className="h-7 w-8 cursor-pointer rounded border-2 border-zinc-300 shadow-sm transition-transform hover:scale-105 dark:border-zinc-700"
                      style={{ backgroundColor: taglineColor }}
                      title="Click to pick color"
                    />
                    <input
                      ref={taglineColorInputRef}
                      type="color"
                      value={taglineColor}
                      onChange={(e) => setTaglineColor(e.target.value)}
                      className="hidden"
                    />
                    <Input
                      value={taglineColor}
                      onChange={(e) => setTaglineColor(e.target.value)}
                      placeholder="#6B7280"
                      className="h-7 flex-1 text-xs"
                    />
                  </div>
                </div>
              )}

              <div>
                <Label>Background</Label>
                <div className="mt-1.5 flex gap-1.5">
                  <Button
                    variant={
                      backgroundColor === "transparent" ? "default" : "outline"
                    }
                    onClick={() => setBackgroundColor("transparent")}
                    size="sm"
                    className="h-7 px-2 text-xs"
                  >
                    None
                  </Button>
                  <button
                    onClick={() => {
                      if (backgroundColor === "transparent") {
                        setBackgroundColor("#FFFFFF");
                      }
                      bgColorInputRef.current?.click();
                    }}
                    className="h-7 w-8 cursor-pointer rounded border-2 border-zinc-300 shadow-sm transition-transform hover:scale-105 dark:border-zinc-700"
                    style={{
                      backgroundColor:
                        backgroundColor === "transparent"
                          ? "#F0F0F0"
                          : backgroundColor,
                      backgroundImage:
                        backgroundColor === "transparent"
                          ? "repeating-conic-gradient(#E5E7EB 0% 25%, white 0% 50%) 50% / 10px 10px"
                          : "none",
                    }}
                    title="Click to pick color"
                  />
                  <input
                    ref={bgColorInputRef}
                    type="color"
                    value={
                      backgroundColor === "transparent"
                        ? "#FFFFFF"
                        : backgroundColor
                    }
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="hidden"
                  />
                  <Input
                    value={
                      backgroundColor === "transparent" ? "" : backgroundColor
                    }
                    onChange={(e) =>
                      setBackgroundColor(e.target.value || "transparent")
                    }
                    placeholder="#FFFFFF"
                    className="h-7 flex-1 text-xs"
                  />
                </div>
              </div>

              {/* Decorative Line */}
              <div>
                <Label>Decorative Line</Label>
                <div className="mt-1.5 space-y-2">
                  <div className="flex gap-1.5">
                    <Button
                      variant={showDivider ? "default" : "outline"}
                      onClick={() => setShowDivider(!showDivider)}
                      size="sm"
                      className="h-7 text-xs"
                    >
                      <Minus className="mr-1 h-3 w-3" />
                      {showDivider ? "Enabled" : "Disabled"}
                    </Button>
                    {showDivider && (
                      <>
                        <Button
                          variant={
                            dividerPosition === "above" ? "default" : "outline"
                          }
                          onClick={() => setDividerPosition("above")}
                          size="sm"
                          className="h-7 px-2 text-xs"
                        >
                          Above
                        </Button>
                        <Button
                          variant={
                            dividerPosition === "below" ? "default" : "outline"
                          }
                          onClick={() => setDividerPosition("below")}
                          size="sm"
                          className="h-7 px-2 text-xs"
                        >
                          Below
                        </Button>
                      </>
                    )}
                  </div>
                  {showDivider && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => dividerColorInputRef.current?.click()}
                        className="h-7 w-7 cursor-pointer rounded border-2 border-zinc-300 transition-transform hover:scale-105 dark:border-zinc-700"
                        style={{ backgroundColor: dividerColor }}
                      />
                      <input
                        ref={dividerColorInputRef}
                        type="color"
                        value={dividerColor}
                        onChange={(e) => setDividerColor(e.target.value)}
                        className="hidden"
                      />
                      <Input
                        type="number"
                        value={dividerWidth}
                        onChange={(e) =>
                          setDividerWidth(Number(e.target.value))
                        }
                        min="20"
                        max="200"
                        className="h-7 flex-1 text-xs"
                        placeholder="Width"
                      />
                      <span className="flex items-center text-xs text-zinc-500">
                        px width
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Manual Positioning Controls */}
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Text Position</Label>
                  <div className="mt-1 flex gap-1">
                    <Button
                      onClick={() => setTextOffsetX((prev) => prev - 2)}
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                      title="Move left"
                    >
                      <ArrowLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      onClick={() => setTextOffsetX((prev) => prev + 2)}
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                      title="Move right"
                    >
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                    <Button
                      onClick={() => setTextOffsetY((prev) => prev - 2)}
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                      title="Move up"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      onClick={() => setTextOffsetY((prev) => prev + 2)}
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                      title="Move down"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                    <Button
                      onClick={() => {
                        setTextOffsetX(0);
                        setTextOffsetY(0);
                      }}
                      size="sm"
                      variant="outline"
                      className="ml-1 h-7 px-2 text-xs"
                      title="Reset position"
                    >
                      Reset
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    X: {textOffsetX}px, Y: {textOffsetY}px
                  </p>
                </div>

                {tagline && (
                  <div>
                    <Label className="text-xs">Tagline Position</Label>
                    <div className="mt-1 flex gap-1">
                      <Button
                        onClick={() => setTaglineOffsetX((prev) => prev - 2)}
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0"
                        title="Move left"
                      >
                        <ArrowLeft className="h-3 w-3" />
                      </Button>
                      <Button
                        onClick={() => setTaglineOffsetX((prev) => prev + 2)}
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0"
                        title="Move right"
                      >
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                      <Button
                        onClick={() => setTaglineOffsetY((prev) => prev - 2)}
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0"
                        title="Move up"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        onClick={() => setTaglineOffsetY((prev) => prev + 2)}
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0"
                        title="Move down"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                      <Button
                        onClick={() => {
                          setTaglineOffsetX(0);
                          setTaglineOffsetY(0);
                        }}
                        size="sm"
                        variant="outline"
                        className="ml-1 h-7 px-2 text-xs"
                        title="Reset position"
                      >
                        Reset
                      </Button>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      X: {taglineOffsetX}px, Y: {taglineOffsetY}px
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="-mx-4 border-y border-zinc-200 bg-gradient-to-br from-zinc-50 to-zinc-100 p-6 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-800">
            <div className="flex justify-center">
              <div
                className="rounded-lg p-6"
                style={{
                  backgroundColor:
                    backgroundColor === "transparent"
                      ? "transparent"
                      : backgroundColor,
                  backgroundImage:
                    backgroundColor === "transparent"
                      ? "repeating-conic-gradient(#E5E7EB 0% 25%, white 0% 50%) 50% / 16px 16px"
                      : "none",
                }}
              >
                <div
                  className={`flex ${iconPosition === "top" ? "flex-col" : ""} items-center gap-3`}
                >
                  {includeIcon && iconDataUrl && (
                    <img
                      src={iconDataUrl}
                      alt="Icon"
                      className={`h-10 w-10 ${
                        iconShape === "circle"
                          ? "rounded-full"
                          : iconShape === "rounded"
                            ? "rounded-lg"
                            : ""
                      }`}
                    />
                  )}
                  <div
                    className={`${alignment === "center" ? "text-center" : alignment === "right" ? "text-right" : ""}`}
                  >
                    <div
                      style={{
                        fontFamily: `'${selectedFont}', sans-serif`,
                        fontWeight: fontWeight,
                        color: textColor,
                        fontSize: "28px",
                        lineHeight: "1.2",
                        transform: `translate(${textOffsetX}px, ${textOffsetY}px)`,
                      }}
                    >
                      {text || "Your Brand"}
                    </div>
                    {tagline && (
                      <div
                        style={{
                          fontFamily: `'${selectedFont}', sans-serif`,
                          color: taglineColor,
                          fontSize: "13px",
                          marginTop: "2px",
                          transform: `translate(${taglineOffsetX}px, ${taglineOffsetY}px)`,
                        }}
                      >
                        {tagline}
                      </div>
                    )}
                  </div>
                </div>
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
            onClick={generateLogo}
            disabled={!text}
            size="sm"
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Generate
          </Button>
        </div>
      </div>
    </div>
  );
}
