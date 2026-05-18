/**
 * Biometric Authentication using WebAuthn
 *
 * Provides fingerprint/face unlock functionality via WebAuthn API
 */

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface BiometricCredential {
  id: string;
  credentialId: string;
  publicKey: string;
  deviceName: string;
  credentialType: "fingerprint" | "face" | "other";
  createdAt: string;
  lastUsedAt?: string;
}

export interface BiometricSetupResult {
  success: boolean;
  error?: string;
  credential?: BiometricCredential;
}

export interface BiometricVerifyResult {
  success: boolean;
  error?: string;
  credentialId?: string;
}

// ============================================================================
// WebAuthn Availability Check
// ============================================================================

/**
 * Check if WebAuthn is supported in current browser
 */
export function isWebAuthnSupported(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window.PublicKeyCredential && navigator.credentials);
}

/**
 * Check if platform authenticator (biometric) is available
 */
export async function isBiometricAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;

  try {
    const available =
      await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return available;
  } catch {
    return false;
  }
}

/**
 * Get biometric type description
 */
export async function getBiometricType(): Promise<string> {
  if (!(await isBiometricAvailable())) {
    return "Not available";
  }

  // Detect based on platform
  const userAgent = navigator.userAgent.toLowerCase();

  if (userAgent.includes("iphone") || userAgent.includes("ipad")) {
    return "Face ID or Touch ID";
  }

  if (userAgent.includes("mac")) {
    return "Touch ID";
  }

  if (userAgent.includes("android")) {
    return "Fingerprint or Face unlock";
  }

  if (userAgent.includes("windows")) {
    return "Windows Hello";
  }

  return "Platform authenticator";
}

// ============================================================================
// Credential Storage (LocalStorage)
// ============================================================================

const CREDENTIAL_STORAGE_KEY = "nself_chat_biometric_credentials";

/**
 * Store biometric credential
 */
function storeCredential(credential: BiometricCredential): void {
  try {
    const stored = localStorage.getItem(CREDENTIAL_STORAGE_KEY);
    const credentials: BiometricCredential[] = stored ? JSON.parse(stored) : [];

    // Add new credential
    credentials.push(credential);

    localStorage.setItem(CREDENTIAL_STORAGE_KEY, JSON.stringify(credentials));
  } catch (error) {
    logger.error("Failed to store credential:", error);
    throw new Error("Failed to store credential");
  }
}

/**
 * Get all stored credentials
 */
