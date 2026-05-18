/**
 * @fileoverview Tests for Transaction Manager
 */

import {
  TransactionManager,
  getTransactionManager,
  resetTransactionManager,
  TX_ERROR_CODES,
  type TransactionRequest,
} from "../transaction-manager";
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

describe("TransactionManager", () => {
  let manager: TransactionManager;
  let mockProvider: EthereumProvider;

  beforeEach(() => {
    resetTransactionManager();
    mockProvider = createMockProvider();
    manager = new TransactionManager(mockProvider);
  });

  // ==========================================================================
  // Setup Tests
  // ==========================================================================

  describe("Setup", () => {
    it("should create manager with provider", () => {
      expect(manager.getProvider()).toBe(mockProvider);
    });

    it("should create manager without provider", () => {
      const managerWithoutProvider = new TransactionManager();
      expect(managerWithoutProvider.getProvider()).toBeNull();
    });

    it("should set and get provider", () => {
      const newProvider = createMockProvider();
      manager.setProvider(newProvider);
      expect(manager.getProvider()).toBe(newProvider);
    });

    it("should set provider to null", () => {
      manager.setProvider(null);
      expect(manager.getProvider()).toBeNull();
    });
  });

  // ==========================================================================
  // Transaction Building Tests
  // ==========================================================================

  describe("Transaction Building", () => {
    describe("buildTransaction", () => {
      it("should build basic transaction", () => {
        const tx = manager.buildTransaction({
          from: "0x1234567890abcdef1234567890abcdef12345678",
          to: "0xabcdef1234567890abcdef1234567890abcdef12",
        });

        expect(tx.from).toBe("0x1234567890abcdef1234567890abcdef12345678");
        expect(tx.to).toBe("0xabcdef1234567890abcdef1234567890abcdef12");
        expect(tx.value).toBe("0x0");
        expect(tx.data).toBe("0x");
      });

      it("should build transaction with value", () => {
        const tx = manager.buildTransaction({
          from: "0x1234567890abcdef1234567890abcdef12345678",
          to: "0xabcdef1234567890abcdef1234567890abcdef12",
          value: "0xde0b6b3a7640000",
        });

        expect(tx.value).toBe("0xde0b6b3a7640000");
      });

      it("should build transaction with data", () => {
        const tx = manager.buildTransaction({
          from: "0x1234567890abcdef1234567890abcdef12345678",
          to: "0xabcdef1234567890abcdef1234567890abcdef12",
          data: "0xa9059cbb",
        });

        expect(tx.data).toBe("0xa9059cbb");
      });

      it("should build transaction with chainId", () => {
        const tx = manager.buildTransaction({
          from: "0x1234567890abcdef1234567890abcdef12345678",
          to: "0xabcdef1234567890abcdef1234567890abcdef12",
          chainId: "0x1",
        });

        expect(tx.chainId).toBe("0x1");
      });
    });

    describe("buildContractCall", () => {
      it("should build contract call transaction", () => {
        const tx = manager.buildContractCall({
          from: "0x1234567890abcdef1234567890abcdef12345678",
          contractAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
          data: "0xa9059cbb",
        });

        expect(tx.from).toBe("0x1234567890abcdef1234567890abcdef12345678");
        expect(tx.to).toBe("0xabcdef1234567890abcdef1234567890abcdef12");
        expect(tx.data).toBe("0xa9059cbb");
        expect(tx.value).toBe("0x0");
      });

      it("should build contract call with value", () => {
        const tx = manager.buildContractCall({
          from: "0x1234567890abcdef1234567890abcdef12345678",
          contractAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
          data: "0xa9059cbb",
          value: "0x100",
        });

        expect(tx.value).toBe("0x100");
      });
    });

    describe("encodeFunctionCall", () => {
      it("should encode function call", () => {
        const data = manager.encodeFunctionCall("transfer(address,uint256)", [
          "0xabcdef1234567890abcdef1234567890abcdef12",
          100,
        ]);

        expect(data).toMatch(/^0x[a-f0-9]+$/);
      });

      it("should encode boolean parameters", () => {
        const data = manager.encodeFunctionCall("setApproval(bool)", [true]);
        expect(data).toContain("1".padStart(64, "0"));
      });

      it("should encode false boolean", () => {
        const data = manager.encodeFunctionCall("setApproval(bool)", [false]);
        expect(data).toContain("0".padStart(64, "0"));
      });
    });
  });

  // ==========================================================================
  // Gas Estimation Tests
  // ==========================================================================

  describe("Gas Estimation", () => {
    describe("estimateGas", () => {
      it("should estimate gas for transaction", async () => {
        (mockProvider.request as jest.Mock).mockImplementation(({ method }) => {
          if (method === "eth_estimateGas") {
            return Promise.resolve("0x5208");
          }
          if (method === "eth_gasPrice") {
            return Promise.resolve("0x3b9aca00");
          }
          if (method === "eth_feeHistory") {
            return Promise.reject(new Error("Not supported"));
          }
          return Promise.resolve(null);
        });

        const tx: TransactionRequest = {
          from: "0x1234567890abcdef1234567890abcdef12345678",
          to: "0xabcdef1234567890abcdef1234567890abcdef12",
          value: "0x0",
        };

        const result = await manager.estimateGas(tx);

        expect(result.success).toBe(true);
        expect(result.data?.gasLimit).toBe("0x5208");
        expect(result.data?.gasPrice).toBe("0x3b9aca00");
      });

      it("should include EIP-1559 fees if supported", async () => {
        (mockProvider.request as jest.Mock).mockImplementation(({ method }) => {
          if (method === "eth_estimateGas") {
            return Promise.resolve("0x5208");
          }
          if (method === "eth_gasPrice") {
            return Promise.resolve("0x3b9aca00");
          }
          if (method === "eth_feeHistory") {
            return Promise.resolve({
              baseFeePerGas: ["0x3b9aca00"],
              reward: [["0x77359400"]],
            });
          }
          return Promise.resolve(null);
        });

        const tx: TransactionRequest = {
          from: "0x1234567890abcdef1234567890abcdef12345678",
          to: "0xabcdef1234567890abcdef1234567890abcdef12",
        };

        const result = await manager.estimateGas(tx);

        expect(result.success).toBe(true);
        expect(result.data?.maxFeePerGas).toBeDefined();
        expect(result.data?.maxPriorityFeePerGas).toBeDefined();
      });

      it("should fail if provider not set", async () => {
        manager.setProvider(null);
        const result = await manager.estimateGas({
          from: "0x1234567890abcdef1234567890abcdef12345678",
          to: "0xabcdef1234567890abcdef1234567890abcdef12",
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(TX_ERROR_CODES.INTERNAL_ERROR);
      });

      it("should handle estimation error", async () => {
        (mockProvider.request as jest.Mock).mockRejectedValue({
          code: TX_ERROR_CODES.INSUFFICIENT_FUNDS,
          message: "Insufficient funds",
        });

        const result = await manager.estimateGas({
          from: "0x1234567890abcdef1234567890abcdef12345678",
          to: "0xabcdef1234567890abcdef1234567890abcdef12",
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(TX_ERROR_CODES.INSUFFICIENT_FUNDS);
      });
    });

    describe("getGasPrices", () => {
      it("should get gas prices", async () => {
        (mockProvider.request as jest.Mock).mockResolvedValue("0x3b9aca00");

        const result = await manager.getGasPrices();

        expect(result.success).toBe(true);
        expect(result.data?.slow).toBeDefined();
        expect(result.data?.standard).toBe("0x3b9aca00");
        expect(result.data?.fast).toBeDefined();
      });

      it("should fail if provider not set", async () => {
        manager.setProvider(null);
        const result = await manager.getGasPrices();

        expect(result.success).toBe(false);
      });

      it("should handle error", async () => {
        (mockProvider.request as jest.Mock).mockRejectedValue({
          code: TX_ERROR_CODES.INTERNAL_ERROR,
          message: "Failed",
        });

        const result = await manager.getGasPrices();

        expect(result.success).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Transaction Sending Tests
  // ==========================================================================

  describe("Transaction Sending", () => {
    describe("sendTransaction", () => {
      it("should send transaction", async () => {
        (mockProvider.request as jest.Mock).mockImplementation(({ method }) => {
          if (method === "eth_estimateGas") {
            return Promise.resolve("0x5208");
          }
          if (method === "eth_gasPrice") {
            return Promise.resolve("0x3b9aca00");
          }
          if (method === "eth_feeHistory") {
            return Promise.reject(new Error("Not supported"));
          }
          if (method === "eth_sendTransaction") {
            return Promise.resolve("0xtxhash123");
          }
          return Promise.resolve(null);
        });

        const tx: TransactionRequest = {
          from: "0x1234567890abcdef1234567890abcdef12345678",
          to: "0xabcdef1234567890abcdef1234567890abcdef12",
          value: "0x0",
        };

        const result = await manager.sendTransaction(tx);

        expect(result.success).toBe(true);
        expect(result.data).toBe("0xtxhash123");
      });

      it("should track pending transaction", async () => {
        (mockProvider.request as jest.Mock).mockImplementation(({ method }) => {
          if (method === "eth_estimateGas") return Promise.resolve("0x5208");
          if (method === "eth_gasPrice") return Promise.resolve("0x3b9aca00");
          if (method === "eth_feeHistory")
            return Promise.reject(new Error("Not supported"));
          if (method === "eth_sendTransaction")
            return Promise.resolve("0xtxhash456");
          return Promise.resolve(null);
        });

        await manager.sendTransaction({
          from: "0x1234567890abcdef1234567890abcdef12345678",
          to: "0xabcdef1234567890abcdef1234567890abcdef12",
        });

        const pending = manager.getPendingTransaction("0xtxhash456");
        expect(pending).toBeDefined();
        expect(pending?.status).toBe("submitted");
      });

      it("should fail if provider not set", async () => {
        manager.setProvider(null);
        const result = await manager.sendTransaction({
          from: "0x1234567890abcdef1234567890abcdef12345678",
          to: "0xabcdef1234567890abcdef1234567890abcdef12",
        });

        expect(result.success).toBe(false);
      });

      it("should fail with invalid from address", async () => {
        const result = await manager.sendTransaction({
          from: "invalid",
          to: "0xabcdef1234567890abcdef1234567890abcdef12",
        });

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain("from address");
      });

      it("should fail with invalid to address", async () => {
        const result = await manager.sendTransaction({
          from: "0x1234567890abcdef1234567890abcdef12345678",
          to: "invalid",
        });

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain("to address");
      });

      it("should fail with invalid value", async () => {
        const result = await manager.sendTransaction({
          from: "0x1234567890abcdef1234567890abcdef12345678",
          to: "0xabcdef1234567890abcdef1234567890abcdef12",
          value: "not_hex",
        });

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain("value");
      });

      it("should handle send error", async () => {
        (mockProvider.request as jest.Mock).mockImplementation(({ method }) => {
          if (method === "eth_estimateGas") return Promise.resolve("0x5208");
          if (method === "eth_gasPrice") return Promise.resolve("0x3b9aca00");
          if (method === "eth_feeHistory")
            return Promise.reject(new Error("Not supported"));
          if (method === "eth_sendTransaction") {
            return Promise.reject({
              code: TX_ERROR_CODES.USER_REJECTED,
              message: "Rejected",
            });
          }
          return Promise.resolve(null);
        });

        const result = await manager.sendTransaction({
          from: "0x1234567890abcdef1234567890abcdef12345678",
          to: "0xabcdef1234567890abcdef1234567890abcdef12",
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(TX_ERROR_CODES.USER_REJECTED);
      });
    });

    describe("validateTransaction", () => {
      it("should validate correct transaction", () => {
        const result = manager.validateTransaction({
          from: "0x1234567890abcdef1234567890abcdef12345678",
          to: "0xabcdef1234567890abcdef1234567890abcdef12",
        });

        expect(result.success).toBe(true);
      });

      it("should reject empty from", () => {
        const result = manager.validateTransaction({
          from: "",
          to: "0xabcdef1234567890abcdef1234567890abcdef12",
        });

        expect(result.success).toBe(false);
      });

      it("should reject empty to", () => {
        const result = manager.validateTransaction({
          from: "0x1234567890abcdef1234567890abcdef12345678",
          to: "",
        });

        expect(result.success).toBe(false);
      });
    });

    describe("signTransaction", () => {
      it("should sign transaction", async () => {
        (mockProvider.request as jest.Mock).mockResolvedValue("0xsignedtx");

        const result = await manager.signTransaction({
          from: "0x1234567890abcdef1234567890abcdef12345678",
          to: "0xabcdef1234567890abcdef1234567890abcdef12",
        });

        expect(result.success).toBe(true);
        expect(result.data).toBe("0xsignedtx");
      });

      it("should fail if provider not set", async () => {
        manager.setProvider(null);
        const result = await manager.signTransaction({
          from: "0x1234567890abcdef1234567890abcdef12345678",
          to: "0xabcdef1234567890abcdef1234567890abcdef12",
        });

        expect(result.success).toBe(false);
      });

      it("should handle signing error", async () => {
        (mockProvider.request as jest.Mock).mockRejectedValue({
          code: TX_ERROR_CODES.USER_REJECTED,
          message: "Rejected",
        });

        const result = await manager.signTransaction({
          from: "0x1234567890abcdef1234567890abcdef12345678",
          to: "0xabcdef1234567890abcdef1234567890abcdef12",
        });

        expect(result.success).toBe(false);
      });
    });

    describe("sendSignedTransaction", () => {
      it("should send signed transaction", async () => {
        (mockProvider.request as jest.Mock).mockResolvedValue("0xtxhash");

        const result = await manager.sendSignedTransaction("0xsignedtx");

        expect(result.success).toBe(true);
        expect(result.data).toBe("0xtxhash");
      });

      it("should fail if provider not set", async () => {
        manager.setProvider(null);
        const result = await manager.sendSignedTransaction("0xsignedtx");

        expect(result.success).toBe(false);
      });

      it("should handle send error", async () => {
        (mockProvider.request as jest.Mock).mockRejectedValue({
          code: TX_ERROR_CODES.INTERNAL_ERROR,
          message: "Failed",
        });

        const result = await manager.sendSignedTransaction("0xsignedtx");

        expect(result.success).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Receipt Tracking Tests
  // ==========================================================================

  describe("Receipt Tracking", () => {
    describe("getTransactionReceipt", () => {
      it("should get transaction receipt", async () => {
        (mockProvider.request as jest.Mock).mockResolvedValue({
          transactionHash: "0xtxhash",
          transactionIndex: "0x1",
          blockHash: "0xblockhash",
          blockNumber: "0x100",
          from: "0x1234567890abcdef1234567890abcdef12345678",
          to: "0xabcdef1234567890abcdef1234567890abcdef12",
          cumulativeGasUsed: "0x5208",
          gasUsed: "0x5208",
          effectiveGasPrice: "0x3b9aca00",
          status: "0x1",
          logs: [],
        });

        const result = await manager.getTransactionReceipt("0xtxhash");

        expect(result.success).toBe(true);
        expect(result.data?.status).toBe("success");
        expect(result.data?.blockNumber).toBe(256);
      });

      it("should return failed status", async () => {
        (mockProvider.request as jest.Mock).mockResolvedValue({
          transactionHash: "0xtxhash",
          transactionIndex: "0x1",
          blockHash: "0xblockhash",
          blockNumber: "0x100",
          from: "0x1234567890abcdef1234567890abcdef12345678",
          to: "0xabcdef1234567890abcdef1234567890abcdef12",
          cumulativeGasUsed: "0x5208",
          gasUsed: "0x5208",
          effectiveGasPrice: "0x3b9aca00",
          status: "0x0",
          logs: [],
        });

        const result = await manager.getTransactionReceipt("0xtxhash");

        expect(result.success).toBe(true);
        expect(result.data?.status).toBe("failed");
      });

      it("should fail if receipt not found", async () => {
        (mockProvider.request as jest.Mock).mockResolvedValue(null);

        const result = await manager.getTransactionReceipt("0xtxhash");

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain("not found");
      });

      it("should fail if provider not set", async () => {
        manager.setProvider(null);
        const result = await manager.getTransactionReceipt("0xtxhash");

        expect(result.success).toBe(false);
      });

      it("should parse logs correctly", async () => {
        (mockProvider.request as jest.Mock).mockResolvedValue({
          transactionHash: "0xtxhash",
          transactionIndex: "0x1",
          blockHash: "0xblockhash",
          blockNumber: "0x100",
          from: "0x1234567890abcdef1234567890abcdef12345678",
          to: "0xabcdef1234567890abcdef1234567890abcdef12",
          cumulativeGasUsed: "0x5208",
          gasUsed: "0x5208",
          effectiveGasPrice: "0x3b9aca00",
          status: "0x1",
          logs: [
            {
              address: "0xcontract",
              topics: ["0xtopic1"],
              data: "0xdata",
              blockNumber: "0x100",
              transactionHash: "0xtxhash",
              logIndex: "0x0",
            },
          ],
        });

        const result = await manager.getTransactionReceipt("0xtxhash");

        expect(result.success).toBe(true);
        expect(result.data?.logs).toHaveLength(1);
        expect(result.data?.logs[0].logIndex).toBe(0);
      });
    });

    describe("waitForTransaction", () => {
      it("should wait for transaction confirmation", async () => {
        (mockProvider.request as jest.Mock).mockImplementation(({ method }) => {
          if (method === "eth_getTransactionReceipt") {
            return Promise.resolve({
              transactionHash: "0xtxhash",
              transactionIndex: "0x1",
              blockHash: "0xblockhash",
              blockNumber: "0x100",
              from: "0x1234567890abcdef1234567890abcdef12345678",
              to: "0xabcdef1234567890abcdef1234567890abcdef12",
              cumulativeGasUsed: "0x5208",
              gasUsed: "0x5208",
              effectiveGasPrice: "0x3b9aca00",
              status: "0x1",
              logs: [],
            });
          }
          return Promise.resolve(null);
        });

        const result = await manager.waitForTransaction("0xtxhash", 1, 5000);

        expect(result.success).toBe(true);
        expect(result.data?.status).toBe("success");
      });

      it("should timeout if not confirmed", async () => {
        (mockProvider.request as jest.Mock).mockResolvedValue(null);

        const result = await manager.waitForTransaction("0xtxhash", 1, 100);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain("timeout");
      });
    });
  });

  // ==========================================================================
  // Pending Transaction Management Tests
  // ==========================================================================

  describe("Pending Transaction Management", () => {
    beforeEach(async () => {
      (mockProvider.request as jest.Mock).mockImplementation(({ method }) => {
        if (method === "eth_estimateGas") return Promise.resolve("0x5208");
        if (method === "eth_gasPrice") return Promise.resolve("0x3b9aca00");
        if (method === "eth_feeHistory")
          return Promise.reject(new Error("Not supported"));
        if (method === "eth_sendTransaction")
          return Promise.resolve("0xtxhash");
        return Promise.resolve(null);
      });

      await manager.sendTransaction({
        from: "0x1234567890abcdef1234567890abcdef12345678",
        to: "0xabcdef1234567890abcdef1234567890abcdef12",
      });
    });

    it("should get pending transactions", () => {
      const pending = manager.getPendingTransactions();
      expect(pending).toHaveLength(1);
    });

    it("should get specific pending transaction", () => {
      const pending = manager.getPendingTransaction("0xtxhash");
      expect(pending).toBeDefined();
      expect(pending?.hash).toBe("0xtxhash");
    });

    it("should return null for unknown hash", () => {
      const pending = manager.getPendingTransaction("0xunknown");
      expect(pending).toBeNull();
    });

    describe("clearCompletedTransactions", () => {
      it("should clear confirmed transactions", async () => {
        // Simulate confirmation
        (mockProvider.request as jest.Mock).mockResolvedValue({
          transactionHash: "0xtxhash",
          transactionIndex: "0x1",
          blockHash: "0xblockhash",
          blockNumber: "0x100",
          from: "0x1234567890abcdef1234567890abcdef12345678",
          to: "0xabcdef1234567890abcdef1234567890abcdef12",
          cumulativeGasUsed: "0x5208",
          gasUsed: "0x5208",
          effectiveGasPrice: "0x3b9aca00",
          status: "0x1",
          logs: [],
        });

        await manager.getTransactionReceipt("0xtxhash");
        manager.clearCompletedTransactions();

        expect(manager.getPendingTransactions()).toHaveLength(0);
      });
    });

    describe("speedUpTransaction", () => {
      it("should speed up transaction with higher gas", async () => {
        let callCount = 0;
        (mockProvider.request as jest.Mock).mockImplementation(({ method }) => {
          if (method === "eth_sendTransaction") {
            callCount++;
            return Promise.resolve(`0xtxhash${callCount}`);
          }
          if (method === "eth_estimateGas") return Promise.resolve("0x5208");
          if (method === "eth_gasPrice") return Promise.resolve("0x3b9aca00");
          if (method === "eth_feeHistory")
            return Promise.reject(new Error("Not supported"));
          return Promise.resolve(null);
        });

        // First transaction
        await manager.sendTransaction({
          from: "0x1234567890abcdef1234567890abcdef12345678",
          to: "0xabcdef1234567890abcdef1234567890abcdef12",
          gasPrice: "0x3b9aca00",
        });

        // Speed up
        const result = await manager.speedUpTransaction("0xtxhash1", {
          gasPriceMultiplier: 1.5,
        });

        expect(result.success).toBe(true);
      });

      it("should fail for unknown transaction", async () => {
        const result = await manager.speedUpTransaction("0xunknown");

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain("not found");
      });
    });

    describe("cancelTransaction", () => {
      it("should cancel transaction", async () => {
        let callCount = 0;
        (mockProvider.request as jest.Mock).mockImplementation(({ method }) => {
          if (method === "eth_sendTransaction") {
            callCount++;
            return Promise.resolve(`0xtxhash${callCount}`);
          }
          if (method === "eth_estimateGas") return Promise.resolve("0x5208");
          if (method === "eth_gasPrice") return Promise.resolve("0x3b9aca00");
          if (method === "eth_feeHistory")
            return Promise.reject(new Error("Not supported"));
          return Promise.resolve(null);
        });

        await manager.sendTransaction({
          from: "0x1234567890abcdef1234567890abcdef12345678",
          to: "0xabcdef1234567890abcdef1234567890abcdef12",
          gasPrice: "0x3b9aca00",
        });

        const result = await manager.cancelTransaction("0xtxhash1");

        expect(result.success).toBe(true);
      });

      it("should fail for unknown transaction", async () => {
        const result = await manager.cancelTransaction("0xunknown");

        expect(result.success).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Nonce Management Tests
  // ==========================================================================

  describe("Nonce Management", () => {
    it("should get nonce", async () => {
      (mockProvider.request as jest.Mock).mockResolvedValue("0xa");

      const result = await manager.getNonce(
        "0x1234567890abcdef1234567890abcdef12345678",
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(10);
    });

    it("should fail if provider not set", async () => {
      manager.setProvider(null);
      const result = await manager.getNonce(
        "0x1234567890abcdef1234567890abcdef12345678",
      );

      expect(result.success).toBe(false);
    });

    it("should handle error", async () => {
      (mockProvider.request as jest.Mock).mockRejectedValue({
        code: TX_ERROR_CODES.INTERNAL_ERROR,
        message: "Failed",
      });

      const result = await manager.getNonce(
        "0x1234567890abcdef1234567890abcdef12345678",
      );

      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Event Tests
  // ==========================================================================

  describe("Events", () => {
    it("should emit transactionSubmitted event", async () => {
      const handler = jest.fn();
      manager.on("transactionSubmitted", handler);
      (mockProvider.request as jest.Mock).mockImplementation(({ method }) => {
        if (method === "eth_estimateGas") return Promise.resolve("0x5208");
        if (method === "eth_gasPrice") return Promise.resolve("0x3b9aca00");
        if (method === "eth_feeHistory")
          return Promise.reject(new Error("Not supported"));
        if (method === "eth_sendTransaction")
          return Promise.resolve("0xtxhash");
        return Promise.resolve(null);
      });

      await manager.sendTransaction({
        from: "0x1234567890abcdef1234567890abcdef12345678",
        to: "0xabcdef1234567890abcdef1234567890abcdef12",
      });

      expect(handler).toHaveBeenCalled();
    });

    it("should remove event listener", () => {
      const handler = jest.fn();
      manager.on("test", handler);
      manager.off("test", handler);

      // Manually emit for testing
      (
        manager as unknown as {
          emit: (event: string, ...args: unknown[]) => void;
        }
      ).emit("test");

      expect(handler).not.toHaveBeenCalled();
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

    describe("isValidHex", () => {
      it("should validate correct hex", () => {
        expect(manager.isValidHex("0x1234")).toBe(true);
        expect(manager.isValidHex("0x")).toBe(true);
      });

      it("should reject invalid hex", () => {
        expect(manager.isValidHex("1234")).toBe(false);
        expect(manager.isValidHex("0xGGGG")).toBe(false);
      });
    });

    describe("weiToEther", () => {
      it("should convert wei to ether", () => {
        expect(parseFloat(manager.weiToEther("1000000000000000000"))).toBe(1);
      });
    });

    describe("etherToWei", () => {
      it("should convert ether to wei", () => {
        const wei = manager.etherToWei("1");
        expect(wei).toBe("0xde0b6b3a7640000");
      });
    });

    describe("getDefaultGasLimit", () => {
      it("should return default gas limit", () => {
        expect(manager.getDefaultGasLimit()).toBe("21000");
      });
    });

    describe("formatGasPrice", () => {
      it("should format gas price in Gwei", () => {
        const formatted = manager.formatGasPrice("0x3b9aca00");
        expect(formatted).toContain("Gwei");
      });
    });
  });

  // ==========================================================================
  // Singleton Tests
  // ==========================================================================

  describe("Singleton", () => {
    beforeEach(() => {
      resetTransactionManager();
    });

    it("should create singleton instance", () => {
      const instance = getTransactionManager();
      expect(instance).toBeInstanceOf(TransactionManager);
    });

    it("should return same instance", () => {
      const instance1 = getTransactionManager();
      const instance2 = getTransactionManager();

      expect(instance1).toBe(instance2);
    });

    it("should set provider on existing instance", () => {
      const instance1 = getTransactionManager();
      const instance2 = getTransactionManager(mockProvider);

      expect(instance1).toBe(instance2);
      expect(instance2.getProvider()).toBe(mockProvider);
    });

    it("should reset singleton", () => {
      const instance1 = getTransactionManager();
      resetTransactionManager();
      const instance2 = getTransactionManager();

      expect(instance1).not.toBe(instance2);
    });
  });
});
