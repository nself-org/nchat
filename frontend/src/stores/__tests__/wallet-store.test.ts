/**
 * Tests for Wallet Store
 *
 * Zustand store for managing wallet connection state, balances, tokens, and NFTs
 */

import { useWalletStore } from "../wallet-store";
import type { WalletProvider, ChainId } from "@/lib/wallet/wallet-connector";

describe("WalletStore", () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useWalletStore.getState().reset();
  });

  describe("initial state", () => {
    it("should have correct initial state", () => {
      const state = useWalletStore.getState();

      expect(state.isConnected).toBe(false);
      expect(state.address).toBeNull();
      expect(state.chainId).toBeNull();
      expect(state.provider).toBeNull();
      expect(state.balance).toBeNull();
      expect(state.isConnecting).toBe(false);
      expect(state.error).toBeNull();
      expect(state.tokens).toEqual([]);
      expect(state.nfts).toEqual([]);
      expect(state.isLoadingTokens).toBe(false);
      expect(state.isLoadingNFTs).toBe(false);
      expect(state.pendingTransactions).toEqual([]);
      expect(state.isWalletModalOpen).toBe(false);
      expect(state.isTransactionModalOpen).toBe(false);
      expect(state.selectedToken).toBeNull();
    });
  });

  describe("setConnected", () => {
    it("should update wallet connection state", () => {
      const mockProvider: WalletProvider = "metamask";
      const mockAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";
      const mockChainId: ChainId = 1;

      useWalletStore.getState().setConnected({
        isConnected: true,
        address: mockAddress,
        chainId: mockChainId,
        provider: mockProvider,
        balance: "1.5",
      });

      const state = useWalletStore.getState();
      expect(state.isConnected).toBe(true);
      expect(state.address).toBe(mockAddress);
      expect(state.chainId).toBe(mockChainId);
      expect(state.provider).toBe(mockProvider);
      expect(state.balance).toBe("1.5");
      expect(state.isConnecting).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should clear error and connecting state when connected", () => {
      useWalletStore.getState().setError("Connection failed");
      useWalletStore.getState().setConnecting(true);

      useWalletStore.getState().setConnected({
        isConnected: true,
        address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        chainId: 1,
        provider: "metamask",
        balance: "0",
      });

      const state = useWalletStore.getState();
      expect(state.error).toBeNull();
      expect(state.isConnecting).toBe(false);
    });
  });

  describe("setDisconnected", () => {
    it("should reset all state to initial values", () => {
      // Set up a connected state with data
      useWalletStore.getState().setConnected({
        isConnected: true,
        address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        chainId: 1,
        provider: "metamask",
        balance: "1.5",
      });
      useWalletStore.getState().setTokens([
        {
          address: "0xToken",
          symbol: "TKN",
          balance: "100",
          decimals: 18,
          name: "Token",
        },
      ]);
      useWalletStore.getState().setWalletModalOpen(true);

      // Disconnect
      useWalletStore.getState().setDisconnected();

      const state = useWalletStore.getState();
      expect(state.isConnected).toBe(false);
      expect(state.address).toBeNull();
      expect(state.chainId).toBeNull();
      expect(state.provider).toBeNull();
      expect(state.balance).toBeNull();
      expect(state.tokens).toEqual([]);
      expect(state.isWalletModalOpen).toBe(false);
    });
  });

  describe("setConnecting", () => {
    it("should update connecting state to true", () => {
      useWalletStore.getState().setConnecting(true);

      expect(useWalletStore.getState().isConnecting).toBe(true);
    });

    it("should update connecting state to false", () => {
      useWalletStore.getState().setConnecting(true);
      useWalletStore.getState().setConnecting(false);

      expect(useWalletStore.getState().isConnecting).toBe(false);
    });
  });

  describe("setError", () => {
    it("should set error message", () => {
      useWalletStore.getState().setError("Connection failed");

      const state = useWalletStore.getState();
      expect(state.error).toBe("Connection failed");
    });

    it("should clear connecting state when error is set", () => {
      useWalletStore.getState().setConnecting(true);
      useWalletStore.getState().setError("Error occurred");

      const state = useWalletStore.getState();
      expect(state.error).toBe("Error occurred");
      expect(state.isConnecting).toBe(false);
    });

    it("should clear error when set to null", () => {
      useWalletStore.getState().setError("Some error");
      useWalletStore.getState().setError(null);

      expect(useWalletStore.getState().error).toBeNull();
    });
  });

  describe("updateBalance", () => {
    it("should update wallet balance", () => {
      useWalletStore.getState().updateBalance("2.5");

      expect(useWalletStore.getState().balance).toBe("2.5");
    });

    it("should update balance even when connected", () => {
      useWalletStore.getState().setConnected({
        isConnected: true,
        address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        chainId: 1,
        provider: "metamask",
        balance: "1.0",
      });

      useWalletStore.getState().updateBalance("3.5");

      expect(useWalletStore.getState().balance).toBe("3.5");
    });
  });

  describe("setTokens", () => {
    it("should update tokens list", () => {
      const tokens = [
        {
          address: "0xToken1",
          symbol: "TKN1",
          balance: "100",
          decimals: 18,
          name: "Token 1",
        },
        {
          address: "0xToken2",
          symbol: "TKN2",
          balance: "200",
          decimals: 6,
          name: "Token 2",
        },
      ];

      useWalletStore.getState().setTokens(tokens);

      const state = useWalletStore.getState();
      expect(state.tokens).toEqual(tokens);
      expect(state.isLoadingTokens).toBe(false);
    });

    it("should clear loading state when tokens are set", () => {
      useWalletStore.getState().setLoadingTokens(true);
      useWalletStore.getState().setTokens([]);

      expect(useWalletStore.getState().isLoadingTokens).toBe(false);
    });
  });

  describe("setNFTs", () => {
    it("should update NFTs list", () => {
      const nfts = [
        {
          contractAddress: "0xNFT1",
          tokenId: "1",
          name: "NFT 1",
          description: "First NFT",
          imageUrl: "https://example.com/nft1.png",
        },
      ];

      useWalletStore.getState().setNFTs(nfts);

      const state = useWalletStore.getState();
      expect(state.nfts).toEqual(nfts);
      expect(state.isLoadingNFTs).toBe(false);
    });

    it("should clear loading state when NFTs are set", () => {
      useWalletStore.getState().setLoadingNFTs(true);
      useWalletStore.getState().setNFTs([]);

      expect(useWalletStore.getState().isLoadingNFTs).toBe(false);
    });
  });

  describe("setLoadingTokens", () => {
    it("should set loading tokens to true", () => {
      useWalletStore.getState().setLoadingTokens(true);

      expect(useWalletStore.getState().isLoadingTokens).toBe(true);
    });

    it("should set loading tokens to false", () => {
      useWalletStore.getState().setLoadingTokens(true);
      useWalletStore.getState().setLoadingTokens(false);

      expect(useWalletStore.getState().isLoadingTokens).toBe(false);
    });
  });

  describe("setLoadingNFTs", () => {
    it("should set loading NFTs to true", () => {
      useWalletStore.getState().setLoadingNFTs(true);

      expect(useWalletStore.getState().isLoadingNFTs).toBe(true);
    });

    it("should set loading NFTs to false", () => {
      useWalletStore.getState().setLoadingNFTs(true);
      useWalletStore.getState().setLoadingNFTs(false);

      expect(useWalletStore.getState().isLoadingNFTs).toBe(false);
    });
  });

  describe("pending transactions", () => {
    const mockTx = {
      hash: "0xabc123",
      status: "pending" as const,
      timestamp: Date.now(),
      description: "Send tokens",
    };

    it("should add pending transaction", () => {
      useWalletStore.getState().addPendingTransaction(mockTx);

      const state = useWalletStore.getState();
      expect(state.pendingTransactions).toHaveLength(1);
      expect(state.pendingTransactions[0]).toEqual(mockTx);
    });

    it("should add multiple pending transactions", () => {
      const tx2 = { ...mockTx, hash: "0xdef456" };

      useWalletStore.getState().addPendingTransaction(mockTx);
      useWalletStore.getState().addPendingTransaction(tx2);

      const state = useWalletStore.getState();
      expect(state.pendingTransactions).toHaveLength(2);
    });

    it("should update pending transaction", () => {
      useWalletStore.getState().addPendingTransaction(mockTx);
      useWalletStore
        .getState()
        .updatePendingTransaction("0xabc123", { status: "confirmed" });

      const state = useWalletStore.getState();
      expect(state.pendingTransactions[0].status).toBe("confirmed");
      expect(state.pendingTransactions[0].hash).toBe("0xabc123");
    });

    it("should not update non-matching transaction", () => {
      useWalletStore.getState().addPendingTransaction(mockTx);
      useWalletStore
        .getState()
        .updatePendingTransaction("0xnonexistent", { status: "confirmed" });

      const state = useWalletStore.getState();
      expect(state.pendingTransactions[0].status).toBe("pending");
    });

    it("should remove pending transaction", () => {
      useWalletStore.getState().addPendingTransaction(mockTx);
      useWalletStore.getState().removePendingTransaction("0xabc123");

      const state = useWalletStore.getState();
      expect(state.pendingTransactions).toHaveLength(0);
    });

    it("should not remove non-matching transaction", () => {
      useWalletStore.getState().addPendingTransaction(mockTx);
      useWalletStore.getState().removePendingTransaction("0xnonexistent");

      const state = useWalletStore.getState();
      expect(state.pendingTransactions).toHaveLength(1);
    });
  });

  describe("modal states", () => {
    it("should open wallet modal", () => {
      useWalletStore.getState().setWalletModalOpen(true);

      expect(useWalletStore.getState().isWalletModalOpen).toBe(true);
    });

    it("should close wallet modal", () => {
      useWalletStore.getState().setWalletModalOpen(true);
      useWalletStore.getState().setWalletModalOpen(false);

      expect(useWalletStore.getState().isWalletModalOpen).toBe(false);
    });

    it("should open transaction modal", () => {
      useWalletStore.getState().setTransactionModalOpen(true);

      expect(useWalletStore.getState().isTransactionModalOpen).toBe(true);
    });

    it("should close transaction modal", () => {
      useWalletStore.getState().setTransactionModalOpen(true);
      useWalletStore.getState().setTransactionModalOpen(false);

      expect(useWalletStore.getState().isTransactionModalOpen).toBe(false);
    });
  });

  describe("setSelectedToken", () => {
    it("should set selected token", () => {
      const token = {
        address: "0xToken",
        symbol: "TKN",
        balance: "100",
        decimals: 18,
        name: "Token",
      };

      useWalletStore.getState().setSelectedToken(token);

      expect(useWalletStore.getState().selectedToken).toEqual(token);
    });

    it("should clear selected token", () => {
      const token = {
        address: "0xToken",
        symbol: "TKN",
        balance: "100",
        decimals: 18,
        name: "Token",
      };

      useWalletStore.getState().setSelectedToken(token);
      useWalletStore.getState().setSelectedToken(null);

      expect(useWalletStore.getState().selectedToken).toBeNull();
    });
  });

  describe("reset", () => {
    it("should reset all state to initial values", () => {
      // Set up complex state
      useWalletStore.getState().setConnected({
        isConnected: true,
        address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        chainId: 1,
        provider: "metamask",
        balance: "1.5",
      });
      useWalletStore.getState().setTokens([
        {
          address: "0xToken",
          symbol: "TKN",
          balance: "100",
          decimals: 18,
          name: "Token",
        },
      ]);
      useWalletStore.getState().setNFTs([
        {
          contractAddress: "0xNFT",
          tokenId: "1",
          name: "NFT",
          description: "Test",
          imageUrl: "",
        },
      ]);
      useWalletStore.getState().addPendingTransaction({
        hash: "0xabc",
        status: "pending",
        timestamp: Date.now(),
        description: "Test",
      });
      useWalletStore.getState().setWalletModalOpen(true);
      useWalletStore.getState().setError("Test error");

      // Reset
      useWalletStore.getState().reset();

      const state = useWalletStore.getState();
      expect(state.isConnected).toBe(false);
      expect(state.address).toBeNull();
      expect(state.tokens).toEqual([]);
      expect(state.nfts).toEqual([]);
      expect(state.pendingTransactions).toEqual([]);
      expect(state.isWalletModalOpen).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});
