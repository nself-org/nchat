/**
 * Knowledge Base Article API Routes
 *
 * GET /api/knowledge/articles/[id] - Get an article by ID
 * PUT /api/knowledge/articles/[id] - Update an article
 * DELETE /api/knowledge/articles/[id] - Delete an article
 *
 * @module api/knowledge/articles/[id]
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import { getKnowledgeBaseService } from "@/services/knowledge";

const logger = createLogger("KnowledgeArticleAPI");

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/knowledge/articles/[id]
 * Get an article by ID or slug
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const service = getKnowledgeBaseService();

    // Try by ID first, then by slug
    let result = await service.getArticle(id);

    if (!result.success || !result.data) {
      result = await service.getArticleBySlug(id);
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error?.status || 500 },
      );
    }

    if (!result.data) {
      return NextResponse.json(
        { success: false, error: "Article not found" },
        { status: 404 },
      );
    }

    // Record view
    const sessionId = request.headers.get("x-session-id") || undefined;
    await service.recordView(result.data.id, sessionId);

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    logger.error("Failed to get article", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get article",
        message: (error as Error).message,
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/knowledge/articles/[id]
 * Update an article
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updatedBy = body.updatedBy || "system";

    const service = getKnowledgeBaseService();
    const result = await service.updateArticle(
      id,
      {
        slug: body.slug,
        title: body.title,
        excerpt: body.excerpt,
        content: body.content,
        contentType: body.contentType,
        status: body.status,
        visibility: body.visibility,
        categoryId: body.categoryId,
        tags: body.tags,
        keywords: body.keywords,
        relatedArticleIds: body.relatedArticleIds,
        attachments: body.attachments,
        customFields: body.customFields,
        seo: body.seo,
        isFeatured: body.isFeatured,
        isPinned: body.isPinned,
      },
      updatedBy,
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error?.status || 500 },
      );
    }

    logger.info("Updated article", { id });

    return NextResponse.json({
      success: true,
      data: result.data,
      message: "Article updated successfully",
    });
  } catch (error) {
    logger.error("Failed to update article", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update article",
        message: (error as Error).message,
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/knowledge/articles/[id]
 * Delete an article
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const service = getKnowledgeBaseService();
    const result = await service.deleteArticle(id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error?.status || 500 },
      );
    }

    logger.info("Deleted article", { id });

    return NextResponse.json({
      success: true,
      message: "Article deleted successfully",
    });
  } catch (error) {
    logger.error("Failed to delete article", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete article",
        message: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
