/**
 * Safety Number Generation and Verification
 * Provides comprehensive safety number functionality following Signal Protocol
 *
 * Safety numbers are 60-digit fingerprints derived from identity keys that allow
 * users to verify they are communicating with the intended party.
 */

import { sha256 } from "@noble/hashes/sha256";
import { sha512 } from "@noble/hashes/sha512";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import {
  generateRandomBytes,
  stringToBytes,
  hash256,
  constantTimeEqual,
} from "./crypto";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Current safety number format version */
export const SAFETY_NUMBER_VERSION = 2;

/** Number of digits in a safety number */
export const SAFETY_NUMBER_LENGTH = 60;

/** Number of digits per group for display */
export const SAFETY_NUMBER_GROUP_SIZE = 5;

/** Number of groups in a formatted safety number */
export const SAFETY_NUMBER_GROUP_COUNT =
  SAFETY_NUMBER_LENGTH / SAFETY_NUMBER_GROUP_SIZE;

/** Iterations for fingerprint generation (Signal uses 5200) */
export const FINGERPRINT_ITERATIONS = 5200;

/** Size of identity key fingerprint in bytes */
export const FINGERPRINT_SIZE = 32;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of safety number generation
 */
export interface SafetyNumberResult {
  /** Raw 60-digit safety number */
  raw: string;
  /** Formatted safety number with spaces */
  formatted: string;
  /** 6x2 grid for display (12 groups of 5 digits) */
  displayGrid: string[][];
  /** Fingerprint of local identity key */
  localFingerprint: Uint8Array;
  /** Fingerprint of peer identity key */
  peerFingerprint: Uint8Array;
  /** Version number used */
  version: number;
  /** Timestamp of generation */
  generatedAt: number;
}

/**
 * Input for safety number generation
 */
export interface SafetyNumberInput {
  /** Local user's identity public key */
  localIdentityKey: Uint8Array;
  /** Local user's stable identifier (UUID or phone number) */
  localUserId: string;
  /** Peer's identity public key */
  peerIdentityKey: Uint8Array;
  /** Peer's stable identifier */
  peerUserId: string;
  /** Optional version override */
  version?: number;
}

/**
 * Identity key change event
 */
export interface IdentityKeyChange {
  /** User ID whose key changed */
  userId: string;
  /** Previous identity key fingerprint */
  previousFingerprint: Uint8Array;
  /** New identity key fingerprint */
  newFingerprint: Uint8Array;
  /** Previous safety number with local user */
  previousSafetyNumber: string;
  /** New safety number with local user */
  newSafetyNumber: string;
  /** Timestamp of change detection */
  detectedAt: number;
  /** Whether the previous safety number was verified */
  wasVerified: boolean;
}

/**
 * Verification record for a peer
 */
export interface VerificationRecord {
  /** Peer user ID */
  peerUserId: string;
  /** Peer device ID (optional, for multi-device) */
  peerDeviceId?: string;
  /** Identity key fingerprint at verification time */
  identityFingerprint: Uint8Array;
  /** Safety number at verification time */
  safetyNumber: string;
  /** Verification timestamp */
  verifiedAt: number;
  /** Method used for verification */
  method: VerificationMethod;
  /** Whether verification is still valid (key unchanged) */
  isValid: boolean;
  /** Optional notes from user */
  notes?: string;
}

/**
 * Method used for safety number verification
 */
export type VerificationMethod =
  | "qr_code_scan"
  | "numeric_comparison"
  | "video_call"
  | "in_person"
  | "trusted_device"
  | "unknown";

/**
 * Trust level for a peer
 */
export type TrustLevel =
  | "unknown" // Never verified
  | "verified" // Actively verified
  | "unverified" // Previously verified but key changed
  | "compromised"; // Marked as potentially compromised

/**
 * Verification state for a peer
 */
export interface VerificationState {
  /** Peer user ID */
  peerUserId: string;
  /** Current trust level */
  trustLevel: TrustLevel;
  /** Current verification record if verified */
  currentVerification: VerificationRecord | null;
  /** History of verifications */
  verificationHistory: VerificationRecord[];
  /** History of identity key changes */
  keyChangeHistory: IdentityKeyChange[];
  /** Current identity key fingerprint */
  currentFingerprint: Uint8Array | null;
  /** Last updated timestamp */
  lastUpdated: number;
}

