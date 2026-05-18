/**
 * Secure Storage Types
 *
 * Shared types for secure storage implementations across all platforms.
 */

// ============================================================================
// Platform Types
// ============================================================================

/**
 * Supported operating systems
 */
export type OperatingSystem =
  | "ios"
  | "android"
  | "macos"
  | "windows"
  | "linux"
  | "web"
  | "unknown";

/**
 * Security levels for stored items
 */
export type SecureStorageSecurityLevel =
  | "hardware" // Hardware-backed (Secure Enclave, TEE, TPM)
  | "system" // OS-level protection (Keychain, Keystore, Credential Manager)
  | "encrypted" // Software encryption
  | "plaintext"; // Not recommended - no protection

/**
 * Access control policy for stored items
 */
export type AccessControlPolicy =
  | "whenUnlocked" // Available only when device is unlocked
  | "afterFirstUnlock" // Available after first unlock until reboot
  | "always" // Always available (less secure)
  | "whenPasscodeSetThisDeviceOnly" // Requires passcode, this device only
  | "whenUnlockedThisDeviceOnly"; // When unlocked, this device only

/**
 * Biometric authentication type
 */
export type BiometricAuthType =
  | "faceId"
  | "touchId"
  | "fingerprint"
  | "face"
  | "iris"
  | "none";

// ============================================================================
// Storage Item Types
// ============================================================================

/**
 * Options for storing a secure item
 */
export interface SecureStorageSetOptions {
  /** Service/application identifier for the item */
  service?: string;
  /** Account/username associated with the item */
  account?: string;
  /** Access control policy */
  accessControl?: AccessControlPolicy;
  /** Require biometric authentication for access */
  requireBiometric?: boolean;
  /** Synchronizable across devices (iCloud Keychain, etc.) */
  synchronizable?: boolean;
  /** Access group for shared Keychain access (iOS) */
  accessGroup?: string;
  /** Label for the keychain item */
  label?: string;
  /** Comment for the keychain item */
  comment?: string;
}

/**
 * Options for retrieving a secure item
 */
export interface SecureStorageGetOptions {
  /** Service/application identifier */
  service?: string;
  /** Account/username */
  account?: string;
  /** Biometric authentication prompt message */
  biometricPrompt?: string;
  /** Allow fallback to passcode if biometric fails */
  allowPasscodeFallback?: boolean;
}

/**
 * Metadata about a stored item
 */
export interface SecureStorageItemMeta {
  /** When the item was created */
  createdAt: Date;
  /** When the item was last modified */
  modifiedAt: Date;
  /** Security level of the storage */
  securityLevel: SecureStorageSecurityLevel;
  /** Whether biometric protection is enabled */
  biometricProtected: boolean;
  /** Whether the item is synchronizable */
  synchronizable: boolean;
  /** Access control policy */
  accessControl: AccessControlPolicy;
  /** Service identifier */
  service: string;
  /** Account identifier */
  account: string;
}

/**
 * Result of a storage operation
 */
export interface SecureStorageResult<T> {
  /** Whether the operation succeeded */
  success: boolean;
  /** The result data (if successful) */
  data: T | null;
  /** Error message (if failed) */
  error: string | null;
  /** Error code for programmatic handling */
  errorCode?: SecureStorageErrorCode;
  /** Item metadata (if applicable) */
  meta?: SecureStorageItemMeta;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error codes for secure storage operations
 */
export type SecureStorageErrorCode =
  | "NOT_AVAILABLE" // Secure storage not available on platform
  | "NOT_INITIALIZED" // Storage not initialized
  | "ITEM_NOT_FOUND" // Requested item not found
  | "ACCESS_DENIED" // Access denied (authentication failed)
  | "BIOMETRIC_FAILED" // Biometric authentication failed
  | "BIOMETRIC_CANCELLED" // User cancelled biometric authentication
  | "BIOMETRIC_NOT_AVAILABLE" // Biometric not available
  | "ENCRYPTION_FAILED" // Encryption operation failed
  | "DECRYPTION_FAILED" // Decryption operation failed
  | "SERIALIZATION_FAILED" // Failed to serialize data
  | "DESERIALIZATION_FAILED" // Failed to deserialize data
  | "STORAGE_FULL" // Storage is full
  | "KEY_NOT_FOUND" // Encryption key not found
  | "INVALID_KEY" // Invalid encryption key
  | "PLATFORM_ERROR" // Platform-specific error
  | "UNKNOWN_ERROR"; // Unknown error

/**
 * Secure storage error class
 */
export class SecureStorageError extends Error {
  constructor(
    message: string,
    public readonly code: SecureStorageErrorCode,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "SecureStorageError";
  }

  /**
   * Creates a result object from this error
   */
  toResult<T>(): SecureStorageResult<T> {
    return {
      success: false,
      data: null,
      error: this.message,
      errorCode: this.code,
    };
  }
}

// ============================================================================
// Capability Types
// ============================================================================

/**
 * Capabilities of the secure storage implementation
 */
export interface SecureStorageCapabilities {
  /** Whether hardware-backed storage is available */
  hardwareStorage: boolean;
  /** Whether biometric authentication is available */
  biometricAuth: boolean;
  /** Available biometric authentication types */
  biometricTypes: BiometricAuthType[];
  /** Whether secure enclave/TEE is available */
  secureEnclave: boolean;
  /** Whether items can be synchronized across devices */
  syncSupported: boolean;
  /** Maximum size for a single item (bytes) */
  maxItemSize: number;
  /** Whether access groups are supported (iOS) */
  accessGroupsSupported: boolean;
  /** Operating system */
  os: OperatingSystem;
  /** Security level of the implementation */
  securityLevel: SecureStorageSecurityLevel;
}

// ============================================================================
// Interface Types
// ============================================================================

/**
 * Interface for platform-specific secure storage implementations
 */
export interface ISecureStorage {
  /** Operating system this implementation supports */
  readonly os: OperatingSystem;

