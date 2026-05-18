/**
 * Registration Lock API Routes
 *
 * Provides endpoints for managing registration locks including:
 * - GET: Get current lock state
 * - POST: Enable lock / verify lock / initiate recovery
 * - PUT: Change PIN / update settings
 * - DELETE: Disable lock
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  getRegistrationLockService,
  LockSetupOptions,
  LockVerificationOptions,
} from "@/services/auth/registration-lock.service";
import { RecoveryMethod } from "@/lib/auth/recovery-lock";

// ============================================================================
// Types
// ============================================================================

interface EnableLockRequest {
  action: "enable";
  pin: string;
  deviceId?: string;
  enableDeviceBinding?: boolean;
  trustedContacts?: Array<{
    name: string;
    contactMethod: "email" | "phone";
    contactValue: string;
  }>;
  enableTimeDelayedRecovery?: boolean;
  timeDelayHours?: number;
}

interface VerifyLockRequest {
  action: "verify";
  pin?: string;
  recoveryKey?: string;
  deviceId?: string;
}

interface InitiateRecoveryRequest {
  action: "initiate_recovery";
  method: RecoveryMethod;
  deviceId?: string;
}

interface CompleteRecoveryRequest {
  action: "complete_recovery";
  requestId: string;
  completionToken: string;
}

interface RecordContactResponseRequest {
  action: "contact_response";
  requestId: string;
  contactId: string;
  approved: boolean;
  message?: string;
}

interface VerifyIdentityRequest {
  action: "verify_identity";
  requestId: string;
  provider: string;
  verified: boolean;
  userId?: string;
}

interface AddTrustedContactRequest {
  action: "add_contact";
  name: string;
  contactMethod: "email" | "phone";
  contactValue: string;
}

interface VerifyTrustedContactRequest {
  action: "verify_contact";
  contactId: string;
  verificationCode: string;
}

interface RemoveTrustedContactRequest {
  action: "remove_contact";
  contactId: string;
}

interface CheckTimeDelayedRequest {
  action: "check_time_delayed";
  requestId: string;
}

interface CancelRecoveryRequest {
  action: "cancel_recovery";
  requestId: string;
}

type PostRequestBody =
  | EnableLockRequest
  | VerifyLockRequest
  | InitiateRecoveryRequest
  | CompleteRecoveryRequest
  | RecordContactResponseRequest
  | VerifyIdentityRequest
  | AddTrustedContactRequest
  | VerifyTrustedContactRequest
  | RemoveTrustedContactRequest
  | CheckTimeDelayedRequest
  | CancelRecoveryRequest;

interface ChangePinRequest {
  action: "change_pin";
  currentPin: string;
  newPin: string;
  deviceId?: string;
}

interface AddBoundDeviceRequest {
  action: "add_device";
  deviceId: string;
  pin: string;
}

interface RemoveBoundDeviceRequest {
  action: "remove_device";
  deviceId: string;
  pin: string;
}

type PutRequestBody =
  | ChangePinRequest
  | AddBoundDeviceRequest
  | RemoveBoundDeviceRequest;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the user ID from the request (would come from auth middleware in production)
 */
function getUserId(request: NextRequest): string | null {
  // In production, this would come from authenticated session
  // For now, use header or query param for testing
  const userId = request.headers.get("x-user-id") || "test-user";
  return userId;
}

/**
 * Gets the IP address from the request
 */
