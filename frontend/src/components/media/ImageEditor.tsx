"use client";

/**
 * ImageEditor Component
 * Provides crop, rotate, and filter functionality for images
 */

import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  RotateCw,
  RotateCcw,
  Crop,
  Palette,
  Download,
  X,
  ZoomIn,
  ZoomOut,
  Move,
} from "lucide-react";
import {
  cropImage,
  rotateImage,
  flipImage,
  type CropArea,
} from "@/lib/media/image-processor";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface ImageEditorProps {
  imageUrl: string;
  imageFile?: File | Blob;
  onSave?: (blob: Blob) => void;
  onCancel?: () => void;
  aspectRatio?: number;
  className?: string;
}

interface ImageFilters {
  brightness: number;
  contrast: number;
  saturation: number;
  grayscale: number;
  sepia: number;
  blur: number;
}

interface CropState {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================================================
// Component
// ============================================================================

export function ImageEditor({
  imageUrl,
  imageFile,
  onSave,
  onCancel,
  aspectRatio,
  className,
}: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [mode, setMode] = useState<"crop" | "rotate" | "filter">("crop");
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);
  const [cropArea, setCropArea] = useState<CropState>({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [filters, setFilters] = useState<ImageFilters>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    grayscale: 0,
    sepia: 0,
    blur: 0,
  });

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      initializeCrop(img);
      redraw();
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Redraw canvas when state changes
  useEffect(() => {
    redraw();
  }, [rotation, scale, filters, cropArea]);

  /**
   * Initialize crop area
   */
  const initializeCrop = (img: HTMLImageElement) => {
    const maxWidth = 800;
    const maxHeight = 600;
    const scaleFactor = Math.min(
      maxWidth / img.width,
      maxHeight / img.height,
      1,
    );

    const displayWidth = img.width * scaleFactor;
    const displayHeight = img.height * scaleFactor;

    setCropArea({
      x: 0,
      y: 0,
      width: displayWidth,
      height: displayHeight,
    });
  };

