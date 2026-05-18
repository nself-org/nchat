/**
 * Token Gate Types Tests
 *
 * Tests for type definitions, constants, and helper functions
 */

import {
  CHAIN_CONFIGS,
  getChainConfig,
  getChainIdByNetwork,
  isValidAddress,
  normalizeAddress,
  isSupportedChain,
  formatTokenBalance,
  parseTokenAmount,
  generateVerificationCacheKey,
  calculateGracePeriodEnd,
  isInGracePeriod,
  TokenGateError,
  TokenGateErrorCode,
  type ChainId,
  type NetworkName,
} from "../token-gate-types";

describe("Token Gate Types", () => {
  // ===========================================================================
  // CHAIN CONFIGURATIONS
  // ===========================================================================

  describe("CHAIN_CONFIGS", () => {
    it("should have Ethereum mainnet configured", () => {
      const config = CHAIN_CONFIGS["0x1"];
      expect(config).toBeDefined();
      expect(config.networkName).toBe("ethereum");
      expect(config.displayName).toBe("Ethereum Mainnet");
      expect(config.isTestnet).toBe(false);
    });

    it("should have Polygon mainnet configured", () => {
      const config = CHAIN_CONFIGS["0x89"];
      expect(config).toBeDefined();
      expect(config.networkName).toBe("polygon");
      expect(config.nativeCurrency.symbol).toBe("MATIC");
    });

    it("should have Arbitrum configured", () => {
      const config = CHAIN_CONFIGS["0xa4b1"];
      expect(config).toBeDefined();
      expect(config.networkName).toBe("arbitrum");
    });

    it("should have Sepolia testnet configured", () => {
      const config = CHAIN_CONFIGS["0xaa36a7"];
      expect(config).toBeDefined();
      expect(config.networkName).toBe("sepolia");
      expect(config.isTestnet).toBe(true);
    });

    it("should have BNB Smart Chain configured", () => {
      const config = CHAIN_CONFIGS["0x38"];
      expect(config).toBeDefined();
      expect(config.networkName).toBe("bsc");
      expect(config.nativeCurrency.symbol).toBe("BNB");
    });

    it("should have Base configured", () => {
      const config = CHAIN_CONFIGS["0x2105"];
      expect(config).toBeDefined();
      expect(config.networkName).toBe("base");
    });

    it("should have proper confirmation requirements", () => {
      expect(CHAIN_CONFIGS["0x1"].confirmationsRequired).toBeGreaterThan(0);
      expect(CHAIN_CONFIGS["0x89"].confirmationsRequired).toBeGreaterThan(0);
    });

    it("should have valid block explorer URLs", () => {
      for (const config of Object.values(CHAIN_CONFIGS)) {
        expect(config.blockExplorerUrl).toMatch(/^https:\/\//);
      }
    });
  });

  // ===========================================================================
  // getChainConfig
  // ===========================================================================

  describe("getChainConfig", () => {
    it("should return config for valid chain ID", () => {
      const config = getChainConfig("0x1");
      expect(config).toBeDefined();
      expect(config?.chainId).toBe("0x1");
    });

    it("should return undefined for invalid chain ID", () => {
      const config = getChainConfig("0xfffff" as ChainId);
      expect(config).toBeUndefined();
    });

    it("should return config for all supported chains", () => {
      const chainIds: ChainId[] = ["0x1", "0x89", "0xa4b1", "0x38", "0x2105"];
      for (const chainId of chainIds) {
        const config = getChainConfig(chainId);
        expect(config).toBeDefined();
      }
    });
  });

  // ===========================================================================
  // getChainIdByNetwork
  // ===========================================================================

  describe("getChainIdByNetwork", () => {
    it("should return chain ID for ethereum", () => {
      expect(getChainIdByNetwork("ethereum")).toBe("0x1");
    });

    it("should return chain ID for polygon", () => {
      expect(getChainIdByNetwork("polygon")).toBe("0x89");
    });

    it("should return chain ID for arbitrum", () => {
      expect(getChainIdByNetwork("arbitrum")).toBe("0xa4b1");
    });

    it("should return chain ID for bsc", () => {
      expect(getChainIdByNetwork("bsc")).toBe("0x38");
    });

    it("should return chain ID for base", () => {
      expect(getChainIdByNetwork("base")).toBe("0x2105");
    });

    it("should return undefined for unknown network", () => {
      expect(getChainIdByNetwork("unknown" as NetworkName)).toBeUndefined();
    });
  });

  // ===========================================================================
  // isValidAddress
  // ===========================================================================

  describe("isValidAddress", () => {
    it("should return true for valid lowercase address", () => {
      expect(isValidAddress("0x1234567890123456789012345678901234567890")).toBe(
        true,
      );
    });

    it("should return true for valid uppercase address", () => {
      expect(isValidAddress("0xABCDEF1234567890ABCDEF1234567890ABCDEF12")).toBe(
        true,
      );
    });

    it("should return true for valid mixed case address", () => {
      expect(isValidAddress("0xAbCdEf1234567890AbCdEf1234567890AbCdEf12")).toBe(
        true,
      );
    });

    it("should return false for address without 0x prefix", () => {
      expect(isValidAddress("1234567890123456789012345678901234567890")).toBe(
        false,
      );
    });

    it("should return false for short address", () => {
      expect(isValidAddress("0x123456789012345678901234567890123456789")).toBe(
        false,
      );
    });

    it("should return false for long address", () => {
      expect(
        isValidAddress("0x12345678901234567890123456789012345678901"),
      ).toBe(false);
    });

    it("should return false for address with invalid characters", () => {
      expect(isValidAddress("0x123456789012345678901234567890123456789g")).toBe(
        false,
      );
    });

    it("should return false for empty string", () => {
      expect(isValidAddress("")).toBe(false);
    });

    it("should return false for null/undefined", () => {
      expect(isValidAddress(null as unknown as string)).toBe(false);
      expect(isValidAddress(undefined as unknown as string)).toBe(false);
    });
  });

  // ===========================================================================
  // normalizeAddress
  // ===========================================================================

  describe("normalizeAddress", () => {
    it("should normalize to lowercase", () => {
      const address = normalizeAddress(
        "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
      );
      expect(address).toBe("0xabcdef1234567890abcdef1234567890abcdef12");
    });

    it("should not change already lowercase address", () => {
      const address = normalizeAddress(
        "0xabcdef1234567890abcdef1234567890abcdef12",
      );
      expect(address).toBe("0xabcdef1234567890abcdef1234567890abcdef12");
    });

    it("should throw for invalid address", () => {
      expect(() => normalizeAddress("invalid")).toThrow(TokenGateError);
    });

    it("should throw with correct error code", () => {
      try {
        normalizeAddress("invalid");
      } catch (error) {
        expect(error).toBeInstanceOf(TokenGateError);
        expect((error as TokenGateError).code).toBe(
          TokenGateErrorCode.INVALID_WALLET_ADDRESS,
        );
      }
    });
  });

  // ===========================================================================
  // isSupportedChain
  // ===========================================================================

  describe("isSupportedChain", () => {
    it("should return true for supported chains", () => {
      expect(isSupportedChain("0x1")).toBe(true);
      expect(isSupportedChain("0x89")).toBe(true);
      expect(isSupportedChain("0xa4b1")).toBe(true);
    });

    it("should return false for unsupported chains", () => {
      expect(isSupportedChain("0xfffff")).toBe(false);
      expect(isSupportedChain("0x0")).toBe(false);
      expect(isSupportedChain("")).toBe(false);
    });
  });

  // ===========================================================================
  // formatTokenBalance
  // ===========================================================================

  describe("formatTokenBalance", () => {
    it("should format 18 decimal token correctly", () => {
      expect(formatTokenBalance("1000000000000000000", 18)).toBe("1");
      expect(formatTokenBalance("1500000000000000000", 18)).toBe("1.5");
      expect(formatTokenBalance("1234567890000000000", 18)).toBe("1.23456789");
    });

    it("should format 6 decimal token correctly (USDC)", () => {
      expect(formatTokenBalance("1000000", 6)).toBe("1");
      expect(formatTokenBalance("1500000", 6)).toBe("1.5");
      expect(formatTokenBalance("1234567", 6)).toBe("1.234567");
    });

    it("should handle zero balance", () => {
      expect(formatTokenBalance("0", 18)).toBe("0");
    });

    it("should handle very large balances", () => {
      expect(formatTokenBalance("1000000000000000000000000", 18)).toBe(
        "1000000",
      );
    });

    it("should handle small fractional amounts", () => {
      expect(formatTokenBalance("1", 18)).toBe("0.000000000000000001");
    });

    it("should trim trailing zeros", () => {
      expect(formatTokenBalance("1000000000000000000", 18)).toBe("1");
      expect(formatTokenBalance("1100000000000000000", 18)).toBe("1.1");
    });
  });

  // ===========================================================================
  // parseTokenAmount
  // ===========================================================================

  describe("parseTokenAmount", () => {
    it("should parse whole number amount", () => {
      expect(parseTokenAmount("1", 18)).toBe("1000000000000000000");
    });

    it("should parse decimal amount", () => {
      expect(parseTokenAmount("1.5", 18)).toBe("1500000000000000000");
    });

    it("should parse 6 decimal token amount", () => {
      expect(parseTokenAmount("1", 6)).toBe("1000000");
      expect(parseTokenAmount("1.5", 6)).toBe("1500000");
    });

    it("should truncate excess decimals", () => {
      expect(parseTokenAmount("1.123456789", 6)).toBe("1123456");
    });

    it("should handle zero", () => {
      expect(parseTokenAmount("0", 18)).toBe("0");
    });

    it("should handle large amounts", () => {
      expect(parseTokenAmount("1000000", 18)).toBe("1000000000000000000000000");
    });
  });

  // ===========================================================================
  // generateVerificationCacheKey
  // ===========================================================================

  describe("generateVerificationCacheKey", () => {
    it("should generate key without chain ID", () => {
      const key = generateVerificationCacheKey(
        "gate_123",
        "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12",
      );
      expect(key).toBe(
        "gate:gate_123:0xabcdef1234567890abcdef1234567890abcdef12",
      );
    });

    it("should generate key with chain ID", () => {
      const key = generateVerificationCacheKey(
        "gate_123",
        "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12",
        "0x1",
      );
      expect(key).toBe(
        "gate:gate_123:0xabcdef1234567890abcdef1234567890abcdef12:0x1",
      );
    });

    it("should normalize address in key", () => {
      const key1 = generateVerificationCacheKey(
        "gate_123",
        "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
      );
      const key2 = generateVerificationCacheKey(
        "gate_123",
        "0xabcdef1234567890abcdef1234567890abcdef12",
      );
      expect(key1).toBe(key2);
    });
  });

  // ===========================================================================
  // calculateGracePeriodEnd
  // ===========================================================================

  describe("calculateGracePeriodEnd", () => {
    it("should calculate end time correctly", () => {
      const startTime = new Date("2026-02-08T00:00:00Z");
      const endTime = calculateGracePeriodEnd(3600, startTime);

      expect(endTime.getTime()).toBe(startTime.getTime() + 3600 * 1000);
    });

    it("should use current time if not provided", () => {
      const beforeCall = Date.now();
      const endTime = calculateGracePeriodEnd(3600);
      const afterCall = Date.now();

      expect(endTime.getTime()).toBeGreaterThanOrEqual(
        beforeCall + 3600 * 1000,
      );
      expect(endTime.getTime()).toBeLessThanOrEqual(afterCall + 3600 * 1000);
    });

    it("should handle zero grace period", () => {
      const startTime = new Date();
      const endTime = calculateGracePeriodEnd(0, startTime);

      expect(endTime.getTime()).toBe(startTime.getTime());
    });
  });

  // ===========================================================================
  // isInGracePeriod
  // ===========================================================================

  describe("isInGracePeriod", () => {
    it("should return true when within grace period", () => {
      const futureDate = new Date(Date.now() + 3600 * 1000);
      expect(isInGracePeriod(futureDate)).toBe(true);
    });

    it("should return false when grace period has ended", () => {
      const pastDate = new Date(Date.now() - 1000);
      expect(isInGracePeriod(pastDate)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isInGracePeriod(undefined)).toBe(false);
    });

    it("should return false for exactly current time", () => {
      // Edge case: exactly now should be false (not < now)
      const now = new Date();
      // Small delay to ensure the check happens after
      expect(isInGracePeriod(now)).toBe(false);
    });
  });

  // ===========================================================================
  // TokenGateError
  // ===========================================================================

  describe("TokenGateError", () => {
    it("should create error with code and message", () => {
      const error = new TokenGateError(
        TokenGateErrorCode.WALLET_NOT_CONNECTED,
        "Wallet not connected",
      );

      expect(error.code).toBe(TokenGateErrorCode.WALLET_NOT_CONNECTED);
      expect(error.message).toBe("Wallet not connected");
      expect(error.name).toBe("TokenGateError");
    });

    it("should create error with details", () => {
      const error = new TokenGateError(
        TokenGateErrorCode.INSUFFICIENT_BALANCE,
        "Insufficient balance",
        { required: "100", actual: "50" },
      );

      expect(error.details).toEqual({ required: "100", actual: "50" });
    });

    it("should serialize to JSON correctly", () => {
      const error = new TokenGateError(
        TokenGateErrorCode.VERIFICATION_FAILED,
        "Verification failed",
        { reason: "RPC timeout" },
      );

      const json = error.toJSON();

      expect(json.name).toBe("TokenGateError");
      expect(json.code).toBe(TokenGateErrorCode.VERIFICATION_FAILED);
      expect(json.message).toBe("Verification failed");
      expect(json.details).toEqual({ reason: "RPC timeout" });
    });

    it("should be instanceof Error", () => {
      const error = new TokenGateError(
        TokenGateErrorCode.INTERNAL_ERROR,
        "Error",
      );
      expect(error instanceof Error).toBe(true);
    });
  });

  // ===========================================================================
  // TokenGateErrorCode enum
  // ===========================================================================

  describe("TokenGateErrorCode", () => {
    it("should have all expected error codes", () => {
      expect(TokenGateErrorCode.WALLET_NOT_CONNECTED).toBeDefined();
      expect(TokenGateErrorCode.WALLET_NOT_VERIFIED).toBeDefined();
      expect(TokenGateErrorCode.INVALID_WALLET_ADDRESS).toBeDefined();
      expect(TokenGateErrorCode.INVALID_CONTRACT_ADDRESS).toBeDefined();
      expect(TokenGateErrorCode.UNSUPPORTED_TOKEN_STANDARD).toBeDefined();
      expect(TokenGateErrorCode.UNSUPPORTED_CHAIN).toBeDefined();
      expect(TokenGateErrorCode.VERIFICATION_FAILED).toBeDefined();
      expect(TokenGateErrorCode.INSUFFICIENT_BALANCE).toBeDefined();
      expect(TokenGateErrorCode.TOKEN_NOT_OWNED).toBeDefined();
      expect(TokenGateErrorCode.RPC_ERROR).toBeDefined();
      expect(TokenGateErrorCode.API_ERROR).toBeDefined();
      expect(TokenGateErrorCode.GATE_NOT_FOUND).toBeDefined();
      expect(TokenGateErrorCode.GATE_INACTIVE).toBeDefined();
      expect(TokenGateErrorCode.ACCESS_DENIED).toBeDefined();
      expect(TokenGateErrorCode.INTERNAL_ERROR).toBeDefined();
    });
  });
});