/**
 * Mismatch detection result
 */
export interface MismatchResult {
  /** Whether the safety numbers match */
  matches: boolean;
  /** If mismatch, the expected safety number */
  expected?: string;
  /** If mismatch, the provided safety number */
  provided?: string;
  /** Reason for mismatch if any */
  reason?: string;
  /** Suggestions for recovery */
  suggestions?: string[];
}

// ============================================================================
// FINGERPRINT GENERATION
// ============================================================================

/**
 * Generate a fingerprint from identity key and user ID
 * Follows Signal's fingerprint generation algorithm
 */
export function generateFingerprint(
  identityKey: Uint8Array,
  userId: string,
  version: number = SAFETY_NUMBER_VERSION,
): Uint8Array {
  // Combine version, user ID, and identity key
  const userIdBytes = stringToBytes(userId);
  const combined = new Uint8Array(1 + userIdBytes.length + identityKey.length);
  combined[0] = version;
  combined.set(userIdBytes, 1);
  combined.set(identityKey, 1 + userIdBytes.length);

  // Iterative hashing to strengthen fingerprint
  let hash = sha512(combined);
  for (let i = 0; i < FINGERPRINT_ITERATIONS; i++) {
    const data = new Uint8Array(hash.length + combined.length);
    data.set(hash, 0);
    data.set(combined, hash.length);
    hash = sha512(data);
  }

  // Return truncated to fingerprint size
  return hash.slice(0, FINGERPRINT_SIZE);
}

/**
 * Generate scannable fingerprint bytes for QR code
 */
export function generateScannableFingerprint(
  localFingerprint: Uint8Array,
  peerFingerprint: Uint8Array,
  version: number = SAFETY_NUMBER_VERSION,
): Uint8Array {
  // Scannable fingerprint format:
  // [version: 1 byte][local fingerprint: 32 bytes][peer fingerprint: 32 bytes]
  const scannable = new Uint8Array(1 + FINGERPRINT_SIZE * 2);
  scannable[0] = version;

  // Order fingerprints lexicographically for consistency
  if (compareBytes(localFingerprint, peerFingerprint) <= 0) {
    scannable.set(localFingerprint, 1);
    scannable.set(peerFingerprint, 1 + FINGERPRINT_SIZE);
  } else {
    scannable.set(peerFingerprint, 1);
    scannable.set(localFingerprint, 1 + FINGERPRINT_SIZE);
  }

  return scannable;
}

// ============================================================================
// SAFETY NUMBER GENERATION
// ============================================================================

/**
 * Generate safety number from identity keys
 * This is the main entry point for safety number generation
 */
export function generateSafetyNumber(
  input: SafetyNumberInput,
): SafetyNumberResult {
  const version = input.version ?? SAFETY_NUMBER_VERSION;

  // Generate fingerprints for each party
  const localFingerprint = generateFingerprint(
    input.localIdentityKey,
    input.localUserId,
    version,
  );

  const peerFingerprint = generateFingerprint(
    input.peerIdentityKey,
    input.peerUserId,
    version,
  );

  // Combine fingerprints in consistent order
  const combined = combineFingerprints(localFingerprint, peerFingerprint);

  // Generate 60-digit number from combined fingerprint
  const raw = fingerprintToDigits(combined);

  // Format for display
  const formatted = formatSafetyNumber(raw);
  const displayGrid = createDisplayGrid(raw);

  return {
    raw,
    formatted,
    displayGrid,
    localFingerprint,
    peerFingerprint,
    version,
    generatedAt: Date.now(),
  };
}

/**
 * Generate safety number from raw parameters (convenience function)
 */
export function generateSafetyNumberSimple(
  localIdentityKey: Uint8Array,
  localUserId: string,
  peerIdentityKey: Uint8Array,
  peerUserId: string,
): string {
  const result = generateSafetyNumber({
    localIdentityKey,
    localUserId,
    peerIdentityKey,
    peerUserId,
  });
  return result.raw;
}

/**
 * Combine two fingerprints in a consistent order
 */
