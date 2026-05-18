/**
 * Contact Sync API Route
 *
 * Handles syncing contacts from device address book
 */

import { NextRequest, NextResponse } from "next/server";
import {
  checkSyncRateLimit,
  hashEmail,
  hashPhoneNumber,
} from "@/services/contacts/contact.service";

// ============================================================================
// Types
// ============================================================================

interface DeviceContact {
  name: string;
  phoneNumbers: string[];
  emails: string[];
}

interface SyncResult {
  matched: Array<{
    deviceContactName: string;
    userId: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    matchedBy: "phone" | "email";
  }>;
  unmatched: string[]; // Names of unmatched contacts
  alreadyContacts: string[]; // User IDs that are already contacts
}

// Mock registered users with their hashed identifiers
const registeredUsers = new Map<
  string,
  {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    emailHash: string;
    phoneHash?: string;
    phoneSalt?: string;
    allowDiscovery: boolean;
  }
>();

// Initialize mock data
function initMockData() {
  if (registeredUsers.size > 0) return;

  const salt = "demo-salt-12345";

  const users = [
    {
      id: "sync-1",
      username: "john",
      displayName: "John Doe",
      email: "john@example.com",
      phone: "+15551234567",
    },
    {
      id: "sync-2",
      username: "jane",
      displayName: "Jane Smith",
      email: "jane@example.com",
      phone: "+15559876543",
    },
    {
      id: "sync-3",
      username: "mike",
      displayName: "Mike Johnson",
      email: "mike@example.com",
    },
  ];

  users.forEach((user) => {
    const phoneHash = user.phone
      ? hashPhoneNumber(user.phone, salt).hash
      : undefined;
    registeredUsers.set(user.id, {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      emailHash: hashEmail(user.email),
      phoneHash,
      phoneSalt: phoneHash ? salt : undefined,
      allowDiscovery: true,
    });
  });
}

// ============================================================================
// POST - Sync device contacts
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    initMockData();

    const body = await request.json();
    const {
      userId,
      contacts,
      existingContactUserIds = [],
    }: {
      userId: string;
      contacts: DeviceContact[];
      existingContactUserIds: string[];
    } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    if (!contacts || !Array.isArray(contacts)) {
      return NextResponse.json(
        { error: "contacts array is required" },
        { status: 400 },
      );
    }

    // Check rate limit
    const rateLimit = checkSyncRateLimit(userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Sync rate limit exceeded. Please try again later.",
          resetAt: rateLimit.resetAt,
          remaining: rateLimit.remaining,
        },
        { status: 429 },
      );
    }

    // Limit number of contacts to process
    const MAX_SYNC_CONTACTS = 1000;
    const contactsToProcess = contacts.slice(0, MAX_SYNC_CONTACTS);

    const result: SyncResult = {
      matched: [],
      unmatched: [],
      alreadyContacts: [],
    };

    const existingContactSet = new Set(existingContactUserIds);
    const matchedUserIds = new Set<string>();

    // Process each device contact
    for (const contact of contactsToProcess) {
      let matched = false;

      // Try matching by email first
      for (const email of contact.emails || []) {
        const emailHash = hashEmail(email);

        registeredUsers.forEach((user) => {
          if (!user.allowDiscovery) return;
          if (matchedUserIds.has(user.id)) return;
          if (user.id === userId) return;

          if (user.emailHash === emailHash) {
            matched = true;
            matchedUserIds.add(user.id);

            if (existingContactSet.has(user.id)) {
              result.alreadyContacts.push(user.id);
            } else {
              result.matched.push({
                deviceContactName: contact.name,
                userId: user.id,
                username: user.username,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                matchedBy: "email",
              });
            }
          }
        });

        if (matched) break;
      }

      // Try matching by phone if not matched by email
      if (!matched) {
        for (const phone of contact.phoneNumbers || []) {
          registeredUsers.forEach((user) => {
            if (!user.allowDiscovery) return;
            if (!user.phoneHash || !user.phoneSalt) return;
            if (matchedUserIds.has(user.id)) return;
            if (user.id === userId) return;

            const { hash } = hashPhoneNumber(phone, user.phoneSalt);
            if (user.phoneHash === hash) {
              matched = true;
              matchedUserIds.add(user.id);

              if (existingContactSet.has(user.id)) {
                result.alreadyContacts.push(user.id);
              } else {
                result.matched.push({
                  deviceContactName: contact.name,
                  userId: user.id,
                  username: user.username,
                  displayName: user.displayName,
                  avatarUrl: user.avatarUrl,
                  matchedBy: "phone",
                });
              }
            }
          });

          if (matched) break;
        }
      }

      if (!matched) {
        result.unmatched.push(contact.name);
      }
    }

    return NextResponse.json({
      ...result,
      stats: {
        totalProcessed: contactsToProcess.length,
        newMatches: result.matched.length,
        alreadyContacts: result.alreadyContacts.length,
        unmatched: result.unmatched.length,
      },
      rateLimit: {
        remaining: rateLimit.remaining,
        resetAt: rateLimit.resetAt,
      },
    });
  } catch (error) {
    console.error("Error syncing contacts:", error);
    return NextResponse.json(
      { error: "Failed to sync contacts" },
      { status: 500 },
    );
  }
}

// ============================================================================
// GET - Get sync status
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    // Check rate limit status
    const rateLimit = checkSyncRateLimit(userId);

    return NextResponse.json({
      canSync: rateLimit.allowed,
      remaining: rateLimit.remaining,
      resetAt: rateLimit.resetAt,
    });
  } catch (error) {
    console.error("Error getting sync status:", error);
    return NextResponse.json(
      { error: "Failed to get sync status" },
      { status: 500 },
    );
  }
}
