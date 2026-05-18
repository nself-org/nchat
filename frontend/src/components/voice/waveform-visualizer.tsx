"use client";

/**
 * Waveform Visualizer Component
 *
 * Displays audio waveforms for both real-time recording and static playback.
 * Supports progress indication and interactive seeking.
 */

import { useRef, useEffect, useState, useCallback, memo } from "react";
import { cn } from "@/lib/utils";
import type { RealtimeWaveformData, WaveformData } from "@/lib/voice";

// ============================================================================
// TYPES
// ============================================================================

export type WaveformStyle = "bars" | "line" | "mirror";

export interface WaveformVisualizerProps {
  /** Real-time waveform data from recording */
  realtimeData?: RealtimeWaveformData | null;
  /** Static waveform data for playback */
  staticData?: WaveformData | number[] | null;
  /** Progress percentage (0-100) for playback indication */
  progress?: number;
  /** Whether the waveform is interactive (clickable to seek) */
  interactive?: boolean;
  /** Callback when user clicks to seek (progress 0-100) */
  onSeek?: (progress: number) => void;
  /** Visual style of the waveform */
  style?: WaveformStyle;
  /** Number of bars to display */
  barCount?: number;
  /** Gap between bars in pixels */
  barGap?: number;
  /** Minimum bar height as percentage (0-1) */
  minBarHeight?: number;
  /** Bar border radius in pixels */
  barRadius?: number;
  /** Color of the waveform (active/played portion) */
  activeColor?: string;
  /** Color of the inactive/unplayed portion */
  inactiveColor?: string;
  /** Background color */
  backgroundColor?: string;
  /** Height of the visualizer */
  height?: number | string;
  /** Width of the visualizer */
  width?: number | string;
  /** Additional CSS classes */
  className?: string;
  /** Animate bars (for recording) */
  animated?: boolean;
  /** Show a gradient fade at the edges */
  gradientFade?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_BAR_COUNT = 50;
const DEFAULT_BAR_GAP = 2;
const DEFAULT_MIN_BAR_HEIGHT = 0.08;
const DEFAULT_BAR_RADIUS = 2;
const DEFAULT_HEIGHT = 40;
const DEFAULT_ACTIVE_COLOR = "hsl(var(--primary))";
const DEFAULT_INACTIVE_COLOR = "hsl(var(--muted-foreground) / 0.3)";

// ============================================================================
// COMPONENT
// ============================================================================

export const WaveformVisualizer = memo(function WaveformVisualizer({
  realtimeData,
  staticData,
  progress = 0,
  interactive = false,
  onSeek,
  style = "bars",
  barCount = DEFAULT_BAR_COUNT,
  barGap = DEFAULT_BAR_GAP,
  minBarHeight = DEFAULT_MIN_BAR_HEIGHT,
  barRadius = DEFAULT_BAR_RADIUS,
  activeColor = DEFAULT_ACTIVE_COLOR,
  inactiveColor = DEFAULT_INACTIVE_COLOR,
  backgroundColor,
  height = DEFAULT_HEIGHT,
  width = "100%",
  className,
  animated = false,
  gradientFade = false,
}: WaveformVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [bars, setBars] = useState<number[]>(() =>
    new Array(barCount).fill(minBarHeight),
  );
  const [isHovering, setIsHovering] = useState(false);
  const [hoverProgress, setHoverProgress] = useState(0);

  // Process waveform data into bars
  useEffect(() => {
    let newBars: number[];

    if (realtimeData?.bars) {
      // Real-time data from recording
      newBars = realtimeData.bars.slice(0, barCount);
      // Pad if needed
      while (newBars.length < barCount) {
        newBars.push(minBarHeight);
      }
    } else if (staticData) {
      // Static waveform data
      const amplitudes = Array.isArray(staticData)
        ? staticData
        : staticData.amplitudes;

      if (amplitudes.length === barCount) {
        newBars = amplitudes;
      } else {
        // Resample to match bar count
        newBars = resampleArray(amplitudes, barCount);
      }
    } else {
      // Default empty bars
      newBars = new Array(barCount).fill(minBarHeight);
    }

    // Apply minimum height
    newBars = newBars.map((value) => Math.max(value, minBarHeight));

    setBars(newBars);
  }, [realtimeData, staticData, barCount, minBarHeight]);

  // Handle click for seeking
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive || !onSeek || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = (x / rect.width) * 100;

      onSeek(Math.max(0, Math.min(100, percentage)));
    },
    [interactive, onSeek],
  );