  /**
   * Redraw canvas
   */
  const redraw = useCallback(() => {
    if (!canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imageRef.current;

    canvas.width = img.width;
    canvas.height = img.height;

    ctx.save();

    // Apply filters
    const filterString = [
      `brightness(${filters.brightness}%)`,
      `contrast(${filters.contrast}%)`,
      `saturate(${filters.saturation}%)`,
      `grayscale(${filters.grayscale}%)`,
      `sepia(${filters.sepia}%)`,
      filters.blur > 0 ? `blur(${filters.blur}px)` : "",
    ]
      .filter(Boolean)
      .join(" ");

    ctx.filter = filterString;

    // Apply rotation
    if (rotation !== 0) {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
    }

    // Draw image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    ctx.restore();
  }, [filters, rotation]);

  /**
   * Handle rotate left
   */
  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90) % 360);
  };

  /**
   * Handle rotate right
   */
  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  /**
   * Handle crop
   */
  const handleCrop = async () => {
    if (!imageFile) return;

    const cropData: CropArea = {
      x: cropArea.x,
      y: cropArea.y,
      width: cropArea.width,
      height: cropArea.height,
    };

    try {
      const croppedBlob = await cropImage(imageFile, cropData);
      onSave?.(croppedBlob);
    } catch (error) {
      logger.error("Failed to crop image:", error);
    }
  };

  /**
   * Handle save
   */
  const handleSave = async () => {
    if (!canvasRef.current) return;

    canvasRef.current.toBlob(
      (blob) => {
        if (blob) {
          onSave?.(blob);
        }
      },
      "image/jpeg",
      0.9,
    );
  };

  /**
   * Reset filters
   */
  const resetFilters = () => {
    setFilters({
      brightness: 100,
      contrast: 100,
      saturation: 100,
      grayscale: 0,
      sepia: 0,
      blur: 0,
    });
  };

  /**
   * Mouse handlers for crop drag
   */
  const handleMouseDown = (e: React.MouseEvent) => {
    if (mode !== "crop") return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || mode !== "crop") return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    setCropArea((prev) => ({
      ...prev,
      x: Math.max(0, prev.x + deltaX),
      y: Math.max(0, prev.y + deltaY),
    }));

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className={cn("flex h-full flex-col bg-background", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-lg font-semibold">Edit Image</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Download className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>
      </div>

      {/* Canvas and Controls */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas Area */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Application role manages own interaction */}
        <div
          ref={containerRef}
          role="application"
          aria-label="Image editor canvas"
          className="flex flex-1 items-center justify-center bg-muted p-8"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="max-h-[600px] max-w-[800px] shadow-lg"
              style={{
                transform: `scale(${scale})`,
                cursor: mode === "crop" ? "move" : "default",
              }}
            />

            {/* Crop overlay */}
            {mode === "crop" && (
              <div
                className="pointer-events-none absolute border-2 border-dashed border-primary"
                style={{
                  left: cropArea.x,
                  top: cropArea.y,
                  width: cropArea.width,
                  height: cropArea.height,
                }}
              />
            )}
          </div>
        </div>

        {/* Tools Panel */}
        <div className="w-80 border-l bg-card p-4">
          <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="crop">
                <Crop className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="rotate">
                <RotateCw className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="filter">
                <Palette className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>

            {/* Crop Tools */}
            <TabsContent value="crop" className="space-y-4">
              <div>
                <h3 className="mb-2 font-medium">Crop</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Drag to move the crop area
                </p>
                <div className="space-y-2">
                  <Button className="w-full" onClick={handleCrop}>
                    Apply Crop
                  </Button>
                </div>
              </div>

              <div>
                <span className="mb-2 block text-sm font-medium">Zoom</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Slider
                    value={[scale]}
                    min={0.5}
                    max={3}
                    step={0.1}
                    onValueChange={([v]) => setScale(v)}
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setScale((s) => Math.min(3, s + 0.1))}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Rotate Tools */}
            <TabsContent value="rotate" className="space-y-4">
              <div>
                <h3 className="mb-2 font-medium">Rotate</h3>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={handleRotateLeft}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Left 90°
                  </Button>
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={handleRotateRight}
                  >
                    <RotateCw className="mr-2 h-4 w-4" />
                    Right 90°
                  </Button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Rotation: {rotation}°
                </label>
                <Slider
                  value={[rotation]}
                  min={0}
                  max={360}
                  step={1}
                  onValueChange={([v]) => setRotation(v)}
                />
              </div>
            </TabsContent>

            {/* Filter Tools */}
            <TabsContent value="filter" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Brightness: {filters.brightness}%
                  </label>
                  <Slider
                    value={[filters.brightness]}
                    min={0}
                    max={200}
                    step={1}
                    onValueChange={([v]) =>
                      setFilters((f) => ({ ...f, brightness: v }))
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Contrast: {filters.contrast}%
                  </label>
                  <Slider
                    value={[filters.contrast]}
                    min={0}
                    max={200}
                    step={1}
                    onValueChange={([v]) =>
                      setFilters((f) => ({ ...f, contrast: v }))
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Saturation: {filters.saturation}%
                  </label>
                  <Slider
                    value={[filters.saturation]}
                    min={0}
                    max={200}
                    step={1}
                    onValueChange={([v]) =>
                      setFilters((f) => ({ ...f, saturation: v }))
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Grayscale: {filters.grayscale}%
                  </label>
                  <Slider
                    value={[filters.grayscale]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={([v]) =>
                      setFilters((f) => ({ ...f, grayscale: v }))
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Sepia: {filters.sepia}%
                  </label>
                  <Slider
                    value={[filters.sepia]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={([v]) =>
                      setFilters((f) => ({ ...f, sepia: v }))
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Blur: {filters.blur}px
                  </label>
                  <Slider
                    value={[filters.blur]}
                    min={0}
                    max={10}
                    step={0.5}
                    onValueChange={([v]) =>
                      setFilters((f) => ({ ...f, blur: v }))
                    }
                  />
                </div>

                <Button
                  className="w-full"
                  variant="outline"
                  onClick={resetFilters}
                >
                  Reset Filters
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default ImageEditor;
