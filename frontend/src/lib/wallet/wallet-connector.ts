/**
 * Wallet Connector - Handles crypto wallet connections
 *
 * Provides wallet connection abstraction supporting MetaMask,
 * Coinbase Wallet, and WalletConnect protocols.
 */

// ============================================================================
// Types
// ============================================================================

export type WalletProvider = "metamask" | "coinbase" | "walletconnect";

export type ChainId =
  | "0x1" // Ethereum Mainnet
  | "0x5" // Goerli Testnet
  | "0xaa36a7" // Sepolia Testnet
  | "0x89" // Polygon Mainnet
  | "0x13881" // Polygon Mumbai
  | "0xa4b1" // Arbitrum One
  | "0xa" // Optimism
  | "0x38" // BNB Smart Chain
  | "0x2105"; // Base

export interface ChainConfig {
  chainId: ChainId;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: ChainId | null;
  provider: WalletProvider | null;
  balance: string | null;
}

export interface ConnectOptions {
  provider?: WalletProvider;
  chainId?: ChainId;
}

export interface SignMessageOptions {
  message: string;
  address?: string;
}

export interface SignedMessage {
  message: string;
  signature: string;
  address: string;
}

export interface WalletError {
  code: number;
  message: string;
  provider: WalletProvider | null;
}

export interface WalletConnectorResult<T> {
  success: boolean;
  data?: T;
  error?: WalletError;
}

export interface EthereumProvider {
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  removeListener: (
    event: string,
    callback: (...args: unknown[]) => void,
  ) => void;
  selectedAddress?: string | null;
  chainId?: string;
}

// ============================================================================
// Chain Configurations
// ============================================================================

export const SUPPORTED_CHAINS: Record<ChainId, ChainConfig> = {
  "0x1": {
    chainId: "0x1",
    chainName: "Ethereum Mainnet",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://mainnet.infura.io/v3/"],
    blockExplorerUrls: ["https://etherscan.io"],
  },
  "0x5": {
    chainId: "0x5",
    chainName: "Goerli Testnet",
    nativeCurrency: { name: "Goerli Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://goerli.infura.io/v3/"],
    blockExplorerUrls: ["https://goerli.etherscan.io"],
  },
  "0xaa36a7": {
    chainId: "0xaa36a7",
    chainName: "Sepolia Testnet",
    nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://sepolia.infura.io/v3/"],
    blockExplorerUrls: ["https://sepolia.etherscan.io"],
  },
  "0x89": {
    chainId: "0x89",
    chainName: "Polygon Mainnet",
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
    rpcUrls: ["https://polygon-rpc.com"],
    blockExplorerUrls: ["https://polygonscan.com"],
  },
  "0x13881": {
    chainId: "0x13881",
    chainName: "Polygon Mumbai",
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
    rpcUrls: ["https://rpc-mumbai.maticvigil.com"],
    blockExplorerUrls: ["https://mumbai.polygonscan.com"],
  },
  "0xa4b1": {
    chainId: "0xa4b1",
    chainName: "Arbitrum One",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://arb1.arbitrum.io/rpc"],
    blockExplorerUrls: ["https://arbiscan.io"],
  },
  "0xa": {
    chainId: "0xa",
    chainName: "Optimism",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://mainnet.optimism.io"],
    blockExplorerUrls: ["https://optimistic.etherscan.io"],
  },
  "0x38": {
    chainId: "0x38",
    chainName: "BNB Smart Chain",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    rpcUrls: ["https://bsc-dataseed.binance.org"],
    blockExplorerUrls: ["https://bscscan.com"],
  },
  "0x2105": {
    chainId: "0x2105",
    chainName: "Base",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://mainnet.base.org"],
    blockExplorerUrls: ["https://basescan.org"],
  },
};

// ============================================================================
// Error Codes
// ============================================================================

export const WALLET_ERROR_CODES = {
  USER_REJECTED: 4001,
  UNAUTHORIZED: 4100,
  UNSUPPORTED_METHOD: 4200,
  DISCONNECTED: 4900,
  CHAIN_DISCONNECTED: 4901,
  PROVIDER_NOT_FOUND: 4902,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  CHAIN_NOT_ADDED: 4902,
} as const;

// ============================================================================
// Wallet Connector Class
// ============================================================================

export class WalletConnector {
  private state: WalletState = {
    isConnected: false,
    address: null,
    chainId: null,
    provider: null,
    balance: null,
  };

  private eventListeners: Map<string, Set<(...args: unknown[]) => void>> =
    new Map();
  private ethereumProvider: EthereumProvider | null = null;

  constructor() {
    this.detectProvider();
  }

  // ==========================================================================
  // Provider Detection
  // ==========================================================================

