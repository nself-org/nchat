/**
 * Retention Policy by ID API Route
 *
 * GET - Get a specific policy
 * PATCH - Update a policy
 * DELETE - Delete a policy
 *
 * @module app/api/admin/retention/policies/[id]
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getRetentionPolicyService,
  type UpdateRetentionPolicyInput,
} from "@/services/retention";

// ============================================================================
// GET - Get policy by ID
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

    const policy = service.getPolicy(id);

    if (!policy) {
      return NextResponse.json(
        { success: false, error: "Policy not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: policy });
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
// PATCH - Update policy
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

    const updates: UpdateRetentionPolicyInput = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.status !== undefined) updates.status = body.status;
    if (body.rules !== undefined) updates.rules = body.rules;
    if (body.allowOverride !== undefined)
      updates.allowOverride = body.allowOverride;
    if (body.inheritable !== undefined) updates.inheritable = body.inheritable;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.metadata !== undefined) updates.metadata = body.metadata;

    const result = await service.updatePolicy(id, updates, actorId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error === "Policy not found" ? 404 : 400 },
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
// DELETE - Delete policy
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
    const result = await service.deletePolicy(id, actorId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error === "Policy not found" ? 404 : 400 },
      );
    }

    return NextResponse.json({ success: true });
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
