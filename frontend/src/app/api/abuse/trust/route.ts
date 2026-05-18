/**
 * API Route: User Trust Score Management
 * GET /api/abuse/trust - Get user trust score or stats
 * POST /api/abuse/trust - Register user or record behavior event
 * PUT /api/abuse/trust - Update trust level or boost/penalize
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getAbuseScorer,
  getRecommendedAction,
  formatTrustScore,
} from "@/lib/spam";
import type { BehaviorEvent, UserProfile } from "@/lib/spam";
import { captureError } from "@/lib/sentry-utils";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_EVENTS: BehaviorEvent[] = [
  "message_sent",
  "spam_detected",
  "spam_false_positive",
  "rate_limited",
  "report_filed",
  "report_received",
  "report_upheld",
  "report_dismissed",
  "warning_received",
  "mute_received",
  "ban_received",
  "timeout_received",
  "appeal_approved",
  "appeal_rejected",
  "helpful_flag",
  "reaction_received",
  "channel_joined",
  "positive_interaction",
  "negative_interaction",
  "profile_completed",
  "email_verified",
  "phone_verified",
  "two_factor_enabled",
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const trustLevel = searchParams.get("trustLevel");
    const riskLevel = searchParams.get("riskLevel");
    const getStats = searchParams.get("stats") === "true";
    const highRisk = searchParams.get("highRisk") === "true";
    const needsReview = searchParams.get("needsReview") === "true";

    const scorer = getAbuseScorer();

    // Get stats
    if (getStats) {
      const stats = scorer.getStats();
      return NextResponse.json({
        success: true,
        stats,
      });
    }

    // Get high-risk users
    if (highRisk) {
      const users = scorer.getHighRiskUsers();
      return NextResponse.json({
        success: true,
        users,
        count: users.length,
      });
    }

    // Get users needing review
    if (needsReview) {
      const users = scorer.getUsersNeedingReview();
      return NextResponse.json({
        success: true,
        users,
        count: users.length,
      });
    }

    // Get users by trust level
    if (trustLevel) {
      const users = scorer.getUsersByTrustLevel(trustLevel as any);
      return NextResponse.json({
        success: true,
        trustLevel,
        users,
        count: users.length,
      });
    }

    // Get users by risk level
    if (riskLevel) {
      const users = scorer.getUsersByRiskLevel(riskLevel as any);
      return NextResponse.json({
        success: true,
        riskLevel,
        users,
        count: users.length,
      });
    }

    // Get specific user score
    if (userId) {
      const score = scorer.getScore(userId);

      if (!score) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const profile = scorer.getProfile(userId);
      const recommendation = getRecommendedAction(score);
      const formatted = formatTrustScore(score);

      return NextResponse.json({
        success: true,
        userId,
        score,
        profile,
        recommendation,
        formatted,
      });
    }

    return NextResponse.json(
      {
        error:
          "Provide userId, trustLevel, riskLevel, stats, highRisk, or needsReview parameter",
      },
      { status: 400 },
    );
  } catch (error) {
    logger.error("Failed to get trust info:", error);
    captureError(error as Error, {
      tags: { feature: "abuse", endpoint: "trust" },
    });

    return NextResponse.json(
      { error: "Failed to get trust information" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      action,
      userId,
      profile,
      event,
      events,
      details,
      channelId,
      workspaceId,
    } = body;

    const scorer = getAbuseScorer();

    // Register a new user
    if (action === "register" || profile) {
      if (!userId) {
        return NextResponse.json(
          { error: "userId is required" },
          { status: 400 },
        );
      }

      const userProfile: UserProfile = {
        userId,
        username: profile?.username,
        email: profile?.email,
        createdAt: profile?.createdAt
          ? new Date(profile.createdAt)
          : new Date(),
        emailVerified: profile?.emailVerified ?? false,
        phoneVerified: profile?.phoneVerified ?? false,
        twoFactorEnabled: profile?.twoFactorEnabled ?? false,
        profileComplete: profile?.profileComplete ?? false,
        roles: profile?.roles ?? [],
        workspaceIds: profile?.workspaceIds ?? [],
      };

      const score = scorer.registerUser(userProfile);

      logger.info("User registered with trust system", {
        userId,
        trustLevel: score.trustLevel,
      });

      return NextResponse.json({
        success: true,
        score,
      });
    }

    // Record a behavior event
    if (action === "event" || event) {
      if (!userId || !event) {
        return NextResponse.json(
          { error: "userId and event are required" },
          { status: 400 },
        );
      }

      if (!VALID_EVENTS.includes(event)) {
        return NextResponse.json(
          { error: `Invalid event. Valid events: ${VALID_EVENTS.join(", ")}` },
          { status: 400 },
        );
      }

      const score = scorer.recordEvent(userId, event, {
        details,
        channelId,
        workspaceId,
      });

      if (!score) {
        return NextResponse.json(
          { error: "User not found. Register the user first." },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        event,
        score,
      });
    }

    // Record multiple events
    if (action === "events" || events) {
      if (!userId || !events || !Array.isArray(events)) {
        return NextResponse.json(
          { error: "userId and events array are required" },
          { status: 400 },
        );
      }

      const validatedEvents = events.filter((e: any) =>
        VALID_EVENTS.includes(e.event),
      );

      const score = scorer.recordEvents(userId, validatedEvents);

      if (!score) {
        return NextResponse.json(
          { error: "User not found. Register the user first." },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        recordedEvents: validatedEvents.length,
        score,
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use: register, event, or events" },
      { status: 400 },
    );
  } catch (error) {
    logger.error("Failed to process trust action:", error);
    captureError(error as Error, {
      tags: { feature: "abuse", endpoint: "trust" },
    });

    return NextResponse.json(
      { error: "Failed to process trust action" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action, amount, reason, trustLevel, resetAbuse } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    const scorer = getAbuseScorer();

    // Set trust level manually
    if (action === "setLevel" || trustLevel) {
      if (!trustLevel || !reason) {
        return NextResponse.json(
          { error: "trustLevel and reason are required" },
          { status: 400 },
        );
      }

      const score = scorer.setTrustLevel(userId, trustLevel, reason);

      if (!score) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      logger.info("Trust level manually set", {
        userId,
        trustLevel,
        reason,
      });

      return NextResponse.json({
        success: true,
        score,
      });
    }

    // Boost trust
    if (action === "boost") {
      if (!amount || !reason) {
        return NextResponse.json(
          { error: "amount and reason are required" },
          { status: 400 },
        );
      }

      const score = scorer.boostTrust(userId, amount, reason);

      if (!score) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      logger.info("Trust boosted", { userId, amount, reason });

      return NextResponse.json({
        success: true,
        score,
      });
    }

    // Penalize trust
    if (action === "penalize") {
      if (!amount || !reason) {
        return NextResponse.json(
          { error: "amount and reason are required" },
          { status: 400 },
        );
      }

      const score = scorer.penalizeTrust(userId, amount, reason);

      if (!score) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      logger.info("Trust penalized", { userId, amount, reason });

      return NextResponse.json({
        success: true,
        score,
      });
    }

    // Reset abuse score
    if (action === "resetAbuse" || resetAbuse) {
      if (!reason) {
        return NextResponse.json(
          { error: "reason is required" },
          { status: 400 },
        );
      }

      const score = scorer.resetAbuseScore(userId, reason);

      if (!score) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      logger.info("Abuse score reset", { userId, reason });

      return NextResponse.json({
        success: true,
        score,
      });
    }

    return NextResponse.json(
      {
        error: "Invalid action. Use: setLevel, boost, penalize, or resetAbuse",
      },
      { status: 400 },
    );
  } catch (error) {
    logger.error("Failed to update trust:", error);
    captureError(error as Error, {
      tags: { feature: "abuse", endpoint: "trust" },
    });

    return NextResponse.json(
      { error: "Failed to update trust" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    const scorer = getAbuseScorer();
    scorer.clearUser(userId);

    logger.info("User cleared from trust system", { userId });

    return NextResponse.json({
      success: true,
      message: `Cleared user ${userId} from trust system`,
    });
  } catch (error) {
    logger.error("Failed to clear user:", error);
    captureError(error as Error, {
      tags: { feature: "abuse", endpoint: "trust" },
    });

    return NextResponse.json(
      { error: "Failed to clear user" },
      { status: 500 },
    );
  }
}
