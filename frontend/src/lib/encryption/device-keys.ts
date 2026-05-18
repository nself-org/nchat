/**
 * Multi-Device Key Management
 *
 * Manages cryptographic keys across multiple devices for a single user.
 * Each device has its own identity key and maintains separate sessions
 * with other users' devices. Messages are encrypted for all recipient devices.
 *
 * Key concepts:
 * - Device Identity: Each device has a unique device ID and key pair
 * - Device Linking: New devices are linked using a secure protocol
 * - Key Distribution: Messages are encrypted for all linked devices
 * - Session Management: Each device-device pair has its own session
 */

import type {
  IdentityKeyPair,
  DeviceInfo,
  DeviceSession,
  DeviceLinkRequest,
  PreKeyBundle,
} from "@/types/encryption";

import { EncryptionError, EncryptionErrorType } from "@/types/encryption";
import {
  generateKeyPair,
  generateRegistrationId,
  randomBytes,
  aesEncrypt,
  aesDecrypt,
  hkdfWithInfo,
  sha256,
  uint8ArrayToBase64,
  base64ToUint8Array,
  uint8ArrayToHex,
  hexToUint8Array,
  KeyPair,
} from "./crypto-primitives";
import { getIdentityManager } from "./identity";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Local device information with keys
 */
export interface LocalDevice {
  deviceId: string;
  deviceName: string;
  platform: DeviceInfo["platform"];
  identityKeyPair: IdentityKeyPair;
  registrationId: number;
  createdAt: number;
  lastSyncedAt: number;
}

/**
 * Remote device (linked to same account)
 */
export interface LinkedDevice {
  deviceId: string;
  deviceName: string;
  platform: DeviceInfo["platform"];
  identityPublicKey: Uint8Array;
  registrationId: number;
  lastSeen: Date;
  isCurrentDevice: boolean;
}

/**
 * Device link code data
 */
interface DeviceLinkCode {
  code: string;
  secret: Uint8Array;
  expiresAt: number;
  sourceDeviceId: string;
}

/**
 * Stored device data
 */
interface StoredDeviceData {
  deviceId: string;
  deviceName: string;
  platform: string;
  identityPublicKey: string; // base64
  identityPrivateKey: string; // base64
  registrationId: number;
  createdAt: number;
  lastSyncedAt: number;
}

/**
 * Stored linked device data
 */
interface StoredLinkedDevice {
  deviceId: string;
  deviceName: string;
  platform: string;
  identityPublicKey: string; // base64
  registrationId: number;
  lastSeen: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEVICE_STORAGE_KEY = "nchat_device_data";
const LINKED_DEVICES_KEY = "nchat_linked_devices";
const LINK_CODE_KEY = "nchat_link_code";
const LINK_CODE_EXPIRY = 5 * 60 * 1000; // 5 minutes
const LINK_CODE_LENGTH = 6;

// ============================================================================
// Device Key Manager
// ============================================================================

/**
 * Device Key Manager
 *
 * Manages device identity keys and handles device linking for
 * multi-device support.
 */
export class DeviceKeyManager {
  private static instance: DeviceKeyManager;
  private localDevice: LocalDevice | null = null;
  private linkedDevices: Map<string, LinkedDevice> = new Map();
  private pendingLinkCode: DeviceLinkCode | null = null;
  private initialized = false;

  private constructor() {}

  /**
   * Gets the singleton instance
   */
  static getInstance(): DeviceKeyManager {
    if (!DeviceKeyManager.instance) {
      DeviceKeyManager.instance = new DeviceKeyManager();
    }
    return DeviceKeyManager.instance;
  }

