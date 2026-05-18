/**
 * Type declarations for WalletConnect Ethereum Provider
 *
 * These types provide TypeScript support for dynamic imports of WalletConnect.
 * The actual package is optional and will be loaded dynamically if available.
 */

declare module "@walletconnect/ethereum-provider" {
  export interface EthereumProviderOptions {
    projectId: string;
    metadata?: {
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
    rpcMap?: Record<number, string>;
    methods?: string[];
    optionalMethods?: string[];
    events?: string[];
    optionalEvents?: string[];
  }

  export interface SessionTypes {
    struct: {
      topic: string;
      pairingTopic?: string;
      relay: { protocol: string };
      expiry: number;
      acknowledged: boolean;
      controller: string;
      namespaces: Record<
        string,
        {
          chains?: string[];
          accounts: string[];
          methods: string[];
          events: string[];
        }
      >;
      requiredNamespaces: Record<
        string,
        {
          chains?: string[];
          accounts: string[];
          methods: string[];
          events: string[];
        }
      >;
      optionalNamespaces: Record<
        string,
        {
          chains?: string[];
          accounts: string[];
          methods: string[];
          events: string[];
        }
      >;
      sessionProperties?: Record<string, string>;
    };
  }

  export class EthereumProvider {
    static init(options: EthereumProviderOptions): Promise<EthereumProvider>;

    accounts: string[];
    chainId: number;
    session: SessionTypes["struct"] | null;

    connect(params?: { chains?: number[] }): Promise<void>;
    disconnect(): Promise<void>;
    request<T = unknown>(args: {
      method: string;
      params?: unknown[];
    }): Promise<T>;
    on(event: string, handler: (...args: unknown[]) => void): void;
    removeListener(event: string, handler: (...args: unknown[]) => void): void;
    enable(): Promise<string[]>;
  }
}

/**
 * Type declarations for @capacitor-community/secure-storage-plugin
 *
 * The package is optional and loaded dynamically via webpackIgnore at runtime
 * (iOS Keychain and Android Keystore native bridge). The interface here is
 * structurally compatible with both iOSKeychainBridge and AndroidKeystoreBridge
 * from src/lib/secure-storage/types.ts so callers can safely cast to either.
 */
declare module "@capacitor-community/secure-storage-plugin" {
  interface CapacitorSecureStoragePlugin {
    // iOS Keychain + Android Keystore shared surface (options typed as any
    // because the Capacitor plugin accepts both iOSKeychainOptions and
    // AndroidKeystoreOptions interchangeably at runtime).
    // biome-ignore lint: options typed loosely for cross-platform plugin compat
    setItem(key: string, value: string, options: object): Promise<boolean>;
    // biome-ignore lint: options typed loosely for cross-platform plugin compat
    getItem(key: string, options: object): Promise<string | null>;
    // biome-ignore lint: options typed loosely for cross-platform plugin compat
    removeItem(key: string, options: object): Promise<boolean>;
    getAllKeys(options?: object): Promise<string[]>;
    clear(options?: object): Promise<boolean>;
    isAvailable(): Promise<boolean>;
    getBiometricType(): Promise<string>;
    authenticateBiometric(reason: string): Promise<boolean>;
    isStrongBoxAvailable(): Promise<boolean>;
  }
  export const SecureStoragePlugin: CapacitorSecureStoragePlugin;
}

declare module "@walletconnect/modal" {
  export interface WalletConnectModalOptions {
    projectId: string;
    chains?: number[];
    themeMode?: "light" | "dark";
    themeVariables?: Record<string, string>;
  }

  export class WalletConnectModal {
    constructor(options: WalletConnectModalOptions);
    openModal(options?: { uri?: string }): void;
    closeModal(): void;
    subscribeModal(callback: (state: { open: boolean }) => void): () => void;
  }
}
