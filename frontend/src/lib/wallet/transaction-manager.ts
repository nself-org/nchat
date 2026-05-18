/**
 * Transaction Manager - Handles crypto transaction operations
 *
 * Provides transaction building, gas estimation, signing,
 * and receipt tracking for Ethereum transactions.
 */

import type { EthereumProvider, ChainId } from "./wallet-connector";

// ============================================================================
// Types
// ============================================================================

export interface TransactionRequest {
  from: string;
  to: string;
  value?: string;
  data?: string;
  gas?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: number;
  chainId?: ChainId;
}

export interface TransactionReceipt {
  transactionHash: string;
  transactionIndex: number;
  blockHash: string;
  blockNumber: number;
  from: string;
  to: string;
  cumulativeGasUsed: string;
  gasUsed: string;
  effectiveGasPrice: string;
  status: "success" | "failed";
  logs: TransactionLog[];
}

export interface TransactionLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
}

export interface GasEstimate {
  gasLimit: string;
  gasPrice: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  estimatedCost: string;
  estimatedCostEther: string;
}

export interface PendingTransaction {
  hash: string;
  request: TransactionRequest;
  status: TransactionStatus;
  submittedAt: Date;
  confirmedAt?: Date;
  receipt?: TransactionReceipt;
  error?: string;
}

export type TransactionStatus =
  | "pending"
  | "submitted"
  | "confirming"
  | "confirmed"
  | "failed"
  | "cancelled";

export interface TransactionError {
  code: number;
  message: string;
  data?: unknown;
}

export interface TransactionManagerResult<T> {
  success: boolean;
  data?: T;
  error?: TransactionError;
}

export interface SpeedUpOptions {
  gasPriceMultiplier?: number;
  maxFeePerGasMultiplier?: number;
}

// ============================================================================
// Constants
// ============================================================================