  /**
   * Initializes the device key manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load local device data
    const stored = this.loadDeviceData();
    if (stored) {
      this.localDevice = stored;
    } else {
      // Generate new device identity
      await this.generateDeviceIdentity();
    }

    // Load linked devices
    await this.loadLinkedDevices();

    this.initialized = true;
  }

  /**
   * Gets the local device information
   */
  async getLocalDevice(): Promise<LocalDevice> {
    await this.ensureInitialized();

    if (!this.localDevice) {
      throw new EncryptionError(
        EncryptionErrorType.KEY_NOT_FOUND,
        "Local device not initialized",
      );
    }

    return this.localDevice;
  }

  /**
   * Gets the local device ID
   */
  async getDeviceId(): Promise<string> {
    const device = await this.getLocalDevice();
    return device.deviceId;
  }

  /**
   * Gets the local device's identity key pair
   */
  async getDeviceIdentityKeyPair(): Promise<IdentityKeyPair> {
    const device = await this.getLocalDevice();
    return device.identityKeyPair;
  }

  /**
   * Gets all linked devices (including current)
   */
  async getLinkedDevices(): Promise<LinkedDevice[]> {
    await this.ensureInitialized();

    const devices: LinkedDevice[] = [];

    // Add current device
    if (this.localDevice) {
      devices.push({
        deviceId: this.localDevice.deviceId,
        deviceName: this.localDevice.deviceName,
        platform: this.localDevice.platform,
        identityPublicKey: this.localDevice.identityKeyPair.publicKey,
        registrationId: this.localDevice.registrationId,
        lastSeen: new Date(this.localDevice.lastSyncedAt),
        isCurrentDevice: true,
      });
    }

    // Add linked devices
    for (const device of this.linkedDevices.values()) {
      devices.push(device);
    }

    return devices;
  }

  /**
   * Updates the local device name
   */
  async updateDeviceName(name: string): Promise<void> {
    await this.ensureInitialized();

    if (!this.localDevice) {
      throw new EncryptionError(
        EncryptionErrorType.KEY_NOT_FOUND,
        "Local device not initialized",
      );
    }

    this.localDevice.deviceName = name;
    await this.saveDeviceData();
  }

  /**
   * Generates a device link code
   *
   * This code is displayed on the existing device and entered
   * or scanned on the new device.
   */
  async generateLinkCode(): Promise<DeviceLinkRequest> {
    await this.ensureInitialized();

    if (!this.localDevice) {
      throw new EncryptionError(
        EncryptionErrorType.KEY_NOT_FOUND,
        "Local device not initialized",
      );
    }

    // Generate a random code
    const codeBytes = randomBytes(LINK_CODE_LENGTH);
    const code = Array.from(codeBytes)
      .map((b) => (b % 10).toString())
      .join("");

    // Generate a secret for secure key transfer
    const secret = randomBytes(32);

    const expiresAt = Date.now() + LINK_CODE_EXPIRY;

    this.pendingLinkCode = {
      code,
      secret,
      expiresAt,
      sourceDeviceId: this.localDevice.deviceId,
    };

    // Store in memory (and optionally localStorage for persistence)
    this.saveLinkCode();

    // Create QR code data (code + secret, base64 encoded)
    const qrData = uint8ArrayToBase64(
      new TextEncoder().encode(
        JSON.stringify({
          code,
          secret: uint8ArrayToBase64(secret),
          deviceId: this.localDevice.deviceId,
          deviceName: this.localDevice.deviceName,
        }),
      ),
    );

    return {
      code,
      expiresAt: new Date(expiresAt),
      qrData,
      sourceDeviceId: this.localDevice.deviceId,
      sourceDeviceName: this.localDevice.deviceName,
      status: "pending",
    };
  }

  /**
   * Verifies a device link code from QR or manual entry
   *
   * @param code - The link code to verify
   * @returns Whether the code is valid
   */
  async verifyLinkCode(code: string): Promise<boolean> {
    // This would typically be verified by the server
    // For now, we check locally if we have a pending code
    if (!this.pendingLinkCode) return false;
    if (Date.now() > this.pendingLinkCode.expiresAt) return false;
    return this.pendingLinkCode.code === code;
  }