function combineFingerprints(
  fingerprint1: Uint8Array,
  fingerprint2: Uint8Array,
): Uint8Array {
  // Order fingerprints lexicographically for consistency
  // This ensures the same result regardless of which party generates the number
  const comparison = compareBytes(fingerprint1, fingerprint2);

  let combined: Uint8Array;
  if (comparison <= 0) {
    combined = new Uint8Array(fingerprint1.length + fingerprint2.length);
    combined.set(fingerprint1, 0);
    combined.set(fingerprint2, fingerprint1.length);
  } else {
    combined = new Uint8Array(fingerprint2.length + fingerprint1.length);
    combined.set(fingerprint2, 0);
    combined.set(fingerprint1, fingerprint2.length);
  }

  // Final hash of combined fingerprints
  return sha512(combined);
}

/**
 * Convert fingerprint bytes to 60-digit number
 */
function fingerprintToDigits(fingerprint: Uint8Array): string {
  let digits = "";

  // Use fingerprint bytes to generate digits
  // Each byte contributes roughly one digit (mod 10)
  for (let i = 0; i < SAFETY_NUMBER_LENGTH; i++) {
    const byteIndex = Math.floor(
      (i * fingerprint.length) / SAFETY_NUMBER_LENGTH,
    );
    const digit = fingerprint[byteIndex] % 10;
    digits += digit.toString();
  }

  return digits;
}

/**
 * Compare two byte arrays lexicographically
 */
function compareBytes(a: Uint8Array, b: Uint8Array): number {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) {
      return a[i] - b[i];
    }
  }
  return a.length - b.length;
}

// ============================================================================
// FORMATTING
// ============================================================================

/**
 * Format safety number with spaces between groups
 */
export function formatSafetyNumber(safetyNumber: string): string {
  const groups: string[] = [];
  for (let i = 0; i < safetyNumber.length; i += SAFETY_NUMBER_GROUP_SIZE) {
    groups.push(safetyNumber.slice(i, i + SAFETY_NUMBER_GROUP_SIZE));
  }
  return groups.join(" ");
}

/**
 * Create 6x2 display grid for safety number
 */
export function createDisplayGrid(safetyNumber: string): string[][] {
  const groups: string[] = [];
  for (let i = 0; i < safetyNumber.length; i += SAFETY_NUMBER_GROUP_SIZE) {
    groups.push(safetyNumber.slice(i, i + SAFETY_NUMBER_GROUP_SIZE));
  }

  // Create 6x2 grid (6 columns, 2 rows)
  const grid: string[][] = [[], []];
  for (let i = 0; i < groups.length; i++) {
    const row = i < 6 ? 0 : 1;
    grid[row].push(groups[i]);
  }

  return grid;
}

/**
 * Parse formatted safety number back to raw digits
 */
export function parseSafetyNumber(formatted: string): string {
  return formatted.replace(/\s+/g, "").replace(/[^0-9]/g, "");
}

/**
 * Validate safety number format
 */
export function validateSafetyNumberFormat(safetyNumber: string): boolean {
  const raw = parseSafetyNumber(safetyNumber);
  return raw.length === SAFETY_NUMBER_LENGTH && /^\d+$/.test(raw);
}

// ============================================================================
// VERIFICATION
// ============================================================================

/**
 * Compare two safety numbers for equality
 * Uses constant-time comparison for security
 */
export function compareSafetyNumbers(
  number1: string,
  number2: string,
): boolean {
  const raw1 = parseSafetyNumber(number1);
  const raw2 = parseSafetyNumber(number2);

  if (raw1.length !== raw2.length) {
    return false;
  }

  // Constant-time comparison
  const bytes1 = stringToBytes(raw1);
  const bytes2 = stringToBytes(raw2);

  return constantTimeEqual(bytes1, bytes2);
}

/**
 * Verify that a provided safety number matches the expected one
 */
export function verifySafetyNumber(
  provided: string,
  expected: string,
): MismatchResult {
  const matches = compareSafetyNumbers(provided, expected);

  if (matches) {
    return { matches: true };
  }

  const suggestions: string[] = [
    "Ensure you are comparing with the correct contact",
    "Check that both parties have the latest app version",
    "The contact may have reinstalled the app or changed devices",
    "If you suspect compromise, contact the person through another channel",
  ];

  return {
    matches: false,
    expected: formatSafetyNumber(parseSafetyNumber(expected)),
    provided: formatSafetyNumber(parseSafetyNumber(provided)),
    reason: "Safety numbers do not match",
    suggestions,
  };
}

