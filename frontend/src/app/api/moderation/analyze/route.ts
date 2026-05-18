/**
 * API Route: Analyze content with AI moderation
 * POST /api/moderation/analyze
 * v0.7.0 - Advanced AI moderation with multi-model approach
 */

import { NextRequest, NextResponse } from "next/server";
import { getAIModerator } from "@/lib/moderation/ai-moderator";
import { getToxicityDetector } from "@/lib/moderation/toxicity-detector";
import { getSpamDetectorML } from "@/lib/moderation/spam-detector-ml";
import { getContentClassifier } from "@/lib/moderation/content-classifier";
import { captureError } from "@/lib/sentry-utils";

import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      contentId,
      contentType = "text",
      content,
      metadata,
      policy,
      enableToxicity = true,
      enableSpam = true,
      enableClassification = true,
    } = body;

    if (!content || !contentId) {
      return NextResponse.json(
        { error: "Content and contentId are required" },
        { status: 400 },
      );
    }

    // Initialize AI Moderator
    const moderator = getAIModerator(policy);
    await moderator.initialize();

    // Analyze content
    const analysis = await moderator.analyzeContent(
      contentId,
      contentType,
      content,
      metadata,
    );

    // Optional: Deep analysis with specialized detectors
    let toxicityAnalysis;
    let spamAnalysis;
    let classification;

    if (enableToxicity) {
      const toxicityDetector = getToxicityDetector();
      toxicityAnalysis = await toxicityDetector.analyze(content);
    }

    if (enableSpam) {
      const spamDetector = getSpamDetectorML();
      spamAnalysis = await spamDetector.analyze(content, metadata);
    }

    if (enableClassification) {
      const classifier = getContentClassifier();
      classification = await classifier.classify(content, contentType);
    }

    // Record violation if content is flagged
    if (analysis.shouldFlag && metadata?.userId) {
      const maxSeverity = Math.max(
        ...analysis.detectedIssues.map((i) => {
          switch (i.severity) {
            case "critical":
              return 4;
            case "high":
              return 3;
            case "medium":
              return 2;
            case "low":
              return 1;
            default:
              return 0;
          }
        }),
      );

      const severity =
        maxSeverity === 4
          ? "critical"
          : maxSeverity === 3
            ? "high"
            : maxSeverity === 2
              ? "medium"
              : "low";

      await moderator.recordViolation(metadata.userId, severity);
    }

    return NextResponse.json({
      success: true,
      analysis,
      toxicityAnalysis,
      spamAnalysis,
      classification,
    });
  } catch (error) {
    logger.error("Moderation analysis error:", error);
    captureError(error as Error, {
      tags: { feature: "moderation", endpoint: "analyze", version: "v0.7.0" },
    });

    return NextResponse.json(
      {
        error: "Failed to analyze content",
        details:
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

/**
 * GET: Get moderation policy configuration
 */
export async function GET() {
  try {
    const moderator = getAIModerator();
    const policy = moderator.getPolicy();

    const toxicityDetector = getToxicityDetector();
    const toxicityConfig = toxicityDetector.getConfig();

    const spamDetector = getSpamDetectorML();
    const spamConfig = spamDetector.getConfig();

    const classifier = getContentClassifier();
    const classifierConfig = classifier.getConfig();

    return NextResponse.json({
      success: true,
      policy,
      toxicityConfig,
      spamConfig,
      classifierConfig,
    });
  } catch (error) {
    logger.error("Get policy error:", error);
    return NextResponse.json(
      {
        error: "Failed to get policy",
        details:
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

/**
 * PUT: Update moderation policy
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { policy, toxicityConfig, spamConfig, classifierConfig } = body;

    const moderator = getAIModerator();
    if (policy) {
      moderator.updatePolicy(policy);
    }

    if (toxicityConfig) {
      const toxicityDetector = getToxicityDetector();
      toxicityDetector.updateConfig(toxicityConfig);
    }

    if (spamConfig) {
      const spamDetector = getSpamDetectorML();
      spamDetector.updateConfig(spamConfig);
    }

    if (classifierConfig) {
      const classifier = getContentClassifier();
      classifier.updateConfig(classifierConfig);
    }

    return NextResponse.json({
      success: true,
      message: "Policy updated successfully",
    });
  } catch (error) {
    logger.error("Update policy error:", error);
    return NextResponse.json(
      {
        error: "Failed to update policy",
        details:
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