  /**
   * Completes device linking (on the new device)
   *
   * @param code - The link code
   * @param qrData - The QR code data (optional, for QR scan)
   * @returns The new device's identity
   */
  async completeLinking(code: string, qrData?: string): Promise<LocalDevice> {
    await this.ensureInitialized();

    let linkData: {
      code: string;
      secret: string;
      deviceId: string;
      deviceName: string;
    };

    if (qrData) {
      // Parse QR data
      try {
        const decoded = new TextDecoder().decode(base64ToUint8Array(qrData));
        linkData = JSON.parse(decoded);
      } catch {
        throw new EncryptionError(
          EncryptionErrorType.INVALID_MESSAGE,
          "Invalid QR code data",
        );
      }
    } else {
      // Manual code entry - would need to fetch secret from server
      throw new EncryptionError(
        EncryptionErrorType.NETWORK_ERROR,
        "Manual code entry requires server connection",
      );
    }

    // Verify the code matches
    if (linkData.code !== code) {
      throw new EncryptionError(
        EncryptionErrorType.INVALID_MESSAGE,
        "Link code mismatch",
      );
    }

    // Generate new device identity if not already initialized
    if (!this.localDevice) {
      await this.generateDeviceIdentity();
    }

    // The secret would be used to encrypt the identity key transfer
    // For this implementation, we just establish the link
    const secret = base64ToUint8Array(linkData.secret);

    // Add the source device as a linked device
    // In a real implementation, we would receive their identity key
    // through an encrypted channel using the shared secret

    return this.localDevice!;
  }

  /**
   * Accepts device linking (on the existing device)
   *
   * @param newDevicePublicKey - The new device's identity public key
   * @param newDeviceInfo - Information about the new device
   */
  async acceptDeviceLink(
    newDevicePublicKey: Uint8Array,
    newDeviceInfo: Partial<DeviceInfo>,
  ): Promise<void> {
    await this.ensureInitialized();

    if (!this.pendingLinkCode) {
      throw new EncryptionError(
        EncryptionErrorType.INVALID_MESSAGE,
        "No pending link request",
      );
    }

    if (Date.now() > this.pendingLinkCode.expiresAt) {
      this.pendingLinkCode = null;
      throw new EncryptionError(
        EncryptionErrorType.INVALID_MESSAGE,
        "Link code expired",
      );
    }

    const deviceId = this.generateDeviceId();

    const linkedDevice: LinkedDevice = {
      deviceId,
      deviceName: newDeviceInfo.deviceName || "Unknown Device",
      platform: newDeviceInfo.platform || "unknown",
      identityPublicKey: newDevicePublicKey,
      registrationId: 0, // Would be provided by new device
      lastSeen: new Date(),
      isCurrentDevice: false,
    };

    this.linkedDevices.set(deviceId, linkedDevice);
    await this.saveLinkedDevices();

    // Clear the pending link code
    this.pendingLinkCode = null;
    this.clearLinkCode();
  }

  /**
   * Cancels a pending device link
   */
  async cancelLink(): Promise<void> {
    this.pendingLinkCode = null;
    this.clearLinkCode();
  }

  /**
   * Removes a linked device
   *
   * @param deviceId - The device ID to remove
   */
  async unlinkDevice(deviceId: string): Promise<void> {
    await this.ensureInitialized();

    if (this.localDevice && deviceId === this.localDevice.deviceId) {
      throw new EncryptionError(
        EncryptionErrorType.INVALID_MESSAGE,
        "Cannot unlink current device",
      );
    }

    this.linkedDevices.delete(deviceId);
    await this.saveLinkedDevices();
  }

