/**
 * Device Verification - Device trust and verification system
 *
 * Handles device fingerprinting, QR code verification data generation,
 * safety number comparison, and device trust management.
 */

import {
  getKeyFingerprint,
  compareFingerprints,
  exportKey,
} from "./key-manager";

// ============================================================================
// Types
// ============================================================================

export type TrustLevel = "untrusted" | "tofu" | "verified" | "blocked";

export interface Device {
  /** Unique device identifier */
  id: string;
  /** User-friendly device name */
  name: string;
  /** Device type (desktop, mobile, tablet, web) */
  type: "desktop" | "mobile" | "tablet" | "web" | "unknown";
  /** Operating system */
  os: string;
  /** Browser or app name */
  browser: string;
  /** Public key fingerprint */
  fingerprint: string;
  /** Current trust level */
  trustLevel: TrustLevel;
  /** When the device was first seen */
  firstSeenAt: Date;
  /** When the device was last active */
  lastActiveAt: Date;
  /** When the device was verified (if applicable) */
  verifiedAt: Date | null;
  /** Who verified this device (user ID) */
  verifiedBy: string | null;
  /** Public key in JWK format */
  publicKey: JsonWebKey;
}

export interface DeviceInfo {
  /** Device type */
  type: "desktop" | "mobile" | "tablet" | "web" | "unknown";
  /** Operating system name */
  os: string;
  /** Browser/app name */
  browser: string;
  /** User agent string */
  userAgent: string;
}

export interface SafetyNumber {
  /** The safety number as a formatted string */
  displayNumber: string;
  /** Raw bytes of the safety number */
  rawBytes: Uint8Array;
  /** Timestamp when generated */
  generatedAt: Date;
  /** Version of the safety number format */
  version: number;
}

export interface QRVerificationData {
  /** Device ID to verify */
  deviceId: string;
  /** Public key fingerprint */
  fingerprint: string;
  /** Timestamp for freshness check */
  timestamp: number;
  /** User ID who owns this device */
  userId: string;
  /** Version of the QR format */
  version: number;
  /** Signature for authenticity (optional) */
  signature?: string;
}

export interface VerificationResult {
  /** Whether verification was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** The verified device info */
  device?: Device;
  /** Timestamp of verification */
  verifiedAt: Date;
}

// ============================================================================
// Constants
// ============================================================================

const SAFETY_NUMBER_VERSION = 1;
const QR_DATA_VERSION = 1;
const SAFETY_NUMBER_LENGTH = 60; // 60 digits total
const SAFETY_NUMBER_GROUP_SIZE = 5;

// ============================================================================
// Device Detection
// ============================================================================

/**
 * Detects the current device type from user agent
 */
export function detectDeviceType(
  userAgent: string,
): "desktop" | "mobile" | "tablet" | "web" | "unknown" {
  const ua = userAgent.toLowerCase();

  // Check for tablets first (before mobile)
  if (/ipad|tablet|playbook|silk|(android(?!.*mobi))/i.test(ua)) {
    return "tablet";
  }

  // Check for mobile devices
  if (
    /mobile|iphone|ipod|android.*mobile|windows phone|blackberry|opera mini|iemobile/i.test(
      ua,
    )
  ) {
    return "mobile";
  }

  // Check for desktop indicators
  if (/windows nt|macintosh|mac os x|linux/i.test(ua)) {
    return "desktop";
  }

  // Default to web for browser-based access
  if (/mozilla|chrome|safari|firefox|edge|opera/i.test(ua)) {
    return "web";
  }

  return "unknown";
}

/**
 * Detects the operating system from user agent
 */
