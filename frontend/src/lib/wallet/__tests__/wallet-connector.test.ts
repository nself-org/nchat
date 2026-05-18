/**
 * @fileoverview Tests for Wallet Connector
 */

import {
  WalletConnector,
  getWalletConnector,
  resetWalletConnector,
  SUPPORTED_CHAINS,
  WALLET_ERROR_CODES,
  type EthereumProvider,
  type ChainId,
} from "../wallet-connector";

// Mock Ethereum provider
const createMockProvider = (
  overrides: Partial<EthereumProvider> = {},
): EthereumProvider => ({
  isMetaMask: true,
  isCoinbaseWallet: false,
  request: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn(),
  selectedAddress: "0x1234567890abcdef1234567890abcdef12345678",
  chainId: "0x1",
  ...overrides,
});

describe("WalletConnector", () => {
  let connector: WalletConnector;
  let mockProvider: EthereumProvider;

  beforeEach(() => {
    resetWalletConnector();
    connector = new WalletConnector();
    mockProvider = createMockProvider();
    connector.setEthereumProvider(mockProvider);
  });

  // ==========================================================================
  // Provider Detection Tests
  // ==========================================================================

  describe("Provider Detection", () => {
    it("should detect MetaMask", () => {
      connector.setEthereumProvider(createMockProvider({ isMetaMask: true }));
      expect(connector.isMetaMaskAvailable()).toBe(true);
    });

    it("should detect Coinbase Wallet", () => {
      connector.setEthereumProvider(
        createMockProvider({ isCoinbaseWallet: true, isMetaMask: false }),
      );
      expect(connector.isCoinbaseWalletAvailable()).toBe(true);
    });

    it("should always report WalletConnect as available", () => {
      expect(connector.isWalletConnectAvailable()).toBe(true);
    });

    it("should return available providers", () => {
      const providers = connector.getAvailableProviders();
      expect(providers).toContain("walletconnect");
    });

    it("should return MetaMask if available", () => {
      connector.setEthereumProvider(createMockProvider({ isMetaMask: true }));
      const providers = connector.getAvailableProviders();
      expect(providers).toContain("metamask");
    });

    it("should return Coinbase if available", () => {
      connector.setEthereumProvider(
        createMockProvider({ isCoinbaseWallet: true, isMetaMask: false }),
      );
      const providers = connector.getAvailableProviders();
      expect(providers).toContain("coinbase");
    });

    it("should get and set Ethereum provider", () => {
      expect(connector.getEthereumProvider()).toBe(mockProvider);

      connector.setEthereumProvider(null);
      expect(connector.getEthereumProvider()).toBeNull();
    });

    it("should return false for MetaMask if provider is null", () => {
      connector.setEthereumProvider(null);
      expect(connector.isMetaMaskAvailable()).toBe(false);
    });

    it("should return false for Coinbase if provider is null", () => {
      connector.setEthereumProvider(null);
      expect(connector.isCoinbaseWalletAvailable()).toBe(false);
    });
  });

  // ==========================================================================
  // Connection Tests
  // ==========================================================================

  describe("Connection", () => {
    describe("connect", () => {
      it("should connect to MetaMask", async () => {
        (mockProvider.request as jest.Mock).mockImplementation(({ method }) => {
          if (method === "eth_requestAccounts") {
            return Promise.resolve([
              "0x1234567890abcdef1234567890abcdef12345678",
            ]);
          }
          if (method === "eth_chainId") {
            return Promise.resolve("0x1");
          }
          if (method === "eth_getBalance") {
            return Promise.resolve("0x1000000000000000");
          }
          return Promise.resolve(null);
        });

        const result = await connector.connect({ provider: "metamask" });

        expect(result.success).toBe(true);
        expect(result.data?.isConnected).toBe(true);
        expect(result.data?.address).toBe(
          "0x1234567890abcdef1234567890abcdef12345678",
        );
        expect(result.data?.provider).toBe("metamask");
      });

      it("should connect to Coinbase Wallet", async () => {
        connector.setEthereumProvider(
          createMockProvider({
            isCoinbaseWallet: true,
            request: jest.fn().mockImplementation(({ method }) => {
              if (method === "eth_requestAccounts") {
                return Promise.resolve([
                  "0xabcdef1234567890abcdef1234567890abcdef12",
                ]);
              }
              if (method === "eth_chainId") {
                return Promise.resolve("0x1");
              }
              if (method === "eth_getBalance") {
                return Promise.resolve("0x0");
              }
              return Promise.resolve(null);
            }),
          }),
        );

        const result = await connector.connect({ provider: "coinbase" });

        expect(result.success).toBe(true);
        expect(result.data?.provider).toBe("coinbase");
      });

      it("should fail if provider not found", async () => {
        connector.setEthereumProvider(null);
        const result = await connector.connect({ provider: "metamask" });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(WALLET_ERROR_CODES.PROVIDER_NOT_FOUND);
      });

      it("should fail if no accounts returned", async () => {
        (mockProvider.request as jest.Mock).mockResolvedValue([]);
        const result = await connector.connect({ provider: "metamask" });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(WALLET_ERROR_CODES.UNAUTHORIZED);
      });

      it("should handle user rejection", async () => {
        (mockProvider.request as jest.Mock).mockRejectedValue({
          code: WALLET_ERROR_CODES.USER_REJECTED,
          message: "User rejected the request",
        });

        const result = await connector.connect({ provider: "metamask" });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(WALLET_ERROR_CODES.USER_REJECTED);
      });

      it("should switch chain if requested", async () => {
        (mockProvider.request as jest.Mock).mockImplementation(({ method }) => {
          if (method === "eth_requestAccounts") {
            return Promise.resolve([
              "0x1234567890abcdef1234567890abcdef12345678",
            ]);
          }
          if (method === "eth_chainId") {
            return Promise.resolve("0x1");
          }
          if (method === "eth_getBalance") {
            return Promise.resolve("0x0");
          }
          if (method === "wallet_switchEthereumChain") {
            return Promise.resolve(null);
          }
          return Promise.resolve(null);
        });

        const result = await connector.connect({
          provider: "metamask",
          chainId: "0x89",
        });

        expect(result.success).toBe(true);
      });

      it("should fail for WalletConnect without configuration", async () => {
        const result = await connector.connect({ provider: "walletconnect" });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(WALLET_ERROR_CODES.UNSUPPORTED_METHOD);
      });

      it("should default to MetaMask", async () => {
        (mockProvider.request as jest.Mock).mockImplementation(({ method }) => {
          if (method === "eth_requestAccounts") {
            return Promise.resolve([
              "0x1234567890abcdef1234567890abcdef12345678",
            ]);
          }
          if (method === "eth_chainId") {
            return Promise.resolve("0x1");
          }
          if (method === "eth_getBalance") {
            return Promise.resolve("0x0");
          }
          return Promise.resolve(null);
        });

        const result = await connector.connect();

        expect(result.success).toBe(true);
        expect(result.data?.provider).toBe("metamask");
      });
    });

    describe("disconnect", () => {
      it("should disconnect successfully", async () => {
        // First connect
        (mockProvider.request as jest.Mock).mockImplementation(({ method }) => {
          if (method === "eth_requestAccounts") {
            return Promise.resolve([
              "0x1234567890abcdef1234567890abcdef12345678",
            ]);
          }
          if (method === "eth_chainId") {
            return Promise.resolve("0x1");
          }
          if (method === "eth_getBalance") {
            return Promise.resolve("0x0");
          }
          return Promise.resolve(null);
        });

        await connector.connect({ provider: "metamask" });
        expect(connector.isConnected()).toBe(true);

        const result = await connector.disconnect();

        expect(result.success).toBe(true);
        expect(connector.isConnected()).toBe(false);
        expect(connector.getAddress()).toBeNull();
      });

      it("should emit disconnect event", async () => {
        const disconnectHandler = jest.fn();
        connector.on("disconnect", disconnectHandler);

        await connector.disconnect();

        expect(disconnectHandler).toHaveBeenCalled();
      });
    });

    describe("State", () => {
      it("should return current state", () => {
        const state = connector.getState();

        expect(state.isConnected).toBe(false);
        expect(state.address).toBeNull();
        expect(state.chainId).toBeNull();
      });

      it("should return connected state after connection", async () => {
        (mockProvider.request as jest.Mock).mockImplementation(({ method }) => {
          if (method === "eth_requestAccounts") {
            return Promise.resolve([
              "0x1234567890abcdef1234567890abcdef12345678",
            ]);
          }
          if (method === "eth_chainId") {
            return Promise.resolve("0x1");
          }
          if (method === "eth_getBalance") {
            return Promise.resolve("0x0");
          }
          return Promise.resolve(null);
        });

        await connector.connect({ provider: "metamask" });
        const state = connector.getState();

        expect(state.isConnected).toBe(true);
        expect(state.address).toBe(
          "0x1234567890abcdef1234567890abcdef12345678",
        );
      });

      it("should get address", async () => {
        (mockProvider.request as jest.Mock).mockImplementation(({ method }) => {
          if (method === "eth_requestAccounts") {
            return Promise.resolve([
              "0x1234567890abcdef1234567890abcdef12345678",
            ]);
          }
          if (method === "eth_chainId") {
            return Promise.resolve("0x1");
          }
          if (method === "eth_getBalance") {
            return Promise.resolve("0x0");
          }
          return Promise.resolve(null);
        });

        expect(connector.getAddress()).toBeNull();

        await connector.connect({ provider: "metamask" });

        expect(connector.getAddress()).toBe(
          "0x1234567890abcdef1234567890abcdef12345678",
        );
      });

      it("should get chain ID", async () => {
        (mockProvider.request as jest.Mock).mockImplementation(({ method }) => {
          if (method === "eth_requestAccounts") {
            return Promise.resolve([
              "0x1234567890abcdef1234567890abcdef12345678",
            ]);
          }
          if (method === "eth_chainId") {
            return Promise.resolve("0x89");
          }
          if (method === "eth_getBalance") {
            return Promise.resolve("0x0");
          }
          return Promise.resolve(null);
        });

        await connector.connect({ provider: "metamask" });

        expect(connector.getChainId()).toBe("0x89");
      });
    });
  });

  // ==========================================================================
  // Chain Tests
  // ==========================================================================

  describe("Chain Methods", () => {
    describe("switchChain", () => {
      it("should switch chain successfully", async () => {
        (mockProvider.request as jest.Mock).mockResolvedValue(null);

        const result = await connector.switchChain("0x89");

        expect(result.success).toBe(true);
        expect(result.data).toBe("0x89");
      });

      it("should fail if provider not found", async () => {
        connector.setEthereumProvider(null);
        const result = await connector.switchChain("0x89");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(WALLET_ERROR_CODES.PROVIDER_NOT_FOUND);
      });

      it("should try to add chain if not available", async () => {
        (mockProvider.request as jest.Mock)
          .mockRejectedValueOnce({ code: 4902, message: "Chain not added" })
          .mockResolvedValue(null);

        const result = await connector.switchChain("0x89");

        expect(result.success).toBe(true);
      });

      it("should handle switch error", async () => {
        (mockProvider.request as jest.Mock).mockRejectedValue({
          code: WALLET_ERROR_CODES.USER_REJECTED,
          message: "User rejected",
        });

        const result = await connector.switchChain("0x89");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(WALLET_ERROR_CODES.USER_REJECTED);
      });
    });

    describe("addChain", () => {
      it("should add chain successfully", async () => {
        (mockProvider.request as jest.Mock).mockResolvedValue(null);

        const result = await connector.addChain("0x89");

        expect(result.success).toBe(true);
        expect(result.data).toBe("0x89");
      });

      it("should fail if provider not found", async () => {
        connector.setEthereumProvider(null);
        const result = await connector.addChain("0x89");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(WALLET_ERROR_CODES.PROVIDER_NOT_FOUND);
      });

      it("should fail for unsupported chain", async () => {
        const result = await connector.addChain("0xFFFF" as ChainId);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(WALLET_ERROR_CODES.INVALID_PARAMS);
      });

      it("should handle add error", async () => {
        (mockProvider.request as jest.Mock).mockRejectedValue({
          code: WALLET_ERROR_CODES.USER_REJECTED,
          message: "User rejected",
        });

        const result = await connector.addChain("0x89");

        expect(result.success).toBe(false);
      });
    });

    describe("Chain Configuration", () => {
      it("should get chain configuration", () => {
        const config = connector.getChainConfig("0x1");

        expect(config).toBeDefined();
        expect(config?.chainName).toBe("Ethereum Mainnet");
      });

      it("should return null for unknown chain", () => {
        const config = connector.getChainConfig("0xFFFF" as ChainId);

        expect(config).toBeNull();
      });

      it("should get all supported chains", () => {
        const chains = connector.getSupportedChains();

        expect(chains.length).toBeGreaterThan(0);
        expect(chains.find((c) => c.chainId === "0x1")).toBeDefined();
      });

      it("should check if chain is supported", () => {
        expect(connector.isChainSupported("0x1")).toBe(true);
        expect(connector.isChainSupported("0xFFFF")).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Balance Tests
  // ==========================================================================

  describe("Balance Methods", () => {
    describe("getBalance", () => {
      it("should get balance for address", async () => {
        (mockProvider.request as jest.Mock).mockResolvedValue(
          "0x1000000000000000",
        );

        const result = await connector.getBalance(
          "0x1234567890abcdef1234567890abcdef12345678",
        );

        expect(result.success).toBe(true);
        expect(result.data).toBe("0x1000000000000000");
      });

      it("should fail without address", async () => {
        const result = await connector.getBalance();

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(WALLET_ERROR_CODES.INVALID_PARAMS);
      });

      it("should fail if provider not found", async () => {
        connector.setEthereumProvider(null);
        const result = await connector.getBalance(
          "0x1234567890abcdef1234567890abcdef12345678",
        );

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(WALLET_ERROR_CODES.PROVIDER_NOT_FOUND);
      });

      it("should handle error", async () => {
        (mockProvider.request as jest.Mock).mockRejectedValue({
          code: WALLET_ERROR_CODES.INTERNAL_ERROR,
          message: "Failed",
        });

        const result = await connector.getBalance(
          "0x1234567890abcdef1234567890abcdef12345678",
        );

        expect(result.success).toBe(false);
      });
    });

    describe("refreshBalance", () => {
      it("should refresh and update balance", async () => {
        // First connect
        (mockProvider.request as jest.Mock).mockImplementation(({ method }) => {
          if (method === "eth_requestAccounts") {
            return Promise.resolve([
              "0x1234567890abcdef1234567890abcdef12345678",
            ]);
          }
          if (method === "eth_chainId") {
            return Promise.resolve("0x1");
          }
          if (method === "eth_getBalance") {
            return Promise.resolve("0x2000000000000000");
          }
          return Promise.resolve(null);
        });

        await connector.connect({ provider: "metamask" });

        const balanceHandler = jest.fn();
        connector.on("balanceChanged", balanceHandler);

        const result = await connector.refreshBalance();

        expect(result.success).toBe(true);
        expect(balanceHandler).toHaveBeenCalled();
      });
    });
  });

  // ==========================================================================
  // Signing Tests
  // ==========================================================================

  describe("Signing Methods", () => {
    describe("signMessage", () => {
      it("should sign a message", async () => {
        // First connect
        (mockProvider.request as jest.Mock).mockImplementation(({ method }) => {
          if (method === "eth_requestAccounts") {
            return Promise.resolve([
              "0x1234567890abcdef1234567890abcdef12345678",
            ]);
          }
          if (method === "eth_chainId") {
            return Promise.resolve("0x1");
          }
          if (method === "eth_getBalance") {
            return Promise.resolve("0x0");
          }
          if (method === "personal_sign") {
            return Promise.resolve("0xsignature");
          }
          return Promise.resolve(null);
        });

        await connector.connect({ provider: "metamask" });

        const result = await connector.signMessage({
          message: "Hello, World!",
        });

        expect(result.success).toBe(true);
        expect(result.data?.message).toBe("Hello, World!");
        expect(result.data?.signature).toBe("0xsignature");
        expect(result.data?.address).toBe(
          "0x1234567890abcdef1234567890abcdef12345678",
        );
      });

      it("should sign with explicit address", async () => {
        (mockProvider.request as jest.Mock).mockResolvedValue("0xsignature");

        const result = await connector.signMessage({
          message: "Test",
          address: "0xabcdef1234567890abcdef1234567890abcdef12",
        });

        expect(result.success).toBe(true);
        expect(result.data?.address).toBe(
          "0xabcdef1234567890abcdef1234567890abcdef12",
        );
      });

      it("should fail without address", async () => {
        const result = await connector.signMessage({ message: "Test" });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(WALLET_ERROR_CODES.INVALID_PARAMS);
      });

      it("should fail if provider not found", async () => {
        connector.setEthereumProvider(null);
        const result = await connector.signMessage({
          message: "Test",
          address: "0x1234567890abcdef1234567890abcdef12345678",
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(WALLET_ERROR_CODES.PROVIDER_NOT_FOUND);
      });

      it("should handle signing error", async () => {
        (mockProvider.request as jest.Mock).mockImplementation(({ method }) => {
          if (method === "eth_requestAccounts") {
            return Promise.resolve([
              "0x1234567890abcdef1234567890abcdef12345678",
            ]);
          }
          if (method === "eth_chainId") {
            return Promise.resolve("0x1");
          }
          if (method === "eth_getBalance") {
            return Promise.resolve("0x0");
          }
          if (method === "personal_sign") {
            return Promise.reject({
              code: WALLET_ERROR_CODES.USER_REJECTED,
              message: "Rejected",
            });
          }
          return Promise.resolve(null);
        });

        await connector.connect({ provider: "metamask" });

        const result = await connector.signMessage({ message: "Test" });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(WALLET_ERROR_CODES.USER_REJECTED);
      });
    });

    describe("signTypedData", () => {
      const domain = { name: "Test", version: "1" };
      const types = { Message: [{ name: "content", type: "string" }] };
      const value = { content: "Hello" };

      it("should sign typed data", async () => {
        (mockProvider.request as jest.Mock).mockResolvedValue(
          "0xtypedsignature",
        );

        const result = await connector.signTypedData(
          domain,
          types,
          value,
          "0x1234567890abcdef1234567890abcdef12345678",
        );

        expect(result.success).toBe(true);
        expect(result.data).toBe("0xtypedsignature");
      });

      it("should fail without address", async () => {
        const result = await connector.signTypedData(domain, types, value);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(WALLET_ERROR_CODES.INVALID_PARAMS);
      });

      it("should fail if provider not found", async () => {
        connector.setEthereumProvider(null);
        const result = await connector.signTypedData(
          domain,
          types,
          value,
          "0x1234567890abcdef1234567890abcdef12345678",
        );

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(WALLET_ERROR_CODES.PROVIDER_NOT_FOUND);
      });

      it("should handle signing error", async () => {
        (mockProvider.request as jest.Mock).mockRejectedValue({
          code: WALLET_ERROR_CODES.USER_REJECTED,
          message: "Rejected",
        });

        const result = await connector.signTypedData(
          domain,
          types,
          value,
          "0x1234567890abcdef1234567890abcdef12345678",
        );

        expect(result.success).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Event Tests
  // ==========================================================================

  describe("Events", () => {
    it("should add event listener", () => {
      const handler = jest.fn();
      connector.on("connect", handler);

      // Manually emit for testing
      (
        connector as unknown as {
          emit: (event: string, ...args: unknown[]) => void;
        }
      ).emit("connect", { isConnected: true });

      expect(handler).toHaveBeenCalledWith({ isConnected: true });
    });

    it("should remove event listener", () => {
      const handler = jest.fn();
      connector.on("connect", handler);
      connector.off("connect", handler);
      (
        connector as unknown as {
          emit: (event: string, ...args: unknown[]) => void;
        }
      ).emit("connect", { isConnected: true });

      expect(handler).not.toHaveBeenCalled();
    });

    it("should emit connect event on connection", async () => {
      const connectHandler = jest.fn();
      connector.on("connect", connectHandler);
      (mockProvider.request as jest.Mock).mockImplementation(({ method }) => {
        if (method === "eth_requestAccounts") {
          return Promise.resolve([
            "0x1234567890abcdef1234567890abcdef12345678",
          ]);
        }
        if (method === "eth_chainId") {
          return Promise.resolve("0x1");
        }
        if (method === "eth_getBalance") {
          return Promise.resolve("0x0");
        }
        return Promise.resolve(null);
      });

      await connector.connect({ provider: "metamask" });

      expect(connectHandler).toHaveBeenCalled();
    });

    it("should emit chainChanged event on chain switch", async () => {
      const chainHandler = jest.fn();
      connector.on("chainChanged", chainHandler);
      (mockProvider.request as jest.Mock).mockResolvedValue(null);

      await connector.switchChain("0x89");

      expect(chainHandler).toHaveBeenCalledWith("0x89");
    });
  });

  // ==========================================================================
  // Utility Tests
  // ==========================================================================

  describe("Utilities", () => {
    describe("formatAddress", () => {
      it("should format address correctly", () => {
        const formatted = connector.formatAddress(
          "0x1234567890abcdef1234567890abcdef12345678",
        );
        expect(formatted).toBe("0x1234...5678");
      });

      it("should handle custom start and end", () => {
        const formatted = connector.formatAddress(
          "0x1234567890abcdef1234567890abcdef12345678",
          8,
          6,
        );
        expect(formatted).toBe("0x123456...345678");
      });

      it("should return address unchanged if too short", () => {
        const formatted = connector.formatAddress("0x1234", 6, 4);
        expect(formatted).toBe("0x1234");
      });

      it("should handle empty address", () => {
        const formatted = connector.formatAddress("");
        expect(formatted).toBe("");
      });
    });

    describe("weiToEther", () => {
      it("should convert wei to ether", () => {
        const ether = connector.weiToEther("1000000000000000000");
        expect(parseFloat(ether)).toBe(1);
      });

      it("should handle small amounts", () => {
        const ether = connector.weiToEther("1000000000000000");
        expect(parseFloat(ether)).toBeCloseTo(0.001, 6);
      });

      it("should handle zero", () => {
        const ether = connector.weiToEther("0");
        expect(parseFloat(ether)).toBe(0);
      });
    });

    describe("etherToWei", () => {
      it("should convert ether to wei", () => {
        const wei = connector.etherToWei("1");
        expect(wei).toBe("0xde0b6b3a7640000");
      });

      it("should handle decimal amounts", () => {
        const wei = connector.etherToWei("0.5");
        expect(BigInt(wei)).toBeGreaterThan(0n);
      });
    });

    describe("isValidAddress", () => {
      it("should validate correct address", () => {
        expect(
          connector.isValidAddress(
            "0x1234567890abcdef1234567890abcdef12345678",
          ),
        ).toBe(true);
      });

      it("should reject address without 0x prefix", () => {
        expect(
          connector.isValidAddress("1234567890abcdef1234567890abcdef12345678"),
        ).toBe(false);
      });

      it("should reject address with wrong length", () => {
        expect(connector.isValidAddress("0x1234567890")).toBe(false);
      });

      it("should reject address with invalid characters", () => {
        expect(
          connector.isValidAddress(
            "0x1234567890abcdef1234567890abcdef1234567g",
          ),
        ).toBe(false);
      });
    });

    describe("Explorer URLs", () => {
      it("should get address explorer URL", async () => {
        (mockProvider.request as jest.Mock).mockImplementation(({ method }) => {
          if (method === "eth_requestAccounts") {
            return Promise.resolve([
              "0x1234567890abcdef1234567890abcdef12345678",
            ]);
          }
          if (method === "eth_chainId") {
            return Promise.resolve("0x1");
          }
          if (method === "eth_getBalance") {
            return Promise.resolve("0x0");
          }
          return Promise.resolve(null);
        });

        await connector.connect({ provider: "metamask" });

        const url = connector.getAddressExplorerUrl(
          "0x1234567890abcdef1234567890abcdef12345678",
        );

        expect(url).toBe(
          "https://etherscan.io/address/0x1234567890abcdef1234567890abcdef12345678",
        );
      });

      it("should get tx explorer URL", async () => {
        (mockProvider.request as jest.Mock).mockImplementation(({ method }) => {
          if (method === "eth_requestAccounts") {
            return Promise.resolve([
              "0x1234567890abcdef1234567890abcdef12345678",
            ]);
          }
          if (method === "eth_chainId") {
            return Promise.resolve("0x89");
          }
          if (method === "eth_getBalance") {
            return Promise.resolve("0x0");
          }
          return Promise.resolve(null);
        });

        await connector.connect({ provider: "metamask" });

        const url = connector.getTxExplorerUrl("0xtxhash");

        expect(url).toBe("https://polygonscan.com/tx/0xtxhash");
      });

      it("should return null if no chain connected", () => {
        expect(connector.getAddressExplorerUrl("0x123")).toBeNull();
        expect(connector.getTxExplorerUrl("0x123")).toBeNull();
      });

      it("should use explicit chainId", () => {
        const url = connector.getAddressExplorerUrl("0x123", "0x1");
        expect(url).toBe("https://etherscan.io/address/0x123");
      });
    });
  });

  // ==========================================================================
  // Singleton Tests
  // ==========================================================================

  describe("Singleton", () => {
    beforeEach(() => {
      resetWalletConnector();
    });

    it("should create singleton instance", () => {
      const instance = getWalletConnector();
      expect(instance).toBeInstanceOf(WalletConnector);
    });

    it("should return same instance", () => {
      const instance1 = getWalletConnector();
      const instance2 = getWalletConnector();

      expect(instance1).toBe(instance2);
    });

    it("should reset singleton", () => {
      const instance1 = getWalletConnector();
      resetWalletConnector();
      const instance2 = getWalletConnector();

      expect(instance1).not.toBe(instance2);
    });
  });

  // ==========================================================================
  // SUPPORTED_CHAINS Tests
  // ==========================================================================

  describe("SUPPORTED_CHAINS", () => {
    it("should have Ethereum Mainnet", () => {
      expect(SUPPORTED_CHAINS["0x1"]).toBeDefined();
      expect(SUPPORTED_CHAINS["0x1"].chainName).toBe("Ethereum Mainnet");
    });

    it("should have Polygon Mainnet", () => {
      expect(SUPPORTED_CHAINS["0x89"]).toBeDefined();
      expect(SUPPORTED_CHAINS["0x89"].nativeCurrency.symbol).toBe("MATIC");
    });

    it("should have correct structure for all chains", () => {
      Object.values(SUPPORTED_CHAINS).forEach((chain) => {
        expect(chain.chainId).toBeDefined();
        expect(chain.chainName).toBeDefined();
        expect(chain.nativeCurrency).toBeDefined();
        expect(chain.nativeCurrency.decimals).toBe(18);
        expect(chain.rpcUrls.length).toBeGreaterThan(0);
        expect(chain.blockExplorerUrls.length).toBeGreaterThan(0);
      });
    });
  });
});