  // Handle mouse move for hover preview
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = (x / rect.width) * 100;

      setHoverProgress(Math.max(0, Math.min(100, percentage)));
    },
    [interactive],
  );

  // Calculate bar dimensions
  const containerWidth = typeof width === "number" ? width : 0;
  const totalGapWidth = (barCount - 1) * barGap;
  const availableWidth = containerWidth - totalGapWidth;
  const barWidth = availableWidth / barCount;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative select-none overflow-hidden",
        interactive && "cursor-pointer",
        className,
      )}
      style={{
        height,
        width,
        backgroundColor,
      }}
      onClick={handleClick}
      onKeyDown={
        interactive && onSeek
          ? (e) => {
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                onSeek(Math.max(0, progress - 5));
              } else if (e.key === "ArrowRight") {
                e.preventDefault();
                onSeek(Math.min(100, progress + 5));
              }
            }
          : undefined
      }
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      role={interactive ? "slider" : "presentation"}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? "Audio progress" : "Audio waveform"}
      aria-valuemin={interactive ? 0 : undefined}
      aria-valuemax={interactive ? 100 : undefined}
      aria-valuenow={interactive ? Math.round(progress) : undefined}
    >
      {/* Bars container */}
      <div className="flex h-full w-full items-center justify-center gap-px">
        {bars.map((amplitude, index) => {
          const barProgress = (index / barCount) * 100;
          const isActive = barProgress <= progress;
          const isHoverActive = isHovering && barProgress <= hoverProgress;

          return (
            <WaveformBar
              key={index}
              amplitude={amplitude}
              isActive={isActive}
              isHoverActive={isHoverActive}
              activeColor={activeColor}
              inactiveColor={inactiveColor}
              barGap={barGap}
              barRadius={barRadius}
              animated={animated}
              style={style}
              index={index}
              total={barCount}
            />
          );
        })}
      </div>

      {/* Gradient fade overlay */}
      {gradientFade && (
        <>
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-4"
            style={{
              background: `linear-gradient(to right, ${backgroundColor || "hsl(var(--background))"}, transparent)`,
            }}
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-4"
            style={{
              background: `linear-gradient(to left, ${backgroundColor || "hsl(var(--background))"}, transparent)`,
            }}
          />
        </>
      )}

      {/* Hover indicator line */}
      {interactive && isHovering && (
        <div
          className="bg-foreground/30 pointer-events-none absolute inset-y-0 w-0.5 transition-all"
          style={{ left: `${hoverProgress}%` }}
        />
      )}
    </div>
  );
});

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface WaveformBarProps {
  amplitude: number;
  isActive: boolean;
  isHoverActive: boolean;
  activeColor: string;
  inactiveColor: string;
  barGap: number;
  barRadius: number;
  animated: boolean;
  style: WaveformStyle;
  index: number;
  total: number;
}

