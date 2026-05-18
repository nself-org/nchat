/**
 * Use Background Effects Hook
 *
 * Manages background blur and virtual backgrounds for video streams.
 */

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  BackgroundBlur,
  createBackgroundBlur,
  type BlurStrength,
} from "@/lib/calls/background-blur";
import {
  VirtualBackground,
  createVirtualBackground,
  type BackgroundType,
  type BackgroundImage,
  PRESET_BACKGROUNDS,
  PRESET_COLORS,
} from "@/lib/calls/virtual-background";

// =============================================================================
// Types
// =============================================================================

export type EffectType = "none" | "blur" | "virtual";

export interface UseBackgroundEffectsOptions {
  onError?: (error: Error) => void;
}

export interface UseBackgroundEffectsReturn {
  // State
  effectType: EffectType;
  blurStrength: BlurStrength;
  virtualBackgroundType: BackgroundType;
  virtualBackgroundSource: string | null;
  isProcessing: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  setEffectType: (type: EffectType) => void;
  setBlurStrength: (strength: BlurStrength) => void;
  setVirtualBackground: (
    type: BackgroundType,
    source?: string,
  ) => Promise<void>;
  applyToStream: (stream: MediaStream) => Promise<MediaStream>;
  stopProcessing: () => void;

  // Presets
  presetBackgrounds: BackgroundImage[];
  presetColors: Array<{ id: string; name: string; color: string }>;
  selectPresetBackground: (id: string) => Promise<void>;
  selectPresetColor: (id: string) => void;
}

// =============================================================================
// Hook
// =============================================================================

export function useBackgroundEffects(
  options: UseBackgroundEffectsOptions = {},
): UseBackgroundEffectsReturn {
  const { onError } = options;

  const [effectType, setEffectTypeState] = useState<EffectType>("none");
  const [blurStrength, setBlurStrengthState] = useState<BlurStrength>("medium");
  const [virtualBackgroundType, setVirtualBackgroundType] =
    useState<BackgroundType>("color");
  const [virtualBackgroundSource, setVirtualBackgroundSource] = useState<
    string | null
  >("#1f2937");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backgroundBlurRef = useRef<BackgroundBlur | null>(null);
  const virtualBackgroundRef = useRef<VirtualBackground | null>(null);
  const processedStreamRef = useRef<MediaStream | null>(null);

  // ===========================================================================
  // Initialization
  // ===========================================================================

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (backgroundBlurRef.current) {
        backgroundBlurRef.current.cleanup();
      }
      if (virtualBackgroundRef.current) {
        virtualBackgroundRef.current.cleanup();
      }
      if (processedStreamRef.current) {
        processedStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // ===========================================================================
  // Effect Management
  // ===========================================================================

  const setEffectType = useCallback((type: EffectType) => {
    setEffectTypeState(type);
    setError(null);
  }, []);

  const setBlurStrength = useCallback((strength: BlurStrength) => {
    setBlurStrengthState(strength);
    if (backgroundBlurRef.current) {
      backgroundBlurRef.current.setStrength(strength);
    }
  }, []);

  const setVirtualBackground = useCallback(
    async (type: BackgroundType, source?: string): Promise<void> => {
      setVirtualBackgroundType(type);
      setVirtualBackgroundSource(source || null);

      if (virtualBackgroundRef.current) {
        try {
          await virtualBackgroundRef.current.setBackground(type, source);
        } catch (err) {
          const error =
            err instanceof Error ? err : new Error("Failed to set background");
          setError(error.message);
          onError?.(error);
        }
      }
    },
    [onError],
  );

  // ===========================================================================
  // Stream Processing
  // ===========================================================================

  const applyToStream = useCallback(
    async (stream: MediaStream): Promise<MediaStream> => {
      setError(null);

      // If no effect, return original stream
      if (effectType === "none") {
        return stream;
      }

      try {
        setIsProcessing(true);

        let processedStream: MediaStream;

        if (effectType === "blur") {
          // Initialize blur if needed
          if (!backgroundBlurRef.current) {
            backgroundBlurRef.current = createBackgroundBlur({
              strength: blurStrength,
            });
          }

          // Initialize model
          if (!isInitialized) {
            await backgroundBlurRef.current.initialize();
            setIsInitialized(true);
          }

          // Process stream
          processedStream =
            await backgroundBlurRef.current.processStream(stream);
        } else if (effectType === "virtual") {
          // Initialize virtual background if needed
          if (!virtualBackgroundRef.current) {
            virtualBackgroundRef.current = createVirtualBackground({
              type: virtualBackgroundType,
              source: virtualBackgroundSource || undefined,
            });
          }

          // Initialize model
          if (!isInitialized) {
            await virtualBackgroundRef.current.initialize();
            setIsInitialized(true);
          }

          // Process stream
          processedStream =
            await virtualBackgroundRef.current.processStream(stream);
        } else {
          processedStream = stream;
        }

        // Stop previous processed stream
        if (processedStreamRef.current) {
          processedStreamRef.current.getTracks().forEach((track) => {
            if (track.kind === "video") track.stop();
          });
        }

        processedStreamRef.current = processedStream;
        return processedStream;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to apply effect");
        setError(error.message);
        onError?.(error);
        return stream; // Return original stream on error
      } finally {
        setIsProcessing(false);
      }
    },
    [
      effectType,
      blurStrength,
      virtualBackgroundType,
      virtualBackgroundSource,
      isInitialized,
      onError,
    ],
  );

  const stopProcessing = useCallback(() => {
    if (backgroundBlurRef.current) {
      backgroundBlurRef.current.stopProcessing();
    }
    if (virtualBackgroundRef.current) {
      virtualBackgroundRef.current.stopProcessing();
    }
    if (processedStreamRef.current) {
      processedStreamRef.current.getTracks().forEach((track) => {
        if (track.kind === "video") track.stop();
      });
      processedStreamRef.current = null;
    }
    setIsProcessing(false);
  }, []);

  // ===========================================================================
  // Presets
  // ===========================================================================

  const selectPresetBackground = useCallback(
    async (id: string): Promise<void> => {
      const background = PRESET_BACKGROUNDS.find((bg) => bg.id === id);
      if (background) {
        await setVirtualBackground("image", background.url);
      }
    },
    [setVirtualBackground],
  );

  const selectPresetColor = useCallback(
    (id: string): void => {
      const color = PRESET_COLORS.find((c) => c.id === id);
      if (color) {
        setVirtualBackground("color", color.color);
      }
    },
    [setVirtualBackground],
  );

  // ===========================================================================
  // Return
  // ===========================================================================

  return {
    // State
    effectType,
    blurStrength,
    virtualBackgroundType,
    virtualBackgroundSource,
    isProcessing,
    isInitialized,
    error,

    // Actions
    setEffectType,
    setBlurStrength,
    setVirtualBackground,
    applyToStream,
    stopProcessing,

    // Presets
    presetBackgrounds: PRESET_BACKGROUNDS,
    presetColors: PRESET_COLORS,
    selectPresetBackground,
    selectPresetColor,
  };
}