/**
 * Verify fingerprint against stored verification
 */
export function verifyFingerprint(
  currentFingerprint: Uint8Array,
  storedVerification: VerificationRecord,
): MismatchResult {
  const matches = constantTimeEqual(
    currentFingerprint,
    storedVerification.identityFingerprint,
  );

  if (matches) {
    return { matches: true };
  }

  return {
    matches: false,
    reason: "Identity key has changed since verification",
    suggestions: [
      "The contact may have reinstalled the app or changed devices",
      "Verify the safety number again in person or over a secure channel",
      "If unexpected, treat messages with caution until re-verified",
    ],
  };
}

// ============================================================================
// IDENTITY KEY CHANGE DETECTION
// ============================================================================

/**
 * Detect if identity key has changed
 */
export function detectKeyChange(
  previousKey: Uint8Array | null,
  currentKey: Uint8Array,
): boolean {
  if (!previousKey) {
    return false; // First time seeing this key, not a change
  }

  return !constantTimeEqual(previousKey, currentKey);
}

/**
 * Create identity key change event
 */
export function createKeyChangeEvent(
  userId: string,
  previousKey: Uint8Array,
  currentKey: Uint8Array,
  localUserId: string,
  localIdentityKey: Uint8Array,
  wasVerified: boolean,
): IdentityKeyChange {
  const previousFingerprint = generateFingerprint(previousKey, userId);
  const newFingerprint = generateFingerprint(currentKey, userId);

  const previousResult = generateSafetyNumber({
    localIdentityKey,
    localUserId,
    peerIdentityKey: previousKey,
    peerUserId: userId,
  });

  const newResult = generateSafetyNumber({
    localIdentityKey,
    localUserId,
    peerIdentityKey: currentKey,
    peerUserId: userId,
  });

  return {
    userId,
    previousFingerprint,
    newFingerprint,
    previousSafetyNumber: previousResult.raw,
    newSafetyNumber: newResult.raw,
    detectedAt: Date.now(),
    wasVerified,
  };
}

// ============================================================================
// VERIFICATION RECORD MANAGEMENT
// ============================================================================

/**
 * Create a new verification record
 */
export function createVerificationRecord(
  peerUserId: string,
  identityKey: Uint8Array,
  safetyNumber: string,
  method: VerificationMethod,
  peerDeviceId?: string,
  notes?: string,
): VerificationRecord {
  return {
    peerUserId,
    peerDeviceId,
    identityFingerprint: generateFingerprint(identityKey, peerUserId),
    safetyNumber: parseSafetyNumber(safetyNumber),
    verifiedAt: Date.now(),
    method,
    isValid: true,
    notes,
  };
}

/**
 * Invalidate a verification record due to key change
 */
export function invalidateVerification(
  record: VerificationRecord,
): VerificationRecord {
  return {
    ...record,
    isValid: false,
  };
}

/**
 * Create initial verification state for a peer
 */
export function createVerificationState(peerUserId: string): VerificationState {
  return {
    peerUserId,
    trustLevel: "unknown",
    currentVerification: null,
    verificationHistory: [],
    keyChangeHistory: [],
    currentFingerprint: null,
    lastUpdated: Date.now(),
  };
}

/**
 * Update verification state with new verification
 */
export function updateVerificationState(
  state: VerificationState,
  verification: VerificationRecord,
): VerificationState {
  const newHistory = state.currentVerification
    ? [...state.verificationHistory, state.currentVerification]
    : state.verificationHistory;

  return {
    ...state,
    trustLevel: "verified",
    currentVerification: verification,
    verificationHistory: newHistory,
    currentFingerprint: verification.identityFingerprint,
    lastUpdated: Date.now(),
  };
}

/**
 * Update verification state with key change
 */
export function handleKeyChangeInState(
  state: VerificationState,
  keyChange: IdentityKeyChange,
): VerificationState {
  const updatedCurrentVerification = state.currentVerification
    ? invalidateVerification(state.currentVerification)
    : null;

  return {
    ...state,
    trustLevel: state.currentVerification ? "unverified" : "unknown",
    currentVerification: updatedCurrentVerification,
    keyChangeHistory: [...state.keyChangeHistory, keyChange],
    currentFingerprint: keyChange.newFingerprint,
    lastUpdated: Date.now(),
  };
}

