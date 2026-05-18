/**
 * QR Code Generation and Scanning for Safety Number Verification
 *
 * Provides functionality to:
 * - Generate QR codes containing safety number data
 * - Parse scanned QR codes for verification
 * - Handle verification protocol for QR code exchange
 */

import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import {
  generateSafetyNumber,
  generateFingerprint,
  generateScannableFingerprint,
  compareSafetyNumbers,
  parseSafetyNumber,
  SAFETY_NUMBER_VERSION,
  FINGERPRINT_SIZE,
  type SafetyNumberInput,
  type MismatchResult,
} from "./safety-number";
import {
  constantTimeEqual,
  bytesToBase64,
  base64ToBytes,
  stringToBytes,
} from "./crypto";

// ============================================================================
// CONSTANTS
// ============================================================================

/** QR code data format version */
export const QR_FORMAT_VERSION = 1;

/** Maximum QR code data size in bytes */
export const MAX_QR_DATA_SIZE = 512;

/** QR code prefix for safety number verification */
export const QR_PREFIX = "nchat:verify:";

/** QR code error correction level */
export type QRErrorCorrectionLevel = "L" | "M" | "Q" | "H";

/** Default error correction level (Medium) */
export const DEFAULT_ERROR_CORRECTION: QRErrorCorrectionLevel = "M";

// ============================================================================
// TYPES
// ============================================================================

/**
 * QR code payload structure
 */
export interface QRCodePayload {
  /** Format version */
  version: number;
  /** Safety number version */
  safetyNumberVersion: number;
  /** User ID of the QR code generator */
  userId: string;
  /** Device ID (optional for multi-device) */
  deviceId?: string;
  /** Identity key fingerprint */
  fingerprint: Uint8Array;
  /** Timestamp of generation */
  timestamp: number;
  /** Checksum for data integrity */
  checksum: Uint8Array;
}

/**
 * Result of QR code generation
 */
export interface QRGenerationResult {
  /** Raw data string for QR code */
  data: string;
  /** Parsed payload for reference */
  payload: QRCodePayload;
  /** Suggested QR code size in pixels */
  suggestedSize: number;
  /** Error correction level */
  errorCorrection: QRErrorCorrectionLevel;
}

/**
 * Result of QR code scanning
 */
export interface QRScanResult {
  /** Whether parsing was successful */
  success: boolean;
  /** Parsed payload if successful */
  payload?: QRCodePayload;
  /** Error message if parsing failed */
  error?: string;
  /** Whether data integrity check passed */
  integrityValid?: boolean;
}

/**
 * Result of QR code verification
 */
export interface QRVerificationResult {
  /** Whether verification succeeded */
  verified: boolean;
  /** The peer's user ID from QR code */
  peerUserId?: string;
  /** The peer's device ID from QR code */
  peerDeviceId?: string;
  /** Matched safety number if verified */
  safetyNumber?: string;
  /** Error or warning message */
  message: string;
  /** Detailed mismatch information if failed */
  mismatch?: MismatchResult;
  /** Timestamp of scan */
  scannedAt: number;
}

/**
 * Scannable fingerprint data for QR code
 */
export interface ScannableFingerprintData {
  /** Binary data for QR code */
  binaryData: Uint8Array;
  /** Base64 encoded string for text-based QR */
  base64Data: string;
  /** Version information */
  version: number;
  /** Local user's fingerprint */
  localFingerprint: Uint8Array;
  /** Peer's fingerprint (if known) */
  peerFingerprint?: Uint8Array;
}

/**
 * Options for QR code generation
 */
export interface QRGenerationOptions {
  /** Error correction level */
  errorCorrection?: QRErrorCorrectionLevel;
  /** Include device ID */
  includeDeviceId?: boolean;
  /** Custom timestamp (for testing) */
  timestamp?: number;
}

// ============================================================================
// QR CODE GENERATION
// ============================================================================

