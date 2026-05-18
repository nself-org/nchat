/**
 * App Lock Types
 *
 * Type definitions for the application lock system.
 * Supports PIN, biometric, and combined authentication modes.
 */

// ============================================================================
// Enums and Constants
// ============================================================================

/**
 * Lock policy modes
 */
export type LockPolicyMode =
  | "none" // No lock
  | "pin" // PIN only
  | "biometric" // Biometric only
  | "pin_or_biometric" // Either PIN or biometric
  | "pin_and_biometric"; // Both required (daily biometric + PIN on each unlock)

/**
 * Lock state
 */
export type LockState = "locked" | "unlocked" | "uninitialized";

/**
 * Authentication method used
 */
export type AuthMethod = "pin" | "biometric" | "none";

/**
 * Biometric type available on device
 */
export type BiometricType =
  | "faceId"
  | "touchId"
  | "fingerprint"
  | "face"
  | "iris"
  | "none";

/**
 * Platform type
 */
export type Platform =
  | "web"
  | "ios"
  | "android"
  | "macos"
  | "windows"
  | "linux"
  | "electron"
  | "tauri";

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Idle timeout configuration
 */
export interface IdleTimeoutConfig {
  /** Enable idle timeout lock */
  enabled: boolean;
  /** Timeout duration in minutes (1-60) */
  timeoutMinutes: number;
  /** Show warning before locking (seconds before lock) */
  warningSeconds: number;
  /** Events that reset the idle timer */
  resetEvents: IdleResetEvent[];
}

/**
 * Events that reset the idle timer
 */
export type IdleResetEvent =
  | "keypress"
  | "mousemove"
  | "mousedown"
  | "scroll"
  | "touchstart"
  | "visibilitychange";

/**
 * Lock on app launch configuration
 */
export interface LockOnLaunchConfig {
  /** Enable lock on app launch/resume */
  enabled: boolean;
  /** Only lock if app was in background for this long (seconds) */
  backgroundThresholdSeconds: number;
}

/**
 * Daily biometric configuration for pin_and_biometric mode
 */
export interface DailyBiometricConfig {
  /** Whether biometric was verified today */
  verifiedToday: boolean;
  /** Date of last verification (ISO string) */
  lastVerifiedDate: string | null;
  /** Require biometric again after this hour (0-23) */
  resetHour: number;
}

/**
 * Complete lock settings
 */
export interface LockSettings {
  /** Lock policy mode */
  mode: LockPolicyMode;
  /** Idle timeout configuration */
  idleTimeout: IdleTimeoutConfig;
  /** Lock on launch configuration */
  lockOnLaunch: LockOnLaunchConfig;
  /** Daily biometric config (for pin_and_biometric mode) */
  dailyBiometric: DailyBiometricConfig;
  /** Maximum PIN attempts before lockout */
  maxPinAttempts: number;
  /** Lockout duration in minutes after max attempts */
  lockoutMinutes: number;
  /** PIN length (4-8 digits) */
  pinLength: number;
  /** When settings were last updated */
  updatedAt: string;
}

// ============================================================================
// State Types
// ============================================================================

/**
 * Current lock state information
 */
export interface LockStateInfo {
  /** Current lock state */
  state: LockState;
  /** When the app was locked (ISO string) */
  lockedAt: string | null;
  /** When the app was last unlocked (ISO string) */
  unlockedAt: string | null;
  /** Last authentication method used */
  lastAuthMethod: AuthMethod;
  /** Failed PIN attempts count */
  failedAttempts: number;
  /** Lockout end time if in lockout (ISO string) */
  lockoutEndTime: string | null;
  /** Whether user is currently locked out */
  isLockedOut: boolean;
}

/**
 * Biometric availability info
 */
export interface BiometricInfo {
  /** Whether biometrics are available */
  available: boolean;
  /** Type of biometric available */
  type: BiometricType;
  /** Whether enrolled (has biometric data registered) */
  enrolled: boolean;
  /** Human-readable name for the biometric type */
  displayName: string;
}

/**
 * Full lock manager state
 */
