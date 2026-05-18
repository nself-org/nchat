/**
 * AI Summarization API Route
 * POST /api/ai/summarize
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getMessageSummarizer,
  type Message,
  type SummaryOptions,
} from "@/lib/ai/message-summarizer";
import { getThreadSummarizer } from "@/lib/ai/thread-summarizer";
import { getMeetingNotesGenerator } from "@/lib/ai/meeting-notes";
import { captureError } from "@/lib/sentry-utils";

import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SummarizeRequest {
  messages: Message[];
  type?: "brief" | "digest" | "thread" | "catchup" | "meeting-notes";
  options?: SummaryOptions;
  meetingOptions?: any;
}

interface SummarizeResponse {
  success: boolean;
  summary?: string;
  digest?: any;
  threadSummary?: any;
  meetingNotes?: any;
  qualityScore?: number;
  costInfo?: {
    totalCost: number;
    requestCount: number;
  };
  error?: string;
  provider?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SummarizeRequest;

    // Validate request
    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request: messages array required",
        } as SummarizeResponse,
        { status: 400 },
      );
    }

    if (body.messages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No messages provided",
        } as SummarizeResponse,
        { status: 400 },
      );
    }

    // Limit message count to prevent abuse
    const MAX_MESSAGES = 500;
    if (body.messages.length > MAX_MESSAGES) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many messages. Maximum: ${MAX_MESSAGES}`,
        } as SummarizeResponse,
        { status: 400 },
      );
    }

    const summarizer = getMessageSummarizer();
    const type = body.type || "brief";

    let result: SummarizeResponse = {
      success: true,
      provider: summarizer.getProvider(),
    };

    // Generate summary based on type
    switch (type) {
      case "digest": {
        const digest = await summarizer.generateChannelDigest(
          body.messages,
          body.options,
        );
        result.digest = digest;
        result.summary = digest.summary;
        break;
      }

      case "thread": {
        const threadSummary = await summarizer.summarizeThread(
          body.messages,
          body.options,
        );
        result.threadSummary = threadSummary;
        result.summary = threadSummary.summary;
        break;
      }

      case "catchup": {
        const catchupSummary = await summarizer.generateCatchUpSummary(
          body.messages,
          body.options,
        );
        result.summary = catchupSummary;
        break;
      }

      case "meeting-notes": {
        const meetingGen = getMeetingNotesGenerator();
        const notes = await meetingGen.generateNotes(
          body.messages,
          body.meetingOptions,
        );
        result.summary = notes.formattedNotes;
        result.meetingNotes = notes;
        break;
      }

      case "brief":
      default: {
        const summary = await summarizer.summarizeMessages(
          body.messages,
          body.options || { style: "brief" },
        );
        result.summary = summary;

        // Add quality score
        const qualityScore = summarizer.calculateQualityScore(
          summary,
          body.messages,
        );
        result.qualityScore = qualityScore;
        break;
      }
    }

    // Add cost tracking info if available
    const costStats = summarizer.getCostStats();
    if (costStats.requestCount > 0) {
      result.costInfo = {
        totalCost: costStats.totalCost,
        requestCount: costStats.requestCount,
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Summarization error:", error);
    captureError(error as Error, {
      tags: { api: "ai-summarize" },
      extra: { requestBody: request.body },
    });

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Summarization failed",
      } as SummarizeResponse,
      { status: 500 },
    );
  }
}

// OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_APP_URL ?? "",
      Vary: "Origin",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
