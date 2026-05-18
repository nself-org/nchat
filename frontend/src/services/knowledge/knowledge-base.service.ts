/**
 * Knowledge Base Service
 *
 * Core service for FAQ/knowledge-base article management.
 * Provides CRUD operations, search, and analytics for help articles.
 *
 * Features:
 * - Article and category management
 * - Full-text search with relevance scoring
 * - FAQ management for chatbot integration
 * - Feedback collection and analytics
 * - Version history tracking
 *
 * @module services/knowledge/knowledge-base.service
 * @version 1.0.0
 */

import { createLogger } from "@/lib/logger";
import { v4 as uuidv4 } from "uuid";
import type { APIResponse } from "@/types/api";
import type {
  KBCategory,
  CreateCategoryInput,
  UpdateCategoryInput,
  KBArticle,
  KBAttachment,
  KBArticleAnalytics,
  KBArticleVersion,
  CreateArticleInput,
  UpdateArticleInput,
  ArticleSearchOptions,
  ArticleListOptions,
  ArticleListResult,
  ArticleSearchResult,
  ArticleFeedback,
  SubmitFeedbackInput,
  FAQEntry,
  CreateFAQInput,
  UpdateFAQInput,
  ArticleStatus,
  KBEvent,
  KBEventType,
  SearchAnalyticsEntry,
} from "@/lib/knowledge/knowledge-types";

const log = createLogger("KnowledgeBaseService");

// ============================================================================
// IN-MEMORY STORES
// ============================================================================

const categories = new Map<string, KBCategory>();
const articles = new Map<string, KBArticle>();
const articleVersions = new Map<string, KBArticleVersion[]>();
const feedback = new Map<string, ArticleFeedback[]>();
const faqs = new Map<string, FAQEntry>();
const searchAnalytics: SearchAnalyticsEntry[] = [];

// Event listeners
type EventListener = (event: KBEvent) => void;
const eventListeners: EventListener[] = [];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a URL-friendly slug from text
 */
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 100);
}

/**
 * Strip HTML/markdown to plain text
 */