export function detectOS(userAgent: string): string {
  const ua = userAgent.toLowerCase();

  if (/windows nt 10/i.test(ua)) return "Windows 10/11";
  if (/windows nt 6\.3/i.test(ua)) return "Windows 8.1";
  if (/windows nt 6\.2/i.test(ua)) return "Windows 8";
  if (/windows nt 6\.1/i.test(ua)) return "Windows 7";
  if (/windows/i.test(ua)) return "Windows";

  // Check for iOS/iPadOS BEFORE macOS (iOS user agents contain "Mac OS X")
  if (/iphone os (\d+)[._]\d+/i.test(ua)) {
    const match = ua.match(/iphone os (\d+)[._]\d+/i);
    if (match) return `iOS ${match[1]}`;
  }
  if (/iphone/i.test(ua)) return "iOS";

  if (/ipad.*cpu os (\d+)[._]\d+/i.test(ua)) {
    const match = ua.match(/cpu os (\d+)[._]\d+/i);
    if (match) return `iPadOS ${match[1]}`;
  }
  if (/ipad|ipod/i.test(ua)) return "iOS";

  // Now check for macOS (after iOS/iPadOS)
  if (/mac os x 10[._](\d+)/i.test(ua)) {
    const match = ua.match(/mac os x 10[._](\d+)/i);
    if (match) return `macOS 10.${match[1]}`;
  }
  if (/macintosh|mac os x/i.test(ua)) return "macOS";

  if (/android (\d+(\.\d+)?)/i.test(ua)) {
    const match = ua.match(/android (\d+(\.\d+)?)/i);
    if (match) return `Android ${match[1]}`;
  }
  if (/android/i.test(ua)) return "Android";

  if (/linux/i.test(ua)) return "Linux";
  if (/chromeos|cros/i.test(ua)) return "Chrome OS";

  return "Unknown OS";
}

/**
 * Detects the browser from user agent
 */
