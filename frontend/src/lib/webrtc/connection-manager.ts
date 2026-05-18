/**
 * Connection Manager
 *
 * Manages multiple WebRTC peer connections, tracks connection states,
 * and handles reconnection logic.
 */

import {
  PeerConnectionManager,
  type PeerConnectionCallbacks,
  type PeerConnectionConfig,
} from "./peer-connection";
import { getIceServers } from "./servers";
import { IceCandidateManager, type IceManagerCallbacks } from "./ice";
import type { CallConnectionState } from "@/types/calls";

// =============================================================================
// Types
// =============================================================================

export interface ConnectionInfo {
  peerId: string;
  connection: PeerConnectionManager;
  state: CallConnectionState;
  createdAt: Date;
  connectedAt?: Date;
  reconnectAttempts: number;
  lastError?: Error;
  metadata?: Record<string, unknown>;
}

export interface ConnectionManagerConfig {
  /** Maximum reconnect attempts before giving up */
  maxReconnectAttempts: number;
  /** Base delay between reconnect attempts (ms) */
  reconnectDelay: number;
  /** Maximum reconnect delay (ms) */
  maxReconnectDelay: number;
  /** Backoff multiplier for reconnect delay */
  backoffMultiplier: number;
  /** Connection timeout (ms) */
  connectionTimeout: number;
  /** Peer connection config */
  peerConfig?: PeerConnectionConfig;
}

export interface ConnectionManagerCallbacks {
  onConnectionCreated?: (
    peerId: string,
    connection: PeerConnectionManager,
  ) => void;
  onConnectionStateChange?: (
    peerId: string,
    state: CallConnectionState,
  ) => void;
  onConnectionConnected?: (peerId: string) => void;
  onConnectionFailed?: (peerId: string, error: Error) => void;
  onConnectionClosed?: (peerId: string) => void;
  onReconnecting?: (peerId: string, attempt: number) => void;
  onReconnected?: (peerId: string) => void;
  onReconnectFailed?: (peerId: string) => void;
  onIceCandidate?: (peerId: string, candidate: RTCIceCandidate) => void;
  onTrack?: (peerId: string, event: RTCTrackEvent) => void;
  onNegotiationNeeded?: (peerId: string) => void;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_CONFIG: ConnectionManagerConfig = {
  maxReconnectAttempts: 5,
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
  backoffMultiplier: 2,
  connectionTimeout: 30000,
};

// =============================================================================
// Connection Manager Class
// =============================================================================

export class ConnectionManager {
  private connections: Map<string, ConnectionInfo> = new Map();
  private iceManager: IceCandidateManager;
  private config: ConnectionManagerConfig;
  private callbacks: ConnectionManagerCallbacks;
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private connectionTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    callbacks: ConnectionManagerCallbacks = {},
    config: Partial<ConnectionManagerConfig> = {},
  ) {
    this.callbacks = callbacks;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Create ICE manager with callbacks
    const iceCallbacks: IceManagerCallbacks = {
      onIceCandidate: (candidate) => {
        // Find which peer this candidate belongs to
        this.connections.forEach((info, peerId) => {
          if (info.connection.peerConnection?.localDescription) {
            this.callbacks.onIceCandidate?.(peerId, candidate);
          }
        });
      },
      onIceConnectionStateChange: (state) => {
        // Handle ICE connection state changes
        if (state === "failed" || state === "disconnected") {
          this.connections.forEach((info, peerId) => {
            if (info.connection.iceConnectionState === state) {
              this.handleConnectionFailure(peerId);
            }
          });
        }
      },
    };
    this.iceManager = new IceCandidateManager(iceCallbacks);
  }

  // ===========================================================================
  // Connection Lifecycle
  // ===========================================================================

  /**
   * Create a new peer connection
   */
  createConnection(
    peerId: string,
    metadata?: Record<string, unknown>,
  ): PeerConnectionManager {
    // Close existing connection if any
    if (this.connections.has(peerId)) {
      this.closeConnection(peerId);
    }

    // Create peer connection callbacks
    const peerCallbacks: PeerConnectionCallbacks = {
      onIceCandidate: (candidate) => {
        this.callbacks.onIceCandidate?.(peerId, candidate);
      },
      onConnectionStateChange: (state) => {
        this.handlePeerConnectionStateChange(peerId, state);
      },
      onIceConnectionStateChange: (state) => {
        this.handleIceConnectionStateChange(peerId, state);
      },
      onTrack: (event) => {
        this.callbacks.onTrack?.(peerId, event);
      },
      onNegotiationNeeded: () => {
        this.callbacks.onNegotiationNeeded?.(peerId);
      },
    };

    // Create peer connection with ICE servers
    const peerConfig: PeerConnectionConfig = {
      ...this.config.peerConfig,
      iceServers: getIceServers(),
    };

    const connection = new PeerConnectionManager(peerConfig, peerCallbacks);
    connection.create();

    // Register with ICE manager
    if (connection.peerConnection) {
      this.iceManager.registerConnection(peerId, connection.peerConnection);
    }

    // Store connection info
    const info: ConnectionInfo = {
      peerId,
      connection,
      state: "connecting",
      createdAt: new Date(),
      reconnectAttempts: 0,
      metadata,
    };
    this.connections.set(peerId, info);

    // Set connection timeout
    this.setConnectionTimeout(peerId);

    // Notify callback
    this.callbacks.onConnectionCreated?.(peerId, connection);
    this.callbacks.onConnectionStateChange?.(peerId, "connecting");

    return connection;
  }