export function getStoredCredentials(): BiometricCredential[] {
  try {
    const stored = localStorage.getItem(CREDENTIAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Find credential by ID
 */
function findCredential(credentialId: string): BiometricCredential | null {
  const credentials = getStoredCredentials();
  return credentials.find((c) => c.credentialId === credentialId) || null;
}

/**
 * Update credential last used time
 */
function updateCredentialLastUsed(credentialId: string): void {
  try {
    const credentials = getStoredCredentials();
    const updated = credentials.map((c) => {
      if (c.credentialId === credentialId) {
        return { ...c, lastUsedAt: new Date().toISOString() };
      }
      return c;
    });

    localStorage.setItem(CREDENTIAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    logger.error("Failed to update credential:", error);
  }
}

/**
 * Remove credential
 */
export function removeCredential(credentialId: string): boolean {
  try {
    const credentials = getStoredCredentials();
    const filtered = credentials.filter((c) => c.credentialId !== credentialId);

    localStorage.setItem(CREDENTIAL_STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear all credentials
 */
export function clearAllCredentials(): void {
  try {
    localStorage.removeItem(CREDENTIAL_STORAGE_KEY);
  } catch (error) {
    logger.error("Failed to clear credentials:", error);
  }
}

/**
 * Check if any credentials are registered
 */
export function hasRegisteredCredentials(): boolean {
  return getStoredCredentials().length > 0;
}

// ============================================================================
// WebAuthn Registration (Setup Biometric)
// ============================================================================

/**
 * Register new biometric credential
 */
export async function registerBiometric(
  userId: string,
  userName: string,
  deviceName?: string,
): Promise<BiometricSetupResult> {
  try {
    // Check availability
    if (!(await isBiometricAvailable())) {
      return {
        success: false,
        error: "Biometric authentication is not available on this device",
      };
    }

    // Generate challenge (random bytes)
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    // Create credential options
    const publicKeyOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: "nself-chat",
        id: window.location.hostname,
      },
      user: {
        id: new TextEncoder().encode(userId),
        name: userName,
        displayName: userName,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 }, // ES256
        { type: "public-key", alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform", // Require platform authenticator
        requireResidentKey: false,
        userVerification: "required", // Require biometric
      },
      timeout: 60000,
      attestation: "none",
    };

    // Create credential
    const credential = (await navigator.credentials.create({
      publicKey: publicKeyOptions,
    })) as PublicKeyCredential | null;

    if (!credential) {
      return { success: false, error: "Failed to create credential" };
    }

    // Extract credential data
    const response = credential.response as AuthenticatorAttestationResponse;
    const credentialId = arrayBufferToBase64(credential.rawId);
    const publicKey = arrayBufferToBase64(response.getPublicKey()!);

    // Detect credential type
    const biometricType = await getBiometricType();
    let credentialType: BiometricCredential["credentialType"] = "other";
    if (
      biometricType.toLowerCase().includes("fingerprint") ||
      biometricType.toLowerCase().includes("touch")
    ) {
      credentialType = "fingerprint";
    } else if (biometricType.toLowerCase().includes("face")) {
      credentialType = "face";
    }

    // Create credential object
    const biometricCredential: BiometricCredential = {
      id: crypto.randomUUID(),
      credentialId,
      publicKey,
      deviceName:
        deviceName || `${biometricType} (${new Date().toLocaleDateString()})`,
      credentialType,
      createdAt: new Date().toISOString(),
    };

    // Store credential
    storeCredential(biometricCredential);

    return {
      success: true,
      credential: biometricCredential,
    };
  } catch (error) {
    logger.error("Biometric registration failed:", error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.name === "NotAllowedError") {
        return { success: false, error: "Biometric setup was cancelled" };
      }
      if (error.name === "NotSupportedError") {
        return {
          success: false,
          error: "Biometric authentication is not supported",
        };
      }
      if (error.name === "InvalidStateError") {
        return { success: false, error: "Biometric credential already exists" };
      }
    }

    return {
      success: false,
      error: "Failed to setup biometric authentication",
    };
  }
}

// ============================================================================
// WebAuthn Authentication (Verify Biometric)
// ============================================================================

/**
 * Verify using biometric authentication
 */
export async function verifyBiometric(): Promise<BiometricVerifyResult> {
  try {
    // Check if credentials exist
    const storedCredentials = getStoredCredentials();
    if (storedCredentials.length === 0) {
      return { success: false, error: "No biometric credentials registered" };
    }

    // Check availability
    if (!(await isBiometricAvailable())) {
      return {
        success: false,
        error: "Biometric authentication is not available",
      };
    }

    // Generate challenge
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    // Prepare allowed credentials
    const allowCredentials = storedCredentials.map((c) => ({
      type: "public-key" as const,
      id: base64ToArrayBuffer(c.credentialId),
    }));

    // Create authentication options
    const publicKeyOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      rpId: window.location.hostname,
      allowCredentials,
      userVerification: "required",
      timeout: 60000,
    };

    // Get credential
    const credential = (await navigator.credentials.get({
      publicKey: publicKeyOptions,
    })) as PublicKeyCredential | null;

    if (!credential) {
      return { success: false, error: "Biometric verification failed" };
    }

    // Extract credential ID
    const credentialId = arrayBufferToBase64(credential.rawId);

    // Verify credential exists in storage
    const storedCredential = findCredential(credentialId);
    if (!storedCredential) {
      return { success: false, error: "Unknown credential" };
    }

    // Update last used time
    updateCredentialLastUsed(credentialId);

    return {
      success: true,
      credentialId,
    };
  } catch (error) {
    logger.error("Biometric verification failed:", error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.name === "NotAllowedError") {
        return {
          success: false,
          error: "Biometric verification was cancelled",
        };
      }
      if (error.name === "NotSupportedError") {
        return {
          success: false,
          error: "Biometric authentication is not supported",
        };
      }
    }

    return { success: false, error: "Biometric verification failed" };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Get icon name for credential type
 */
export function getCredentialIcon(
  type: BiometricCredential["credentialType"],
): string {
  switch (type) {
    case "fingerprint":
      return "fingerprint";
    case "face":
      return "scan-face";
    default:
      return "shield-check";
  }
}

/**
 * Get credential type description
 */
export function getCredentialTypeDescription(
  type: BiometricCredential["credentialType"],
): string {
  switch (type) {
    case "fingerprint":
      return "Fingerprint";
    case "face":
      return "Face recognition";
    default:
      return "Biometric";
  }
}

/**
 * Format credential last used time
 */
export function formatLastUsed(lastUsedAt?: string): string {
  if (!lastUsedAt) return "Never used";

  const date = new Date(lastUsedAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60)
    return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24)
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;

  return date.toLocaleDateString();
}
