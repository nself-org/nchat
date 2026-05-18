/**
 * Link Preview API Route
 *
 * Fetches and parses link preview metadata (OpenGraph, Twitter Card) for URLs.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchLinkPreview, isValidUrl } from "@/lib/messages/link-preview";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        {
          success: false,
          error: "URL parameter is required",
          errorCode: "INVALID_URL",
        },
        { status: 400 },
      );
    }

    if (!isValidUrl(url)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid URL format",
          errorCode: "INVALID_URL",
        },
        { status: 400 },
      );
    }

    logger.debug("Fetching link preview", { url });

    const result = await fetchLinkPreview(url, {
      skipCache: searchParams.get("skipCache") === "true",
    });

    if (result.success) {
      logger.info("Link preview fetched successfully", {
        url,
        cached: result.cached,
      });
      return NextResponse.json(result);
    } else {
      logger.warn("Link preview fetch failed", {
        url,
        error: result.error,
        errorCode: result.errorCode,
      });
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    logger.error(
      "Link preview API error",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Internal server error",
        errorCode: "UNKNOWN",
      },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
