/**
 * Call Stats Component
 *
 * Displays connection quality metrics during a call.
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Activity, Wifi, WifiOff, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

// =============================================================================
// Types
// =============================================================================

export interface CallStatsData {
  bytesReceived: number;
  bytesSent: number;
  packetsLost: number;
  roundTripTime: number | null;
  connectionQuality: "excellent" | "good" | "fair" | "poor" | "disconnected";
}

export interface CallStatsProps extends CallStatsData {
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function formatLatency(ms: number | null): string {
  if (ms === null) return "N/A";
  return `${Math.round(ms * 1000)}ms`;
}

function getQualityColor(quality: CallStatsProps["connectionQuality"]): string {
  switch (quality) {
    case "excellent":
      return "text-green-500";
    case "good":
      return "text-blue-500";
    case "fair":
      return "text-yellow-500";
    case "poor":
      return "text-orange-500";
    case "disconnected":
      return "text-red-500";
    default:
      return "text-gray-500";
  }
}

function getQualityIcon(quality: CallStatsProps["connectionQuality"]) {
  if (quality === "disconnected") {
    return <WifiOff className="h-4 w-4" />;
  }
  return <Wifi className="h-4 w-4" />;
}

// =============================================================================
// Component
// =============================================================================

export function CallStats({
  bytesReceived,
  bytesSent,
  packetsLost,
  roundTripTime,
  connectionQuality,
  className,
}: CallStatsProps) {
  const qualityColor = getQualityColor(connectionQuality);
  const qualityIcon = getQualityIcon(connectionQuality);

  return (
    <Card
      className={cn(
        "border-white/10 bg-black/20 p-4 backdrop-blur-sm",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-white" />
          <span className="text-sm font-medium text-white">
            Connection Stats
          </span>
        </div>
        <div className={cn("flex items-center gap-2", qualityColor)}>
          {qualityIcon}
          <span className="text-sm font-medium capitalize">
            {connectionQuality}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs">
        {/* Bytes Received */}
        <div>
          <div className="mb-1 text-muted-foreground">Received</div>
          <div className="font-medium text-white">
            {formatBytes(bytesReceived)}
          </div>
        </div>

        {/* Bytes Sent */}
        <div>
          <div className="mb-1 text-muted-foreground">Sent</div>
          <div className="font-medium text-white">{formatBytes(bytesSent)}</div>
        </div>

        {/* Latency */}
        <div>
          <div className="mb-1 text-muted-foreground">Latency</div>
          <div className="font-medium text-white">
            {formatLatency(roundTripTime)}
          </div>
        </div>

        {/* Packet Loss */}
        <div>
          <div className="mb-1 text-muted-foreground">Packet Loss</div>
          <div
            className={cn(
              "font-medium",
              packetsLost > 10 ? "text-red-500" : "text-white",
            )}
          >
            {packetsLost}
          </div>
        </div>
      </div>

      {/* Warning for poor connection */}
      {(connectionQuality === "poor" ||
        connectionQuality === "disconnected") && (
        <div className="mt-3 flex items-start gap-2 rounded border border-yellow-500/20 bg-yellow-500/10 p-2">
          <AlertCircle className="mt-0.5 h-4 w-4 text-yellow-500" />
          <div className="text-xs text-yellow-500">
            {connectionQuality === "disconnected"
              ? "Connection lost. Attempting to reconnect..."
              : "Poor connection quality may affect call quality."}
          </div>
        </div>
      )}
    </Card>
  );
}

CallStats.displayName = "CallStats";

// =============================================================================
// Compact Stats Component
// =============================================================================

export interface CompactCallStatsProps {
  connectionQuality: CallStatsProps["connectionQuality"];
  roundTripTime: number | null;
  className?: string;
}

export function CompactCallStats({
  connectionQuality,
  roundTripTime,
  className,
}: CompactCallStatsProps) {
  const qualityColor = getQualityColor(connectionQuality);
  const qualityIcon = getQualityIcon(connectionQuality);

  return (
    <div className={cn("flex items-center gap-2 text-xs", className)}>
      <div className={cn("flex items-center gap-1", qualityColor)}>
        {qualityIcon}
        <span className="capitalize">{connectionQuality}</span>
      </div>
      {roundTripTime !== null && (
        <>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">
            {formatLatency(roundTripTime)}
          </span>
        </>
      )}
    </div>
  );
}

CompactCallStats.displayName = "CompactCallStats";