  /** Initialize the secure storage */
  initialize(): Promise<void>;

  /** Check if initialized */
  isInitialized(): boolean;

  /** Get storage capabilities */
  getCapabilities(): Promise<SecureStorageCapabilities>;

  /** Store a secret value */
  setItem(
    key: string,
    value: string,
    options?: SecureStorageSetOptions,
  ): Promise<SecureStorageResult<void>>;

  /** Retrieve a secret value */
  getItem(
    key: string,
    options?: SecureStorageGetOptions,
  ): Promise<SecureStorageResult<string>>;

  /** Check if an item exists */
  hasItem(key: string, options?: SecureStorageGetOptions): Promise<boolean>;

  /** Remove an item */
  removeItem(
    key: string,
    options?: SecureStorageGetOptions,
  ): Promise<SecureStorageResult<void>>;

  /** Get all keys (may require authentication) */
  getAllKeys(options?: SecureStorageGetOptions): Promise<string[]>;

  /** Clear all items */
  clear(options?: SecureStorageGetOptions): Promise<SecureStorageResult<void>>;

  /** Get item metadata without accessing the value */
  getItemMeta(
    key: string,
    options?: SecureStorageGetOptions,
  ): Promise<SecureStorageItemMeta | null>;

  /** Check if biometric authentication is available */
  isBiometricAvailable(): Promise<boolean>;

  /** Authenticate with biometrics */
  authenticateBiometric(reason: string): Promise<SecureStorageResult<void>>;
}

/**
 * Options for creating a SecureStorageManager
 */
export interface SecureStorageManagerOptions {
  /** Default service identifier */
  service?: string;
  /** Whether to prefer hardware-backed storage */
  preferHardwareStorage?: boolean;
  /** Enable debug logging */
  debug?: boolean;
  /** Custom fallback storage implementation */
  fallbackStorage?: ISecureStorage;
}

// ============================================================================
// Native Bridge Types
// ============================================================================

/**
 * iOS Keychain native bridge interface
 */
export interface iOSKeychainBridge {
  setItem(
    key: string,
    value: string,
    options: iOSKeychainOptions,
  ): Promise<boolean>;
  getItem(key: string, options: iOSKeychainOptions): Promise<string | null>;
  removeItem(key: string, options: iOSKeychainOptions): Promise<boolean>;
  getAllKeys(options: iOSKeychainOptions): Promise<string[]>;
  clear(options: iOSKeychainOptions): Promise<boolean>;
  isAvailable(): Promise<boolean>;
  getBiometricType(): Promise<"faceId" | "touchId" | "none">;
  authenticateBiometric(reason: string): Promise<boolean>;
}

export interface iOSKeychainOptions {
  service: string;
  accessControl?: string;
  accessGroup?: string;
  synchronizable?: boolean;
  requireBiometric?: boolean;
}

/**
 * Android Keystore native bridge interface
 */
export interface AndroidKeystoreBridge {
  setItem(
    key: string,
    value: string,
    options: AndroidKeystoreOptions,
  ): Promise<boolean>;
  getItem(key: string, options: AndroidKeystoreOptions): Promise<string | null>;
  removeItem(key: string, options: AndroidKeystoreOptions): Promise<boolean>;
  getAllKeys(): Promise<string[]>;
  clear(): Promise<boolean>;
  isAvailable(): Promise<boolean>;
  getBiometricType(): Promise<"fingerprint" | "face" | "iris" | "none">;
  authenticateBiometric(reason: string): Promise<boolean>;
  isStrongBoxAvailable(): Promise<boolean>;
}

export interface AndroidKeystoreOptions {
  requireBiometric?: boolean;
  invalidateOnBiometricChange?: boolean;
  userAuthenticationRequired?: boolean;
  useStrongBox?: boolean;
}

/**
 * Desktop keychain native bridge interface (macOS/Windows/Linux)
 */
export interface DesktopKeychainBridge {
  setPassword(
    service: string,
    account: string,
    password: string,
  ): Promise<boolean>;
  getPassword(service: string, account: string): Promise<string | null>;
  deletePassword(service: string, account: string): Promise<boolean>;
  findCredentials(
    service: string,
  ): Promise<Array<{ account: string; password: string }>>;
  isAvailable(): Promise<boolean>;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default service identifier for secure storage
 */
export const DEFAULT_SERVICE = "com.nchat.secure-storage";

/**
 * Maximum item size (5MB)
 */
export const MAX_ITEM_SIZE = 5 * 1024 * 1024;

/**
 * Key prefix for all stored items
 */
export const STORAGE_KEY_PREFIX = "nchat_secure_";

/**
 * Metadata suffix for stored items
 */
export const METADATA_SUFFIX = "_meta";
