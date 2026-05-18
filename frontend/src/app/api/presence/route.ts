/**
 * Presence API Route
 *
 * Provides REST API endpoints for managing user presence:
 * - GET: Fetch presence status for user(s), or list online users
 * - POST: Update own presence status, custom status, and device info
 * - DELETE: Clear custom status or go offline
 *
 * This is a demo/dev implementation using in-memory storage.
 * In production, this would be backed by Redis or a database with
 * real-time subscriptions via GraphQL/WebSocket.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// Types & Validation Schemas
// ============================================================================

const PresenceStatusSchema = z.enum([
  "online",
  "away",
  "dnd",
  "invisible",
  "offline",
]);

const UpdatePresenceSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  status: PresenceStatusSchema.optional(),
  customStatus: z
    .object({
      emoji: z.string().max(50).optional(),
      text: z
        .string()
        .max(100, "Custom status text must be 100 characters or fewer")
        .optional(),
      activity: z.string().max(50).optional(),
    })
    .optional()
    .nullable(),
  expiresAt: z
    .string()
    .datetime({ message: "expiresAt must be a valid ISO 8601 datetime" })
    .optional()
    .nullable(),
  device: z
    .object({
      type: z.enum(["web", "desktop", "mobile", "tablet"]).optional(),
      os: z.string().max(50).optional(),
      browser: z.string().max(50).optional(),
    })
    .optional(),
});

const QueryPresenceSchema = z.object({
  userId: z.string().optional(),
  userIds: z.string().optional(), // comma-separated
  channelId: z.string().optional(),
  status: PresenceStatusSchema.optional(), // filter by status
});

type PresenceStatus = z.infer<typeof PresenceStatusSchema>;

interface DeviceInfo {
  type?: "web" | "desktop" | "mobile" | "tablet";
  os?: string;
  browser?: string;
}

interface PresenceRecord {
  userId: string;
  status: PresenceStatus;
  customStatus: {
    emoji?: string;
    text?: string;
    activity?: string;
  } | null;
  expiresAt: string | null;
  lastSeenAt: string;
  updatedAt: string;
  device: DeviceInfo | null;
}

// ============================================================================
// In-Memory Presence Store (Demo/Dev)
// ============================================================================

/**
 * In-memory presence store seeded with the 8 dev test users.
 * In production this would be Redis or a database table.
 */
const presenceStore = new Map<string, PresenceRecord>();

// Seed demo data for the 8 test users defined in project context
const DEMO_USERS: Array<{
  userId: string;
  email: string;
  status: PresenceStatus;
  customStatus: PresenceRecord["customStatus"];
  device: DeviceInfo;
  minutesAgo: number;
}> = [
  {
    userId: "user-owner",
    email: "owner@nself.org",
    status: "online",
    customStatus: { emoji: "🚀", text: "Building nchat", activity: "focusing" },
    device: { type: "web", os: "macOS", browser: "Chrome" },
    minutesAgo: 0,
  },
  {
    userId: "user-admin",
    email: "admin@nself.org",
    status: "online",
    customStatus: null,
    device: { type: "desktop", os: "Windows", browser: "Electron" },
    minutesAgo: 2,
  },
  {
    userId: "user-moderator",
    email: "moderator@nself.org",
    status: "away",
    customStatus: { emoji: "🍔", text: "Lunch break" },
    device: { type: "web", os: "macOS", browser: "Safari" },
    minutesAgo: 15,
  },
  {
    userId: "user-member",
    email: "member@nself.org",
    status: "dnd",
    customStatus: { emoji: "📅", text: "In a meeting", activity: "in_meeting" },
    device: { type: "mobile", os: "iOS" },
    minutesAgo: 5,
  },
  {
    userId: "user-guest",
    email: "guest@nself.org",
    status: "offline",
    customStatus: null,
    device: { type: "web", os: "Linux", browser: "Firefox" },
    minutesAgo: 120,
  },
  {
    userId: "user-alice",
    email: "alice@nself.org",
    status: "online",
    customStatus: {
      emoji: "🏠",
      text: "Working remotely",
      activity: "working_remotely",
    },
    device: { type: "web", os: "macOS", browser: "Chrome" },
    minutesAgo: 1,
  },
  {
    userId: "user-bob",
    email: "bob@nself.org",
    status: "away",
    customStatus: { emoji: "🚗", text: "Commuting", activity: "commuting" },
    device: { type: "mobile", os: "Android" },
    minutesAgo: 30,
  },
  {
    userId: "user-charlie",
    email: "charlie@nself.org",
    status: "online",
    customStatus: null,
    device: { type: "desktop", os: "macOS", browser: "Electron" },
    minutesAgo: 0,
  },
];

