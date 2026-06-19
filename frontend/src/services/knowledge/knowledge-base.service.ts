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

// ============================================================================
// KB PLUGIN HTTP CLIENT
// Wires article, FAQ, and search operations to the knowledge-base plugin.
// Plugin canonical port: 3734. Override via KB_SERVICE_URL.
// ============================================================================

const KB_SERVICE_URL =
  (typeof process !== "undefined" && process.env.KB_SERVICE_URL) ||
  "http://localhost:3734";

// Map plugin Document shape → KBArticle
function pluginDocToArticle(d: any): KBArticle {
  const now = d.created_at ? new Date(d.created_at) : new Date();
  return {
    id: d.id,
    slug: d.slug ?? d.id,
    title: d.title ?? "",
    excerpt: d.excerpt ?? "",
    content: d.content ?? "",
    contentPlain: (d.content ?? "").replace(/<[^>]*>/g, "").trim(),
    contentType: (d.content_type ?? d.contentType ?? "article") as any,
    status: (d.status as any) ?? "draft",
    visibility: (d.visibility ?? "public") as any,
    categoryId: d.collection_id ?? d.categoryId ?? undefined,
    tags: d.tags ?? [],
    keywords: d.keywords ?? [],
    author: { id: d.author_id ?? "", name: d.author_name ?? "" },
    relatedArticleIds: d.related_article_ids ?? d.relatedArticleIds ?? [],
    attachments: d.attachments ?? [],
    customFields: d.custom_fields ?? d.customFields ?? {},
    version: d.version ?? 1,
    analytics: {
      viewCount: d.views ?? d.view_count ?? 0,
      uniqueViewCount: d.unique_view_count ?? 0,
      helpfulCount: d.helpful_count ?? 0,
      notHelpfulCount: d.not_helpful_count ?? 0,
      searchAppearances: d.search_appearances ?? 0,
      avgTimeOnPage: d.avg_time_on_page ?? 0,
      bounceRate: d.bounce_rate ?? 0,
    },
    isFeatured: d.is_featured ?? d.isFeatured ?? false,
    isPinned: d.is_pinned ?? d.isPinned ?? false,
    publishedAt: d.published_at ? new Date(d.published_at) : undefined,
    createdAt: now,
    updatedAt: d.updated_at ? new Date(d.updated_at) : now,
    createdBy: d.created_by ?? d.author_id ?? "",
    updatedBy: d.updated_by ?? d.author_id ?? "",
  };
}

// Map plugin FAQ shape → FAQEntry
function pluginFaqToEntry(f: any): FAQEntry {
  const now = f.created_at ? new Date(f.created_at) : new Date();
  return {
    id: f.id,
    question: f.question ?? "",
    answer: f.answer ?? "",
    alternativeQuestions: f.alternative_questions ?? f.alternativeQuestions ?? [],
    keywords: f.keywords ?? [],
    category: f.collection_id ?? f.category ?? undefined,
    priority: f.order_index ?? f.priority ?? 0,
    isActive: f.is_active !== undefined ? f.is_active : (f.isActive !== undefined ? f.isActive : true),
    articleId: f.article_id ?? f.articleId ?? undefined,
    createdAt: now,
    updatedAt: f.updated_at ? new Date(f.updated_at) : now,
  };
}

