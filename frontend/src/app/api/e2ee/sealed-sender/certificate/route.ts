/**
 * Sender Certificate API Routes
 *
 * Handles sender certificate issuance and verification:
 * - POST: Request a new sender certificate
 * - GET: Get certificate status or validate a certificate
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  type SenderCertificate,
  SEALED_SENDER_VERSION,
  serializeCertificate,
} from "@/lib/e2ee/sealed-sender";
import {
  type CertificateRequest,
  DEFAULT_CERTIFICATE_VALIDITY_MS,
  MAX_CERTIFICATE_VALIDITY_MS,
  MIN_CERTIFICATE_VALIDITY_MS,
} from "@/lib/e2ee/sender-certificate";

// ============================================================================
// Types
// ============================================================================

interface IssueCertificateRequest {
  /** User ID requesting certificate */
  userId: string;
  /** Device ID */
  deviceId: string;
  /** Identity public key (Base64) */
  identityKey: string;
  /** Requested validity period in milliseconds */
  validityMs?: number;
  /** Authentication token */
  authToken?: string;
}

interface IssueCertificateResponse {
  /** The issued certificate */
  certificate: {
    version: number;
    senderUserId: string;
    senderDeviceId: string;
    senderIdentityKey: string;
    expiresAt: number;
    signature: string;
    serverKeyId: number;
  };
  /** Serialized certificate (Base64) for direct use */
  serializedCertificate: string;
  /** Server public key for verification (Base64) */
  serverPublicKey: string;
  /** Server key ID */
  serverKeyId: number;
}

interface CertificateStatusResponse {
  /** Whether the user has a valid certificate */
  hasValidCertificate: boolean;
  /** Certificate expiration time */
  expiresAt?: number;
  /** Remaining validity in milliseconds */
  remainingValidityMs?: number;
  /** Whether certificate needs renewal */
  needsRenewal: boolean;
  /** Server public keys */
  serverPublicKeys: Array<{
    keyId: number;
    publicKey: string;
    expiresAt: number;
  }>;
}

interface ValidateCertificateRequest {
  /** Certificate to validate (Base64) */
  certificate: string;
}

interface ValidateCertificateResponse {
  /** Whether certificate is valid */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Certificate details if valid */
  details?: {
    senderUserId: string;
    senderDeviceId: string;
    expiresAt: number;
    remainingValidityMs: number;
  };
}

// ============================================================================
// In-memory certificate authority (for demo/testing)
// (In production, use proper key management)
// ============================================================================

interface ServerKey {
  keyId: number;
  publicKey: Uint8Array;
  privateKey: Uint8Array;
  expiresAt: number;
}

// Demo server key (in production, use proper ECDSA key pairs)
let currentServerKeyId = 1;
const serverKeys: Map<number, ServerKey> = new Map();

// Initialize demo key
const demoPublicKey = new Uint8Array(65);
crypto.getRandomValues(demoPublicKey);
demoPublicKey[0] = 0x04; // Uncompressed point prefix

const demoPrivateKey = new Uint8Array(32);
crypto.getRandomValues(demoPrivateKey);

serverKeys.set(1, {
  keyId: 1,
  publicKey: demoPublicKey,
  privateKey: demoPrivateKey,
  expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
});

// Track issued certificates
const issuedCertificates: Map<string, { userId: string; expiresAt: number }> =
  new Map();

// ============================================================================
// Helper Functions
// ============================================================================

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function getCurrentServerKey(): ServerKey | null {
  return serverKeys.get(currentServerKeyId) ?? null;
}

async function signCertificateContent(
  content: Uint8Array,
): Promise<Uint8Array> {
  // In production, use proper ECDSA signing
  // For demo, create a pseudo-signature
  const signatureData = new Uint8Array(64);

  // Simple hash-based signature (NOT cryptographically secure - demo only)
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    content as unknown as ArrayBuffer,
  );
  const hash = new Uint8Array(hashBuffer);

  signatureData.set(hash, 0);
  signatureData.set(hash, 32);

  return signatureData;
}