// Initialize the store with demo data
function initializeStore(): void {
  if (presenceStore.size > 0) return;

  const now = Date.now();
  for (const user of DEMO_USERS) {
    const lastSeen = new Date(now - user.minutesAgo * 60 * 1000);
    presenceStore.set(user.userId, {
      userId: user.userId,
      status: user.status,
      customStatus: user.customStatus,
      expiresAt: null,
      lastSeenAt: lastSeen.toISOString(),
      updatedAt: lastSeen.toISOString(),
      device: user.device,
    });
  }
}

// Demo channel membership mapping for channelId queries
const DEMO_CHANNEL_MEMBERS: Record<string, string[]> = {
  "channel-general": [
    "user-owner",
    "user-admin",
    "user-moderator",
    "user-member",
    "user-guest",
    "user-alice",
    "user-bob",
    "user-charlie",
  ],
  "channel-random": [
    "user-owner",
    "user-admin",
    "user-alice",
    "user-bob",
    "user-charlie",
  ],
  "channel-dev": ["user-owner", "user-admin", "user-alice", "user-charlie"],
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Transform internal record to API response format
 */
function transformPresence(record: PresenceRecord) {
  // Check if custom status has expired
  let customStatus = record.customStatus;
  if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
    customStatus = null;
  }

  // Invisible users appear as offline to other users
  const publicStatus =
    record.status === "invisible" ? "offline" : record.status;

  return {
    userId: record.userId,
    status: publicStatus,
    customStatus,
    lastSeenAt: record.lastSeenAt,
    updatedAt: record.updatedAt,
    device: record.device
      ? { type: record.device.type, os: record.device.os }
      : null,
  };
}

/**
 * Get presence for a single user, returning a default offline record if not found
 */
function getPresenceForUser(userId: string): PresenceRecord {
  return (
    presenceStore.get(userId) ?? {
      userId,
      status: "offline",
      customStatus: null,
      expiresAt: null,
      lastSeenAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
      device: null,
    }
  );
}

// ============================================================================
// GET /api/presence
// ============================================================================

/**
 * Fetch presence status.
 *
 * Query parameters:
 *   - userId:    Single user lookup
 *   - userIds:   Comma-separated list for batch lookup
 *   - channelId: Return presence for all members of a channel
 *   - status:    Filter results by status (online, away, dnd, offline)
 *
 * If no parameters are provided, returns all currently online users.
 */
