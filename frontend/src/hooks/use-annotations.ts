"use client";

/**
 * Annotations Hook
 *
 * Provides annotation tools for screen sharing.
 * Supports drawing, shapes, text, and collaborative annotations.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "@/lib/logger";
import {
  ScreenAnnotator,
  createScreenAnnotator,
  type AnnotationTool,
  type AnnotationColor,
  type Annotation,
  type DrawingState,
  DEFAULT_COLORS,
  DEFAULT_STROKE_WIDTHS,
  DEFAULT_FONT_SIZES,
} from "@/lib/webrtc/screen-annotator";

// =============================================================================
// Types
// =============================================================================

export interface UseAnnotationsOptions {
  canvas: HTMLCanvasElement | null;
  userId: string;
  userName: string;
  onAnnotationAdded?: (annotation: Annotation) => void;
  onAnnotationsCleared?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  enabled?: boolean;
}

export interface UseAnnotationsReturn {
  // State
  isEnabled: boolean;
  currentTool: AnnotationTool;
  currentColor: AnnotationColor;
  currentStrokeWidth: number;
  currentFontSize: number;
  isFilled: boolean;
  annotations: Annotation[];
  canUndo: boolean;
  canRedo: boolean;

  // Actions
  setTool: (tool: AnnotationTool) => void;
  setColor: (color: AnnotationColor) => void;
  setStrokeWidth: (width: number) => void;
  setFontSize: (size: number) => void;
  setFilled: (filled: boolean) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  addRemoteAnnotation: (annotation: Annotation) => void;

  // State management
  enable: () => void;
  disable: () => void;

  // Constants
  availableColors: AnnotationColor[];
  availableStrokeWidths: number[];
  availableFontSizes: number[];
}

// =============================================================================
// Hook
// =============================================================================

export function useAnnotations(
  options: UseAnnotationsOptions,
): UseAnnotationsReturn {
  const {
    canvas,
    userId,
    userName,
    onAnnotationAdded,
    onAnnotationsCleared,
    onUndo,
    onRedo,
    enabled = true,
  } = options;

  // State
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [currentState, setCurrentState] = useState<DrawingState>({
    tool: "pen",
    color: DEFAULT_COLORS[0],
    strokeWidth: 4,
    fontSize: 20,
    fontFamily: "Arial, sans-serif",
    filled: false,
  });
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [undoStackSize, setUndoStackSize] = useState(0);

  // Refs
  const annotatorRef = useRef<ScreenAnnotator | null>(null);

  // Derived state
  const canUndo = annotations.length > 0;
  const canRedo = undoStackSize > 0;

  // ==========================================================================
  // Initialize Annotator
  // ==========================================================================

  useEffect(() => {
    if (!canvas || !isEnabled) {
      // Cleanup if disabled or no canvas
      if (annotatorRef.current) {
        annotatorRef.current.cleanup();
        annotatorRef.current = null;
      }
      return;
    }

    try {
      // Create annotator
      annotatorRef.current = createScreenAnnotator({
        canvas,
        userId,
        userName,
        onAnnotationAdded: (annotation) => {
          setAnnotations((prev) => [...prev, annotation]);
          setUndoStackSize(0); // Clear redo stack
          onAnnotationAdded?.(annotation);
        },
        onAnnotationsCleared: () => {
          setAnnotations([]);
          setUndoStackSize(0);
          onAnnotationsCleared?.();
        },
        onUndo: () => {
          setAnnotations((prev) => prev.slice(0, -1));
          setUndoStackSize((prev) => prev + 1);
          onUndo?.();
        },
        onRedo: () => {
          // Redo will add annotation back via onAnnotationAdded
          setUndoStackSize((prev) => Math.max(0, prev - 1));
          onRedo?.();
        },
      });

      // Set initial state
      annotatorRef.current.setTool(currentState.tool);
      annotatorRef.current.setColor(currentState.color);
      annotatorRef.current.setStrokeWidth(currentState.strokeWidth);
      annotatorRef.current.setFontSize(currentState.fontSize);
      annotatorRef.current.setFilled(currentState.filled);

      return () => {
        annotatorRef.current?.cleanup();
        annotatorRef.current = null;
      };
    } catch (error) {
      logger.error("Failed to initialize annotator:", error);
    }
  }, [
    canvas,
    userId,
    userName,
    isEnabled,
    onAnnotationAdded,
    onAnnotationsCleared,
    onUndo,
    onRedo,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  // ==========================================================================
  // Set Tool
  // ==========================================================================

  const setTool = useCallback((tool: AnnotationTool): void => {
    setCurrentState((prev) => ({ ...prev, tool }));
    annotatorRef.current?.setTool(tool);
  }, []);

  // ==========================================================================
  // Set Color
  // ==========================================================================

  const setColor = useCallback((color: AnnotationColor): void => {
    setCurrentState((prev) => ({ ...prev, color }));
    annotatorRef.current?.setColor(color);
  }, []);

  // ==========================================================================
  // Set Stroke Width
  // ==========================================================================

  const setStrokeWidth = useCallback((width: number): void => {
    setCurrentState((prev) => ({ ...prev, strokeWidth: width }));
    annotatorRef.current?.setStrokeWidth(width);
  }, []);

  // ==========================================================================
  // Set Font Size
  // ==========================================================================

  const setFontSize = useCallback((size: number): void => {
    setCurrentState((prev) => ({ ...prev, fontSize: size }));
    annotatorRef.current?.setFontSize(size);
  }, []);

  // ==========================================================================
  // Set Filled
  // ==========================================================================

  const setFilled = useCallback((filled: boolean): void => {
    setCurrentState((prev) => ({ ...prev, filled }));
    annotatorRef.current?.setFilled(filled);
  }, []);

  // ==========================================================================
  // Undo
  // ==========================================================================

  const undo = useCallback((): void => {
    annotatorRef.current?.undo();
  }, []);

  // ==========================================================================
  // Redo
  // ==========================================================================

  const redo = useCallback((): void => {
    annotatorRef.current?.redo();
  }, []);

  // ==========================================================================
  // Clear
  // ==========================================================================

  const clear = useCallback((): void => {
    annotatorRef.current?.clear();
  }, []);

  // ==========================================================================
  // Add Remote Annotation
  // ==========================================================================

  const addRemoteAnnotation = useCallback((annotation: Annotation): void => {
    annotatorRef.current?.addRemoteAnnotation(annotation);
    setAnnotations((prev) => [...prev, annotation]);
  }, []);

  // ==========================================================================
  // Enable/Disable
  // ==========================================================================

  const enable = useCallback((): void => {
    setIsEnabled(true);
  }, []);

  const disable = useCallback((): void => {
    setIsEnabled(false);
  }, []);

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // State
    isEnabled,
    currentTool: currentState.tool,
    currentColor: currentState.color,
    currentStrokeWidth: currentState.strokeWidth,
    currentFontSize: currentState.fontSize,
    isFilled: currentState.filled,
    annotations,
    canUndo,
    canRedo,

    // Actions
    setTool,
    setColor,
    setStrokeWidth,
    setFontSize,
    setFilled,
    undo,
    redo,
    clear,
    addRemoteAnnotation,

    // State management
    enable,
    disable,

    // Constants
    availableColors: DEFAULT_COLORS,
    availableStrokeWidths: DEFAULT_STROKE_WIDTHS,
    availableFontSizes: DEFAULT_FONT_SIZES,
  };
}