  /**
   * Detect available wallet providers
   */
  private detectProvider(): void {
    if (
      typeof window !== "undefined" &&
      (window as unknown as { ethereum?: EthereumProvider }).ethereum
    ) {
      this.ethereumProvider = (
        window as unknown as { ethereum: EthereumProvider }
      ).ethereum;
    }
  }

  /**
   * Check if MetaMask is available
   */
  isMetaMaskAvailable(): boolean {
    return this.ethereumProvider?.isMetaMask === true;
  }

  /**
   * Check if Coinbase Wallet is available
   */
  isCoinbaseWalletAvailable(): boolean {
    return this.ethereumProvider?.isCoinbaseWallet === true;
  }

  /**
   * Check if WalletConnect is available (always available as it's QR-based)
   */
  isWalletConnectAvailable(): boolean {
    return true;
  }

  /**
   * Get available wallet providers
   */
  getAvailableProviders(): WalletProvider[] {
    const providers: WalletProvider[] = [];
    if (this.isMetaMaskAvailable()) providers.push("metamask");
    if (this.isCoinbaseWalletAvailable()) providers.push("coinbase");
    if (this.isWalletConnectAvailable()) providers.push("walletconnect");
    return providers;
  }

  /**
   * Get the Ethereum provider
   */
  getEthereumProvider(): EthereumProvider | null {
    return this.ethereumProvider;
  }

  /**
   * Set the Ethereum provider (for testing)
   */
  setEthereumProvider(provider: EthereumProvider | null): void {
    this.ethereumProvider = provider;
  }

  // ==========================================================================
  // Connection Methods
  // ==========================================================================

  /**
   * Connect to a wallet
   */
  async connect(
    options: ConnectOptions = {},
  ): Promise<WalletConnectorResult<WalletState>> {
    const provider = options.provider ?? "metamask";

    if (provider === "metamask" || provider === "coinbase") {
      if (!this.ethereumProvider) {
        return {
          success: false,
          error: {
            code: WALLET_ERROR_CODES.PROVIDER_NOT_FOUND,
            message: `${provider === "metamask" ? "MetaMask" : "Coinbase Wallet"} not found. Please install the extension.`,
            provider,
          },
        };
      }

      try {
        const accounts = (await this.ethereumProvider.request({
          method: "eth_requestAccounts",
        })) as string[];

        if (!accounts || accounts.length === 0) {
          return {
            success: false,
            error: {
              code: WALLET_ERROR_CODES.UNAUTHORIZED,
              message: "No accounts found",
              provider,
            },
          };
        }

        const chainId = (await this.ethereumProvider.request({
          method: "eth_chainId",
        })) as ChainId;

        // Switch chain if requested
        if (options.chainId && options.chainId !== chainId) {
          const switchResult = await this.switchChain(options.chainId);
          if (!switchResult.success) {
            return switchResult as unknown as WalletConnectorResult<WalletState>;
          }
        }

        const balance = await this.getBalance(accounts[0]);

        this.state = {
          isConnected: true,
          address: accounts[0],
          chainId: options.chainId ?? chainId,
          provider,
          balance: balance.data ?? null,
        };

        this.setupEventListeners();
        this.emit("connect", this.state);

        return {
          success: true,
          data: this.state,
        };
      } catch (error) {
        const err = error as { code?: number; message?: string };
        return {
          success: false,
          error: {
            code: err.code ?? WALLET_ERROR_CODES.INTERNAL_ERROR,
            message: err.message ?? "Failed to connect",
            provider,
          },
        };
      }
    }

    // WalletConnect would require additional setup
    return {
      success: false,
      error: {
        code: WALLET_ERROR_CODES.UNSUPPORTED_METHOD,
        message: "WalletConnect requires additional configuration",
        provider,
      },
    };
  }

  /**
   * Disconnect from wallet
   */
  async disconnect(): Promise<WalletConnectorResult<void>> {
    this.removeEventListeners();

    const previousState = { ...this.state };

    this.state = {
      isConnected: false,
      address: null,
      chainId: null,
      provider: null,
      balance: null,
    };

    this.emit("disconnect", previousState);

    return { success: true };
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.state.isConnected;
  }

  /**
   * Get current wallet state
   */
  getState(): WalletState {
    return { ...this.state };
  }

  /**
   * Get connected address
   */
  getAddress(): string | null {
    return this.state.address;
  }

  /**
   * Get current chain ID
   */
  getChainId(): ChainId | null {
    return this.state.chainId;
  }

  // ==========================================================================
  // Chain Methods
  // ==========================================================================

