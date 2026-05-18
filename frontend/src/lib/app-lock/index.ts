/**
 * App Lock Module
 *
 * Provides application lock functionality with PIN and biometric
 * authentication support across all platforms.
 *
 * @example
 * ```typescript
 * import {
 *   initializeAppLockManager,
 *   getAppLockManager
 * } from '@/lib/app-lock'
 *
 * // Initialize at app startup
 * const lockManager = await initializeAppLockManager()
 *
 * // Configure lock settings
 * await lockManager.updateSettings({
 *   mode: 'pin_or_biometric',
 *   idleTimeout: {
 *     enabled: true,
 *     timeoutMinutes: 5,
 *     warningSeconds: 30,
 *     resetEvents: ['keypress', 'mousemove', 'touchstart']
 *   }
 * })
 *
 * // Set a PIN
 * await lockManager.setPin('123456')
 *
 * // Check if locked
 * if (lockManager.isLocked()) {
 *   // Show lock screen
 * }
 *
 * // Unlock with PIN
 * const result = await lockManager.unlockWithPin('123456')
 * if (result.success) {
 *   // Continue to app
 * }
 *
 * // Or unlock with biometric
 * const bioResult = await lockManager.unlockWithBiometric('Authenticate to continue')
 * if (bioResult.success) {
 *   // Continue to app
 * }
 * ```
 */

// Types
export type {
  LockPolicyMode,
  LockState,
  AuthMethod,
  BiometricType,
  Platform,
  IdleTimeoutConfig,
  IdleResetEvent,
  LockOnLaunchConfig,
  DailyBiometricConfig,
  LockSettings,
  LockStateInfo,
  BiometricInfo,
  AppLockState,
  LockErrorCode,
  LockResult,
  LockEventType,
  LockEvent,
  LockEventListener,
  PlatformCapabilities,
} from "./types";

// Default values and constants
export {
  DEFAULT_IDLE_TIMEOUT_CONFIG,
  DEFAULT_LOCK_ON_LAUNCH_CONFIG,
  DEFAULT_DAILY_BIOMETRIC_CONFIG,
  DEFAULT_LOCK_SETTINGS,
  DEFAULT_LOCK_STATE_INFO,
  DEFAULT_BIOMETRIC_INFO,
  STORAGE_KEYS,
  SECURE_STORAGE_SERVICE,
} from "./types";

// PIN Authentication
export { PinAuth, getPinAuth, resetPinAuth, createPinAuth } from "./pin-auth";

// Biometric Authentication
export {
  BiometricAuth,
  getBiometricAuth,
  resetBiometricAuth,
  createBiometricAuth,
  detectPlatform,
} from "./biometric-auth";

// App Lock Manager
export {
  AppLockManager,
  getAppLockManager,
  resetAppLockManager,
  initializeAppLockManager,
  createAppLockManager,
} from "./app-lock-manager";
