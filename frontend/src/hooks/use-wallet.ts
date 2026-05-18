/**
 * useWallet Hook - Manage wallet connection and state
 *
 * Provides wallet connection, disconnection, and state management
 */

import { useCallback, useEffect } from "react";
import { useWalletStore } from "@/stores/wallet-store";
import { getWalletConnector } from "@/lib/wallet/wallet-connector";
import type {
  WalletProvider,
  ChainId,
  ConnectOptions,
} from "@/lib/wallet/wallet-connector";

export function useWallet() {
  const {
    isConnected,
    address,
    chainId,
    provider,
    balance,
    isConnecting,
    error,
    setConnected,
    setDisconnected,
    setConnecting,
    setError,
    updateBalance,
  } = useWalletStore();

  const walletConnector = getWalletConnector();

  // Connect wallet
  const connect = useCallback(
    async (options?: ConnectOptions) => {
      try {
        setConnecting(true);
        setError(null);

        const result = await walletConnector.connect(options);

        if (result.success && result.data) {
          setConnected(result.data);
          return { success: true };
        } else {
          setError(result.error?.message ?? "Failed to connect wallet");
          return { success: false, error: result.error?.message };
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [walletConnector, setConnected, setConnecting, setError],
  );

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    try {
      await walletConnector.disconnect();
      setDisconnected();
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      return { success: false, error: errorMessage };
    }
  }, [walletConnector, setDisconnected]);

  // Switch chain
  const switchChain = useCallback(
    async (newChainId: ChainId) => {
      try {
        setError(null);
        const result = await walletConnector.switchChain(newChainId);

        if (result.success) {
          // Refresh balance after chain switch
          const balanceResult = await walletConnector.refreshBalance();
          if (balanceResult.success && balanceResult.data) {
            updateBalance(balanceResult.data);
          }
          return { success: true };
        } else {
          setError(result.error?.message ?? "Failed to switch chain");
          return { success: false, error: result.error?.message };
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [walletConnector, setError, updateBalance],
  );

  // Refresh balance
  const refreshBalance = useCallback(async () => {
    try {
      const result = await walletConnector.refreshBalance();
      if (result.success && result.data) {
        updateBalance(result.data);
        return { success: true, balance: result.data };
      }
      return { success: false };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }, [walletConnector, updateBalance]);

  // Sign message
  const signMessage = useCallback(
    async (message: string) => {
      try {
        setError(null);
        const result = await walletConnector.signMessage({ message });

        if (result.success && result.data) {
          return { success: true, data: result.data };
        } else {
          setError(result.error?.message ?? "Failed to sign message");
          return { success: false, error: result.error?.message };
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [walletConnector, setError],
  );

  // Get available providers
  const getAvailableProviders = useCallback(() => {
    return walletConnector.getAvailableProviders();
  }, [walletConnector]);

  // Format address for display
  const formatAddress = useCallback(
    (addr?: string, start = 6, end = 4) => {
      return walletConnector.formatAddress(addr ?? address ?? "", start, end);
    },
    [walletConnector, address],
  );

  // Convert wei to ether
  const weiToEther = useCallback(
    (wei: string) => {
      return walletConnector.weiToEther(wei);
    },
    [walletConnector],
  );

  // Convert ether to wei
  const etherToWei = useCallback(
    (ether: string) => {
      return walletConnector.etherToWei(ether);
    },
    [walletConnector],
  );

  // Setup event listeners
  useEffect(() => {
    const handleAccountsChanged = () => {
      const state = walletConnector.getState();
      if (state.isConnected) {
        setConnected(state);
      } else {
        setDisconnected();
      }
    };

    const handleChainChanged = () => {
      const state = walletConnector.getState();
      setConnected(state);
      refreshBalance();
    };

    const handleDisconnect = () => {
      setDisconnected();
    };

    walletConnector.on("accountsChanged", handleAccountsChanged);
    walletConnector.on("chainChanged", handleChainChanged);
    walletConnector.on("disconnect", handleDisconnect);

    // Check if already connected
    const state = walletConnector.getState();
    if (state.isConnected) {
      setConnected(state);
    }

    return () => {
      walletConnector.off("accountsChanged", handleAccountsChanged);
      walletConnector.off("chainChanged", handleChainChanged);
      walletConnector.off("disconnect", handleDisconnect);
    };
  }, [walletConnector, setConnected, setDisconnected, refreshBalance]);

  return {
    // State
    isConnected,
    address,
    chainId,
    provider,
    balance,
    isConnecting,
    error,

    // Actions
    connect,
    disconnect,
    switchChain,
    refreshBalance,
    signMessage,
    getAvailableProviders,

    // Utilities
    formatAddress,
    weiToEther,
    etherToWei,
  };
}