  /**
   * Get existing connection
   */
  getConnection(peerId: string): PeerConnectionManager | undefined {
    return this.connections.get(peerId)?.connection;
  }

  /**
   * Get connection info
   */
  getConnectionInfo(peerId: string): ConnectionInfo | undefined {
    return this.connections.get(peerId);
  }

  /**
   * Get connection state
   */
  getState(peerId: string): CallConnectionState {
    return this.connections.get(peerId)?.state || "idle";
  }

  /**
   * Get all connection IDs
   */
  getConnectionIds(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Get all connections
   */
  getAllConnections(): Map<string, ConnectionInfo> {
    return new Map(this.connections);
  }

  /**
   * Check if a connection exists
   */
  hasConnection(peerId: string): boolean {
    return this.connections.has(peerId);
  }

  /**
   * Check if connection is connected
   */
  isConnected(peerId: string): boolean {
    return this.connections.get(peerId)?.state === "connected";
  }

  // ===========================================================================
  // Connection State Handling
  // ===========================================================================

  /**
   * Handle peer connection state change
   */
  private handlePeerConnectionStateChange(peerId: string, state: string): void {
    const info = this.connections.get(peerId);
    if (!info) return;

    let callState: CallConnectionState;

    switch (state) {
      case "new":
        callState = "connecting";
        break;
      case "connecting":
        callState = "connecting";
        break;
      case "connected":
        callState = "connected";
        this.handleConnectionSuccess(peerId);
        break;
      case "disconnected":
        callState = "reconnecting";
        this.handleConnectionFailure(peerId);
        break;
      case "failed":
        callState = "failed";
        this.handleConnectionFailure(peerId);
        break;
      case "closed":
        callState = "closed";
        break;
      default:
        callState = "idle";
    }

    this.updateState(peerId, callState);
  }

  /**
   * Handle ICE connection state change
   */
  private handleIceConnectionStateChange(peerId: string, state: string): void {
    if (state === "connected" || state === "completed") {
      this.handleConnectionSuccess(peerId);
    } else if (state === "failed" || state === "disconnected") {
      this.handleConnectionFailure(peerId);
    }
  }

  /**
   * Handle successful connection
   */
  private handleConnectionSuccess(peerId: string): void {
    const info = this.connections.get(peerId);
    if (!info) return;

    // Clear connection timeout
    this.clearConnectionTimeout(peerId);

    // Clear reconnect timer if any
    this.clearReconnectTimer(peerId);

    // Update info
    info.connectedAt = new Date();
    info.reconnectAttempts = 0;
    info.lastError = undefined;

    // Update state
    this.updateState(peerId, "connected");

    // Notify callbacks
    if (info.state !== "connected") {
      this.callbacks.onConnectionConnected?.(peerId);
    }

    // Check if this was a reconnection
    if (info.reconnectAttempts > 0) {
      this.callbacks.onReconnected?.(peerId);
    }
  }

  /**
   * Handle connection failure
   */
  handleConnectionFailure(peerId: string): void {
    const info = this.connections.get(peerId);
    if (!info) return;

    // Clear connection timeout
    this.clearConnectionTimeout(peerId);

    // Check if we should attempt reconnection
    if (info.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.updateState(peerId, "reconnecting");
      this.scheduleReconnect(peerId);
    } else {
      // Max attempts reached
      this.updateState(peerId, "failed");
      const error = new Error("Connection failed after max reconnect attempts");
      info.lastError = error;
      this.callbacks.onConnectionFailed?.(peerId, error);
      this.callbacks.onReconnectFailed?.(peerId);
    }
  }

  /**
   * Update connection state
   */
  private updateState(peerId: string, state: CallConnectionState): void {
    const info = this.connections.get(peerId);
    if (!info || info.state === state) return;

    info.state = state;
    this.callbacks.onConnectionStateChange?.(peerId, state);
  }

  // ===========================================================================
  // Reconnection
  // ===========================================================================

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(peerId: string): void {
    const info = this.connections.get(peerId);
    if (!info) return;

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.config.reconnectDelay *
        Math.pow(this.config.backoffMultiplier, info.reconnectAttempts),
      this.config.maxReconnectDelay,
    );

    info.reconnectAttempts++;

    // Notify callback
    this.callbacks.onReconnecting?.(peerId, info.reconnectAttempts);

    // Schedule reconnect
    const timer = setTimeout(() => {
      this.attemptReconnect(peerId);
    }, delay);
    this.reconnectTimers.set(peerId, timer);
  }

