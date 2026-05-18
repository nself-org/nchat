/**
 * Individual Vulnerability Management API
 *
 * Provides endpoints for managing a specific vulnerability.
 *
 * GET    /api/security/vulnerabilities/[id] - Get vulnerability details
 * PATCH  /api/security/vulnerabilities/[id] - Update vulnerability
 * DELETE /api/security/vulnerabilities/[id] - Delete vulnerability
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createVulnerabilityTracker,
  type VulnerabilityStatus,
  type RemediationPriority,
} from "@/lib/security/vulnerability-tracker";

// In-memory tracker instance (shared with main route)
const tracker = createVulnerabilityTracker();

// ============================================================================
// Request Schemas
// ============================================================================

const updateVulnerabilitySchema = z.object({
  status: z
    .enum([
      "open",
      "acknowledged",
      "in_progress",
      "fixed",
      "verified",
      "false_positive",
      "accepted_risk",
      "wont_fix",
    ])
    .optional(),
  priority: z.enum(["critical", "high", "medium", "low"]).optional(),
  assignee: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  note: z.string().optional(),
  suppressionReason: z.string().optional(),
  actor: z.string().optional(),
});

// ============================================================================
// GET /api/security/vulnerabilities/[id]
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const vuln = tracker.getById(id);

    if (!vuln) {
      return NextResponse.json(
        { error: "Vulnerability not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ vulnerability: vuln });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================================================
// PATCH /api/security/vulnerabilities/[id]
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const data = updateVulnerabilitySchema.parse(body);
    const actor = data.actor ?? "api";

    // Check if vulnerability exists
    let vuln: ReturnType<typeof tracker.getById> | null = tracker.getById(id);
    if (!vuln) {
      return NextResponse.json(
        { error: "Vulnerability not found" },
        { status: 404 },
      );
    }

    // Update status
    if (data.status) {
      // Handle suppression statuses
      if (
        ["false_positive", "accepted_risk", "wont_fix"].includes(data.status)
      ) {
        if (!data.suppressionReason && data.status === "accepted_risk") {
          return NextResponse.json(
            { error: "Suppression reason required for accepting risk" },
            { status: 400 },
          );
        }

        vuln = tracker.suppress(
          id,
          data.suppressionReason ?? "No reason provided",
          data.status as "false_positive" | "accepted_risk" | "wont_fix",
          actor,
        );
      } else {
        vuln = tracker.updateStatus(
          id,
          data.status as VulnerabilityStatus,
          actor,
          data.note,
        );
      }

      if (!vuln) {
        return NextResponse.json(
          { error: "Failed to update status" },
          { status: 400 },
        );
      }
    }

    // Update assignee
    if (data.assignee !== undefined) {
      vuln = tracker.assignTo(id, data.assignee, actor);
      if (!vuln) {
        return NextResponse.json(
          { error: "Failed to update assignee" },
          { status: 400 },
        );
      }
    }

    // Update due date
    if (data.dueDate) {
      vuln = tracker.setDueDate(id, new Date(data.dueDate), actor);
      if (!vuln) {
        return NextResponse.json(
          { error: "Failed to update due date" },
          { status: 400 },
        );
      }
    }

    // Add tags
    if (data.tags && data.tags.length > 0) {
      vuln = tracker.addTags(id, data.tags, actor);
      if (!vuln) {
        return NextResponse.json(
          { error: "Failed to add tags" },
          { status: 400 },
        );
      }
    }

    // Add note
    if (data.note && !data.status) {
      vuln = tracker.addNote(id, data.note, actor);
      if (!vuln) {
        return NextResponse.json(
          { error: "Failed to add note" },
          { status: 400 },
        );
      }
    }

    // Refresh vulnerability
    vuln = tracker.getById(id);

    return NextResponse.json({
      message: "Vulnerability updated successfully",
      vulnerability: vuln,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.errors },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE /api/security/vulnerabilities/[id]
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const deleted = tracker.delete(id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Vulnerability not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "Vulnerability deleted successfully" });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
