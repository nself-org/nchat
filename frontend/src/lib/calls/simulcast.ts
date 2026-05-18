/**
 * Simulcast Support
 *
 * Implements simulcast for adaptive bitrate streaming.
 * Sends multiple quality layers simultaneously for SFU to select.
 */

import type { VideoQuality } from "./video-processor";

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export interface SimulcastLayer {
  rid: string; // Restriction Identifier
  scaleResolutionDownBy: number;
  maxBitrate: number; // bps
  maxFramerate?: number;
}

export interface SimulcastEncoding {
  rid: string;
  active: boolean;
  scaleResolutionDownBy: number;
  maxBitrate: number;
  priority?: RTCPriorityType;
}

export interface SimulcastConfig {
  enabled: boolean;
  layers: SimulcastLayer[];
}

// =============================================================================
// Constants
// =============================================================================

// Standard simulcast layers for 720p base resolution
export const SIMULCAST_LAYERS_720P: SimulcastLayer[] = [
  {
    rid: "h", // High quality
    scaleResolutionDownBy: 1.0,
    maxBitrate: 2500000, // 2.5 Mbps
    maxFramerate: 30,
  },
  {
    rid: "m", // Medium quality
    scaleResolutionDownBy: 2.0,
    maxBitrate: 1200000, // 1.2 Mbps
    maxFramerate: 30,
  },
  {
    rid: "l", // Low quality
    scaleResolutionDownBy: 4.0,
    maxBitrate: 500000, // 500 kbps
    maxFramerate: 15,
  },
];

// Simulcast layers for 1080p base resolution
export const SIMULCAST_LAYERS_1080P: SimulcastLayer[] = [
  {
    rid: "h",
    scaleResolutionDownBy: 1.0,
    maxBitrate: 4000000, // 4 Mbps
    maxFramerate: 30,
  },
  {
    rid: "m",
    scaleResolutionDownBy: 2.0,
    maxBitrate: 2000000, // 2 Mbps
    maxFramerate: 30,
  },
  {
    rid: "l",
    scaleResolutionDownBy: 4.0,
    maxBitrate: 800000, // 800 kbps
    maxFramerate: 15,
  },
];

// =============================================================================
// Simulcast Manager Class
// =============================================================================

export class SimulcastManager {
  private enabled: boolean = true;
  private currentLayers: SimulcastLayer[] = SIMULCAST_LAYERS_720P;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  // ===========================================================================
  // Configuration
  // ===========================================================================

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setQuality(quality: VideoQuality): void {
    switch (quality) {
      case "1080p":
        this.currentLayers = SIMULCAST_LAYERS_1080P;
        break;
      case "720p":
      default:
        this.currentLayers = SIMULCAST_LAYERS_720P;
        break;
    }
  }

  // ===========================================================================
  // Encoding Parameters
  // ===========================================================================

  getEncodingParameters(): SimulcastEncoding[] {
    if (!this.enabled) {
      return [];
    }

    return this.currentLayers.map((layer) => ({
      rid: layer.rid,
      active: true,
      scaleResolutionDownBy: layer.scaleResolutionDownBy,
      maxBitrate: layer.maxBitrate,
      priority: this.getPriority(layer.rid),
    }));
  }

  private getPriority(rid: string): RTCPriorityType {
    switch (rid) {
      case "h":
        return "high";
      case "m":
        return "medium";
      case "l":
        return "low";
      default:
        return "low";
    }
  }

  // ===========================================================================
  // Layer Management
  // ===========================================================================

  async setLayerActive(
    sender: RTCRtpSender,
    rid: string,
    active: boolean,
  ): Promise<void> {
    const parameters = sender.getParameters();

    if (!parameters.encodings) {
      return;
    }

    const encoding = parameters.encodings.find(
      (e: RTCRtpEncodingParameters) => e.rid === rid,
    );
    if (encoding) {
      encoding.active = active;
      await sender.setParameters(parameters);
    }
  }

  async setPreferredLayer(
    sender: RTCRtpSender,
    preferredRid: "h" | "m" | "l",
  ): Promise<void> {
    const parameters = sender.getParameters();

    if (!parameters.encodings) {
      return;
    }

    // Activate preferred layer and deactivate others
    parameters.encodings.forEach((encoding: RTCRtpEncodingParameters) => {
      encoding.active = encoding.rid === preferredRid;
    });

    await sender.setParameters(parameters);
  }

  async adaptTonetwork(
    sender: RTCRtpSender,
    availableBandwidth: number, // bps
  ): Promise<void> {
    const parameters = sender.getParameters();

    if (!parameters.encodings) {
      return;
    }

    // Select best layer based on available bandwidth
    let selectedRid = "l"; // Default to low quality

    if (availableBandwidth >= 2500000) {
      selectedRid = "h";
    } else if (availableBandwidth >= 1200000) {
      selectedRid = "m";
    }

    // Activate selected layer
    parameters.encodings.forEach((encoding: RTCRtpEncodingParameters) => {
      encoding.active = encoding.rid === selectedRid;
    });

    await sender.setParameters(parameters);
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  async getStats(sender: RTCRtpSender): Promise<Map<string, RTCStatsReport>> {
    const stats = await sender.getStats();
    const layerStats = new Map<string, RTCStatsReport>();

    stats.forEach((report) => {
      if (report.type === "outbound-rtp" && report.rid) {
        layerStats.set(report.rid, report);
      }
    });

    return layerStats;
  }

  async getActiveLayer(sender: RTCRtpSender): Promise<string | null> {
    const parameters = sender.getParameters();

    if (!parameters.encodings) {
      return null;
    }

    const activeEncoding = parameters.encodings.find(
      (e: RTCRtpEncodingParameters) => e.active,
    );
    return activeEncoding?.rid || null;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createSimulcastManager(enabled?: boolean): SimulcastManager {
  return new SimulcastManager(enabled);
}

// =============================================================================
// Utility Functions
// =============================================================================

export function isSimulcastSupported(): boolean {
  if (typeof RTCRtpSender === "undefined") {
    return false;
  }

  // Check if browser supports simulcast
  const capabilities = RTCRtpSender.getCapabilities?.("video");
  return capabilities !== null && capabilities !== undefined;
}

export function getSimulcastConfig(quality: VideoQuality): SimulcastConfig {
  return {
    enabled: true,
    layers:
      quality === "1080p" ? SIMULCAST_LAYERS_1080P : SIMULCAST_LAYERS_720P,
  };
}

export function applySimulcastToSender(
  sender: RTCRtpSender,
  layers: SimulcastLayer[],
): void {
  const parameters = sender.getParameters();

  if (!parameters.encodings) {
    parameters.encodings = [];
  }

  // Set encodings based on layers
  parameters.encodings = layers.map((layer) => ({
    rid: layer.rid,
    active: true,
    scaleResolutionDownBy: layer.scaleResolutionDownBy,
    maxBitrate: layer.maxBitrate,
  }));

  sender.setParameters(parameters).catch((err) => {
    logger.error("Failed to apply simulcast parameters:", err);
  });
}
