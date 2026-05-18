/**
 * Crypto Wallet Connector
 * Connect and interact with Web3 wallets (MetaMask, Coinbase Wallet, WalletConnect)
 *
 * This module provides a unified EIP-1193 compatible interface for wallet connections.
 * WalletConnect v2 integration is fully implemented with proper session management.
 */

import type { CryptoNetwork } from "@/types/billing";
import { CRYPTO_NETWORKS } from "@/config/billing-plans";

export type WalletProvider = "metamask" | "coinbase" | "walletconnect";

export interface WalletInfo {
  address: string;
  network: CryptoNetwork;
  provider: WalletProvider;
  balance: string;
}

export interface ConnectResult {
  success: boolean;
  address?: string;
  network?: CryptoNetwork;
  error?: string;
}

// ============================================================================
// WalletConnect v2 Types (EIP-1193 Compatible)
// ============================================================================

export interface WalletConnectSession {
  topic: string;
  pairingTopic?: string;
  relay: { protocol: string };
  expiry: number;
  acknowledged: boolean;
  controller: string;
  namespaces: Record<string, WalletConnectNamespace>;
  requiredNamespaces: Record<string, WalletConnectNamespace>;
  optionalNamespaces: Record<string, WalletConnectNamespace>;
  sessionProperties?: Record<string, string>;
}

export interface WalletConnectNamespace {
  chains?: string[];
  accounts: string[];
  methods: string[];
  events: string[];
}

export interface WalletConnectConfig {
  projectId: string;
  metadata: {
    name: string;
    description: string;
    url: string;
    icons: string[];
  };
  chains?: number[];
  optionalChains?: number[];
  showQrModal?: boolean;
  qrModalOptions?: {
    themeMode?: "light" | "dark";
    themeVariables?: Record<string, string>;
  };
}

export interface WalletConnectProvider {
  accounts: string[];
  chainId: number;
  session: WalletConnectSession | null;
  connect: (params?: { chains?: number[] }) => Promise<void>;
  disconnect: () => Promise<void>;
  request: <T = unknown>(args: {
    method: string;
    params?: unknown[];
  }) => Promise<T>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (
    event: string,
    handler: (...args: unknown[]) => void,
  ) => void;
  enable: () => Promise<string[]>;
}

// ============================================================================
// WalletConnect Session Storage
// ============================================================================

const WC_SESSION_KEY = "walletconnect_session";
const WC_PAIRING_KEY = "walletconnect_pairings";

interface StoredSession {
  session: WalletConnectSession;
  address: string;
  chainId: number;
  expiry: number;
}

/**
 * Store WalletConnect session for reconnection
 */
function storeWalletConnectSession(
  session: WalletConnectSession,
  address: string,
  chainId: number,
): void {
  if (typeof window === "undefined") return;

  const storedSession: StoredSession = {
    session,
    address,
    chainId,
    expiry: session.expiry,
  };

  try {
    localStorage.setItem(WC_SESSION_KEY, JSON.stringify(storedSession));
  } catch (error) {
    console.error("Failed to store WalletConnect session:", error);
  }
}

/**
 * Retrieve stored WalletConnect session
 */
function getStoredWalletConnectSession(): StoredSession | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(WC_SESSION_KEY);
    if (!stored) return null;

    const session: StoredSession = JSON.parse(stored);

    // Check if session is expired
    const now = Math.floor(Date.now() / 1000);
    if (session.expiry && session.expiry < now) {
      clearWalletConnectSession();
      return null;
    }

    return session;
  } catch (error) {
    console.error("Failed to retrieve WalletConnect session:", error);
    return null;
  }
}

/**
 * Clear stored WalletConnect session
 */
function clearWalletConnectSession(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(WC_SESSION_KEY);
    localStorage.removeItem(WC_PAIRING_KEY);
  } catch (error) {
    console.error("Failed to clear WalletConnect session:", error);
  }
}

