/**
 * Verification Service
 * Manages safety number verification state, history, and trust relationships
 */

import type { ApolloClient } from "@apollo/client";
import { gql } from "@apollo/client";
import {
  generateSafetyNumber,
  generateFingerprint,
  createVerificationRecord,
  createVerificationState,
  updateVerificationState,
  handleKeyChangeInState,
  detectKeyChange,
  createKeyChangeEvent,
  serializeVerificationState,
  deserializeVerificationState,
  verifySafetyNumber,
  verifyFingerprint,
  type VerificationState,
  type VerificationRecord,
  type VerificationMethod,
  type TrustLevel,
  type SafetyNumberResult,
  type IdentityKeyChange,
  type MismatchResult,
  SAFETY_NUMBER_VERSION,
} from "@/lib/e2ee/safety-number";
import {
  generateQRCode,
  parseQRCode,
  performMutualVerification,
  type QRGenerationResult,
  type QRScanResult,
  type QRVerificationResult,
} from "@/lib/e2ee/verification-qr";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";

// ============================================================================
// GRAPHQL QUERIES AND MUTATIONS
// ============================================================================

const GET_VERIFICATION_STATE = gql`
  query GetVerificationState($peerUserId: uuid!) {
    nchat_verification_states(where: { peer_user_id: { _eq: $peerUserId } }) {
      id
      peer_user_id
      state_data
      created_at
      updated_at
    }
  }
`;

const SAVE_VERIFICATION_STATE = gql`
  mutation SaveVerificationState($peerUserId: uuid!, $stateData: String!) {
    insert_nchat_verification_states_one(
      object: { peer_user_id: $peerUserId, state_data: $stateData }
      on_conflict: {
        constraint: nchat_verification_states_user_id_peer_user_id_key
        update_columns: [state_data, updated_at]
      }
    ) {
      id
    }
  }
`;

const GET_PEER_IDENTITY_KEY = gql`
  query GetPeerIdentityKey($userId: uuid!, $deviceId: String) {
    nchat_identity_keys(
      where: {
        user_id: { _eq: $userId }
        device_id: { _eq: $deviceId }
        is_active: { _eq: true }
      }
      order_by: { created_at: desc }
      limit: 1
    ) {
      identity_key_public
      device_id
      created_at
    }
  }
`;

const GET_ALL_PEER_IDENTITY_KEYS = gql`
  query GetAllPeerIdentityKeys($userId: uuid!) {
    nchat_identity_keys(
      where: { user_id: { _eq: $userId }, is_active: { _eq: true } }
      order_by: { created_at: desc }
    ) {
      identity_key_public
      device_id
      created_at
    }
  }
`;

const LOG_VERIFICATION_EVENT = gql`
  mutation LogVerificationEvent(
    $peerUserId: uuid!
    $eventType: String!
    $eventData: jsonb!
  ) {
    insert_nchat_verification_events_one(
      object: {
        peer_user_id: $peerUserId
        event_type: $eventType
        event_data: $eventData
      }
    ) {
      id
      created_at
    }
  }
`;

const GET_VERIFICATION_HISTORY = gql`
  query GetVerificationHistory($peerUserId: uuid!, $limit: Int = 50) {
    nchat_verification_events(
      where: { peer_user_id: { _eq: $peerUserId } }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      id
      event_type
      event_data
      created_at
    }
  }
`;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Event types for verification logging
 */
export type VerificationEventType =
  | "verification_completed"
  | "verification_removed"
  | "key_changed"
  | "trust_level_changed"
  | "qr_scan_attempt"
  | "numeric_comparison";

/**
 * Verification event log entry
 */
export interface VerificationEvent {
  id: string;
  peerUserId: string;
  eventType: VerificationEventType;
  eventData: Record<string, unknown>;
  createdAt: string;
}

/**
 * Options for verification service initialization
 */
