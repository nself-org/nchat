/**
 * NFT Verifier Tests
 * Tests for on-chain token verification
 */

import type {
  TokenRequirement,
  CryptoNetwork,
  TokenType,
} from "@/types/billing";

// Mock fetch globally before importing the module
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock window.ethereum for browser tests
const mockEthereumRequest = jest.fn();
Object.defineProperty(global, "window", {
  value: {
    ethereum: {
      request: mockEthereumRequest,
    },
  },
  writable: true,
});

// Now import after mocks are set up
import {
  verifyERC20Balance,
  verifyERC721Ownership,
  verifyERC1155Ownership,
  verifyTokenRequirement,
  verifyAllRequirements,
  checkChannelAccess,
  getUserTokenHoldings,
  verifyOwnershipViaAPI,
  clearVerificationCache,
  clearWalletCache,
} from "../nft-verifier";

describe("NFT Verifier", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    clearVerificationCache();
    // Reset environment variables to ensure no Alchemy key
    delete process.env.NEXT_PUBLIC_ALCHEMY_ETHEREUM_API_KEY;
    delete process.env.NEXT_PUBLIC_ALCHEMY_POLYGON_API_KEY;
    delete process.env.NEXT_PUBLIC_ALCHEMY_ARBITRUM_API_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("verifyERC20Balance", () => {
    const validWallet = "0x1234567890123456789012345678901234567890";
    const validContract = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
    const network: CryptoNetwork = "ethereum";

    it("should verify ERC-20 balance via RPC", async () => {
      // Mock balance response (1000 tokens with 18 decimals)
      const balanceHex =
        "0x" + (BigInt(1000) * BigInt(10 ** 18)).toString(16).padStart(64, "0");
      // Mock decimals response (18)
      const decimalsHex = "0x" + (18).toString(16).padStart(64, "0");

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
        network,
        validContract,
        validWallet,
        100,
      );

      expect(result.verified).toBe(true);
      expect(result.balance).toBe(1000);
      expect(result.source).toBe("rpc");
    });

    it("should return not verified when balance is insufficient", async () => {
      // Mock balance response (50 tokens with 18 decimals)
      const balanceHex =
        "0x" + (BigInt(50) * BigInt(10 ** 18)).toString(16).padStart(64, "0");
      const decimalsHex = "0x" + (18).toString(16).padStart(64, "0");

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
        network,
        validContract,
        validWallet,
        100,
      );

      expect(result.verified).toBe(false);
      expect(result.balance).toBe(50);
    });

    it("should handle RPC errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("RPC connection failed"));
      mockEthereumRequest.mockRejectedValueOnce(new Error("No provider"));

      const result = await verifyERC20Balance(
        network,
        validContract,
        validWallet,
        100,
      );

      expect(result.verified).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should use cached results within TTL", async () => {
      const balanceHex =
        "0x" + (BigInt(1000) * BigInt(10 ** 18)).toString(16).padStart(64, "0");
      const decimalsHex = "0x" + (18).toString(16).padStart(64, "0");

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

      // First call
      await verifyERC20Balance(network, validContract, validWallet, 100);

      // Second call should use cache
      const cachedResult = await verifyERC20Balance(
        network,
        validContract,
        validWallet,
        100,
      );

      expect(cachedResult.source).toBe("cache");
      expect(mockFetch).toHaveBeenCalledTimes(2); // Only first call made requests
    });
  });

  describe("verifyERC721Ownership", () => {
    const validWallet = "0x1234567890123456789012345678901234567890";
    const validContract = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
    const network: CryptoNetwork = "ethereum";

    it("should verify ERC-721 ownership via Alchemy API", async () => {
      // Set up Alchemy API key
      process.env.NEXT_PUBLIC_ALCHEMY_ETHEREUM_API_KEY = "test-api-key";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            ownedNfts: [{ tokenId: "1" }, { tokenId: "2" }, { tokenId: "3" }],
          }),
      });

      const result = await verifyERC721Ownership(
        network,
        validContract,
        validWallet,
      );

      expect(result.verified).toBe(true);
      expect(result.balance).toBe(3);
      expect(result.tokenIds).toContain("1");
      expect(result.source).toBe("alchemy");
    });

    it("should fall back to RPC when Alchemy fails", async () => {
      // Set up Alchemy API key so it tries Alchemy first
      process.env.NEXT_PUBLIC_ALCHEMY_ETHEREUM_API_KEY = "test-api-key";

      // Simulate Alchemy failure
      mockFetch.mockRejectedValueOnce(new Error("Alchemy unavailable"));

      // RPC balance response
      const balanceHex = "0x" + (5).toString(16).padStart(64, "0");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ jsonrpc: "2.0", result: balanceHex, id: 1 }),
      });

      const result = await verifyERC721Ownership(
        network,
        validContract,
        validWallet,
      );

      expect(result.verified).toBe(true);
      expect(result.balance).toBe(5);
      expect(result.source).toBe("rpc");
    });

    it("should verify specific token IDs via Alchemy", async () => {
      process.env.NEXT_PUBLIC_ALCHEMY_ETHEREUM_API_KEY = "test-api-key";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            ownedNfts: [{ tokenId: "1" }, { tokenId: "5" }, { tokenId: "10" }],
          }),
      });

      const result = await verifyERC721Ownership(
        network,
        validContract,
        validWallet,
        ["1", "5"], // Required token IDs
        undefined,
      );

      expect(result.verified).toBe(true);
      expect(result.tokenIds).toContain("1");
      expect(result.tokenIds).toContain("5");
    });

    it("should fail when required token IDs not owned", async () => {
      process.env.NEXT_PUBLIC_ALCHEMY_ETHEREUM_API_KEY = "test-api-key";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            ownedNfts: [{ tokenId: "1" }, { tokenId: "2" }],
          }),
      });

      const result = await verifyERC721Ownership(
        network,
        validContract,
        validWallet,
        ["1", "100"], // 100 is not owned
        undefined,
      );

      expect(result.verified).toBe(false);
    });

    it("should verify minimum token count", async () => {
      process.env.NEXT_PUBLIC_ALCHEMY_ETHEREUM_API_KEY = "test-api-key";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            ownedNfts: [{ tokenId: "1" }, { tokenId: "2" }],
          }),
      });

      const result = await verifyERC721Ownership(
        network,
        validContract,
        validWallet,
        undefined,
        5, // Requires 5 NFTs, only has 2
      );

      expect(result.verified).toBe(false);
      expect(result.balance).toBe(2);
    });

    it("should verify via RPC when no Alchemy key", async () => {
      // No Alchemy key set, should use RPC directly
      const balanceHex = "0x" + (3).toString(16).padStart(64, "0");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ jsonrpc: "2.0", result: balanceHex, id: 1 }),
      });

      const result = await verifyERC721Ownership(
        network,
        validContract,
        validWallet,
      );

      expect(result.verified).toBe(true);
      expect(result.balance).toBe(3);
      expect(result.source).toBe("rpc");
    });
  });

  describe("verifyERC1155Ownership", () => {
    const validWallet = "0x1234567890123456789012345678901234567890";
    const validContract = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
    const network: CryptoNetwork = "ethereum";

    it("should verify ERC-1155 ownership for specific token IDs via RPC", async () => {
      // Mock RPC responses for each token ID
      const balance1Hex = "0x" + (10).toString(16).padStart(64, "0");
      const balance2Hex = "0x" + (5).toString(16).padStart(64, "0");

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: balance1Hex, id: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: balance2Hex, id: 1 }),
        });

      const result = await verifyERC1155Ownership(
        network,
        validContract,
        validWallet,
        ["1", "2"],
      );

      expect(result.verified).toBe(true);
      expect(result.balance).toBe(15); // Total: 10 + 5
      expect(result.tokenIds).toContain("1");
      expect(result.tokenIds).toContain("2");
      expect(result.source).toBe("rpc");
    });

    it("should check minimum token count", async () => {
      const balance1Hex = "0x" + (2).toString(16).padStart(64, "0");
      const balance2Hex = "0x" + (3).toString(16).padStart(64, "0");

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: balance1Hex, id: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: balance2Hex, id: 1 }),
        });

      const result = await verifyERC1155Ownership(
        network,
        validContract,
        validWallet,
        ["1", "2"],
        10, // Requires 10, only has 5
      );

      expect(result.verified).toBe(false);
      expect(result.balance).toBe(5);
    });

    it("should verify ERC-1155 via Alchemy when available", async () => {
      process.env.NEXT_PUBLIC_ALCHEMY_ETHEREUM_API_KEY = "test-api-key";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            ownedNfts: [
              { tokenId: "1", balance: "10" },
              { tokenId: "2", balance: "5" },
            ],
          }),
      });

      const result = await verifyERC1155Ownership(
        network,
        validContract,
        validWallet,
        ["1", "2"],
      );

      expect(result.verified).toBe(true);
      expect(result.balance).toBe(15);
      expect(result.source).toBe("alchemy");
    });
  });

  describe("verifyTokenRequirement", () => {
    const validWallet = "0x1234567890123456789012345678901234567890";

    it("should return verified for disabled requirements", async () => {
      const requirement: TokenRequirement = {
        id: "test-1",
        tokenType: "erc721",
        contractAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        network: "ethereum",
        name: "Test NFT",
        enabled: false,
        createdAt: new Date(),
      };

      const result = await verifyTokenRequirement(requirement, validWallet);

      expect(result.verified).toBe(true);
    });

    it("should reject invalid wallet address", async () => {
      const requirement: TokenRequirement = {
        id: "test-1",
        tokenType: "erc721",
        contractAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        network: "ethereum",
        name: "Test NFT",
        enabled: true,
        createdAt: new Date(),
      };

      const result = await verifyTokenRequirement(
        requirement,
        "invalid-address",
      );

      expect(result.verified).toBe(false);
      expect(result.error).toBe("Invalid wallet address");
    });

    it("should reject invalid contract address", async () => {
      const requirement: TokenRequirement = {
        id: "test-1",
        tokenType: "erc721",
        contractAddress: "invalid-contract",
        network: "ethereum",
        name: "Test NFT",
        enabled: true,
        createdAt: new Date(),
      };

      const result = await verifyTokenRequirement(requirement, validWallet);

      expect(result.verified).toBe(false);
      expect(result.error).toBe("Invalid contract address");
    });

    it("should require token IDs for ERC-1155", async () => {
      const requirement: TokenRequirement = {
        id: "test-1",
        tokenType: "erc1155",
        contractAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        network: "ethereum",
        name: "Test Multi-Token",
        enabled: true,
        tokenIds: [], // Empty token IDs
        createdAt: new Date(),
      };

      const result = await verifyTokenRequirement(requirement, validWallet);

      expect(result.verified).toBe(false);
      expect(result.error).toBe("ERC-1155 requires token IDs");
    });

    it("should verify ERC-20 requirement", async () => {
      const balanceHex =
        "0x" + (BigInt(100) * BigInt(10 ** 18)).toString(16).padStart(64, "0");
      const decimalsHex = "0x" + (18).toString(16).padStart(64, "0");

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

      const requirement: TokenRequirement = {
        id: "test-erc20",
        tokenType: "erc20",
        contractAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        network: "ethereum",
        name: "Test Token",
        minBalance: 50,
        enabled: true,
        createdAt: new Date(),
      };

      const result = await verifyTokenRequirement(requirement, validWallet);

      expect(result.verified).toBe(true);
      expect(result.balance).toBe(100);
    });
  });

  describe("verifyAllRequirements", () => {
    const validWallet = "0x1234567890123456789012345678901234567890";

    it("should skip disabled requirements", async () => {
      const requirements: TokenRequirement[] = [
        {
          id: "req-1",
          tokenType: "erc721",
          contractAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          network: "ethereum",
          name: "Disabled NFT",
          enabled: false,
          createdAt: new Date(),
        },
      ];

      const { allVerified, results } = await verifyAllRequirements(
        requirements,
        validWallet,
      );

      expect(allVerified).toBe(true);
      expect(results.size).toBe(0); // Disabled requirements are skipped
    });

    it("should return false if any requirement fails", async () => {
      // Mock low balance
      const erc20BalanceHex =
        "0x" + (BigInt(10) * BigInt(10 ** 18)).toString(16).padStart(64, "0");
      const erc20DecimalsHex = "0x" + (18).toString(16).padStart(64, "0");

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: erc20BalanceHex, id: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              jsonrpc: "2.0",
              result: erc20DecimalsHex,
              id: 1,
            }),
        });

      const requirements: TokenRequirement[] = [
        {
          id: "req-1",
          tokenType: "erc20",
          contractAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          network: "ethereum",
          name: "Token A",
          minBalance: 1000, // High requirement
          enabled: true,
          createdAt: new Date(),
        },
      ];

      const { allVerified, results } = await verifyAllRequirements(
        requirements,
        validWallet,
      );

      expect(allVerified).toBe(false);
      expect(results.get("req-1")?.verified).toBe(false);
    });

    it("should verify single requirement successfully", async () => {
      const erc721BalanceHex = "0x" + (2).toString(16).padStart(64, "0");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ jsonrpc: "2.0", result: erc721BalanceHex, id: 1 }),
      });

      const requirements: TokenRequirement[] = [
        {
          id: "req-1",
          tokenType: "erc721",
          contractAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          network: "ethereum",
          name: "NFT Collection",
          enabled: true,
          createdAt: new Date(),
        },
      ];

      const { allVerified, results } = await verifyAllRequirements(
        requirements,
        validWallet,
      );

      expect(allVerified).toBe(true);
      expect(results.get("req-1")?.verified).toBe(true);
    });
  });

  describe("checkChannelAccess", () => {
    const validWallet = "0x1234567890123456789012345678901234567890";

    it("should return true for public channels (no requirements)", async () => {
      const hasAccess = await checkChannelAccess("channel-1", validWallet, []);

      expect(hasAccess).toBe(true);
    });

    it("should check requirements for token-gated channels", async () => {
      const balanceHex = "0x" + (1).toString(16).padStart(64, "0");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ jsonrpc: "2.0", result: balanceHex, id: 1 }),
      });

      const requirements: TokenRequirement[] = [
        {
          id: "req-1",
          tokenType: "erc721",
          contractAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          network: "ethereum",
          name: "Access NFT",
          enabled: true,
          createdAt: new Date(),
        },
      ];

      const hasAccess = await checkChannelAccess(
        "channel-1",
        validWallet,
        requirements,
      );

      expect(hasAccess).toBe(true);
    });

    it("should deny access when requirements not met", async () => {
      const balanceHex = "0x0"; // Zero balance
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ jsonrpc: "2.0", result: balanceHex, id: 1 }),
      });

      const requirements: TokenRequirement[] = [
        {
          id: "req-1",
          tokenType: "erc721",
          contractAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          network: "ethereum",
          name: "Access NFT",
          enabled: true,
          createdAt: new Date(),
        },
      ];

      const hasAccess = await checkChannelAccess(
        "channel-1",
        validWallet,
        requirements,
      );

      expect(hasAccess).toBe(false);
    });
  });

  describe("getUserTokenHoldings", () => {
    const validWallet = "0x1234567890123456789012345678901234567890";
    const network: CryptoNetwork = "ethereum";

    it("should return holdings for ERC-20 contract", async () => {
      const contracts = [
        {
          address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          type: "erc20" as TokenType,
        },
      ];

      // ERC-20 balance
      const erc20BalanceHex =
        "0x" + (BigInt(500) * BigInt(10 ** 18)).toString(16).padStart(64, "0");
      const erc20DecimalsHex = "0x" + (18).toString(16).padStart(64, "0");

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: erc20BalanceHex, id: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              jsonrpc: "2.0",
              result: erc20DecimalsHex,
              id: 1,
            }),
        });

      const holdings = await getUserTokenHoldings(
        validWallet,
        network,
        contracts,
      );

      expect(holdings.length).toBe(1);
      expect(holdings[0].tokenType).toBe("erc20");
      expect(holdings[0].balance).toBe(500);
    });

    it("should skip contracts with zero balance", async () => {
      const contracts = [
        {
          address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          type: "erc20" as TokenType,
        },
      ];

      const erc20BalanceHex = "0x0";
      const erc20DecimalsHex = "0x" + (18).toString(16).padStart(64, "0");

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ jsonrpc: "2.0", result: erc20BalanceHex, id: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              jsonrpc: "2.0",
              result: erc20DecimalsHex,
              id: 1,
            }),
        });

      const holdings = await getUserTokenHoldings(
        validWallet,
        network,
        contracts,
      );

      expect(holdings.length).toBe(0);
    });

    it("should return ERC-721 holdings", async () => {
      const contracts = [
        {
          address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          type: "erc721" as TokenType,
        },
      ];

      const erc721BalanceHex = "0x" + (3).toString(16).padStart(64, "0");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ jsonrpc: "2.0", result: erc721BalanceHex, id: 1 }),
      });

      const holdings = await getUserTokenHoldings(
        validWallet,
        network,
        contracts,
      );

      expect(holdings.length).toBe(1);
      expect(holdings[0].tokenType).toBe("erc721");
      expect(holdings[0].balance).toBe(3);
    });
  });

  describe("verifyOwnershipViaAPI", () => {
    const validWallet = "0x1234567890123456789012345678901234567890";
    const validContract = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";

    it("should use Alchemy API when available", async () => {
      process.env.NEXT_PUBLIC_ALCHEMY_ETHEREUM_API_KEY = "test-api-key";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            ownedNfts: [{ tokenId: "42" }],
          }),
      });

      const result = await verifyOwnershipViaAPI(
        validWallet,
        validContract,
        "ethereum",
      );

      expect(result.verified).toBe(true);
      expect(result.balance).toBe(1);
      expect(result.tokenIds).toContain("42");
      expect(result.source).toBe("alchemy");
    });

    it("should reject invalid wallet address", async () => {
      const result = await verifyOwnershipViaAPI(
        "not-an-address",
        validContract,
        "ethereum",
      );

      expect(result.verified).toBe(false);
      expect(result.error).toBe("Invalid wallet address");
    });

    it("should reject invalid contract address", async () => {
      const result = await verifyOwnershipViaAPI(
        validWallet,
        "not-a-contract",
        "ethereum",
      );

      expect(result.verified).toBe(false);
      expect(result.error).toBe("Invalid contract address");
    });

    it("should fall back to RPC for BSC (unsupported by Alchemy)", async () => {
      const balanceHex = "0x" + (5).toString(16).padStart(64, "0");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ jsonrpc: "2.0", result: balanceHex, id: 1 }),
      });

      const result = await verifyOwnershipViaAPI(
        validWallet,
        validContract,
        "bsc",
        "erc721",
      );

      expect(result.verified).toBe(true);
      expect(result.source).toBe("rpc");
    });

    it("should fall back to RPC when no Alchemy key set", async () => {
      // No Alchemy key set
      const balanceHex = "0x" + (2).toString(16).padStart(64, "0");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ jsonrpc: "2.0", result: balanceHex, id: 1 }),
      });

      const result = await verifyOwnershipViaAPI(
        validWallet,
        validContract,
        "ethereum",
        "erc721",
      );

      expect(result.verified).toBe(true);
      expect(result.source).toBe("rpc");
    });
  });

  describe("Cache management", () => {
    it("should clear all cache", async () => {
      // First, populate the cache with RPC call (no Alchemy key)
      const balanceHex = "0x" + (10).toString(16).padStart(64, "0");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ jsonrpc: "2.0", result: balanceHex, id: 1 }),
      });

      await verifyERC721Ownership(
        "ethereum",
        "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        "0x1234567890123456789012345678901234567890",
      );

      // Clear cache
      clearVerificationCache();

      // Next call should hit the network again
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ jsonrpc: "2.0", result: balanceHex, id: 1 }),
      });

      const result = await verifyERC721Ownership(
        "ethereum",
        "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        "0x1234567890123456789012345678901234567890",
      );

      expect(result.source).toBe("rpc"); // Not 'cache'
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should clear cache for specific wallet", async () => {
      const wallet1 = "0x1111111111111111111111111111111111111111";
      const wallet2 = "0x2222222222222222222222222222222222222222";
      const contract = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";

      const balanceHex = "0x" + (5).toString(16).padStart(64, "0");

      // Populate cache for both wallets
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

      await verifyERC721Ownership("ethereum", contract, wallet1);
      await verifyERC721Ownership("ethereum", contract, wallet2);

      // Clear cache for wallet1 only
      clearWalletCache(wallet1);

      // wallet1 should hit network again
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ jsonrpc: "2.0", result: balanceHex, id: 1 }),
      });

      const result1 = await verifyERC721Ownership(
        "ethereum",
        contract,
        wallet1,
      );
      expect(result1.source).toBe("rpc");

      // wallet2 should still use cache
      const result2 = await verifyERC721Ownership(
        "ethereum",
        contract,
        wallet2,
      );
      expect(result2.source).toBe("cache");
    });
  });
});
