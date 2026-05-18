/**
 * useTransactions Hook - Manage blockchain transactions
 *
 * Provides transaction sending, tracking, and history
 */

import { useCallback } from "react";
import { useWalletStore } from "@/stores/wallet-store";
import { getTransactionManager } from "@/lib/wallet/transaction-manager";
import { getWalletConnector } from "@/lib/wallet/wallet-connector";
import type {
  TransactionRequest,
  GasEstimate,
  TransactionReceipt,
} from "@/lib/wallet/transaction-manager";

export function useTransactions() {
  const {
    address,
    chainId,
    pendingTransactions,
    addPendingTransaction,
    updatePendingTransaction,
    removePendingTransaction,
  } = useWalletStore();

  const walletConnector = getWalletConnector();
  const transactionManager = getTransactionManager(
    walletConnector.getEthereumProvider() ?? undefined,
  );

  // Send transaction
  const sendTransaction = useCallback(
    async (tx: Omit<TransactionRequest, "from">) => {
      if (!address) {
        return { success: false, error: "Wallet not connected" };
      }

      try {
        const result = await transactionManager.sendTransaction({
          ...tx,
          from: address,
          chainId: chainId ?? undefined,
        });

        if (result.success && result.data) {
          // Transaction is tracked automatically by transactionManager
          return { success: true, hash: result.data };
        }

        return { success: false, error: "Failed to send transaction" };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    },
    [address, chainId, transactionManager],
  );

  // Send ETH
  const sendETH = useCallback(
    async (to: string, amount: string) => {
      const amountWei = transactionManager.etherToWei(amount);
      return sendTransaction({ to, value: amountWei });
    },
    [sendTransaction, transactionManager],
  );

  // Estimate gas
  const estimateGas = useCallback(
    async (
      tx: Omit<TransactionRequest, "from">,
    ): Promise<GasEstimate | null> => {
      if (!address) {
        return null;
      }

      try {
        const result = await transactionManager.estimateGas({
          ...tx,
          from: address,
          chainId: chainId ?? undefined,
        });

        if (result.success && result.data) {
          return result.data;
        }

        return null;
      } catch {
        return null;
      }
    },
    [address, chainId, transactionManager],
  );

  // Get gas prices
  const getGasPrices = useCallback(async () => {
    try {
      const result = await transactionManager.getGasPrices();
      return result;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }, [transactionManager]);

  // Get transaction receipt
  const getTransactionReceipt = useCallback(
    async (hash: string): Promise<TransactionReceipt | null> => {
      try {
        const result = await transactionManager.getTransactionReceipt(hash);

        if (result.success && result.data) {
          return result.data;
        }

        return null;
      } catch {
        return null;
      }
    },
    [transactionManager],
  );

  // Wait for transaction confirmation
  const waitForTransaction = useCallback(
    async (hash: string, confirmations = 1, timeout = 60000) => {
      try {
        const result = await transactionManager.waitForTransaction(
          hash,
          confirmations,
          timeout,
        );

        if (result.success && result.data) {
          return { success: true, receipt: result.data };
        }

        return { success: false, error: "Transaction confirmation timeout" };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    },
    [transactionManager],
  );

  // Speed up transaction
  const speedUpTransaction = useCallback(
    async (hash: string, multiplier = 1.1) => {
      try {
        const result = await transactionManager.speedUpTransaction(hash, {
          gasPriceMultiplier: multiplier,
        });

        if (result.success && result.data) {
          return { success: true, newHash: result.data };
        }

        return { success: false, error: "Failed to speed up transaction" };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    },
    [transactionManager],
  );

  // Cancel transaction
  const cancelTransaction = useCallback(
    async (hash: string) => {
      try {
        const result = await transactionManager.cancelTransaction(hash);

        if (result.success && result.data) {
          return { success: true, cancelHash: result.data };
        }

        return { success: false, error: "Failed to cancel transaction" };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    },
    [transactionManager],
  );

  // Get nonce
  const getNonce = useCallback(async () => {
    if (!address) {
      return null;
    }

    try {
      const result = await transactionManager.getNonce(address);

      if (result.success && result.data !== undefined) {
        return result.data;
      }

      return null;
    } catch {
      return null;
    }
  }, [address, transactionManager]);

  // Format gas price
  const formatGasPrice = useCallback(
    (gasPrice: string) => {
      return transactionManager.formatGasPrice(gasPrice);
    },
    [transactionManager],
  );

  // Wei/Ether conversion utilities
  const weiToEther = useCallback(
    (wei: string) => {
      return transactionManager.weiToEther(wei);
    },
    [transactionManager],
  );

  const etherToWei = useCallback(
    (ether: string) => {
      return transactionManager.etherToWei(ether);
    },
    [transactionManager],
  );

  return {
    // State
    pendingTransactions,

    // Actions
    sendTransaction,
    sendETH,
    estimateGas,
    getGasPrices,
    getTransactionReceipt,
    waitForTransaction,
    speedUpTransaction,
    cancelTransaction,
    getNonce,

    // Utilities
    formatGasPrice,
    weiToEther,
    etherToWei,
  };
}
