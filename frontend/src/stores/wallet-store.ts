/**
 * Wallet Store - Zustand store for wallet state management
 *
 * Manages wallet connection state, balances, tokens, and NFTs
 */

import { create } from "zustand";
import type {
  WalletState,
  WalletProvider,
  ChainId,
} from "@/lib/wallet/wallet-connector";
import type { TokenBalance, NFTInfo } from "@/lib/wallet/token-manager";
import type { PendingTransaction } from "@/lib/wallet/transaction-manager";

// ============================================================================
// Types
// ============================================================================

export interface WalletStoreState {
  // Connection state
  isConnected: boolean;
  address: string | null;
  chainId: ChainId | null;
  provider: WalletProvider | null;
  balance: string | null;
  isConnecting: boolean;
  error: string | null;

  // Tokens and NFTs
  tokens: TokenBalance[];
  nfts: NFTInfo[];
  isLoadingTokens: boolean;
  isLoadingNFTs: boolean;

  // Transactions
  pendingTransactions: PendingTransaction[];

  // UI state
  isWalletModalOpen: boolean;
  isTransactionModalOpen: boolean;
  selectedToken: TokenBalance | null;

  // Actions
  setConnected: (state: WalletState) => void;
  setDisconnected: () => void;
  setConnecting: (isConnecting: boolean) => void;
  setError: (error: string | null) => void;
  updateBalance: (balance: string) => void;
  setTokens: (tokens: TokenBalance[]) => void;
  setNFTs: (nfts: NFTInfo[]) => void;
  setLoadingTokens: (loading: boolean) => void;
  setLoadingNFTs: (loading: boolean) => void;
  addPendingTransaction: (tx: PendingTransaction) => void;
  updatePendingTransaction: (
    hash: string,
    updates: Partial<PendingTransaction>,
  ) => void;
  removePendingTransaction: (hash: string) => void;
  setWalletModalOpen: (open: boolean) => void;
  setTransactionModalOpen: (open: boolean) => void;
  setSelectedToken: (token: TokenBalance | null) => void;
  reset: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState = {
  isConnected: false,
  address: null,
  chainId: null,
  provider: null,
  balance: null,
  isConnecting: false,
  error: null,
  tokens: [],
  nfts: [],
  isLoadingTokens: false,
  isLoadingNFTs: false,
  pendingTransactions: [],
  isWalletModalOpen: false,
  isTransactionModalOpen: false,
  selectedToken: null,
};

// ============================================================================
// Store
// ============================================================================

export const useWalletStore = create<WalletStoreState>((set) => ({
  ...initialState,

  setConnected: (walletState: WalletState) =>
    set({
      isConnected: walletState.isConnected,
      address: walletState.address,
      chainId: walletState.chainId,
      provider: walletState.provider,
      balance: walletState.balance,
      isConnecting: false,
      error: null,
    }),

  setDisconnected: () =>
    set({
      ...initialState,
    }),

  setConnecting: (isConnecting: boolean) => set({ isConnecting }),

  setError: (error: string | null) => set({ error, isConnecting: false }),

  updateBalance: (balance: string) => set({ balance }),

  setTokens: (tokens: TokenBalance[]) =>
    set({ tokens, isLoadingTokens: false }),

  setNFTs: (nfts: NFTInfo[]) => set({ nfts, isLoadingNFTs: false }),

  setLoadingTokens: (loading: boolean) => set({ isLoadingTokens: loading }),

  setLoadingNFTs: (loading: boolean) => set({ isLoadingNFTs: loading }),

  addPendingTransaction: (tx: PendingTransaction) =>
    set((state) => ({
      pendingTransactions: [...state.pendingTransactions, tx],
    })),

  updatePendingTransaction: (
    hash: string,
    updates: Partial<PendingTransaction>,
  ) =>
    set((state) => ({
      pendingTransactions: state.pendingTransactions.map((tx) =>
        tx.hash === hash ? { ...tx, ...updates } : tx,
      ),
    })),

  removePendingTransaction: (hash: string) =>
    set((state) => ({
      pendingTransactions: state.pendingTransactions.filter(
        (tx) => tx.hash !== hash,
      ),
    })),

  setWalletModalOpen: (open: boolean) => set({ isWalletModalOpen: open }),

  setTransactionModalOpen: (open: boolean) =>
    set({ isTransactionModalOpen: open }),

  setSelectedToken: (token: TokenBalance | null) =>
    set({ selectedToken: token }),

  reset: () => set({ ...initialState }),
}));