function stripToPlainText(content: string): string {
  return content
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/#{1,6}\s?/g, "") // Remove markdown headers
    .replace(/\*\*?/g, "") // Remove bold/italic
    .replace(/`{1,3}/g, "") // Remove code markers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Convert links to text
    .replace(/\n{2,}/g, "\n") // Collapse multiple newlines
    .trim();
}

/**
 * Emit a knowledge base event
 */
function emitEvent<T>(
  type: KBEventType,
  data: T,
  articleId?: string,
  categoryId?: string,
): void {
  const event: KBEvent<T> = {
    type,
    articleId,
    categoryId,
    data,
    timestamp: new Date(),
  };

  log.debug("Emitting KB event", { type, articleId, categoryId });

  for (const listener of eventListeners) {
    try {
      listener(event);
    } catch (error) {
      log.error("Error in KB event listener", error);
    }
  }
}

/**
 * Calculate text similarity score using word matching
 */
function calculateSimilarity(query: string, text: string): number {
  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);
  const textWords = text.toLowerCase().split(/\s+/);

  if (queryWords.length === 0) return 0;

  let matchCount = 0;
  for (const qw of queryWords) {
    for (const tw of textWords) {
      if (tw.includes(qw) || qw.includes(tw)) {
        matchCount++;
        break;
      }
    }
  }

  return matchCount / queryWords.length;
}

/**
 * Create initial analytics object
 */
function createInitialAnalytics(): KBArticleAnalytics {
  return {
    viewCount: 0,
    uniqueViewCount: 0,
    helpfulCount: 0,
    notHelpfulCount: 0,
    searchAppearances: 0,
    avgTimeOnPage: 0,
    bounceRate: 0,
  };
}

// ============================================================================
// KNOWLEDGE BASE SERVICE CLASS
// ============================================================================

export class KnowledgeBaseService {
  // ==========================================================================
  // CATEGORY OPERATIONS
  // ==========================================================================

  /**
   * Create a new category
   */
  async createCategory(
    input: CreateCategoryInput,
    createdBy: string,
  ): Promise<APIResponse<KBCategory>> {
    try {
      log.debug("Creating category", { name: input.name });

      const id = uuidv4();
      const slug = input.slug || generateSlug(input.name);
      const now = new Date();

      // Check for duplicate slug
      const existingSlug = Array.from(categories.values()).find(
        (c) => c.slug === slug,
      );
      if (existingSlug) {
        return {
          success: false,
          error: {
            code: "CONFLICT",
            status: 409,
            message: `Category with slug "${slug}" already exists`,
          },
        };
      }

      const category: KBCategory = {
        id,
        name: input.name,
        slug,
        description: input.description,
        icon: input.icon,
        parentId: input.parentId,
        order: input.order ?? 0,
        articleCount: 0,
        isActive: true,
        metadata: input.metadata || {},
        createdAt: now,
        updatedAt: now,
      };

      categories.set(id, category);

      emitEvent("category.created", category, undefined, id);

      log.info("Category created", { id, name: input.name, slug });

      return {
        success: true,
        data: category,
      };
    } catch (error) {
      log.error("Failed to create category", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Get a category by ID
   */
  async getCategory(id: string): Promise<APIResponse<KBCategory | null>> {
    try {
      const category = categories.get(id);
      return {
        success: true,
        data: category || null,
      };
    } catch (error) {
      log.error("Failed to get category", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Get a category by slug
   */
  async getCategoryBySlug(
    slug: string,
  ): Promise<APIResponse<KBCategory | null>> {
    try {
      const category = Array.from(categories.values()).find(
        (c) => c.slug === slug,
      );
      return {
        success: true,
        data: category || null,
      };
    } catch (error) {
      log.error("Failed to get category by slug", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Update a category
   */
  async updateCategory(
    id: string,
    input: UpdateCategoryInput,
    updatedBy: string,
  ): Promise<APIResponse<KBCategory>> {
    try {
      const category = categories.get(id);
      if (!category) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Category not found",
          },
        };
      }

      // Check for duplicate slug if changing
      if (input.slug && input.slug !== category.slug) {
        const existingSlug = Array.from(categories.values()).find(
          (c) => c.slug === input.slug && c.id !== id,
        );
        if (existingSlug) {
          return {
            success: false,
            error: {
              code: "CONFLICT",
              status: 409,
              message: `Category with slug "${input.slug}" already exists`,
            },
          };
        }
      }

      const updated: KBCategory = {
        ...category,
        name: input.name ?? category.name,
        slug: input.slug ?? category.slug,
        description: input.description ?? category.description,
        icon: input.icon ?? category.icon,
        parentId: input.parentId ?? category.parentId,
        order: input.order ?? category.order,
        isActive: input.isActive ?? category.isActive,
        metadata: { ...category.metadata, ...input.metadata },
        updatedAt: new Date(),
      };

      categories.set(id, updated);

      emitEvent("category.updated", updated, undefined, id);

      log.info("Category updated", { id });

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      log.error("Failed to update category", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: string): Promise<APIResponse<{ deleted: boolean }>> {
    try {
      const category = categories.get(id);
      if (!category) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Category not found",
          },
        };
      }

      // Check if category has articles
      const hasArticles = Array.from(articles.values()).some(
        (a) => a.categoryId === id,
      );
      if (hasArticles) {
        return {
          success: false,
          error: {
            code: "CONFLICT",
            status: 409,
            message: "Cannot delete category with articles",
          },
        };
      }

      categories.delete(id);

      emitEvent("category.deleted", { id }, undefined, id);

      log.info("Category deleted", { id });

      return {
        success: true,
        data: { deleted: true },
      };
    } catch (error) {
      log.error("Failed to delete category", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * List all categories
   */
  async listCategories(options?: {
    parentId?: string;
    isActive?: boolean;
  }): Promise<APIResponse<KBCategory[]>> {
    try {
      let results = Array.from(categories.values());

      if (options?.parentId !== undefined) {
        results = results.filter((c) => c.parentId === options.parentId);
      }

      if (options?.isActive !== undefined) {
        results = results.filter((c) => c.isActive === options.isActive);
      }

      // Update article counts
      for (const cat of results) {
        cat.articleCount = Array.from(articles.values()).filter(
          (a) => a.categoryId === cat.id && a.status === "published",
        ).length;
      }

      // Sort by order
      results.sort((a, b) => a.order - b.order);

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      log.error("Failed to list categories", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  // ==========================================================================
  // ARTICLE OPERATIONS
  // ==========================================================================

  /**
   * Create a new article
   */
  async createArticle(
    input: CreateArticleInput,
    createdBy: string,
  ): Promise<APIResponse<KBArticle>> {
    try {
      log.debug("Creating article", { title: input.title });

      const id = uuidv4();
      const slug = input.slug || generateSlug(input.title);
      const now = new Date();

      // Check for duplicate slug
      const existingSlug = Array.from(articles.values()).find(
        (a) => a.slug === slug,
      );
      if (existingSlug) {
        return {
          success: false,
          error: {
            code: "CONFLICT",
            status: 409,
            message: `Article with slug "${slug}" already exists`,
          },
        };
      }

      // Get category info if provided
      let category: Pick<KBCategory, "id" | "name" | "slug"> | undefined;
      if (input.categoryId) {
        const cat = categories.get(input.categoryId);
        if (cat) {
          category = { id: cat.id, name: cat.name, slug: cat.slug };
        }
      }

      const article: KBArticle = {
        id,
        slug,
        title: input.title,
        excerpt: input.excerpt,
        content: input.content,
        contentPlain: stripToPlainText(input.content),
        contentType: input.contentType || "faq",
        status: input.status || "draft",
        visibility: input.visibility || "public",
        categoryId: input.categoryId,
        category,
        tags: input.tags || [],
        keywords: input.keywords || [],
        author: {
          id: createdBy,
          name: "Author", // Would be resolved from user service
        },
        relatedArticleIds: input.relatedArticleIds || [],
        attachments: (input.attachments || []).map((a) => ({
          ...a,
          id: uuidv4(),
        })),
        customFields: input.customFields || {},
        seo: input.seo,
        version: 1,
        analytics: createInitialAnalytics(),
        isFeatured: input.isFeatured || false,
        isPinned: input.isPinned || false,
        publishedAt: input.status === "published" ? now : undefined,
        createdAt: now,
        updatedAt: now,
        createdBy,
        updatedBy: createdBy,
      };

      articles.set(id, article);
      articleVersions.set(id, []);

      emitEvent("article.created", article, id);

      log.info("Article created", { id, slug, title: input.title });

      return {
        success: true,
        data: article,
      };
    } catch (error) {
      log.error("Failed to create article", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Get an article by ID
   */
  async getArticle(id: string): Promise<APIResponse<KBArticle | null>> {
    try {
      const article = articles.get(id);
      return {
        success: true,
        data: article || null,
      };
    } catch (error) {
      log.error("Failed to get article", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Get an article by slug
   */
  async getArticleBySlug(slug: string): Promise<APIResponse<KBArticle | null>> {
    try {
      const article = Array.from(articles.values()).find(
        (a) => a.slug === slug,
      );
      return {
        success: true,
        data: article || null,
      };
    } catch (error) {
      log.error("Failed to get article by slug", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Update an article
   */
  async updateArticle(
    id: string,
    input: UpdateArticleInput,
    updatedBy: string,
  ): Promise<APIResponse<KBArticle>> {
    try {
      const article = articles.get(id);
      if (!article) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Article not found",
          },
        };
      }

      // Check for duplicate slug if changing
      if (input.slug && input.slug !== article.slug) {
        const existingSlug = Array.from(articles.values()).find(
          (a) => a.slug === input.slug && a.id !== id,
        );
        if (existingSlug) {
          return {
            success: false,
            error: {
              code: "CONFLICT",
              status: 409,
              message: `Article with slug "${input.slug}" already exists`,
            },
          };
        }
      }

      const now = new Date();
      const oldStatus = article.status;

      // Save version before updating
      const versions = articleVersions.get(id) || [];
      versions.push({
        id: uuidv4(),
        articleId: id,
        version: article.version,
        title: article.title,
        content: article.content,
        changes: `Updated by ${updatedBy}`,
        createdBy: updatedBy,
        createdAt: now,
      });
      articleVersions.set(id, versions);

      // Get category info if changing
      let category = article.category;
      if (input.categoryId !== undefined) {
        if (input.categoryId) {
          const cat = categories.get(input.categoryId);
          if (cat) {
            category = { id: cat.id, name: cat.name, slug: cat.slug };
          }
        } else {
          category = undefined;
        }
      }

      const updated: KBArticle = {
        ...article,
        slug: input.slug ?? article.slug,
        title: input.title ?? article.title,
        excerpt: input.excerpt ?? article.excerpt,
        content: input.content ?? article.content,
        contentPlain: input.content
          ? stripToPlainText(input.content)
          : article.contentPlain,
        contentType: input.contentType ?? article.contentType,
        status: input.status ?? article.status,
        visibility: input.visibility ?? article.visibility,
        categoryId: input.categoryId ?? article.categoryId,
        category,
        tags: input.tags ?? article.tags,
        keywords: input.keywords ?? article.keywords,
        relatedArticleIds: input.relatedArticleIds ?? article.relatedArticleIds,
        attachments: input.attachments
          ? input.attachments.map((a) => ({ ...a, id: uuidv4() }))
          : article.attachments,
        customFields: { ...article.customFields, ...input.customFields },
        seo: input.seo ?? article.seo,
        version: article.version + 1,
        isFeatured: input.isFeatured ?? article.isFeatured,
        isPinned: input.isPinned ?? article.isPinned,
        updatedAt: now,
        updatedBy,
      };

      // Handle status transitions
      if (input.status && input.status !== oldStatus) {
        if (input.status === "published" && !article.publishedAt) {
          updated.publishedAt = now;
        }
      }

      articles.set(id, updated);

      // Emit appropriate event
      if (input.status === "published" && oldStatus !== "published") {
        emitEvent("article.published", updated, id);
      } else if (input.status === "archived") {
        emitEvent("article.archived", updated, id);
      } else {
        emitEvent("article.updated", updated, id);
      }

      log.info("Article updated", { id, version: updated.version });

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      log.error("Failed to update article", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Publish an article
   */
  async publishArticle(
    id: string,
    publishedBy: string,
  ): Promise<APIResponse<KBArticle>> {
    return this.updateArticle(id, { status: "published" }, publishedBy);
  }

  /**
   * Archive an article
   */
  async archiveArticle(
    id: string,
    archivedBy: string,
  ): Promise<APIResponse<KBArticle>> {
    return this.updateArticle(id, { status: "archived" }, archivedBy);
  }

  /**
   * Delete an article
   */
  async deleteArticle(id: string): Promise<APIResponse<{ deleted: boolean }>> {
    try {
      const article = articles.get(id);
      if (!article) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Article not found",
          },
        };
      }

      articles.delete(id);
      articleVersions.delete(id);
      feedback.delete(id);

      // Remove from related articles
      for (const [otherId, other] of articles) {
        if (other.relatedArticleIds.includes(id)) {
          other.relatedArticleIds = other.relatedArticleIds.filter(
            (rid) => rid !== id,
          );
          articles.set(otherId, other);
        }
      }

      emitEvent("article.deleted", { id, slug: article.slug }, id);

      log.info("Article deleted", { id });

      return {
        success: true,
        data: { deleted: true },
      };
    } catch (error) {
      log.error("Failed to delete article", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * List articles with filters
   */
  async listArticles(
    options: ArticleListOptions & ArticleSearchOptions,
  ): Promise<APIResponse<ArticleListResult<KBArticle>>> {
    try {
      const {
        limit = 50,
        offset = 0,
        sortBy = "createdAt",
        sortOrder = "desc",
        ...filters
      } = options;

      let results = Array.from(articles.values());

      // Apply filters
      if (filters.query) {
        const query = filters.query.toLowerCase();
        results = results.filter(
          (a) =>
            a.title.toLowerCase().includes(query) ||
            a.excerpt.toLowerCase().includes(query) ||
            a.contentPlain.toLowerCase().includes(query) ||
            a.tags.some((t) => t.toLowerCase().includes(query)) ||
            a.keywords.some((k) => k.toLowerCase().includes(query)),
        );
      }

      if (filters.categoryId) {
        results = results.filter((a) => a.categoryId === filters.categoryId);
      }

      if (filters.categoryIds && filters.categoryIds.length > 0) {
        results = results.filter(
          (a) => a.categoryId && filters.categoryIds!.includes(a.categoryId),
        );
      }

      if (filters.tags && filters.tags.length > 0) {
        results = results.filter((a) =>
          filters.tags!.some((t) => a.tags.includes(t)),
        );
      }

      if (filters.contentType) {
        const types = Array.isArray(filters.contentType)
          ? filters.contentType
          : [filters.contentType];
        results = results.filter((a) => types.includes(a.contentType));
      }

      if (filters.status) {
        const statuses = Array.isArray(filters.status)
          ? filters.status
          : [filters.status];
        results = results.filter((a) => statuses.includes(a.status));
      }

      if (filters.visibility) {
        const visibilities = Array.isArray(filters.visibility)
          ? filters.visibility
          : [filters.visibility];
        results = results.filter((a) => visibilities.includes(a.visibility));
      }

      if (filters.isFeatured !== undefined) {
        results = results.filter((a) => a.isFeatured === filters.isFeatured);
      }

      if (filters.isPinned !== undefined) {
        results = results.filter((a) => a.isPinned === filters.isPinned);
      }

      if (filters.authorId) {
        results = results.filter((a) => a.author.id === filters.authorId);
      }

      if (filters.createdAfter) {
        results = results.filter((a) => a.createdAt >= filters.createdAfter!);
      }

      if (filters.createdBefore) {
        results = results.filter((a) => a.createdAt <= filters.createdBefore!);
      }

      if (filters.updatedAfter) {
        results = results.filter((a) => a.updatedAt >= filters.updatedAfter!);
      }

      if (filters.updatedBefore) {
        results = results.filter((a) => a.updatedAt <= filters.updatedBefore!);
      }

      // Sort
      results.sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
          case "createdAt":
            comparison = a.createdAt.getTime() - b.createdAt.getTime();
            break;
          case "updatedAt":
            comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
            break;
          case "title":
            comparison = a.title.localeCompare(b.title);
            break;
          case "viewCount":
            comparison = a.analytics.viewCount - b.analytics.viewCount;
            break;
          case "helpfulCount":
            comparison = a.analytics.helpfulCount - b.analytics.helpfulCount;
            break;
        }

        return sortOrder === "asc" ? comparison : -comparison;
      });

      // Pinned articles first
      results.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      });

      const totalCount = results.length;
      const items = results.slice(offset, offset + limit);

      return {
        success: true,
        data: {
          items,
          totalCount,
          hasMore: offset + limit < totalCount,
          offset,
          limit,
        },
      };
    } catch (error) {
      log.error("Failed to list articles", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Search articles with relevance scoring
   */
  async searchArticles(
    query: string,
    options?: {
      limit?: number;
      categoryId?: string;
      status?: ArticleStatus;
      visibility?: "public" | "internal" | "restricted";
    },
  ): Promise<APIResponse<ArticleSearchResult[]>> {
    try {
      if (!query || query.trim().length === 0) {
        return { success: true, data: [] };
      }

      const searchQuery = query.toLowerCase().trim();
      const limit = options?.limit || 10;

      let results = Array.from(articles.values());

      // Filter by options
      if (options?.status) {
        results = results.filter((a) => a.status === options.status);
      } else {
        // Default to published only
        results = results.filter((a) => a.status === "published");
      }

      if (options?.visibility) {
        results = results.filter((a) => a.visibility === options.visibility);
      }

      if (options?.categoryId) {
        results = results.filter((a) => a.categoryId === options.categoryId);
      }

      // Score and rank results
      const scored: Array<{ article: KBArticle; score: number }> = [];

      for (const article of results) {
        let score = 0;

        // Title match (highest weight)
        const titleSimilarity = calculateSimilarity(searchQuery, article.title);
        score += titleSimilarity * 10;

        // Exact title contains
        if (article.title.toLowerCase().includes(searchQuery)) {
          score += 5;
        }

        // Excerpt match
        const excerptSimilarity = calculateSimilarity(
          searchQuery,
          article.excerpt,
        );
        score += excerptSimilarity * 5;

        // Content match
        const contentSimilarity = calculateSimilarity(
          searchQuery,
          article.contentPlain,
        );
        score += contentSimilarity * 3;

        // Keyword match
        const queryWords = searchQuery.split(/\s+/);
        for (const keyword of article.keywords) {
          const kw = keyword.toLowerCase();
          for (const qw of queryWords) {
            if (kw === qw || kw.includes(qw) || qw.includes(kw)) {
              score += 4;
            }
          }
        }

        // Tag match
        for (const tag of article.tags) {
          const t = tag.toLowerCase();
          for (const qw of queryWords) {
            if (t === qw || t.includes(qw) || qw.includes(t)) {
              score += 2;
            }
          }
        }

        // Boost for featured/pinned
        if (article.isPinned) score += 2;
        if (article.isFeatured) score += 1;

        if (score > 0) {
          scored.push({ article, score });

          // Update analytics
          article.analytics.searchAppearances++;
        }
      }

      // Sort by score
      scored.sort((a, b) => b.score - a.score);

      // Take top results
      const topResults = scored.slice(0, limit).map(({ article, score }) => {
        // Generate highlights
        const highlights: ArticleSearchResult["highlights"] = {};

        if (article.title.toLowerCase().includes(searchQuery)) {
          highlights.title = article.title.replace(
            new RegExp(`(${searchQuery})`, "gi"),
            "<mark>$1</mark>",
          );
        }

        if (article.excerpt.toLowerCase().includes(searchQuery)) {
          highlights.excerpt = article.excerpt.replace(
            new RegExp(`(${searchQuery})`, "gi"),
            "<mark>$1</mark>",
          );
        }

        return {
          article,
          score,
          highlights:
            Object.keys(highlights).length > 0 ? highlights : undefined,
          matchedKeywords: article.keywords.filter(
            (k) =>
              searchQuery.includes(k.toLowerCase()) ||
              k.toLowerCase().includes(searchQuery),
          ),
        };
      });

      // Track search analytics
      searchAnalytics.push({
        id: uuidv4(),
        query,
        resultsCount: topResults.length,
        createdAt: new Date(),
      });

      emitEvent("search.performed", { query, resultsCount: topResults.length });

      return {
        success: true,
        data: topResults,
      };
    } catch (error) {
      log.error("Failed to search articles", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Record article view
   */
  async recordView(
    articleId: string,
    sessionId?: string,
  ): Promise<APIResponse<void>> {
    try {
      const article = articles.get(articleId);
      if (!article) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Article not found",
          },
        };
      }

      article.analytics.viewCount++;
      if (sessionId) {
        article.analytics.uniqueViewCount++;
      }

      articles.set(articleId, article);

      emitEvent("article.viewed", { articleId, sessionId }, articleId);

      return { success: true, data: undefined };
    } catch (error) {
      log.error("Failed to record view", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Get article versions
   */
  async getArticleVersions(
    articleId: string,
  ): Promise<APIResponse<KBArticleVersion[]>> {
    try {
      const versions = articleVersions.get(articleId) || [];
      return {
        success: true,
        data: versions.sort((a, b) => b.version - a.version),
      };
    } catch (error) {
      log.error("Failed to get article versions", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  // ==========================================================================
  // FEEDBACK OPERATIONS
  // ==========================================================================

  /**
   * Submit feedback for an article
   */
  async submitFeedback(
    input: SubmitFeedbackInput,
  ): Promise<APIResponse<ArticleFeedback>> {
    try {
      const article = articles.get(input.articleId);
      if (!article) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Article not found",
          },
        };
      }

      const fb: ArticleFeedback = {
        id: uuidv4(),
        articleId: input.articleId,
        isHelpful: input.isHelpful,
        comment: input.comment,
        userId: input.userId,
        sessionId: input.sessionId,
        metadata: input.metadata,
        createdAt: new Date(),
      };

      const articleFeedback = feedback.get(input.articleId) || [];
      articleFeedback.push(fb);
      feedback.set(input.articleId, articleFeedback);

      // Update analytics
      if (input.isHelpful) {
        article.analytics.helpfulCount++;
      } else {
        article.analytics.notHelpfulCount++;
      }
      articles.set(input.articleId, article);

      emitEvent("article.feedback", fb, input.articleId);

      log.debug("Feedback submitted", {
        articleId: input.articleId,
        isHelpful: input.isHelpful,
      });

      return {
        success: true,
        data: fb,
      };
    } catch (error) {
      log.error("Failed to submit feedback", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Get feedback for an article
   */
  async getArticleFeedback(
    articleId: string,
  ): Promise<APIResponse<ArticleFeedback[]>> {
    try {
      const articleFeedback = feedback.get(articleId) || [];
      return {
        success: true,
        data: articleFeedback.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        ),
      };
    } catch (error) {
      log.error("Failed to get article feedback", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  // ==========================================================================
  // FAQ OPERATIONS (for chatbot integration)
  // ==========================================================================

  /**
   * Create an FAQ entry
   */
  async createFAQ(
    input: CreateFAQInput,
    createdBy: string,
  ): Promise<APIResponse<FAQEntry>> {
    try {
      log.debug("Creating FAQ", { question: input.question.substring(0, 50) });

      const id = uuidv4();
      const now = new Date();

      const faq: FAQEntry = {
        id,
        question: input.question,
        answer: input.answer,
        alternativeQuestions: input.alternativeQuestions || [],
        keywords: input.keywords || [],
        category: input.category,
        priority: input.priority ?? 0,
        isActive: true,
        articleId: input.articleId,
        createdAt: now,
        updatedAt: now,
      };

      faqs.set(id, faq);

      log.info("FAQ created", { id });

      return {
        success: true,
        data: faq,
      };
    } catch (error) {
      log.error("Failed to create FAQ", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Get an FAQ by ID
   */
  async getFAQ(id: string): Promise<APIResponse<FAQEntry | null>> {
    try {
      const faq = faqs.get(id);
      return {
        success: true,
        data: faq || null,
      };
    } catch (error) {
      log.error("Failed to get FAQ", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Update an FAQ
   */
  async updateFAQ(
    id: string,
    input: UpdateFAQInput,
    updatedBy: string,
  ): Promise<APIResponse<FAQEntry>> {
    try {
      const faq = faqs.get(id);
      if (!faq) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "FAQ not found",
          },
        };
      }

      const updated: FAQEntry = {
        ...faq,
        question: input.question ?? faq.question,
        answer: input.answer ?? faq.answer,
        alternativeQuestions:
          input.alternativeQuestions ?? faq.alternativeQuestions,
        keywords: input.keywords ?? faq.keywords,
        category: input.category ?? faq.category,
        priority: input.priority ?? faq.priority,
        isActive: input.isActive ?? faq.isActive,
        articleId: input.articleId ?? faq.articleId,
        updatedAt: new Date(),
      };

      faqs.set(id, updated);

      log.info("FAQ updated", { id });

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      log.error("Failed to update FAQ", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Delete an FAQ
   */
  async deleteFAQ(id: string): Promise<APIResponse<{ deleted: boolean }>> {
    try {
      if (!faqs.has(id)) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "FAQ not found",
          },
        };
      }

      faqs.delete(id);

      log.info("FAQ deleted", { id });

      return {
        success: true,
        data: { deleted: true },
      };
    } catch (error) {
      log.error("Failed to delete FAQ", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * List FAQs
   */
  async listFAQs(options?: {
    category?: string;
    isActive?: boolean;
  }): Promise<APIResponse<FAQEntry[]>> {
    try {
      let results = Array.from(faqs.values());

      if (options?.category) {
        results = results.filter((f) => f.category === options.category);
      }

      if (options?.isActive !== undefined) {
        results = results.filter((f) => f.isActive === options.isActive);
      }

      // Sort by priority (desc) then by question
      results.sort((a, b) => {
        const priorityDiff = b.priority - a.priority;
        if (priorityDiff !== 0) return priorityDiff;
        return a.question.localeCompare(b.question);
      });

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      log.error("Failed to list FAQs", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Search FAQs by question (for chatbot matching)
   */
  async searchFAQs(
    query: string,
    options?: { limit?: number; category?: string },
  ): Promise<APIResponse<FAQEntry[]>> {
    try {
      if (!query || query.trim().length === 0) {
        return { success: true, data: [] };
      }

      const searchQuery = query.toLowerCase().trim();
      const limit = options?.limit || 5;

      let results = Array.from(faqs.values()).filter((f) => f.isActive);

      if (options?.category) {
        results = results.filter((f) => f.category === options.category);
      }

      // Score FAQs
      const scored: Array<{ faq: FAQEntry; score: number }> = [];

      for (const faq of results) {
        let score = 0;

        // Main question match
        const questionSimilarity = calculateSimilarity(
          searchQuery,
          faq.question,
        );
        score += questionSimilarity * 10;

        // Alternative questions
        for (const altQ of faq.alternativeQuestions) {
          const altSimilarity = calculateSimilarity(searchQuery, altQ);
          score += altSimilarity * 8;
        }

        // Keywords
        for (const kw of faq.keywords) {
          if (
            searchQuery.includes(kw.toLowerCase()) ||
            kw.toLowerCase().includes(searchQuery)
          ) {
            score += 5;
          }
        }

        // Exact contains
        if (faq.question.toLowerCase().includes(searchQuery)) {
          score += 3;
        }

        if (score > 0) {
          scored.push({ faq, score });
        }
      }

      // Sort and return top matches
      scored.sort((a, b) => b.score - a.score);

      return {
        success: true,
        data: scored.slice(0, limit).map((s) => s.faq),
      };
    } catch (error) {
      log.error("Failed to search FAQs", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  // ==========================================================================
  // EVENT SUBSCRIPTION
  // ==========================================================================

  /**
   * Subscribe to knowledge base events
   */
  subscribe(listener: EventListener): () => void {
    eventListeners.push(listener);
    return () => {
      const index = eventListeners.indexOf(listener);
      if (index >= 0) {
        eventListeners.splice(index, 1);
      }
    };
  }

  // ==========================================================================
  // STORE MANAGEMENT
  // ==========================================================================

  /**
   * Clear all data (for testing)
   */
  clearAll(): void {
    categories.clear();
    articles.clear();
    articleVersions.clear();
    feedback.clear();
    faqs.clear();
    searchAnalytics.length = 0;
    log.debug("All knowledge base data cleared");
  }

  /**
   * Get store sizes (for debugging)
   */
  getStoreSizes(): Record<string, number> {
    return {
      categories: categories.size,
      articles: articles.size,
      articleVersions: articleVersions.size,
      feedback: feedback.size,
      faqs: faqs.size,
      searchAnalytics: searchAnalytics.length,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let kbServiceInstance: KnowledgeBaseService | null = null;

/**
 * Get or create the knowledge base service singleton
 */
export function getKnowledgeBaseService(): KnowledgeBaseService {
  if (!kbServiceInstance) {
    kbServiceInstance = new KnowledgeBaseService();
  }
  return kbServiceInstance;
}

/**
 * Create a new knowledge base service instance (for testing)
 */
export function createKnowledgeBaseService(): KnowledgeBaseService {
  return new KnowledgeBaseService();
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetKnowledgeBaseService(): void {
  if (kbServiceInstance) {
    kbServiceInstance.clearAll();
  }
  kbServiceInstance = null;
}

export default KnowledgeBaseService;