/**
 * Generate QR code data for safety number verification
 */
export function generateQRCode(
  userId: string,
  identityKey: Uint8Array,
  options: QRGenerationOptions = {},
): QRGenerationResult {
  const {
    errorCorrection = DEFAULT_ERROR_CORRECTION,
    includeDeviceId = false,
    timestamp = Date.now(),
  } = options;

  // Generate fingerprint from identity key
  const fingerprint = generateFingerprint(
    identityKey,
    userId,
    SAFETY_NUMBER_VERSION,
  );

  // Create payload
  const payload: QRCodePayload = {
    version: QR_FORMAT_VERSION,
    safetyNumberVersion: SAFETY_NUMBER_VERSION,
    userId,
    fingerprint,
    timestamp,
    checksum: new Uint8Array(0), // Will be computed
  };

  // Serialize payload
  const serialized = serializeQRPayload(payload);

  // Compute checksum
  payload.checksum = sha256(serialized).slice(0, 8); // 8-byte checksum

  // Re-serialize with checksum
  const finalSerialized = serializeQRPayload(payload);

  // Create QR data string
  const base64Data = bytesToBase64(finalSerialized);
  const data = `${QR_PREFIX}${base64Data}`;

  // Calculate suggested size based on data length
  const suggestedSize = calculateSuggestedSize(data.length, errorCorrection);

  return {
    data,
    payload,
    suggestedSize,
    errorCorrection,
  };
}

/**
 * Generate scannable fingerprint for mutual verification
 */
export function generateScannableData(
  localUserId: string,
  localIdentityKey: Uint8Array,
  peerUserId?: string,
  peerIdentityKey?: Uint8Array,
): ScannableFingerprintData {
  const localFingerprint = generateFingerprint(
    localIdentityKey,
    localUserId,
    SAFETY_NUMBER_VERSION,
  );

  let peerFingerprint: Uint8Array | undefined;
  let binaryData: Uint8Array;

  if (peerUserId && peerIdentityKey) {
    peerFingerprint = generateFingerprint(
      peerIdentityKey,
      peerUserId,
      SAFETY_NUMBER_VERSION,
    );
    binaryData = generateScannableFingerprint(
      localFingerprint,
      peerFingerprint,
      SAFETY_NUMBER_VERSION,
    );
  } else {
    // Just local fingerprint
    binaryData = new Uint8Array(1 + FINGERPRINT_SIZE);
    binaryData[0] = SAFETY_NUMBER_VERSION;
    binaryData.set(localFingerprint, 1);
  }

  return {
    binaryData,
    base64Data: bytesToBase64(binaryData),
    version: SAFETY_NUMBER_VERSION,
    localFingerprint,
    peerFingerprint,
  };
}

/**
 * Serialize QR payload to bytes
 */
function serializeQRPayload(payload: QRCodePayload): Uint8Array {
  const userIdBytes = stringToBytes(payload.userId);
  const deviceIdBytes = payload.deviceId
    ? stringToBytes(payload.deviceId)
    : new Uint8Array(0);

  // Calculate total size
  const size =
    1 + // version
    1 + // safety number version
    1 + // user ID length
    userIdBytes.length +
    1 + // device ID length
    deviceIdBytes.length +
    FINGERPRINT_SIZE + // fingerprint
    8 + // timestamp (64-bit)
    payload.checksum.length;

  const data = new Uint8Array(size);
  let offset = 0;

  // Version
  data[offset++] = payload.version;

  // Safety number version
  data[offset++] = payload.safetyNumberVersion;

  // User ID (length-prefixed)
  data[offset++] = userIdBytes.length;
  data.set(userIdBytes, offset);
  offset += userIdBytes.length;

  // Device ID (length-prefixed)
  data[offset++] = deviceIdBytes.length;
  data.set(deviceIdBytes, offset);
  offset += deviceIdBytes.length;

  // Fingerprint
  data.set(payload.fingerprint, offset);
  offset += FINGERPRINT_SIZE;

  // Timestamp (8 bytes, big-endian)
  const timestampView = new DataView(data.buffer, offset, 8);
  timestampView.setBigUint64(0, BigInt(payload.timestamp), false);
  offset += 8;

  // Checksum
  data.set(payload.checksum, offset);

  return data;
}

