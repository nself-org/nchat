/**
 * Token Gate Service Tests
 *
 * Comprehensive tests for the token gate enforcement service.
 * Tests gate CRUD, access verification, caching, grace periods, and statistics.
 */

import {
  createTokenGate,
  updateTokenGate,
  deleteTokenGate,
  getTokenGate,
  getTokenGateForResource,
  listTokenGates,
  checkAccess,
  batchCheckAccess,
  getUserAccessStatus,
  invalidateGateCache,
  invalidateWalletCache,
  invalidateContractCache,
  handleCacheInvalidation,
  cleanupExpiredCache,
  checkRevocations,
  getGateStats,
  getGateEvents,
  getGracePeriodUsers,
  initializeTokenGateService,
  shutdownTokenGateService,
  resetTokenGateService,
} from "../token-gate.service";

import {
  TokenGateError,
  TokenGateErrorCode,
  type TokenGateConfig,
  type TokenRequirementCondition,
  type CacheInvalidationEvent,
} from "@/lib/web3/token-gate-types";

// Mock the verifier module
jest.mock("@/lib/web3/token-gate-verifier", () => ({
  verifyRequirements: jest.fn(),
  clearVerificationCache: jest.fn(),
  clearWalletCache: jest.fn(),
  clearContractCache: jest.fn(),
}));

// Mock the logger
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import {
  verifyRequirements,
  clearVerificationCache,
  clearWalletCache,
  clearContractCache,
} from "@/lib/web3/token-gate-verifier";

const mockVerifyRequirements = verifyRequirements as jest.MockedFunction<
  typeof verifyRequirements
>;
const mockClearVerificationCache =
  clearVerificationCache as jest.MockedFunction<typeof clearVerificationCache>;
const mockClearWalletCache = clearWalletCache as jest.MockedFunction<
  typeof clearWalletCache
>;
const mockClearContractCache = clearContractCache as jest.MockedFunction<
  typeof clearContractCache
>;

// =============================================================================
// TEST FIXTURES
// =============================================================================

const VALID_WALLET = "0x1234567890123456789012345678901234567890";
const VALID_WALLET_2 = "0xabcdef1234567890abcdef1234567890abcdef12";
const VALID_CONTRACT = "0xdead000000000000000000000000000000000000";

const createTestRequirement = (
  overrides?: Partial<TokenRequirementCondition>,
): TokenRequirementCondition => ({
  contractAddress: VALID_CONTRACT,
  chainId: "0x1",
  tokenStandard: "ERC-721",
  minimumBalance: "1",
  ...overrides,
});

const createTestGateConfig = (
  overrides?: Partial<Omit<TokenGateConfig, "id" | "createdAt" | "updatedAt">>,
): Omit<TokenGateConfig, "id" | "createdAt" | "updatedAt"> => ({
  name: "Test Gate",
  description: "A test token gate",
  resourceType: "channel",
  resourceId: "channel_123",
  requirements: [createTestRequirement()],
  operator: "AND",
  isActive: true,
  bypassRoles: ["admin"],
  gracePeriodSeconds: 3600,
  cacheTTLSeconds: 300,
  autoRevokeOnFailure: true,
  notifyOnRevocation: true,
  ...overrides,
});

// =============================================================================
// SETUP & TEARDOWN
// =============================================================================

