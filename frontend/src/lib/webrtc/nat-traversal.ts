/**
 * NAT Traversal Service
 *
 * Handles NAT type detection, connectivity testing, and fallback
 * to TURN relay when direct connections fail.
 */

import {
  testStunServer,
  testTurnServer,
  getIceServers,
  getTurnServerFromEnv,
} from "./servers";

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

/**
 * NAT types based on RFC 3489
 */
export type NatType =
  | "open" // No NAT, public IP
  | "full-cone" // Full Cone NAT (easiest to traverse)
  | "restricted" // Restricted Cone NAT
  | "port-restricted" // Port Restricted Cone NAT
  | "symmetric" // Symmetric NAT (hardest to traverse)
  | "blocked" // UDP blocked
  | "unknown"; // Unable to determine

/**
 * Connection method preference
 */
export type ConnectionMethod = "direct" | "stun" | "turn" | "relay";

/**
 * NAT traversal result
 */
export interface NatTraversalResult {
  success: boolean;
  method: ConnectionMethod;
  latencyMs: number;
  natType?: NatType;
  reflexiveAddress?: string;
  relayAddress?: string;
  error?: string;
}

/**
 * Connectivity test result
 */
export interface ConnectivityTestResult {
  stunAvailable: boolean;
  turnAvailable: boolean;
  natType: NatType;
  publicIp?: string;
  recommendedMethod: ConnectionMethod;
  latencies: {
    stun?: number;
    turn?: number;
  };
}

export interface NatTraversalConfig {
  /** Timeout for connectivity tests (ms) */
  testTimeout: number;
  /** Whether to prefer TURN even when STUN works */
  preferTurn: boolean;
  /** Maximum number of test attempts */
  maxTestAttempts: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_CONFIG: NatTraversalConfig = {
  testTimeout: 10000,
  preferTurn: false,
  maxTestAttempts: 3,
};

// =============================================================================
// NAT Traversal Service Class
// =============================================================================

export class NatTraversalService {
  private config: NatTraversalConfig;
  private cachedNatType: NatType | null = null;
  private cachedPublicIp: string | null = null;
  private lastTestTime: number = 0;
  private cacheExpiry: number = 60000; // 1 minute

  constructor(config: Partial<NatTraversalConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ===========================================================================
  // NAT Detection
  // ===========================================================================

  /**
   * Detect NAT type using STUN servers
   */
  async detectNatType(): Promise<NatType> {
    // Return cached result if recent
    if (
      this.cachedNatType &&
      Date.now() - this.lastTestTime < this.cacheExpiry
    ) {
      return this.cachedNatType;
    }

    try {
      const iceServers = getIceServers();
      const stunServer = iceServers.find((s) => {
        const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
        return urls.some((url) => url.startsWith("stun:"));
      });

      if (!stunServer) {
        return "unknown";
      }

      // Test connectivity and gather candidates
      const candidates = await this.gatherCandidates(stunServer.urls as string);

      // Analyze candidates to determine NAT type
      const natType = this.analyzeNatType(candidates);

      this.cachedNatType = natType;
      this.lastTestTime = Date.now();

      return natType;
    } catch (error) {
      logger.error("NAT detection failed:", error);
      return "unknown";
    }
  }

  /**
   * Gather ICE candidates for NAT analysis
   */
  private async gatherCandidates(stunUrl: string): Promise<RTCIceCandidate[]> {
    return new Promise((resolve) => {
      const candidates: RTCIceCandidate[] = [];

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: stunUrl }],
      });

