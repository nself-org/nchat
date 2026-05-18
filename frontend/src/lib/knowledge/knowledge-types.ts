/**
 * Knowledge Base Types and Interfaces
 *
 * Type definitions for the FAQ/knowledge-base article management system.
 * Supports chatbot integration and search functionality.
 *
 * @module lib/knowledge/knowledge-types
 * @version 1.0.0
 */

// ============================================================================
// ARTICLE STATUS TYPES
// ============================================================================

/**
 * Article publication status
 */
export type ArticleStatus = "draft" | "published" | "archived";

/**
 * Article visibility
 */
export type ArticleVisibility = "public" | "internal" | "restricted";

/**
 * Content type for articles
 */
export type ArticleContentType =
  | "faq"
  | "guide"
  | "tutorial"
  | "troubleshooting"
  | "reference"
  | "policy";

// ============================================================================
// CATEGORY TYPES
// ============================================================================

/**
 * Knowledge base category
 */
export interface KBCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  parentId?: string;
  order: number;
  articleCount: number;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating a category
 */
export interface CreateCategoryInput {
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  parentId?: string;
  order?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Input for updating a category
 */
export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  parentId?: string;
  order?: number;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// ARTICLE TYPES
// ============================================================================

/**
 * Knowledge base article
 */
export interface KBArticle {
  id: string;
  /** URL-friendly identifier */
  slug: string;
  /** Article title */
  title: string;
  /** Short summary for previews and search results */
  excerpt: string;
  /** Full article content (markdown/HTML) */
  content: string;
  /** Plain text version for search indexing */
  contentPlain: string;
  /** Article type */
  contentType: ArticleContentType;
  /** Publication status */
  status: ArticleStatus;
  /** Visibility level */
  visibility: ArticleVisibility;
  /** Category ID */
  categoryId?: string;
  /** Category information (denormalized for convenience) */
  category?: Pick<KBCategory, "id" | "name" | "slug">;
  /** Tags for categorization and search */
  tags: string[];
  /** Keywords for search optimization */
  keywords: string[];
  /** Author information */
  author: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  /** Related article IDs */
  relatedArticleIds: string[];
  /** Attachments (images, files) */
  attachments: KBAttachment[];
  /** Custom fields */
  customFields: Record<string, unknown>;
  /** SEO metadata */
  seo?: {
    title?: string;
    description?: string;
    canonicalUrl?: string;
  };
  /** Version number for tracking revisions */
  version: number;
  /** Analytics */
  analytics: KBArticleAnalytics;
  /** Featured article flag */
  isFeatured: boolean;
  /** Pinned to top flag */
  isPinned: boolean;
  /** Published timestamp */
  publishedAt?: Date;
  /** Created timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
  /** Last reviewed timestamp */
  lastReviewedAt?: Date;
  /** Created by */
  createdBy: string;
  /** Last updated by */
  updatedBy: string;
}

/**
 * Article attachment
 */
export interface KBAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  thumbnailUrl?: string;
}

/**
 * Article analytics
 */
export interface KBArticleAnalytics {
  viewCount: number;
  uniqueViewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  searchAppearances: number;
  avgTimeOnPage: number;
  bounceRate: number;
}

/**
 * Article version/revision
 */
export interface KBArticleVersion {
  id: string;
  articleId: string;
  version: number;
  title: string;
  content: string;
  changes: string;
  createdBy: string;
  createdAt: Date;
}

// ============================================================================
// INPUT TYPES
// ============================================================================

/**
 * Input for creating an article
 */
export interface CreateArticleInput {
  slug?: string;
  title: string;
  excerpt: string;
  content: string;
  contentType?: ArticleContentType;
  status?: ArticleStatus;
  visibility?: ArticleVisibility;
  categoryId?: string;
  tags?: string[];
  keywords?: string[];
  relatedArticleIds?: string[];
  attachments?: Omit<KBAttachment, "id">[];
  customFields?: Record<string, unknown>;
  seo?: {
    title?: string;
    description?: string;
    canonicalUrl?: string;
  };
  isFeatured?: boolean;
  isPinned?: boolean;
}

/**
 * Input for updating an article
 */
export interface UpdateArticleInput {
  slug?: string;
  title?: string;
  excerpt?: string;
  content?: string;
  contentType?: ArticleContentType;
  status?: ArticleStatus;
  visibility?: ArticleVisibility;
  categoryId?: string;
  tags?: string[];
  keywords?: string[];
  relatedArticleIds?: string[];
  attachments?: Omit<KBAttachment, "id">[];
  customFields?: Record<string, unknown>;
  seo?: {
    title?: string;
    description?: string;
    canonicalUrl?: string;
  };
  isFeatured?: boolean;
  isPinned?: boolean;
}