export interface VerificationServiceOptions {
  /** Apollo client instance */
  apolloClient: ApolloClient<unknown>;
  /** Current user ID */
  userId: string;
  /** Current user's identity public key */
  identityKey: Uint8Array;
  /** Current device ID */
  deviceId: string;
  /** Enable automatic key change detection */
  autoDetectKeyChanges?: boolean;
}

/**
 * Peer info for verification
 */
export interface PeerInfo {
  userId: string;
  deviceId?: string;
  displayName?: string;
  identityKey?: Uint8Array;
}

/**
 * Verification summary for a peer
 */
export interface VerificationSummary {
  peerUserId: string;
  trustLevel: TrustLevel;
  isVerified: boolean;
  verifiedAt?: number;
  verificationMethod?: VerificationMethod;
  safetyNumber: string;
  formattedSafetyNumber: string;
  hasKeyChanged: boolean;
  keyChangeCount: number;
}

// ============================================================================
// VERIFICATION SERVICE
// ============================================================================

export class VerificationService {
  private apolloClient: ApolloClient<unknown>;
  private userId: string;
  private identityKey: Uint8Array;
  private deviceId: string;
  private autoDetectKeyChanges: boolean;

  // Local cache of verification states
  private stateCache: Map<string, VerificationState> = new Map();

  // Local cache of known peer identity keys
  private peerKeyCache: Map<string, Uint8Array> = new Map();

  // Event listeners for key changes
  private keyChangeListeners: Array<(event: IdentityKeyChange) => void> = [];

  constructor(options: VerificationServiceOptions) {
    this.apolloClient = options.apolloClient;
    this.userId = options.userId;
    this.identityKey = options.identityKey;
    this.deviceId = options.deviceId;
    this.autoDetectKeyChanges = options.autoDetectKeyChanges ?? true;
  }

  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================

  /**
   * Get verification state for a peer
   */
  async getVerificationState(peerUserId: string): Promise<VerificationState> {
    // Check cache first
    const cached = this.stateCache.get(peerUserId);
    if (cached) {
      return cached;
    }

    try {
      const { data } = await this.apolloClient.query({
        query: GET_VERIFICATION_STATE,
        variables: { peerUserId },
        fetchPolicy: "network-only",
      });

      if (data.nchat_verification_states.length > 0) {
        const stateData = data.nchat_verification_states[0].state_data;
        const state = deserializeVerificationState(stateData);
        this.stateCache.set(peerUserId, state);
        return state;
      }
    } catch (error) {
      // Database might not have the table yet, use local state
      console.warn("Failed to load verification state from server:", error);
    }

    // Create new state
    const newState = createVerificationState(peerUserId);
    this.stateCache.set(peerUserId, newState);
    return newState;
  }

  /**
   * Save verification state
   */
  async saveVerificationState(state: VerificationState): Promise<void> {
    this.stateCache.set(state.peerUserId, state);

    try {
      await this.apolloClient.mutate({
        mutation: SAVE_VERIFICATION_STATE,
        variables: {
          peerUserId: state.peerUserId,
          stateData: serializeVerificationState(state),
        },
      });
    } catch (error) {
      console.warn("Failed to save verification state to server:", error);
      // State is still cached locally
    }
  }

  // ==========================================================================
  // SAFETY NUMBER GENERATION
  // ==========================================================================

  /**
   * Generate safety number for a peer
   */
  async generateSafetyNumberForPeer(
    peerUserId: string,
    peerIdentityKey?: Uint8Array,
  ): Promise<SafetyNumberResult> {
    // Get peer identity key if not provided
    let key: Uint8Array | null | undefined = peerIdentityKey;
    if (!key) {
      key = await this.fetchPeerIdentityKey(peerUserId);
    }

    if (!key) {
      throw new Error("Peer identity key not found");
    }

    return generateSafetyNumber({
      localIdentityKey: this.identityKey,
      localUserId: this.userId,
      peerIdentityKey: key,
      peerUserId,
    });
  }

