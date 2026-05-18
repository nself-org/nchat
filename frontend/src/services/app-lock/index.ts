/**
 * App Lock Service Module
 *
 * Provides high-level app lock functionality as a service.
 */

export {
  AppLockService,
  getAppLockService,
  resetAppLockService,
  initializeAppLockService,
  type AppLockServiceOptions,
  type SetupLockResult,
  type LockScreenMode,
} from "./app-lock.service";

// Re-export types from the core module for convenience
export type {
  LockPolicyMode,
  LockState,
  AuthMethod,
  BiometricType,
  Platform,
  IdleTimeoutConfig,
  LockSettings,
  LockStateInfo,
  BiometricInfo,
  AppLockState,
  LockResult,
  LockEventType,
  LockEvent,
  LockEventListener,
  PlatformCapabilities,
} from "@/lib/app-lock";