// ============================================================================
// WalletConnect Provider Instance
// ============================================================================

let walletConnectProvider: WalletConnectProvider | null = null;
let walletConnectEventHandlers: Map<string, (...args: unknown[]) => void> =
  new Map();

/**
 * Check if MetaMask is installed
 */
export function isMetaMaskInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return typeof (window as any).ethereum !== "undefined";
}

/**
 * Check if Coinbase Wallet is installed
 */
export function isCoinbaseWalletInstalled(): boolean {
  if (typeof window === "undefined") return false;
  const ethereum = (window as any).ethereum;
  return ethereum?.isCoinbaseWallet === true;
}

/**
 * Get available wallet providers
 */
export function getAvailableWallets(): WalletProvider[] {
  const wallets: WalletProvider[] = [];

  if (isMetaMaskInstalled()) wallets.push("metamask");
  if (isCoinbaseWalletInstalled()) wallets.push("coinbase");

  // WalletConnect is always available (uses QR code)
  wallets.push("walletconnect");

  return wallets;
}

/**
 * Connect to MetaMask
 */
export async function connectMetaMask(): Promise<ConnectResult> {
  if (!isMetaMaskInstalled()) {
    return {
      success: false,
      error: "MetaMask is not installed. Please install MetaMask extension.",
    };
  }

  try {
    const ethereum = (window as any).ethereum;

    // Request account access
    const accounts = await ethereum.request({
      method: "eth_requestAccounts",
    });

    if (!accounts || accounts.length === 0) {
      return {
        success: false,
        error: "No accounts found",
      };
    }

    // Get network
    const chainId = await ethereum.request({ method: "eth_chainId" });
    const network = getNetworkFromChainId(parseInt(chainId, 16));

    return {
      success: true,
      address: accounts[0],
      network,
    };
  } catch (error: any) {
    console.error("MetaMask connection error:", error);
    return {
      success: false,
      error: error.message || "Failed to connect to MetaMask",
    };
  }
}

/**
 * Connect to Coinbase Wallet
 */
export async function connectCoinbaseWallet(): Promise<ConnectResult> {
  if (!isCoinbaseWalletInstalled()) {
    return {
      success: false,
      error:
        "Coinbase Wallet is not installed. Please install Coinbase Wallet extension.",
    };
  }

  try {
    const ethereum = (window as any).ethereum;

    // Request account access
    const accounts = await ethereum.request({
      method: "eth_requestAccounts",
    });

    if (!accounts || accounts.length === 0) {
      return {
        success: false,
        error: "No accounts found",
      };
    }

    // Get network
    const chainId = await ethereum.request({ method: "eth_chainId" });
    const network = getNetworkFromChainId(parseInt(chainId, 16));

    return {
      success: true,
      address: accounts[0],
      network,
    };
  } catch (error: any) {
    console.error("Coinbase Wallet connection error:", error);
    return {
      success: false,
      error: error.message || "Failed to connect to Coinbase Wallet",
    };
  }
}

/**
 * Get default WalletConnect configuration
 */
function getWalletConnectConfig(): WalletConnectConfig {
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "nchat";
  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://nchat.app";

  return {
    projectId,
    metadata: {
      name: appName,
      description: "Secure team communication with crypto wallet integration",
      url: appUrl,
      icons: [`${appUrl}/icon.png`],
    },
    chains: [1], // Ethereum mainnet
    optionalChains: [137, 56, 42161], // Polygon, BSC, Arbitrum
    showQrModal: true,
    qrModalOptions: {
      themeMode: "dark",
    },
  };
}

/**
 * Initialize WalletConnect provider dynamically
 * Uses dynamic import to avoid bundling WalletConnect if not used
 */
