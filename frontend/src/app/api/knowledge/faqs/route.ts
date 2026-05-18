/**
 * Knowledge Base FAQ API Routes
 *
 * GET /api/knowledge/faqs - List FAQs
 * POST /api/knowledge/faqs - Create a new FAQ
 *
 * @module api/knowledge/faqs
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import { getKnowledgeBaseService } from "@/services/knowledge";

const logger = createLogger("KnowledgeFAQsAPI");

/**
 * GET /api/knowledge/faqs
 * List FAQs with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || searchParams.get("query");
    const category = searchParams.get("category") || undefined;
    const isActive = searchParams.get("isActive");

    const service = getKnowledgeBaseService();

    // If query provided, search FAQs
    if (query) {
      const limit = parseInt(searchParams.get("limit") || "5", 10);
      const result = await service.searchFAQs(query, { limit, category });

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: result.error?.status || 500 },
        );
      }

      return NextResponse.json({
        success: true,
        data: result.data,
        query,
        count: result.data?.length || 0,
      });
    }

    // Otherwise list FAQs
    const result = await service.listFAQs({
      category,
      isActive: isActive !== null ? isActive === "true" : undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error?.status || 500 },
      );
    }

    logger.debug("Listed FAQs", { count: result.data?.length });

    return NextResponse.json({
      success: true,
      data: result.data,
      count: result.data?.length || 0,
    });
  } catch (error) {
    logger.error("Failed to list FAQs", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to list FAQs",
        message: (error as Error).message,
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/knowledge/faqs
 * Create a new FAQ
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.question || !body.answer) {
      return NextResponse.json(
        { success: false, error: "Question and answer are required" },
        { status: 400 },
      );
    }

    const createdBy = body.createdBy || "system";

    const service = getKnowledgeBaseService();
    const result = await service.createFAQ(
      {
        question: body.question,
        answer: body.answer,
        alternativeQuestions: body.alternativeQuestions,
        keywords: body.keywords,
        category: body.category,
        priority: body.priority,
        articleId: body.articleId,
      },
      createdBy,
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error?.status || 500 },
      );
    }

    logger.info("Created FAQ", { id: result.data?.id });

    return NextResponse.json(
      { success: true, data: result.data, message: "FAQ created successfully" },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Failed to create FAQ", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create FAQ",
        message: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
