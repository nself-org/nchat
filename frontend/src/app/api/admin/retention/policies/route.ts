/**
 * Retention Policies API Route
 *
 * GET - List retention policies
 * POST - Create a new retention policy
 *
 * @module app/api/admin/retention/policies
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getRetentionPolicyService,
  type CreateRetentionPolicyInput,
  type ListPoliciesOptions,
} from "@/services/retention";

// ============================================================================
// GET - List policies
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const service = getRetentionPolicyService();

    if (!service.initialized) {
      await service.initialize();
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const options: ListPoliciesOptions = {
      scope: searchParams.get("scope") as ListPoliciesOptions["scope"],
      targetId: searchParams.get("targetId") || undefined,
      status: searchParams.get("status") as ListPoliciesOptions["status"],
      contentType: searchParams.get(
        "contentType",
      ) as ListPoliciesOptions["contentType"],
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

    const policies = service.listPolicies(options);

    return NextResponse.json({
      success: true,
      data: policies,
      total: policies.length,
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
// POST - Create policy
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
        { success: false, error: "Policy name is required" },
        { status: 400 },
      );
    }

    if (!body.scope) {
      return NextResponse.json(
        { success: false, error: "Policy scope is required" },
        { status: 400 },
      );
    }

    if (!body.rules || body.rules.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one retention rule is required" },
        { status: 400 },
      );
    }

    // Get actor ID from the authenticated user header (set by Hasura/auth middleware)
    const actorId = request.headers.get("x-user-id") || "system";

    const input: CreateRetentionPolicyInput = {
      name: body.name,
      description: body.description,
      scope: body.scope,
      targetId: body.targetId,
      rules: body.rules,
      allowOverride: body.allowOverride,
      inheritable: body.inheritable,
      priority: body.priority,
      metadata: body.metadata,
    };

    const result = await service.createPolicy(input, actorId);

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
