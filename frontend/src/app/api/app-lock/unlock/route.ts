/**
 * App Lock Unlock Verification API Route
 *
 * Provides server-side unlock event logging and verification.
 * The actual unlock is performed client-side, but this endpoint
 * can be used to:
 * 1. Log unlock events for audit
 * 2. Validate unlock tokens (if implemented)
 * 3. Sync unlock state with server
 *
 * Endpoints:
 * - POST /api/app-lock/unlock - Log an unlock event
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apolloClient } from "@/lib/apollo-client";
import { gql } from "@apollo/client";
import {
  withAuth,
  withRateLimit,
  withErrorHandler,
  compose,
  type AuthenticatedRequest,
  getClientIp,
} from "@/lib/api/middleware";
import {
  successResponse,
  errorResponse,
  badRequestResponse,
  validationErrorResponse,
} from "@/lib/api/response";
import { logger } from "@/lib/logger";

// ============================================================================
// GraphQL Mutations
// ============================================================================

const INSERT_UNLOCK_EVENT = gql`
  mutation InsertUnlockEvent(
    $userId: uuid!
    $method: String!
    $success: Boolean!
    $ipAddress: String
    $userAgent: String
    $platform: String
    $failureReason: String
  ) {
    insert_nchat_app_lock_events_one(
      object: {
        user_id: $userId
        event_type: "unlock"
        method: $method
        success: $success
        ip_address: $ipAddress
        user_agent: $userAgent
        platform: $platform
        failure_reason: $failureReason
      }
    ) {
      id
      created_at
    }
  }
`;

const INSERT_LOCK_EVENT = gql`
  mutation InsertLockEvent(
    $userId: uuid!
    $trigger: String!
    $ipAddress: String
    $userAgent: String
    $platform: String
  ) {
    insert_nchat_app_lock_events_one(
      object: {
        user_id: $userId
        event_type: "lock"
        method: $trigger
        success: true
        ip_address: $ipAddress
        user_agent: $userAgent
        platform: $platform
      }
    ) {
      id
      created_at
    }
  }
`;

const GET_RECENT_EVENTS = gql`
  query GetRecentLockEvents($userId: uuid!, $limit: Int!) {
    nchat_app_lock_events(
      where: { user_id: { _eq: $userId } }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      id
      event_type
      method
      success
      platform
      created_at
    }
  }
`;

// ============================================================================
// Types
// ============================================================================

interface UnlockEvent {
  id: string;
  created_at: string;
}

interface LockEvent {
  id: string;
  event_type: string;
  method: string;
  success: boolean;
  platform: string | null;
  created_at: string;
}

// ============================================================================
// Validation Schemas
// ============================================================================

const unlockEventSchema = z.object({
  method: z.enum(["pin", "biometric"]),
  success: z.boolean(),
  failureReason: z.string().optional(),
  platform: z.string().optional(),
});

const lockEventSchema = z.object({
  trigger: z.enum(["manual", "idle", "background", "launch"]),
  platform: z.string().optional(),
});

// ============================================================================
// POST Handler - Log Unlock Event
// ============================================================================

async function handlePost(
  request: AuthenticatedRequest,
): Promise<NextResponse> {
  const userId = request.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequestResponse("Invalid JSON body");
  }

  // Determine if this is an unlock or lock event
  const bodyObj = body as Record<string, unknown>;
  const isLockEvent = "trigger" in bodyObj;

  if (isLockEvent) {
    // Handle lock event
    const validation = lockEventSchema.safeParse(body);
    if (!validation.success) {
      const errors: Record<string, string[]> = {};
      for (const error of validation.error.errors) {
        const path = error.path.join(".");
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(
          error instanceof Error ? error.message : String(error),
        );
      }
      return validationErrorResponse(errors);
    }

    const { trigger, platform } = validation.data;

    try {
      const { data } = await apolloClient.mutate<{
        insert_nchat_app_lock_events_one: UnlockEvent;
      }>({
        mutation: INSERT_LOCK_EVENT,
        variables: {
          userId,
          trigger,
          ipAddress: getClientIp(request),
          userAgent: request.headers.get("user-agent"),
          platform:
            platform ||
            detectPlatformFromUA(request.headers.get("user-agent") || ""),
        },
      });

      logger.info("[AppLockUnlock] Lock event logged", {
        userId,
        trigger,
        eventId: data?.insert_nchat_app_lock_events_one?.id,
      });

      return successResponse({
        logged: true,
        eventId: data?.insert_nchat_app_lock_events_one?.id,
        timestamp: data?.insert_nchat_app_lock_events_one?.created_at,
      });
    } catch (error) {
      // Log events are non-critical, don't fail the request
      logger.error(
        "[AppLockUnlock] Failed to log lock event",
        error instanceof Error ? error : new Error(String(error)),
      );
      return successResponse({
        logged: false,
        message: "Lock event acknowledged but not logged",
      });
    }
  } else {
    // Handle unlock event
    const validation = unlockEventSchema.safeParse(body);
    if (!validation.success) {
      const errors: Record<string, string[]> = {};
      for (const error of validation.error.errors) {
        const path = error.path.join(".");
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(
          error instanceof Error ? error.message : String(error),
        );
      }
      return validationErrorResponse(errors);
    }

    const { method, success, failureReason, platform } = validation.data;

    try {
      const { data } = await apolloClient.mutate<{
        insert_nchat_app_lock_events_one: UnlockEvent;
      }>({
        mutation: INSERT_UNLOCK_EVENT,
        variables: {
          userId,
          method,
          success,
          ipAddress: getClientIp(request),
          userAgent: request.headers.get("user-agent"),
          platform:
            platform ||
            detectPlatformFromUA(request.headers.get("user-agent") || ""),
          failureReason: success ? null : failureReason,
        },
      });

      logger.info("[AppLockUnlock] Unlock event logged", {
        userId,
        method,
        success,
        eventId: data?.insert_nchat_app_lock_events_one?.id,
      });

      return successResponse({
        logged: true,
        eventId: data?.insert_nchat_app_lock_events_one?.id,
        timestamp: data?.insert_nchat_app_lock_events_one?.created_at,
      });
    } catch (error) {
      // Log events are non-critical, don't fail the request
      logger.error(
        "[AppLockUnlock] Failed to log unlock event",
        error instanceof Error ? error : new Error(String(error)),
      );
      return successResponse({
        logged: false,
        message: "Unlock event acknowledged but not logged",
      });
    }
  }
}

// ============================================================================
// GET Handler - Get Recent Events
// ============================================================================

async function handleGet(request: AuthenticatedRequest): Promise<NextResponse> {
  const userId = request.user.id;
  const url = new URL(request.url);
  const limit = Math.min(
    parseInt(url.searchParams.get("limit") || "10", 10),
    100,
  );

  try {
    const { data } = await apolloClient.query<{
      nchat_app_lock_events: LockEvent[];
    }>({
      query: GET_RECENT_EVENTS,
      variables: { userId, limit },
      fetchPolicy: "network-only",
    });

    return successResponse({
      events: data.nchat_app_lock_events.map((event) => ({
        id: event.id,
        type: event.event_type,
        method: event.method,
        success: event.success,
        platform: event.platform,
        timestamp: event.created_at,
      })),
    });
  } catch (error) {
    logger.error(
      "[AppLockUnlock] Failed to get events",
      error instanceof Error ? error : new Error(String(error)),
    );
    return errorResponse(
      "Failed to get lock events",
      "EVENTS_FETCH_FAILED",
      500,
    );
  }
}

// ============================================================================
// Helpers
// ============================================================================

function detectPlatformFromUA(userAgent: string): string {
  if (/iPhone|iPad|iPod/.test(userAgent)) return "ios";
  if (/Android/.test(userAgent)) return "android";
  if (/Macintosh|Mac OS X/.test(userAgent)) return "macos";
  if (/Windows/.test(userAgent)) return "windows";
  if (/Linux/.test(userAgent)) return "linux";
  return "web";
}

// ============================================================================
// Exports
// ============================================================================

export const POST = compose(
  withErrorHandler,
  withRateLimit({ limit: 60, window: 60 }),
  withAuth,
)(handlePost);

export const GET = compose(
  withErrorHandler,
  withRateLimit({ limit: 30, window: 60 }),
  withAuth,
)(handleGet);