      const timeout = setTimeout(() => {
        pc.close();
        resolve(candidates);
      }, this.config.testTimeout);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          candidates.push(event.candidate);
        }
      };

      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === "complete") {
          clearTimeout(timeout);
          pc.close();
          resolve(candidates);
        }
      };

      // Create data channel to trigger ICE gathering
      pc.createDataChannel("nat-test");
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch(() => {
          clearTimeout(timeout);
          pc.close();
          resolve(candidates);
        });
    });
  }

  /**
   * Analyze gathered candidates to determine NAT type
   */
  private analyzeNatType(candidates: RTCIceCandidate[]): NatType {
    const hostCandidates = candidates.filter((c) =>
      c.candidate.includes("typ host"),
    );
    const srflxCandidates = candidates.filter((c) =>
      c.candidate.includes("typ srflx"),
    );

    // Extract addresses
    const hostAddresses = new Set<string>();
    const srflxAddresses = new Set<string>();
    const srflxPorts = new Set<string>();

    hostCandidates.forEach((c) => {
      const match = c.candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
      if (match) hostAddresses.add(match[1]);
    });

    srflxCandidates.forEach((c) => {
      const addressMatch = c.candidate.match(/(\d+\.\d+\.\d+\.\d+)\s+(\d+)/);
      if (addressMatch) {
        srflxAddresses.add(addressMatch[1]);
        srflxPorts.add(addressMatch[2]);

        // Cache public IP
        if (!this.cachedPublicIp) {
          this.cachedPublicIp = addressMatch[1];
        }
      }
    });

    // No srflx candidates means UDP is blocked or no STUN response
    if (srflxCandidates.length === 0) {
      if (hostCandidates.length === 0) {
        return "blocked";
      }
      return "symmetric"; // Could also be blocked STUN
    }

    // Check if host IP matches srflx IP (no NAT / public IP)
    const hasPublicIp = Array.from(hostAddresses).some((h) =>
      srflxAddresses.has(h),
    );
    if (hasPublicIp) {
      return "open";
    }

    // Multiple srflx addresses or inconsistent ports indicate symmetric NAT
    if (
      srflxAddresses.size > 1 ||
      (srflxPorts.size > 1 && srflxCandidates.length > 1)
    ) {
      return "symmetric";
    }

    // Single consistent srflx address likely indicates cone NAT
    // Without more complex testing, we classify as restricted
    return "restricted";
  }

  // ===========================================================================
  // Connectivity Testing
  // ===========================================================================

  /**
   * Test overall connectivity and recommend best method
   */
  async testConnectivity(): Promise<ConnectivityTestResult> {
    const [natType, stunResult, turnResult] = await Promise.all([
      this.detectNatType(),
      this.testStunConnectivity(),
      this.testTurnConnectivity(),
    ]);

    const recommendedMethod = this.getRecommendedMethod(
      natType,
      stunResult.success,
      turnResult.success,
    );

    return {
      stunAvailable: stunResult.success,
      turnAvailable: turnResult.success,
      natType,
      publicIp: this.cachedPublicIp || undefined,
      recommendedMethod,
      latencies: {
        stun: stunResult.latencyMs,
        turn: turnResult.latencyMs,
      },
    };
  }

  /**
   * Test STUN connectivity
   */
  private async testStunConnectivity(): Promise<{
    success: boolean;
    latencyMs?: number;
  }> {
    const iceServers = getIceServers();
    const stunServer = iceServers.find((s) => {
      const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
      return urls.some((url) => url.startsWith("stun:"));
    });

    if (!stunServer) {
      return { success: false };
    }

    const url = Array.isArray(stunServer.urls)
      ? stunServer.urls[0]
      : stunServer.urls;
    const result = await testStunServer(url, this.config.testTimeout);

    return {
      success: result.success,
      latencyMs: result.latencyMs,
    };
  }

  /**
   * Test TURN connectivity
   */
  private async testTurnConnectivity(): Promise<{
    success: boolean;
    latencyMs?: number;
  }> {
    const turnServer = getTurnServerFromEnv();

    if (!turnServer) {
      return { success: false };
    }

    const result = await testTurnServer(turnServer, this.config.testTimeout);

    return {
      success: result.success,
      latencyMs: result.latencyMs,
    };
  }

  /**
   * Test connectivity to a specific peer
   */
  async testPeerConnectivity(peerId: string): Promise<NatTraversalResult> {
    const startTime = Date.now();

    // First try with STUN
    const stunResult = await this.testStunConnectivity();
    if (stunResult.success && !this.config.preferTurn) {
      return {
        success: true,
        method: "stun",
        latencyMs: stunResult.latencyMs || Date.now() - startTime,
        natType: this.cachedNatType || undefined,
        reflexiveAddress: this.cachedPublicIp || undefined,
      };
    }

    // Fall back to TURN
    const turnResult = await this.testTurnConnectivity();
    if (turnResult.success) {
      return {
        success: true,
        method: "turn",
        latencyMs: turnResult.latencyMs || Date.now() - startTime,
        natType: this.cachedNatType || undefined,
      };
    }

    // Both failed
    return {
      success: false,
      method: "direct",
      latencyMs: Date.now() - startTime,
      error: "Unable to establish connectivity",
    };
  }

  // ===========================================================================
  // Method Recommendation
  // ===========================================================================

  /**
   * Get recommended connection method based on NAT type and test results
   */
  getRecommendedMethod(
    natType: NatType,
    stunAvailable: boolean,
    turnAvailable: boolean,
  ): ConnectionMethod {
    // If prefer TURN is set, use it if available
    if (this.config.preferTurn && turnAvailable) {
      return "turn";
    }

    // Open NAT or full cone - direct connection should work
    if (natType === "open") {
      return "direct";
    }

    // Cone NAT types - STUN should work
    if (
      (natType === "full-cone" ||
        natType === "restricted" ||
        natType === "port-restricted") &&
      stunAvailable
    ) {
      return "stun";
    }

    // Symmetric NAT - need TURN relay
    if (natType === "symmetric") {
      return turnAvailable ? "turn" : "relay";
    }

    // Unknown or blocked - try TURN if available
    if (turnAvailable) {
      return "turn";
    }

    // Fall back to STUN if available
    if (stunAvailable) {
      return "stun";
    }

    // No options available
    return "direct";
  }

  /**
   * Get best connection method for peer-to-peer
   */
  async getBestConnectionMethod(): Promise<ConnectionMethod> {
    const connectivity = await this.testConnectivity();
    return connectivity.recommendedMethod;
  }

  // ===========================================================================
  // Fallback Handling
  // ===========================================================================

  /**
   * Attempt fallback to TURN relay
   */
  async fallbackToTurn(): Promise<boolean> {
    const turnServer = getTurnServerFromEnv();
    if (!turnServer) {
      logger.warn("No TURN server configured for fallback");
      return false;
    }

    const result = await testTurnServer(turnServer, this.config.testTimeout);
    return result.success;
  }

  /**
   * Check if TURN fallback is available
   */
  isTurnAvailable(): boolean {
    return !!getTurnServerFromEnv();
  }

  // ===========================================================================
  // Cache Management
  // ===========================================================================

  /**
   * Clear cached results
   */
  clearCache(): void {
    this.cachedNatType = null;
    this.cachedPublicIp = null;
    this.lastTestTime = 0;
  }

  /**
   * Get cached public IP
   */
  getPublicIp(): string | null {
    return this.cachedPublicIp;
  }

  /**
   * Get cached NAT type
   */
  getCachedNatType(): NatType | null {
    return this.cachedNatType;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createNatTraversalService(
  config?: Partial<NatTraversalConfig>,
): NatTraversalService {
  return new NatTraversalService(config);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if NAT type allows direct P2P connection
 */
export function canConnectDirectly(natType: NatType): boolean {
  return natType === "open" || natType === "full-cone";
}

/**
 * Check if NAT type requires TURN relay
 */
export function requiresTurnRelay(natType: NatType): boolean {
  return natType === "symmetric" || natType === "blocked";
}

/**
 * Get human-readable NAT type description
 */
export function getNatTypeDescription(natType: NatType): string {
  const descriptions: Record<NatType, string> = {
    open: "Open Internet (No NAT)",
    "full-cone": "Full Cone NAT",
    restricted: "Restricted Cone NAT",
    "port-restricted": "Port Restricted Cone NAT",
    symmetric: "Symmetric NAT",
    blocked: "UDP Blocked",
    unknown: "Unknown",
  };
  return descriptions[natType];
}

/**
 * Get connectivity difficulty level
 */
export function getConnectivityDifficulty(
  natType: NatType,
): "easy" | "medium" | "hard" | "impossible" {
  switch (natType) {
    case "open":
    case "full-cone":
      return "easy";
    case "restricted":
    case "port-restricted":
      return "medium";
    case "symmetric":
      return "hard";
    case "blocked":
      return "impossible";
    default:
      return "medium";
  }
}