function getIpAddress(request: NextRequest): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    null
  );
}

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = getRegistrationLockService();
    await service.initialize(userId);

    const state = service.getCombinedState();

    // Sanitize response - don't expose hashes
    const response = {
      registrationLock: {
        enabled: state.registrationLock.enabled,
        status: state.registrationLock.status,
        createdAt: state.registrationLock.createdAt,
        expiresAt: state.registrationLock.expiresAt,
        lockedUntil: state.registrationLock.lockedUntil,
        failedAttempts: state.registrationLock.failedAttempts,
        boundDevices: state.registrationLock.boundDevices,
        lastVerifiedAt: state.registrationLock.lastVerifiedAt,
        hasRecoveryKey: !!state.registrationLock.recoveryKeyHash,
      },
      recoveryLock: {
        isSetUp: state.recoveryLock.isSetUp,
        availableMethods: state.recoveryLock.availableMethods,
        trustedContactCount: state.recoveryLock.trustedContacts.filter(
          (c) => c.verified,
        ).length,
        activeRequestCount: state.recoveryLock.activeRequests.length,
        successfulRecoveries: state.recoveryLock.successfulRecoveries,
      },
      isBlocked: state.isBlocked,
      blockReason: state.blockReason,
      recoveryOptionsAvailable: state.recoveryOptionsAvailable,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error("Failed to get registration lock state", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ipAddress = getIpAddress(request);
    const body = (await request.json()) as PostRequestBody;

    if (!body || !body.action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    const service = getRegistrationLockService();
    await service.initialize(userId);

    switch (body.action) {
      case "enable": {
        const {
          pin,
          deviceId,
          enableDeviceBinding,
          trustedContacts,
          enableTimeDelayedRecovery,
          timeDelayHours,
        } = body as EnableLockRequest;

        if (!pin) {
          return NextResponse.json(
            { error: "PIN is required" },
            { status: 400 },
          );
        }

        const options: LockSetupOptions = {
          pin,
          deviceId,
          enableDeviceBinding,
          trustedContacts,
          enableTimeDelayedRecovery,
          timeDelayHours,
        };

        const result = await service.setupLock(options);

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          recoveryKey: result.recoveryKey,
          trustedContactCodes: result.trustedContactCodes,
          message:
            "Registration lock enabled. Save your recovery key securely.",
        });
      }

      case "verify": {
        const { pin, recoveryKey, deviceId } = body as VerifyLockRequest;

        const options: LockVerificationOptions = {
          pin,
          recoveryKey,
          deviceId,
          ipAddress: ipAddress ?? undefined,
        };

        const result = await service.verifyLock(options);

        if (!result.success) {
          return NextResponse.json(
            {
              error: result.error,
              remainingAttempts: result.remainingAttempts,
              lockoutExpiresAt: result.lockoutExpiresAt,
              availableRecoveryMethods: result.availableRecoveryMethods,
            },
            { status: result.lockoutExpiresAt ? 429 : 401 },
          );
        }

        return NextResponse.json({
          success: true,
          method: result.method,
        });
      }

      case "initiate_recovery": {
        const { method, deviceId } = body as InitiateRecoveryRequest;

        if (!method) {
          return NextResponse.json(
            { error: "Recovery method is required" },
            { status: 400 },
          );
        }

        const result = await service.initiateRecovery(
          method,
          deviceId,
          ipAddress ?? undefined,
        );

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          status: result.newStatus,
          canCompleteAt: result.canCompleteAt,
        });
      }

      case "complete_recovery": {
        const { requestId, completionToken } = body as CompleteRecoveryRequest;

        if (!requestId || !completionToken) {
          return NextResponse.json(
            { error: "Request ID and completion token are required" },
            { status: 400 },
          );
        }

        const result = await service.completeRecovery(
          requestId,
          completionToken,
        );

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          message:
            "Account recovered successfully. Please set up a new registration lock.",
        });
      }

      case "contact_response": {
        const { requestId, contactId, approved, message } =
          body as RecordContactResponseRequest;

        if (!requestId || !contactId || approved === undefined) {
          return NextResponse.json(
            {
              error: "Request ID, contact ID, and approval status are required",
            },
            { status: 400 },
          );
        }

        const result = await service.recordContactResponse(
          requestId,
          contactId,
          approved,
          message,
        );

        if (!result.success && result.newStatus !== "waiting_contacts") {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
          success: result.success,
          status: result.newStatus,
          completionToken: result.completionToken,
        });
      }

      case "verify_identity": {
        const {
          requestId,
          provider,
          verified,
          userId: verifiedUserId,
        } = body as VerifyIdentityRequest;

        if (!requestId || !provider || verified === undefined) {
          return NextResponse.json(
            {
              error:
                "Request ID, provider, and verification status are required",
            },
            { status: 400 },
          );
        }

        const result = await service.verifyIdentity(requestId, {
          provider,
          verified,
          userId: verifiedUserId,
          verifiedAt: new Date(),
        });

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          status: result.newStatus,
          completionToken: result.completionToken,
        });
      }

      case "add_contact": {
        const { name, contactMethod, contactValue } =
          body as AddTrustedContactRequest;

        if (!name || !contactMethod || !contactValue) {
          return NextResponse.json(
            { error: "Name, contact method, and contact value are required" },
            { status: 400 },
          );
        }

        const result = await service.addTrustedContact(
          name,
          contactMethod,
          contactValue,
        );

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          contactId: result.contact?.id,
          verificationCode: result.verificationCode,
          message: "Send this verification code to your trusted contact.",
        });
      }

      case "verify_contact": {
        const { contactId, verificationCode } =
          body as VerifyTrustedContactRequest;

        if (!contactId || !verificationCode) {
          return NextResponse.json(
            { error: "Contact ID and verification code are required" },
            { status: 400 },
          );
        }

        const result = await service.verifyTrustedContact(
          contactId,
          verificationCode,
        );

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          message: "Trusted contact verified.",
        });
      }

      case "remove_contact": {
        const { contactId } = body as RemoveTrustedContactRequest;

        if (!contactId) {
          return NextResponse.json(
            { error: "Contact ID is required" },
            { status: 400 },
          );
        }

        const result = await service.removeTrustedContact(contactId);

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          message: "Trusted contact removed.",
        });
      }

      case "check_time_delayed": {
        const { requestId } = body as CheckTimeDelayedRequest;

        if (!requestId) {
          return NextResponse.json(
            { error: "Request ID is required" },
            { status: 400 },
          );
        }

        const result = await service.checkTimeDelayedRecovery(requestId);

        return NextResponse.json({
          success: result.success,
          status: result.newStatus,
          canCompleteAt: result.canCompleteAt,
          completionToken: result.completionToken,
          error: result.error,
        });
      }

      case "cancel_recovery": {
        const { requestId } = body as CancelRecoveryRequest;

        if (!requestId) {
          return NextResponse.json(
            { error: "Request ID is required" },
            { status: 400 },
          );
        }

        const result = await service.cancelRecoveryRequest(requestId);

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          message: "Recovery request cancelled.",
        });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    logger.error("Failed to process registration lock request", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================================================
// PUT Handler
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as PutRequestBody;

    if (!body || !body.action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    const service = getRegistrationLockService();
    await service.initialize(userId);

    switch (body.action) {
      case "change_pin": {
        const { currentPin, newPin, deviceId } = body as ChangePinRequest;

        if (!currentPin || !newPin) {
          return NextResponse.json(
            { error: "Current PIN and new PIN are required" },
            { status: 400 },
          );
        }

        const result = await service.changePin(currentPin, newPin, deviceId);

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          message: "PIN changed successfully.",
        });
      }

      case "add_device": {
        const { deviceId, pin } = body as AddBoundDeviceRequest;

        if (!deviceId || !pin) {
          return NextResponse.json(
            { error: "Device ID and PIN are required" },
            { status: 400 },
          );
        }

        const result = await service.addBoundDevice(deviceId, pin);

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          message: "Device added successfully.",
        });
      }

      case "remove_device": {
        const { deviceId, pin } = body as RemoveBoundDeviceRequest;

        if (!deviceId || !pin) {
          return NextResponse.json(
            { error: "Device ID and PIN are required" },
            { status: 400 },
          );
        }

        const result = await service.removeBoundDevice(deviceId, pin);

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          message: "Device removed successfully.",
        });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    logger.error("Failed to update registration lock", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE Handler
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pin = searchParams.get("pin");
    const deviceId = searchParams.get("deviceId");

    if (!pin) {
      return NextResponse.json(
        { error: "PIN is required to disable lock" },
        { status: 400 },
      );
    }

    const service = getRegistrationLockService();
    await service.initialize(userId);

    const result = await service.disableLock(pin, deviceId ?? undefined);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Registration lock disabled.",
    });
  } catch (error) {
    logger.error("Failed to disable registration lock", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
