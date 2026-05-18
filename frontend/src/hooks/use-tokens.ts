/**
 * useTokens Hook - Manage ERC-20 token operations
 *
 * Provides token balance fetching, transfers, and token gating
 */

import { useCallback, useEffect } from "react";
import { useWalletStore } from "@/stores/wallet-store";
import { getTokenManager } from "@/lib/wallet/token-manager";
import { getWalletConnector } from "@/lib/wallet/wallet-connector";
import type {
  TokenInfo,
  TokenBalance,
  TransferParams,
} from "@/lib/wallet/token-manager";
import type { ChainId } from "@/lib/wallet/wallet-connector";

export function useTokens() {
  const {
    address,
    chainId,
    tokens,
    isLoadingTokens,
    setTokens,
    setLoadingTokens,
  } = useWalletStore();

  const walletConnector = getWalletConnector();
  const tokenManager = getTokenManager(
    walletConnector.getEthereumProvider() ?? undefined,
  );

  // Fetch token balances
  const fetchTokenBalances = useCallback(
    async (tokenAddresses: string[]) => {
      if (!address || !chainId) {
        return { success: false, error: "Wallet not connected" };
      }

      try {
        setLoadingTokens(true);
        const result = await tokenManager.getTokenBalances(
          tokenAddresses,
          address,
          chainId,
        );

        if (result.success && result.data) {
          setTokens(result.data);
          return { success: true, data: result.data };
        }

        return { success: false, error: "Failed to fetch token balances" };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      } finally {
        setLoadingTokens(false);
      }
    },
    [address, chainId, tokenManager, setTokens, setLoadingTokens],
  );

  // Fetch common tokens for current chain
  const fetchCommonTokens = useCallback(async () => {
    if (!address || !chainId) {
      return { success: false, error: "Wallet not connected" };
    }

    try {
      setLoadingTokens(true);
      const commonTokens = tokenManager.getCommonTokens(chainId);
      const tokenAddresses = commonTokens.map((t) => t.address);

      const result = await tokenManager.getTokenBalances(
        tokenAddresses,
        address,
        chainId,
      );

      if (result.success && result.data) {
        setTokens(result.data);
        return { success: true, data: result.data };
      }

      return { success: false, error: "Failed to fetch common tokens" };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    } finally {
      setLoadingTokens(false);
    }
  }, [address, chainId, tokenManager, setTokens, setLoadingTokens]);

  // Get token info
  const getTokenInfo = useCallback(
    async (tokenAddress: string) => {
      if (!chainId) {
        return { success: false, error: "Wallet not connected" };
      }

      try {
        const result = await tokenManager.getTokenInfo(tokenAddress, chainId);
        return result;
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    },
    [chainId, tokenManager],
  );

  // Get token balance for specific token
  const getTokenBalance = useCallback(
    async (tokenAddress: string) => {
      if (!address || !chainId) {
        return { success: false, error: "Wallet not connected" };
      }

      try {
        const result = await tokenManager.getTokenBalance(
          tokenAddress,
          address,
          chainId,
        );
        return result;
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    },
    [address, chainId, tokenManager],
  );

  // Transfer tokens
  const transferTokens = useCallback(
    async (params: Omit<TransferParams, "from">) => {
      if (!address) {
        return { success: false, error: "Wallet not connected" };
      }

      try {
        const result = await tokenManager.transfer({
          ...params,
          from: address,
        });

        if (result.success) {
          // Refresh token balances after transfer
          await fetchCommonTokens();
        }

        return result;
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    },
    [address, tokenManager, fetchCommonTokens],
  );

  // Check if user has minimum token balance (for token gating)
  const hasMinimumTokenBalance = useCallback(
    async (tokenAddress: string, minimumBalance: string): Promise<boolean> => {
      if (!address || !chainId) {
        return false;
      }

      try {
        const result = await tokenManager.getTokenBalance(
          tokenAddress,
          address,
          chainId,
        );

        if (result.success && result.data) {
          const userBalance = BigInt(result.data.balance);
          const requiredBalance = BigInt(minimumBalance);
          return userBalance >= requiredBalance;
        }

        return false;
      } catch {
        return false;
      }
    },
    [address, chainId, tokenManager],
  );

  // Format token amount for display
  const formatTokenAmount = useCallback(
    (amount: string, decimals: number) => {
      return tokenManager.formatTokenAmount(amount, decimals);
    },
    [tokenManager],
  );

  // Parse token amount from user input
  const parseTokenAmount = useCallback(
    (amount: string, decimals: number) => {
      return tokenManager.parseTokenAmount(amount, decimals);
    },
    [tokenManager],
  );

  // Auto-fetch common tokens when wallet connects
  useEffect(() => {
    if (address && chainId) {
      fetchCommonTokens();
    }
  }, [address, chainId, fetchCommonTokens]);

  return {
    // State
    tokens,
    isLoadingTokens,

    // Actions
    fetchTokenBalances,
    fetchCommonTokens,
    getTokenInfo,
    getTokenBalance,
    transferTokens,
    hasMinimumTokenBalance,

    // Utilities
    formatTokenAmount,
    parseTokenAmount,
  };
}