// ============================================================================
// SEARCH TYPES
// ============================================================================

/**
 * Article search options
 */
export interface ArticleSearchOptions {
  query?: string;
  categoryId?: string;
  categoryIds?: string[];
  tags?: string[];
  contentType?: ArticleContentType | ArticleContentType[];
  status?: ArticleStatus | ArticleStatus[];
  visibility?: ArticleVisibility | ArticleVisibility[];
  isFeatured?: boolean;
  isPinned?: boolean;
  authorId?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  updatedBefore?: Date;
}

/**
 * Article list options
 */
export interface ArticleListOptions {
  limit?: number;
  offset?: number;
  sortBy?: "createdAt" | "updatedAt" | "title" | "viewCount" | "helpfulCount";
  sortOrder?: "asc" | "desc";
}

/**
 * Article list result
 */
export interface ArticleListResult<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
  offset: number;
  limit: number;
}

/**
 * Search result with highlighting
 */
export interface ArticleSearchResult {
  article: KBArticle;
  score: number;
  highlights?: {
    title?: string;
    excerpt?: string;
    content?: string;
  };
  matchedKeywords?: string[];
}

// ============================================================================
// FEEDBACK TYPES
// ============================================================================

/**
 * Article feedback
 */
export interface ArticleFeedback {
  id: string;
  articleId: string;
  isHelpful: boolean;
  comment?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Input for submitting feedback
 */
export interface SubmitFeedbackInput {
  articleId: string;
  isHelpful: boolean;
  comment?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// FAQ TYPES (for chatbot integration)
// ============================================================================

/**
 * FAQ entry (simplified article for chatbot)
 */
export interface FAQEntry {
  id: string;
  question: string;
  answer: string;
  /** Alternative phrasings of the question */
  alternativeQuestions: string[];
  /** Keywords for matching */
  keywords: string[];
  /** Category */
  category?: string;
  /** Priority for display order */
  priority: number;
  /** Whether this FAQ is active */
  isActive: boolean;
  /** Full article reference if available */
  articleId?: string;
  /** Created timestamp */
  createdAt: Date;
  /** Updated timestamp */
  updatedAt: Date;
}

/**
 * Input for creating an FAQ
 */
export interface CreateFAQInput {
  question: string;
  answer: string;
  alternativeQuestions?: string[];
  keywords?: string[];
  category?: string;
  priority?: number;
  articleId?: string;
}

/**
 * Input for updating an FAQ
 */
export interface UpdateFAQInput {
  question?: string;
  answer?: string;
  alternativeQuestions?: string[];
  keywords?: string[];
  category?: string;
  priority?: number;
  isActive?: boolean;
  articleId?: string;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

/**
 * Knowledge base analytics
 */
export interface KBAnalytics {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalArticles: number;
    publishedArticles: number;
    draftArticles: number;
    archivedArticles: number;
    totalViews: number;
    uniqueViews: number;
    searchQueries: number;
    avgHelpfulRate: number;
  };
  topArticles: Array<{
    articleId: string;
    title: string;
    viewCount: number;
    helpfulRate: number;
  }>;
  topSearchQueries: Array<{
    query: string;
    count: number;
    hasResults: boolean;
  }>;
  byCategory: Record<
    string,
    {
      articleCount: number;
      viewCount: number;
      helpfulRate: number;
    }
  >;
  trends: Array<{
    date: string;
    views: number;
    searches: number;
    helpful: number;
    notHelpful: number;
  }>;
}

/**
 * Search analytics entry
 */
export interface SearchAnalyticsEntry {
  id: string;
  query: string;
  resultsCount: number;
  clickedArticleId?: string;
  position?: number;
  sessionId?: string;
  userId?: string;
  createdAt: Date;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Knowledge base event types
 */
export type KBEventType =
  | "article.created"
  | "article.updated"
  | "article.published"
  | "article.archived"
  | "article.deleted"
  | "article.viewed"
  | "article.feedback"
  | "category.created"
  | "category.updated"
  | "category.deleted"
  | "search.performed";

/**
 * Knowledge base event
 */
export interface KBEvent<T = unknown> {
  type: KBEventType;
  articleId?: string;
  categoryId?: string;
  data: T;
  timestamp: Date;
}
