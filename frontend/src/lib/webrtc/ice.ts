/**
 * ICE Candidate Handler
 *
 * Manages ICE candidate gathering, queueing, and processing
 * for WebRTC peer connections.
 */

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export type IceGatheringState = "new" | "gathering" | "complete";
export type IceConnectionState =
  | "new"
  | "checking"
  | "connected"
  | "completed"
  | "failed"
  | "disconnected"
  | "closed";

export interface IceCandidateInfo {
  candidate: RTCIceCandidate;
  type: "host" | "srflx" | "prflx" | "relay";
  protocol: "udp" | "tcp";
  address?: string;
  port?: number;
  priority?: number;
  timestamp: Date;
}

export interface IceManagerCallbacks {
  onIceCandidate?: (candidate: RTCIceCandidate, info: IceCandidateInfo) => void;
  onIceGatheringStateChange?: (state: IceGatheringState) => void;
  onIceConnectionStateChange?: (state: IceConnectionState) => void;
  onIceError?: (error: Error) => void;
  onAllCandidatesGathered?: (candidates: IceCandidateInfo[]) => void;
}

export interface IceManagerConfig {
  /** Maximum time to wait for ICE gathering (ms) */
  gatheringTimeout: number;
  /** Whether to enable trickle ICE */
  trickleIce: boolean;
  /** Filter candidates by type */
  candidateFilter?: ("host" | "srflx" | "prflx" | "relay")[];
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_CONFIG: IceManagerConfig = {
  gatheringTimeout: 10000,
  trickleIce: true,
};

// =============================================================================
// ICE Candidate Manager Class
// =============================================================================

export class IceCandidateManager {
  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
  private gatheredCandidates: Map<string, IceCandidateInfo[]> = new Map();
  private connections: Map<string, RTCPeerConnection> = new Map();
  private callbacks: IceManagerCallbacks;
  private config: IceManagerConfig;
  private gatheringTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    callbacks: IceManagerCallbacks = {},
    config: Partial<IceManagerConfig> = {},
  ) {
    this.callbacks = callbacks;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ===========================================================================
  // Connection Management
  // ===========================================================================

  /**
   * Register a peer connection for ICE management
   */
  registerConnection(peerId: string, connection: RTCPeerConnection): void {
    this.connections.set(peerId, connection);
    this.pendingCandidates.set(peerId, []);
    this.gatheredCandidates.set(peerId, []);

    // Set up ICE event handlers
    connection.onicecandidate = (event) => {
      this.handleIceCandidate(peerId, event.candidate);
    };

    connection.onicegatheringstatechange = () => {
      this.handleGatheringStateChange(
        peerId,
        connection.iceGatheringState as IceGatheringState,
      );
    };

    connection.oniceconnectionstatechange = () => {
      this.handleConnectionStateChange(
        peerId,
        connection.iceConnectionState as IceConnectionState,
      );
    };

    connection.onicecandidateerror = (event) => {
      const error = new Error(
        `ICE candidate error: ${event.errorCode} - ${event.errorText}`,
      );
      this.callbacks.onIceError?.(error);
    };

    // Start gathering timeout
    if (this.config.gatheringTimeout > 0) {
      const timeout = setTimeout(() => {
        this.handleGatheringTimeout(peerId);
      }, this.config.gatheringTimeout);
      this.gatheringTimeouts.set(peerId, timeout);
    }
  }

  /**
   * Unregister a peer connection
   */
  unregisterConnection(peerId: string): void {
    this.connections.delete(peerId);
    this.pendingCandidates.delete(peerId);
    this.gatheredCandidates.delete(peerId);

    const timeout = this.gatheringTimeouts.get(peerId);
    if (timeout) {
      clearTimeout(timeout);
      this.gatheringTimeouts.delete(peerId);
    }
  }

  // ===========================================================================
  // ICE Candidate Handling
  // ===========================================================================

  /**
   * Handle a locally gathered ICE candidate
   */
  private handleIceCandidate(
    peerId: string,
    candidate: RTCIceCandidate | null,
  ): void {
    if (!candidate) {
      // ICE gathering complete
      return;
    }

    const info = this.parseCandidateInfo(candidate);

    // Apply candidate filter if configured
    if (
      this.config.candidateFilter &&
      !this.config.candidateFilter.includes(info.type)
    ) {
      return;
    }

    // Store gathered candidate
    const gathered = this.gatheredCandidates.get(peerId) || [];
    gathered.push(info);
    this.gatheredCandidates.set(peerId, gathered);

    // Notify callback
    this.callbacks.onIceCandidate?.(candidate, info);
  }

  /**
   * Handle gathering state change
   */
  private handleGatheringStateChange(
    peerId: string,
    state: IceGatheringState,
  ): void {
    this.callbacks.onIceGatheringStateChange?.(state);

    if (state === "complete") {
      // Clear gathering timeout
      const timeout = this.gatheringTimeouts.get(peerId);
      if (timeout) {
        clearTimeout(timeout);
        this.gatheringTimeouts.delete(peerId);
      }

      // Notify all candidates gathered
      const gathered = this.gatheredCandidates.get(peerId) || [];
      this.callbacks.onAllCandidatesGathered?.(gathered);
    }
  }

  /**
   * Handle connection state change
   */
  private handleConnectionStateChange(
    peerId: string,
    state: IceConnectionState,
  ): void {
    this.callbacks.onIceConnectionStateChange?.(state);
  }

  /**
   * Handle gathering timeout
   */
  private handleGatheringTimeout(peerId: string): void {
    this.gatheringTimeouts.delete(peerId);

    const gathered = this.gatheredCandidates.get(peerId) || [];
    if (gathered.length > 0) {
      // We have some candidates, proceed with what we have
      this.callbacks.onAllCandidatesGathered?.(gathered);
    } else {
      // No candidates gathered, report error
      this.callbacks.onIceError?.(
        new Error("ICE gathering timeout - no candidates found"),
      );
    }
  }

  // ===========================================================================
  // Remote Candidate Processing
  // ===========================================================================

  /**
   * Add a remote ICE candidate
   */
  async addCandidate(
    peerId: string,
    candidate: RTCIceCandidateInit,
  ): Promise<void> {
    const connection = this.connections.get(peerId);

    if (!connection) {
      // Queue candidate if connection not ready
      const pending = this.pendingCandidates.get(peerId) || [];
      pending.push(candidate);
      this.pendingCandidates.set(peerId, pending);
      return;
    }

    // Check if remote description is set
    if (!connection.remoteDescription) {
      // Queue candidate until remote description is set
      const pending = this.pendingCandidates.get(peerId) || [];
      pending.push(candidate);
      this.pendingCandidates.set(peerId, pending);
      return;
    }

    try {
      await connection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      logger.error("Failed to add ICE candidate:", error);
      this.callbacks.onIceError?.(
        error instanceof Error
          ? error
          : new Error("Failed to add ICE candidate"),
      );
    }
  }

  /**
   * Process pending candidates after remote description is set
   */
  async processPendingCandidates(peerId: string): Promise<void> {
    const connection = this.connections.get(peerId);
    const pending = this.pendingCandidates.get(peerId) || [];

    if (!connection || !connection.remoteDescription || pending.length === 0) {
      return;
    }

    // Clear pending queue
    this.pendingCandidates.set(peerId, []);

    // Add all pending candidates
    for (const candidate of pending) {
      try {
        await connection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        logger.error("Failed to add pending ICE candidate:", error);
      }
    }
  }

  /**
   * Get pending candidate count for a peer
   */
  getPendingCount(peerId: string): number {
    return this.pendingCandidates.get(peerId)?.length || 0;
  }

  /**
   * Get gathered candidates for a peer
   */
  getGatheredCandidates(peerId: string): IceCandidateInfo[] {
    return this.gatheredCandidates.get(peerId) || [];
  }

  // ===========================================================================
  // Candidate Parsing
  // ===========================================================================

  /**
   * Parse ICE candidate information
   */
  private parseCandidateInfo(candidate: RTCIceCandidate): IceCandidateInfo {
    const sdp = candidate.candidate;

    // Parse candidate type
    let type: IceCandidateInfo["type"] = "host";
    if (sdp.includes("typ srflx")) {
      type = "srflx";
    } else if (sdp.includes("typ prflx")) {
      type = "prflx";
    } else if (sdp.includes("typ relay")) {
      type = "relay";
    }

    // Parse protocol
    const protocol: "udp" | "tcp" = sdp.includes(" tcp ") ? "tcp" : "udp";

    // Parse address and port
    const addressMatch = sdp.match(/(\d+\.\d+\.\d+\.\d+)\s+(\d+)/);
    const address = addressMatch?.[1];
    const port = addressMatch?.[2] ? parseInt(addressMatch[2], 10) : undefined;

    // Parse priority
    const priorityMatch = sdp.match(/priority\s+(\d+)/);
    const priority = priorityMatch?.[1]
      ? parseInt(priorityMatch[1], 10)
      : undefined;

    return {
      candidate,
      type,
      protocol,
      address,
      port,
      priority,
      timestamp: new Date(),
    };
  }

  // ===========================================================================
  // ICE Restart
  // ===========================================================================

  /**
   * Trigger ICE restart for a peer
   */
  restartIce(peerId: string): void {
    const connection = this.connections.get(peerId);
    if (!connection) return;

    // Clear gathered candidates
    this.gatheredCandidates.set(peerId, []);

    // Restart ICE
    connection.restartIce();

    // Reset gathering timeout
    const existingTimeout = this.gatheringTimeouts.get(peerId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    if (this.config.gatheringTimeout > 0) {
      const timeout = setTimeout(() => {
        this.handleGatheringTimeout(peerId);
      }, this.config.gatheringTimeout);
      this.gatheringTimeouts.set(peerId, timeout);
    }
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  /**
   * Clean up all resources
   */
  cleanup(): void {
    // Clear all timeouts
    this.gatheringTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.gatheringTimeouts.clear();

    // Clear all maps
    this.connections.clear();
    this.pendingCandidates.clear();
    this.gatheredCandidates.clear();
  }

  // ===========================================================================
  // Callbacks Update
  // ===========================================================================

  /**
   * Update callbacks
   */
  updateCallbacks(callbacks: Partial<IceManagerCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createIceCandidateManager(
  callbacks?: IceManagerCallbacks,
  config?: Partial<IceManagerConfig>,
): IceCandidateManager {
  return new IceCandidateManager(callbacks, config);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Filter candidates by type
 */
export function filterCandidatesByType(
  candidates: IceCandidateInfo[],
  types: IceCandidateInfo["type"][],
): IceCandidateInfo[] {
  return candidates.filter((c) => types.includes(c.type));
}

/**
 * Sort candidates by priority
 */
export function sortCandidatesByPriority(
  candidates: IceCandidateInfo[],
): IceCandidateInfo[] {
  return [...candidates].sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

/**
 * Check if candidates include relay (TURN)
 */
export function hasRelayCandidates(candidates: IceCandidateInfo[]): boolean {
  return candidates.some((c) => c.type === "relay");
}

/**
 * Check if candidates include server reflexive (STUN)
 */
export function hasSrflxCandidates(candidates: IceCandidateInfo[]): boolean {
  return candidates.some((c) => c.type === "srflx");
}

/**
 * Get best candidate by type preference
 */
export function getBestCandidate(
  candidates: IceCandidateInfo[],
  typePreference: IceCandidateInfo["type"][] = [
    "relay",
    "srflx",
    "prflx",
    "host",
  ],
): IceCandidateInfo | null {
  for (const type of typePreference) {
    const candidate = candidates.find((c) => c.type === type);
    if (candidate) return candidate;
  }
  return candidates[0] || null;
}

/**
 * Analyze ICE candidates for debugging
 */
export function analyzeCandidates(candidates: IceCandidateInfo[]): {
  total: number;
  byType: Record<IceCandidateInfo["type"], number>;
  byProtocol: Record<"udp" | "tcp", number>;
  hasRelay: boolean;
  hasSrflx: boolean;
  averagePriority: number;
} {
  const byType: Record<IceCandidateInfo["type"], number> = {
    host: 0,
    srflx: 0,
    prflx: 0,
    relay: 0,
  };

  const byProtocol: Record<"udp" | "tcp", number> = {
    udp: 0,
    tcp: 0,
  };

  let totalPriority = 0;

  candidates.forEach((c) => {
    byType[c.type]++;
    byProtocol[c.protocol]++;
    totalPriority += c.priority || 0;
  });

  return {
    total: candidates.length,
    byType,
    byProtocol,
    hasRelay: byType.relay > 0,
    hasSrflx: byType.srflx > 0,
    averagePriority:
      candidates.length > 0 ? totalPriority / candidates.length : 0,
  };
}