export interface AppLockState {
  /** Whether the lock system is initialized */
  initialized: boolean;
  /** Current platform */
  platform: Platform;
  /** Lock settings */
  settings: LockSettings;
  /** Current lock state info */
  lockState: LockStateInfo;
  /** Biometric info */
  biometric: BiometricInfo;
  /** Whether a PIN is set */
  hasPinSet: boolean;
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Lock operation error codes
 */
export type LockErrorCode =
  | "NOT_INITIALIZED"
  | "ALREADY_LOCKED"
  | "ALREADY_UNLOCKED"
  | "INVALID_PIN"
  | "PIN_TOO_SHORT"
  | "PIN_TOO_LONG"
  | "PIN_NOT_SET"
  | "BIOMETRIC_FAILED"
  | "BIOMETRIC_CANCELLED"
  | "BIOMETRIC_NOT_AVAILABLE"
  | "BIOMETRIC_NOT_ENROLLED"
  | "LOCKED_OUT"
  | "STORAGE_ERROR"
  | "ENCRYPTION_ERROR"
  | "UNKNOWN_ERROR";

/**
 * Result of a lock operation
 */
export interface LockResult<T = void> {
  /** Whether the operation succeeded */
  success: boolean;
  /** Result data (if any) */
  data: T | null;
  /** Error message (if failed) */
  error: string | null;
  /** Error code (if failed) */
  errorCode: LockErrorCode | null;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Lock event types
 */
export type LockEventType =
  | "locked"
  | "unlocked"
  | "lock_failed"
  | "unlock_failed"
  | "lockout_started"
  | "lockout_ended"
  | "idle_warning"
  | "settings_changed"
  | "pin_changed"
  | "biometric_enrolled";

/**
 * Lock event payload
 */
export interface LockEvent {
  type: LockEventType;
  timestamp: string;
  data?: Record<string, unknown>;
}

/**
 * Lock event listener
 */
export type LockEventListener = (event: LockEvent) => void;

// ============================================================================
// Platform Capability Types
// ============================================================================

/**
 * Platform-specific capabilities
 */
export interface PlatformCapabilities {
  /** Platform identifier */
  platform: Platform;
  /** Supports PIN authentication */
  supportsPin: boolean;
  /** Supports biometric authentication */
  supportsBiometric: boolean;
  /** Available biometric types */
  biometricTypes: BiometricType[];
  /** Supports secure storage for PIN */
  supportsSecureStorage: boolean;
  /** Supports background detection */
  supportsBackgroundDetection: boolean;
  /** Supports idle detection */
  supportsIdleDetection: boolean;
}

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default idle timeout configuration
 */
export const DEFAULT_IDLE_TIMEOUT_CONFIG: IdleTimeoutConfig = {
  enabled: false,
  timeoutMinutes: 5,
  warningSeconds: 30,
  resetEvents: ["keypress", "mousemove", "mousedown", "scroll", "touchstart"],
};

/**
 * Default lock on launch configuration
 */
export const DEFAULT_LOCK_ON_LAUNCH_CONFIG: LockOnLaunchConfig = {
  enabled: true,
  backgroundThresholdSeconds: 60,
};

/**
 * Default daily biometric configuration
 */
export const DEFAULT_DAILY_BIOMETRIC_CONFIG: DailyBiometricConfig = {
  verifiedToday: false,
  lastVerifiedDate: null,
  resetHour: 4, // 4 AM
};

/**
 * Default lock settings
 */
export const DEFAULT_LOCK_SETTINGS: LockSettings = {
  mode: "none",
  idleTimeout: DEFAULT_IDLE_TIMEOUT_CONFIG,
  lockOnLaunch: DEFAULT_LOCK_ON_LAUNCH_CONFIG,
  dailyBiometric: DEFAULT_DAILY_BIOMETRIC_CONFIG,
  maxPinAttempts: 5,
  lockoutMinutes: 15,
  pinLength: 6,
  updatedAt: new Date().toISOString(),
};

/**
 * Default lock state info
 */
export const DEFAULT_LOCK_STATE_INFO: LockStateInfo = {
  state: "uninitialized",
  lockedAt: null,
  unlockedAt: null,
  lastAuthMethod: "none",
  failedAttempts: 0,
  lockoutEndTime: null,
  isLockedOut: false,
};

/**
 * Default biometric info
 */
export const DEFAULT_BIOMETRIC_INFO: BiometricInfo = {
  available: false,
  type: "none",
  enrolled: false,
  displayName: "Biometric",
};

// ============================================================================
// Storage Keys
// ============================================================================

/**
 * Storage keys for app lock data
 */
export const STORAGE_KEYS = {
  SETTINGS: "nchat_app_lock_settings",
  PIN_HASH: "nchat_app_lock_pin_hash",
  LOCK_STATE: "nchat_app_lock_state",
  DAILY_BIOMETRIC: "nchat_app_lock_daily_biometric",
} as const;

/**
 * Secure storage service identifier
 */
export const SECURE_STORAGE_SERVICE = "com.nchat.app-lock";