  /**
   * Gets the prekey bundle for all devices
   *
   * @param userId - The user ID
   * @returns Array of prekey bundles, one per device
   */
  async getAllDevicePreKeyBundles(userId: string): Promise<PreKeyBundle[]> {
    // This would typically fetch from the server
    // For now, return the local device's bundle
    await this.ensureInitialized();

    const bundles: PreKeyBundle[] = [];

    // Local device bundle would need signed prekey data
    // This is a placeholder structure
    if (this.localDevice) {
      // Would need to get from SignedPreKeyManager
    }

    return bundles;
  }

  /**
   * Updates the last seen timestamp for a device
   *
   * @param deviceId - The device ID
   */
  async updateDeviceLastSeen(deviceId: string): Promise<void> {
    await this.ensureInitialized();

    if (this.localDevice && deviceId === this.localDevice.deviceId) {
      this.localDevice.lastSyncedAt = Date.now();
      await this.saveDeviceData();
      return;
    }

    const device = this.linkedDevices.get(deviceId);
    if (device) {
      device.lastSeen = new Date();
      await this.saveLinkedDevices();
    }
  }

  /**
   * Clears all device data (dangerous!)
   */
  async clearAllDeviceData(): Promise<void> {
    this.localDevice = null;
    this.linkedDevices.clear();
    this.pendingLinkCode = null;
    this.initialized = false;

    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(DEVICE_STORAGE_KEY);
      localStorage.removeItem(LINKED_DEVICES_KEY);
      localStorage.removeItem(LINK_CODE_KEY);
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Ensures the manager is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Generates a new device identity
   */
  private async generateDeviceIdentity(): Promise<void> {
    const deviceId = this.generateDeviceId();
    const identityKeyPair = await generateKeyPair();
    const registrationId = generateRegistrationId();

    this.localDevice = {
      deviceId,
      deviceName: this.getDefaultDeviceName(),
      platform: this.detectPlatform(),
      identityKeyPair,
      registrationId,
      createdAt: Date.now(),
      lastSyncedAt: Date.now(),
    };

    await this.saveDeviceData();
  }

  /**
   * Generates a unique device ID
   */
  private generateDeviceId(): string {
    const bytes = randomBytes(16);
    return uint8ArrayToHex(bytes);
  }

  /**
   * Gets a default device name based on platform
   */
  private getDefaultDeviceName(): string {
    const platform = this.detectPlatform();

    switch (platform) {
      case "ios":
        return "iPhone";
      case "android":
        return "Android Device";
      case "desktop":
        return "Desktop";
      case "web":
        return "Web Browser";
      default:
        return "Unknown Device";
    }
  }

  /**
   * Detects the current platform
   */
  private detectPlatform(): DeviceInfo["platform"] {
    if (typeof window === "undefined") {
      return "unknown";
    }

    const userAgent = window.navigator.userAgent.toLowerCase();

    if (/iphone|ipad|ipod/.test(userAgent)) {
      return "ios";
    }
    if (/android/.test(userAgent)) {
      return "android";
    }
    if (/electron/.test(userAgent)) {
      return "desktop";
    }

    return "web";
  }

  /**
   * Loads device data from storage
   */
  private loadDeviceData(): LocalDevice | null {
    if (typeof localStorage === "undefined") return null;

    try {
      const stored = localStorage.getItem(DEVICE_STORAGE_KEY);
      if (!stored) return null;

      const parsed: StoredDeviceData = JSON.parse(stored);

      return {
        deviceId: parsed.deviceId,
        deviceName: parsed.deviceName,
        platform: parsed.platform as DeviceInfo["platform"],
        identityKeyPair: {
          publicKey: base64ToUint8Array(parsed.identityPublicKey),
          privateKey: base64ToUint8Array(parsed.identityPrivateKey),
        },
        registrationId: parsed.registrationId,
        createdAt: parsed.createdAt,
        lastSyncedAt: parsed.lastSyncedAt,
      };
    } catch (error) {
      logger.error("Failed to load device data:", error);
      return null;
    }
  }

  /**
   * Saves device data to storage
   */
  private async saveDeviceData(): Promise<void> {
    if (typeof localStorage === "undefined") return;
    if (!this.localDevice) return;

    const stored: StoredDeviceData = {
      deviceId: this.localDevice.deviceId,
      deviceName: this.localDevice.deviceName,
      platform: this.localDevice.platform,
      identityPublicKey: uint8ArrayToBase64(
        this.localDevice.identityKeyPair.publicKey,
      ),
      identityPrivateKey: uint8ArrayToBase64(
        this.localDevice.identityKeyPair.privateKey,
      ),
      registrationId: this.localDevice.registrationId,
      createdAt: this.localDevice.createdAt,
      lastSyncedAt: this.localDevice.lastSyncedAt,
    };

    localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(stored));
  }

