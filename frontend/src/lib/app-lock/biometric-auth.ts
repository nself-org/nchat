/**
 * Biometric Authentication Module
 *
 * Handles biometric authentication across different platforms.
 * Integrates with platform-specific biometric APIs and the secure
 * storage module.
 */

import {
  getSecureStorage,
  type ISecureStorage,
  type BiometricAuthType,
} from "@/lib/secure-storage";
import { logger } from "@/lib/logger";
import {
  type LockResult,
  type BiometricInfo,
  type BiometricType,
  type Platform,
  DEFAULT_BIOMETRIC_INFO,
} from "./types";

// ============================================================================
// Constants
// ============================================================================

const LOG_PREFIX = "[BiometricAuth]";

/**
 * Map secure storage biometric types to app lock biometric types
 */
const BIOMETRIC_TYPE_MAP: Record<BiometricAuthType, BiometricType> = {
  faceId: "faceId",
  touchId: "touchId",
  fingerprint: "fingerprint",
  face: "face",
  iris: "iris",
  none: "none",
};

/**
 * Human-readable names for biometric types
 */
const BIOMETRIC_DISPLAY_NAMES: Record<BiometricType, string> = {
  faceId: "Face ID",
  touchId: "Touch ID",
  fingerprint: "Fingerprint",
  face: "Face Recognition",
  iris: "Iris Scanner",
  none: "Biometric",
};

// ============================================================================
// Platform Detection
// ============================================================================

/**
 * Detect the current platform for biometric capability assessment
 */
export function detectPlatform(): Platform {
  if (typeof globalThis === "undefined" || typeof window === "undefined") {
    return "web";
  }

  // Check for Capacitor (iOS/Android)
  const windowWithCapacitor = globalThis as unknown as {
    Capacitor?: { platform?: string };
  };

  if (windowWithCapacitor.Capacitor?.platform === "ios") {
    return "ios";
  }
  if (windowWithCapacitor.Capacitor?.platform === "android") {
    return "android";
  }

  // Check for Electron
  const windowWithElectron = globalThis as unknown as {
    electron?: unknown;
    process?: { platform?: string };
  };

  if (windowWithElectron.electron && windowWithElectron.process?.platform) {
    switch (windowWithElectron.process.platform) {
      case "darwin":
        return "macos";
      case "win32":
        return "windows";
      case "linux":
        return "linux";
    }
  }

  // Check for Tauri
  const windowWithTauri = globalThis as unknown as {
    __TAURI__?: unknown;
  };

  if (windowWithTauri.__TAURI__) {
    return "tauri";
  }

  return "web";
}

// ============================================================================
// Web Credential API Support
// ============================================================================

/**
 * Check if Web Authentication API (WebAuthn) is available
 */
function isWebAuthnAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined" &&
    typeof window.PublicKeyCredential
      .isUserVerifyingPlatformAuthenticatorAvailable === "function"
  );
}

/**
 * Check if platform authenticator with user verification is available (WebAuthn)
 */
async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnAvailable()) {
    return false;
  }

  try {
    const available =
      await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return available;
  } catch {
    return false;
  }
}

// ============================================================================
// Biometric Authentication Class
// ============================================================================

/**
 * Biometric Authentication Manager
 *
 * Handles biometric authentication across platforms:
 * - iOS: Face ID, Touch ID via Capacitor plugin
 * - Android: Fingerprint, Face via Capacitor plugin
 * - macOS: Touch ID via Electron/Tauri
 * - Windows: Windows Hello via Electron/Tauri
 * - Web: WebAuthn platform authenticator
 */
export class BiometricAuth {
  private storage: ISecureStorage;
  private platform: Platform;
  private biometricInfo: BiometricInfo = { ...DEFAULT_BIOMETRIC_INFO };
  private initialized = false;

  constructor(storage?: ISecureStorage) {
    this.storage = storage || getSecureStorage();
    this.platform = detectPlatform();
  }

  /**
   * Initialize the biometric auth module
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (!this.storage.isInitialized()) {
      await this.storage.initialize();
    }

    // Get biometric info from storage
    await this.updateBiometricInfo();

    this.initialized = true;
    logger.info(`${LOG_PREFIX} Initialized`, {
      platform: this.platform,
      biometricAvailable: this.biometricInfo.available,
      biometricType: this.biometricInfo.type,
    });
  }

  /**
   * Get current biometric info
   */
  getBiometricInfo(): BiometricInfo {
    return { ...this.biometricInfo };
  }