export function detectBrowser(userAgent: string): string {
  const ua = userAgent.toLowerCase();

  // Order matters - more specific patterns first
  if (/edg\//i.test(ua)) return "Microsoft Edge";
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return "Opera";
  if (/chrome/i.test(ua) && !/edg/i.test(ua)) return "Chrome";
  if (/firefox/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return "Safari";
  if (/msie|trident/i.test(ua)) return "Internet Explorer";

  return "Unknown Browser";
}

/**
 * Gets the current device information
 */
export function getCurrentDeviceInfo(): DeviceInfo {
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";

  return {
    type: detectDeviceType(userAgent),
    os: detectOS(userAgent),
    browser: detectBrowser(userAgent),
    userAgent,
  };
}

/**
 * Generates a unique device fingerprint based on browser characteristics
 */
export async function generateDeviceFingerprint(): Promise<string> {
  const components: string[] = [];

  if (typeof navigator !== "undefined") {
    components.push(navigator.userAgent);
    components.push(navigator.language);
    components.push(String(navigator.hardwareConcurrency || 0));
    components.push(String(navigator.maxTouchPoints || 0));
  }

  if (typeof screen !== "undefined") {
    components.push(`${screen.width}x${screen.height}`);
    components.push(String(screen.colorDepth));
  }

  // Add timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

  const fingerprint = components.join("|");
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprint);

  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ============================================================================
// Safety Number Generation
// ============================================================================

/**
 * Generates a safety number from two public keys
 * The safety number is deterministic and bidirectional
 */
export async function generateSafetyNumber(
  ownPublicKey: CryptoKey,
  peerPublicKey: CryptoKey,
  ownUserId: string,
  peerUserId: string,
): Promise<SafetyNumber> {
  // Export both keys
  const ownKeyData = await exportKey(ownPublicKey);
  const peerKeyData = await exportKey(peerPublicKey);

  // Sort by user ID to ensure consistent ordering
  const [firstKey, secondKey, firstId, secondId] =
    ownUserId < peerUserId
      ? [ownKeyData, peerKeyData, ownUserId, peerUserId]
      : [peerKeyData, ownKeyData, peerUserId, ownUserId];

  // Combine key data for hashing
  const combined = JSON.stringify({
    key1: firstKey,
    key2: secondKey,
    id1: firstId,
    id2: secondId,
    version: SAFETY_NUMBER_VERSION,
  });

  const encoder = new TextEncoder();
  const data = encoder.encode(combined);

  // Hash the combined data multiple times for security
  let hashBuffer = await crypto.subtle.digest("SHA-512", data);
  for (let i = 0; i < 5200; i++) {
    hashBuffer = await crypto.subtle.digest("SHA-512", hashBuffer);
  }

  const rawBytes = new Uint8Array(hashBuffer.slice(0, 30)); // 30 bytes = 60 digits

  // Convert to decimal digits
  const digits: string[] = [];
  for (let i = 0; i < rawBytes.length; i++) {
    // Each byte becomes 2 digits (00-99, mod 100)
    digits.push(String(rawBytes[i] % 100).padStart(2, "0"));
  }

  // Format as groups of 5 digits
  const displayNumber = digits
    .join("")
    .match(new RegExp(`.{1,${SAFETY_NUMBER_GROUP_SIZE}}`, "g"))!
    .join(" ");

  return {
    displayNumber,
    rawBytes,
    generatedAt: new Date(),
    version: SAFETY_NUMBER_VERSION,
  };
}

/**
 * Compares two safety numbers
 */
export function compareSafetyNumbers(
  num1: SafetyNumber,
  num2: SafetyNumber,
): boolean {
  if (num1.version !== num2.version) return false;

  const clean1 = num1.displayNumber.replace(/\s/g, "");
  const clean2 = num2.displayNumber.replace(/\s/g, "");

  return clean1 === clean2;
}

/**
 * Validates a safety number format
 */
export function validateSafetyNumber(safetyNumber: string): boolean {
  const cleaned = safetyNumber.replace(/\s/g, "");
  return /^\d{60}$/.test(cleaned);
}

// ============================================================================
// QR Code Verification
// ============================================================================

/**
 * Generates QR verification data for scanning
 */
export function generateQRVerificationData(
  deviceId: string,
  fingerprint: string,
  userId: string,
  signature?: string,
): QRVerificationData {
  return {
    deviceId,
    fingerprint,
    timestamp: Date.now(),
    userId,
    version: QR_DATA_VERSION,
    signature,
  };
}

/**
 * Encodes QR verification data as a string for QR code generation
 */
export function encodeQRVerificationData(data: QRVerificationData): string {
  const json = JSON.stringify(data);
  // Use base64 encoding for QR compatibility
  if (typeof btoa !== "undefined") {
    return btoa(json);
  }
  return Buffer.from(json).toString("base64");
}

/**
 * Decodes QR verification data from a scanned string
 */
export function decodeQRVerificationData(
  encoded: string,
): QRVerificationData | null {
  try {
    let json: string;
    if (typeof atob !== "undefined") {
      json = atob(encoded);
    } else {
      json = Buffer.from(encoded, "base64").toString("utf8");
    }

    const data = JSON.parse(json) as QRVerificationData;

    // Validate required fields
    if (
      typeof data.deviceId !== "string" ||
      typeof data.fingerprint !== "string" ||
      typeof data.timestamp !== "number" ||
      typeof data.userId !== "string" ||
      typeof data.version !== "number"
    ) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Validates QR verification data freshness and format
 */
export function validateQRVerificationData(
  data: QRVerificationData,
  maxAgeMs: number = 5 * 60 * 1000, // 5 minutes default
): { valid: boolean; error?: string } {
  // Check version
  if (data.version > QR_DATA_VERSION) {
    return { valid: false, error: "Unsupported QR code version" };
  }

  // Check timestamp freshness
  const age = Date.now() - data.timestamp;
  if (age > maxAgeMs) {
    return { valid: false, error: "QR code has expired" };
  }

  if (age < 0) {
    return { valid: false, error: "QR code timestamp is in the future" };
  }

  // Validate fingerprint format
  if (!/^[0-9A-Fa-f\s]+$/.test(data.fingerprint)) {
    return { valid: false, error: "Invalid fingerprint format" };
  }

  return { valid: true };
}

// ============================================================================
// Device Trust Management
// ============================================================================

/**
 * Creates a new device record
 */
export function createDevice(
  id: string,
  publicKey: JsonWebKey,
  fingerprint: string,
  name?: string,
): Device {
  const info = getCurrentDeviceInfo();

  return {
    id,
    name: name || `${info.browser} on ${info.os}`,
    type: info.type,
    os: info.os,
    browser: info.browser,
    fingerprint,
    trustLevel: "tofu", // Trust On First Use
    firstSeenAt: new Date(),
    lastActiveAt: new Date(),
    verifiedAt: null,
    verifiedBy: null,
    publicKey,
  };
}

/**
 * Updates device activity timestamp
 */
export function updateDeviceActivity(device: Device): Device {
  return {
    ...device,
    lastActiveAt: new Date(),
  };
}

/**
 * Sets the trust level for a device
 */
export function setDeviceTrustLevel(
  device: Device,
  trustLevel: TrustLevel,
  verifiedBy?: string,
): Device {
  return {
    ...device,
    trustLevel,
    verifiedAt: trustLevel === "verified" ? new Date() : device.verifiedAt,
    verifiedBy:
      trustLevel === "verified" ? verifiedBy || null : device.verifiedBy,
  };
}

/**
 * Checks if a device is trusted for encryption
 */
export function isDeviceTrusted(device: Device): boolean {
  return device.trustLevel === "verified" || device.trustLevel === "tofu";
}

/**
 * Checks if a device is blocked
 */
export function isDeviceBlocked(device: Device): boolean {
  return device.trustLevel === "blocked";
}

/**
 * Verifies a device using QR code data
 */
export async function verifyDeviceWithQR(
  device: Device,
  qrData: QRVerificationData,
  verifierUserId: string,
): Promise<VerificationResult> {
  // Validate QR data
  const validation = validateQRVerificationData(qrData);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      verifiedAt: new Date(),
    };
  }

  // Compare fingerprints
  if (!compareFingerprints(device.fingerprint, qrData.fingerprint)) {
    return {
      success: false,
      error: "Fingerprint mismatch - possible security issue",
      verifiedAt: new Date(),
    };
  }

  // Compare device IDs
  if (device.id !== qrData.deviceId) {
    return {
      success: false,
      error: "Device ID mismatch",
      verifiedAt: new Date(),
    };
  }

  // Verification successful
  const verifiedDevice = setDeviceTrustLevel(
    device,
    "verified",
    verifierUserId,
  );

  return {
    success: true,
    device: verifiedDevice,
    verifiedAt: new Date(),
  };
}

/**
 * Verifies a device using safety number comparison
 */
export function verifyDeviceWithSafetyNumber(
  device: Device,
  expectedSafetyNumber: SafetyNumber,
  actualSafetyNumber: SafetyNumber,
  verifierUserId: string,
): VerificationResult {
  if (!compareSafetyNumbers(expectedSafetyNumber, actualSafetyNumber)) {
    return {
      success: false,
      error: "Safety numbers do not match - possible security issue",
      verifiedAt: new Date(),
    };
  }

  const verifiedDevice = setDeviceTrustLevel(
    device,
    "verified",
    verifierUserId,
  );

  return {
    success: true,
    device: verifiedDevice,
    verifiedAt: new Date(),
  };
}

// ============================================================================
// Device Comparison
// ============================================================================

/**
 * Checks if a public key matches a device
 */
export async function doesKeyMatchDevice(
  publicKey: CryptoKey,
  device: Device,
): Promise<boolean> {
  const fingerprint = await getKeyFingerprint(publicKey);
  return compareFingerprints(fingerprint, device.fingerprint);
}

/**
 * Computes a device comparison score
 */
export function computeDeviceSimilarity(
  device1: DeviceInfo,
  device2: DeviceInfo,
): number {
  let score = 0;
  const maxScore = 4;

  if (device1.type === device2.type) score += 1;
  if (device1.os === device2.os) score += 1;
  if (device1.browser === device2.browser) score += 1;
  if (device1.userAgent === device2.userAgent) score += 1;

  return score / maxScore;
}

// ============================================================================
// Device Verification Manager
// ============================================================================

export class DeviceVerification {
  private devices: Map<string, Device> = new Map();
  private ownDeviceId: string | null = null;

  /**
   * Initializes the verification manager with the current device
   */
  initialize(
    deviceId: string,
    publicKey: JsonWebKey,
    fingerprint: string,
  ): Device {
    const device = createDevice(
      deviceId,
      publicKey,
      fingerprint,
      "This device",
    );
    device.trustLevel = "verified"; // Own device is always trusted
    this.devices.set(deviceId, device);
    this.ownDeviceId = deviceId;
    return device;
  }

  /**
   * Gets the current device ID
   */
  getOwnDeviceId(): string | null {
    return this.ownDeviceId;
  }

  /**
   * Gets a device by ID
   */
  getDevice(deviceId: string): Device | undefined {
    return this.devices.get(deviceId);
  }

  /**
   * Gets all devices
   */
  getAllDevices(): Device[] {
    return Array.from(this.devices.values());
  }

  /**
   * Gets trusted devices only
   */
  getTrustedDevices(): Device[] {
    return this.getAllDevices().filter(isDeviceTrusted);
  }

  /**
   * Gets blocked devices
   */
  getBlockedDevices(): Device[] {
    return this.getAllDevices().filter(isDeviceBlocked);
  }

  /**
   * Adds or updates a device
   */
  addDevice(device: Device): void {
    const existing = this.devices.get(device.id);
    if (existing) {
      // Preserve trust level if already set
      device.trustLevel = existing.trustLevel;
      device.verifiedAt = existing.verifiedAt;
      device.verifiedBy = existing.verifiedBy;
    }
    this.devices.set(device.id, device);
  }

  /**
   * Removes a device
   */
  removeDevice(deviceId: string): boolean {
    if (deviceId === this.ownDeviceId) {
      return false; // Cannot remove own device
    }
    return this.devices.delete(deviceId);
  }

  /**
   * Verifies a device
   */
  async verifyDevice(
    deviceId: string,
    qrData: QRVerificationData,
  ): Promise<VerificationResult> {
    const device = this.devices.get(deviceId);
    if (!device) {
      return {
        success: false,
        error: "Device not found",
        verifiedAt: new Date(),
      };
    }

    if (!this.ownDeviceId) {
      return {
        success: false,
        error: "Own device not initialized",
        verifiedAt: new Date(),
      };
    }

    const result = await verifyDeviceWithQR(device, qrData, this.ownDeviceId);

    if (result.success && result.device) {
      this.devices.set(deviceId, result.device);
    }

    return result;
  }

  /**
   * Blocks a device
   */
  blockDevice(deviceId: string): boolean {
    const device = this.devices.get(deviceId);
    if (!device || deviceId === this.ownDeviceId) {
      return false;
    }

    const blockedDevice = setDeviceTrustLevel(device, "blocked");
    this.devices.set(deviceId, blockedDevice);
    return true;
  }

  /**
   * Unblocks a device (resets to TOFU)
   */
  unblockDevice(deviceId: string): boolean {
    const device = this.devices.get(deviceId);
    if (!device || !isDeviceBlocked(device)) {
      return false;
    }

    const unblockedDevice = setDeviceTrustLevel(device, "tofu");
    this.devices.set(deviceId, unblockedDevice);
    return true;
  }

  /**
   * Updates device activity
   */
  updateActivity(deviceId: string): void {
    const device = this.devices.get(deviceId);
    if (device) {
      this.devices.set(deviceId, updateDeviceActivity(device));
    }
  }

  /**
   * Generates QR data for own device
   */
  generateOwnQRData(userId: string): QRVerificationData | null {
    if (!this.ownDeviceId) return null;

    const device = this.devices.get(this.ownDeviceId);
    if (!device) return null;

    return generateQRVerificationData(device.id, device.fingerprint, userId);
  }

  /**
   * Gets the device count
   */
  getDeviceCount(): number {
    return this.devices.size;
  }

  /**
   * Clears all devices except own
   */
  clearOtherDevices(): void {
    const ownDevice = this.ownDeviceId
      ? this.devices.get(this.ownDeviceId)
      : null;
    this.devices.clear();
    if (ownDevice) {
      this.devices.set(ownDevice.id, ownDevice);
    }
  }

  /**
   * Resets the verification manager
   */
  reset(): void {
    this.devices.clear();
    this.ownDeviceId = null;
  }
}

// Export singleton instance
export const deviceVerification = new DeviceVerification();