export const TX_ERROR_CODES = {
  USER_REJECTED: 4001,
  INSUFFICIENT_FUNDS: -32000,
  NONCE_TOO_LOW: -32003,
  GAS_TOO_LOW: -32010,
  TRANSACTION_FAILED: -32015,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

const DEFAULT_GAS_LIMIT = "21000";
const DEFAULT_CONFIRMATION_BLOCKS = 1;

// ============================================================================
// Transaction Manager Class
// ============================================================================

export class TransactionManager {
  private provider: EthereumProvider | null = null;
  private pendingTransactions: Map<string, PendingTransaction> = new Map();
  private eventListeners: Map<string, Set<(...args: unknown[]) => void>> =
    new Map();

  constructor(provider?: EthereumProvider) {
    if (provider) {
      this.provider = provider;
    }
  }

  /**
   * Set the Ethereum provider
   */
  setProvider(provider: EthereumProvider | null): void {
    this.provider = provider;
  }

  /**
   * Get the Ethereum provider
   */
  getProvider(): EthereumProvider | null {
    return this.provider;
  }

  // ==========================================================================
  // Transaction Building
  // ==========================================================================

  /**
   * Build a transaction request
   */
  buildTransaction(params: {
    from: string;
    to: string;
    value?: string;
    data?: string;
    chainId?: ChainId;
  }): TransactionRequest {
    return {
      from: params.from,
      to: params.to,
      value: params.value ?? "0x0",
      data: params.data ?? "0x",
      chainId: params.chainId,
    };
  }

  /**
   * Build a contract call transaction
   */
  buildContractCall(params: {
    from: string;
    contractAddress: string;
    data: string;
    value?: string;
    chainId?: ChainId;
  }): TransactionRequest {
    return {
      from: params.from,
      to: params.contractAddress,
      data: params.data,
      value: params.value ?? "0x0",
      chainId: params.chainId,
    };
  }

  /**
   * Encode function call data
   */
  encodeFunctionCall(
    functionSignature: string,
    params: (string | number | boolean)[],
  ): string {
    // Simple encoding - in production, use ethers.js or web3.js
    const functionSelector = this.getFunctionSelector(functionSignature);
    const encodedParams = params
      .map((param) => this.encodeParameter(param))
      .join("");
    return functionSelector + encodedParams;
  }

  /**
   * Get function selector (first 4 bytes of keccak256 hash)
   */
  private getFunctionSelector(signature: string): string {
    // Simplified - in production, use proper keccak256 hashing
    // This is a placeholder that returns a valid selector format
    const hash = this.simpleHash(signature);
    return "0x" + hash.substring(0, 8);
  }

  /**
   * Simple hash function for demo purposes
   */
  private simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(64, "0");
  }

  /**
   * Encode a parameter for function call
   */
  private encodeParameter(param: string | number | boolean): string {
    if (typeof param === "boolean") {
      return param ? "1".padStart(64, "0") : "0".padStart(64, "0");
    }
    if (typeof param === "number") {
      return param.toString(16).padStart(64, "0");
    }
    // Address or hex string
    if (param.startsWith("0x")) {
      return param.substring(2).padStart(64, "0");
    }
    // String - simplified encoding
    return Buffer.from(param).toString("hex").padStart(64, "0");
  }

  // ==========================================================================
  // Gas Estimation
  // ==========================================================================

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(
    tx: TransactionRequest,
  ): Promise<TransactionManagerResult<GasEstimate>> {
    if (!this.provider) {
      return {
        success: false,
        error: {
          code: TX_ERROR_CODES.INTERNAL_ERROR,
          message: "Provider not set",
        },
      };
    }

    try {
      // Estimate gas limit
      const gasLimit = (await this.provider.request({
        method: "eth_estimateGas",
        params: [tx],
      })) as string;

      // Get current gas price
      const gasPrice = (await this.provider.request({
        method: "eth_gasPrice",
      })) as string;

      // Try to get EIP-1559 gas prices
      let maxFeePerGas: string | undefined;
      let maxPriorityFeePerGas: string | undefined;

      try {
        const feeHistory = (await this.provider.request({
          method: "eth_feeHistory",
          params: ["0x1", "latest", [25, 50, 75]],
        })) as { baseFeePerGas: string[]; reward: string[][] };

        if (feeHistory && feeHistory.baseFeePerGas) {
          const baseFee = BigInt(feeHistory.baseFeePerGas[0]);
          maxPriorityFeePerGas =
            "0x" + (BigInt(2) * BigInt(10 ** 9)).toString(16); // 2 Gwei
          maxFeePerGas =
            "0x" +
            (baseFee * BigInt(2) + BigInt(maxPriorityFeePerGas)).toString(16);
        }
      } catch {
        // EIP-1559 not supported, use legacy gas price
      }

      const estimatedCost = this.calculateGasCost(gasLimit, gasPrice);

      return {
        success: true,
        data: {
          gasLimit,
          gasPrice,
          maxFeePerGas,
          maxPriorityFeePerGas,
          estimatedCost,
          estimatedCostEther: this.weiToEther(estimatedCost),
        },
      };
    } catch (error) {
      const err = error as { code?: number; message?: string };
      return {
        success: false,
        error: {
          code: err.code ?? TX_ERROR_CODES.INTERNAL_ERROR,
          message: err.message ?? "Failed to estimate gas",
        },
      };
    }
  }

  /**
   * Get current gas prices
   */
  async getGasPrices(): Promise<
    TransactionManagerResult<{
      slow: string;
      standard: string;
      fast: string;
    }>
  > {
    if (!this.provider) {
      return {
        success: false,
        error: {
          code: TX_ERROR_CODES.INTERNAL_ERROR,
          message: "Provider not set",
        },
      };
    }

    try {
      const gasPrice = (await this.provider.request({
        method: "eth_gasPrice",
      })) as string;

      const basePrice = BigInt(gasPrice);

      return {
        success: true,
        data: {
          slow: "0x" + ((basePrice * BigInt(80)) / BigInt(100)).toString(16),
          standard: gasPrice,
          fast: "0x" + ((basePrice * BigInt(120)) / BigInt(100)).toString(16),
        },
      };
    } catch (error) {
      const err = error as { code?: number; message?: string };
      return {
        success: false,
        error: {
          code: err.code ?? TX_ERROR_CODES.INTERNAL_ERROR,
          message: err.message ?? "Failed to get gas prices",
        },
      };
    }
  }

  /**
   * Calculate gas cost
   */
  private calculateGasCost(gasLimit: string, gasPrice: string): string {
    const limit = BigInt(gasLimit);
    const price = BigInt(gasPrice);
    return "0x" + (limit * price).toString(16);
  }

  // ==========================================================================
  // Transaction Signing and Sending
  // ==========================================================================

  /**
   * Send a transaction
   */
  async sendTransaction(
    tx: TransactionRequest,
  ): Promise<TransactionManagerResult<string>> {
    if (!this.provider) {
      return {
        success: false,
        error: {
          code: TX_ERROR_CODES.INTERNAL_ERROR,
          message: "Provider not set",
        },
      };
    }

    // Validate transaction
    const validation = this.validateTransaction(tx);
    if (!validation.success) {
      return validation as TransactionManagerResult<string>;
    }

    try {
      // Add gas if not provided
      if (!tx.gas) {
        const gasEstimate = await this.estimateGas(tx);
        if (gasEstimate.success && gasEstimate.data) {
          tx.gas = gasEstimate.data.gasLimit;
          if (!tx.maxFeePerGas && gasEstimate.data.maxFeePerGas) {
            tx.maxFeePerGas = gasEstimate.data.maxFeePerGas;
            tx.maxPriorityFeePerGas = gasEstimate.data.maxPriorityFeePerGas;
          } else if (!tx.gasPrice) {
            tx.gasPrice = gasEstimate.data.gasPrice;
          }
        }
      }

      const hash = (await this.provider.request({
        method: "eth_sendTransaction",
        params: [tx],
      })) as string;

      // Track pending transaction
      const pending: PendingTransaction = {
        hash,
        request: tx,
        status: "submitted",
        submittedAt: new Date(),
      };
      this.pendingTransactions.set(hash, pending);
      this.emit("transactionSubmitted", pending);

      return {
        success: true,
        data: hash,
      };
    } catch (error) {
      const err = error as { code?: number; message?: string };
      return {
        success: false,
        error: {
          code: err.code ?? TX_ERROR_CODES.INTERNAL_ERROR,
          message: err.message ?? "Failed to send transaction",
        },
      };
    }
  }

  /**
   * Validate a transaction
   */
  validateTransaction(tx: TransactionRequest): TransactionManagerResult<void> {
    if (!tx.from || !this.isValidAddress(tx.from)) {
      return {
        success: false,
        error: {
          code: TX_ERROR_CODES.INVALID_PARAMS,
          message: "Invalid from address",
        },
      };
    }

    if (!tx.to || !this.isValidAddress(tx.to)) {
      return {
        success: false,
        error: {
          code: TX_ERROR_CODES.INVALID_PARAMS,
          message: "Invalid to address",
        },
      };
    }

    if (tx.value && !this.isValidHex(tx.value)) {
      return {
        success: false,
        error: {
          code: TX_ERROR_CODES.INVALID_PARAMS,
          message: "Invalid value",
        },
      };
    }

    return { success: true };
  }

  /**
   * Sign a transaction (without sending)
   */
  async signTransaction(
    tx: TransactionRequest,
  ): Promise<TransactionManagerResult<string>> {
    if (!this.provider) {
      return {
        success: false,
        error: {
          code: TX_ERROR_CODES.INTERNAL_ERROR,
          message: "Provider not set",
        },
      };
    }

    try {
      const signedTx = (await this.provider.request({
        method: "eth_signTransaction",
        params: [tx],
      })) as string;

      return {
        success: true,
        data: signedTx,
      };
    } catch (error) {
      const err = error as { code?: number; message?: string };
      return {
        success: false,
        error: {
          code: err.code ?? TX_ERROR_CODES.INTERNAL_ERROR,
          message: err.message ?? "Failed to sign transaction",
        },
      };
    }
  }

  /**
   * Send a signed transaction
   */
  async sendSignedTransaction(
    signedTx: string,
  ): Promise<TransactionManagerResult<string>> {
    if (!this.provider) {
      return {
        success: false,
        error: {
          code: TX_ERROR_CODES.INTERNAL_ERROR,
          message: "Provider not set",
        },
      };
    }

    try {
      const hash = (await this.provider.request({
        method: "eth_sendRawTransaction",
        params: [signedTx],
      })) as string;

      return {
        success: true,
        data: hash,
      };
    } catch (error) {
      const err = error as { code?: number; message?: string };
      return {
        success: false,
        error: {
          code: err.code ?? TX_ERROR_CODES.INTERNAL_ERROR,
          message: err.message ?? "Failed to send signed transaction",
        },
      };
    }
  }

  // ==========================================================================
  // Receipt Tracking
  // ==========================================================================

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(
    hash: string,
  ): Promise<TransactionManagerResult<TransactionReceipt>> {
    if (!this.provider) {
      return {
        success: false,
        error: {
          code: TX_ERROR_CODES.INTERNAL_ERROR,
          message: "Provider not set",
        },
      };
    }

    try {
      const receipt = (await this.provider.request({
        method: "eth_getTransactionReceipt",
        params: [hash],
      })) as {
        transactionHash: string;
        transactionIndex: string;
        blockHash: string;
        blockNumber: string;
        from: string;
        to: string;
        cumulativeGasUsed: string;
        gasUsed: string;
        effectiveGasPrice: string;
        status: string;
        logs: Array<{
          address: string;
          topics: string[];
          data: string;
          blockNumber: string;
          transactionHash: string;
          logIndex: string;
        }>;
      } | null;

      if (!receipt) {
        return {
          success: false,
          error: {
            code: TX_ERROR_CODES.INTERNAL_ERROR,
            message: "Transaction receipt not found",
          },
        };
      }

      const formattedReceipt: TransactionReceipt = {
        transactionHash: receipt.transactionHash,
        transactionIndex: parseInt(receipt.transactionIndex, 16),
        blockHash: receipt.blockHash,
        blockNumber: parseInt(receipt.blockNumber, 16),
        from: receipt.from,
        to: receipt.to,
        cumulativeGasUsed: receipt.cumulativeGasUsed,
        gasUsed: receipt.gasUsed,
        effectiveGasPrice: receipt.effectiveGasPrice,
        status: receipt.status === "0x1" ? "success" : "failed",
        logs: receipt.logs.map((log) => ({
          address: log.address,
          topics: log.topics,
          data: log.data,
          blockNumber: parseInt(log.blockNumber, 16),
          transactionHash: log.transactionHash,
          logIndex: parseInt(log.logIndex, 16),
        })),
      };

      // Update pending transaction if tracked
      const pending = this.pendingTransactions.get(hash);
      if (pending) {
        pending.status =
          formattedReceipt.status === "success" ? "confirmed" : "failed";
        pending.confirmedAt = new Date();
        pending.receipt = formattedReceipt;
        this.emit("transactionConfirmed", pending);
      }

      return {
        success: true,
        data: formattedReceipt,
      };
    } catch (error) {
      const err = error as { code?: number; message?: string };
      return {
        success: false,
        error: {
          code: err.code ?? TX_ERROR_CODES.INTERNAL_ERROR,
          message: err.message ?? "Failed to get transaction receipt",
        },
      };
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(
    hash: string,
    confirmations: number = DEFAULT_CONFIRMATION_BLOCKS,
    timeout: number = 60000,
  ): Promise<TransactionManagerResult<TransactionReceipt>> {
    const startTime = Date.now();

    // Update pending status
    const pending = this.pendingTransactions.get(hash);
    if (pending) {
      pending.status = "confirming";
    }

    while (Date.now() - startTime < timeout) {
      const result = await this.getTransactionReceipt(hash);

      if (result.success && result.data) {
        // Check if we have enough confirmations
        if (confirmations <= 1) {
          return result;
        }

        // Get current block number
        const blockNumber = (await this.provider?.request({
          method: "eth_blockNumber",
        })) as string;

        const currentBlock = parseInt(blockNumber, 16);
        const txBlock = result.data.blockNumber;
        const confirmedBlocks = currentBlock - txBlock;

        if (confirmedBlocks >= confirmations) {
          return result;
        }
      }

      // Wait before polling again
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Timeout
    if (pending) {
      pending.status = "failed";
      pending.error = "Transaction confirmation timeout";
    }

    return {
      success: false,
      error: {
        code: TX_ERROR_CODES.INTERNAL_ERROR,
        message: "Transaction confirmation timeout",
      },
    };
  }

  // ==========================================================================
  // Pending Transaction Management
  // ==========================================================================

  /**
   * Get pending transactions
   */
  getPendingTransactions(): PendingTransaction[] {
    return Array.from(this.pendingTransactions.values());
  }

  /**
   * Get a specific pending transaction
   */
  getPendingTransaction(hash: string): PendingTransaction | null {
    return this.pendingTransactions.get(hash) ?? null;
  }

  /**
   * Clear completed transactions
   */
  clearCompletedTransactions(): void {
    for (const [hash, tx] of this.pendingTransactions) {
      if (
        tx.status === "confirmed" ||
        tx.status === "failed" ||
        tx.status === "cancelled"
      ) {
        this.pendingTransactions.delete(hash);
      }
    }
  }

  /**
   * Speed up a pending transaction
   */
  async speedUpTransaction(
    hash: string,
    options: SpeedUpOptions = {},
  ): Promise<TransactionManagerResult<string>> {
    const pending = this.pendingTransactions.get(hash);
    if (!pending || pending.status !== "submitted") {
      return {
        success: false,
        error: {
          code: TX_ERROR_CODES.INVALID_PARAMS,
          message: "Transaction not found or already confirmed",
        },
      };
    }

    const multiplier = options.gasPriceMultiplier ?? 1.1;

    // Create new transaction with higher gas price
    const newTx = { ...pending.request };

    if (newTx.maxFeePerGas) {
      const maxFeeMultiplier = options.maxFeePerGasMultiplier ?? multiplier;
      const currentMaxFee = BigInt(newTx.maxFeePerGas);
      newTx.maxFeePerGas =
        "0x" +
        BigInt(Math.floor(Number(currentMaxFee) * maxFeeMultiplier)).toString(
          16,
        );

      if (newTx.maxPriorityFeePerGas) {
        const currentPriorityFee = BigInt(newTx.maxPriorityFeePerGas);
        newTx.maxPriorityFeePerGas =
          "0x" +
          BigInt(Math.floor(Number(currentPriorityFee) * multiplier)).toString(
            16,
          );
      }
    } else if (newTx.gasPrice) {
      const currentPrice = BigInt(newTx.gasPrice);
      newTx.gasPrice =
        "0x" +
        BigInt(Math.floor(Number(currentPrice) * multiplier)).toString(16);
    }

    return this.sendTransaction(newTx);
  }

  /**
   * Cancel a pending transaction
   */
  async cancelTransaction(
    hash: string,
  ): Promise<TransactionManagerResult<string>> {
    const pending = this.pendingTransactions.get(hash);
    if (!pending || pending.status !== "submitted") {
      return {
        success: false,
        error: {
          code: TX_ERROR_CODES.INVALID_PARAMS,
          message: "Transaction not found or already confirmed",
        },
      };
    }

    // Send 0 value to self with same nonce and higher gas
    const cancelTx: TransactionRequest = {
      from: pending.request.from,
      to: pending.request.from,
      value: "0x0",
      nonce: pending.request.nonce,
    };

    if (pending.request.gasPrice) {
      cancelTx.gasPrice =
        "0x" + (BigInt(pending.request.gasPrice) * BigInt(2)).toString(16);
    }

    const result = await this.sendTransaction(cancelTx);

    if (result.success) {
      pending.status = "cancelled";
      this.emit("transactionCancelled", pending);
    }

    return result;
  }

  // ==========================================================================
  // Nonce Management
  // ==========================================================================

  /**
   * Get nonce for an address
   */
  async getNonce(address: string): Promise<TransactionManagerResult<number>> {
    if (!this.provider) {
      return {
        success: false,
        error: {
          code: TX_ERROR_CODES.INTERNAL_ERROR,
          message: "Provider not set",
        },
      };
    }

    try {
      const nonce = (await this.provider.request({
        method: "eth_getTransactionCount",
        params: [address, "pending"],
      })) as string;

      return {
        success: true,
        data: parseInt(nonce, 16),
      };
    } catch (error) {
      const err = error as { code?: number; message?: string };
      return {
        success: false,
        error: {
          code: err.code ?? TX_ERROR_CODES.INTERNAL_ERROR,
          message: err.message ?? "Failed to get nonce",
        },
      };
    }
  }

  // ==========================================================================
  // Event Handling
  // ==========================================================================

  /**
   * Subscribe to an event
   */
  on(event: string, callback: (...args: unknown[]) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, callback: (...args: unknown[]) => void): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  /**
   * Emit an event
   */
  private emit(event: string, ...args: unknown[]): void {
    this.eventListeners.get(event)?.forEach((callback) => callback(...args));
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Validate Ethereum address
   */
  isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Validate hex string
   */
  isValidHex(hex: string): boolean {
    return /^0x[a-fA-F0-9]*$/.test(hex);
  }

  /**
   * Convert wei to ether
   */
  weiToEther(wei: string): string {
    const weiValue = BigInt(wei);
    const ether = Number(weiValue) / 1e18;
    return ether.toFixed(6);
  }

  /**
   * Convert ether to wei
   */
  etherToWei(ether: string): string {
    const etherValue = parseFloat(ether);
    const wei = Math.floor(etherValue * 1e18);
    return "0x" + wei.toString(16);
  }

  /**
   * Get default gas limit
   */
  getDefaultGasLimit(): string {
    return DEFAULT_GAS_LIMIT;
  }

  /**
   * Format gas price for display
   */
  formatGasPrice(gasPrice: string): string {
    const gweiValue = Number(BigInt(gasPrice)) / 1e9;
    return gweiValue.toFixed(2) + " Gwei";
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let transactionManagerInstance: TransactionManager | null = null;

/**
 * Get the transaction manager singleton
 */
export function getTransactionManager(
  provider?: EthereumProvider,
): TransactionManager {
  if (!transactionManagerInstance) {
    transactionManagerInstance = new TransactionManager(provider);
  } else if (provider) {
    transactionManagerInstance.setProvider(provider);
  }
  return transactionManagerInstance;
}

/**
 * Reset the transaction manager (for testing)
 */
export function resetTransactionManager(): void {
  transactionManagerInstance = null;
}
