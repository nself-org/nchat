/**
 * Contact Invites API Route
 *
 * Handles sending, accepting, and rejecting contact invites
 */

import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import {
  generateInviteCode,
  isInviteExpired,
  canAcceptInvite,
  DEFAULT_INVITE_EXPIRY_MS,
  MAX_PENDING_INVITES,
} from "@/services/contacts/contact.service";

// ============================================================================
// Types
// ============================================================================

interface ContactInvite {
  id: string;
  senderId: string;
  recipientId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  code: string;
  message?: string;
  status: "pending" | "accepted" | "rejected" | "expired" | "cancelled";
  expiresAt: Date;
  createdAt: Date;
  respondedAt?: Date;
  sender?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  recipient?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

// In-memory store for demo purposes
const invitesStore = new Map<string, ContactInvite>();
const userSentInvites = new Map<string, Set<string>>();
const userReceivedInvites = new Map<string, Set<string>>();

// ============================================================================
// GET - List invites
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const type = searchParams.get("type") || "received"; // 'sent' | 'received' | 'all'
    const status = searchParams.get("status"); // 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled'

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    let inviteIds: string[] = [];

    if (type === "sent" || type === "all") {
      const sentIds = userSentInvites.get(userId);
      if (sentIds) {
        inviteIds = [...inviteIds, ...sentIds];
      }
    }

    if (type === "received" || type === "all") {
      const receivedIds = userReceivedInvites.get(userId);
      if (receivedIds) {
        inviteIds = [...inviteIds, ...receivedIds];
      }
    }

    let invites = inviteIds
      .map((id) => invitesStore.get(id))
      .filter((invite): invite is ContactInvite => invite !== undefined);

    // Check and update expired invites
    const now = new Date();
    invites.forEach((invite) => {
      if (invite.status === "pending" && new Date(invite.expiresAt) < now) {
        invite.status = "expired";
      }
    });

    // Apply status filter
    if (status) {
      invites = invites.filter((i) => i.status === status);
    }

