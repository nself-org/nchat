/**
 * Token Gate Verifier Tests
 *
 * Tests for token verification logic
 */

// Mock fetch globally before imports
const mockFetch = jest.fn();
global.fetch = mockFetch;

import {
  verifyERC20Balance,
  verifyERC721Ownership,
  verifyERC1155Ownership,
  verifyERC1155BatchOwnership,
  verifyRequirement,
  verifyRequirements,
  verifyMultiChain,
  getERC20TokenInfo,
  clearVerificationCache,
  clearWalletCache,
  clearContractCache,
  generateSignatureMessage,
  encodeAddress,
  encodeUint256,
  decodeUint256,
  decodeString,
} from "../token-gate-verifier";

import type { ChainId, TokenRequirementCondition } from "../token-gate-types";

describe("Token Gate Verifier", () => {
  const validWallet = "0x1234567890123456789012345678901234567890";
  const validContract = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
  const chainId: ChainId = "0x1";

  beforeEach(() => {
    jest.clearAllMocks();
    clearVerificationCache();
  });

  // ===========================================================================
  // ENCODING/DECODING UTILITIES
  // ===========================================================================

  describe("encodeAddress", () => {
    it("should encode address to 32 bytes", () => {
      const encoded = encodeAddress(
        "0x1234567890123456789012345678901234567890",
      );
      expect(encoded).toHaveLength(64);
      expect(encoded).toBe(
        "0000000000000000000000001234567890123456789012345678901234567890",
      );
    });

    it("should remove 0x prefix", () => {
      const encoded = encodeAddress(
        "0xabcdef1234567890abcdef1234567890abcdef12",
      );
      expect(encoded).not.toContain("0x");
    });

    it("should convert to lowercase", () => {
      const encoded = encodeAddress(
        "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
      );
      expect(encoded).toBe(
        "000000000000000000000000abcdef1234567890abcdef1234567890abcdef12",
      );
    });
  });

  describe("encodeUint256", () => {
    it("should encode number as 32 bytes", () => {
      const encoded = encodeUint256("1");
      expect(encoded).toHaveLength(64);
      expect(encoded).toBe(
        "0000000000000000000000000000000000000000000000000000000000000001",
      );
    });

    it("should encode large numbers", () => {
      const encoded = encodeUint256("1000000000000000000");
      expect(encoded).toHaveLength(64);
      expect(encoded).toBe(
        "0000000000000000000000000000000000000000000000000de0b6b3a7640000",
      );
    });

    it("should encode bigint values", () => {
      const encoded = encodeUint256(BigInt(255));
      expect(encoded).toBe(
        "00000000000000000000000000000000000000000000000000000000000000ff",
      );
    });
  });

  describe("decodeUint256", () => {
    it("should decode hex to bigint", () => {
      expect(decodeUint256("0x1")).toBe(BigInt(1));
      expect(decodeUint256("0xff")).toBe(BigInt(255));
    });

    it("should handle zero values", () => {
      expect(decodeUint256("0x")).toBe(BigInt(0));
      expect(decodeUint256("0x0")).toBe(BigInt(0));
    });

    it("should handle large values", () => {
      expect(decodeUint256("0xde0b6b3a7640000")).toBe(
        BigInt("1000000000000000000"),
      );
    });
  });

  describe("decodeString", () => {
    it("should return empty string for invalid input", () => {
      expect(decodeString("")).toBe("");
      expect(decodeString("0x")).toBe("");
    });

    it("should decode valid ABI-encoded strings", () => {
      // This is an ABI-encoded "Test" string
      const encoded =
        "0x0000000000000000000000000000000000000000000000000000000000000020" +
        "0000000000000000000000000000000000000000000000000000000000000004" +
        "5465737400000000000000000000000000000000000000000000000000000000";
      expect(decodeString(encoded)).toBe("Test");
    });
  });

  // ===========================================================================
  // ERC-20 VERIFICATION
  // ===========================================================================

  describe("verifyERC20Balance", () => {
    it("should verify sufficient ERC-20 balance", async () => {
      const balanceHex = "0x" + (BigInt(1000) * BigInt(10 ** 18)).toString(16);
      const decimalsHex = "0x12"; // 18

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: balanceHex, id: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: decimalsHex, id: 1 }),
        });

      const result = await verifyERC20Balance(
        chainId,
        validContract,
        validWallet,
        (BigInt(100) * BigInt(10 ** 18)).toString(),
      );

      expect(result.verified).toBe(true);
      expect(result.verificationMethod).toBe("on_chain");
    });

    it("should fail for insufficient balance", async () => {
      const balanceHex = "0x" + (BigInt(50) * BigInt(10 ** 18)).toString(16);
      const decimalsHex = "0x12";

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: balanceHex, id: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: decimalsHex, id: 1 }),
        });

      const result = await verifyERC20Balance(
        chainId,
        validContract,
        validWallet,
        (BigInt(100) * BigInt(10 ** 18)).toString(),
      );

      expect(result.verified).toBe(false);
    });

    it("should use cached results on second call", async () => {
      const balanceHex = "0x" + (BigInt(1000) * BigInt(10 ** 18)).toString(16);
      const decimalsHex = "0x12";

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: balanceHex, id: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: decimalsHex, id: 1 }),
        });

      await verifyERC20Balance(chainId, validContract, validWallet, "100");
      const cachedResult = await verifyERC20Balance(
        chainId,
        validContract,
        validWallet,
        "100",
      );

      expect(cachedResult.verificationMethod).toBe("cached");
      expect(mockFetch).toHaveBeenCalledTimes(2); // Only first call made requests
    });

    it("should handle RPC errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("RPC timeout"));

      const result = await verifyERC20Balance(
        chainId,
        validContract,
        validWallet,
        "100",
      );

      expect(result.verified).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle default 18 decimals when decimals call fails", async () => {
      const balanceHex = "0x" + BigInt(1000).toString(16);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: balanceHex, id: 1 }),
        })
        .mockRejectedValueOnce(new Error("decimals not implemented"));

      const result = await verifyERC20Balance(
        chainId,
        validContract,
        validWallet,
        "100",
      );

      expect(result.verified).toBe(true);
    });
  });

  // ===========================================================================
  // ERC-721 VERIFICATION
  // ===========================================================================

  describe("verifyERC721Ownership", () => {
    it("should verify NFT ownership by balance", async () => {
      const balanceHex = "0x" + (5).toString(16);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ jsonrpc: "2.0", result: balanceHex, id: 1 }),
      });

      const result = await verifyERC721Ownership(
        chainId,
        validContract,
        validWallet,
      );

      expect(result.verified).toBe(true);
      expect(result.balance).toBe("5");
    });

    it("should fail when balance is zero", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jsonrpc: "2.0", result: "0x0", id: 1 }),
      });

      const result = await verifyERC721Ownership(
        chainId,
        validContract,
        validWallet,
      );

      expect(result.verified).toBe(false);
    });

    it("should verify specific token IDs", async () => {
      const ownerResult = "0x000000000000000000000000" + validWallet.slice(2);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: ownerResult, id: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: ownerResult, id: 1 }),
        });

      const result = await verifyERC721Ownership(
        chainId,
        validContract,
        validWallet,
        {
          requiredTokenIds: ["1", "2"],
        },
      );

      expect(result.verified).toBe(true);
      expect(result.tokenIds).toContain("1");
      expect(result.tokenIds).toContain("2");
    });

    it("should fail when required token is not owned", async () => {
      const differentOwner =
        "0x000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ jsonrpc: "2.0", result: differentOwner, id: 1 }),
      });

      const result = await verifyERC721Ownership(
        chainId,
        validContract,
        validWallet,
        {
          requiredTokenIds: ["100"],
        },
      );

      expect(result.verified).toBe(false);
    });

    it("should check minimum NFT count", async () => {
      const balanceHex = "0x" + (2).toString(16);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ jsonrpc: "2.0", result: balanceHex, id: 1 }),
      });

      const result = await verifyERC721Ownership(
        chainId,
        validContract,
        validWallet,
        {
          minimumNFTCount: 5,
        },
      );

      expect(result.verified).toBe(false);
      expect(result.error).toContain("Insufficient NFT count");
    });
  });

  // ===========================================================================
  // ERC-1155 VERIFICATION
  // ===========================================================================

  describe("verifyERC1155Ownership", () => {
    it("should verify ERC-1155 token balance", async () => {
      const balanceHex = "0x" + (10).toString(16);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ jsonrpc: "2.0", result: balanceHex, id: 1 }),
      });

      const result = await verifyERC1155Ownership(
        chainId,
        validContract,
        validWallet,
        "1",
      );

      expect(result.verified).toBe(true);
      expect(result.balance).toBe("10");
      expect(result.tokenIds).toContain("1");
    });

    it("should fail when balance is insufficient", async () => {
      const balanceHex = "0x" + (5).toString(16);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ jsonrpc: "2.0", result: balanceHex, id: 1 }),
      });

      const result = await verifyERC1155Ownership(
        chainId,
        validContract,
        validWallet,
        "1",
        {
          minimumAmount: "10",
        },
      );

      expect(result.verified).toBe(false);
    });

    it("should handle zero balance", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jsonrpc: "2.0", result: "0x0", id: 1 }),
      });

      const result = await verifyERC1155Ownership(
        chainId,
        validContract,
        validWallet,
        "1",
      );

      expect(result.verified).toBe(false);
    });
  });

  describe("verifyERC1155BatchOwnership", () => {
    it("should verify batch ownership across multiple tokens", async () => {
      const balance1 = "0x" + (5).toString(16);
      const balance2 = "0x" + (10).toString(16);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: balance1, id: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: balance2, id: 1 }),
        });

      const result = await verifyERC1155BatchOwnership(
        chainId,
        validContract,
        validWallet,
        ["1", "2"],
      );

      expect(result.verified).toBe(true);
      expect(result.balance).toBe("15"); // 5 + 10
      expect(result.tokenIds).toContain("1");
      expect(result.tokenIds).toContain("2");
    });

    it("should fail with empty token IDs", async () => {
      const result = await verifyERC1155BatchOwnership(
        chainId,
        validContract,
        validWallet,
        [],
      );

      expect(result.verified).toBe(false);
      expect(result.error).toBe("No token IDs provided");
    });

    it("should check minimum total amount", async () => {
      const balance1 = "0x" + (3).toString(16);
      const balance2 = "0x" + (2).toString(16);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: balance1, id: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: balance2, id: 1 }),
        });

      const result = await verifyERC1155BatchOwnership(
        chainId,
        validContract,
        validWallet,
        ["1", "2"],
        { minimumTotalAmount: "10" },
      );

      expect(result.verified).toBe(false);
      expect(result.balance).toBe("5");
    });
  });

  // ===========================================================================
  // REQUIREMENT VERIFICATION
  // ===========================================================================

  describe("verifyRequirement", () => {
    it("should verify ERC-20 requirement", async () => {
      const balanceHex = "0x" + (BigInt(1000) * BigInt(10 ** 18)).toString(16);
      const decimalsHex = "0x12";

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: balanceHex, id: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: decimalsHex, id: 1 }),
        });

      const requirement: TokenRequirementCondition = {
        id: "req-1",
        contractAddress: validContract,
        chainId,
        standard: "erc20",
        minimumBalance: (BigInt(100) * BigInt(10 ** 18)).toString(),
      };

      const result = await verifyRequirement(requirement, validWallet);

      expect(result.verified).toBe(true);
    });

    it("should verify ERC-721 requirement", async () => {
      const balanceHex = "0x" + (3).toString(16);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ jsonrpc: "2.0", result: balanceHex, id: 1 }),
      });

      const requirement: TokenRequirementCondition = {
        id: "req-1",
        contractAddress: validContract,
        chainId,
        standard: "erc721",
        minimumNFTCount: 1,
      };

      const result = await verifyRequirement(requirement, validWallet);

      expect(result.verified).toBe(true);
    });

    it("should reject invalid wallet address", async () => {
      const requirement: TokenRequirementCondition = {
        id: "req-1",
        contractAddress: validContract,
        chainId,
        standard: "erc721",
      };

      const result = await verifyRequirement(requirement, "invalid");

      expect(result.verified).toBe(false);
      expect(result.error).toBe("Invalid wallet address");
    });

    it("should reject invalid contract address", async () => {
      const requirement: TokenRequirementCondition = {
        id: "req-1",
        contractAddress: "invalid",
        chainId,
        standard: "erc721",
      };

      const result = await verifyRequirement(requirement, validWallet);

      expect(result.verified).toBe(false);
      expect(result.error).toBe("Invalid contract address");
    });

    it("should require tokenId for ERC-1155", async () => {
      const requirement: TokenRequirementCondition = {
        id: "req-1",
        contractAddress: validContract,
        chainId,
        standard: "erc1155",
        // No tokenId or requiredTokenIds
      };

      const result = await verifyRequirement(requirement, validWallet);

      expect(result.verified).toBe(false);
      expect(result.error).toBe(
        "ERC-1155 requires tokenId or requiredTokenIds",
      );
    });
  });

  describe("verifyRequirements", () => {
    it("should verify all requirements with AND operator", async () => {
      const balanceHex1 = "0x" + (1000).toString(16);
      const decimalsHex = "0x12";
      const balanceHex2 = "0x" + (5).toString(16);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: balanceHex1, id: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: decimalsHex, id: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: balanceHex2, id: 1 }),
        });

      const requirements: TokenRequirementCondition[] = [
        {
          id: "req-1",
          contractAddress: validContract,
          chainId,
          standard: "erc20",
          minimumBalance: "100",
        },
        {
          id: "req-2",
          contractAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          chainId,
          standard: "erc721",
          minimumNFTCount: 1,
        },
      ];

      const { verified, results } = await verifyRequirements(
        requirements,
        validWallet,
        "AND",
      );

      expect(verified).toBe(true);
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.verified)).toBe(true);
    });

    it("should pass with OR operator when one requirement passes", async () => {
      const failBalance = "0x0";
      const passBalance = "0x" + (5).toString(16);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: failBalance, id: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: passBalance, id: 1 }),
        });

      const requirements: TokenRequirementCondition[] = [
        {
          id: "req-1",
          contractAddress: validContract,
          chainId,
          standard: "erc721",
        },
        {
          id: "req-2",
          contractAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          chainId,
          standard: "erc721",
        },
      ];

      const { verified, results } = await verifyRequirements(
        requirements,
        validWallet,
        "OR",
      );

      expect(verified).toBe(true);
      expect(results.some((r) => r.verified)).toBe(true);
    });

    it("should return true for empty requirements", async () => {
      const { verified, results } = await verifyRequirements([], validWallet);

      expect(verified).toBe(true);
      expect(results).toHaveLength(0);
    });
  });

  // ===========================================================================
  // MULTI-CHAIN VERIFICATION
  // ===========================================================================

  describe("verifyMultiChain", () => {
    it("should verify across multiple chains", async () => {
      const balance1 = "0x" + (10).toString(16);
      const balance2 = "0x" + (5).toString(16);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: balance1, id: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: balance2, id: 1 }),
        });

      const result = await verifyMultiChain({
        walletAddress: validWallet,
        requirements: [
          {
            chainId: "0x1",
            contractAddress: validContract,
            standard: "erc721",
          },
          {
            chainId: "0x89",
            contractAddress: validContract,
            standard: "erc721",
          },
        ],
      });

      expect(result.allVerified).toBe(true);
      expect(result.results).toHaveLength(2);
    });

    it("should handle partial failures", async () => {
      const passBalance = "0x" + (5).toString(16);
      const failBalance = "0x0";

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: passBalance, id: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: failBalance, id: 1 }),
        });

      const result = await verifyMultiChain({
        walletAddress: validWallet,
        requirements: [
          {
            chainId: "0x1",
            contractAddress: validContract,
            standard: "erc721",
          },
          {
            chainId: "0x89",
            contractAddress: validContract,
            standard: "erc721",
          },
        ],
      });

      expect(result.allVerified).toBe(false);
      expect(result.results[0].verified).toBe(true);
      expect(result.results[1].verified).toBe(false);
    });
  });

  // ===========================================================================
  // CACHE MANAGEMENT
  // ===========================================================================

  describe("Cache Management", () => {
    it("should clear all cache with clearVerificationCache", async () => {
      const balanceHex = "0x" + (10).toString(16);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ jsonrpc: "2.0", result: balanceHex, id: 1 }),
      });

      await verifyERC721Ownership(chainId, validContract, validWallet);

      clearVerificationCache();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ jsonrpc: "2.0", result: balanceHex, id: 1 }),
      });

      const result = await verifyERC721Ownership(
        chainId,
        validContract,
        validWallet,
      );

      expect(result.verificationMethod).toBe("on_chain");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should clear wallet-specific cache with clearWalletCache", async () => {
      const balanceHex = "0x" + (10).toString(16);
      const wallet2 = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

      // Cache for both wallets
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: balanceHex, id: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: balanceHex, id: 1 }),
        });

      await verifyERC721Ownership(chainId, validContract, validWallet);
      await verifyERC721Ownership(chainId, validContract, wallet2);

      clearWalletCache(validWallet);

      // wallet1 should need to refetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ jsonrpc: "2.0", result: balanceHex, id: 1 }),
      });

      const result1 = await verifyERC721Ownership(
        chainId,
        validContract,
        validWallet,
      );
      const result2 = await verifyERC721Ownership(
        chainId,
        validContract,
        wallet2,
      );

      expect(result1.verificationMethod).toBe("on_chain");
      expect(result2.verificationMethod).toBe("cached");
    });
  });

  // ===========================================================================
  // SIGNATURE GENERATION
  // ===========================================================================

  describe("generateSignatureMessage", () => {
    it("should generate message with wallet address and nonce", () => {
      const message = generateSignatureMessage(validWallet, "abc123");

      expect(message).toContain(validWallet);
      expect(message).toContain("abc123");
      expect(message).toContain("Nonce:");
      expect(message).toContain("Timestamp:");
    });

    it("should include timestamp", () => {
      const message = generateSignatureMessage(validWallet, "nonce");

      expect(message).toMatch(/Timestamp: \d{4}-\d{2}-\d{2}/);
    });
  });

  // ===========================================================================
  // TOKEN INFO
  // ===========================================================================

  describe("getERC20TokenInfo", () => {
    it("should fetch token info", async () => {
      const nameEncoded =
        "0x0000000000000000000000000000000000000000000000000000000000000020" +
        "0000000000000000000000000000000000000000000000000000000000000004" +
        "5553444300000000000000000000000000000000000000000000000000000000";
      const symbolEncoded =
        "0x0000000000000000000000000000000000000000000000000000000000000020" +
        "0000000000000000000000000000000000000000000000000000000000000004" +
        "5553444300000000000000000000000000000000000000000000000000000000";
      const decimalsHex = "0x6";
      const totalSupplyHex =
        "0x" + (BigInt(1000000) * BigInt(10 ** 6)).toString(16);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: nameEncoded, id: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: symbolEncoded, id: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: decimalsHex, id: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: totalSupplyHex, id: 1 }),
        });

      const info = await getERC20TokenInfo(validContract, chainId);

      expect(info.address).toBe(validContract.toLowerCase());
      expect(info.chainId).toBe(chainId);
      expect(info.standard).toBe("erc20");
      expect(info.decimals).toBe(6);
    });

    it("should use default decimals on failure", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ jsonrpc: "2.0", result: "0x", id: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ jsonrpc: "2.0", result: "0x", id: 1 }),
        })
        .mockRejectedValueOnce(new Error("decimals not supported"))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ jsonrpc: "2.0", result: "0x", id: 1 }),
        });

      const info = await getERC20TokenInfo(validContract, chainId);

      expect(info.decimals).toBe(18); // Default
    });
  });
});
