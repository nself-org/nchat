"use client";

/**
 * Screen Share Overlay Component
 *
 * Provides annotation toolbar overlay on top of screen share.
 * Includes drawing tools, color picker, and control buttons.
 */

import * as React from "react";
import { useRef, useEffect, useState } from "react";
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
  Undo,
  Redo,
  Trash2,
  Palette,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import { useAnnotations } from "@/hooks/use-annotations";
import type { AnnotationTool } from "@/lib/webrtc/screen-annotator";

// =============================================================================
// Types
// =============================================================================

export interface ScreenShareOverlayProps {
  /** Video element displaying the screen share */
  videoElement: HTMLVideoElement | null;
  /** User ID for annotations */
  userId: string;
  /** User name for annotations */
  userName: string;
  /** Whether overlay is enabled */
  enabled?: boolean;
  /** Callback when annotation is added */
  onAnnotationAdded?: (annotation: any) => void;
  /** Callback when overlay is closed */
  onClose?: () => void;
  /** Additional class name */
  className?: string;
}

// =============================================================================
// Tool Button Component
// =============================================================================

interface ToolButtonProps {
  tool: AnnotationTool;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function ToolButton({ tool, icon, label, active, onClick }: ToolButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={active ? "default" : "ghost"}
            size="icon"
            onClick={onClick}
            className={cn(
              "h-8 w-8",
              active && "text-primary-foreground bg-primary",
            )}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// =============================================================================
// Component
// =============================================================================

export function ScreenShareOverlay({
  videoElement,
  userId,
  userName,
  enabled = true,
  onAnnotationAdded,
  onClose,
  className,
}: ScreenShareOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const annotations = useAnnotations({
    canvas: canvasRef.current,
    userId,
    userName,
    onAnnotationAdded,
    enabled,
  });

  // ==========================================================================
  // Resize Canvas to Match Video
  // ==========================================================================

  useEffect(() => {
    if (!canvasRef.current || !videoElement || !containerRef.current) return;

    const resizeCanvas = () => {
      const canvas = canvasRef.current!;
      const container = containerRef.current!;
      const video = videoElement;

      // Match video dimensions
      canvas.width = video.videoWidth || container.clientWidth;
      canvas.height = video.videoHeight || container.clientHeight;
    };

    // Initial resize
    resizeCanvas();

    // Resize on video metadata loaded
    videoElement.addEventListener("loadedmetadata", resizeCanvas);

    // Resize on window resize
    window.addEventListener("resize", resizeCanvas);

    return () => {
      videoElement.removeEventListener("loadedmetadata", resizeCanvas);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [videoElement]);

  // ==========================================================================
  // Tools Configuration
  // ==========================================================================

  const tools: Array<{
    tool: AnnotationTool;
    icon: React.ReactNode;
    label: string;
  }> = [
    { tool: "pen", icon: <Pen className="h-4 w-4" />, label: "Pen" },
    { tool: "arrow", icon: <ArrowRight className="h-4 w-4" />, label: "Arrow" },
    { tool: "line", icon: <Minus className="h-4 w-4" />, label: "Line" },
    {
      tool: "rectangle",
      icon: <Square className="h-4 w-4" />,
      label: "Rectangle",
    },
    { tool: "circle", icon: <Circle className="h-4 w-4" />, label: "Circle" },
    { tool: "text", icon: <Type className="h-4 w-4" />, label: "Text" },
    { tool: "eraser", icon: <Eraser className="h-4 w-4" />, label: "Eraser" },
  ];

  // ==========================================================================
  // Render
  // ==========================================================================

  if (!enabled) return null;

  return (
    <div
      ref={containerRef}
      className={cn("pointer-events-none absolute inset-0", className)}
    >
      {/* Canvas Overlay */}
      <canvas
        ref={canvasRef}
        className="pointer-events-auto absolute inset-0 h-full w-full cursor-crosshair"
        style={{ touchAction: "none" }}
      />

      {/* Toolbar */}
      <div className="pointer-events-auto absolute left-1/2 top-4 -translate-x-1/2">
        <div
          className={cn(
            "bg-background/95 rounded-lg border shadow-lg backdrop-blur-sm transition-all",
            isMinimized ? "p-2" : "p-3",
          )}
        >
          {/* Header */}
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-sm font-medium">Annotation Tools</div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-6 w-6"
              >
                {isMinimized ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronUp className="h-3 w-3" />
                )}
              </Button>
              {onClose && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-6 w-6"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Tools (when not minimized) */}
          {!isMinimized && (
            <>
              {/* Drawing Tools */}
              <div className="mb-2 flex items-center gap-1">
                {tools.map(({ tool, icon, label }) => (
                  <ToolButton
                    key={tool}
                    tool={tool}
                    icon={icon}
                    label={label}
                    active={annotations.currentTool === tool}
                    onClick={() => annotations.setTool(tool)}
                  />
                ))}
              </div>

              {/* Color and Stroke */}
              <div className="mb-2 flex items-center gap-2">
                {/* Color Picker Button */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="h-8 w-8"
                        style={{
                          backgroundColor: annotations.currentColor,
                          border: "2px solid #ccc",
                        }}
                      >
                        <Palette className="h-4 w-4" style={{ opacity: 0.5 }} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Color Picker</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Stroke Width Slider */}
                <div className="flex min-w-32 items-center gap-2">
                  <span className="text-xs text-muted-foreground">Size:</span>
                  <Slider
                    value={[annotations.currentStrokeWidth]}
                    onValueChange={(value) =>
                      annotations.setStrokeWidth(value[0])
                    }
                    min={2}
                    max={16}
                    step={2}
                    className="flex-1"
                  />
                  <span className="w-6 text-right text-xs text-muted-foreground">
                    {annotations.currentStrokeWidth}
                  </span>
                </div>
              </div>

              {/* Color Palette (when open) */}
              {showColorPicker && (
                <div className="mb-2 grid grid-cols-5 gap-1 rounded border p-2">
                  {annotations.availableColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        annotations.setColor(color);
                        setShowColorPicker(false);
                      }}
                      className={cn(
                        "h-8 w-8 rounded border-2 transition-transform hover:scale-110",
                        annotations.currentColor === color
                          ? "border-primary ring-2 ring-primary"
                          : "border-gray-300",
                      )}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                  {/* Custom color input */}
                  <input
                    type="color"
                    value={annotations.currentColor}
                    onChange={(e) => annotations.setColor(e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded border-2 border-gray-300"
                    title="Custom color"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={annotations.undo}
                        disabled={!annotations.canUndo}
                        className="h-8 w-8"
                      >
                        <Undo className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Undo (Ctrl+Z)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={annotations.redo}
                        disabled={!annotations.canRedo}
                        className="h-8 w-8"
                      >
                        <Redo className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Redo (Ctrl+Y)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <div className="flex-1" />

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={annotations.clear}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Clear All</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Info */}
              <div className="mt-2 text-center text-xs text-muted-foreground">
                {annotations.annotations.length} annotation
                {annotations.annotations.length !== 1 ? "s" : ""}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