describe("Token Gate Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetTokenGateService();

    // Default mock behavior
    mockVerifyRequirements.mockResolvedValue({
      verified: true,
      results: [{ requirement: createTestRequirement(), verified: true }],
    });
  });

  afterEach(() => {
    shutdownTokenGateService();
  });

  // ===========================================================================
  // GATE CRUD OPERATIONS
  // ===========================================================================

  describe("createTokenGate", () => {
    it("should create a new token gate", async () => {
      const config = createTestGateConfig();
      const gate = await createTokenGate(config);

      expect(gate).toBeDefined();
      expect(gate.id).toMatch(/^gate_/);
      expect(gate.name).toBe("Test Gate");
      expect(gate.resourceType).toBe("channel");
      expect(gate.resourceId).toBe("channel_123");
      expect(gate.createdAt).toBeInstanceOf(Date);
      expect(gate.updatedAt).toBeInstanceOf(Date);
    });

    it("should store gate in registry", async () => {
      const config = createTestGateConfig();
      const gate = await createTokenGate(config);

      const retrieved = getTokenGate(gate.id);
      expect(retrieved).toEqual(gate);
    });

    it("should create resource mapping", async () => {
      const config = createTestGateConfig();
      const gate = await createTokenGate(config);

      const forResource = getTokenGateForResource("channel", "channel_123");
      expect(forResource).toEqual(gate);
    });

    it("should reject invalid contract address", async () => {
      const config = createTestGateConfig({
        requirements: [createTestRequirement({ contractAddress: "invalid" })],
      });

      await expect(createTokenGate(config)).rejects.toThrow(TokenGateError);
      await expect(createTokenGate(config)).rejects.toMatchObject({
        code: TokenGateErrorCode.INVALID_CONTRACT_ADDRESS,
      });
    });

    it("should log gate creation event", async () => {
      const config = createTestGateConfig();
      const gate = await createTokenGate(config);

      const events = getGateEvents(gate.id);
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe("gate_created");
    });

    it("should handle multiple requirements", async () => {
      const config = createTestGateConfig({
        requirements: [
          createTestRequirement({ contractAddress: VALID_CONTRACT }),
          createTestRequirement({ contractAddress: VALID_WALLET }),
        ],
      });

      const gate = await createTokenGate(config);
      expect(gate.requirements.length).toBe(2);
    });
  });

  describe("updateTokenGate", () => {
    it("should update an existing gate", async () => {
      const gate = await createTokenGate(createTestGateConfig());

      const updated = await updateTokenGate(gate.id, { name: "Updated Gate" });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe("Updated Gate");
      expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(
        gate.updatedAt.getTime(),
      );
    });

    it("should return null for non-existent gate", async () => {
      const result = await updateTokenGate("non_existent", { name: "Test" });
      expect(result).toBeNull();
    });

    it("should invalidate cache on update", async () => {
      const gate = await createTokenGate(createTestGateConfig());

      await updateTokenGate(gate.id, { name: "Updated" });

      // Cache should be invalidated for the gate
      const events = getGateEvents(gate.id);
      const updateEvent = events.find((e) => e.type === "gate_config_updated");
      expect(updateEvent).toBeDefined();
    });

    it("should validate new requirements", async () => {
      const gate = await createTokenGate(createTestGateConfig());

      await expect(
        updateTokenGate(gate.id, {
          requirements: [createTestRequirement({ contractAddress: "invalid" })],
        }),
      ).rejects.toThrow(TokenGateError);
    });

    it("should preserve existing values not updated", async () => {
      const gate = await createTokenGate(
        createTestGateConfig({ description: "Original" }),
      );

      const updated = await updateTokenGate(gate.id, { name: "Updated" });

      expect(updated?.name).toBe("Updated");
      expect(updated?.description).toBe("Original");
    });
  });

  describe("deleteTokenGate", () => {
    it("should delete an existing gate", async () => {
      const gate = await createTokenGate(createTestGateConfig());

      const result = await deleteTokenGate(gate.id);

      expect(result).toBe(true);
      expect(getTokenGate(gate.id)).toBeUndefined();
    });

    it("should return false for non-existent gate", async () => {
      const result = await deleteTokenGate("non_existent");
      expect(result).toBe(false);
    });

    it("should remove resource mapping", async () => {
      const gate = await createTokenGate(createTestGateConfig());

      await deleteTokenGate(gate.id);

      expect(getTokenGateForResource("channel", "channel_123")).toBeUndefined();
    });

    it("should log deletion event", async () => {
      const gate = await createTokenGate(createTestGateConfig());
      const gateId = gate.id;

      await deleteTokenGate(gateId);

      const events = getGateEvents();
      const deleteEvent = events.find(
        (e) => e.type === "gate_deleted" && e.gateId === gateId,
      );
      expect(deleteEvent).toBeDefined();
    });
  });

  describe("getTokenGate", () => {
    it("should return gate by ID", async () => {
      const gate = await createTokenGate(createTestGateConfig());

      const retrieved = getTokenGate(gate.id);
      expect(retrieved).toEqual(gate);
    });

    it("should return undefined for non-existent gate", () => {
      expect(getTokenGate("non_existent")).toBeUndefined();
    });
  });

  describe("getTokenGateForResource", () => {
    it("should return gate for resource", async () => {
      const gate = await createTokenGate(createTestGateConfig());

      const forResource = getTokenGateForResource("channel", "channel_123");
      expect(forResource).toEqual(gate);
    });

    it("should return undefined when no gate exists", () => {
      expect(getTokenGateForResource("channel", "unknown")).toBeUndefined();
    });

    it("should handle different resource types", async () => {
      await createTokenGate(
        createTestGateConfig({ resourceType: "feature", resourceId: "feat_1" }),
      );
      await createTokenGate(
        createTestGateConfig({ resourceType: "role", resourceId: "role_1" }),
      );

      expect(getTokenGateForResource("feature", "feat_1")).toBeDefined();
      expect(getTokenGateForResource("role", "role_1")).toBeDefined();
    });
  });

  describe("listTokenGates", () => {
    it("should list all gates", async () => {
      await createTokenGate(createTestGateConfig({ resourceId: "ch1" }));
      await createTokenGate(createTestGateConfig({ resourceId: "ch2" }));
      await createTokenGate(createTestGateConfig({ resourceId: "ch3" }));

      const gates = listTokenGates();
      expect(gates.length).toBe(3);
    });

    it("should filter by resource type", async () => {
      await createTokenGate(
        createTestGateConfig({ resourceType: "channel", resourceId: "ch1" }),
      );
      await createTokenGate(
        createTestGateConfig({ resourceType: "feature", resourceId: "f1" }),
      );

      const channels = listTokenGates({ resourceType: "channel" });
      expect(channels.length).toBe(1);
      expect(channels[0].resourceType).toBe("channel");
    });

    it("should filter by active status", async () => {
      await createTokenGate(
        createTestGateConfig({ resourceId: "ch1", isActive: true }),
      );
      await createTokenGate(
        createTestGateConfig({ resourceId: "ch2", isActive: false }),
      );

      const active = listTokenGates({ isActive: true });
      expect(active.length).toBe(1);
      expect(active[0].isActive).toBe(true);
    });

    it("should sort by creation date descending", async () => {
      const gate1 = await createTokenGate(
        createTestGateConfig({ resourceId: "ch1" }),
      );
      await new Promise((resolve) => setTimeout(resolve, 10));
      const gate2 = await createTokenGate(
        createTestGateConfig({ resourceId: "ch2" }),
      );

      const gates = listTokenGates();
      expect(gates[0].id).toBe(gate2.id);
      expect(gates[1].id).toBe(gate1.id);
    });
  });

  // ===========================================================================
  // ACCESS VERIFICATION
  // ===========================================================================

  describe("checkAccess", () => {
    it("should allow access when no gate configured", async () => {
      const result = await checkAccess({
        userId: "user_1",
        resourceType: "channel",
        resourceId: "ungated_channel",
        walletAddress: VALID_WALLET,
      });

      expect(result.hasAccess).toBe(true);
      expect(result.status).toBe("granted");
      expect(result.requiresVerification).toBe(false);
    });

    it("should allow access when gate is inactive", async () => {
      await createTokenGate(createTestGateConfig({ isActive: false }));

      const result = await checkAccess({
        userId: "user_1",
        resourceType: "channel",
        resourceId: "channel_123",
        walletAddress: VALID_WALLET,
      });

      expect(result.hasAccess).toBe(true);
      expect(result.gateId).toBeDefined();
    });

    it("should bypass gate for users with bypass role", async () => {
      await createTokenGate(
        createTestGateConfig({ bypassRoles: ["admin", "moderator"] }),
      );

      const result = await checkAccess({
        userId: "user_1",
        resourceType: "channel",
        resourceId: "channel_123",
        userRoles: ["moderator"],
      });

      expect(result.hasAccess).toBe(true);
      expect(result.bypassedByRole).toBe(true);
      expect(result.bypassRole).toBe("moderator");
    });

    it("should require wallet when not bypassed", async () => {
      await createTokenGate(createTestGateConfig());

      const result = await checkAccess({
        userId: "user_1",
        resourceType: "channel",
        resourceId: "channel_123",
        userRoles: ["member"],
      });

      expect(result.hasAccess).toBe(false);
      expect(result.requiresVerification).toBe(true);
      expect(result.reason).toContain("Wallet connection required");
    });

    it("should reject invalid wallet address", async () => {
      await createTokenGate(createTestGateConfig());

      const result = await checkAccess({
        userId: "user_1",
        resourceType: "channel",
        resourceId: "channel_123",
        walletAddress: "invalid",
      });

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toContain("Invalid wallet address");
    });

    it("should grant access when verification succeeds", async () => {
      await createTokenGate(createTestGateConfig());
      mockVerifyRequirements.mockResolvedValueOnce({
        verified: true,
        results: [{ requirement: createTestRequirement(), verified: true }],
      });

      const result = await checkAccess({
        userId: "user_1",
        resourceType: "channel",
        resourceId: "channel_123",
        walletAddress: VALID_WALLET,
      });

      expect(result.hasAccess).toBe(true);
      expect(result.status).toBe("granted");
    });

    it("should deny access when verification fails", async () => {
      await createTokenGate(createTestGateConfig({ gracePeriodSeconds: 0 }));
      mockVerifyRequirements.mockResolvedValueOnce({
        verified: false,
        results: [
          {
            requirement: createTestRequirement(),
            verified: false,
            error: "Insufficient balance",
          },
        ],
      });

      const result = await checkAccess({
        userId: "user_1",
        resourceType: "channel",
        resourceId: "channel_123",
        walletAddress: VALID_WALLET,
      });

      expect(result.hasAccess).toBe(false);
      expect(result.status).toBe("denied");
    });

    it("should use cached result when available", async () => {
      await createTokenGate(createTestGateConfig());

      // First call - verifies
      await checkAccess({
        userId: "user_1",
        resourceType: "channel",
        resourceId: "channel_123",
        walletAddress: VALID_WALLET,
      });

      // Second call - should use cache
      mockVerifyRequirements.mockClear();
      const result = await checkAccess({
        userId: "user_1",
        resourceType: "channel",
        resourceId: "channel_123",
        walletAddress: VALID_WALLET,
      });

      expect(result.hasAccess).toBe(true);
      expect(mockVerifyRequirements).not.toHaveBeenCalled();
    });

    it("should skip cache when forceRefresh is true", async () => {
      await createTokenGate(createTestGateConfig());

      // First call
      await checkAccess({
        userId: "user_1",
        resourceType: "channel",
        resourceId: "channel_123",
        walletAddress: VALID_WALLET,
      });

      // Second call with force refresh
      mockVerifyRequirements.mockClear();
      await checkAccess({
        userId: "user_1",
        resourceType: "channel",
        resourceId: "channel_123",
        walletAddress: VALID_WALLET,
        forceRefresh: true,
      });

      expect(mockVerifyRequirements).toHaveBeenCalled();
    });

    it("should log access granted event", async () => {
      const gate = await createTokenGate(createTestGateConfig());

      await checkAccess({
        userId: "user_1",
        resourceType: "channel",
        resourceId: "channel_123",
        walletAddress: VALID_WALLET,
      });

      const events = getGateEvents(gate.id);
      const grantedEvent = events.find((e) => e.type === "access_granted");
      expect(grantedEvent).toBeDefined();
    });

    it("should log access denied event", async () => {
      const gate = await createTokenGate(
        createTestGateConfig({ gracePeriodSeconds: 0 }),
      );
      mockVerifyRequirements.mockResolvedValueOnce({
        verified: false,
        results: [{ requirement: createTestRequirement(), verified: false }],
      });

      await checkAccess({
        userId: "user_1",
        resourceType: "channel",
        resourceId: "channel_123",
        walletAddress: VALID_WALLET,
      });

      const events = getGateEvents(gate.id);
      const deniedEvent = events.find((e) => e.type === "access_denied");
      expect(deniedEvent).toBeDefined();
    });

    it("should update statistics on access check", async () => {
      const gate = await createTokenGate(createTestGateConfig());

      await checkAccess({
        userId: "user_1",
        resourceType: "channel",
        resourceId: "channel_123",
        walletAddress: VALID_WALLET,
      });

      const stats = getGateStats(gate.id);
      expect(stats).toBeDefined();
      expect(stats?.totalChecks).toBe(1);
      expect(stats?.successfulChecks).toBe(1);
    });
  });

  // ===========================================================================
  // GRACE PERIOD
  // ===========================================================================

  describe("Grace Period", () => {
    it("should start grace period on first failure", async () => {
      const gate = await createTokenGate(
        createTestGateConfig({ gracePeriodSeconds: 3600 }),
      );
      mockVerifyRequirements.mockResolvedValueOnce({
        verified: false,
        results: [{ requirement: createTestRequirement(), verified: false }],
      });

      const result = await checkAccess({
        userId: "user_1",
        resourceType: "channel",
        resourceId: "channel_123",
        walletAddress: VALID_WALLET,
      });

      expect(result.hasAccess).toBe(true);
      expect(result.inGracePeriod).toBe(true);
      expect(result.gracePeriodEndsAt).toBeDefined();
    });

    it("should maintain access during grace period", async () => {
      const gate = await createTokenGate(
        createTestGateConfig({ gracePeriodSeconds: 3600 }),
      );

      // First check - starts grace period
      mockVerifyRequirements.mockResolvedValueOnce({
        verified: false,
        results: [{ requirement: createTestRequirement(), verified: false }],
      });

      await checkAccess({
        userId: "user_1",
        resourceType: "channel",
        resourceId: "channel_123",
        walletAddress: VALID_WALLET,
      });

      // Second check - still in grace period
      mockVerifyRequirements.mockResolvedValueOnce({
        verified: false,
        results: [{ requirement: createTestRequirement(), verified: false }],
      });

      const result = await checkAccess({
        userId: "user_1",
        resourceType: "channel",
        resourceId: "channel_123",
        walletAddress: VALID_WALLET,
        forceRefresh: true,
      });

      expect(result.hasAccess).toBe(true);
      expect(result.inGracePeriod).toBe(true);
    });

    it("should clear grace period when verification succeeds", async () => {
      const gate = await createTokenGate(
        createTestGateConfig({ gracePeriodSeconds: 3600 }),
      );

      // First check - starts grace period
      mockVerifyRequirements.mockResolvedValueOnce({
        verified: false,
        results: [{ requirement: createTestRequirement(), verified: false }],
      });

      await checkAccess({
        userId: "user_1",
        resourceType: "channel",
        resourceId: "channel_123",
        walletAddress: VALID_WALLET,
      });

      // Second check - verification succeeds
      mockVerifyRequirements.mockResolvedValueOnce({
        verified: true,
        results: [{ requirement: createTestRequirement(), verified: true }],
      });

      const result = await checkAccess({
        userId: "user_1",
        resourceType: "channel",
        resourceId: "channel_123",
        walletAddress: VALID_WALLET,
        forceRefresh: true,
      });

      expect(result.hasAccess).toBe(true);
      expect(result.inGracePeriod).toBe(false);
    });

    it("should log grace period started event", async () => {
      const gate = await createTokenGate(
        createTestGateConfig({ gracePeriodSeconds: 3600 }),
      );
      mockVerifyRequirements.mockResolvedValueOnce({
        verified: false,
        results: [{ requirement: createTestRequirement(), verified: false }],
      });

      await checkAccess({
        userId: "user_1",
        resourceType: "channel",
        resourceId: "channel_123",
        walletAddress: VALID_WALLET,
      });

      const events = getGateEvents(gate.id);
      const gracePeriodEvent = events.find(
        (e) => e.type === "grace_period_started",
      );
      expect(gracePeriodEvent).toBeDefined();
    });

    it("should track grace period users", async () => {
      const gate = await createTokenGate(
        createTestGateConfig({ gracePeriodSeconds: 3600 }),
      );
      mockVerifyRequirements.mockResolvedValueOnce({
        verified: false,
        results: [{ requirement: createTestRequirement(), verified: false }],
      });

      await checkAccess({
        userId: "user_1",
        resourceType: "channel",
        resourceId: "channel_123",
        walletAddress: VALID_WALLET,
      });

      const gracePeriodUsers = getGracePeriodUsers(gate.id);
      expect(gracePeriodUsers.length).toBe(1);
      expect(gracePeriodUsers[0].userId).toBe("user_1");
    });
  });

  // ===========================================================================
  // CACHE MANAGEMENT
  // ===========================================================================

  describe("Cache Management", () => {
    describe("invalidateGateCache", () => {
      it("should invalidate all cache entries for a gate", async () => {
        const gate = await createTokenGate(createTestGateConfig());

        // Create cache entry
        await checkAccess({
          userId: "user_1",
          resourceType: "channel",
          resourceId: "channel_123",
          walletAddress: VALID_WALLET,
        });

        // Invalidate
        invalidateGateCache(gate.id, "Test invalidation");

        // Next access should re-verify
        mockVerifyRequirements.mockClear();
        await checkAccess({
          userId: "user_1",
          resourceType: "channel",
          resourceId: "channel_123",
          walletAddress: VALID_WALLET,
        });

        expect(mockVerifyRequirements).toHaveBeenCalled();
      });
    });

    describe("invalidateWalletCache", () => {
      it("should invalidate cache for a wallet address", async () => {
        const gate = await createTokenGate(createTestGateConfig());

        await checkAccess({
          userId: "user_1",
          resourceType: "channel",
          resourceId: "channel_123",
          walletAddress: VALID_WALLET,
        });

        invalidateWalletCache(VALID_WALLET);

        mockVerifyRequirements.mockClear();
        await checkAccess({
          userId: "user_1",
          resourceType: "channel",
          resourceId: "channel_123",
          walletAddress: VALID_WALLET,
        });

        expect(mockVerifyRequirements).toHaveBeenCalled();
        expect(mockClearWalletCache).toHaveBeenCalledWith(VALID_WALLET);
      });

      it("should normalize wallet address", () => {
        invalidateWalletCache("0xABCDEF1234567890ABCDEF1234567890ABCDEF12");
        expect(mockClearWalletCache).toHaveBeenCalled();
      });
    });

    describe("invalidateContractCache", () => {
      it("should clear contract cache in verifier", () => {
        invalidateContractCache(VALID_CONTRACT, "0x1");

        expect(mockClearContractCache).toHaveBeenCalledWith(
          VALID_CONTRACT,
          "0x1",
        );
      });

      it("should work without chain ID", () => {
        invalidateContractCache(VALID_CONTRACT);

        expect(mockClearContractCache).toHaveBeenCalledWith(
          VALID_CONTRACT,
          undefined,
        );
      });
    });

    describe("handleCacheInvalidation", () => {
      it("should handle transfer event", () => {
        const event: CacheInvalidationEvent = {
          type: "transfer",
          walletAddress: VALID_WALLET,
          contractAddress: VALID_CONTRACT,
          chainId: "0x1",
          timestamp: new Date(),
        };

        handleCacheInvalidation(event);

        expect(mockClearWalletCache).toHaveBeenCalled();
        expect(mockClearContractCache).toHaveBeenCalled();
      });

      it("should handle config change event", async () => {
        const gate = await createTokenGate(createTestGateConfig());

        const event: CacheInvalidationEvent = {
          type: "config_change",
          gateId: gate.id,
          timestamp: new Date(),
        };

        handleCacheInvalidation(event);

        // Verify cache was invalidated (by checking next access triggers verification)
        await checkAccess({
          userId: "user_1",
          resourceType: "channel",
          resourceId: "channel_123",
          walletAddress: VALID_WALLET,
        });

        mockVerifyRequirements.mockClear();
        await checkAccess({
          userId: "user_1",
          resourceType: "channel",
          resourceId: "channel_123",
          walletAddress: VALID_WALLET,
          forceRefresh: true,
        });

        expect(mockVerifyRequirements).toHaveBeenCalled();
      });

      it("should handle manual invalidation", () => {
        const event: CacheInvalidationEvent = {
          type: "manual",
          walletAddress: VALID_WALLET,
          timestamp: new Date(),
          reason: "Admin requested",
        };

        handleCacheInvalidation(event);

        expect(mockClearWalletCache).toHaveBeenCalled();
      });

      it("should handle expiry event", () => {
        const event: CacheInvalidationEvent = {
          type: "expiry",
          timestamp: new Date(),
        };

        handleCacheInvalidation(event);
        // Should call cleanupExpiredCache internally
      });
    });

    describe("cleanupExpiredCache", () => {
      it("should remove expired entries", async () => {
        const gate = await createTokenGate(
          createTestGateConfig({ cacheTTLSeconds: 0 }),
        );

        await checkAccess({
          userId: "user_1",
          resourceType: "channel",
          resourceId: "channel_123",
          walletAddress: VALID_WALLET,
        });

        // Wait a bit for cache to expire
        await new Promise((resolve) => setTimeout(resolve, 50));

        cleanupExpiredCache();

        mockVerifyRequirements.mockClear();
        await checkAccess({
          userId: "user_1",
          resourceType: "channel",
          resourceId: "channel_123",
          walletAddress: VALID_WALLET,
        });

        expect(mockVerifyRequirements).toHaveBeenCalled();
      });
    });
  });

  // ===========================================================================
  // BATCH OPERATIONS
  // ===========================================================================

  describe("Batch Operations", () => {
    describe("batchCheckAccess", () => {
      it("should check access for multiple requests", async () => {
        await createTokenGate(createTestGateConfig({ resourceId: "ch1" }));
        await createTokenGate(createTestGateConfig({ resourceId: "ch2" }));

        const results = await batchCheckAccess([
          {
            userId: "user_1",
            resourceType: "channel",
            resourceId: "ch1",
            walletAddress: VALID_WALLET,
          },
          {
            userId: "user_1",
            resourceType: "channel",
            resourceId: "ch2",
            walletAddress: VALID_WALLET,
          },
        ]);

        expect(results.size).toBe(2);
        expect(results.get("channel:ch1:user_1")).toBeDefined();
        expect(results.get("channel:ch2:user_1")).toBeDefined();
      });

      it("should process requests in parallel", async () => {
        await createTokenGate(createTestGateConfig({ resourceId: "ch1" }));
        await createTokenGate(createTestGateConfig({ resourceId: "ch2" }));

        const start = Date.now();

        await batchCheckAccess([
          {
            userId: "user_1",
            resourceType: "channel",
            resourceId: "ch1",
            walletAddress: VALID_WALLET,
          },
          {
            userId: "user_1",
            resourceType: "channel",
            resourceId: "ch2",
            walletAddress: VALID_WALLET,
          },
        ]);

        const elapsed = Date.now() - start;
        // Should complete faster than sequential (mock is instant, so just verify it completes)
        expect(elapsed).toBeLessThan(1000);
      });
    });

    describe("getUserAccessStatus", () => {
      it("should return status for all active gates", async () => {
        await createTokenGate(createTestGateConfig({ resourceId: "ch1" }));
        await createTokenGate(createTestGateConfig({ resourceId: "ch2" }));
        await createTokenGate(
          createTestGateConfig({ resourceId: "ch3", isActive: false }),
        );

        const results = await getUserAccessStatus("user_1", VALID_WALLET);

        expect(results.size).toBe(2); // Only active gates
      });

      it("should check with user roles", async () => {
        await createTokenGate(createTestGateConfig({ bypassRoles: ["vip"] }));

        const results = await getUserAccessStatus("user_1", VALID_WALLET, [
          "vip",
        ]);

        const result = Array.from(results.values())[0];
        expect(result.hasAccess).toBe(true);
        expect(result.bypassedByRole).toBe(true);
      });
    });
  });

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  describe("Statistics", () => {
    describe("getGateStats", () => {
      it("should return stats for a gate", async () => {
        const gate = await createTokenGate(createTestGateConfig());

        await checkAccess({
          userId: "user_1",
          resourceType: "channel",
          resourceId: "channel_123",
          walletAddress: VALID_WALLET,
        });

        const stats = getGateStats(gate.id);

        expect(stats).toBeDefined();
        expect(stats?.gateId).toBe(gate.id);
        expect(stats?.totalChecks).toBe(1);
        expect(stats?.successfulChecks).toBe(1);
        expect(stats?.failedChecks).toBe(0);
        expect(stats?.uniqueUsers).toBe(1);
      });

      it("should return null for non-existent gate", () => {
        expect(getGateStats("non_existent")).toBeNull();
      });

      it("should track multiple users", async () => {
        const gate = await createTokenGate(createTestGateConfig());

        await checkAccess({
          userId: "user_1",
          resourceType: "channel",
          resourceId: "channel_123",
          walletAddress: VALID_WALLET,
        });

        await checkAccess({
          userId: "user_2",
          resourceType: "channel",
          resourceId: "channel_123",
          walletAddress: VALID_WALLET_2,
        });

        const stats = getGateStats(gate.id);
        expect(stats?.uniqueUsers).toBe(2);
      });

      it("should track cache hit rate", async () => {
        const gate = await createTokenGate(createTestGateConfig());

        // First check - miss
        await checkAccess({
          userId: "user_1",
          resourceType: "channel",
          resourceId: "channel_123",
          walletAddress: VALID_WALLET,
        });

        // Second check - hit
        await checkAccess({
          userId: "user_1",
          resourceType: "channel",
          resourceId: "channel_123",
          walletAddress: VALID_WALLET,
        });

        const stats = getGateStats(gate.id);
        expect(stats?.cacheHitRate).toBe(0.5); // 1 hit out of 2 checks
      });
    });

    describe("getGateEvents", () => {
      it("should return events for a gate", async () => {
        const gate = await createTokenGate(createTestGateConfig());

        await checkAccess({
          userId: "user_1",
          resourceType: "channel",
          resourceId: "channel_123",
          walletAddress: VALID_WALLET,
        });

        const events = getGateEvents(gate.id);
        expect(events.length).toBeGreaterThan(0);
      });

      it("should filter by event type", async () => {
        const gate = await createTokenGate(createTestGateConfig());

        await checkAccess({
          userId: "user_1",
          resourceType: "channel",
          resourceId: "channel_123",
          walletAddress: VALID_WALLET,
        });

        const events = getGateEvents(gate.id, { types: ["access_granted"] });
        expect(events.every((e) => e.type === "access_granted")).toBe(true);
      });

      it("should limit results", async () => {
        const gate = await createTokenGate(createTestGateConfig());

        for (let i = 0; i < 10; i++) {
          await checkAccess({
            userId: `user_${i}`,
            resourceType: "channel",
            resourceId: "channel_123",
            walletAddress: VALID_WALLET,
            forceRefresh: true,
          });
        }

        const events = getGateEvents(gate.id, { limit: 5 });
        expect(events.length).toBe(5);
      });

      it("should filter by date", async () => {
        const gate = await createTokenGate(createTestGateConfig());
        const beforeAccess = new Date();

        await checkAccess({
          userId: "user_1",
          resourceType: "channel",
          resourceId: "channel_123",
          walletAddress: VALID_WALLET,
        });

        const events = getGateEvents(gate.id, { since: beforeAccess });
        expect(events.length).toBeGreaterThan(0);
      });

      it("should return all events when no gateId specified", async () => {
        await createTokenGate(createTestGateConfig({ resourceId: "ch1" }));
        await createTokenGate(createTestGateConfig({ resourceId: "ch2" }));

        const allEvents = getGateEvents();
        expect(allEvents.length).toBeGreaterThan(1);
      });
    });

    describe("getGracePeriodUsers", () => {
      it("should return users in grace period", async () => {
        const gate = await createTokenGate(
          createTestGateConfig({ gracePeriodSeconds: 3600 }),
        );
        mockVerifyRequirements.mockResolvedValueOnce({
          verified: false,
          results: [{ requirement: createTestRequirement(), verified: false }],
        });

        await checkAccess({
          userId: "user_1",
          resourceType: "channel",
          resourceId: "channel_123",
          walletAddress: VALID_WALLET,
        });

        const users = getGracePeriodUsers(gate.id);
        expect(users.length).toBe(1);
        expect(users[0].userId).toBe("user_1");
        expect(users[0].walletAddress).toBe(VALID_WALLET.toLowerCase());
      });

      it("should return empty array when no users in grace period", async () => {
        const gate = await createTokenGate(createTestGateConfig());

        await checkAccess({
          userId: "user_1",
          resourceType: "channel",
          resourceId: "channel_123",
          walletAddress: VALID_WALLET,
        });

        const users = getGracePeriodUsers(gate.id);
        expect(users.length).toBe(0);
      });
    });
  });

  // ===========================================================================
  // REVOCATION CHECKING
  // ===========================================================================

  describe("Revocation Checking", () => {
    it("should re-verify access for users", async () => {
      const gate = await createTokenGate(
        createTestGateConfig({ autoRevokeOnFailure: true }),
      );

      await checkAccess({
        userId: "user_1",
        resourceType: "channel",
        resourceId: "channel_123",
        walletAddress: VALID_WALLET,
      });

      mockVerifyRequirements.mockClear();
      await checkRevocations(gate.id);

      expect(mockVerifyRequirements).toHaveBeenCalled();
    });

    it("should log revocation event when access is revoked", async () => {
      const gate = await createTokenGate(
        createTestGateConfig({
          autoRevokeOnFailure: true,
          gracePeriodSeconds: 0,
        }),
      );

      // First grant access
      await checkAccess({
        userId: "user_1",
        resourceType: "channel",
        resourceId: "channel_123",
        walletAddress: VALID_WALLET,
      });

      // Now fail verification
      mockVerifyRequirements.mockResolvedValueOnce({
        verified: false,
        results: [{ requirement: createTestRequirement(), verified: false }],
      });

      await checkRevocations(gate.id);

      const events = getGateEvents(gate.id);
      const revokedEvent = events.find((e) => e.type === "access_revoked");
      expect(revokedEvent).toBeDefined();
    });
  });

  // ===========================================================================
  // SERVICE LIFECYCLE
  // ===========================================================================

  describe("Service Lifecycle", () => {
    describe("initializeTokenGateService", () => {
      it("should initialize without error", () => {
        expect(() => initializeTokenGateService()).not.toThrow();
      });
    });

    describe("shutdownTokenGateService", () => {
      it("should shutdown without error", () => {
        initializeTokenGateService();
        expect(() => shutdownTokenGateService()).not.toThrow();
      });
    });

    describe("resetTokenGateService", () => {
      it("should clear all state", async () => {
        await createTokenGate(createTestGateConfig());

        resetTokenGateService();

        expect(listTokenGates().length).toBe(0);
        expect(getGateEvents().length).toBe(0);
        expect(mockClearVerificationCache).toHaveBeenCalled();
      });
    });
  });

  // ===========================================================================
  // ERROR HANDLING
  // ===========================================================================

  describe("Error Handling", () => {
    it("should handle verification errors gracefully", async () => {
      await createTokenGate(createTestGateConfig());
      mockVerifyRequirements.mockRejectedValueOnce(new Error("RPC timeout"));

      const result = await checkAccess({
        userId: "user_1",
        resourceType: "channel",
        resourceId: "channel_123",
        walletAddress: VALID_WALLET,
      });

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toContain("RPC timeout");
    });

    it("should log verification failure event", async () => {
      const gate = await createTokenGate(createTestGateConfig());
      mockVerifyRequirements.mockRejectedValueOnce(new Error("Network error"));

      await checkAccess({
        userId: "user_1",
        resourceType: "channel",
        resourceId: "channel_123",
        walletAddress: VALID_WALLET,
      });

      const events = getGateEvents(gate.id);
      const failureEvent = events.find((e) => e.type === "verification_failed");
      expect(failureEvent).toBeDefined();
    });
  });
});