// ============================================================================
// POST - Issue Sender Certificate
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: IssueCertificateRequest = await request.json();

    // Validate request
    if (!body.userId || !body.deviceId || !body.identityKey) {
      return NextResponse.json(
        { error: "Missing required fields: userId, deviceId, identityKey" },
        { status: 400 },
      );
    }

    // Decode identity key
    let identityKeyBytes: Uint8Array;
    try {
      identityKeyBytes = base64ToBytes(body.identityKey);
    } catch {
      return NextResponse.json(
        { error: "Invalid identity key format" },
        { status: 400 },
      );
    }

    // Validate identity key length (P-256 uncompressed point)
    if (identityKeyBytes.length !== 65) {
      return NextResponse.json(
        {
          error: `Invalid identity key length: ${identityKeyBytes.length}, expected 65`,
        },
        { status: 400 },
      );
    }

    // In production, authenticate the user here
    // For demo, we'll accept any request

    // Calculate validity period
    const validityMs = Math.min(
      Math.max(
        body.validityMs ?? DEFAULT_CERTIFICATE_VALIDITY_MS,
        MIN_CERTIFICATE_VALIDITY_MS,
      ),
      MAX_CERTIFICATE_VALIDITY_MS,
    );

    const expiresAt = Date.now() + validityMs;

    // Get current server key
    const serverKey = getCurrentServerKey();
    if (!serverKey) {
      return NextResponse.json(
        { error: "Server signing key not available" },
        { status: 500 },
      );
    }

    // Create certificate content for signing
    const encoder = new TextEncoder();
    const userIdBytes = encoder.encode(body.userId);
    const deviceIdBytes = encoder.encode(body.deviceId);

    const expiresAtView = new DataView(new ArrayBuffer(8));
    expiresAtView.setBigUint64(0, BigInt(expiresAt), false);

    const contentToSign = new Uint8Array(
      1 +
        2 +
        userIdBytes.length +
        2 +
        deviceIdBytes.length +
        identityKeyBytes.length +
        8,
    );

    let offset = 0;
    contentToSign[offset++] = SEALED_SENDER_VERSION;
    contentToSign[offset++] = (userIdBytes.length >> 8) & 0xff;
    contentToSign[offset++] = userIdBytes.length & 0xff;
    contentToSign.set(userIdBytes, offset);
    offset += userIdBytes.length;
    contentToSign[offset++] = (deviceIdBytes.length >> 8) & 0xff;
    contentToSign[offset++] = deviceIdBytes.length & 0xff;
    contentToSign.set(deviceIdBytes, offset);
    offset += deviceIdBytes.length;
    contentToSign.set(identityKeyBytes, offset);
    offset += identityKeyBytes.length;
    contentToSign.set(new Uint8Array(expiresAtView.buffer), offset);

    // Sign the content
    const signature = await signCertificateContent(contentToSign);

    // Create certificate
    const certificate: SenderCertificate = {
      version: SEALED_SENDER_VERSION,
      senderUserId: body.userId,
      senderDeviceId: body.deviceId,
      senderIdentityKey: identityKeyBytes,
      expiresAt,
      signature,
      serverKeyId: serverKey.keyId,
    };

    // Serialize certificate
    const serializedCert = serializeCertificate(certificate);

    // Track issued certificate
    const certId = `${body.userId}:${body.deviceId}`;
    issuedCertificates.set(certId, { userId: body.userId, expiresAt });

    logger.info("Sender certificate issued", {
      userId: body.userId,
      deviceId: body.deviceId,
      expiresAt: new Date(expiresAt).toISOString(),
      serverKeyId: serverKey.keyId,
    });

    const response: IssueCertificateResponse = {
      certificate: {
        version: certificate.version,
        senderUserId: certificate.senderUserId,
        senderDeviceId: certificate.senderDeviceId,
        senderIdentityKey: bytesToBase64(certificate.senderIdentityKey),
        expiresAt: certificate.expiresAt,
        signature: bytesToBase64(certificate.signature),
        serverKeyId: certificate.serverKeyId,
      },
      serializedCertificate: bytesToBase64(serializedCert),
      serverPublicKey: bytesToBase64(serverKey.publicKey),
      serverKeyId: serverKey.keyId,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    logger.error("Failed to issue sender certificate", { error });
    return NextResponse.json(
      { error: "Failed to issue certificate" },
      { status: 500 },
    );
  }
}

// ============================================================================
// GET - Get Certificate Status
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const deviceId = searchParams.get("deviceId");
    const validateCert = searchParams.get("validate");

    // If validating a certificate
    if (validateCert) {
      try {
        const certBytes = base64ToBytes(validateCert);

        // Parse basic certificate structure
        let offset = 0;
        const version = certBytes[offset++];

        const userIdLen = (certBytes[offset] << 8) | certBytes[offset + 1];
        offset += 2;
        const certUserId = new TextDecoder().decode(
          certBytes.slice(offset, offset + userIdLen),
        );
        offset += userIdLen;

        const deviceIdLen = (certBytes[offset] << 8) | certBytes[offset + 1];
        offset += 2;
        const certDeviceId = new TextDecoder().decode(
          certBytes.slice(offset, offset + deviceIdLen),
        );
        offset += deviceIdLen;

        offset += 65; // Skip identity key

        const expiresAtView = new DataView(
          certBytes.buffer,
          certBytes.byteOffset + offset,
          8,
        );
        const certExpiresAt = Number(expiresAtView.getBigUint64(0, false));

        const now = Date.now();
        const expired = certExpiresAt < now;
        const remainingValidityMs = Math.max(0, certExpiresAt - now);

        const errors: string[] = [];
        if (version !== SEALED_SENDER_VERSION) {
          errors.push(`Unsupported version: ${version}`);
        }
        if (expired) {
          errors.push("Certificate has expired");
        }

        const response: ValidateCertificateResponse = {
          valid: errors.length === 0,
          errors,
          details:
            errors.length === 0
              ? {
                  senderUserId: certUserId,
                  senderDeviceId: certDeviceId,
                  expiresAt: certExpiresAt,
                  remainingValidityMs,
                }
              : undefined,
        };

        return NextResponse.json(response);
      } catch {
        return NextResponse.json({
          valid: false,
          errors: ["Invalid certificate format"],
        } as ValidateCertificateResponse);
      }
    }

    // Get status for user/device
    const now = Date.now();
    let hasValidCertificate = false;
    let expiresAt: number | undefined;
    let remainingValidityMs: number | undefined;
    let needsRenewal = true;

    if (userId && deviceId) {
      const certId = `${userId}:${deviceId}`;
      const certInfo = issuedCertificates.get(certId);

      if (certInfo && certInfo.expiresAt > now) {
        hasValidCertificate = true;
        expiresAt = certInfo.expiresAt;
        remainingValidityMs = certInfo.expiresAt - now;
        needsRenewal = remainingValidityMs < 4 * 60 * 60 * 1000; // 4 hours
      }
    }

    const publicKeys = Array.from(serverKeys.values()).map((key) => ({
      keyId: key.keyId,
      publicKey: bytesToBase64(key.publicKey),
      expiresAt: key.expiresAt,
    }));

    const response: CertificateStatusResponse = {
      hasValidCertificate,
      expiresAt,
      remainingValidityMs,
      needsRenewal,
      serverPublicKeys: publicKeys,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error("Failed to get certificate status", { error });
    return NextResponse.json(
      { error: "Failed to get certificate status" },
      { status: 500 },
    );
  }
}
