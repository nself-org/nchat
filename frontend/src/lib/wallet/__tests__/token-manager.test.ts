/**
 * @fileoverview Tests for Token Manager
 */

import {
  TokenManager,
  getTokenManager,
  resetTokenManager,
  TOKEN_ERROR_CODES,
  COMMON_TOKENS,
  type TokenInfo,
} from "../token-manager";
import type { EthereumProvider } from "../wallet-connector";

// Mock Ethereum provider
const createMockProvider = (
  overrides: Partial<EthereumProvider> = {},
): EthereumProvider => ({
  isMetaMask: true,
  request: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn(),
  ...overrides,
});

describe("TokenManager", () => {
  let manager: TokenManager;
  let mockProvider: EthereumProvider;

  beforeEach(() => {
    resetTokenManager();
    mockProvider = createMockProvider();
    manager = new TokenManager(mockProvider);
  });

  // ==========================================================================
  // Setup Tests
  // ==========================================================================

  describe("Setup", () => {
    it("should create manager with provider", () => {
      expect(manager.getProvider()).toBe(mockProvider);
    });

    it("should create manager without provider", () => {
      const managerWithoutProvider = new TokenManager();
      expect(managerWithoutProvider.getProvider()).toBeNull();
    });

    it("should set and get provider", () => {
      const newProvider = createMockProvider();
      manager.setProvider(newProvider);
      expect(manager.getProvider()).toBe(newProvider);
    });
  });

  // ==========================================================================
  // Token Information Tests
  // ==========================================================================

  describe("Token Information", () => {
    describe("getTokenInfo", () => {
      it("should get token info", async () => {
        (mockProvider.request as jest.Mock).mockImplementation(
          ({ method, params }) => {
            if (method === "eth_call") {
              const data = params[0].data;
              // Name call
              if (data.startsWith("0x06fdde03")) {
                return Promise.resolve(
                  "0x0000000000000000000000000000000000000000000000000000000000000020" +
                    "0000000000000000000000000000000000000000000000000000000000000008" +
                    "5465737420546f6b656e000000000000000000000000000000000000000000",
                );
              }
              // Symbol call
              if (data.startsWith("0x95d89b41")) {
                return Promise.resolve(
                  "0x0000000000000000000000000000000000000000000000000000000000000020" +
                    "0000000000000000000000000000000000000000000000000000000000000004" +
                    "5445535400000000000000000000000000000000000000000000000000000000",
                );
              }
              // Decimals call
              if (data.startsWith("0x313ce567")) {
                return Promise.resolve("0x12");
              }
            }
            return Promise.resolve(null);
          },
        );

        const result = await manager.getTokenInfo(
          "0x1234567890abcdef1234567890abcdef12345678",
          "0x1",
        );

        expect(result.success).toBe(true);
        expect(result.data?.decimals).toBe(18);
      });

      it("should use cache for repeated calls", async () => {
        const token: TokenInfo = {
          address: "0x1234567890abcdef1234567890abcdef12345678",
          name: "Cached Token",
          symbol: "CACHE",
          decimals: 18,
          chainId: "0x1",
        };

        manager.addTokenToCache(token);

        const result = await manager.getTokenInfo(token.address, "0x1");

        expect(result.success).toBe(true);
        expect(result.data?.name).toBe("Cached Token");
        expect(mockProvider.request).not.toHaveBeenCalled();
      });

      it("should fail if provider not set", async () => {
        manager.setProvider(null);
        const result = await manager.getTokenInfo(
          "0x1234567890abcdef1234567890abcdef12345678",
          "0x1",
        );

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(TOKEN_ERROR_CODES.PROVIDER_NOT_SET);
      });

      it("should fail with invalid address", async () => {
        const result = await manager.getTokenInfo("invalid", "0x1");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(TOKEN_ERROR_CODES.INVALID_ADDRESS);
      });

      it("should handle error", async () => {
        (mockProvider.request as jest.Mock).mockRejectedValue(
          new Error("Failed"),
        );

        const result = await manager.getTokenInfo(
          "0x1234567890abcdef1234567890abcdef12345678",
          "0x1",
        );

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(TOKEN_ERROR_CODES.TOKEN_NOT_FOUND);
      });
    });

    describe("getCommonTokens", () => {
      it("should return common tokens for Ethereum", () => {
        const tokens = manager.getCommonTokens("0x1");
        expect(tokens.length).toBeGreaterThan(0);
      });

      it("should return empty array for unknown chain", () => {
        const tokens = manager.getCommonTokens("0xFFFF" as "0x1");
        expect(tokens).toEqual([]);
      });
    });

    describe("Cache", () => {
      it("should add token to cache", () => {
        const token: TokenInfo = {
          address: "0x1234567890abcdef1234567890abcdef12345678",
          name: "Test",
          symbol: "TST",
          decimals: 18,
          chainId: "0x1",
        };

        manager.addTokenToCache(token);

        // Verify by getting from cache
        (mockProvider.request as jest.Mock).mockResolvedValue("0x0");
      });

      it("should clear cache", () => {
        const token: TokenInfo = {
          address: "0x1234567890abcdef1234567890abcdef12345678",
          name: "Test",
          symbol: "TST",
          decimals: 18,
          chainId: "0x1",
        };

        manager.addTokenToCache(token);
        manager.clearCache();

        // After clearing, should need to fetch again
      });
    });
  });

  // ==========================================================================
  // Balance Tests
  // ==========================================================================

  describe("Balance Operations", () => {
    beforeEach(() => {
      // Setup token info response
      (mockProvider.request as jest.Mock).mockImplementation(
        ({ method, params }) => {
          if (method === "eth_call") {
            const data = params[0].data;
            if (data.startsWith("0x06fdde03")) {
              return Promise.resolve(
                "0x0000000000000000000000000000000000000000000000000000000000000020" +
                  "0000000000000000000000000000000000000000000000000000000000000004" +
                  "5465737400000000000000000000000000000000000000000000000000000000",
              );
            }
            if (data.startsWith("0x95d89b41")) {
              return Promise.resolve(
                "0x0000000000000000000000000000000000000000000000000000000000000020" +
                  "0000000000000000000000000000000000000000000000000000000000000003" +
                  "5453540000000000000000000000000000000000000000000000000000000000",
              );
            }
            if (data.startsWith("0x313ce567")) {
              return Promise.resolve("0x12");
            }
            if (data.startsWith("0x70a08231")) {
              return Promise.resolve(
                "0x0000000000000000000000000000000000000000000000000de0b6b3a7640000",
              );
            }
          }
          return Promise.resolve(null);
        },
      );
    });

    describe("getTokenBalance", () => {
      it("should get token balance", async () => {
        const result = await manager.getTokenBalance(
          "0x1234567890abcdef1234567890abcdef12345678",
          "0xabcdef1234567890abcdef1234567890abcdef12",
          "0x1",
        );

        expect(result.success).toBe(true);
        expect(result.data?.balance).toBeDefined();
        expect(result.data?.balanceFormatted).toBeDefined();
      });

      it("should fail if provider not set", async () => {
        manager.setProvider(null);
        const result = await manager.getTokenBalance(
          "0x1234567890abcdef1234567890abcdef12345678",
          "0xabcdef1234567890abcdef1234567890abcdef12",
          "0x1",
        );

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(TOKEN_ERROR_CODES.PROVIDER_NOT_SET);
      });

      it("should fail with invalid address", async () => {
        const result = await manager.getTokenBalance(
          "invalid",
          "0xabcdef",
          "0x1",
        );

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(TOKEN_ERROR_CODES.INVALID_ADDRESS);
      });
    });

    describe("getTokenBalances", () => {
      it("should get multiple token balances", async () => {
        const result = await manager.getTokenBalances(
          [
            "0x1234567890abcdef1234567890abcdef12345678",
            "0xabcdef1234567890abcdef1234567890abcdef12",
          ],
          "0xuser1234567890abcdef1234567890abcdef12",
          "0x1",
        );

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // Transfer Tests
  // ==========================================================================

  describe("Transfer Operations", () => {
    describe("transfer", () => {
      it("should transfer tokens", async () => {
        (mockProvider.request as jest.Mock).mockResolvedValue("0xtxhash");

        const result = await manager.transfer({
          tokenAddress: "0x1234567890abcdef1234567890abcdef12345678",
          from: "0xaaaa567890abcdef1234567890abcdef12345678",
          to: "0xbbbb567890abcdef1234567890abcdef12345678",
          amount: "1000000000000000000",
        });

        expect(result.success).toBe(true);
        expect(result.data).toBe("0xtxhash");
      });

      it("should fail if provider not set", async () => {
        manager.setProvider(null);
        const result = await manager.transfer({
          tokenAddress: "0x1234567890abcdef1234567890abcdef12345678",
          from: "0xaaaa567890abcdef1234567890abcdef12345678",
          to: "0xbbbb567890abcdef1234567890abcdef12345678",
          amount: "1000000000000000000",
        });

        expect(result.success).toBe(false);
      });

      it("should fail with invalid address", async () => {
        const result = await manager.transfer({
          tokenAddress: "invalid",
          from: "0xaaaa567890abcdef1234567890abcdef12345678",
          to: "0xbbbb567890abcdef1234567890abcdef12345678",
          amount: "1000000000000000000",
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(TOKEN_ERROR_CODES.INVALID_ADDRESS);
      });

      it("should handle transfer error", async () => {
        (mockProvider.request as jest.Mock).mockRejectedValue({
          code: TOKEN_ERROR_CODES.INSUFFICIENT_BALANCE,
          message: "Insufficient balance",
        });

        const result = await manager.transfer({
          tokenAddress: "0x1234567890abcdef1234567890abcdef12345678",
          from: "0xaaaa567890abcdef1234567890abcdef12345678",
          to: "0xbbbb567890abcdef1234567890abcdef12345678",
          amount: "1000000000000000000",
        });

        expect(result.success).toBe(false);
      });
    });

    describe("encodeTransfer", () => {
      it("should encode transfer data", () => {
        const data = manager.encodeTransfer(
          "0xbbbb567890abcdef1234567890abcdef12345678",
          "1000000000000000000",
        );

        expect(data).toMatch(/^0xa9059cbb/);
      });
    });
  });

  // ==========================================================================
  // Approval Tests
  // ==========================================================================

  describe("Approval Operations", () => {
    describe("approve", () => {
      it("should approve token spending", async () => {
        (mockProvider.request as jest.Mock).mockResolvedValue("0xtxhash");

        const result = await manager.approve({
          tokenAddress: "0x1234567890abcdef1234567890abcdef12345678",
          owner: "0xcccc567890abcdef1234567890abcdef12345678",
          spender: "0xdddd567890abcdef1234567890abcdef12345678",
          amount: "1000000000000000000",
        });

        expect(result.success).toBe(true);
        expect(result.data).toBe("0xtxhash");
      });

      it("should fail if provider not set", async () => {
        manager.setProvider(null);
        const result = await manager.approve({
          tokenAddress: "0x1234567890abcdef1234567890abcdef12345678",
          owner: "0xcccc567890abcdef1234567890abcdef12345678",
          spender: "0xdddd567890abcdef1234567890abcdef12345678",
          amount: "1000000000000000000",
        });

        expect(result.success).toBe(false);
      });

      it("should fail with invalid address", async () => {
        const result = await manager.approve({
          tokenAddress: "invalid",
          owner: "0xcccc567890abcdef1234567890abcdef12345678",
          spender: "0xdddd567890abcdef1234567890abcdef12345678",
          amount: "1000000000000000000",
        });

        expect(result.success).toBe(false);
      });

      it("should handle approval error", async () => {
        (mockProvider.request as jest.Mock).mockRejectedValue({
          code: TOKEN_ERROR_CODES.APPROVAL_FAILED,
          message: "Approval failed",
        });

        const result = await manager.approve({
          tokenAddress: "0x1234567890abcdef1234567890abcdef12345678",
          owner: "0xcccc567890abcdef1234567890abcdef12345678",
          spender: "0xdddd567890abcdef1234567890abcdef12345678",
          amount: "1000000000000000000",
        });

        expect(result.success).toBe(false);
      });
    });

    describe("encodeApproval", () => {
      it("should encode approval data", () => {
        const data = manager.encodeApproval(
          "0xdddd567890abcdef1234567890abcdef12345678",
          "1000000000000000000",
        );

        expect(data).toMatch(/^0x095ea7b3/);
      });
    });

    describe("getAllowance", () => {
      it("should get allowance", async () => {
        (mockProvider.request as jest.Mock).mockResolvedValue(
          "0x0000000000000000000000000000000000000000000000000de0b6b3a7640000",
        );

        const result = await manager.getAllowance(
          "0x1234567890abcdef1234567890abcdef12345678",
          "0xcccc567890abcdef1234567890abcdef12345678",
          "0xdddd567890abcdef1234567890abcdef12345678",
        );

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });

      it("should fail if provider not set", async () => {
        manager.setProvider(null);
        const result = await manager.getAllowance(
          "0x1234567890abcdef1234567890abcdef12345678",
          "0xcccc567890abcdef1234567890abcdef12345678",
          "0xdddd567890abcdef1234567890abcdef12345678",
        );

        expect(result.success).toBe(false);
      });

      it("should handle error", async () => {
        (mockProvider.request as jest.Mock).mockRejectedValue(
          new Error("Failed"),
        );

        const result = await manager.getAllowance(
          "0x1234567890abcdef1234567890abcdef12345678",
          "0xcccc567890abcdef1234567890abcdef12345678",
          "0xdddd567890abcdef1234567890abcdef12345678",
        );

        expect(result.success).toBe(false);
      });
    });

    describe("needsApproval", () => {
      it("should return true when approval needed", async () => {
        (mockProvider.request as jest.Mock).mockResolvedValue("0x0");

        const result = await manager.needsApproval(
          "0x1234567890abcdef1234567890abcdef12345678",
          "0xcccc567890abcdef1234567890abcdef12345678",
          "0xdddd567890abcdef1234567890abcdef12345678",
          "1000000000000000000",
        );

        expect(result.success).toBe(true);
        expect(result.data).toBe(true);
      });

      it("should return false when approval not needed", async () => {
        (mockProvider.request as jest.Mock).mockResolvedValue(
          "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        );

        const result = await manager.needsApproval(
          "0x1234567890abcdef1234567890abcdef12345678",
          "0xcccc567890abcdef1234567890abcdef12345678",
          "0xdddd567890abcdef1234567890abcdef12345678",
          "1000000000000000000",
        );

        expect(result.success).toBe(true);
        expect(result.data).toBe(false);
      });
    });
  });

  // ==========================================================================
  // NFT Tests
  // ==========================================================================

  describe("NFT Operations", () => {
    describe("getNFTOwner", () => {
      it("should get NFT owner", async () => {
        (mockProvider.request as jest.Mock).mockResolvedValue(
          "0x000000000000000000000000abcdef1234567890abcdef1234567890abcdef12",
        );

        const result = await manager.getNFTOwner(
          "0x1234567890abcdef1234567890abcdef12345678",
          "1",
        );

        expect(result.success).toBe(true);
        expect(result.data).toBe("0xabcdef1234567890abcdef1234567890abcdef12");
      });

      it("should fail if provider not set", async () => {
        manager.setProvider(null);
        const result = await manager.getNFTOwner(
          "0x1234567890abcdef1234567890abcdef12345678",
          "1",
        );

        expect(result.success).toBe(false);
      });

      it("should handle error", async () => {
        (mockProvider.request as jest.Mock).mockRejectedValue(
          new Error("Not found"),
        );

        const result = await manager.getNFTOwner(
          "0x1234567890abcdef1234567890abcdef12345678",
          "1",
        );

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(TOKEN_ERROR_CODES.NFT_NOT_FOUND);
      });
    });

    describe("getNFTTokenURI", () => {
      it("should get token URI", async () => {
        (mockProvider.request as jest.Mock).mockResolvedValue(
          "0x0000000000000000000000000000000000000000000000000000000000000020" +
            "000000000000000000000000000000000000000000000000000000000000001d" +
            "68747470733a2f2f6578616d706c652e636f6d2f746f6b656e2f31000000000",
        );

        const result = await manager.getNFTTokenURI(
          "0x1234567890abcdef1234567890abcdef12345678",
          "1",
        );

        expect(result.success).toBe(true);
      });

      it("should fail if provider not set", async () => {
        manager.setProvider(null);
        const result = await manager.getNFTTokenURI(
          "0x1234567890abcdef1234567890abcdef12345678",
          "1",
        );

        expect(result.success).toBe(false);
      });
    });

    describe("getNFTBalance", () => {
      it("should get NFT balance", async () => {
        (mockProvider.request as jest.Mock).mockResolvedValue("0x5");

        const result = await manager.getNFTBalance(
          "0x1234567890abcdef1234567890abcdef12345678",
          "0xcccc567890abcdef1234567890abcdef12345678",
        );

        expect(result.success).toBe(true);
        expect(result.data).toBe(5);
      });

      it("should fail if provider not set", async () => {
        manager.setProvider(null);
        const result = await manager.getNFTBalance(
          "0x1234567890abcdef1234567890abcdef12345678",
          "0xcccc567890abcdef1234567890abcdef12345678",
        );

        expect(result.success).toBe(false);
      });
    });

    describe("isNFTOwner", () => {
      it("should return true if address owns NFT", async () => {
        (mockProvider.request as jest.Mock).mockResolvedValue(
          "0x000000000000000000000000abcdef1234567890abcdef1234567890abcdef12",
        );

        const result = await manager.isNFTOwner(
          "0x1234567890abcdef1234567890abcdef12345678",
          "1",
          "0xabcdef1234567890abcdef1234567890abcdef12",
        );

        expect(result.success).toBe(true);
        expect(result.data).toBe(true);
      });

      it("should return false if address does not own NFT", async () => {
        (mockProvider.request as jest.Mock).mockResolvedValue(
          "0x0000000000000000000000001234567890abcdef1234567890abcdef12345678",
        );

        const result = await manager.isNFTOwner(
          "0x1234567890abcdef1234567890abcdef12345678",
          "1",
          "0xabcdef1234567890abcdef1234567890abcdef12",
        );

        expect(result.success).toBe(true);
        expect(result.data).toBe(false);
      });
    });

    describe("transferNFT", () => {
      it("should transfer NFT", async () => {
        (mockProvider.request as jest.Mock).mockResolvedValue("0xtxhash");

        const result = await manager.transferNFT(
          "0x1234567890abcdef1234567890abcdef12345678",
          "0xaaaa567890abcdef1234567890abcdef12345678",
          "0xbbbb567890abcdef1234567890abcdef12345678",
          "1",
        );

        expect(result.success).toBe(true);
        expect(result.data).toBe("0xtxhash");
      });

      it("should fail if provider not set", async () => {
        manager.setProvider(null);
        const result = await manager.transferNFT(
          "0x1234567890abcdef1234567890abcdef12345678",
          "0xaaaa567890abcdef1234567890abcdef12345678",
          "0xbbbb567890abcdef1234567890abcdef12345678",
          "1",
        );

        expect(result.success).toBe(false);
      });

      it("should handle transfer error", async () => {
        (mockProvider.request as jest.Mock).mockRejectedValue({
          code: TOKEN_ERROR_CODES.TRANSFER_FAILED,
          message: "Transfer failed",
        });

        const result = await manager.transferNFT(
          "0x1234567890abcdef1234567890abcdef12345678",
          "0xaaaa567890abcdef1234567890abcdef12345678",
          "0xbbbb567890abcdef1234567890abcdef12345678",
          "1",
        );

        expect(result.success).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Utility Tests
  // ==========================================================================

  describe("Utilities", () => {
    describe("isValidAddress", () => {
      it("should validate correct address", () => {
        expect(
          manager.isValidAddress("0x1234567890abcdef1234567890abcdef12345678"),
        ).toBe(true);
      });

      it("should reject invalid address", () => {
        expect(manager.isValidAddress("invalid")).toBe(false);
        expect(manager.isValidAddress("0x123")).toBe(false);
      });
    });

    describe("padAddress", () => {
      it("should pad address to 32 bytes", () => {
        const padded = manager.padAddress(
          "0x1234567890abcdef1234567890abcdef12345678",
        );
        expect(padded).toHaveLength(64);
        expect(padded).not.toContain("0x");
      });
    });

    describe("padUint256", () => {
      it("should pad uint256 to 32 bytes", () => {
        const padded = manager.padUint256("1000000000000000000");
        expect(padded).toHaveLength(64);
      });
    });

    describe("formatTokenAmount", () => {
      it("should format token amount with 18 decimals", () => {
        const formatted = manager.formatTokenAmount("1000000000000000000", 18);
        expect(formatted).toBe("1");
      });

      it("should format token amount with 6 decimals", () => {
        const formatted = manager.formatTokenAmount("1000000", 6);
        expect(formatted).toBe("1");
      });

      it("should format fractional amounts", () => {
        const formatted = manager.formatTokenAmount("1500000000000000000", 18);
        expect(formatted).toBe("1.5");
      });

      it("should handle zero", () => {
        const formatted = manager.formatTokenAmount("0", 18);
        expect(formatted).toBe("0");
      });
    });

    describe("parseTokenAmount", () => {
      it("should parse token amount with 18 decimals", () => {
        const parsed = manager.parseTokenAmount("1", 18);
        expect(parsed).toBe("1000000000000000000");
      });

      it("should parse token amount with 6 decimals", () => {
        const parsed = manager.parseTokenAmount("1", 6);
        expect(parsed).toBe("1000000");
      });

      it("should parse fractional amounts", () => {
        const parsed = manager.parseTokenAmount("1.5", 18);
        expect(parsed).toBe("1500000000000000000");
      });
    });

    describe("getMaxUint256", () => {
      it("should return max uint256", () => {
        const max = manager.getMaxUint256();
        expect(max).toMatch(/^0xf+$/);
        expect(max).toHaveLength(66);
      });
    });

    describe("decodeString", () => {
      it("should decode empty string", () => {
        const decoded = manager.decodeString("0x");
        expect(decoded).toBe("");
      });

      it("should decode short string", () => {
        const decoded = manager.decodeString("0x00");
        expect(decoded).toBe("");
      });
    });

    describe("decodeUint", () => {
      it("should decode uint", () => {
        const decoded = manager.decodeUint("0x12");
        expect(decoded).toBe(18);
      });

      it("should handle empty", () => {
        const decoded = manager.decodeUint("0x");
        expect(decoded).toBe(0);
      });
    });

    describe("decodeUint256", () => {
      it("should decode uint256", () => {
        const decoded = manager.decodeUint256("0xde0b6b3a7640000");
        expect(decoded).toBe("1000000000000000000");
      });

      it("should handle empty", () => {
        const decoded = manager.decodeUint256("0x");
        expect(decoded).toBe("0");
      });
    });
  });

  // ==========================================================================
  // Singleton Tests
  // ==========================================================================

  describe("Singleton", () => {
    beforeEach(() => {
      resetTokenManager();
    });

    it("should create singleton instance", () => {
      const instance = getTokenManager();
      expect(instance).toBeInstanceOf(TokenManager);
    });

    it("should return same instance", () => {
      const instance1 = getTokenManager();
      const instance2 = getTokenManager();

      expect(instance1).toBe(instance2);
    });

    it("should set provider on existing instance", () => {
      const instance1 = getTokenManager();
      const instance2 = getTokenManager(mockProvider);

      expect(instance1).toBe(instance2);
      expect(instance2.getProvider()).toBe(mockProvider);
    });

    it("should reset singleton", () => {
      const instance1 = getTokenManager();
      resetTokenManager();
      const instance2 = getTokenManager();

      expect(instance1).not.toBe(instance2);
    });
  });

  // ==========================================================================
  // COMMON_TOKENS Tests
  // ==========================================================================

  describe("COMMON_TOKENS", () => {
    it("should have Ethereum mainnet tokens", () => {
      expect(COMMON_TOKENS["0x1"].length).toBeGreaterThan(0);
    });

    it("should have Polygon mainnet tokens", () => {
      expect(COMMON_TOKENS["0x89"].length).toBeGreaterThan(0);
    });

    it("should have correct token structure", () => {
      const tokens = COMMON_TOKENS["0x1"];
      tokens.forEach((token) => {
        expect(token.address).toBeDefined();
        expect(token.name).toBeDefined();
        expect(token.symbol).toBeDefined();
        expect(token.decimals).toBeDefined();
        expect(token.chainId).toBe("0x1");
      });
    });
  });
});