const WaveformBar = memo(function WaveformBar({
  amplitude,
  isActive,
  isHoverActive,
  activeColor,
  inactiveColor,
  barGap,
  barRadius,
  animated,
  style,
  index,
  total,
}: WaveformBarProps) {
  const heightPercent = amplitude * 100;

  // Determine color
  let color = inactiveColor;
  if (isActive) {
    color = activeColor;
  } else if (isHoverActive) {
    color = `${activeColor}80`; // 50% opacity
  }

  // Animation delay for wave effect
  const animationDelay = animated ? `${(index / total) * 0.5}s` : undefined;

  if (style === "mirror") {
    return (
      <div
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-0.5",
          animated && "animate-pulse",
        )}
        style={{
          marginLeft: index === 0 ? 0 : barGap / 2,
          marginRight: index === total - 1 ? 0 : barGap / 2,
          animationDelay,
        }}
      >
        {/* Top bar */}
        <div
          className="w-full origin-bottom transition-all duration-75"
          style={{
            height: `${heightPercent / 2}%`,
            backgroundColor: color,
            borderRadius: barRadius,
            minHeight: 2,
          }}
        />
        {/* Bottom bar (mirrored) */}
        <div
          className="w-full origin-top transition-all duration-75"
          style={{
            height: `${heightPercent / 2}%`,
            backgroundColor: color,
            borderRadius: barRadius,
            minHeight: 2,
          }}
        />
      </div>
    );
  }

  if (style === "line") {
    // Line style - connected path
    return (
      <div
        className="flex flex-1 items-center justify-center"
        style={{
          marginLeft: index === 0 ? 0 : barGap / 2,
          marginRight: index === total - 1 ? 0 : barGap / 2,
        }}
      >
        <div
          className={cn(
            "h-0.5 w-full transition-all duration-75",
            animated && "animate-pulse",
          )}
          style={{
            backgroundColor: color,
            transform: `scaleY(${Math.max(0.5, amplitude * 8)})`,
            animationDelay,
          }}
        />
      </div>
    );
  }

  // Default: bars style
  return (
    <div
      className={cn(
        "flex flex-1 items-center justify-center transition-all duration-75",
        animated && "animate-pulse",
      )}
      style={{
        marginLeft: index === 0 ? 0 : barGap / 2,
        marginRight: index === total - 1 ? 0 : barGap / 2,
        animationDelay,
      }}
    >
      <div
        className="w-full transition-all duration-75"
        style={{
          height: `${heightPercent}%`,
          backgroundColor: color,
          borderRadius: barRadius,
          minHeight: 2,
        }}
      />
    </div>
  );
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Resample an array to a target length using linear interpolation
 */
function resampleArray(arr: number[], targetLength: number): number[] {
  if (arr.length === 0) return new Array(targetLength).fill(0);
  if (arr.length === targetLength) return arr;

  const result: number[] = [];
  const ratio = arr.length / targetLength;

  for (let i = 0; i < targetLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, arr.length - 1);
    const fraction = srcIndex - srcIndexFloor;

    // Linear interpolation
    const value =
      arr[srcIndexFloor] * (1 - fraction) + arr[srcIndexCeil] * fraction;
    result.push(value);
  }

  return result;
}

// ============================================================================
// CANVAS-BASED VISUALIZER (Alternative)
// ============================================================================

export interface CanvasWaveformProps {
  /** Waveform amplitudes (0-1) */
  amplitudes: number[];
  /** Progress percentage (0-100) */
  progress?: number;
  /** Active color */
  activeColor?: string;
  /** Inactive color */
  inactiveColor?: string;
  /** Canvas width */
  width?: number;
  /** Canvas height */
  height?: number;
  /** Additional CSS classes */
  className?: string;
  /** Callback for seeking */
  onSeek?: (progress: number) => void;
}

/**
 * Canvas-based waveform visualizer for better performance with large datasets
 */
export function CanvasWaveform({
  amplitudes,
  progress = 0,
  activeColor = DEFAULT_ACTIVE_COLOR,
  inactiveColor = DEFAULT_INACTIVE_COLOR,
  width = 300,
  height = 40,
  className,
  onSeek,
}: CanvasWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate bar dimensions
    const barCount = amplitudes.length;
    const barWidth = width / barCount;
    const progressX = (progress / 100) * width;

    // Draw bars
    amplitudes.forEach((amplitude, index) => {
      const x = index * barWidth;
      const barHeight = amplitude * height;
      const y = (height - barHeight) / 2;

      // Determine color based on progress
      ctx.fillStyle = x < progressX ? activeColor : inactiveColor;

      // Draw rounded rect
      const radius = Math.min(2, barWidth / 2);
      roundRect(ctx, x + 1, y, Math.max(1, barWidth - 2), barHeight, radius);
    });
  }, [amplitudes, progress, activeColor, inactiveColor, width, height]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onSeek) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = (x / rect.width) * 100;

      onSeek(Math.max(0, Math.min(100, percentage)));
    },
    [onSeek],
  );

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={cn(onSeek && "cursor-pointer", className)}
      onClick={handleClick}
    />
  );
}

/**
 * Draw a rounded rectangle on canvas
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}

export default WaveformVisualizer;
