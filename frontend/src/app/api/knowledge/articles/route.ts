/**
 * Knowledge Base Articles API Routes
 *
 * GET /api/knowledge/articles - List articles with filters
 * POST /api/knowledge/articles - Create a new article
 *
 * @module api/knowledge/articles
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import { getKnowledgeBaseService } from "@/services/knowledge";
import type {
  ArticleSearchOptions,
  ArticleListOptions,
} from "@/lib/knowledge/knowledge-types";

const logger = createLogger("KnowledgeArticlesAPI");

/**
 * GET /api/knowledge/articles
 * List articles with optional filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const options: ArticleListOptions & ArticleSearchOptions = {
      limit: parseInt(searchParams.get("limit") || "50", 10),
      offset: parseInt(searchParams.get("offset") || "0", 10),
      sortBy:
        (searchParams.get("sortBy") as ArticleListOptions["sortBy"]) ||
        "createdAt",
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
    };

    // Add filters
    const query = searchParams.get("query");
    if (query) options.query = query;

    const categoryId = searchParams.get("categoryId");
    if (categoryId) options.categoryId = categoryId;

    const status = searchParams.get("status");
    if (status) options.status = status as ArticleSearchOptions["status"];

    const visibility = searchParams.get("visibility");
    if (visibility)
      options.visibility = visibility as ArticleSearchOptions["visibility"];

    const contentType = searchParams.get("contentType");
    if (contentType)
      options.contentType = contentType as ArticleSearchOptions["contentType"];

    const tags = searchParams.get("tags");
    if (tags) options.tags = tags.split(",");

    const isFeatured = searchParams.get("isFeatured");
    if (isFeatured !== null) options.isFeatured = isFeatured === "true";

    const isPinned = searchParams.get("isPinned");
    if (isPinned !== null) options.isPinned = isPinned === "true";

    const service = getKnowledgeBaseService();
    const result = await service.listArticles(options);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error?.status || 500 },
      );
    }

    logger.debug("Listed articles", { count: result.data?.items.length });

    return NextResponse.json({
      success: true,
      data: result.data?.items,
      totalCount: result.data?.totalCount,
      hasMore: result.data?.hasMore,
      offset: result.data?.offset,
      limit: result.data?.limit,
    });
  } catch (error) {
    logger.error("Failed to list articles", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to list articles",
        message: (error as Error).message,
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/knowledge/articles
 * Create a new article
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = ["title", "excerpt", "content"];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          fields: missingFields,
        },
        { status: 400 },
      );
    }

    // Get user ID from auth (would be from session in production)
    const createdBy = body.createdBy || "system";

    const service = getKnowledgeBaseService();
    const result = await service.createArticle(
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
      createdBy,
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error?.status || 500 },
      );
    }

    logger.info("Created article", {
      id: result.data?.id,
      slug: result.data?.slug,
    });

    return NextResponse.json(
      {
        success: true,
        data: result.data,
        message: "Article created successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Failed to create article", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create article",
        message: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