// ============================================================================
// SERIALIZATION
// ============================================================================

/**
 * Serialize verification record for storage
 */
export function serializeVerificationRecord(
  record: VerificationRecord,
): string {
  return JSON.stringify({
    ...record,
    identityFingerprint: bytesToHex(record.identityFingerprint),
  });
}

/**
 * Deserialize verification record from storage
 */
export function deserializeVerificationRecord(
  data: string,
): VerificationRecord {
  const parsed = JSON.parse(data);
  return {
    ...parsed,
    identityFingerprint: hexToBytes(parsed.identityFingerprint),
  };
}

/**
 * Serialize verification state for storage
 */
export function serializeVerificationState(state: VerificationState): string {
  const serialized = {
    ...state,
    currentFingerprint: state.currentFingerprint
      ? bytesToHex(state.currentFingerprint)
      : null,
    currentVerification: state.currentVerification
      ? {
          ...state.currentVerification,
          identityFingerprint: bytesToHex(
            state.currentVerification.identityFingerprint,
          ),
        }
      : null,
    verificationHistory: state.verificationHistory.map((v) => ({
      ...v,
      identityFingerprint: bytesToHex(v.identityFingerprint),
    })),
    keyChangeHistory: state.keyChangeHistory.map((k) => ({
      ...k,
      previousFingerprint: bytesToHex(k.previousFingerprint),
      newFingerprint: bytesToHex(k.newFingerprint),
    })),
  };
  return JSON.stringify(serialized);
}

/**
 * Deserialize verification state from storage
 */
export function deserializeVerificationState(data: string): VerificationState {
  const parsed = JSON.parse(data);
  return {
    ...parsed,
    currentFingerprint: parsed.currentFingerprint
      ? hexToBytes(parsed.currentFingerprint)
      : null,
    currentVerification: parsed.currentVerification
      ? {
          ...parsed.currentVerification,
          identityFingerprint: hexToBytes(
            parsed.currentVerification.identityFingerprint,
          ),
        }
      : null,
    verificationHistory: parsed.verificationHistory.map((v: any) => ({
      ...v,
      identityFingerprint: hexToBytes(v.identityFingerprint),
    })),
    keyChangeHistory: parsed.keyChangeHistory.map((k: any) => ({
      ...k,
      previousFingerprint: hexToBytes(k.previousFingerprint),
      newFingerprint: hexToBytes(k.newFingerprint),
    })),
  };
}

// ============================================================================
// FINGERPRINT DISPLAY
// ============================================================================

/**
 * Format fingerprint as hex groups for display
 */
export function formatFingerprintHex(fingerprint: Uint8Array): string {
  const hex = bytesToHex(fingerprint);
  const groups: string[] = [];
  for (let i = 0; i < hex.length; i += 8) {
    groups.push(hex.slice(i, i + 8));
  }
  return groups.join(" ");
}

/**
 * Get short fingerprint (first 8 characters)
 */
export function getShortFingerprint(fingerprint: Uint8Array): string {
  return bytesToHex(fingerprint).slice(0, 8).toUpperCase();
}

// ============================================================================
// EXPORTS
// ============================================================================

export const safetyNumber = {
  // Constants
  SAFETY_NUMBER_VERSION,
  SAFETY_NUMBER_LENGTH,
  SAFETY_NUMBER_GROUP_SIZE,
  SAFETY_NUMBER_GROUP_COUNT,

  // Generation
  generateSafetyNumber,
  generateSafetyNumberSimple,
  generateFingerprint,
  generateScannableFingerprint,

  // Formatting
  formatSafetyNumber,
  createDisplayGrid,
  parseSafetyNumber,
  validateSafetyNumberFormat,
  formatFingerprintHex,
  getShortFingerprint,

  // Verification
  compareSafetyNumbers,
  verifySafetyNumber,
  verifyFingerprint,

  // Key change detection
  detectKeyChange,
  createKeyChangeEvent,

  // Verification records
  createVerificationRecord,
  invalidateVerification,
  createVerificationState,
  updateVerificationState,
  handleKeyChangeInState,

  // Serialization
  serializeVerificationRecord,
  deserializeVerificationRecord,
  serializeVerificationState,
  deserializeVerificationState,
};

export default safetyNumber;
