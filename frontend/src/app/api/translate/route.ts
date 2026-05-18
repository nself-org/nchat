/**
 * Translation API Route
 *
 * Translates text to target language using LibreTranslate if configured,
 * with graceful degradation to the original text when no service is available.
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

interface TranslationRequest {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: TranslationRequest = await request.json();

    const { text, targetLanguage, sourceLanguage = "auto" } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    if (!targetLanguage) {
      return NextResponse.json(
        { error: "Target language is required" },
        { status: 400 },
      );
    }

    if (text.length > 5000) {
      return NextResponse.json(
        { error: "Text exceeds maximum length of 5000 characters" },
        { status: 400 },
      );
    }

    logger.debug("Translating text", {
      textLength: text.length,
      targetLanguage,
      sourceLanguage,
    });

    const libreTranslateUrl = process.env.LIBRETRANSLATE_URL;

    // Graceful degradation: return original text if no translation service is configured
    if (!libreTranslateUrl) {
      logger.debug("LibreTranslate not configured, returning original text", {
        targetLanguage,
      });
      return NextResponse.json({
        translatedText: text,
        sourceLanguage,
        targetLanguage,
      });
    }

    const response = await fetch(`${libreTranslateUrl}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source: sourceLanguage,
        target: targetLanguage,
        api_key: process.env.LIBRETRANSLATE_API_KEY || "",
      }),
    });

    if (!response.ok) {
      logger.warn("LibreTranslate request failed, returning original text", {
        status: response.status,
        targetLanguage,
      });
      return NextResponse.json({
        translatedText: text,
        sourceLanguage,
        targetLanguage,
      });
    }

    const data = await response.json();

    const translatedText = data.translatedText || text;
    const detectedLanguage = data.detectedLanguage?.language || sourceLanguage;

    logger.info("Translation completed", {
      sourceLanguage: detectedLanguage,
      targetLanguage,
    });

    return NextResponse.json({
      translatedText,
      sourceLanguage: detectedLanguage,
      targetLanguage,
    });
  } catch (error) {
    logger.error(
      "Translation API error",
      error instanceof Error ? error : new Error(String(error)),
    );
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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
