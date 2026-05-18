/**
 * Annotation Toolbar Component
 *
 * Provides drawing tools for screen share annotations.
 * Supports pen, shapes, text, eraser, and color selection.
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Pen,
  ArrowRight,
  Minus,
  Square,
  Circle,
  Type,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Palette,
  Settings,
} from "lucide-react";
import type {
  AnnotationTool,
  AnnotationColor,
} from "@/lib/webrtc/screen-annotator";
import {
  DEFAULT_COLORS,
  DEFAULT_STROKE_WIDTHS,
} from "@/lib/webrtc/screen-annotator";

// =============================================================================
// Types
// =============================================================================

export interface AnnotationToolbarProps {
  selectedTool: AnnotationTool;
  selectedColor: AnnotationColor;
  strokeWidth: number;
  onToolChange: (tool: AnnotationTool) => void;
  onColorChange: (color: AnnotationColor) => void;
  onStrokeWidthChange: (width: number) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onClear?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  className?: string;
  orientation?: "horizontal" | "vertical";
}

// =============================================================================
// Tool Button Component
// =============================================================================

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function ToolButton({
  icon,
  label,
  isActive,
  onClick,
  disabled,
}: ToolButtonProps) {
  return (
    <Button
      type="button"
      size="icon"
      variant={isActive ? "secondary" : "ghost"}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "h-9 w-9",
        isActive && "text-primary-foreground hover:bg-primary/90 bg-primary",
      )}
    >
      {icon}
    </Button>
  );
}

// =============================================================================
// Component
// =============================================================================

export function AnnotationToolbar({
  selectedTool,
  selectedColor,
  strokeWidth,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onUndo,
  onRedo,
  onClear,
  canUndo = false,
  canRedo = false,
  className,
  orientation = "vertical",
}: AnnotationToolbarProps) {
  const [showColorPicker, setShowColorPicker] = React.useState(false);
  const [showStrokePicker, setShowStrokePicker] = React.useState(false);

  const iconSize = 18;

  return (
    <div
      className={cn(
        "flex gap-1 rounded-lg bg-black/70 p-2 backdrop-blur-sm",
        orientation === "vertical" ? "flex-col" : "flex-row items-center",
        className,
      )}
    >
      {/* Drawing Tools */}
      <div
        className={cn(
          "flex gap-1",
          orientation === "vertical" ? "flex-col" : "flex-row",
        )}
      >
        <ToolButton
          icon={<Pen size={iconSize} />}
          label="Pen"
          isActive={selectedTool === "pen"}
          onClick={() => onToolChange("pen")}
        />
        <ToolButton
          icon={<ArrowRight size={iconSize} />}
          label="Arrow"
          isActive={selectedTool === "arrow"}
          onClick={() => onToolChange("arrow")}
        />
        <ToolButton
          icon={<Minus size={iconSize} />}
          label="Line"
          isActive={selectedTool === "line"}
          onClick={() => onToolChange("line")}
        />
        <ToolButton
          icon={<Square size={iconSize} />}
          label="Rectangle"
          isActive={selectedTool === "rectangle"}
          onClick={() => onToolChange("rectangle")}
        />
        <ToolButton
          icon={<Circle size={iconSize} />}
          label="Circle"
          isActive={selectedTool === "circle"}
          onClick={() => onToolChange("circle")}
        />
        <ToolButton
          icon={<Type size={iconSize} />}
          label="Text"
          isActive={selectedTool === "text"}
          onClick={() => onToolChange("text")}
        />
        <ToolButton
          icon={<Eraser size={iconSize} />}
          label="Eraser"
          isActive={selectedTool === "eraser"}
          onClick={() => onToolChange("eraser")}
        />
      </div>

      {/* Divider */}
      <div
        className={cn(
          "bg-white/20",
          orientation === "vertical" ? "h-px w-full" : "h-6 w-px",
        )}
      />

      {/* Style Controls */}
      <div
        className={cn(
          "flex gap-1",
          orientation === "vertical" ? "flex-col" : "flex-row",
        )}
      >
        {/* Color Picker */}
        <div className="relative">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="relative h-9 w-9"
            aria-label="Choose color"
            title="Choose color"
          >
            <div
              className="h-5 w-5 rounded border-2 border-white"
              style={{ backgroundColor: selectedColor }}
            />
          </Button>
          {showColorPicker && (
            <div
              className={cn(
                "absolute z-10 rounded-lg bg-black/90 p-2 shadow-lg backdrop-blur-sm",
                orientation === "vertical"
                  ? "left-full top-0 ml-2"
                  : "bottom-full left-0 mb-2",
              )}
            >
              <div className="grid grid-cols-5 gap-1">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      onColorChange(color);
                      setShowColorPicker(false);
                    }}
                    className={cn(
                      "h-7 w-7 rounded border-2 transition-transform hover:scale-110",
                      selectedColor === color
                        ? "border-white"
                        : "border-transparent",
                    )}
                    style={{ backgroundColor: color }}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stroke Width Picker */}
        <div className="relative">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setShowStrokePicker(!showStrokePicker)}
            className="h-9 w-9"
            aria-label="Stroke width"
            title="Stroke width"
          >
            <Settings size={iconSize} />
          </Button>
          {showStrokePicker && (
            <div
              className={cn(
                "absolute z-10 rounded-lg bg-black/90 p-2 shadow-lg backdrop-blur-sm",
                orientation === "vertical"
                  ? "left-full top-0 ml-2"
                  : "bottom-full left-0 mb-2",
              )}
            >
              <div className="flex flex-col gap-2">
                {DEFAULT_STROKE_WIDTHS.map((width) => (
                  <button
                    key={width}
                    type="button"
                    onClick={() => {
                      onStrokeWidthChange(width);
                      setShowStrokePicker(false);
                    }}
                    className={cn(
                      "flex h-8 items-center justify-center rounded px-3 hover:bg-white/10",
                      strokeWidth === width && "bg-white/20",
                    )}
                  >
                    <div
                      className="rounded-full bg-white"
                      style={{ width: `${width}px`, height: `${width}px` }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div
        className={cn(
          "bg-white/20",
          orientation === "vertical" ? "h-px w-full" : "h-6 w-px",
        )}
      />

      {/* Action Buttons */}
      <div
        className={cn(
          "flex gap-1",
          orientation === "vertical" ? "flex-col" : "flex-row",
        )}
      >
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onUndo}
          disabled={!canUndo || !onUndo}
          className="h-9 w-9"
          aria-label="Undo"
          title="Undo"
        >
          <Undo2 size={iconSize} />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onRedo}
          disabled={!canRedo || !onRedo}
          className="h-9 w-9"
          aria-label="Redo"
          title="Redo"
        >
          <Redo2 size={iconSize} />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onClear}
          disabled={!onClear}
          className="h-9 w-9"
          aria-label="Clear all"
          title="Clear all"
        >
          <Trash2 size={iconSize} />
        </Button>
      </div>
    </div>
  );
}