  /**
   * Loads linked devices from storage
   */
  private async loadLinkedDevices(): Promise<void> {
    if (typeof localStorage === "undefined") return;

    try {
      const stored = localStorage.getItem(LINKED_DEVICES_KEY);
      if (!stored) return;

      const devices: StoredLinkedDevice[] = JSON.parse(stored);

      for (const device of devices) {
        this.linkedDevices.set(device.deviceId, {
          deviceId: device.deviceId,
          deviceName: device.deviceName,
          platform: device.platform as DeviceInfo["platform"],
          identityPublicKey: base64ToUint8Array(device.identityPublicKey),
          registrationId: device.registrationId,
          lastSeen: new Date(device.lastSeen),
          isCurrentDevice: false,
        });
      }
    } catch (error) {
      logger.error("Failed to load linked devices:", error);
    }
  }

  /**
   * Saves linked devices to storage
   */
  private async saveLinkedDevices(): Promise<void> {
    if (typeof localStorage === "undefined") return;

    const devices: StoredLinkedDevice[] = [];

    for (const device of this.linkedDevices.values()) {
      devices.push({
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        platform: device.platform,
        identityPublicKey: uint8ArrayToBase64(device.identityPublicKey),
        registrationId: device.registrationId,
        lastSeen: device.lastSeen.getTime(),
      });
    }

    localStorage.setItem(LINKED_DEVICES_KEY, JSON.stringify(devices));
  }

  /**
   * Saves the pending link code
   */
  private saveLinkCode(): void {
    if (typeof localStorage === "undefined") return;
    if (!this.pendingLinkCode) return;

    const stored = {
      code: this.pendingLinkCode.code,
      secret: uint8ArrayToBase64(this.pendingLinkCode.secret),
      expiresAt: this.pendingLinkCode.expiresAt,
      sourceDeviceId: this.pendingLinkCode.sourceDeviceId,
    };

    localStorage.setItem(LINK_CODE_KEY, JSON.stringify(stored));
  }

  /**
   * Clears the pending link code
   */
  private clearLinkCode(): void {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(LINK_CODE_KEY);
    }
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Gets the global device key manager instance
 */
export function getDeviceKeyManager(): DeviceKeyManager {
  return DeviceKeyManager.getInstance();
}

/**
 * Gets the local device ID
 */
export async function getLocalDeviceId(): Promise<string> {
  return getDeviceKeyManager().getDeviceId();
}

/**
 * Gets all linked devices
 */
export async function getLinkedDevices(): Promise<LinkedDevice[]> {
  return getDeviceKeyManager().getLinkedDevices();
}

/**
 * Generates a device link code
 */
export async function generateDeviceLinkCode(): Promise<DeviceLinkRequest> {
  return getDeviceKeyManager().generateLinkCode();
}

/**
 * Verifies a device link code
 */
export async function verifyDeviceLinkCode(code: string): Promise<boolean> {
  return getDeviceKeyManager().verifyLinkCode(code);
}

/**
 * Removes a linked device
 */
export async function unlinkDevice(deviceId: string): Promise<void> {
  return getDeviceKeyManager().unlinkDevice(deviceId);
}
