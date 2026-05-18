/**
 * Verification Service Tests
 * Comprehensive tests for the verification service
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import {
  VerificationService,
  createVerificationService,
  type VerificationServiceOptions,
} from "../verification.service";
import { generateRandomBytes, bytesToHex } from "@/lib/e2ee/crypto";
import type { TrustLevel, VerificationMethod } from "@/lib/e2ee/safety-number";

// ============================================================================
// MOCKS
// ============================================================================

// Mock Apollo Client
const createMockApolloClient = () => {
  const queryResponses = new Map<string, any>();
  const mutations: any[] = [];

  return {
    query: jest.fn(async ({ query, variables }: any) => {
      const queryString = query?.loc?.source?.body || query?.toString?.() || "";

      // Return mock data based on query type
      if (queryString.includes("GetVerificationState")) {
        const stored = queryResponses.get(
          `verification:${variables.peerUserId}`,
        );
        return {
          data: {
            nchat_verification_states: stored
              ? [{ id: "1", state_data: stored }]
              : [],
          },
        };
      }

      if (queryString.includes("GetAllPeerIdentityKeys")) {
        const key =
          queryResponses.get(`key:${variables.userId}`) ||
          generateRandomBytes(32);
        return {
          data: {
            nchat_identity_keys: [
              {
                identity_key_public: Array.from(key),
                device_id: "device-1",
                created_at: new Date().toISOString(),
              },
            ],
          },
        };
      }

      if (queryString.includes("GetPeerIdentityKey")) {
        const key =
          queryResponses.get(`key:${variables.userId}`) ||
          generateRandomBytes(32);
        return {
          data: {
            nchat_identity_keys: [
              {
                identity_key_public: Array.from(key),
                device_id: "device-1",
                created_at: new Date().toISOString(),
              },
            ],
          },
        };
      }

      if (queryString.includes("GetVerificationHistory")) {
        return {
          data: {
            nchat_verification_events: [],
          },
        };
      }

      return { data: {} };
    }),
    mutate: jest.fn(async ({ mutation, variables }: any) => {
      mutations.push({ mutation, variables });

      // Store verification state if saving
      const mutationString =
        mutation?.loc?.source?.body || mutation?.toString?.() || "";
      if (mutationString.includes("SaveVerificationState")) {
        queryResponses.set(
          `verification:${variables.peerId || variables.peerUserId}`,
          variables.stateData,
        );
      }

      return { data: { insert_nchat_verification_states_one: { id: "1" } } };
    }),
    // Test helpers
    _setQueryResponse: (key: string, value: any) =>
      queryResponses.set(key, value),
    _getMutations: () => mutations,
    _clearMutations: () => (mutations.length = 0),
  };
};

// ============================================================================
// TEST SETUP
// ============================================================================

describe("VerificationService", () => {
  let mockApolloClient: ReturnType<typeof createMockApolloClient>;
  let service: VerificationService;
  let localUserId: string;
  let localIdentityKey: Uint8Array;
  let deviceId: string;

  beforeEach(() => {
    mockApolloClient = createMockApolloClient();
    localUserId = "local-user-" + Date.now();
    localIdentityKey = generateRandomBytes(32);
    deviceId = "device-" + Date.now();

    service = createVerificationService({
      apolloClient: mockApolloClient as any,
      userId: localUserId,
      identityKey: localIdentityKey,
      deviceId,
      autoDetectKeyChanges: true,
    });
  });

  // ==========================================================================
  // INITIALIZATION TESTS
  // ==========================================================================

  describe("Initialization", () => {
    it("creates service with factory function", () => {
      const options: VerificationServiceOptions = {
        apolloClient: mockApolloClient as any,
        userId: "test-user",
        identityKey: generateRandomBytes(32),
        deviceId: "device-1",
      };

      const svc = createVerificationService(options);

      expect(svc).toBeInstanceOf(VerificationService);
    });

    it("creates service with constructor", () => {
      const svc = new VerificationService({
        apolloClient: mockApolloClient as any,
        userId: "test-user",
        identityKey: generateRandomBytes(32),
        deviceId: "device-1",
      });

      expect(svc).toBeInstanceOf(VerificationService);
    });

    it("defaults autoDetectKeyChanges to true", () => {
      const svc = createVerificationService({
        apolloClient: mockApolloClient as any,
        userId: "test-user",
        identityKey: generateRandomBytes(32),
        deviceId: "device-1",
      });

      expect(svc).toBeDefined();
    });
  });

  // ==========================================================================
  // STATE MANAGEMENT TESTS
  // ==========================================================================

  describe("State Management", () => {
    it("gets initial verification state for new peer", async () => {
      const peerUserId = "peer-user-1";

      const state = await service.getVerificationState(peerUserId);

      expect(state.peerUserId).toBe(peerUserId);
      expect(state.trustLevel).toBe("unknown");
      expect(state.currentVerification).toBeNull();
    });

    it("caches verification state locally", async () => {
      const peerUserId = "peer-user-2";

      const state1 = await service.getVerificationState(peerUserId);
      const state2 = await service.getVerificationState(peerUserId);

      // Should only query once
      expect(mockApolloClient.query).toHaveBeenCalledTimes(1);
      expect(state1).toBe(state2);
    });

    it("saves verification state to database", async () => {
      const peerUserId = "peer-user-3";
      const state = await service.getVerificationState(peerUserId);

      await service.saveVerificationState(state);

      expect(mockApolloClient.mutate).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // SAFETY NUMBER GENERATION TESTS
  // ==========================================================================

  describe("Safety Number Generation", () => {
    it("generates safety number for peer with provided key", async () => {
      const peerUserId = "peer-user-4";
      const peerKey = generateRandomBytes(32);

      const result = await service.generateSafetyNumberForPeer(
        peerUserId,
        peerKey,
      );

      expect(result.raw).toHaveLength(60);
      expect(result.formatted).toContain(" ");
      expect(result.displayGrid).toHaveLength(2);
    });

    it("fetches peer key if not provided", async () => {
      const peerUserId = "peer-user-5";
      const peerKey = generateRandomBytes(32);
      mockApolloClient._setQueryResponse(`key:${peerUserId}`, peerKey);

      const result = await service.generateSafetyNumberForPeer(peerUserId);

      expect(result.raw).toHaveLength(60);
      expect(mockApolloClient.query).toHaveBeenCalled();
    });

    it("caches fetched peer keys", async () => {
      const peerUserId = "peer-user-6";
      const peerKey = generateRandomBytes(32);
      mockApolloClient._setQueryResponse(`key:${peerUserId}`, peerKey);

      // Create service with auto detect disabled to avoid extra queries
      const svc = createVerificationService({
        apolloClient: mockApolloClient as any,
        userId: localUserId,
        identityKey: localIdentityKey,
        deviceId,
        autoDetectKeyChanges: false,
      });

      const initialQueryCount = (mockApolloClient.query as jest.Mock).mock.calls
        .length;

      await svc.fetchPeerIdentityKey(peerUserId);
      await svc.fetchPeerIdentityKey(peerUserId);

      // Should only have made one additional query (cached second time)
      expect(
        (mockApolloClient.query as jest.Mock).mock.calls.length -
          initialQueryCount,
      ).toBe(1);
    });
  });

  // ==========================================================================
  // VERIFICATION TESTS
  // ==========================================================================

  describe("Verification Operations", () => {
    it("verifies peer with valid safety number", async () => {
      const peerUserId = "peer-user-7";
      const peerKey = generateRandomBytes(32);
      mockApolloClient._setQueryResponse(`key:${peerUserId}`, peerKey);

      // Generate expected safety number
      const safetyNumber = await service.generateSafetyNumberForPeer(
        peerUserId,
        peerKey,
      );

      const record = await service.verify(
        peerUserId,
        safetyNumber.raw,
        "numeric_comparison",
      );

      expect(record.peerUserId).toBe(peerUserId);
      expect(record.method).toBe("numeric_comparison");
      expect(record.isValid).toBe(true);
    });

    it("rejects verification with mismatched safety number", async () => {
      const peerUserId = "peer-user-8";
      const peerKey = generateRandomBytes(32);
      mockApolloClient._setQueryResponse(`key:${peerUserId}`, peerKey);

      const wrongSafetyNumber =
        "000000000000000000000000000000000000000000000000000000000000";

      await expect(
        service.verify(peerUserId, wrongSafetyNumber, "numeric_comparison"),
      ).rejects.toThrow("mismatch");
    });

    it("adds notes to verification record", async () => {
      const peerUserId = "peer-user-9";
      const peerKey = generateRandomBytes(32);
      mockApolloClient._setQueryResponse(`key:${peerUserId}`, peerKey);

      const safetyNumber = await service.generateSafetyNumberForPeer(
        peerUserId,
        peerKey,
      );

      const record = await service.verify(
        peerUserId,
        safetyNumber.raw,
        "in_person",
        "Met at conference",
      );

      expect(record.notes).toBe("Met at conference");
    });

    it("unverifies peer", async () => {
      const peerUserId = "peer-user-10";
      const peerKey = generateRandomBytes(32);
      mockApolloClient._setQueryResponse(`key:${peerUserId}`, peerKey);

      // First verify
      const safetyNumber = await service.generateSafetyNumberForPeer(
        peerUserId,
        peerKey,
      );
      await service.verify(peerUserId, safetyNumber.raw, "numeric_comparison");

      // Then unverify
      await service.unverify(peerUserId);

      const state = await service.getVerificationState(peerUserId);
      expect(state.trustLevel).toBe("unknown");
      expect(state.currentVerification).toBeNull();
    });

    it("returns verification summary", async () => {
      const peerUserId = "peer-user-11";
      const peerKey = generateRandomBytes(32);
      mockApolloClient._setQueryResponse(`key:${peerUserId}`, peerKey);

      const summary = await service.getVerificationSummary(peerUserId);

      expect(summary.peerUserId).toBe(peerUserId);
      expect(summary.trustLevel).toBe("unknown");
      expect(summary.isVerified).toBe(false);
      expect(summary.safetyNumber).toHaveLength(60);
    });

    it("checks if peer is verified", async () => {
      const peerUserId = "peer-user-12";
      const peerKey = generateRandomBytes(32);
      mockApolloClient._setQueryResponse(`key:${peerUserId}`, peerKey);

      // Not verified initially
      let isVerified = await service.isVerified(peerUserId);
      expect(isVerified).toBe(false);

      // Verify
      const safetyNumber = await service.generateSafetyNumberForPeer(
        peerUserId,
        peerKey,
      );
      await service.verify(peerUserId, safetyNumber.raw, "numeric_comparison");

      // Now verified
      isVerified = await service.isVerified(peerUserId);
      expect(isVerified).toBe(true);
    });

    it("gets trust level", async () => {
      const peerUserId = "peer-user-13";

      const trustLevel = await service.getTrustLevel(peerUserId);

      expect(trustLevel).toBe("unknown");
    });
  });

  // ==========================================================================
  // QR CODE TESTS
  // ==========================================================================

  describe("QR Code Operations", () => {
    it("generates QR code for local user", () => {
      const result = service.generateQRCode();

      expect(result.data).toContain("nchat:verify:");
      expect(result.payload).toBeDefined();
      expect(result.suggestedSize).toBeGreaterThan(0);
    });

    it("processes scanned QR code", async () => {
      const peerUserId = "peer-user-14";
      const peerKey = generateRandomBytes(32);
      mockApolloClient._setQueryResponse(`key:${peerUserId}`, peerKey);

      // Generate peer's QR code
      const { generateQRCode } = await import("@/lib/e2ee/verification-qr");
      const peerQR = generateQRCode(peerUserId, peerKey);

      const result = await service.processScannedQRCode(
        peerQR.data,
        peerUserId,
      );

      expect(result.verified).toBe(true);
      expect(result.peerUserId).toBe(peerUserId);
    });

    it("rejects QR code from unexpected peer", async () => {
      const expectedPeerId = "expected-peer";
      const actualPeerId = "actual-peer";
      const peerKey = generateRandomBytes(32);

      // Generate QR from actual peer
      const { generateQRCode } = await import("@/lib/e2ee/verification-qr");
      const peerQR = generateQRCode(actualPeerId, peerKey);

      const result = await service.processScannedQRCode(
        peerQR.data,
        expectedPeerId,
      );

      expect(result.verified).toBe(false);
      expect(result.message).toContain("different user");
    });

    it("completes QR verification flow", async () => {
      const peerUserId = "peer-user-15";
      const peerKey = generateRandomBytes(32);
      mockApolloClient._setQueryResponse(`key:${peerUserId}`, peerKey);

      // Generate peer's QR code
      const { generateQRCode } = await import("@/lib/e2ee/verification-qr");
      const peerQR = generateQRCode(peerUserId, peerKey);

      const record = await service.completeQRVerification(peerQR.data);

      expect(record.peerUserId).toBe(peerUserId);
      expect(record.method).toBe("qr_code_scan");
    });
  });

  // ==========================================================================
  // NUMERIC COMPARISON TESTS
  // ==========================================================================

  describe("Numeric Comparison", () => {
    it("verifies using numeric comparison", async () => {
      const peerUserId = "peer-user-16";
      const peerKey = generateRandomBytes(32);
      mockApolloClient._setQueryResponse(`key:${peerUserId}`, peerKey);

      const safetyNumber = await service.generateSafetyNumberForPeer(
        peerUserId,
        peerKey,
      );

      const record = await service.verifyNumericComparison(
        peerUserId,
        safetyNumber.raw,
      );

      expect(record.method).toBe("numeric_comparison");
      expect(record.isValid).toBe(true);
    });
  });

  // ==========================================================================
  // KEY CHANGE DETECTION TESTS
  // ==========================================================================

  describe("Key Change Detection", () => {
    it("detects key change for known peer", async () => {
      const peerUserId = "peer-user-17";
      const oldKey = generateRandomBytes(32);
      const newKey = generateRandomBytes(32);

      // First fetch to establish baseline
      mockApolloClient._setQueryResponse(`key:${peerUserId}`, oldKey);
      await service.fetchPeerIdentityKey(peerUserId);

      // Verify to set current fingerprint in state
      const safetyNumber = await service.generateSafetyNumberForPeer(
        peerUserId,
        oldKey,
      );
      await service.verify(peerUserId, safetyNumber.raw, "numeric_comparison");

      // Clear cache to force refetch
      service.clearPeerCache(peerUserId);

      // Simulate key change
      mockApolloClient._setQueryResponse(`key:${peerUserId}`, newKey);

      // Check for key change
      const keyChange = await service.checkForKeyChange(peerUserId, newKey);

      expect(keyChange).not.toBeNull();
      expect(keyChange?.userId).toBe(peerUserId);
      expect(keyChange?.wasVerified).toBe(true);
    });

    it("does not detect change for first-time peer", async () => {
      const peerUserId = "new-peer";
      const key = generateRandomBytes(32);

      const keyChange = await service.checkForKeyChange(peerUserId, key);

      expect(keyChange).toBeNull();
    });

    it("registers and notifies key change listeners", async () => {
      const peerUserId = "peer-user-18";
      const oldKey = generateRandomBytes(32);
      const newKey = generateRandomBytes(32);

      // Set up listener
      const listener = jest.fn();
      const unsubscribe = service.onKeyChange(listener);

      // Establish baseline and verify
      mockApolloClient._setQueryResponse(`key:${peerUserId}`, oldKey);
      const safetyNumber = await service.generateSafetyNumberForPeer(
        peerUserId,
        oldKey,
      );
      await service.verify(peerUserId, safetyNumber.raw, "numeric_comparison");

      // Clear cache and trigger key change
      service.clearPeerCache(peerUserId);
      mockApolloClient._setQueryResponse(`key:${peerUserId}`, newKey);
      await service.checkForKeyChange(peerUserId, newKey);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: peerUserId,
        }),
      );

      // Unsubscribe and verify no more calls
      unsubscribe();
      await service.checkForKeyChange(peerUserId, generateRandomBytes(32));

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // HISTORY TESTS
  // ==========================================================================

  describe("History", () => {
    it("gets verification history", async () => {
      const peerUserId = "peer-user-19";

      const history = await service.getVerificationHistory(peerUserId);

      expect(Array.isArray(history)).toBe(true);
    });

    it("gets all verification states", async () => {
      const peerUserId1 = "peer-user-20";
      const peerUserId2 = "peer-user-21";

      // Create states
      await service.getVerificationState(peerUserId1);
      await service.getVerificationState(peerUserId2);

      const states = await service.getAllVerificationStates();

      expect(states.length).toBeGreaterThanOrEqual(2);
    });

    it("gets verified peers list", async () => {
      const peerUserId = "peer-user-22";
      const peerKey = generateRandomBytes(32);
      mockApolloClient._setQueryResponse(`key:${peerUserId}`, peerKey);

      // Verify a peer
      const safetyNumber = await service.generateSafetyNumberForPeer(
        peerUserId,
        peerKey,
      );
      await service.verify(peerUserId, safetyNumber.raw, "numeric_comparison");

      const verifiedPeers = await service.getVerifiedPeers();

      expect(verifiedPeers).toContain(peerUserId);
    });
  });

  // ==========================================================================
  // CLEANUP TESTS
  // ==========================================================================

  describe("Cleanup", () => {
    it("clears all caches", async () => {
      const peerUserId = "peer-user-23";
      await service.getVerificationState(peerUserId);

      service.clearCaches();

      // Should fetch again after clear
      await service.getVerificationState(peerUserId);
      expect(mockApolloClient.query).toHaveBeenCalledTimes(2);
    });

    it("clears specific peer cache", async () => {
      const peerUserId = "peer-user-24";
      await service.getVerificationState(peerUserId);

      service.clearPeerCache(peerUserId);

      // Should fetch again after clear
      await service.getVerificationState(peerUserId);
      expect(mockApolloClient.query).toHaveBeenCalledTimes(2);
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe("VerificationService Integration", () => {
  it("handles complete verification workflow", async () => {
    const mockApolloClient = createMockApolloClient();

    // Create two users
    const aliceUserId = "alice-" + Date.now();
    const aliceKey = generateRandomBytes(32);
    const bobUserId = "bob-" + Date.now();
    const bobKey = generateRandomBytes(32);

    // Set up mock responses
    mockApolloClient._setQueryResponse(`key:${bobUserId}`, bobKey);
    mockApolloClient._setQueryResponse(`key:${aliceUserId}`, aliceKey);

    // Create Alice's service
    const aliceService = createVerificationService({
      apolloClient: mockApolloClient as any,
      userId: aliceUserId,
      identityKey: aliceKey,
      deviceId: "alice-device",
    });

    // Alice checks Bob's verification status
    let summary = await aliceService.getVerificationSummary(bobUserId);
    expect(summary.isVerified).toBe(false);
    expect(summary.trustLevel).toBe("unknown");

    // Alice verifies Bob
    const safetyNumber = summary.safetyNumber;
    await aliceService.verify(
      bobUserId,
      safetyNumber,
      "video_call",
      "Verified over Zoom",
    );

    // Check updated status
    summary = await aliceService.getVerificationSummary(bobUserId);
    expect(summary.isVerified).toBe(true);
    expect(summary.trustLevel).toBe("verified");

    // Alice unverifies Bob
    await aliceService.unverify(bobUserId);

    // Check final status
    summary = await aliceService.getVerificationSummary(bobUserId);
    expect(summary.isVerified).toBe(false);
    expect(summary.trustLevel).toBe("unknown");
  });

  it("handles key change scenario", async () => {
    const mockApolloClient = createMockApolloClient();

    const localUserId = "local-" + Date.now();
    const localKey = generateRandomBytes(32);
    const peerUserId = "peer-" + Date.now();
    const peerOldKey = generateRandomBytes(32);
    const peerNewKey = generateRandomBytes(32);

    mockApolloClient._setQueryResponse(`key:${peerUserId}`, peerOldKey);

    const service = createVerificationService({
      apolloClient: mockApolloClient as any,
      userId: localUserId,
      identityKey: localKey,
      deviceId: "device-1",
    });

    // Verify with old key
    const safetyNumber = await service.generateSafetyNumberForPeer(
      peerUserId,
      peerOldKey,
    );
    await service.verify(peerUserId, safetyNumber.raw, "in_person");

    // Confirm verified
    let isVerified = await service.isVerified(peerUserId);
    expect(isVerified).toBe(true);

    // Simulate key change
    service.clearPeerCache(peerUserId);
    mockApolloClient._setQueryResponse(`key:${peerUserId}`, peerNewKey);

    // Detect key change
    const keyChange = await service.checkForKeyChange(peerUserId, peerNewKey);
    expect(keyChange).not.toBeNull();
    expect(keyChange?.wasVerified).toBe(true);

    // Verification should be invalidated
    const state = await service.getVerificationState(peerUserId);
    expect(state.trustLevel).toBe("unverified");
    expect(state.currentVerification?.isValid).toBe(false);
  });
});
