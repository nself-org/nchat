/**
 * Knowledge Base FAQ API Routes
 *
 * GET /api/knowledge/faqs/[id] - Get an FAQ by ID
 * PUT /api/knowledge/faqs/[id] - Update an FAQ
 * DELETE /api/knowledge/faqs/[id] - Delete an FAQ
 *
 * @module api/knowledge/faqs/[id]
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import { getKnowledgeBaseService } from "@/services/knowledge";

const logger = createLogger("KnowledgeFAQAPI");

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/knowledge/faqs/[id]
 * Get an FAQ by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const service = getKnowledgeBaseService();
    const result = await service.getFAQ(id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error?.status || 500 },
      );
    }

    if (!result.data) {
      return NextResponse.json(
        { success: false, error: "FAQ not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    logger.error("Failed to get FAQ", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get FAQ",
        message: (error as Error).message,
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/knowledge/faqs/[id]
 * Update an FAQ
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updatedBy = body.updatedBy || "system";

    const service = getKnowledgeBaseService();
    const result = await service.updateFAQ(
      id,
      {
        question: body.question,
        answer: body.answer,
        alternativeQuestions: body.alternativeQuestions,
        keywords: body.keywords,
        category: body.category,
        priority: body.priority,
        isActive: body.isActive,
        articleId: body.articleId,
      },
      updatedBy,
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error?.status || 500 },
      );
    }

    logger.info("Updated FAQ", { id });

    return NextResponse.json({
      success: true,
      data: result.data,
      message: "FAQ updated successfully",
    });
  } catch (error) {
    logger.error("Failed to update FAQ", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update FAQ",
        message: (error as Error).message,
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/knowledge/faqs/[id]
 * Delete an FAQ
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const service = getKnowledgeBaseService();
    const result = await service.deleteFAQ(id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error?.status || 500 },
      );
    }

    logger.info("Deleted FAQ", { id });

    return NextResponse.json({
      success: true,
      message: "FAQ deleted successfully",
    });
  } catch (error) {
    logger.error("Failed to delete FAQ", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete FAQ",
        message: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
