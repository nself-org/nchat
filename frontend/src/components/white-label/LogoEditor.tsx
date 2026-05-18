"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Undo,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import {
  cropLogo,
  resizeLogo,
  loadImage,
  type ProcessedLogo,
} from "@/lib/white-label/logo-processor";

interface LogoEditorProps {
  src: string;
  onSave: (result: ProcessedLogo) => void;
  onCancel: () => void;
  aspectRatio?: number;
  minOutputSize?: number;
  maxOutputSize?: number;
  className?: string;
}

interface Transform {
  scale: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  offsetX: number;
  offsetY: number;
}

const DEFAULT_TRANSFORM: Transform = {
  scale: 1,
  rotation: 0,
  flipX: false,
  flipY: false,
  offsetX: 0,
  offsetY: 0,
};

export function LogoEditor({
  src,
  onSave,
  onCancel,
  aspectRatio = 1,
  minOutputSize = 100,
  maxOutputSize = 1024,
  className,
}: LogoEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [transform, setTransform] = useState<Transform>(DEFAULT_TRANSFORM);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  // Load image
  useEffect(() => {
    loadImage(src).then(setImage).catch(console.error);
  }, [src]);

  // Draw canvas
  useEffect(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const size = Math.min(canvas.width, canvas.height);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw checkerboard background (transparency indicator)
    const tileSize = 10;
    for (let x = 0; x < canvas.width; x += tileSize) {
      for (let y = 0; y < canvas.height; y += tileSize) {
        ctx.fillStyle = (x + y) % (tileSize * 2) === 0 ? "#f0f0f0" : "#ffffff";
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }

    // Save context
    ctx.save();

    // Move to center
    ctx.translate(canvas.width / 2, canvas.height / 2);

    // Apply transforms
    ctx.rotate((transform.rotation * Math.PI) / 180);
    ctx.scale(
      transform.flipX ? -transform.scale : transform.scale,
      transform.flipY ? -transform.scale : transform.scale,
    );

    // Calculate image dimensions to fit in canvas
    const imgAspect = image.width / image.height;
    let drawWidth: number;
    let drawHeight: number;

    if (imgAspect > 1) {
      drawWidth = size * 0.8;
      drawHeight = drawWidth / imgAspect;
    } else {
      drawHeight = size * 0.8;
      drawWidth = drawHeight * imgAspect;
    }

    // Draw image centered with offset
    ctx.drawImage(
      image,
      -drawWidth / 2 + transform.offsetX,
      -drawHeight / 2 + transform.offsetY,
      drawWidth,
      drawHeight,
    );

    // Restore context
    ctx.restore();

    // Draw crop guide
    ctx.strokeStyle = "rgba(0, 180, 255, 0.8)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    const cropSize = size * 0.9;
    const cropX = (canvas.width - cropSize) / 2;
    const cropY = (canvas.height - cropSize / aspectRatio) / 2;

    ctx.strokeRect(cropX, cropY, cropSize, cropSize / aspectRatio);
  }, [image, transform, aspectRatio]);

  const handleZoomIn = useCallback(() => {
    setTransform((prev) => ({ ...prev, scale: Math.min(prev.scale + 0.1, 3) }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(prev.scale - 0.1, 0.1),
    }));
  }, []);

  const handleRotate = useCallback(() => {
    setTransform((prev) => ({ ...prev, rotation: (prev.rotation + 90) % 360 }));
  }, []);

  const handleFlipX = useCallback(() => {
    setTransform((prev) => ({ ...prev, flipX: !prev.flipX }));
  }, []);

  const handleFlipY = useCallback(() => {
    setTransform((prev) => ({ ...prev, flipY: !prev.flipY }));
  }, []);

  const handleReset = useCallback(() => {
    setTransform(DEFAULT_TRANSFORM);
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - transform.offsetX,
        y: e.clientY - transform.offsetY,
      });
    },
    [transform.offsetX, transform.offsetY],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setTransform((prev) => ({
        ...prev,
        offsetX: e.clientX - dragStart.x,
        offsetY: e.clientY - dragStart.y,
      }));
    },
    [isDragging, dragStart],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!canvasRef.current || !image) return;

    setIsProcessing(true);
    try {
      const canvas = canvasRef.current;
      const size = Math.min(canvas.width, canvas.height);
      const cropSize = size * 0.9;

      // Create output canvas
      const outputCanvas = document.createElement("canvas");
      const outputSize = Math.min(
        Math.max(cropSize, minOutputSize),
        maxOutputSize,
      );
      outputCanvas.width = outputSize;
      outputCanvas.height = outputSize / aspectRatio;

      const outputCtx = outputCanvas.getContext("2d")!;

      // Draw from main canvas
      const cropX = (canvas.width - cropSize) / 2;
      const cropY = (canvas.height - cropSize / aspectRatio) / 2;

      outputCtx.drawImage(
        canvas,
        cropX,
        cropY,
        cropSize,
        cropSize / aspectRatio,
        0,
        0,
        outputCanvas.width,
        outputCanvas.height,
      );

      const result: ProcessedLogo = {
        dataUrl: outputCanvas.toDataURL("image/png"),
        width: outputCanvas.width,
        height: outputCanvas.height,
        format: "png",
      };

      onSave(result);
    } catch (error) {
      logger.error("Failed to save logo:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [image, onSave, aspectRatio, minOutputSize, maxOutputSize]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Canvas */}
      <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="w-full cursor-move"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleZoomOut}
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleZoomIn}
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <div className="mx-1 h-6 w-px bg-zinc-200 dark:bg-zinc-700" />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleRotate}
          title="Rotate 90 degrees"
        >
          <RotateCw className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleFlipX}
          title="Flip horizontal"
        >
          <FlipHorizontal className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleFlipY}
          title="Flip vertical"
        >
          <FlipVertical className="h-4 w-4" />
        </Button>
        <div className="mx-1 h-6 w-px bg-zinc-200 dark:bg-zinc-700" />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleReset}
          title="Reset"
        >
          <Undo className="h-4 w-4" />
        </Button>
      </div>

      {/* Zoom indicator */}
      <div className="text-center text-sm text-zinc-500">
        Zoom: {Math.round(transform.scale * 100)}%
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={isProcessing}
        >
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          className="flex-1"
          disabled={isProcessing}
        >
          <Check className="mr-2 h-4 w-4" />
          {isProcessing ? "Processing..." : "Apply"}
        </Button>
      </div>
    </div>
  );
}