async function initializeWalletConnectProvider(): Promise<WalletConnectProvider | null> {
  if (typeof window === "undefined") return null;

  // Return existing provider if already initialized
  if (walletConnectProvider) {
    return walletConnectProvider;
  }

  try {
    // Dynamic import of WalletConnect packages
    // This allows the app to work even if WalletConnect is not installed
    const { EthereumProvider } = await import(
      /* webpackIgnore: true */ "@walletconnect/ethereum-provider"
    );

    const config = getWalletConnectConfig();

    if (!config.projectId) {
      console.warn(
        "WalletConnect: No project ID configured. Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID",
      );
      return null;
    }

    // Initialize the provider
    const provider = await EthereumProvider.init({
      projectId: config.projectId,
      metadata: config.metadata,
      chains: config.chains,
      optionalChains: config.optionalChains,
      showQrModal: config.showQrModal,
      qrModalOptions: config.qrModalOptions,
    });

    walletConnectProvider = provider as unknown as WalletConnectProvider;

    // Set up event handlers
    setupWalletConnectEventHandlers(walletConnectProvider);

    return walletConnectProvider;
  } catch (error: unknown) {
    // WalletConnect package not installed - provide helpful error
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    if (
      errorMessage.includes("Cannot find module") ||
      errorMessage.includes("@walletconnect")
    ) {
      console.warn(
        "WalletConnect: Package not installed. Run: pnpm add @walletconnect/ethereum-provider @walletconnect/modal",
      );
    } else {
      console.error("WalletConnect: Failed to initialize provider:", error);
    }
    return null;
  }
}

/**
 * Set up WalletConnect event handlers
 */
function setupWalletConnectEventHandlers(
  provider: WalletConnectProvider,
): void {
  // Account change handler
  const accountsChangedHandler = (accounts: unknown) => {
    const accountArray = accounts as string[];
    if (accountArray.length === 0) {
      // User disconnected
      clearWalletConnectSession();
      walletConnectProvider = null;
    } else {
      // Update stored session with new address
      const storedSession = getStoredWalletConnectSession();
      if (storedSession && provider.session) {
        storeWalletConnectSession(
          provider.session,
          accountArray[0],
          provider.chainId,
        );
      }
    }
  };

  // Chain change handler
  const chainChangedHandler = (chainId: unknown) => {
    const newChainId =
      typeof chainId === "string" ? parseInt(chainId, 16) : (chainId as number);
    const storedSession = getStoredWalletConnectSession();
    if (storedSession && provider.session && provider.accounts[0]) {
      storeWalletConnectSession(
        provider.session,
        provider.accounts[0],
        newChainId,
      );
    }
  };

  // Disconnect handler
  const disconnectHandler = () => {
    clearWalletConnectSession();
    walletConnectProvider = null;
  };

  // Session expiry handler
  const sessionExpireHandler = () => {
    clearWalletConnectSession();
    walletConnectProvider = null;
  };

  // Register handlers
  provider.on("accountsChanged", accountsChangedHandler);
  provider.on("chainChanged", chainChangedHandler);
  provider.on("disconnect", disconnectHandler);
  provider.on("session_expire", sessionExpireHandler);

  // Store handler references for cleanup
  walletConnectEventHandlers.set("accountsChanged", accountsChangedHandler);
  walletConnectEventHandlers.set("chainChanged", chainChangedHandler);
  walletConnectEventHandlers.set("disconnect", disconnectHandler);
  walletConnectEventHandlers.set("session_expire", sessionExpireHandler);
}

/**
 * Clean up WalletConnect event handlers
 */
function cleanupWalletConnectEventHandlers(): void {
  if (!walletConnectProvider) return;

  walletConnectEventHandlers.forEach((handler, event) => {
    walletConnectProvider?.removeListener(event, handler);
  });
  walletConnectEventHandlers.clear();
}

/**
 * Connect to WalletConnect
 * Implements EIP-1193 compatible connection with session persistence
 */