  /**
   * Switch to a different chain
   */
  async switchChain(chainId: ChainId): Promise<WalletConnectorResult<ChainId>> {
    if (!this.ethereumProvider) {
      return {
        success: false,
        error: {
          code: WALLET_ERROR_CODES.PROVIDER_NOT_FOUND,
          message: "Wallet provider not found",
          provider: this.state.provider,
        },
      };
    }

    try {
      await this.ethereumProvider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId }],
      });

      this.state.chainId = chainId;
      this.emit("chainChanged", chainId);

      return {
        success: true,
        data: chainId,
      };
    } catch (error) {
      const err = error as { code?: number; message?: string };

      // Chain not added, try to add it
      if (
        err.code === WALLET_ERROR_CODES.CHAIN_NOT_ADDED ||
        err.code === 4902
      ) {
        return this.addChain(chainId);
      }

      return {
        success: false,
        error: {
          code: err.code ?? WALLET_ERROR_CODES.INTERNAL_ERROR,
          message: err.message ?? "Failed to switch chain",
          provider: this.state.provider,
        },
      };
    }
  }

  /**
   * Add a new chain to the wallet
   */
  async addChain(chainId: ChainId): Promise<WalletConnectorResult<ChainId>> {
    if (!this.ethereumProvider) {
      return {
        success: false,
        error: {
          code: WALLET_ERROR_CODES.PROVIDER_NOT_FOUND,
          message: "Wallet provider not found",
          provider: this.state.provider,
        },
      };
    }

    const chainConfig = SUPPORTED_CHAINS[chainId];
    if (!chainConfig) {
      return {
        success: false,
        error: {
          code: WALLET_ERROR_CODES.INVALID_PARAMS,
          message: `Chain ${chainId} is not supported`,
          provider: this.state.provider,
        },
      };
    }

    try {
      await this.ethereumProvider.request({
        method: "wallet_addEthereumChain",
        params: [chainConfig],
      });

      this.state.chainId = chainId;
      this.emit("chainChanged", chainId);

      return {
        success: true,
        data: chainId,
      };
    } catch (error) {
      const err = error as { code?: number; message?: string };
      return {
        success: false,
        error: {
          code: err.code ?? WALLET_ERROR_CODES.INTERNAL_ERROR,
          message: err.message ?? "Failed to add chain",
          provider: this.state.provider,
        },
      };
    }
  }

  /**
   * Get chain configuration
   */
  getChainConfig(chainId: ChainId): ChainConfig | null {
    return SUPPORTED_CHAINS[chainId] ?? null;
  }

  /**
   * Get all supported chains
   */
  getSupportedChains(): ChainConfig[] {
    return Object.values(SUPPORTED_CHAINS);
  }

  /**
   * Check if a chain is supported
   */
  isChainSupported(chainId: string): boolean {
    return chainId in SUPPORTED_CHAINS;
  }

  // ==========================================================================
  // Balance Methods
  // ==========================================================================

  /**
   * Get balance for an address
   */
  async getBalance(address?: string): Promise<WalletConnectorResult<string>> {
    const targetAddress = address ?? this.state.address;

    if (!targetAddress) {
      return {
        success: false,
        error: {
          code: WALLET_ERROR_CODES.INVALID_PARAMS,
          message: "Address is required",
          provider: this.state.provider,
        },
      };
    }

    if (!this.ethereumProvider) {
      return {
        success: false,
        error: {
          code: WALLET_ERROR_CODES.PROVIDER_NOT_FOUND,
          message: "Wallet provider not found",
          provider: this.state.provider,
        },
      };
    }

    try {
      const balance = (await this.ethereumProvider.request({
        method: "eth_getBalance",
        params: [targetAddress, "latest"],
      })) as string;

      return {
        success: true,
        data: balance,
      };
    } catch (error) {
      const err = error as { code?: number; message?: string };
      return {
        success: false,
        error: {
          code: err.code ?? WALLET_ERROR_CODES.INTERNAL_ERROR,
          message: err.message ?? "Failed to get balance",
          provider: this.state.provider,
        },
      };
    }
  }

  /**
   * Update the current balance
   */
  async refreshBalance(): Promise<WalletConnectorResult<string>> {
    const result = await this.getBalance();
    if (result.success && result.data) {
      this.state.balance = result.data;
      this.emit("balanceChanged", result.data);
    }
    return result;
  }

  // ==========================================================================
  // Signing Methods
  // ==========================================================================

  /**
   * Sign a message
   */
  async signMessage(
    options: SignMessageOptions,
  ): Promise<WalletConnectorResult<SignedMessage>> {
    const address = options.address ?? this.state.address;

    if (!address) {
      return {
        success: false,
        error: {
          code: WALLET_ERROR_CODES.INVALID_PARAMS,
          message: "Address is required",
          provider: this.state.provider,
        },
      };
    }

    if (!this.ethereumProvider) {
      return {
        success: false,
        error: {
          code: WALLET_ERROR_CODES.PROVIDER_NOT_FOUND,
          message: "Wallet provider not found",
          provider: this.state.provider,
        },
      };
    }

    try {
      const signature = (await this.ethereumProvider.request({
        method: "personal_sign",
        params: [options.message, address],
      })) as string;

      return {
        success: true,
        data: {
          message: options.message,
          signature,
          address,
        },
      };
    } catch (error) {
      const err = error as { code?: number; message?: string };
      return {
        success: false,
        error: {
          code: err.code ?? WALLET_ERROR_CODES.INTERNAL_ERROR,
          message: err.message ?? "Failed to sign message",
          provider: this.state.provider,
        },
      };
    }
  }

  /**
   * Sign typed data (EIP-712)
   */
  async signTypedData(
    domain: Record<string, unknown>,
    types: Record<string, unknown>,
    value: Record<string, unknown>,
    address?: string,
  ): Promise<WalletConnectorResult<string>> {
    const signerAddress = address ?? this.state.address;

    if (!signerAddress) {
      return {
        success: false,
        error: {
          code: WALLET_ERROR_CODES.INVALID_PARAMS,
          message: "Address is required",
          provider: this.state.provider,
        },
      };
    }

    if (!this.ethereumProvider) {
      return {
        success: false,
        error: {
          code: WALLET_ERROR_CODES.PROVIDER_NOT_FOUND,
          message: "Wallet provider not found",
          provider: this.state.provider,
        },
      };
    }

    try {
      const data = JSON.stringify({
        types,
        primaryType: Object.keys(types).find((t) => t !== "EIP712Domain"),
        domain,
        message: value,
      });

      const signature = (await this.ethereumProvider.request({
        method: "eth_signTypedData_v4",
        params: [signerAddress, data],
      })) as string;

      return {
        success: true,
        data: signature,
      };
    } catch (error) {
      const err = error as { code?: number; message?: string };
      return {
        success: false,
        error: {
          code: err.code ?? WALLET_ERROR_CODES.INTERNAL_ERROR,
          message: err.message ?? "Failed to sign typed data",
          provider: this.state.provider,
        },
      };
    }
  }

  // ==========================================================================
  // Event Handling
  // ==========================================================================

  /**
   * Set up event listeners for wallet events
   */
  private setupEventListeners(): void {
    if (!this.ethereumProvider) return;

    const handleAccountsChanged = (accounts: unknown) => {
      const accountArray = accounts as string[];
      if (accountArray.length === 0) {
        this.disconnect();
      } else {
        this.state.address = accountArray[0];
        this.emit("accountsChanged", accountArray);
      }
    };

    const handleChainChanged = (chainId: unknown) => {
      this.state.chainId = chainId as ChainId;
      this.emit("chainChanged", chainId);
    };

    const handleDisconnect = () => {
      this.disconnect();
    };

    this.ethereumProvider.on("accountsChanged", handleAccountsChanged);
    this.ethereumProvider.on("chainChanged", handleChainChanged);
    this.ethereumProvider.on("disconnect", handleDisconnect);
  }

  /**
   * Remove event listeners
   */
  private removeEventListeners(): void {
    if (!this.ethereumProvider) return;

    // In a real implementation, we would store references to the handlers
    // and remove them properly
  }

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
   * Format address for display (truncated)
   */
  formatAddress(address: string, start: number = 6, end: number = 4): string {
    if (!address || address.length < start + end) {
      return address;
    }
    return `${address.slice(0, start)}...${address.slice(-end)}`;
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
   * Validate an Ethereum address
   */
  isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Get block explorer URL for address
   */
  getAddressExplorerUrl(address: string, chainId?: ChainId): string | null {
    const chain = chainId ?? this.state.chainId;
    if (!chain) return null;

    const config = SUPPORTED_CHAINS[chain];
    if (!config || !config.blockExplorerUrls[0]) return null;

    return `${config.blockExplorerUrls[0]}/address/${address}`;
  }

  /**
   * Get block explorer URL for transaction
   */
  getTxExplorerUrl(txHash: string, chainId?: ChainId): string | null {
    const chain = chainId ?? this.state.chainId;
    if (!chain) return null;

    const config = SUPPORTED_CHAINS[chain];
    if (!config || !config.blockExplorerUrls[0]) return null;

    return `${config.blockExplorerUrls[0]}/tx/${txHash}`;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let walletConnectorInstance: WalletConnector | null = null;

/**
 * Get the wallet connector singleton
 */
export function getWalletConnector(): WalletConnector {
  if (!walletConnectorInstance) {
    walletConnectorInstance = new WalletConnector();
  }
  return walletConnectorInstance;
}

/**
 * Reset the wallet connector (for testing)
 */
export function resetWalletConnector(): void {
  walletConnectorInstance = null;
}