    // Sort by creation date (newest first)
    invites.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return NextResponse.json({
      invites,
      total: invites.length,
    });
  } catch (error) {
    console.error("Error fetching invites:", error);
    return NextResponse.json(
      { error: "Failed to fetch invites" },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST - Send an invite
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      senderId,
      recipientId,
      recipientEmail,
      recipientPhone,
      message,
      expiresInMs,
      senderInfo,
    } = body;

    if (!senderId) {
      return NextResponse.json(
        { error: "senderId is required" },
        { status: 400 },
      );
    }

    if (!recipientId && !recipientEmail && !recipientPhone) {
      return NextResponse.json(
        { error: "recipientId, recipientEmail, or recipientPhone is required" },
        { status: 400 },
      );
    }

    if (senderId === recipientId) {
      return NextResponse.json(
        { error: "Cannot send invite to yourself" },
        { status: 400 },
      );
    }

    // Check pending invite limits
    const senderInvites = userSentInvites.get(senderId) || new Set();
    const pendingCount = Array.from(senderInvites)
      .map((id) => invitesStore.get(id))
      .filter((i) => i?.status === "pending").length;

    if (pendingCount >= MAX_PENDING_INVITES) {
      return NextResponse.json(
        {
          error: `Maximum pending invite limit of ${MAX_PENDING_INVITES} reached`,
        },
        { status: 400 },
      );
    }

    // Check for existing pending invite to same recipient
    if (recipientId) {
      const existingInvite = Array.from(senderInvites)
        .map((id) => invitesStore.get(id))
        .find((i) => i?.recipientId === recipientId && i?.status === "pending");

      if (existingInvite) {
        return NextResponse.json(
          { error: "Pending invite already exists for this user" },
          { status: 409 },
        );
      }
    }

    // Create the invite
    const now = new Date();
    const expiryMs = expiresInMs || DEFAULT_INVITE_EXPIRY_MS;
    const expiresAt = new Date(now.getTime() + expiryMs);

    const invite: ContactInvite = {
      id: nanoid(),
      senderId,
      recipientId,
      recipientEmail,
      recipientPhone,
      code: generateInviteCode(),
      message,
      status: "pending",
      expiresAt,
      createdAt: now,
      sender: senderInfo,
    };

    // Store the invite
    invitesStore.set(invite.id, invite);

    // Update sender's sent invites
    if (!userSentInvites.has(senderId)) {
      userSentInvites.set(senderId, new Set());
    }
    userSentInvites.get(senderId)!.add(invite.id);

    // Update recipient's received invites (if recipientId is known)
    if (recipientId) {
      if (!userReceivedInvites.has(recipientId)) {
        userReceivedInvites.set(recipientId, new Set());
      }
      userReceivedInvites.get(recipientId)!.add(invite.id);
    }

    return NextResponse.json(
      {
        invite,
        inviteLink: `/contacts/invite/${invite.code}`,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error sending invite:", error);
    return NextResponse.json(
      { error: "Failed to send invite" },
      { status: 500 },
    );
  }
}

// ============================================================================
// PATCH - Accept/Reject/Cancel invite
// ============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { inviteId, code, userId, action } = body;

    // Find the invite
    let invite: ContactInvite | undefined;

    if (inviteId) {
      invite = invitesStore.get(inviteId);
    } else if (code) {
      invite = Array.from(invitesStore.values()).find((i) => i.code === code);
    }

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    switch (action) {
      case "accept": {
        const validation = canAcceptInvite(invite, userId);
        if (!validation.allowed) {
          return NextResponse.json(
            { error: validation.reason },
            { status: 400 },
          );
        }

        invite.status = "accepted";
        invite.recipientId = userId;
        invite.respondedAt = new Date();

        // Add to recipient's received invites if not already there
        if (!userReceivedInvites.has(userId)) {
          userReceivedInvites.set(userId, new Set());
        }
        userReceivedInvites.get(userId)!.add(invite.id);

        return NextResponse.json({
          invite,
          message: "Invite accepted",
        });
      }

      case "reject": {
        if (invite.status !== "pending") {
          return NextResponse.json(
            { error: `Cannot reject ${invite.status} invite` },
            { status: 400 },
          );
        }

        // Only recipient can reject
        if (invite.recipientId && invite.recipientId !== userId) {
          return NextResponse.json(
            { error: "Only the recipient can reject this invite" },
            { status: 403 },
          );
        }

        invite.status = "rejected";
        invite.respondedAt = new Date();

        return NextResponse.json({
          invite,
          message: "Invite rejected",
        });
      }

      case "cancel": {
        if (invite.status !== "pending") {
          return NextResponse.json(
            { error: `Cannot cancel ${invite.status} invite` },
            { status: 400 },
          );
        }

        // Only sender can cancel
        if (invite.senderId !== userId) {
          return NextResponse.json(
            { error: "Only the sender can cancel this invite" },
            { status: 403 },
          );
        }

        invite.status = "cancelled";
        invite.respondedAt = new Date();

        return NextResponse.json({
          invite,
          message: "Invite cancelled",
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: accept, reject, or cancel" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Error processing invite action:", error);
    return NextResponse.json(
      { error: "Failed to process invite action" },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE - Delete an invite
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const inviteId = searchParams.get("inviteId");
    const userId = searchParams.get("userId");

    if (!inviteId || !userId) {
      return NextResponse.json(
        { error: "inviteId and userId are required" },
        { status: 400 },
      );
    }

    const invite = invitesStore.get(inviteId);

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    // Only sender can delete
    if (invite.senderId !== userId) {
      return NextResponse.json(
        { error: "Only the sender can delete this invite" },
        { status: 403 },
      );
    }

    // Remove from stores
    invitesStore.delete(inviteId);
    userSentInvites.get(invite.senderId)?.delete(inviteId);
    if (invite.recipientId) {
      userReceivedInvites.get(invite.recipientId)?.delete(inviteId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting invite:", error);
    return NextResponse.json(
      { error: "Failed to delete invite" },
      { status: 500 },
    );
  }
}
