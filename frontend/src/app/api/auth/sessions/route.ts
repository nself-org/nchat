/**
 * Sessions API Route
 *
 * Endpoints:
 * - GET /api/auth/sessions - List user sessions/devices
 * - POST /api/auth/sessions - Create new session (with anti-session-fixation)
 * - PUT /api/auth/sessions - Rotate session ID (anti-session-fixation refresh)
 * - DELETE /api/auth/sessions - Revoke session(s)
 *
 * Anti-Session-Fixation Measures:
 * - New session ID generated on every login
 * - Session ID rotation on privilege elevation
 * - Session ID rotation on sensitive operations
 * - Old session IDs invalidated immediately
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { sessionManager } from "@/lib/auth/session-manager";
import type { Session, SessionLocation } from "@/lib/security/session-store";

import { logger } from "@/lib/logger";

// ============================================================================
// Types for Device Listing
// ============================================================================

interface DeviceInfo {
  id: string;
  name: string;
  type: "mobile" | "tablet" | "desktop";
  platform: "web" | "ios" | "android" | "electron" | "tauri";
  browser?: string;
  os: string;
  lastActive: string;
  isCurrent: boolean;
  ipAddress?: string;
  location?: SessionLocation;
  trusted: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

function sessionToDeviceInfo(session: Session): DeviceInfo {
  const deviceType = getDeviceType(session.device);
  const platform = getPlatformFromOS(session.os);

  return {
    id: session.id,
    name: `${session.browser} on ${session.os}`,
    type: deviceType,
    platform,
    browser: session.browser,
    os: session.os,
    lastActive: session.lastActiveAt,
    isCurrent: session.isCurrent,
    ipAddress: session.ipAddress,
    location: session.location,
    trusted: true, // Would be determined by device trust status in production
  };
}

function getDeviceType(device: string): "mobile" | "tablet" | "desktop" {
  const lower = device.toLowerCase();
  if (lower.includes("mobile") || lower.includes("phone")) return "mobile";
  if (lower.includes("tablet") || lower.includes("ipad")) return "tablet";
  return "desktop";
}

function getPlatformFromOS(
  os: string,
): "web" | "ios" | "android" | "electron" | "tauri" {
  const lower = os.toLowerCase();
  if (
    lower.includes("ios") ||
    lower.includes("iphone") ||
    lower.includes("ipad")
  )
    return "ios";
  if (lower.includes("android")) return "android";
  return "web";
}

function generateNewSessionId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = randomBytes(8).toString("hex");
  return `sess_${timestamp}_${randomPart}`;
}

// ============================================================================
// GET - List Sessions / Devices
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const format = searchParams.get("format") || "sessions"; // 'sessions' or 'devices'

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Fetch sessions from database via GraphQL
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://localhost:8080/v1/graphql"}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            query GetUserSessions($userId: uuid!) {
              nchat_user_sessions(
                where: { user_id: { _eq: $userId } }
                order_by: { last_active_at: desc }
              ) {
                id
                user_id
                device
                browser
                os
                ip_address
                location
                is_current
                created_at
                last_active_at
                expires_at
              }
            }
          `,
          variables: { userId },
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch sessions from GraphQL");
    }

    const data = await response.json();

    // Validate sessions and filter expired ones
    const sessions = data.data?.nchat_user_sessions || [];
    const validSessions = sessions.filter((session: Session) => {
      return sessionManager.validateSession(session).valid;
    });

    // Return device format if requested
    if (format === "devices") {
      const devices = validSessions.map(sessionToDeviceInfo);
      return NextResponse.json({
        devices,
        total: devices.length,
        currentDevice: devices.find((d: DeviceInfo) => d.isCurrent) || null,
      });
    }

    // Return sessions format (default)
    return NextResponse.json({
      sessions: validSessions,
      total: validSessions.length,
    });
  } catch (error) {
    logger.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 },
    );
  }
}

// ============================================================================
// PUT - Rotate Session ID (Anti-Session-Fixation)
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, currentSessionId, reason } = body;

    if (!userId || !currentSessionId) {
      return NextResponse.json(
        { error: "User ID and current session ID required" },
        { status: 400 },
      );
    }

    // Generate new session ID
    const newSessionId = generateNewSessionId();
    const now = new Date().toISOString();

    // Update session in database with new ID (atomic operation)
    const graphqlUrl =
      process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://localhost:8080/v1/graphql";

    // First, get the current session data
    const getResponse = await fetch(graphqlUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          query GetSession($sessionId: uuid!) {
            nchat_user_sessions_by_pk(id: $sessionId) {
              id
              user_id
              device
              browser
              os
              ip_address
              location
              is_current
              created_at
              expires_at
            }
          }
        `,
        variables: { sessionId: currentSessionId },
      }),
    });

    if (!getResponse.ok) {
      throw new Error("Failed to fetch current session");
    }

    const getData = await getResponse.json();
    const currentSession = getData.data?.nchat_user_sessions_by_pk;

    if (!currentSession || currentSession.user_id !== userId) {
      return NextResponse.json(
        { error: "Session not found or unauthorized" },
        { status: 404 },
      );
    }

    // Delete old session and create new one (atomic via transaction in production)
    const rotateResponse = await fetch(graphqlUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          mutation RotateSession(
            $oldSessionId: uuid!
            $newSession: nchat_user_sessions_insert_input!
          ) {
            delete_nchat_user_sessions_by_pk(id: $oldSessionId) {
              id
            }
            insert_nchat_user_sessions_one(object: $newSession) {
              id
              user_id
              device
              browser
              os
              ip_address
              location
              is_current
              created_at
              last_active_at
              expires_at
            }
          }
        `,
        variables: {
          oldSessionId: currentSessionId,
          newSession: {
            id: newSessionId,
            user_id: currentSession.user_id,
            device: currentSession.device,
            browser: currentSession.browser,
            os: currentSession.os,
            ip_address: currentSession.ip_address,
            location: currentSession.location,
            is_current: currentSession.is_current,
            created_at: currentSession.created_at, // Preserve original creation time
            last_active_at: now,
            expires_at: currentSession.expires_at,
          },
        },
      }),
    });

    if (!rotateResponse.ok) {
      throw new Error("Failed to rotate session ID");
    }

    const rotateData = await rotateResponse.json();
    const newSession = rotateData.data?.insert_nchat_user_sessions_one;

    logger.info("Session ID rotated for anti-session-fixation", {
      userId,
      oldSessionId: currentSessionId.slice(0, 8) + "...",
      newSessionId: newSessionId.slice(0, 8) + "...",
      reason: reason || "scheduled_rotation",
    });

    return NextResponse.json({
      success: true,
      session: newSession,
      oldSessionId: currentSessionId,
      newSessionId,
      rotatedAt: now,
    });
  } catch (error) {
    logger.error("Error rotating session ID:", error);
    return NextResponse.json(
      { error: "Failed to rotate session ID" },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST - Create Session (with Anti-Session-Fixation)
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      rememberMe,
      deviceFingerprint,
      ipAddress,
      invalidatePreviousSession,
    } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    if (!ipAddress) {
      return NextResponse.json(
        { error: "IP address required" },
        { status: 400 },
      );
    }

    // ANTI-SESSION-FIXATION: Optionally invalidate any previous session for this device
    if (invalidatePreviousSession && deviceFingerprint?.hash) {
      try {
        const graphqlUrl =
          process.env.NEXT_PUBLIC_GRAPHQL_URL ||
          "http://localhost:8080/v1/graphql";
        await fetch(graphqlUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `
              mutation InvalidatePreviousSessions($userId: uuid!, $deviceHash: String!) {
                delete_nchat_user_sessions(
                  where: {
                    user_id: { _eq: $userId }
                    device_fingerprint_hash: { _eq: $deviceHash }
                  }
                ) {
                  affected_rows
                }
              }
            `,
            variables: {
              userId,
              deviceHash: deviceFingerprint.hash,
            },
          }),
        });
      } catch (error) {
        logger.warn("Failed to invalidate previous sessions:", {
          context: String(error),
        });
        // Continue with session creation even if invalidation fails
      }
    }

    // Get location from IP (using a geolocation service)
    let location = undefined;
    try {
      const geoResponse = await fetch(`https://ipapi.co/${ipAddress}/json/`);
      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        location = {
          city: geoData.city,
          country: geoData.country_name,
          region: geoData.region,
          countryCode: geoData.country_code,
        };
      }
    } catch (error) {
      logger.warn("Failed to get geolocation:", { context: error });
    }

    // Create session
    const session = await sessionManager.createSession({
      userId,
      rememberMe,
      deviceFingerprint,
      location,
      ipAddress,
    });

    // In production, save to database via GraphQL
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://localhost:8080/v1/graphql"}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            mutation CreateSession($session: nchat_user_sessions_insert_input!) {
              insert_nchat_user_sessions_one(object: $session) {
                id
                user_id
                device
                browser
                os
                ip_address
                location
                is_current
                created_at
                last_active_at
                expires_at
              }
            }
          `,
          variables: {
            session: {
              id: session.id,
              user_id: session.userId,
              device: session.device,
              browser: session.browser,
              os: session.os,
              ip_address: session.ipAddress,
              location: session.location,
              is_current: session.isCurrent,
              created_at: session.createdAt,
              last_active_at: session.lastActiveAt,
              expires_at: session.expiresAt,
            },
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to save session to database");
    }

    const data = await response.json();
    const createdSession = data.data?.insert_nchat_user_sessions_one;

    // Check for suspicious activity
    const previousSessionsResponse = await fetch(
      `${process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://localhost:8080/v1/graphql"}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            query GetPreviousSessions($userId: uuid!, $currentSessionId: uuid!) {
              nchat_user_sessions(
                where: {
                  user_id: { _eq: $userId }
                  id: { _neq: $currentSessionId }
                }
                order_by: { created_at: desc }
                limit: 10
              ) {
                id
                device
                browser
                os
                location
                created_at
              }
            }
          `,
          variables: {
            userId,
            currentSessionId: session.id,
          },
        }),
      },
    );

    let suspiciousActivity = null;
    if (previousSessionsResponse.ok) {
      const previousData = await previousSessionsResponse.json();
      const previousSessions = previousData.data?.nchat_user_sessions || [];

      suspiciousActivity = sessionManager.detectSuspiciousActivity(
        session,
        previousSessions,
      );
    }

    return NextResponse.json({
      session: createdSession || session,
      suspiciousActivity,
    });
  } catch (error) {
    logger.error("Error creating session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE - Revoke Session
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get("sessionId");
    const userId = searchParams.get("userId");
    const revokeAll = searchParams.get("revokeAll") === "true";

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    if (revokeAll) {
      // Revoke all other sessions (keep current)
      const currentSessionId = searchParams.get("currentSessionId");

      if (!currentSessionId) {
        return NextResponse.json(
          { error: "Current session ID required" },
          { status: 400 },
        );
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://localhost:8080/v1/graphql"}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `
              mutation RevokeAllOtherSessions($userId: uuid!, $currentSessionId: uuid!) {
                delete_nchat_user_sessions(
                  where: {
                    user_id: { _eq: $userId }
                    id: { _neq: $currentSessionId }
                  }
                ) {
                  affected_rows
                }
              }
            `,
            variables: {
              userId,
              currentSessionId,
            },
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to revoke sessions");
      }

      const data = await response.json();
      const affectedRows =
        data.data?.delete_nchat_user_sessions?.affected_rows || 0;

      return NextResponse.json({
        success: true,
        revokedCount: affectedRows,
      });
    } else {
      // Revoke single session
      if (!sessionId) {
        return NextResponse.json(
          { error: "Session ID required" },
          { status: 400 },
        );
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://localhost:8080/v1/graphql"}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `
              mutation RevokeSession($sessionId: uuid!) {
                delete_nchat_user_sessions_by_pk(id: $sessionId) {
                  id
                }
              }
            `,
            variables: {
              sessionId,
            },
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to revoke session");
      }

      return NextResponse.json({
        success: true,
        revokedSessionId: sessionId,
      });
    }
  } catch (error) {
    logger.error("Error revoking session:", error);
    return NextResponse.json(
      { error: "Failed to revoke session" },
      { status: 500 },
    );
  }
}
