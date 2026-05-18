/**
 * API Route: Spam Detection Rules Management
 * GET /api/spam/rules - Get all spam rules
 * POST /api/spam/rules - Add a new spam rule
 * DELETE /api/spam/rules - Remove a spam rule
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSpamDetector } from "@/lib/spam";
import type { SpamRule } from "@/lib/spam";
import { captureError } from "@/lib/sentry-utils";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId") || undefined;

    const detector = getSpamDetector();
    const rules = detector.getRules(workspaceId);

    return NextResponse.json({
      success: true,
      rules,
      count: rules.length,
    });
  } catch (error) {
    logger.error("Failed to get spam rules:", error);
    captureError(error as Error, {
      tags: { feature: "spam", endpoint: "rules" },
    });

    return NextResponse.json(
      { error: "Failed to get spam rules" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      type,
      pattern,
      flags,
      severity,
      category,
      action,
      description,
      exemptRoles,
      exemptUsers,
      channelIds,
      workspaceId,
    } = body;

    // Validate required fields
    if (!name || !type || !pattern || !severity || !category || !action) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: name, type, pattern, severity, category, action",
        },
        { status: 400 },
      );
    }

    // Validate type
    if (!["keyword", "regex", "domain", "custom"].includes(type)) {
      return NextResponse.json(
        {
          error:
            "Invalid rule type. Must be: keyword, regex, domain, or custom",
        },
        { status: 400 },
      );
    }

    // Validate regex if type is regex
    if (type === "regex") {
      try {
        new RegExp(pattern, flags || "gi");
      } catch {
        return NextResponse.json(
          { error: "Invalid regex pattern" },
          { status: 400 },
        );
      }
    }

    const detector = getSpamDetector();

    const rule: SpamRule = {
      id: `rule-${Date.now()}-${randomBytes(5).toString("hex")}`,
      name,
      type,
      pattern,
      flags,
      severity,
      category,
      action,
      description,
      enabled: true,
      exemptRoles,
      exemptUsers,
      channelIds,
      workspaceId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    detector.addRule(rule);

    logger.info("Spam rule created", {
      ruleId: rule.id,
      name: rule.name,
      type: rule.type,
    });

    return NextResponse.json({
      success: true,
      rule,
    });
  } catch (error) {
    logger.error("Failed to create spam rule:", error);
    captureError(error as Error, {
      tags: { feature: "spam", endpoint: "rules" },
    });

    return NextResponse.json(
      { error: "Failed to create spam rule" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get("id");

    if (!ruleId) {
      return NextResponse.json(
        { error: "Rule ID is required" },
        { status: 400 },
      );
    }

    const detector = getSpamDetector();
    const success = detector.removeRule(ruleId);

    if (!success) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    logger.info("Spam rule deleted", { ruleId });

    return NextResponse.json({
      success: true,
      deleted: ruleId,
    });
  } catch (error) {
    logger.error("Failed to delete spam rule:", error);
    captureError(error as Error, {
      tags: { feature: "spam", endpoint: "rules" },
    });

    return NextResponse.json(
      { error: "Failed to delete spam rule" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, enabled } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Rule ID is required" },
        { status: 400 },
      );
    }

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "enabled must be a boolean" },
        { status: 400 },
      );
    }

    const detector = getSpamDetector();
    const success = detector.setRuleEnabled(id, enabled);

    if (!success) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    logger.info("Spam rule updated", { ruleId: id, enabled });

    return NextResponse.json({
      success: true,
      id,
      enabled,
    });
  } catch (error) {
    logger.error("Failed to update spam rule:", error);
    captureError(error as Error, {
      tags: { feature: "spam", endpoint: "rules" },
    });

    return NextResponse.json(
      { error: "Failed to update spam rule" },
      { status: 500 },
    );
  }
}