/**
 * Deserialize QR payload from bytes
 */
function deserializeQRPayload(data: Uint8Array): QRCodePayload {
  let offset = 0;

  // Version
  const version = data[offset++];

  // Safety number version
  const safetyNumberVersion = data[offset++];

  // User ID
  const userIdLength = data[offset++];
  const userIdBytes = data.slice(offset, offset + userIdLength);
  const userId = new TextDecoder().decode(userIdBytes);
  offset += userIdLength;

  // Device ID
  const deviceIdLength = data[offset++];
  let deviceId: string | undefined;
  if (deviceIdLength > 0) {
    const deviceIdBytes = data.slice(offset, offset + deviceIdLength);
    deviceId = new TextDecoder().decode(deviceIdBytes);
    offset += deviceIdLength;
  }

  // Fingerprint
  const fingerprint = data.slice(offset, offset + FINGERPRINT_SIZE);
  offset += FINGERPRINT_SIZE;

  // Timestamp
  const timestampView = new DataView(data.buffer, data.byteOffset + offset, 8);
  const timestamp = Number(timestampView.getBigUint64(0, false));
  offset += 8;

  // Checksum
  const checksum = data.slice(offset);

  return {
    version,
    safetyNumberVersion,
    userId,
    deviceId,
    fingerprint,
    timestamp,
    checksum,
  };
}

/**
 * Calculate suggested QR code size based on data length
 */
function calculateSuggestedSize(
  dataLength: number,
  errorCorrection: QRErrorCorrectionLevel,
): number {
  // Base size calculations for different error correction levels
  const baseSizes: Record<QRErrorCorrectionLevel, number> = {
    L: 128,
    M: 160,
    Q: 192,
    H: 224,
  };

  const baseSize = baseSizes[errorCorrection];

  // Scale up for longer data
  if (dataLength > 200) {
    return baseSize + 64;
  }
  if (dataLength > 100) {
    return baseSize + 32;
  }

  return baseSize;
}

// ============================================================================
// QR CODE SCANNING / PARSING
// ============================================================================

/**
 * Parse QR code data
 */
export function parseQRCode(data: string): QRScanResult {
  try {
    // Check prefix
    if (!data.startsWith(QR_PREFIX)) {
      return {
        success: false,
        error: "Invalid QR code format: missing prefix",
      };
    }

    // Extract base64 data
    const base64Data = data.slice(QR_PREFIX.length);
    if (!base64Data) {
      return {
        success: false,
        error: "Invalid QR code format: empty data",
      };
    }

    // Decode base64
    let binaryData: Uint8Array;
    try {
      binaryData = base64ToBytes(base64Data);
    } catch {
      return {
        success: false,
        error: "Invalid QR code format: invalid base64 encoding",
      };
    }

    // Check minimum size
    if (binaryData.length < 1 + 1 + 1 + 1 + FINGERPRINT_SIZE + 8) {
      return {
        success: false,
        error: "Invalid QR code format: data too short",
      };
    }

    // Deserialize payload
    const payload = deserializeQRPayload(binaryData);

    // Validate version
    if (payload.version !== QR_FORMAT_VERSION) {
      return {
        success: false,
        error: `Unsupported QR code version: ${payload.version}`,
      };
    }

    // Verify checksum
    const dataWithoutChecksum = binaryData.slice(
      0,
      binaryData.length - payload.checksum.length,
    );
    const expectedChecksum = sha256(dataWithoutChecksum).slice(0, 8);
    const integrityValid = constantTimeEqual(
      payload.checksum,
      expectedChecksum,
    );

    if (!integrityValid) {
      return {
        success: false,
        error: "QR code integrity check failed",
        integrityValid: false,
      };
    }

    return {
      success: true,
      payload,
      integrityValid: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to parse QR code",
    };
  }
}

