/**
 * Contacts API Route
 *
 * Handles CRUD operations for contacts
 */

import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";

// ============================================================================
// Types
// ============================================================================

interface Contact {
  id: string;
  userId: string;
  contactUserId: string;
  nickname?: string;
  notes?: string;
  isFavorite: boolean;
  discoveryMethod: string;
  addedAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

// In-memory store for demo purposes
const contactsStore = new Map<string, Contact[]>();

// ============================================================================
// GET - List contacts
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const search = searchParams.get("search");
    const favorites = searchParams.get("favorites") === "true";
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    let contacts = contactsStore.get(userId) || [];

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      contacts = contacts.filter(
        (c) =>
          c.user.displayName.toLowerCase().includes(searchLower) ||
          c.user.username.toLowerCase().includes(searchLower) ||
          c.nickname?.toLowerCase().includes(searchLower),
      );
    }

    // Apply favorites filter
    if (favorites) {
      contacts = contacts.filter((c) => c.isFavorite);
    }

    // Sort by favorites first, then by display name
    contacts.sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) {
        return a.isFavorite ? -1 : 1;
      }
      return a.user.displayName.localeCompare(b.user.displayName);
    });

    // Apply pagination
    const total = contacts.length;
    contacts = contacts.slice(offset, offset + limit);

    return NextResponse.json({
      contacts,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST - Add a contact
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      contactUserId,
      discoveryMethod,
      nickname,
      notes,
      contactUser,
    } = body;

    if (!userId || !contactUserId) {
      return NextResponse.json(
        { error: "userId and contactUserId are required" },
        { status: 400 },
      );
    }

    if (userId === contactUserId) {
      return NextResponse.json(
        { error: "Cannot add yourself as a contact" },
        { status: 400 },
      );
    }

    // Get existing contacts
    const userContacts = contactsStore.get(userId) || [];

    // Check if already a contact
    const existing = userContacts.find(
      (c) => c.contactUserId === contactUserId,
    );
    if (existing) {
      return NextResponse.json(
        { error: "User is already a contact" },
        { status: 409 },
      );
    }

    // Check contact limits
    const MAX_CONTACTS = 10000;
    if (userContacts.length >= MAX_CONTACTS) {
      return NextResponse.json(
        { error: `Maximum contact limit of ${MAX_CONTACTS} reached` },
        { status: 400 },
      );
    }

    // Create new contact
    const now = new Date().toISOString();
    const newContact: Contact = {
      id: nanoid(),
      userId,
      contactUserId,
      nickname: nickname || undefined,
      notes: notes || undefined,
      isFavorite: false,
      discoveryMethod: discoveryMethod || "username",
      addedAt: now,
      updatedAt: now,
      user: contactUser || {
        id: contactUserId,
        username: "unknown",
        displayName: "Unknown User",
      },
    };

    userContacts.push(newContact);
    contactsStore.set(userId, userContacts);

    return NextResponse.json({ contact: newContact }, { status: 201 });
  } catch (error) {
    console.error("Error adding contact:", error);
    return NextResponse.json(
      { error: "Failed to add contact" },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE - Remove a contact
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const contactId = searchParams.get("contactId");

    if (!userId || !contactId) {
      return NextResponse.json(
        { error: "userId and contactId are required" },
        { status: 400 },
      );
    }

    const userContacts = contactsStore.get(userId) || [];
    const contactIndex = userContacts.findIndex((c) => c.id === contactId);

    if (contactIndex === -1) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    userContacts.splice(contactIndex, 1);
    contactsStore.set(userId, userContacts);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing contact:", error);
    return NextResponse.json(
      { error: "Failed to remove contact" },
      { status: 500 },
    );
  }
}

// ============================================================================
// PATCH - Update a contact
// ============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, contactId, nickname, notes, isFavorite } = body;

    if (!userId || !contactId) {
      return NextResponse.json(
        { error: "userId and contactId are required" },
        { status: 400 },
      );
    }

    const userContacts = contactsStore.get(userId) || [];
    const contactIndex = userContacts.findIndex((c) => c.id === contactId);

    if (contactIndex === -1) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Update fields
    const contact = userContacts[contactIndex];
    if (nickname !== undefined) contact.nickname = nickname || undefined;
    if (notes !== undefined) contact.notes = notes || undefined;
    if (isFavorite !== undefined) contact.isFavorite = isFavorite;
    contact.updatedAt = new Date().toISOString();

    contactsStore.set(userId, userContacts);

    return NextResponse.json({ contact });
  } catch (error) {
    console.error("Error updating contact:", error);
    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 },
    );
  }
}