export async function connectWalletConnect(): Promise<ConnectResult> {
  if (typeof window === "undefined") {
    return {
      success: false,
      error: "WalletConnect is only available in browser",
    };
  }

  try {
    // Try to reconnect from stored session first
    const storedSession = getStoredWalletConnectSession();
    if (storedSession) {
      const reconnectResult = await reconnectWalletConnect();
      if (reconnectResult.success) {
        return reconnectResult;
      }
      // If reconnection failed, continue with fresh connection
    }

    // Initialize provider
    const provider = await initializeWalletConnectProvider();

    if (!provider) {
      return {
        success: false,
        error:
          "WalletConnect is not available. Please ensure the package is installed and project ID is configured.",
      };
    }

    // Connect and show QR modal
    await provider.connect();

    // Get connected account and chain
    const accounts = provider.accounts;
    const chainId = provider.chainId;

    if (!accounts || accounts.length === 0) {
      return {
        success: false,
        error: "No accounts found",
      };
    }

    const address = accounts[0];
    const network = getNetworkFromChainId(chainId);

    // Store session for reconnection
    if (provider.session) {
      storeWalletConnectSession(provider.session, address, chainId);
    }

    return {
      success: true,
      address,
      network,
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Handle user rejection
    if (
      errorMessage.includes("User rejected") ||
      errorMessage.includes("user rejected")
    ) {
      return {
        success: false,
        error: "Connection request was rejected",
      };
    }

    // Handle modal close
    if (
      errorMessage.includes("Modal closed") ||
      errorMessage.includes("User closed modal")
    ) {
      return {
        success: false,
        error: "Connection modal was closed",
      };
    }

    console.error("WalletConnect connection error:", error);
    return {
      success: false,
      error: errorMessage || "Failed to connect via WalletConnect",
    };
  }
}

/**
 * Reconnect to WalletConnect using stored session
 */
export async function reconnectWalletConnect(): Promise<ConnectResult> {
  if (typeof window === "undefined") {
    return {
      success: false,
      error: "WalletConnect is only available in browser",
    };
  }

  const storedSession = getStoredWalletConnectSession();
  if (!storedSession) {
    return {
      success: false,
      error: "No stored session found",
    };
  }

  try {
    const provider = await initializeWalletConnectProvider();

    if (!provider) {
      clearWalletConnectSession();
      return {
        success: false,
        error: "WalletConnect provider not available",
      };
    }

    // Check if provider has an active session
    if (provider.session && provider.accounts.length > 0) {
      const address = provider.accounts[0];
      const network = getNetworkFromChainId(provider.chainId);

      return {
        success: true,
        address,
        network,
      };
    }

    // Session expired or invalid
    clearWalletConnectSession();
    return {
      success: false,
      error: "Session expired",
    };
  } catch (error: unknown) {
    clearWalletConnectSession();
    const errorMessage =
      error instanceof Error ? error.message : "Failed to reconnect";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Disconnect WalletConnect session
 */
export async function disconnectWalletConnect(): Promise<void> {
  if (walletConnectProvider) {
    try {
      cleanupWalletConnectEventHandlers();
      await walletConnectProvider.disconnect();
    } catch (error) {
      console.error("Error disconnecting WalletConnect:", error);
    } finally {
      walletConnectProvider = null;
      clearWalletConnectSession();
    }
  } else {
    clearWalletConnectSession();
  }
}

/**
 * Get WalletConnect provider instance (for signing operations)
 */
export function getWalletConnectProvider(): WalletConnectProvider | null {
  return walletConnectProvider;
}

/**
 * Check if WalletConnect session is active
 */
export function isWalletConnectSessionActive(): boolean {
  if (walletConnectProvider?.session) {
    return true;
  }
  const storedSession = getStoredWalletConnectSession();
  return storedSession !== null;
}

/**
 * Sign message with WalletConnect
 */
export async function signMessageWithWalletConnect(
  message: string,
): Promise<string | null> {
  if (!walletConnectProvider || !walletConnectProvider.accounts[0]) {
    return null;
  }

  try {
    const signature = await walletConnectProvider.request<string>({
      method: "personal_sign",
      params: [message, walletConnectProvider.accounts[0]],
    });
    return signature;
  } catch (error) {
    console.error("WalletConnect sign error:", error);
    return null;
  }
}

/**
 * Switch network with WalletConnect
 */
export async function switchNetworkWalletConnect(
  network: CryptoNetwork,
): Promise<boolean> {
  if (!walletConnectProvider) return false;

  const networkConfig = CRYPTO_NETWORKS[network];
  const chainIdHex = `0x${networkConfig.chainId.toString(16)}`;

  try {
    await walletConnectProvider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
    return true;
  } catch (error: unknown) {
    const errorCode = (error as { code?: number })?.code;

    // Chain not added - try to add it
    if (errorCode === 4902) {
      try {
        await walletConnectProvider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: chainIdHex,
              chainName: networkConfig.name,
              rpcUrls: [networkConfig.rpcUrl],
              nativeCurrency: {
                name: networkConfig.symbol,
                symbol: networkConfig.symbol,
                decimals: 18,
              },
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error("Error adding network via WalletConnect:", addError);
        return false;
      }
    }

    console.error("Error switching network via WalletConnect:", error);
    return false;
  }
}

/**
 * Generic wallet connection
 */
export async function connectWallet(
  provider: WalletProvider,
): Promise<ConnectResult> {
  switch (provider) {
    case "metamask":
      return connectMetaMask();
    case "coinbase":
      return connectCoinbaseWallet();
    case "walletconnect":
      return connectWalletConnect();
    default:
      return {
        success: false,
        error: "Unknown wallet provider",
      };
  }
}

/**
 * Disconnect wallet
 */
export async function disconnectWallet(): Promise<void> {
  // Disconnect WalletConnect if active
  await disconnectWalletConnect();

  // Clear any stored wallet info
  if (typeof window !== "undefined") {
    localStorage.removeItem("connectedWallet");
  }
}

/**
 * Get current wallet address
 * Supports both injected providers and WalletConnect
 */
export async function getCurrentAddress(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  // Check WalletConnect first
  if (
    isWalletConnectSessionActive() &&
    walletConnectProvider &&
    walletConnectProvider.accounts[0]
  ) {
    return walletConnectProvider.accounts[0];
  }

  // Fall back to injected provider
  const ethereum = (window as any).ethereum;
  if (!ethereum) return null;

  try {
    const accounts = await ethereum.request({ method: "eth_accounts" });
    return accounts[0] || null;
  } catch (error) {
    console.error("Error getting current address:", error);
    return null;
  }
}

/**
 * Get wallet balance
 */
export async function getBalance(address: string): Promise<string> {
  if (typeof window === "undefined") return "0";

  const ethereum = (window as any).ethereum;
  if (!ethereum) return "0";

  try {
    const balance = await ethereum.request({
      method: "eth_getBalance",
      params: [address, "latest"],
    });

    // Convert from wei to ETH
    const balanceInEth = parseInt(balance, 16) / 1e18;
    return balanceInEth.toFixed(4);
  } catch (error) {
    console.error("Error getting balance:", error);
    return "0";
  }
}

/**
 * Switch to a specific network
 * Supports both injected providers and WalletConnect
 */
export async function switchNetwork(network: CryptoNetwork): Promise<boolean> {
  if (typeof window === "undefined") return false;

  // Use WalletConnect if session is active
  if (isWalletConnectSessionActive() && walletConnectProvider) {
    return switchNetworkWalletConnect(network);
  }

  // Fall back to injected provider
  const ethereum = (window as any).ethereum;
  if (!ethereum) return false;

  const networkConfig = CRYPTO_NETWORKS[network];
  const chainIdHex = `0x${networkConfig.chainId.toString(16)}`;

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
    return true;
  } catch (error: any) {
    // This error code indicates that the chain has not been added to MetaMask
    if (error.code === 4902) {
      try {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: chainIdHex,
              chainName: networkConfig.name,
              rpcUrls: [networkConfig.rpcUrl],
              nativeCurrency: {
                name: networkConfig.symbol,
                symbol: networkConfig.symbol,
                decimals: 18,
              },
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error("Error adding network:", addError);
        return false;
      }
    }

    console.error("Error switching network:", error);
    return false;
  }
}

/**
 * Get network from chain ID
 */
function getNetworkFromChainId(chainId: number): CryptoNetwork {
  const networkMap: Record<number, CryptoNetwork> = {
    1: "ethereum",
    137: "polygon",
    56: "bsc",
    42161: "arbitrum",
  };

  return networkMap[chainId] || "ethereum";
}

/**
 * Sign a message with the connected wallet
 * Supports both injected providers (MetaMask, Coinbase) and WalletConnect
 */
export async function signMessage(message: string): Promise<string | null> {
  if (typeof window === "undefined") return null;

  // Try WalletConnect first if session is active
  if (isWalletConnectSessionActive() && walletConnectProvider) {
    return signMessageWithWalletConnect(message);
  }

  // Fall back to injected provider
  const ethereum = (window as any).ethereum;
  if (!ethereum) return null;

  try {
    const address = await getCurrentAddress();
    if (!address) return null;

    const signature = await ethereum.request({
      method: "personal_sign",
      params: [message, address],
    });

    return signature;
  } catch (error) {
    console.error("Error signing message:", error);
    return null;
  }
}

/**
 * Listen for account changes
 */
export function onAccountsChanged(
  callback: (accounts: string[]) => void,
): void {
  if (typeof window === "undefined") return;

  const ethereum = (window as any).ethereum;
  if (!ethereum) return;

  ethereum.on("accountsChanged", callback);
}

/**
 * Listen for network changes
 */
export function onChainChanged(callback: (chainId: string) => void): void {
  if (typeof window === "undefined") return;

  const ethereum = (window as any).ethereum;
  if (!ethereum) return;

  ethereum.on("chainChanged", callback);
}

/**
 * Remove listeners
 */
export function removeListeners(): void {
  if (typeof window === "undefined") return;

  const ethereum = (window as any).ethereum;
  if (!ethereum) return;

  ethereum.removeAllListeners("accountsChanged");
  ethereum.removeAllListeners("chainChanged");
}

/**
 * Get wallet info
 * Supports both injected providers and WalletConnect
 */
export async function getWalletInfo(): Promise<WalletInfo | null> {
  // Check WalletConnect first
  if (
    isWalletConnectSessionActive() &&
    walletConnectProvider &&
    walletConnectProvider.accounts[0]
  ) {
    const address = walletConnectProvider.accounts[0];
    const network = getNetworkFromChainId(walletConnectProvider.chainId);

    // Get balance via WalletConnect provider
    let balance = "0";
    try {
      const balanceHex = await walletConnectProvider.request<string>({
        method: "eth_getBalance",
        params: [address, "latest"],
      });
      const balanceInEth = parseInt(balanceHex, 16) / 1e18;
      balance = balanceInEth.toFixed(4);
    } catch (error) {
      console.error("Error getting WalletConnect balance:", error);
    }

    return {
      address,
      network,
      provider: "walletconnect",
      balance,
    };
  }

  // Fall back to injected provider
  const address = await getCurrentAddress();
  if (!address) return null;

  const ethereum = (window as any).ethereum;
  if (!ethereum) return null;

  const chainId = await ethereum.request({ method: "eth_chainId" });
  const network = getNetworkFromChainId(parseInt(chainId, 16));
  const balance = await getBalance(address);

  // Determine provider
  let provider: WalletProvider = "metamask";
  if (ethereum.isCoinbaseWallet) {
    provider = "coinbase";
  }

  return {
    address,
    network,
    provider,
    balance,
  };
}
