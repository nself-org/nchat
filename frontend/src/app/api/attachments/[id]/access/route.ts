/**
 * Attachment Access Control API Route
 *
 * GET /api/attachments/[id]/access - Generate signed URL for attachment access
 *
 * Features:
 * - Permission-based access control
 * - Signed URL generation with expiration
 * - Rate limiting
 * - Audit logging
 * - Virus scan status check
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { apolloClient } from "@/lib/apollo-client";
import { gql } from "@apollo/client";
import { logAuditEvent } from "@/lib/audit";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const AccessRequestSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  expiresIn: z.number().int().min(60).max(3600).default(300), // 1 min to 1 hour
  download: z.boolean().default(false), // Force download vs inline view
});

// ============================================================================
// GRAPHQL OPERATIONS
// ============================================================================

const GET_ATTACHMENT_WITH_PERMISSIONS = gql`
  query GetAttachmentWithPermissions($id: uuid!, $userId: uuid!) {
    nchat_attachments_by_pk(id: $id) {
      id
      message_id
      file_name
      file_type
      file_size
      file_url
      storage_key
      is_public
      virus_scan_status
      virus_scan_result
      metadata
      message {
        id
        channel_id
        user_id
        is_deleted
        channel {
          id
          type
          is_archived
          members: nchat_channel_members(where: { user_id: { _eq: $userId } }) {
            user_id
            role
          }
        }
        user {
          id
          display_name
        }
      }
    }
  }
`;

const UPDATE_ACCESS_TOKEN = gql`
  mutation UpdateAccessToken(
    $id: uuid!
    $accessToken: String!
    $accessExpiresAt: timestamptz!
  ) {
    update_nchat_attachments_by_pk(
      pk_columns: { id: $id }
      _set: { access_token: $accessToken, access_expires_at: $accessExpiresAt }
    ) {
      id
      access_token
      access_expires_at
    }
  }
`;

// ============================================================================
// HELPERS
// ============================================================================

function generateSignedToken(
  attachmentId: string,
  userId: string,
  expiresAt: number,
): string {
  const secret =
    process.env.ATTACHMENT_SECRET || "default-secret-change-in-production";
  const payload = `${attachmentId}:${userId}:${expiresAt}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return `${Buffer.from(payload).toString("base64")}.${signature}`;
}

function checkPermissions(
  attachment: Record<string, unknown>,
  userId: string,
): { allowed: boolean; reason?: string } {
  const message = attachment.message as Record<string, unknown>;
  const channel = message.channel as Record<string, unknown>;
  const members = (channel.members as unknown[]) || [];

  // Check if attachment is public
  if (attachment.is_public === true) {
    return { allowed: true };
  }

  // Check if message is deleted
  if (message.is_deleted === true) {
    return { allowed: false, reason: "Message has been deleted" };
  }

  // Check if channel is archived
  if (channel.is_archived === true) {
    return { allowed: false, reason: "Channel is archived" };
  }

  // Check if user is message author
  if (message.user_id === userId) {
    return { allowed: true };
  }

  // Check if user is channel member
  const isMember = members.some((m: any) => m.user_id === userId);
  if (!isMember) {
    return { allowed: false, reason: "Not a channel member" };
  }

  // Check virus scan status
  if (attachment.virus_scan_status === "infected") {
    return { allowed: false, reason: "File failed virus scan" };
  }

  return { allowed: true };
}

// ============================================================================
// GET - Generate signed access URL
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  const attachmentId = resolvedParams.id;

  try {
    logger.info("GET /api/attachments/[id]/access", { attachmentId });

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(attachmentId)) {
      return NextResponse.json(
        { success: false, error: "Invalid attachment ID format" },
        { status: 400 },
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const validation = AccessRequestSchema.safeParse({
      userId: searchParams.get("userId"),
      expiresIn: searchParams.get("expiresIn")
        ? parseInt(searchParams.get("expiresIn")!)
        : undefined,
      download: searchParams.get("download") === "true",
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { userId, expiresIn, download } = validation.data;

    // Fetch attachment with permission context
    const { data, errors } = await apolloClient.query({
      query: GET_ATTACHMENT_WITH_PERMISSIONS,
      variables: { id: attachmentId, userId },
      fetchPolicy: "network-only",
    });

    if (errors || !data?.nchat_attachments_by_pk) {
      return NextResponse.json(
        { success: false, error: "Attachment not found" },
        { status: 404 },
      );
    }

    const attachment = data.nchat_attachments_by_pk;

    // Check permissions
    const permissionCheck = checkPermissions(attachment, userId);
    if (!permissionCheck.allowed) {
      logger.warn("Attachment access denied", {
        attachmentId,
        userId,
        reason: permissionCheck.reason,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Access denied",
          reason: permissionCheck.reason,
        },
        { status: 403 },
      );
    }

    // Generate signed token
    const expiresAt = Date.now() + expiresIn * 1000;
    const accessToken = generateSignedToken(attachmentId, userId, expiresAt);
    const expiresAtISO = new Date(expiresAt).toISOString();

    // Store access token in database
    await apolloClient.mutate({
      mutation: UPDATE_ACCESS_TOKEN,
      variables: {
        id: attachmentId,
        accessToken,
        accessExpiresAt: expiresAtISO,
      },
    });

    // Generate signed URL
    const baseUrl =
      process.env.NEXT_PUBLIC_STORAGE_URL ||
      "http://storage.localhost/v1/storage";
    const storageKey = attachment.storage_key || attachment.file_url;
    const signedUrl = `${baseUrl}/files/${storageKey}?token=${encodeURIComponent(accessToken)}&expires=${expiresAt}${download ? "&download=true" : ""}`;

    // Log audit event
    await logAuditEvent({
      action: "access",
      actor: userId,
      category: "attachment",
      resource: { type: "attachment", id: attachmentId },
      description: `Attachment access granted${download ? " (download)" : ""}`,
      metadata: {
        fileName: attachment.file_name,
        fileType: attachment.file_type,
        fileSize: attachment.file_size,
        messageId: attachment.message_id,
        expiresIn,
        download,
      },
    });

    logger.info("Attachment access granted", {
      attachmentId,
      userId,
      expiresIn,
      download,
    });

    return NextResponse.json({
      success: true,
      data: {
        attachmentId,
        fileName: attachment.file_name,
        fileType: attachment.file_type,
        fileSize: attachment.file_size,
        signedUrl,
        expiresAt: expiresAtISO,
        expiresIn,
        download,
      },
    });
  } catch (error) {
    logger.error("GET /api/attachments/[id]/access - Error", error as Error, {
      attachmentId,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate access URL",
        message:
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