  /**
   * Fetch peer identity key from server
   */
  async fetchPeerIdentityKey(
    peerUserId: string,
    peerDeviceId?: string,
  ): Promise<Uint8Array | null> {
    const cacheKey = `${peerUserId}:${peerDeviceId || "default"}`;
    const cached = this.peerKeyCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const { data } = await this.apolloClient.query({
        query: peerDeviceId
          ? GET_PEER_IDENTITY_KEY
          : GET_ALL_PEER_IDENTITY_KEYS,
        variables: { userId: peerUserId, deviceId: peerDeviceId },
        fetchPolicy: "network-only",
      });

      const keys = data.nchat_identity_keys;
      if (keys.length > 0) {
        const key = new Uint8Array(keys[0].identity_key_public);
        this.peerKeyCache.set(cacheKey, key);

        // Check for key changes if auto-detect is enabled
        if (this.autoDetectKeyChanges) {
          await this.checkForKeyChange(peerUserId, key);
        }

        return key;
      }
    } catch (error) {
      console.warn("Failed to fetch peer identity key:", error);
    }

    return null;
  }

  // ==========================================================================
  // VERIFICATION OPERATIONS
  // ==========================================================================

  /**
   * Mark peer as verified
   */
  async verify(
    peerUserId: string,
    safetyNumber: string,
    method: VerificationMethod,
    notes?: string,
  ): Promise<VerificationRecord> {
    const peerKey = await this.fetchPeerIdentityKey(peerUserId);
    if (!peerKey) {
      throw new Error("Peer identity key not found");
    }

    // Generate expected safety number
    const expectedResult = await this.generateSafetyNumberForPeer(
      peerUserId,
      peerKey,
    );

    // Verify the safety number matches
    const verification = verifySafetyNumber(safetyNumber, expectedResult.raw);
    if (!verification.matches) {
      throw new Error(`Safety number mismatch: ${verification.reason}`);
    }

    // Create verification record
    const record = createVerificationRecord(
      peerUserId,
      peerKey,
      safetyNumber,
      method,
      undefined,
      notes,
    );

    // Update state
    const state = await this.getVerificationState(peerUserId);
    const updatedState = updateVerificationState(state, record);
    await this.saveVerificationState(updatedState);

    // Log event
    await this.logEvent(peerUserId, "verification_completed", {
      method,
      safetyNumber: safetyNumber.slice(0, 10) + "...", // Partial for privacy
    });

    return record;
  }

  /**
   * Remove verification for a peer
   */
  async unverify(peerUserId: string): Promise<void> {
    const state = await this.getVerificationState(peerUserId);

    if (!state.currentVerification) {
      return; // Already not verified
    }

    const updatedState: VerificationState = {
      ...state,
      trustLevel: "unknown",
      currentVerification: null,
      verificationHistory: state.currentVerification
        ? [...state.verificationHistory, state.currentVerification]
        : state.verificationHistory,
      lastUpdated: Date.now(),
    };

    await this.saveVerificationState(updatedState);

    await this.logEvent(peerUserId, "verification_removed", {});
  }

  /**
   * Get verification summary for a peer
   */
  async getVerificationSummary(
    peerUserId: string,
  ): Promise<VerificationSummary> {
    const state = await this.getVerificationState(peerUserId);
    const safetyNumberResult =
      await this.generateSafetyNumberForPeer(peerUserId);

    return {
      peerUserId,
      trustLevel: state.trustLevel,
      isVerified:
        state.trustLevel === "verified" &&
        state.currentVerification?.isValid === true,
      verifiedAt: state.currentVerification?.verifiedAt,
      verificationMethod: state.currentVerification?.method,
      safetyNumber: safetyNumberResult.raw,
      formattedSafetyNumber: safetyNumberResult.formatted,
      hasKeyChanged: state.keyChangeHistory.length > 0,
      keyChangeCount: state.keyChangeHistory.length,
    };
  }

  /**
   * Check if peer is verified
   */
  async isVerified(peerUserId: string): Promise<boolean> {
    const state = await this.getVerificationState(peerUserId);
    return (
      state.trustLevel === "verified" &&
      state.currentVerification?.isValid === true
    );
  }

  /**
   * Get trust level for a peer
   */
  async getTrustLevel(peerUserId: string): Promise<TrustLevel> {
    const state = await this.getVerificationState(peerUserId);
    return state.trustLevel;
  }

  // ==========================================================================
  // QR CODE OPERATIONS
  // ==========================================================================

  /**
   * Generate QR code for verification
   */
  generateQRCode(): QRGenerationResult {
    return generateQRCode(this.userId, this.identityKey);
  }

  /**
   * Process scanned QR code
   */
  async processScannedQRCode(
    qrData: string,
    expectedPeerUserId?: string,
  ): Promise<QRVerificationResult> {
    const scanResult = parseQRCode(qrData);

    if (!scanResult.success || !scanResult.payload) {
      return {
        verified: false,
        message: scanResult.error || "Failed to parse QR code",
        scannedAt: Date.now(),
      };
    }

    const payload = scanResult.payload;

    // Check expected peer
    if (expectedPeerUserId && payload.userId !== expectedPeerUserId) {
      return {
        verified: false,
        peerUserId: payload.userId,
        message: "QR code is from a different user than expected",
        scannedAt: Date.now(),
      };
    }

    // Fetch peer's actual identity key
    const peerKey = await this.fetchPeerIdentityKey(
      payload.userId,
      payload.deviceId,
    );
    if (!peerKey) {
      return {
        verified: false,
        peerUserId: payload.userId,
        message: "Could not fetch peer identity key for verification",
        scannedAt: Date.now(),
      };
    }

    // Perform verification
    const result = performMutualVerification(
      this.userId,
      this.identityKey,
      payload,
      peerKey,
    );

    // Log scan attempt
    await this.logEvent(payload.userId, "qr_scan_attempt", {
      verified: result.verified,
      deviceId: payload.deviceId,
    });

    return result;
  }

  /**
   * Complete QR code verification flow
   */
  async completeQRVerification(qrData: string): Promise<VerificationRecord> {
    const result = await this.processScannedQRCode(qrData);

    if (!result.verified || !result.peerUserId || !result.safetyNumber) {
      throw new Error(result.message);
    }

    return this.verify(result.peerUserId, result.safetyNumber, "qr_code_scan");
  }

  // ==========================================================================
  // NUMERIC COMPARISON
  // ==========================================================================

  /**
   * Verify using numeric comparison
   */
  async verifyNumericComparison(
    peerUserId: string,
    confirmedSafetyNumber: string,
  ): Promise<VerificationRecord> {
    // Log comparison attempt
    await this.logEvent(peerUserId, "numeric_comparison", {
      partialNumber: confirmedSafetyNumber.slice(0, 10) + "...",
    });

    return this.verify(peerUserId, confirmedSafetyNumber, "numeric_comparison");
  }

  // ==========================================================================
  // KEY CHANGE DETECTION
  // ==========================================================================

  /**
   * Check for identity key change
   */
  async checkForKeyChange(
    peerUserId: string,
    currentKey: Uint8Array,
  ): Promise<IdentityKeyChange | null> {
    const state = await this.getVerificationState(peerUserId);

    // Get previous key from state
    const previousFingerprint = state.currentFingerprint;
    if (!previousFingerprint) {
      // First time seeing this peer, store fingerprint
      const fingerprint = generateFingerprint(currentKey, peerUserId);
      const updatedState: VerificationState = {
        ...state,
        currentFingerprint: fingerprint,
        lastUpdated: Date.now(),
      };
      await this.saveVerificationState(updatedState);
      return null;
    }

    // Check if key changed
    const currentFingerprint = generateFingerprint(currentKey, peerUserId);
    const keyChanged = !previousFingerprint.every(
      (byte, i) => byte === currentFingerprint[i],
    );

    if (!keyChanged) {
      return null;
    }

    // Key has changed!
    const wasVerified = state.trustLevel === "verified";

    // We need to get the previous identity key to generate the old safety number
    // For now, we'll use the fingerprints directly
    const keyChangeEvent: IdentityKeyChange = {
      userId: peerUserId,
      previousFingerprint,
      newFingerprint: currentFingerprint,
      previousSafetyNumber: "", // Would need old key
      newSafetyNumber: "", // Will be computed when needed
      detectedAt: Date.now(),
      wasVerified,
    };

    // Update state
    const updatedState = handleKeyChangeInState(state, keyChangeEvent);
    await this.saveVerificationState(updatedState);

    // Log event
    await this.logEvent(peerUserId, "key_changed", {
      wasVerified,
      previousFingerprint: bytesToHex(previousFingerprint).slice(0, 16) + "...",
      newFingerprint: bytesToHex(currentFingerprint).slice(0, 16) + "...",
    });

    // Notify listeners
    this.notifyKeyChangeListeners(keyChangeEvent);

    return keyChangeEvent;
  }

  /**
   * Register key change listener
   */
  onKeyChange(listener: (event: IdentityKeyChange) => void): () => void {
    this.keyChangeListeners.push(listener);
    return () => {
      const index = this.keyChangeListeners.indexOf(listener);
      if (index >= 0) {
        this.keyChangeListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all key change listeners
   */
  private notifyKeyChangeListeners(event: IdentityKeyChange): void {
    for (const listener of this.keyChangeListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error("Key change listener error:", error);
      }
    }
  }

  // ==========================================================================
  // HISTORY AND EVENTS
  // ==========================================================================

  /**
   * Log verification event
   */
  private async logEvent(
    peerUserId: string,
    eventType: VerificationEventType,
    eventData: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.apolloClient.mutate({
        mutation: LOG_VERIFICATION_EVENT,
        variables: {
          peerUserId,
          eventType,
          eventData,
        },
      });
    } catch (error) {
      // Non-critical, just log warning
      console.warn("Failed to log verification event:", error);
    }
  }

  /**
   * Get verification history for a peer
   */
  async getVerificationHistory(
    peerUserId: string,
    limit: number = 50,
  ): Promise<VerificationEvent[]> {
    try {
      const { data } = await this.apolloClient.query({
        query: GET_VERIFICATION_HISTORY,
        variables: { peerUserId, limit },
        fetchPolicy: "network-only",
      });

      return data.nchat_verification_events.map((event: any) => ({
        id: event.id,
        peerUserId,
        eventType: event.event_type,
        eventData: event.event_data,
        createdAt: event.created_at,
      }));
    } catch (error) {
      console.warn("Failed to fetch verification history:", error);
      return [];
    }
  }

  /**
   * Get all verification states
   */
  async getAllVerificationStates(): Promise<VerificationState[]> {
    return Array.from(this.stateCache.values());
  }

  /**
   * Get all verified peers
   */
  async getVerifiedPeers(): Promise<string[]> {
    const states = await this.getAllVerificationStates();
    return states
      .filter(
        (s) => s.trustLevel === "verified" && s.currentVerification?.isValid,
      )
      .map((s) => s.peerUserId);
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.stateCache.clear();
    this.peerKeyCache.clear();
  }

  /**
   * Clear cache for specific peer
   */
  clearPeerCache(peerUserId: string): void {
    this.stateCache.delete(peerUserId);
    // Clear all keys for this peer
    for (const key of this.peerKeyCache.keys()) {
      if (key.startsWith(peerUserId)) {
        this.peerKeyCache.delete(key);
      }
    }
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a verification service instance
 */
export function createVerificationService(
  options: VerificationServiceOptions,
): VerificationService {
  return new VerificationService(options);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default VerificationService;
