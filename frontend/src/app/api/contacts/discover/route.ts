/**
 * Contact Discovery API Route
 *
 * Privacy-preserving contact discovery with rate limiting
 */

import { NextRequest, NextResponse } from "next/server";
import {
  checkDiscoveryRateLimit,
  hashEmail,
  hashPhoneNumber,
  type DiscoveryResult,
} from "@/services/contacts/contact.service";

// ============================================================================
// Types
// ============================================================================

interface DiscoveredUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  mutualContacts: number;
  isBlocked: boolean;
  relationshipStatus:
    | "none"
    | "pending_sent"
    | "pending_received"
    | "accepted"
    | "blocked";
}

interface PrivacySettings {
  allowSearchDiscovery: boolean;
  showInDirectory: boolean;
  allowContactRequests: "everyone" | "contacts_of_contacts" | "nobody";
}

// Mock user database for demo
const mockUsers = new Map<
  string,
  {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    bio?: string;
    email: string;
    emailHash: string;
    phoneHash?: string;
    phoneSalt?: string;
    privacySettings: PrivacySettings;
  }
>();

// Initialize some mock users
function initMockUsers() {
  if (mockUsers.size > 0) return;

  const users = [
    {
      id: "user-1",
      username: "alice",
      displayName: "Alice Johnson",
      email: "alice@example.com",
      bio: "Software engineer",
      avatarUrl: "/avatars/alice.jpg",
    },
    {
      id: "user-2",
      username: "bob",
      displayName: "Bob Smith",
      email: "bob@example.com",
      bio: "Product manager",
    },
    {
      id: "user-3",
      username: "charlie",
      displayName: "Charlie Brown",
      email: "charlie@example.com",
      bio: "Designer",
    },
    {
      id: "user-4",
      username: "diana",
      displayName: "Diana Prince",
      email: "diana@example.com",
      bio: "Marketing lead",
    },
    {
      id: "user-5",
      username: "evan",
      displayName: "Evan Williams",
      email: "evan@example.com",
      bio: "Data scientist",
    },
  ];

  users.forEach((user) => {
    mockUsers.set(user.id, {
      ...user,
      emailHash: hashEmail(user.email),
      privacySettings: {
        allowSearchDiscovery: true,
        showInDirectory: true,
        allowContactRequests: "everyone",
      },
    });
  });
}

// ============================================================================
// GET - Search/Discover users
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    initMockUsers();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const query = searchParams.get("query");
    const method = searchParams.get("method") || "username"; // username, email, phone
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    // Check rate limit
    const rateLimit = checkDiscoveryRateLimit(userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          resetAt: rateLimit.resetAt,
          remaining: rateLimit.remaining,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": rateLimit.resetAt.toISOString(),
          },
        },
      );
    }

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "Query must be at least 2 characters" },
        { status: 400 },
      );
    }

    const results: DiscoveredUser[] = [];
    const queryLower = query.toLowerCase();

    mockUsers.forEach((user) => {
      // Skip self
      if (user.id === userId) return;

      // Check privacy settings
      if (!user.privacySettings.allowSearchDiscovery) return;

      // Match based on method
      let matches = false;

      switch (method) {
        case "username":
          matches =
            user.username.toLowerCase().includes(queryLower) ||
            user.displayName.toLowerCase().includes(queryLower);
          break;
        case "email":
          // For email discovery, we compare hashes for privacy
          const queryHash = hashEmail(query);
          matches = user.emailHash === queryHash;
          break;
        case "phone":
          // Phone matching would compare hashed phone numbers
          if (user.phoneHash && user.phoneSalt) {
            const { hash } = hashPhoneNumber(query, user.phoneSalt);
            matches = user.phoneHash === hash;
          }
          break;
      }

      if (matches) {
        results.push({
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          mutualContacts: 0, // Would be calculated from actual contact data
          isBlocked: false, // Would be checked against block list
          relationshipStatus: "none",
        });
      }
    });

    return NextResponse.json({
      results: results.slice(0, limit),
      total: results.length,
      rateLimit: {
        remaining: rateLimit.remaining,
        resetAt: rateLimit.resetAt,
      },
    });
  } catch (error) {
    console.error("Error discovering users:", error);
    return NextResponse.json(
      { error: "Failed to discover users" },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST - Batch discovery (for contact sync)
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    initMockUsers();

    const body = await request.json();
    const { userId, phoneHashes, emailHashes, phoneSalt } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    // Check rate limit (stricter for batch operations)
    const rateLimit = checkDiscoveryRateLimit(`batch:${userId}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded for batch discovery",
          resetAt: rateLimit.resetAt,
        },
        { status: 429 },
      );
    }

    // Limit batch sizes to prevent enumeration attacks
    const MAX_BATCH_SIZE = 500;
    const phoneHashSet = new Set((phoneHashes || []).slice(0, MAX_BATCH_SIZE));
    const emailHashSet = new Set((emailHashes || []).slice(0, MAX_BATCH_SIZE));

    const matched: DiscoveredUser[] = [];
    const matchedIds = new Set<string>();

    mockUsers.forEach((user) => {
      // Skip self
      if (user.id === userId) return;

      // Check privacy settings
      if (!user.privacySettings.allowSearchDiscovery) return;
      if (user.privacySettings.allowContactRequests === "nobody") return;

      // Check email hash match
      if (emailHashSet.has(user.emailHash)) {
        if (!matchedIds.has(user.id)) {
          matchedIds.add(user.id);
          matched.push({
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            mutualContacts: 0,
            isBlocked: false,
            relationshipStatus: "none",
          });
        }
      }

      // Check phone hash match
      if (user.phoneHash && phoneSalt) {
        if (phoneHashSet.has(user.phoneHash)) {
          if (!matchedIds.has(user.id)) {
            matchedIds.add(user.id);
            matched.push({
              id: user.id,
              username: user.username,
              displayName: user.displayName,
              avatarUrl: user.avatarUrl,
              mutualContacts: 0,
              isBlocked: false,
              relationshipStatus: "none",
            });
          }
        }
      }
    });

    return NextResponse.json({
      matched,
      matchedCount: matched.length,
      queriedCount: phoneHashSet.size + emailHashSet.size,
      rateLimit: {
        remaining: rateLimit.remaining,
        resetAt: rateLimit.resetAt,
      },
    });
  } catch (error) {
    console.error("Error in batch discovery:", error);
    return NextResponse.json(
      { error: "Failed to process batch discovery" },
      { status: 500 },
    );
  }
}
