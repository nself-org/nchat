/**
 * Escalation Rules API Route
 *
 * Handles escalation rule management.
 *
 * @route GET /api/escalation-rules - List escalation rules
 * @route POST /api/escalation-rules - Create an escalation rule
 */

import { NextRequest, NextResponse } from "next/server";
import { getEscalationService } from "@/services/tickets";
import type { EscalationRule } from "@/lib/tickets/ticket-types";

/**
 * GET /api/escalation-rules
 * List all escalation rules
 */
export async function GET(request: NextRequest) {
  try {
    const escalationService = getEscalationService();
    const searchParams = request.nextUrl.searchParams;

    const enabled = searchParams.get("enabled");
    const options =
      enabled !== null ? { enabled: enabled === "true" } : undefined;

    const result = await escalationService.listRules(options);

    if (!result.success) {
      return NextResponse.json(result.error, {
        status: result.error?.status || 500,
      });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Error listing escalation rules:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to list escalation rules" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/escalation-rules
 * Create a new escalation rule
 */
export async function POST(request: NextRequest) {
  try {
    const escalationService = getEscalationService();

    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Rule name is required" },
        { status: 400 },
      );
    }

    if (!body.conditions || body.conditions.length === 0) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "At least one condition is required",
        },
        { status: 400 },
      );
    }

    if (!body.actions || body.actions.length === 0) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "At least one action is required",
        },
        { status: 400 },
      );
    }

    const input: Omit<
      EscalationRule,
      "id" | "executionCount" | "createdAt" | "updatedAt"
    > = {
      name: body.name,
      description: body.description,
      enabled: body.enabled ?? true,
      order: body.order ?? 999,
      conditions: body.conditions,
      actions: body.actions,
      cooldownMinutes: body.cooldownMinutes,
      maxExecutions: body.maxExecutions,
    };

    const result = await escalationService.createRule(input);

    if (!result.success) {
      return NextResponse.json(result.error, {
        status: result.error?.status || 500,
      });
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error("Error creating escalation rule:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to create escalation rule" },
      { status: 500 },
    );
  }
}
