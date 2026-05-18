/**
 * Secure Storage Module
 *
 * Unified secure storage for all platforms with automatic fallback.
 *
 * @example
 * ```typescript
 * import { getSecureStorage, initializeSecureStorage } from '@/lib/secure-storage'
 *
 * // Initialize once at app startup
 * await initializeSecureStorage()
 *
 * // Store a secret
 * const storage = getSecureStorage()
 * await storage.setItem('api-key', 'secret-value', { requireBiometric: true })
 *
 * // Retrieve a secret
 * const result = await storage.getItem('api-key', { biometricPrompt: 'Authenticate to access API key' })
 * if (result.success && result.data) {
 *   console.log('Got API key:', result.data)
 * }
 *
 * // Store a key pair
 * await storage.storeKeyPair('identity', { publicKey, privateKey })
 *
 * // Retrieve a key pair
 * const keyPair = await storage.retrieveKeyPair('identity')
 * ```
 */

// Types
export type {
  OperatingSystem,
  SecureStorageSecurityLevel,
  AccessControlPolicy,
  BiometricAuthType,
  SecureStorageSetOptions,
  SecureStorageGetOptions,
  SecureStorageItemMeta,
  SecureStorageResult,
  SecureStorageErrorCode,
  SecureStorageCapabilities,
  ISecureStorage,
  SecureStorageManagerOptions,
  iOSKeychainBridge,
  iOSKeychainOptions,
  AndroidKeystoreBridge,
  AndroidKeystoreOptions,
  DesktopKeychainBridge,
} from "./types";

// Error class
export { SecureStorageError, DEFAULT_SERVICE, MAX_ITEM_SIZE } from "./types";

// Platform-specific implementations
export {
  iOSKeychainStorage,
  createiOSKeychainStorage,
  isiOSKeychainAvailable,
} from "./keychain-ios";
export {
  AndroidKeystoreStorage,
  createAndroidKeystoreStorage,
  isAndroidKeystoreAvailable,
} from "./keystore-android";
export {
  macOSKeychainStorage,
  createmacOSKeychainStorage,
  ismacOSKeychainAvailable,
} from "./keychain-macos";
export {
  WindowsCredentialManagerStorage,
  createWindowsCredentialManagerStorage,
  isWindowsCredentialManagerAvailable,
} from "./credential-manager-windows";
export {
  EncryptedFallbackStorage,
  createEncryptedFallbackStorage,
  isEncryptedFallbackAvailable,
} from "./encrypted-fallback";

// Main exports
export {
  SecureStorageManager,
  getSecureStorage,
  resetSecureStorage,
  initializeSecureStorage,
  createSecureStorageManager,
  detectOperatingSystem,
} from "./secure-storage-manager";