  /**
   * Check if biometrics are available
   */
  async isAvailable(): Promise<boolean> {
    await this.ensureInitialized();
    return this.biometricInfo.available;
  }

  /**
   * Check if biometrics are enrolled (user has registered biometric data)
   */
  async isEnrolled(): Promise<boolean> {
    await this.ensureInitialized();
    return this.biometricInfo.enrolled;
  }

  /**
   * Get the type of biometric available
   */
  async getType(): Promise<BiometricType> {
    await this.ensureInitialized();
    return this.biometricInfo.type;
  }

  /**
   * Authenticate using biometrics
   */
  async authenticate(
    reason: string = "Authenticate to continue",
  ): Promise<LockResult> {
    await this.ensureInitialized();

    if (!this.biometricInfo.available) {
      return {
        success: false,
        data: null,
        error: "Biometric authentication is not available",
        errorCode: "BIOMETRIC_NOT_AVAILABLE",
      };
    }

    if (!this.biometricInfo.enrolled) {
      return {
        success: false,
        data: null,
        error: "Biometric authentication is not enrolled",
        errorCode: "BIOMETRIC_NOT_ENROLLED",
      };
    }

    try {
      // Try platform-specific authentication
      const result = await this.performPlatformAuthentication(reason);

      if (result.success) {
        logger.info(`${LOG_PREFIX} Authentication successful`, {
          platform: this.platform,
          type: this.biometricInfo.type,
        });
      } else {
        logger.warn(`${LOG_PREFIX} Authentication failed`, {
          platform: this.platform,
          error: result.error,
        });
      }

      return result;
    } catch (error) {
      logger.error(
        `${LOG_PREFIX} Authentication error`,
        error instanceof Error ? error : new Error(String(error)),
      );

      // Check for user cancellation
      if (
        error instanceof Error &&
        (error.message.includes("cancel") ||
          error.message.includes("Cancel") ||
          error.name === "AbortError")
      ) {
        return {
          success: false,
          data: null,
          error: "Authentication cancelled",
          errorCode: "BIOMETRIC_CANCELLED",
        };
      }

      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        errorCode: "BIOMETRIC_FAILED",
      };
    }
  }

  /**
   * Refresh biometric info (useful after device changes)
   */
  async refresh(): Promise<BiometricInfo> {
    await this.ensureInitialized();
    await this.updateBiometricInfo();
    return this.getBiometricInfo();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Ensure the module is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Update biometric info from platform
   */
  private async updateBiometricInfo(): Promise<void> {
    try {
      // Check storage capabilities first
      const storageAvailable = await this.storage.isBiometricAvailable();
      const capabilities = await this.storage.getCapabilities();

      if (storageAvailable && capabilities.biometricTypes.length > 0) {
        const primaryType = capabilities.biometricTypes[0] as BiometricAuthType;
        const mappedType = BIOMETRIC_TYPE_MAP[primaryType] || "none";

        this.biometricInfo = {
          available: true,
          type: mappedType,
          enrolled: capabilities.biometricAuth,
          displayName: BIOMETRIC_DISPLAY_NAMES[mappedType],
        };
        return;
      }

      // Fallback to platform-specific checks
      await this.updateBiometricInfoFromPlatform();
    } catch (error) {
      logger.warn(`${LOG_PREFIX} Failed to get biometric info`, { error });
      this.biometricInfo = { ...DEFAULT_BIOMETRIC_INFO };
    }
  }

  /**
   * Update biometric info from platform-specific APIs
   */
  private async updateBiometricInfoFromPlatform(): Promise<void> {
    switch (this.platform) {
      case "ios":
        await this.updateBiometricInfoIOS();
        break;
      case "android":
        await this.updateBiometricInfoAndroid();
        break;
      case "macos":
        await this.updateBiometricInfoMacOS();
        break;
      case "windows":
        await this.updateBiometricInfoWindows();
        break;
      case "web":
        await this.updateBiometricInfoWeb();
        break;
      default:
        this.biometricInfo = { ...DEFAULT_BIOMETRIC_INFO };
    }
  }

  /**
   * Update biometric info for iOS
   */
  private async updateBiometricInfoIOS(): Promise<void> {
    try {
      const windowWithCapacitor = globalThis as unknown as {
        Capacitor?: {
          Plugins?: {
            BiometricAuth?: {
              checkBiometry(): Promise<{
                isAvailable: boolean;
                biometryType: string;
              }>;
            };
          };
        };
      };

      const plugin = windowWithCapacitor.Capacitor?.Plugins?.BiometricAuth;
      if (plugin) {
        const result = await plugin.checkBiometry();
        const type = result.biometryType === "faceId" ? "faceId" : "touchId";
        this.biometricInfo = {
          available: result.isAvailable,
          type,
          enrolled: result.isAvailable,
          displayName: BIOMETRIC_DISPLAY_NAMES[type],
        };
      } else {
        // Assume iOS device has some biometric
        this.biometricInfo = {
          available: true,
          type: "touchId",
          enrolled: true,
          displayName: BIOMETRIC_DISPLAY_NAMES.touchId,
        };
      }
    } catch {
      this.biometricInfo = { ...DEFAULT_BIOMETRIC_INFO };
    }
  }

  /**
   * Update biometric info for Android
   */
  private async updateBiometricInfoAndroid(): Promise<void> {
    try {
      const windowWithCapacitor = globalThis as unknown as {
        Capacitor?: {
          Plugins?: {
            BiometricAuth?: {
              checkBiometry(): Promise<{
                isAvailable: boolean;
                biometryType: string;
              }>;
            };
          };
        };
      };

      const plugin = windowWithCapacitor.Capacitor?.Plugins?.BiometricAuth;
      if (plugin) {
        const result = await plugin.checkBiometry();
        const type = result.biometryType === "face" ? "face" : "fingerprint";
        this.biometricInfo = {
          available: result.isAvailable,
          type,
          enrolled: result.isAvailable,
          displayName: BIOMETRIC_DISPLAY_NAMES[type],
        };
      } else {
        // Assume Android device has fingerprint
        this.biometricInfo = {
          available: true,
          type: "fingerprint",
          enrolled: true,
          displayName: BIOMETRIC_DISPLAY_NAMES.fingerprint,
        };
      }
    } catch {
      this.biometricInfo = { ...DEFAULT_BIOMETRIC_INFO };
    }
  }

  /**
   * Update biometric info for macOS
   */
  private async updateBiometricInfoMacOS(): Promise<void> {
    try {
      const windowWithElectron = globalThis as unknown as {
        electron?: {
          systemPreferences?: {
            canPromptTouchID(): boolean;
          };
        };
      };

      if (windowWithElectron.electron?.systemPreferences?.canPromptTouchID()) {
        this.biometricInfo = {
          available: true,
          type: "touchId",
          enrolled: true,
          displayName: BIOMETRIC_DISPLAY_NAMES.touchId,
        };
      } else {
        this.biometricInfo = { ...DEFAULT_BIOMETRIC_INFO };
      }
    } catch {
      this.biometricInfo = { ...DEFAULT_BIOMETRIC_INFO };
    }
  }

  /**
   * Update biometric info for Windows
   */
  private async updateBiometricInfoWindows(): Promise<void> {
    try {
      // Windows Hello support via WebAuthn or Electron
      const available = await isPlatformAuthenticatorAvailable();
      if (available) {
        this.biometricInfo = {
          available: true,
          type: "fingerprint", // Windows Hello can be fingerprint or face
          enrolled: true,
          displayName: "Windows Hello",
        };
      } else {
        this.biometricInfo = { ...DEFAULT_BIOMETRIC_INFO };
      }
    } catch {
      this.biometricInfo = { ...DEFAULT_BIOMETRIC_INFO };
    }
  }

  /**
   * Update biometric info for Web
   */
  private async updateBiometricInfoWeb(): Promise<void> {
    try {
      const available = await isPlatformAuthenticatorAvailable();
      if (available) {
        this.biometricInfo = {
          available: true,
          type: "fingerprint", // Generic type for web
          enrolled: true,
          displayName: "Platform Authenticator",
        };
      } else {
        this.biometricInfo = { ...DEFAULT_BIOMETRIC_INFO };
      }
    } catch {
      this.biometricInfo = { ...DEFAULT_BIOMETRIC_INFO };
    }
  }

  /**
   * Perform platform-specific authentication
   */
  private async performPlatformAuthentication(
    reason: string,
  ): Promise<LockResult> {
    // First try the secure storage authentication
    try {
      const result = await this.storage.authenticateBiometric(reason);
      if (result.success) {
        return {
          success: true,
          data: null,
          error: null,
          errorCode: null,
        };
      }
    } catch {
      // Fall through to platform-specific methods
    }

    // Platform-specific fallbacks
    switch (this.platform) {
      case "ios":
      case "android":
        return this.authenticateMobile(reason);
      case "macos":
        return this.authenticateMacOS(reason);
      case "windows":
      case "web":
        return this.authenticateWebAuthn(reason);
      default:
        return {
          success: false,
          data: null,
          error: "Biometric authentication not supported on this platform",
          errorCode: "BIOMETRIC_NOT_AVAILABLE",
        };
    }
  }

  /**
   * Authenticate on mobile (iOS/Android) via Capacitor
   */
  private async authenticateMobile(reason: string): Promise<LockResult> {
    const windowWithCapacitor = globalThis as unknown as {
      Capacitor?: {
        Plugins?: {
          BiometricAuth?: {
            authenticate(options: {
              reason: string;
            }): Promise<{ verified: boolean }>;
          };
        };
      };
    };

    const plugin = windowWithCapacitor.Capacitor?.Plugins?.BiometricAuth;
    if (!plugin) {
      return {
        success: false,
        data: null,
        error: "Biometric plugin not available",
        errorCode: "BIOMETRIC_NOT_AVAILABLE",
      };
    }

    try {
      const result = await plugin.authenticate({ reason });
      return {
        success: result.verified,
        data: null,
        error: result.verified ? null : "Authentication failed",
        errorCode: result.verified ? null : "BIOMETRIC_FAILED",
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("cancel")) {
        return {
          success: false,
          data: null,
          error: "Authentication cancelled",
          errorCode: "BIOMETRIC_CANCELLED",
        };
      }
      throw error;
    }
  }

  /**
   * Authenticate on macOS via Electron Touch ID
   */
  private async authenticateMacOS(reason: string): Promise<LockResult> {
    const windowWithElectron = globalThis as unknown as {
      electron?: {
        systemPreferences?: {
          promptTouchID(reason: string): Promise<void>;
        };
      };
    };

    if (!windowWithElectron.electron?.systemPreferences?.promptTouchID) {
      return {
        success: false,
        data: null,
        error: "Touch ID not available",
        errorCode: "BIOMETRIC_NOT_AVAILABLE",
      };
    }

    try {
      await windowWithElectron.electron.systemPreferences.promptTouchID(reason);
      return {
        success: true,
        data: null,
        error: null,
        errorCode: null,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("cancel")) {
        return {
          success: false,
          data: null,
          error: "Authentication cancelled",
          errorCode: "BIOMETRIC_CANCELLED",
        };
      }
      throw error;
    }
  }

  /**
   * Authenticate via WebAuthn (Web/Windows)
   */
  private async authenticateWebAuthn(_reason: string): Promise<LockResult> {
    if (!isWebAuthnAvailable()) {
      return {
        success: false,
        data: null,
        error: "WebAuthn not available",
        errorCode: "BIOMETRIC_NOT_AVAILABLE",
      };
    }

    try {
      // Create a challenge for the authenticator
      const challenge = new Uint8Array(32);
      if (
        typeof globalThis.crypto !== "undefined" &&
        globalThis.crypto.getRandomValues
      ) {
        globalThis.crypto.getRandomValues(challenge);
      }

      // Request user verification from platform authenticator
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: "required",
          allowCredentials: [],
          rpId: window.location.hostname,
        },
      });

      if (credential) {
        return {
          success: true,
          data: null,
          error: null,
          errorCode: null,
        };
      }

      return {
        success: false,
        data: null,
        error: "Authentication failed",
        errorCode: "BIOMETRIC_FAILED",
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return {
          success: false,
          data: null,
          error: "Authentication cancelled",
          errorCode: "BIOMETRIC_CANCELLED",
        };
      }
      throw error;
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

let biometricAuthInstance: BiometricAuth | null = null;

/**
 * Get the singleton BiometricAuth instance
 */
export function getBiometricAuth(storage?: ISecureStorage): BiometricAuth {
  if (!biometricAuthInstance) {
    biometricAuthInstance = new BiometricAuth(storage);
  }
  return biometricAuthInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetBiometricAuth(): void {
  biometricAuthInstance = null;
}

/**
 * Create a new BiometricAuth instance
 */
export function createBiometricAuth(storage?: ISecureStorage): BiometricAuth {
  return new BiometricAuth(storage);
}