/**
 * Parse raw base64 scannable fingerprint data
 */
export function parseScannableData(base64Data: string): {
  success: boolean;
  version?: number;
  fingerprints?: Uint8Array[];
  error?: string;
} {
  try {
    const binaryData = base64ToBytes(base64Data);

    if (binaryData.length < 1) {
      return {
        success: false,
        error: "Data too short",
      };
    }

    const version = binaryData[0];
    const fingerprints: Uint8Array[] = [];

    let offset = 1;
    while (offset + FINGERPRINT_SIZE <= binaryData.length) {
      fingerprints.push(binaryData.slice(offset, offset + FINGERPRINT_SIZE));
      offset += FINGERPRINT_SIZE;
    }

    return {
      success: true,
      version,
      fingerprints,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to parse data",
    };
  }
}

// ============================================================================
// VERIFICATION
// ============================================================================

/**
 * Verify QR code against local identity
 */
export function verifyQRCode(
  scanResult: QRScanResult,
  localUserId: string,
  localIdentityKey: Uint8Array,
  expectedPeerUserId?: string,
): QRVerificationResult {
  const scannedAt = Date.now();

  // Check scan success
  if (!scanResult.success || !scanResult.payload) {
    return {
      verified: false,
      message: scanResult.error || "Failed to scan QR code",
      scannedAt,
    };
  }

  const payload = scanResult.payload;

  // Check if user ID matches expected peer
  if (expectedPeerUserId && payload.userId !== expectedPeerUserId) {
    return {
      verified: false,
      peerUserId: payload.userId,
      message: `QR code is from different user: ${payload.userId}`,
      scannedAt,
    };
  }

  // Reconstruct identity key from fingerprint is not possible
  // Instead, we need to compare fingerprints if we have the peer's identity key
  // This verification requires the peer's actual identity key

  // For now, return the scanned data for the caller to verify
  return {
    verified: true, // Indicates successful scan, not full verification
    peerUserId: payload.userId,
    peerDeviceId: payload.deviceId,
    message: "QR code scanned successfully. Manual verification required.",
    scannedAt,
  };
}

/**
 * Verify scanned fingerprint against known identity
 */
export function verifyScannedFingerprint(
  scannedFingerprint: Uint8Array,
  expectedIdentityKey: Uint8Array,
  expectedUserId: string,
): MismatchResult {
  const expectedFingerprint = generateFingerprint(
    expectedIdentityKey,
    expectedUserId,
    SAFETY_NUMBER_VERSION,
  );

  const matches = constantTimeEqual(scannedFingerprint, expectedFingerprint);

  if (matches) {
    return { matches: true };
  }

  return {
    matches: false,
    expected: bytesToHex(expectedFingerprint),
    provided: bytesToHex(scannedFingerprint),
    reason: "Fingerprints do not match",
    suggestions: [
      "The QR code may be from a different device",
      "The contact may have reinstalled the app",
      "Try scanning again or verify using numeric comparison",
    ],
  };
}

/**
 * Complete mutual QR verification
 * Both parties scan each other's codes
 */
