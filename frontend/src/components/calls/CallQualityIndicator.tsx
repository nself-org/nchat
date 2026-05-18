/**
 * CallQualityIndicator Component
 *
 * Displays call quality with visual indicator and metrics.
 * Shows quality level, signal bars, and detailed metrics.
 */

"use client";

import { useMemo } from "react";
import { QualityLevel, QualityMetrics } from "@/lib/calls";
import { cn } from "@/lib/utils";
import {
  Signal,
  SignalHigh,
  SignalLow,
  SignalMedium,
  SignalZero,
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

// =============================================================================
// Types
// =============================================================================

export interface CallQualityIndicatorProps {
  quality: QualityLevel;
  metrics?: QualityMetrics | null;
  className?: string;
  variant?: "simple" | "detailed" | "minimal";
  showLabel?: boolean;
  showMetrics?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function CallQualityIndicator({
  quality,
  metrics,
  className,
  variant = "simple",
  showLabel = true,
  showMetrics = true,
}: CallQualityIndicatorProps) {
  const config = getQualityConfig(quality);

  if (variant === "minimal") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("inline-flex items-center", className)}>
              <config.icon className={cn("h-4 w-4", config.iconClassName)} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">{config.label} Quality</p>
              {metrics && (
                <div className="text-xs text-muted-foreground">
                  <p>Packet Loss: {metrics.audioPacketLoss.toFixed(1)}%</p>
                  <p>Jitter: {metrics.audioJitter.toFixed(0)}ms</p>
                  <p>RTT: {metrics.rtt.toFixed(0)}ms</p>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === "simple") {
    return (
      <div className={cn("inline-flex items-center gap-2", className)}>
        <config.icon className={cn("h-4 w-4", config.iconClassName)} />
        {showLabel && (
          <span className={cn("text-sm font-medium", config.textClassName)}>
            {config.label}
          </span>
        )}
      </div>
    );
  }

  // Detailed variant
  return (
    <div className={cn("space-y-3", className)}>
      {/* Quality header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <config.icon className={cn("h-5 w-5", config.iconClassName)} />
          <span className={cn("text-sm font-medium", config.textClassName)}>
            {config.label} Quality
          </span>
        </div>
        <Badge variant={config.badgeVariant}>{quality}</Badge>
      </div>

      {/* Metrics */}
      {showMetrics && metrics && (
        <div className="space-y-2">
          {/* Audio metrics */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <MetricItem
              label="Packet Loss"
              value={`${metrics.audioPacketLoss.toFixed(1)}%`}
              warning={metrics.audioPacketLoss > 2}
              critical={metrics.audioPacketLoss > 5}
            />
            <MetricItem
              label="Jitter"
              value={`${metrics.audioJitter.toFixed(0)}ms`}
              warning={metrics.audioJitter > 50}
              critical={metrics.audioJitter > 100}
            />
            <MetricItem
              label="RTT"
              value={`${metrics.rtt.toFixed(0)}ms`}
              warning={metrics.rtt > 200}
              critical={metrics.rtt > 400}
            />
            <MetricItem
              label="Bitrate"
              value={`${metrics.audioReceiveBitrate.toFixed(0)} kbps`}
              warning={metrics.audioReceiveBitrate < 150}
              critical={metrics.audioReceiveBitrate < 64}
            />
          </div>

          {/* Video metrics (if available) */}
          {metrics.videoReceiveBitrate > 0 && (
            <div className="grid grid-cols-2 gap-2 border-t pt-2 text-xs">
              <MetricItem
                label="Video Bitrate"
                value={`${metrics.videoReceiveBitrate.toFixed(0)} kbps`}
                warning={metrics.videoReceiveBitrate < 500}
                critical={metrics.videoReceiveBitrate < 200}
              />
              <MetricItem
                label="Frame Rate"
                value={`${metrics.videoFrameRate.toFixed(0)} fps`}
                warning={metrics.videoFrameRate < 20}
                critical={metrics.videoFrameRate < 15}
              />
              <MetricItem
                label="Resolution"
                value={`${metrics.videoResolution.width}x${metrics.videoResolution.height}`}
              />
              <MetricItem
                label="Video Loss"
                value={`${metrics.videoPacketLoss.toFixed(1)}%`}
                warning={metrics.videoPacketLoss > 2}
                critical={metrics.videoPacketLoss > 5}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Metric Item Component
// =============================================================================

interface MetricItemProps {
  label: string;
  value: string;
  warning?: boolean;
  critical?: boolean;
}

function MetricItem({ label, value, warning, critical }: MetricItemProps) {
  return (
    <div className="flex flex-col">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-mono font-medium",
          critical && "text-red-600",
          !critical && warning && "text-yellow-600",
        )}
      >
        {value}
      </span>
    </div>
  );
}

// =============================================================================
// Quality Configuration
// =============================================================================

interface QualityConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName: string;
  textClassName: string;
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
}

function getQualityConfig(quality: QualityLevel): QualityConfig {
  const configs: Record<QualityLevel, QualityConfig> = {
    excellent: {
      label: "Excellent",
      icon: Signal,
      iconClassName: "text-green-600",
      textClassName: "text-green-600",
      badgeVariant: "default",
    },
    good: {
      label: "Good",
      icon: SignalHigh,
      iconClassName: "text-blue-600",
      textClassName: "text-blue-600",
      badgeVariant: "secondary",
    },
    fair: {
      label: "Fair",
      icon: SignalMedium,
      iconClassName: "text-yellow-600",
      textClassName: "text-yellow-600",
      badgeVariant: "outline",
    },
    poor: {
      label: "Poor",
      icon: SignalLow,
      iconClassName: "text-orange-600",
      textClassName: "text-orange-600",
      badgeVariant: "outline",
    },
    critical: {
      label: "Critical",
      icon: SignalZero,
      iconClassName: "text-red-600",
      textClassName: "text-red-600",
      badgeVariant: "destructive",
    },
  };

  return configs[quality];
}

// =============================================================================
// Quality Alert Component
// =============================================================================

export interface QualityAlertProps {
  quality: QualityLevel;
  message?: string;
  suggestions?: string[];
  onDismiss?: () => void;
}

export function QualityAlert({
  quality,
  message,
  suggestions,
  onDismiss,
}: QualityAlertProps) {
  const config = getQualityConfig(quality);

  if (quality === "excellent" || quality === "good") {
    return null;
  }

  return (
    <div
      className={cn(
        "space-y-2 rounded-lg border p-3",
        quality === "critical" && "border-red-600 bg-red-50 dark:bg-red-950",
        quality === "poor" &&
          "border-orange-600 bg-orange-50 dark:bg-orange-950",
        quality === "fair" &&
          "border-yellow-600 bg-yellow-50 dark:bg-yellow-950",
      )}
    >
      <div className="flex items-start gap-2">
        <Info className={cn("mt-0.5 h-4 w-4", config.iconClassName)} />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium">
            {message || `Call quality is ${quality}`}
          </p>
          {suggestions && suggestions.length > 0 && (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {suggestions.map((suggestion, i) => (
                <li key={i}>• {suggestion}</li>
              ))}
            </ul>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
