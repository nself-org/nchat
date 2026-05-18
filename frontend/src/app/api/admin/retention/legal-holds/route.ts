/**
 * Legal Holds API Route
 *
 * GET - List legal holds
 * POST - Create a new legal hold
 *
 * @module app/api/admin/retention/legal-holds
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getRetentionPolicyService,
  type CreateLegalHoldInput,
  type ListLegalHoldsOptions,
} from "@/services/retention";

// ============================================================================
// GET - List legal holds
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const service = getRetentionPolicyService();

    if (!service.initialized) {
      await service.initialize();
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const options: ListLegalHoldsOptions = {
      status: searchParams.get("status") as ListLegalHoldsOptions["status"],
      matterReference: searchParams.get("matterReference") || undefined,
      createdBy: searchParams.get("createdBy") || undefined,
      limit: searchParams.get("limit")
        ? parseInt(searchParams.get("limit")!, 10)
        : undefined,
      offset: searchParams.get("offset")
        ? parseInt(searchParams.get("offset")!, 10)
        : undefined,
    };

    // Remove undefined values
    Object.keys(options).forEach((key) => {
      if ((options as Record<string, unknown>)[key] === undefined) {
        delete (options as Record<string, unknown>)[key];
      }
    });

    const holds = service.listLegalHolds(options);

    return NextResponse.json({
      success: true,
      data: holds,
      total: holds.length,
    });
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
// POST - Create legal hold
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const service = getRetentionPolicyService();

    if (!service.initialized) {
      await service.initialize();
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: "Legal hold name is required" },
        { status: 400 },
      );
    }

    if (!body.matterReference) {
      return NextResponse.json(
        { success: false, error: "Matter reference is required" },
        { status: 400 },
      );
    }

    if (!body.scope) {
      return NextResponse.json(
        { success: false, error: "Legal hold scope is required" },
        { status: 400 },
      );
    }

    const actorId = request.headers.get("x-user-id") || "system";

    const input: CreateLegalHoldInput = {
      name: body.name,
      description: body.description || "",
      matterReference: body.matterReference,
      scope: {
        userIds: body.scope.userIds || [],
        channelIds: body.scope.channelIds || [],
        workspaceIds: body.scope.workspaceIds || [],
        contentTypes: body.scope.contentTypes || [],
        startDate: body.scope.startDate
          ? new Date(body.scope.startDate)
          : undefined,
        endDate: body.scope.endDate ? new Date(body.scope.endDate) : undefined,
      },
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      metadata: body.metadata,
    };

    const result = await service.createLegalHold(input, actorId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: true, data: result.data },
      { status: 201 },
    );
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
