/**
 * Workflow API - List/Create
 *
 * GET  /api/plugins/workflows - List all workflows
 * POST /api/plugins/workflows - Create a new workflow
 */

import { NextRequest, NextResponse } from "next/server";
import { validateWorkflowDefinition } from "@/lib/plugins/workflows/workflow-builder";
import { generateId } from "@/lib/plugins/app-lifecycle";
import { DEFAULT_WORKFLOW_SETTINGS } from "@/lib/plugins/workflows/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const enabled = searchParams.get("enabled");
    const tag = searchParams.get("tag");

    // In production, this would query the database
    return NextResponse.json({
      workflows: [],
      total: 0,
      filters: {
        enabled: enabled !== null ? enabled === "true" : undefined,
        tag: tag ?? undefined,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Request body must be a JSON object" },
        { status: 400 },
      );
    }

    // Build a workflow definition from the request body
    const workflow = {
      id: body.id ?? generateId("wf"),
      name: body.name,
      description: body.description ?? "",
      version: body.version ?? "1.0.0",
      enabled: body.enabled ?? true,
      trigger: body.trigger,
      steps: body.steps ?? [],
      inputSchema: body.inputSchema ?? [],
      settings: { ...DEFAULT_WORKFLOW_SETTINGS, ...body.settings },
      requiredScopes: body.requiredScopes ?? [],
      tags: body.tags ?? [],
      createdBy: body.createdBy ?? "api",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Validate
    const validation = validateWorkflowDefinition(workflow);
    if (!validation.valid) {
      const errors = validation.errors.filter((e) => e.severity === "error");
      return NextResponse.json(
        {
          error: "Invalid workflow definition",
          validationErrors: errors,
        },
        { status: 400 },
      );
    }

    // In production, this would save to database
    return NextResponse.json({ workflow }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Internal server error",
      },
      { status: 500 },
    );
  }
}