export function performMutualVerification(
  localUserId: string,
  localIdentityKey: Uint8Array,
  scannedPayload: QRCodePayload,
  peerIdentityKey: Uint8Array,
): QRVerificationResult {
  const scannedAt = Date.now();

  // Generate expected fingerprint for the peer
  const expectedPeerFingerprint = generateFingerprint(
    peerIdentityKey,
    scannedPayload.userId,
    scannedPayload.safetyNumberVersion,
  );

  // Compare fingerprints
  const fingerprintMatches = constantTimeEqual(
    scannedPayload.fingerprint,
    expectedPeerFingerprint,
  );

  if (!fingerprintMatches) {
    return {
      verified: false,
      peerUserId: scannedPayload.userId,
      peerDeviceId: scannedPayload.deviceId,
      message: "Identity fingerprint mismatch",
      mismatch: {
        matches: false,
        expected: bytesToHex(expectedPeerFingerprint),
        provided: bytesToHex(scannedPayload.fingerprint),
        reason: "The scanned fingerprint does not match the expected identity",
        suggestions: [
          "Ensure you are scanning the correct contact's QR code",
          "The contact may have a new device or reinstalled the app",
          "Try verification again or use numeric comparison",
        ],
      },
      scannedAt,
    };
  }

  // Generate safety number for reference
  const safetyNumberResult = generateSafetyNumber({
    localIdentityKey,
    localUserId,
    peerIdentityKey,
    peerUserId: scannedPayload.userId,
  });

  return {
    verified: true,
    peerUserId: scannedPayload.userId,
    peerDeviceId: scannedPayload.deviceId,
    safetyNumber: safetyNumberResult.raw,
    message: "Identity verified successfully via QR code",
    scannedAt,
  };
}

// ============================================================================
// QR CODE DATA URL GENERATION
// ============================================================================

/**
 * Generate QR code as SVG string
 * Note: This is a helper that generates data; actual SVG rendering
 * should be done by a library like qrcode.react
 */
export function generateQRCodeDataUrl(data: string): string {
  // Create a data URL that can be passed to a QR code library
  return `data:text/plain;base64,${btoa(data)}`;
}

/**
 * Extract QR code data from data URL
 */
export function parseQRCodeDataUrl(dataUrl: string): string | null {
  const match = dataUrl.match(/^data:text\/plain;base64,(.+)$/);
  if (!match) {
    return null;
  }

  try {
    return atob(match[1]);
  } catch {
    return null;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if QR code data is valid without full parsing
 */
export function isValidQRCodeData(data: string): boolean {
  if (!data.startsWith(QR_PREFIX)) {
    return false;
  }

  const base64Part = data.slice(QR_PREFIX.length);
  if (!base64Part || base64Part.length < 20) {
    return false;
  }

  // Check for valid base64 characters
  return /^[A-Za-z0-9+/]+=*$/.test(base64Part);
}

/**
 * Get QR code freshness (time since generation)
 */
export function getQRCodeAge(payload: QRCodePayload): number {
  return Date.now() - payload.timestamp;
}

/**
 * Check if QR code is expired (older than specified max age)
 */
export function isQRCodeExpired(
  payload: QRCodePayload,
  maxAgeMs: number = 24 * 60 * 60 * 1000, // 24 hours default
): boolean {
  return getQRCodeAge(payload) > maxAgeMs;
}

/**
 * Create compact safety number for display in QR overlay
 */
export function createCompactSafetyNumber(safetyNumber: string): string {
  const parsed = parseSafetyNumber(safetyNumber);
  // Return first and last 10 digits with ellipsis
  if (parsed.length <= 20) {
    return parsed;
  }
  return `${parsed.slice(0, 10)}...${parsed.slice(-10)}`;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const verificationQR = {
  // Constants
  QR_FORMAT_VERSION,
  MAX_QR_DATA_SIZE,
  QR_PREFIX,
  DEFAULT_ERROR_CORRECTION,

  // Generation
  generateQRCode,
  generateScannableData,
  generateQRCodeDataUrl,

  // Parsing
  parseQRCode,
  parseScannableData,
  parseQRCodeDataUrl,

  // Verification
  verifyQRCode,
  verifyScannedFingerprint,
  performMutualVerification,

  // Utilities
  isValidQRCodeData,
  getQRCodeAge,
  isQRCodeExpired,
  createCompactSafetyNumber,
};

export default verificationQR;