export async function GET(request: NextRequest) {
  try {
    initializeStore();

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const parsed = QueryPresenceSchema.safeParse(queryParams);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
          details: parsed.error.errors,
        },
        { status: 400 },
      );
    }

    const { userId, userIds, channelId, status: statusFilter } = parsed.data;

    // --- Single user lookup ---
    if (userId && !userIds && !channelId) {
      const record = getPresenceForUser(userId);
      return NextResponse.json({
        success: true,
        data: transformPresence(record),
      });
    }

    // --- Batch user lookup ---
    if (userIds) {
      const ids = userIds
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);

      if (ids.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "userIds parameter must contain at least one user ID",
          },
          { status: 400 },
        );
      }

      if (ids.length > 100) {
        return NextResponse.json(
          {
            success: false,
            error: "Batch queries are limited to 100 user IDs",
          },
          { status: 400 },
        );
      }

      let presences = ids.map((id) =>
        transformPresence(getPresenceForUser(id)),
      );

      if (statusFilter) {
        presences = presences.filter((p) => p.status === statusFilter);
      }

      return NextResponse.json({
        success: true,
        data: {
          presences,
          total: presences.length,
          online: presences.filter((p) => p.status === "online").length,
        },
      });
    }

    // --- Channel member presence ---
    if (channelId) {
      const memberIds = DEMO_CHANNEL_MEMBERS[channelId] ?? [];

      if (memberIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            channelId,
            presences: [],
            total: 0,
            online: 0,
          },
        });
      }

      let presences = memberIds.map((id) =>
        transformPresence(getPresenceForUser(id)),
      );

      if (statusFilter) {
        presences = presences.filter((p) => p.status === statusFilter);
      }

      return NextResponse.json({
        success: true,
        data: {
          channelId,
          presences,
          total: presences.length,
          online: presences.filter((p) => p.status === "online").length,
        },
      });
    }

    // --- No parameters: return all online users ---
    let allPresences = Array.from(presenceStore.values()).map(
      transformPresence,
    );

    if (statusFilter) {
      allPresences = allPresences.filter((p) => p.status === statusFilter);
    } else {
      // Default: only return users that are not offline
      allPresences = allPresences.filter((p) => p.status !== "offline");
    }

    // Sort by lastSeenAt descending (most recently active first)
    allPresences.sort(
      (a, b) =>
        new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime(),
    );

    return NextResponse.json({
      success: true,
      data: {
        presences: allPresences,
        total: allPresences.length,
        online: allPresences.filter((p) => p.status === "online").length,
      },
    });
  } catch (error) {
    logger.error("GET /api/presence error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST /api/presence
// ============================================================================

/**
 * Update presence status.
 *
 * Body fields:
 *   - userId:       Required. The user whose presence to update.
 *   - status:       Optional. New presence status (online, away, dnd, invisible, offline).
 *   - customStatus: Optional. Object with emoji, text, activity. Pass null to clear.
 *   - expiresAt:    Optional. ISO 8601 datetime for custom status expiration.
 *   - device:       Optional. Device information (type, os, browser).
 */
export async function POST(request: NextRequest) {
  try {
    initializeStore();

    const body = await request.json();

    const parsed = UpdatePresenceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          details: parsed.error.errors,
        },
        { status: 400 },
      );
    }

    const { userId, status, customStatus, expiresAt, device } = parsed.data;
    const now = new Date().toISOString();

    // Get existing record or create a new one
    const existing = presenceStore.get(userId);
    const previousStatus = existing?.status ?? "offline";

    const updatedRecord: PresenceRecord = {
      userId,
      status: status ?? existing?.status ?? "online",
      customStatus:
        customStatus === null
          ? null
          : (customStatus ?? existing?.customStatus ?? null),
      expiresAt:
        expiresAt === null ? null : (expiresAt ?? existing?.expiresAt ?? null),
      lastSeenAt: now,
      updatedAt: now,
      device: device ?? existing?.device ?? null,
    };

    presenceStore.set(userId, updatedRecord);

    const transformed = transformPresence(updatedRecord);

    return NextResponse.json(
      {
        success: true,
        data: {
          ...transformed,
          previousStatus:
            previousStatus === "invisible" ? "offline" : previousStatus,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error("POST /api/presence error:", error);

    // Handle malformed JSON
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON in request body",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE /api/presence
// ============================================================================

/**
 * Clear presence / go offline.
 *
 * Query parameters:
 *   - userId:       Required. The user to clear.
 *   - clearCustom:  Optional. If "true", only clears the custom status (keeps status).
 */
export async function DELETE(request: NextRequest) {
  try {
    initializeStore();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const clearCustomOnly = searchParams.get("clearCustom") === "true";

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "userId query parameter is required",
        },
        { status: 400 },
      );
    }

    const existing = presenceStore.get(userId);
    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "No presence record found for this user",
        },
        { status: 404 },
      );
    }

    const now = new Date().toISOString();

    if (clearCustomOnly) {
      // Only clear the custom status, keep the presence status
      existing.customStatus = null;
      existing.expiresAt = null;
      existing.updatedAt = now;
      presenceStore.set(userId, existing);
    } else {
      // Set user offline
      existing.status = "offline";
      existing.customStatus = null;
      existing.expiresAt = null;
      existing.lastSeenAt = now;
      existing.updatedAt = now;
      presenceStore.set(userId, existing);
    }

    return NextResponse.json({
      success: true,
      data: transformPresence(existing),
    });
  } catch (error) {
    logger.error("DELETE /api/presence error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}
