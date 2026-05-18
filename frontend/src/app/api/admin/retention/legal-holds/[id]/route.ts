/**
 * Legal Hold by ID API Route
 *
 * GET - Get a specific legal hold
 * PATCH - Update a legal hold
 * DELETE - Release a legal hold
 *
 * @module app/api/admin/retention/legal-holds/[id]
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getRetentionPolicyService,
  type UpdateLegalHoldInput,
} from "@/services/retention";

// ============================================================================
// GET - Get legal hold by ID
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const service = getRetentionPolicyService();

    if (!service.initialized) {
      await service.initialize();
    }

    const hold = service.getLegalHold(id);

    if (!hold) {
      return NextResponse.json(
        { success: false, error: "Legal hold not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: hold });
  } catch (error) {
    const message =
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

// ============================================================================
// PATCH - Update legal hold
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const service = getRetentionPolicyService();

    if (!service.initialized) {
      await service.initialize();
    }

    const body = await request.json();
    const actorId = request.headers.get("x-user-id") || "system";

    const updates: UpdateLegalHoldInput = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.matterReference !== undefined)
      updates.matterReference = body.matterReference;
    if (body.scope !== undefined) {
      updates.scope = {};
      if (body.scope.userIds !== undefined)
        updates.scope.userIds = body.scope.userIds;
      if (body.scope.channelIds !== undefined)
        updates.scope.channelIds = body.scope.channelIds;
      if (body.scope.workspaceIds !== undefined)
        updates.scope.workspaceIds = body.scope.workspaceIds;
      if (body.scope.contentTypes !== undefined)
        updates.scope.contentTypes = body.scope.contentTypes;
      if (body.scope.startDate !== undefined) {
        updates.scope.startDate = body.scope.startDate
          ? new Date(body.scope.startDate)
          : undefined;
      }
      if (body.scope.endDate !== undefined) {
        updates.scope.endDate = body.scope.endDate
          ? new Date(body.scope.endDate)
          : undefined;
      }
    }
    if (body.expiresAt !== undefined) {
      updates.expiresAt = body.expiresAt ? new Date(body.expiresAt) : undefined;
    }
    if (body.metadata !== undefined) updates.metadata = body.metadata;

    const result = await service.updateLegalHold(id, updates, actorId);

    if (!result.success) {
      const status = result.error?.includes("not found") ? 404 : 400;
      return NextResponse.json(
        { success: false, error: result.error },
        { status },
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    const message =
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE - Release legal hold
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const service = getRetentionPolicyService();

    if (!service.initialized) {
      await service.initialize();
    }

    const actorId = request.headers.get("x-user-id") || "system";
    const result = await service.releaseLegalHold(id, actorId);

    if (!result.success) {
      const status = result.error?.includes("not found") ? 404 : 400;
      return NextResponse.json(
        { success: false, error: result.error },
        { status },
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    const message =
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