  /**
   * Attempt reconnection
   */
  async attemptReconnect(peerId: string): Promise<boolean> {
    const info = this.connections.get(peerId);
    if (!info) return false;

    try {
      // Restart ICE
      const offer = await info.connection.restartIce();
      if (offer) {
        // Notify that negotiation is needed
        this.callbacks.onNegotiationNeeded?.(peerId);
        return true;
      }
      return false;
    } catch (error) {
      info.lastError =
        error instanceof Error ? error : new Error("Reconnect failed");

      // Schedule next attempt if not at max
      if (info.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.scheduleReconnect(peerId);
      } else {
        this.handleConnectionFailure(peerId);
      }

      return false;
    }
  }

  /**
   * Manually trigger reconnection
   */
  reconnect(peerId: string): void {
    const info = this.connections.get(peerId);
    if (!info) return;

    // Reset attempts for manual reconnect
    info.reconnectAttempts = 0;
    this.updateState(peerId, "reconnecting");
    this.attemptReconnect(peerId);
  }

  /**
   * Clear reconnect timer
   */
  private clearReconnectTimer(peerId: string): void {
    const timer = this.reconnectTimers.get(peerId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(peerId);
    }
  }

  // ===========================================================================
  // Connection Timeout
  // ===========================================================================

  /**
   * Set connection timeout
   */
  private setConnectionTimeout(peerId: string): void {
    this.clearConnectionTimeout(peerId);

    const timer = setTimeout(() => {
      const info = this.connections.get(peerId);
      if (info && info.state === "connecting") {
        info.lastError = new Error("Connection timeout");
        this.handleConnectionFailure(peerId);
      }
    }, this.config.connectionTimeout);

    this.connectionTimers.set(peerId, timer);
  }

  /**
   * Clear connection timeout
   */
  private clearConnectionTimeout(peerId: string): void {
    const timer = this.connectionTimers.get(peerId);
    if (timer) {
      clearTimeout(timer);
      this.connectionTimers.delete(peerId);
    }
  }

  // ===========================================================================
  // ICE Candidate Handling
  // ===========================================================================

  /**
   * Add remote ICE candidate
   */
  async addIceCandidate(
    peerId: string,
    candidate: RTCIceCandidateInit,
  ): Promise<void> {
    await this.iceManager.addCandidate(peerId, candidate);
  }

  /**
   * Process pending ICE candidates
   */
  async processPendingCandidates(peerId: string): Promise<void> {
    await this.iceManager.processPendingCandidates(peerId);
  }

  // ===========================================================================
  // Connection Closure
  // ===========================================================================

  /**
   * Close a specific connection
   */
  closeConnection(peerId: string): void {
    const info = this.connections.get(peerId);
    if (!info) return;

    // Clear timers
    this.clearReconnectTimer(peerId);
    this.clearConnectionTimeout(peerId);

    // Unregister from ICE manager
    this.iceManager.unregisterConnection(peerId);

    // Close peer connection
    info.connection.close();

    // Remove from map
    this.connections.delete(peerId);

    // Update state and notify
    this.callbacks.onConnectionClosed?.(peerId);
    this.callbacks.onConnectionStateChange?.(peerId, "closed");
  }

  /**
   * Close all connections
   */
  closeAll(): void {
    const peerIds = Array.from(this.connections.keys());
    peerIds.forEach((peerId) => this.closeConnection(peerId));
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    this.closeAll();
    this.iceManager.cleanup();
    this.reconnectTimers.clear();
    this.connectionTimers.clear();
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  /**
   * Get statistics for a connection
   */
  async getConnectionStats(peerId: string): Promise<{
    bytesReceived: number;
    bytesSent: number;
    packetsLost: number;
    roundTripTime: number | null;
  } | null> {
    const info = this.connections.get(peerId);
    if (!info) return null;

    return info.connection.getConnectionStats();
  }

  /**
   * Get summary statistics
   */
  getSummaryStats(): {
    totalConnections: number;
    connectedCount: number;
    connectingCount: number;
    failedCount: number;
    reconnectingCount: number;
  } {
    let connectedCount = 0;
    let connectingCount = 0;
    let failedCount = 0;
    let reconnectingCount = 0;

    this.connections.forEach((info) => {
      switch (info.state) {
        case "connected":
          connectedCount++;
          break;
        case "connecting":
          connectingCount++;
          break;
        case "failed":
          failedCount++;
          break;
        case "reconnecting":
          reconnectingCount++;
          break;
      }
    });

    return {
      totalConnections: this.connections.size,
      connectedCount,
      connectingCount,
      failedCount,
      reconnectingCount,
    };
  }

  // ===========================================================================
  // Callbacks Update
  // ===========================================================================

  /**
   * Update callbacks
   */
  updateCallbacks(callbacks: Partial<ConnectionManagerCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createConnectionManager(
  callbacks?: ConnectionManagerCallbacks,
  config?: Partial<ConnectionManagerConfig>,
): ConnectionManager {
  return new ConnectionManager(callbacks, config);
}
