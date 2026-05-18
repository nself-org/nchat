/**
 * Device Fingerprinting Utility
 *
 * Generates device fingerprints for "remember this device" functionality.
 * Uses browser and system information to create a unique device identifier.
 */

import { createHash } from "crypto";

/**
 * Device information interface
 */
export interface DeviceInfo {
  userAgent: string;
  platform: string;
  language: string;
  screenResolution: string;
  timezone: string;
  colorDepth: number;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  vendor?: string;
}

/**
 * Get browser-based device information
 * @returns Device information object
 */
export function getDeviceInfo(): DeviceInfo {
  if (typeof window === "undefined") {
    // Server-side: return minimal info
    return {
      userAgent: "server",
      platform: "server",
      language: "en-US",
      screenResolution: "0x0",
      timezone: "UTC",
      colorDepth: 0,
    };
  }

  const nav = window.navigator as Navigator & {
    deviceMemory?: number;
    hardwareConcurrency?: number;
  };

  return {
    userAgent: nav.userAgent,
    platform: nav.platform,
    language: nav.language,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    colorDepth: window.screen.colorDepth,
    deviceMemory: nav.deviceMemory,
    hardwareConcurrency: nav.hardwareConcurrency,
    vendor: nav.vendor,
  };
}

/**
 * Generate a device fingerprint from device information
 * @param deviceInfo - Device information
 * @returns SHA-256 hash of device fingerprint
 */
export function generateDeviceFingerprint(deviceInfo: DeviceInfo): string {
  // Create a deterministic string from device info
  const fingerprintString = [
    deviceInfo.userAgent,
    deviceInfo.platform,
    deviceInfo.language,
    deviceInfo.screenResolution,
    deviceInfo.timezone,
    deviceInfo.colorDepth,
    deviceInfo.deviceMemory,
    deviceInfo.hardwareConcurrency,
    deviceInfo.vendor,
  ]
    .filter(Boolean)
    .join("|");

  // Hash the fingerprint string
  const hash = createHash("sha256");
  hash.update(fingerprintString);
  return hash.digest("hex");
}

/**
 * Get current device fingerprint
 * @returns Device fingerprint hash
 */
export function getCurrentDeviceFingerprint(): string {
  const deviceInfo = getDeviceInfo();
  return generateDeviceFingerprint(deviceInfo);
}

/**
 * Get a user-friendly device name
 * @param userAgent - User agent string
 * @returns Human-readable device name
 */
export function getDeviceName(userAgent?: string): string {
  const ua =
    userAgent ||
    (typeof window !== "undefined" ? window.navigator.userAgent : "");

  // Detect browser
  let browser = "Unknown Browser";
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";

  // Detect OS
  let os = "Unknown OS";
  if (ua.includes("Windows NT 10.0")) os = "Windows 10/11";
  else if (ua.includes("Windows NT 6.3")) os = "Windows 8.1";
  else if (ua.includes("Windows NT 6.2")) os = "Windows 8";
  else if (ua.includes("Windows NT 6.1")) os = "Windows 7";
  else if (ua.includes("Mac OS X")) {
    const version = ua.match(/Mac OS X (\d+)[._](\d+)/);
    if (version) {
      os = `macOS ${version[1]}.${version[2]}`;
    } else {
      os = "macOS";
    }
  } else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) {
    const version = ua.match(/Android (\d+)/);
    os = version ? `Android ${version[1]}` : "Android";
  } else if (
    ua.includes("iOS") ||
    ua.includes("iPhone") ||
    ua.includes("iPad")
  ) {
    const version = ua.match(/OS (\d+)_(\d+)/);
    os = version ? `iOS ${version[1]}.${version[2]}` : "iOS";
  }

  return `${browser} on ${os}`;
}

/**
 * Get device type (desktop, mobile, tablet)
 * @param userAgent - User agent string
 * @returns Device type
 */
export function getDeviceType(
  userAgent?: string,
): "desktop" | "mobile" | "tablet" {
  const ua =
    userAgent ||
    (typeof window !== "undefined" ? window.navigator.userAgent : "");

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "tablet";
  }
  if (
    /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
      ua,
    )
  ) {
    return "mobile";
  }
  return "desktop";
}

/**
 * Create full device information object for storage
 * @returns Complete device info with fingerprint and metadata
 */
export function createDeviceRecord(): {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  deviceInfo: DeviceInfo;
} {
  const deviceInfo = getDeviceInfo();
  const deviceId = generateDeviceFingerprint(deviceInfo);
  const deviceName = getDeviceName(deviceInfo.userAgent);
  const deviceType = getDeviceType(deviceInfo.userAgent);

  return {
    deviceId,
    deviceName,
    deviceType,
    deviceInfo,
  };
}

/**
 * Calculate device trust expiry date
 * @param days - Number of days to trust device (default: 30)
 * @returns ISO timestamp of expiry
 */
export function getDeviceTrustExpiry(days: number = 30): string {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);
  return expiryDate.toISOString();
}

/**
 * Check if device trust is expired
 * @param trustedUntil - ISO timestamp of expiry
 * @returns true if expired
 */
export function isDeviceTrustExpired(trustedUntil: string): boolean {
  return new Date(trustedUntil) < new Date();
}

/**
 * Get days remaining until device trust expires
 * @param trustedUntil - ISO timestamp of expiry
 * @returns Number of days remaining
 */
export function getDaysUntilExpiry(trustedUntil: string): number {
  const now = new Date();
  const expiry = new Date(trustedUntil);
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Validate device fingerprint format
 * @param fingerprint - Device fingerprint to validate
 * @returns true if valid SHA-256 hex string
 */
export function isValidDeviceFingerprint(fingerprint: string): boolean {
  return /^[a-f0-9]{64}$/i.test(fingerprint);
}

/**
 * Create device ID for localStorage (shorter version)
 * @returns Short device ID for client-side storage
 */
export function getLocalDeviceId(): string {
  if (typeof window === "undefined") return "server";

  // Check if we have a stored device ID
  let deviceId = localStorage.getItem("device_id");

  if (!deviceId) {
    // Generate new device ID
    const fingerprint = getCurrentDeviceFingerprint();
    deviceId = fingerprint.substring(0, 16); // Use first 16 chars
    localStorage.setItem("device_id", deviceId);
  }

  return deviceId;
}

/**
 * Clear device trust from localStorage
 */
export function clearDeviceTrust(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("device_id");
  localStorage.removeItem("device_trusted");
}

/**
 * Check if current device is trusted in localStorage
 * @returns true if device is marked as trusted
 */
export function isDeviceTrustedLocally(): boolean {
  if (typeof window === "undefined") return false;
  const trusted = localStorage.getItem("device_trusted");
  return trusted === "true";
}

/**
 * Mark device as trusted in localStorage
 */
export function markDeviceAsTrusted(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("device_trusted", "true");
}