async function kbFetch(path: string, init?: RequestInit): Promise<any> {
  // Use globalThis.fetch so test environments can override via global.fetch assignment.
  // JSDOM closes over the built-in fetch at module load; reading from globalThis
  // allows jest tests to substitute an in-memory mock without module reloading.
  const fetchFn: typeof fetch = (globalThis as any).fetch ?? fetch;
  const res = await fetchFn(`${KB_SERVICE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`KB plugin ${path}: ${res.status} ${text}`);
  }
  return res.json();
}

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
      log.debug("Creating article via KB plugin", { title: input.title });
      const slug = input.slug || generateSlug(input.title);
      // Check for duplicate slug by scanning existing articles
      const existingJson = await kbFetch("/api/v1/documents");
      const existingDocs: any[] = existingJson.data ?? [];
      if (existingDocs.some((d: any) => d.slug === slug)) {
        return {
          success: false,
          error: { code: "CONFLICT", status: 409, message: `Article with slug "${slug}" already exists` },
        };
      }
      const body = {
        title: input.title,
        slug,
        excerpt: input.excerpt ?? "",
        content: input.content ?? "",
        content_type: input.contentType ?? "article",
        status: input.status ?? "draft",
        visibility: input.visibility ?? "public",
        collection_id: input.categoryId ?? null,
        author_id: createdBy,
        tags: input.tags ?? [],
        keywords: input.keywords ?? [],
        is_featured: input.isFeatured ?? false,
        is_pinned: input.isPinned ?? false,
        related_article_ids: input.relatedArticleIds ?? [],
        custom_fields: input.customFields ?? {},
      };
      // Set publishedAt when creating in published state
      if (body.status === "published") {
        (body as any).published_at = new Date().toISOString();
      }
      const json = await kbFetch("/api/v1/documents", {
        method: "POST",
        body: JSON.stringify(body),
      });
      // Plugin returns { id }; fetch full doc
      const doc = await kbFetch(`/api/v1/documents/${json.id}`);
      const article = pluginDocToArticle(doc);
      // Cache article locally for version history and store-size tracking
      articles.set(article.id, article);
      emitEvent("article.created", article, article.id);
      log.info("Article created", { id: article.id, slug });
      return { success: true, data: article };
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
      const doc = await kbFetch(`/api/v1/documents/${encodeURIComponent(id)}`);
      const article = pluginDocToArticle(doc);
      // Overlay analytics from local cache (feedback updates are tracked locally)
      const cached = articles.get(id);
      if (cached) {
        article.analytics = cached.analytics;
      }
      return { success: true, data: article };
    } catch (error) {
      const msg = (error as Error).message;
      if (msg.includes("404")) return { success: true, data: null };
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
      // Plugin has no by-slug endpoint; search all and match slug
      const json = await kbFetch("/api/v1/documents");
      const docs: any[] = json.data ?? [];
      const doc = docs.find((d: any) => d.slug === slug) ?? null;
      return { success: true, data: doc ? pluginDocToArticle(doc) : null };
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
      const body: Record<string, unknown> = {};
      if (input.title !== undefined) body.title = input.title;
      if (input.slug !== undefined) body.slug = input.slug;
      if (input.excerpt !== undefined) body.excerpt = input.excerpt;
      if (input.content !== undefined) body.content = input.content;
      if (input.contentType !== undefined) body.content_type = input.contentType;
      if (input.status !== undefined) body.status = input.status;
      if (input.visibility !== undefined) body.visibility = input.visibility;
      if (input.categoryId !== undefined) body.collection_id = input.categoryId;
      if (input.tags !== undefined) body.tags = input.tags;
      if (input.keywords !== undefined) body.keywords = input.keywords;
      if (input.isFeatured !== undefined) body.is_featured = input.isFeatured;
      if (input.isPinned !== undefined) body.is_pinned = input.isPinned;
      if (input.relatedArticleIds !== undefined) body.related_article_ids = input.relatedArticleIds;
      if (input.customFields !== undefined) body.custom_fields = input.customFields;
      body.author_id = updatedBy;

      // Save current version to history before applying update
      const current = articles.get(id);
      if (current) {
        const versionRecord: KBArticleVersion = {
          id: uuidv4(),
          articleId: id,
          version: current.version,
          title: current.title,
          content: current.content,
          changes: "updated",
          createdAt: new Date(),
          createdBy: updatedBy,
        };
        const history = articleVersions.get(id) || [];
        history.push(versionRecord);
        articleVersions.set(id, history);
        // Increment version counter
        body.version = current.version + 1;
      }
      // Set publishedAt when transitioning to published
      const wasPublished = current?.status === "published";
      if (input.status === "published" && !wasPublished) {
        body.published_at = new Date().toISOString();
      } else if (current?.publishedAt) {
        body.published_at = current.publishedAt.toISOString();
      }
      await kbFetch(`/api/v1/documents/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      const doc = await kbFetch(`/api/v1/documents/${encodeURIComponent(id)}`);
      const updated = pluginDocToArticle(doc);
      // Update local cache
      articles.set(id, updated);
      emitEvent("article.updated", updated, id);
      // Emit published event when transitioning to published state
      if (input.status === "published" && !wasPublished) {
        emitEvent("article.published", updated, id);
      }
      log.info("Article updated", { id });
      return { success: true, data: updated };
    } catch (error) {
      const msg = (error as Error).message;
      if (msg.includes("404")) {
        return {
          success: false,
          error: { code: "NOT_FOUND", status: 404, message: "Article not found" },
        };
      }
      log.error("Failed to update article", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: msg,
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
      // Remove references to this article from all other articles' relatedArticleIds
      try {
        const allJson = await kbFetch("/api/v1/documents");
        const allDocs: any[] = allJson.data ?? [];
        for (const doc of allDocs) {
          const relatedIds: string[] = doc.related_article_ids ?? [];
          if (relatedIds.includes(id)) {
            await kbFetch(`/api/v1/documents/${encodeURIComponent(doc.id)}`, {
              method: "PUT",
              body: JSON.stringify({ related_article_ids: relatedIds.filter((r: string) => r !== id) }),
            });
            // Update local cache too
            const cached = articles.get(doc.id);
            if (cached) {
              articles.set(doc.id, {
                ...cached,
                relatedArticleIds: cached.relatedArticleIds.filter((r: string) => r !== id),
              });
            }
          }
        }
      } catch {
        // Non-fatal: best-effort cleanup of related references
        log.debug("Could not clean related article references for deleted article", { id });
      }
      await kbFetch(`/api/v1/documents/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      articles.delete(id);
      emitEvent("article.deleted", { id }, id);
      log.info("Article deleted", { id });
      return { success: true, data: { deleted: true } };
    } catch (error) {
      const msg = (error as Error).message;
      if (msg.includes("404")) {
        return {
          success: false,
          error: { code: "NOT_FOUND", status: 404, message: "Article not found" },
        };
      }
      log.error("Failed to delete article", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: msg,
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
      const { limit = 50, offset = 0 } = options;
      const json = await kbFetch("/api/v1/documents");
      let items: KBArticle[] = (json.data ?? []).map(pluginDocToArticle);
      // Apply filters
      if (options.status) {
        items = items.filter((a) => a.status === options.status);
      }
      if (options.categoryId) {
        items = items.filter((a) => a.categoryId === options.categoryId);
      }
      if ((options as any).tags && (options as any).tags.length > 0) {
        const filterTags: string[] = (options as any).tags;
        items = items.filter((a) =>
          filterTags.some((t) => a.tags.includes(t)),
        );
      }
      if ((options as any).isFeatured !== undefined) {
        items = items.filter(
          (a) => a.isFeatured === (options as any).isFeatured,
        );
      }
      if ((options as any).query) {
        const q = ((options as any).query as string).toLowerCase();
        items = items.filter(
          (a) =>
            a.title.toLowerCase().includes(q) ||
            a.content.toLowerCase().includes(q) ||
            a.excerpt.toLowerCase().includes(q),
        );
      }
      const totalCount = items.length;
      items = items.slice(offset, offset + limit);
      return {
        success: true,
        data: { items, totalCount, hasMore: offset + limit < totalCount, offset, limit },
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
      const limit = options?.limit || 10;
      const json = await kbFetch(
        `/api/v1/search?q=${encodeURIComponent(query)}`,
      );
      const raw: any[] = json.data ?? [];
      const q = query.toLowerCase();
      // Plugin returns { id, kind, title, slug, ...} — filter articles, skip FAQs
      // By default, only return published articles unless a status override is given
      const targetStatus = options?.status ?? "published";
      const scored = raw
        .filter((r) => r.kind === "article" || r.kind === "document")
        .filter((r) => !targetStatus || r.status === targetStatus)
        .map((r) => {
          const article = pluginDocToArticle(r);
          // Compute relevance score: title exact > title partial > keywords > content
          let score = 0;
          const titleLower = article.title.toLowerCase();
          if (titleLower === q) score += 100;
          else if (titleLower.includes(q)) score += 50;
          const kwMatch = article.keywords.filter((k) => k.toLowerCase().includes(q)).length;
          score += kwMatch * 10;
          if (article.content.toLowerCase().includes(q)) score += 5;
          if (article.excerpt.toLowerCase().includes(q)) score += 3;
          const matchedKeywords = article.keywords.filter((k) => k.toLowerCase().includes(q));
          return { article, score, matchedKeywords };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      emitEvent("search.performed", { query, resultsCount: scored.length });

      return {
        success: true,
        data: scored,
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
      log.debug("Creating FAQ via KB plugin", { question: input.question.substring(0, 50) });
      const body = {
        question: input.question,
        answer: input.answer,
        alternative_questions: input.alternativeQuestions ?? [],
        keywords: input.keywords ?? [],
        collection_id: input.category ?? null,
        order_index: input.priority ?? 0,
        article_id: input.articleId ?? null,
        is_active: true,
      };
      const json = await kbFetch("/api/v1/faqs", {
        method: "POST",
        body: JSON.stringify(body),
      });
      // Plugin returns { id }; get full list to find new entry
      const listJson = await kbFetch("/api/v1/faqs");
      const raw = (listJson.data ?? []).find((f: any) => f.id === json.id);
      const faq = raw ? pluginFaqToEntry(raw) : pluginFaqToEntry({ ...json, question: input.question, answer: input.answer });
      // Cache in local store for size tracking
      faqs.set(faq.id, faq);
      log.info("FAQ created", { id: faq.id });
      return { success: true, data: faq };
    } catch (error) {
      log.error("Failed to create FAQ", error);
      return {
        success: false,
        error: { code: "INTERNAL_ERROR", status: 500, message: (error as Error).message },
      };
    }
  }

  /**
   * Get an FAQ by ID
   */
  async getFAQ(id: string): Promise<APIResponse<FAQEntry | null>> {
    try {
      // Plugin has no by-id GET for FAQs; list and filter
      const json = await kbFetch("/api/v1/faqs");
      const raw = (json.data ?? []).find((f: any) => f.id === id) ?? null;
      return { success: true, data: raw ? pluginFaqToEntry(raw) : null };
    } catch (error) {
      log.error("Failed to get FAQ", error);
      return {
        success: false,
        error: { code: "INTERNAL_ERROR", status: 500, message: (error as Error).message },
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
      const body: Record<string, unknown> = {};
      if (input.question !== undefined) body.question = input.question;
      if (input.answer !== undefined) body.answer = input.answer;
      if (input.alternativeQuestions !== undefined) body.alternative_questions = input.alternativeQuestions;
      if (input.keywords !== undefined) body.keywords = input.keywords;
      if (input.category !== undefined) body.collection_id = input.category;
      if (input.priority !== undefined) body.order_index = input.priority;
      if (input.isActive !== undefined) body.is_active = input.isActive;
      if (input.articleId !== undefined) body.article_id = input.articleId;

      await kbFetch(`/api/v1/faqs/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      // Fetch updated entry via list
      const listJson = await kbFetch("/api/v1/faqs");
      const raw = (listJson.data ?? []).find((f: any) => f.id === id);
      if (!raw) {
        return { success: false, error: { code: "NOT_FOUND", status: 404, message: "FAQ not found" } };
      }
      const updated = pluginFaqToEntry(raw);
      // Update local cache
      faqs.set(id, updated);
      log.info("FAQ updated", { id });
      return { success: true, data: updated };
    } catch (error) {
      const msg = (error as Error).message;
      if (msg.includes("404")) {
        return { success: false, error: { code: "NOT_FOUND", status: 404, message: "FAQ not found" } };
      }
      log.error("Failed to update FAQ", error);
      return {
        success: false,
        error: { code: "INTERNAL_ERROR", status: 500, message: msg },
      };
    }
  }

  /**
   * Delete an FAQ
   */
  async deleteFAQ(id: string): Promise<APIResponse<{ deleted: boolean }>> {
    try {
      await kbFetch(`/api/v1/faqs/${encodeURIComponent(id)}`, { method: "DELETE" });
      faqs.delete(id);
      log.info("FAQ deleted", { id });
      return { success: true, data: { deleted: true } };
    } catch (error) {
      const msg = (error as Error).message;
      if (msg.includes("404")) {
        return { success: false, error: { code: "NOT_FOUND", status: 404, message: "FAQ not found" } };
      }
      log.error("Failed to delete FAQ", error);
      return {
        success: false,
        error: { code: "INTERNAL_ERROR", status: 500, message: msg },
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
      const json = await kbFetch("/api/v1/faqs");
      let results: FAQEntry[] = (json.data ?? []).map(pluginFaqToEntry);
      if (options?.category) {
        results = results.filter((f) => f.category === options.category);
      }
      if (options?.isActive !== undefined) {
        results = results.filter((f) => f.isActive === options.isActive);
      }
      // Sort by priority descending
      results.sort((a, b) => b.priority - a.priority);
      return { success: true, data: results };
    } catch (error) {
      log.error("Failed to list FAQs", error);
      return {
        success: false,
        error: { code: "INTERNAL_ERROR", status: 500, message: (error as Error).message },
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
      const limit = options?.limit || 5;
      const json = await kbFetch(`/api/v1/search?q=${encodeURIComponent(query)}`);
      let results: FAQEntry[] = (json.data ?? [])
        .filter((r: any) => r.kind === "faq")
        .map(pluginFaqToEntry)
        // By default only return active FAQs
        .filter((f: FAQEntry) => f.isActive);
      if (options?.category) {
        results = results.filter((f) => f.category === options.category);
      }
      return { success: true, data: results.slice(0, limit) };
    } catch (error) {
      log.error("Failed to search FAQs", error);
      return {
        success: false,
        error: { code: "INTERNAL_ERROR", status: 500, message: (error as Error).message },
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
